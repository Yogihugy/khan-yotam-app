import { useEffect, useState, type FormEvent } from 'react';
import { adminApi } from '../../lib/adminApi';

export function AdminProtocolTab() {
  const [content, setContent] = useState('');
  const [saved, setSaved] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    void adminApi
      .getProtocol()
      .then((r) => setContent(r.protocol?.content || ''))
      .catch((err) => setError(err instanceof Error ? err.message : 'שגיאה'));
  }, []);

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    setSaved(false);
    setSaving(true);
    try {
      await adminApi.putProtocol(content);
      setSaved(true);
      setTimeout(() => setSaved(false), 1500);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'שמירה נכשלה');
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="admin-tab">
      <h2>נוהל חירום</h2>
      <p className="muted">מוצג לקצין התורן בעת קריאת מצוקה (חמ"ל).</p>
      <form onSubmit={onSubmit} className="admin-stack">
        <textarea
          rows={12}
          value={content}
          onChange={(e) => setContent(e.target.value)}
          placeholder="1. להתקשר למשתמש…&#10;2. אין מענה: לשלוח צוות למיקום אחרון…"
        />
        {error && <p className="error">{error}</p>}
        <button type="submit" className="primary" disabled={saving}>
          {saving ? 'שומרים…' : saved ? 'נשמר ✓' : 'שמירה'}
        </button>
      </form>
    </div>
  );
}
