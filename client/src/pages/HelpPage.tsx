import { useNavigate } from 'react-router-dom';
import { EmergencyBanner } from '../components/EmergencyBanner';
import distressButtonImg from '../assets/help-distress-button.png';

function goBackOrHome(navigate: ReturnType<typeof useNavigate>) {
  const idx = (window.history.state as { idx?: number } | null)?.idx;
  if (typeof idx === 'number' && idx > 0) {
    navigate(-1);
    return;
  }
  navigate('/', { replace: true });
}

export function HelpPage() {
  const navigate = useNavigate();

  return (
    <main className="shell-page">
      <article className="panel help-panel">
        <header className="help-header">
          <button
            type="button"
            className="ghost-link help-back-btn"
            onClick={() => goBackOrHome(navigate)}
          >
            ← חזרה
          </button>
          <h1>מדריך שימוש</h1>
          <p className="muted">
            סיור קצר על מה יש באפליקציית שביל הים של חאן יותם ומה אפשר לעשות בה.
          </p>
        </header>

        <section className="help-section">
          <h2>1. הוספה למסך הבית (מומלץ!)</h2>
          <p>כדי שהאפליקציה תעבוד הכי טוב, מומלץ להוסיף אותה למסך הבית:</p>
          <ul className="onboarding-list">
            <li>
              <strong>iPhone (ספארי):</strong> לחצו על כפתור השיתוף (הריבוע עם החץ) ←
              &quot;הוספה למסך הבית&quot;
            </li>
            <li>
              <strong>אנדרואיד (כרום):</strong> לחצו על שלוש הנקודות למעלה ← &quot;הוספה
              למסך הבית&quot;
            </li>
          </ul>
          <p>מכאן והלאה אפשר לפתוח את האפליקציה מהאייקון במסך הבית.</p>
        </section>

        <section className="help-section">
          <h2>2. המפה</h2>
          <p>במסך הראשי תראו את המפה עם:</p>
          <ul className="onboarding-list">
            <li>האייקון שלכם — עם מסגרת בולטת</li>
            <li>משתמשים אחרים הפעילים כרגע בשביל</li>
            <li>נקודות עניין לאורך השביל — מים, חניונים, אתרים ונקודות בטיחות, כל אחת עם אייקון משלה</li>
          </ul>
          <p>
            לוחצים על אייקון של משתמש אחר לראות את הפרופיל שלו ולשלוח לו הודעה.
            לוחצים על נקודת עניין לראות מידע עליה.
          </p>
        </section>

        <section className="help-section">
          <h2>3. פרופיל אישי</h2>
          <p>
            בעמוד הפרופיל אפשר לראות ולערוך את הפרטים שלכם — שם, כמה מילים עליכם,
            קישור לרשת חברתית, סוג המטייל, וצבע הסימון שלכם על המפה.
          </p>
        </section>

        <section className="help-section">
          <h2>4. הודעות</h2>
          <p>
            לוחצים על אייקון המשתמש במפה ← &quot;שליחת הודעה&quot;, או נכנסים ל&quot;הודעות&quot;
            בתפריט התחתון לראות שיחות פתוחות. כשיש הודעה חדשה שלא קראתם, תראו נקודת
            התרעה — גם בתפריט וגם ליד השיחה עצמה — ותשמעו צליל קצר.
          </p>
        </section>

        <section className="help-section help-section-emergency">
          <h2>5. כפתור מצוקה (חירום)</h2>
          <EmergencyBanner />
          <img
            src={distressButtonImg}
            alt="כפתור הודעת מצוקה — עיגול אדום עם סמל יד מורמת"
            style={{ display: 'block', margin: '12px auto', maxWidth: 120 }}
          />
          <ul className="onboarding-list">
            <li>
              שורת החירום למעלה (&quot;חירום – לחצו להתקשר&quot;) = שיחת טלפון ישירה לחאן
              יותם.
            </li>
            <li>
              הכפתור האדום/עגול = שליחת הודעת מצוקה אוטומטית לחאן יותם עם המיקום
              שלכם. לוחצים פעם אחת — אין צורך באישור כפול. אחרי השליחה תופיע הודעת
              &quot;נשלח ✓&quot;.
            </li>
            <li>
              אם אין קליטה, ההודעה תישלח אוטומטית ברגע שהחיבור יחזור, ותוצג הודעה
              בולטת עם מספר החירום לחיוג ישיר.
            </li>
          </ul>
        </section>

        <section className="help-section">
          <h2>6. מצב שקט</h2>
          <p>במסך סטטוס (בתפריט התחתון) אפשר לעבור למצב שקט:</p>
          <ul className="onboarding-list">
            <li>אתם לא מופיעים על המפה למשתמשים אחרים.</li>
            <li>אתם עדיין רואים את שאר המשתמשים.</li>
            <li>חאן יותם עדיין רואה את המיקום שלכם (לצורך בטיחות).</li>
          </ul>
          <p>שימושי אם אתם רוצים פרטיות אבל עדיין רוצים שהצוות ידע איפה אתם.</p>
        </section>

        <section className="help-section">
          <h2>7. יציאה</h2>
          <p>מסך סטטוס ← התנתקות.</p>
        </section>

        <p className="muted">שאלות? פנו לחאן יותם.</p>
      </article>
    </main>
  );
}
