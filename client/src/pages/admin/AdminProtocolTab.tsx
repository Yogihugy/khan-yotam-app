import { useEffect, useState, type FormEvent } from 'react';
import { adminApi } from '../../lib/adminApi';

export function AdminProtocolTab() {
  const [content, setContent] = useState('');
  const [saved, setSaved] = useState(false);
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
    try {
      await adminApi.putProtocol(content);
      setSaved(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'שמירה נכשלה');
    }
  }

  return (
    <div className="admin-tab">
      <h2>פרוטוקול חירום</h2>
      <p className="muted">מוצג לקצין התורן בעת קריאת מצוקה (ChaML).</p>
      <form onSubmit={onSubmit} className="admin-stack">
        <textarea
          rows={12}
          value={content}
          onChange={(e) => setContent(e.target.value)}
          placeholder="1. להתקשר למשתמש…&#10;2. אין מענה: לשלוח צוות למיקום אחרון…"
        />
        {error && <p className="error">{error}</p>}
        {saved && <p className="muted">נשמר.</p>}
        <button type="submit" className="primary">
          שמירה
        </button>
      </form>
    </div>
  );
}
