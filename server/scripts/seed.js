import '../src/loadEnv.js';
import { createClient } from '@supabase/supabase-js';

const DUTY_OFFICER_ID = '00000000-0000-0000-0000-000000000001';
const PROTOCOL_ID = '00000000-0000-0000-0000-000000000002';

function requireEnv(keys) {
  const missing = keys.filter((k) => !process.env[k]);
  if (missing.length) {
    console.error(`Missing env: ${missing.join(', ')}`);
    process.exit(1);
  }
}

async function main() {
  requireEnv(['SUPABASE_URL', 'SUPABASE_SERVICE_ROLE_KEY']);

  const supabase = createClient(
    process.env.SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY,
    { auth: { autoRefreshToken: false, persistSession: false } },
  );

  const email = process.env.SEED_ADMIN_EMAIL || 'admin@khanyotam.local';
  const password = process.env.SEED_ADMIN_PASSWORD || 'change-me-on-first-login';
  const name = process.env.SEED_ADMIN_NAME || 'Admin';
  const phone = process.env.SEED_ADMIN_PHONE || '+972500000000';
  const emergencyPhone = process.env.SEED_EMERGENCY_PHONE || '+972500000001';
  const dutyName = process.env.SEED_DUTY_OFFICER_NAME || 'Duty Officer';
  const dutyPhone = process.env.SEED_DUTY_OFFICER_PHONE || emergencyPhone;

  // --- Admin auth user ---
  let adminId;
  const { data: listed } = await supabase.auth.admin.listUsers({ perPage: 1000 });
  const existingAuth = listed?.users?.find((u) => u.email === email);

  if (existingAuth) {
    adminId = existingAuth.id;
    console.log(`Admin auth user already exists: ${adminId}`);
  } else {
    const { data, error } = await supabase.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
      user_metadata: { name, phone, role: 'admin' },
    });
    if (error) throw error;
    adminId = data.user.id;
    console.log(`Created admin auth user: ${adminId}`);
  }

  // --- public.users admin row ---
  const { data: existingProfile } = await supabase
    .from('users')
    .select('id')
    .eq('id', adminId)
    .maybeSingle();

  if (existingProfile) {
    await supabase
      .from('users')
      .update({
        name,
        phone,
        role: 'admin',
        traveler_type: 'staff',
        status: 'active',
        expires_at: null,
        is_deleted: false,
      })
      .eq('id', adminId);
    console.log('Updated existing admin profile');
  } else {
    const { error } = await supabase.from('users').insert({
      id: adminId,
      name,
      phone,
      role: 'admin',
      traveler_type: 'staff',
      status: 'active',
      color: '#34495E',
      expires_at: null,
      is_deleted: false,
    });
    if (error) throw error;
    console.log('Inserted admin profile');
  }

  // --- app_config.emergency_phone ---
  const { error: configError } = await supabase.from('app_config').upsert({
    key: 'emergency_phone',
    value: emergencyPhone,
    updated_by: adminId,
    updated_at: new Date().toISOString(),
  });
  if (configError) throw configError;
  console.log(`app_config.emergency_phone = ${emergencyPhone}`);

  // --- duty_officer singleton ---
  const { error: dutyError } = await supabase.from('duty_officer').upsert({
    id: DUTY_OFFICER_ID,
    name: dutyName,
    phone: dutyPhone,
    backup_name: null,
    backup_phone: null,
    set_by: adminId,
    set_at: new Date().toISOString(),
  });
  if (dutyError) throw dutyError;
  console.log(`duty_officer seeded: ${dutyName} / ${dutyPhone}`);

  // --- emergency_protocol singleton ---
  const { error: protocolError } = await supabase.from('emergency_protocol').upsert({
    id: PROTOCOL_ID,
    content: '',
    updated_by: adminId,
    updated_at: new Date().toISOString(),
  });
  if (protocolError) throw protocolError;
  console.log('emergency_protocol singleton ready');

  console.log('\nSeed complete.');
  console.log(`Admin login email: ${email}`);
  console.log('Change SEED_ADMIN_PASSWORD after first login.');
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
