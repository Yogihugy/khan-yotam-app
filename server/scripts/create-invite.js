import '../src/loadEnv.js';
import { createInvitedUser } from '../src/services/invites.js';

async function main() {
  const name = process.argv[2] || process.env.INVITE_NAME || 'Test Guest';
  const phone = process.argv[3] || process.env.INVITE_PHONE || '+972501234567';
  const role = process.argv[4] || process.env.INVITE_ROLE || 'guest';

  const result = await createInvitedUser({
    name,
    phone,
    role,
    sendWhatsApp: true,
  });

  console.log(JSON.stringify(result, null, 2));
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
