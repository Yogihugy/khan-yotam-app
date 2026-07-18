import { Link } from 'react-router-dom';
import { EmergencyBanner } from '../components/EmergencyBanner';

export function HelpPage() {
  return (
    <main className="shell-page">
      <article className="panel help-panel">
        <header className="help-header">
          <Link to="/profile" className="ghost-link">
            ← חזרה לפרופיל
          </Link>
          <h1>מדריך שימוש</h1>
          <p className="muted">איך להשתמש באפליקציית שביל הים של חאן יותם.</p>
        </header>

        <section className="help-section">
          <h2>1. פתיחת ההזמנה</h2>
          <p>
            לוחצים על הקישור שקיבלתם בווטסאפ. הקישור בתוקף למשך 48 שעות בלבד — אם פג
            תוקפו, פנו לחאן יותם לקבלת הזמנה חדשה.
          </p>
        </section>

        <section className="help-section">
          <h2>2. הוספה למסך הבית (מומלץ!)</h2>
          <p>
            כדי שהאפליקציה תעבוד הכי טוב (כולל שמירת החיבור שלכם), מומלץ להוסיף אותה
            למסך הבית:
          </p>
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
          <p>מכאן והלאה פתחו את האפליקציה מהאייקון במסך הבית, לא מהווטסאפ.</p>
        </section>

        <section className="help-section">
          <h2>3. הרשאת מיקום</h2>
          <p>
            בפתיחה הראשונה תתבקשו לאשר גישה למיקום — חובה לאשר. בלי זה האפליקציה לא
            יכולה להראות אתכם על המפה או לשלוח קריאת מצוקה עם המיקום שלכם. המיקום
            משמש רק להצגה במפה ולחירום — לא נאסף למטרה אחרת.
          </p>
        </section>

        <section className="help-section">
          <h2>4. המפה</h2>
          <p>במסך הראשי תראו את המפה עם:</p>
          <ul className="onboarding-list">
            <li>האייקון שלכם — עם מסגרת בולטת</li>
            <li>משתמשים אחרים הפעילים כרגע בשביל</li>
            <li>חאן יותם — מסומן באייקון בית</li>
          </ul>
          <p>לוחצים על אייקון של משתמש אחר לראות את השם שלו ולשלוח לו הודעה.</p>
        </section>

        <section className="help-section help-section-emergency">
          <h2>5. כפתור מצוקה (חירום)</h2>
          <EmergencyBanner />
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
          <div className="denied-box">
            <p className="error">
              חשוב: בסכנת חיים מיידית — התקשרו קודם, אל תסתמכו רק על הכפתור.
            </p>
          </div>
        </section>

        <section className="help-section">
          <h2>6. שליחת הודעה למשתמש אחר</h2>
          <p>
            לוחצים על אייקון המשתמש במפה ← &quot;שליחת הודעה&quot;, או נכנסים ל&quot;הודעות&quot;
            בתפריט התחתון לראות שיחות פתוחות.
          </p>
        </section>

        <section className="help-section">
          <h2>7. מצב שקט</h2>
          <p>בתפריט התחתון (סטטוס) אפשר לעבור למצב שקט:</p>
          <ul className="onboarding-list">
            <li>אתם לא מופיעים על המפה למשתמשים אחרים.</li>
            <li>אתם עדיין רואים את שאר המשתמשים.</li>
            <li>חאן יותם עדיין רואה את המיקום שלכם (לצורך בטיחות).</li>
          </ul>
          <p>שימושי אם אתם רוצים פרטיות אבל עדיין רוצים שהצוות ידע איפה אתם.</p>
        </section>

        <section className="help-section">
          <h2>8. יציאה</h2>
          <p>בתפריט סטטוס ← התנתקות.</p>
        </section>

        <p className="muted">שאלות? פנו לחאן יותם.</p>
      </article>
    </main>
  );
}
