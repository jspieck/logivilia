<template>
  <div class="privacy-page">
    <template v-if="locale === 'en'">
      <h2>Privacy</h2>
      <p class="notice">This is a courtesy translation. Only the German version is legally binding.</p>
      <p>
        This page describes what data Logivilia stores, what for, and how you can view or delete it.
        The controller is the operator named in the <router-link to="/impressum" class="navLink">legal notice</router-link>;
        you will also find the contact details for privacy questions there.
      </p>

      <h3>Without an account</h3>
      <p>You can solve all puzzles without an account. In that case Logivilia does not store any personal data in its database.</p>
      <ul>
        <li>
          <strong>Server logs:</strong> The server logs every request (IP address, time, requested address,
          browser identifier, referrer). The logs are used for operation and troubleshooting and are deleted by the host according to its retention periods.
        </li>
        <li>
          <strong>Abuse protection:</strong> For login, registration, password reset and solution checks, the server counts
          requests per IP address. These counters are kept in memory only and expire after at most 15 minutes.
        </li>
        <li>
          <strong>In your browser:</strong> Your login (a token and your user profile) is kept in <em>sessionStorage</em> and deleted when
          you close the tab. In <em>localStorage</em> we remember whether you have acknowledged the cookie notice, your
          language and the puzzle you opened last (number, type and name, for “Continue” on the start page). Logivilia sets no tracking or advertising cookies and uses no analytics services.
        </li>
      </ul>

      <h3>With an account</h3>
      <p>When you sign up, we store:</p>
      <ul>
        <li><strong>Account data:</strong> username, e-mail address, password (as a hash only), role, registration date,
          whether your e-mail address is confirmed, and temporarily the tokens from confirmation and password links (as a hash only).</li>
        <li><strong>Optional profile details:</strong> gender, year of birth, city and “About me”.
          These details are visible to everyone on your public profile. You can change or clear them at any time.</li>
        <li><strong>Activity:</strong> which puzzles you solved and when, your ratings, comments and upvotes, and the
          puzzles you have published. Solved puzzles appear as numbers on your profile and in the leaderboard,
          comments appear with your username below the puzzle.</li>
      </ul>
      <p>
        Your e-mail address is never public. We only use it for the confirmation link, password resets and
        confirming a password change. The e-mails are sent via Logivilia's own mail server.
        The legal basis is the performance of the user agreement (Art. 6 (1) (b) GDPR); for the optional
        profile details it is your consent (Art. 6 (1) (a) GDPR), which you can withdraw by deleting the details.
      </p>

      <h3>External content</h3>
      <p>
        When you open the site, your browser loads icons and fonts from <em>unpkg.com</em>, <em>cdn.materialdesignicons.com</em>
        and <em>use.fontawesome.com</em>. Some logic puzzles show images loaded from other websites. For technical reasons,
        these providers receive your IP address.
      </p>

      <h3>Your rights</h3>
      <p>
        You have the right to access, rectification, erasure, restriction of processing, data portability and objection,
        as well as the right to lodge a complaint with a data protection supervisory authority. You can exercise two of them yourself when
        logged in, on your profile page under <strong>“My data”</strong>:
      </p>
      <ul>
        <li><strong>Download data:</strong> all data stored for your account as a JSON file.</li>
        <li><strong>Delete account:</strong> immediately deletes your account with solved puzzles, ratings, comments and upvotes.
          Puzzles you have published remain available to other players, but are no longer linked to your account.</li>
      </ul>
      <p>For anything else, write to us at the address given in the legal notice.</p>
    </template>
    <template v-else>
      <h2>Datenschutz</h2>
      <p>
        Diese Seite beschreibt, welche Daten Logivilia speichert, wofür und wie Sie sie einsehen oder löschen können.
        Verantwortlich ist der im <router-link to="/impressum" class="navLink">Impressum</router-link> genannte Betreiber;
        dort finden Sie auch die Kontaktdaten für Fragen zum Datenschutz.
      </p>

      <h3>Ohne Konto</h3>
      <p>Sie können alle Rätsel ohne Konto lösen. Dabei speichert Logivilia keine personenbezogenen Daten in seiner Datenbank.</p>
      <ul>
        <li>
          <strong>Server-Logs:</strong> Der Server protokolliert jede Anfrage (IP-Adresse, Zeitpunkt, aufgerufene Adresse,
          Browserkennung, Referrer). Die Logs dienen dem Betrieb und der Fehlersuche und werden vom Hoster nach dessen Fristen gelöscht.
        </li>
        <li>
          <strong>Missbrauchsschutz:</strong> Für Anmeldung, Registrierung, Passwort-Zurücksetzen und die Lösungsprüfung zählt der Server
          Anfragen pro IP-Adresse. Diese Zähler liegen nur im Arbeitsspeicher und verfallen nach höchstens 15 Minuten.
        </li>
        <li>
          <strong>Im Browser:</strong> Ihre Anmeldung (ein Token und Ihr Benutzerprofil) liegt im <em>sessionStorage</em> und wird beim
          Schließen des Tabs gelöscht. Im <em>localStorage</em> merken wir uns, ob Sie den Cookie-Hinweis bestätigt haben, Ihre
          Sprache und das zuletzt geöffnete Rätsel (Nummer, Art und Name, für „Weiterspielen“ auf der Startseite). Logivilia setzt keine Tracking- oder Werbe-Cookies und nutzt keine Analysedienste.
        </li>
      </ul>

      <h3>Mit Konto</h3>
      <p>Wenn Sie sich registrieren, speichern wir:</p>
      <ul>
        <li><strong>Kontodaten:</strong> Benutzername, E-Mail-Adresse, Passwort (nur als Hash), Rolle, Registrierungsdatum,
          ob Ihre E-Mail-Adresse bestätigt ist, sowie zeitweise die Tokens aus Bestätigungs- und Passwort-Links (nur als Hash).</li>
        <li><strong>Freiwillige Profilangaben:</strong> Geschlecht, Geburtsjahr, Wohnort und „Über mich“.
          Diese Angaben sind auf Ihrem öffentlichen Profil für alle sichtbar. Sie können sie jederzeit ändern oder leeren.</li>
        <li><strong>Aktivität:</strong> welche Rätsel Sie wann gelöst haben, Ihre Bewertungen, Kommentare und Upvotes sowie die
          Rätsel, die Sie veröffentlicht haben. Gelöste Rätsel erscheinen als Zahlen auf Ihrem Profil und in der Bestenliste,
          Kommentare mit Ihrem Benutzernamen unter dem Rätsel.</li>
      </ul>
      <p>
        Die E-Mail-Adresse ist nie öffentlich. Wir nutzen sie nur für den Bestätigungslink, das Zurücksetzen des Passworts und
        die Bestätigung einer Passwortänderung. Die E-Mails werden über den eigenen Mailserver von Logivilia versendet.
        Rechtsgrundlage ist die Erfüllung des Nutzungsverhältnisses (Art. 6 Abs. 1 lit. b DSGVO); für die freiwilligen
        Profilangaben Ihre Einwilligung (Art. 6 Abs. 1 lit. a DSGVO), die Sie durch Löschen der Angaben widerrufen können.
      </p>

      <h3>Externe Inhalte</h3>
      <p>
        Beim Aufruf der Seite lädt Ihr Browser Symbole und Schriftarten von <em>unpkg.com</em>, <em>cdn.materialdesignicons.com</em>
        und <em>use.fontawesome.com</em>. Einige Logikrätsel zeigen Bilder, die von anderen Websites geladen werden. Diese Anbieter
        erhalten dabei technisch bedingt Ihre IP-Adresse.
      </p>

      <h3>Ihre Rechte</h3>
      <p>
        Sie haben das Recht auf Auskunft, Berichtigung, Löschung, Einschränkung der Verarbeitung, Datenübertragbarkeit und Widerspruch
        sowie auf Beschwerde bei einer Datenschutz-Aufsichtsbehörde. Zwei davon können Sie direkt selbst ausüben, wenn Sie
        angemeldet sind, auf Ihrer Profilseite unter <strong>„Meine Daten“</strong>:
      </p>
      <ul>
        <li><strong>Daten herunterladen:</strong> alle zu Ihrem Konto gespeicherten Daten als JSON-Datei.</li>
        <li><strong>Konto löschen:</strong> löscht Ihr Konto mit gelösten Rätseln, Bewertungen, Kommentaren und Upvotes sofort.
          Von Ihnen veröffentlichte Rätsel bleiben für andere Spieler erhalten, aber ohne Verbindung zu Ihrem Konto.</li>
      </ul>
      <p>Für alles andere schreiben Sie uns an die im Impressum genannte Adresse.</p>
    </template>
  </div>
</template>

<script setup>
import { useI18n } from 'vue-i18n'

const { locale } = useI18n()
</script>

<style scoped>
.notice {
  font-style: italic;
  color: #6b6b6b;
}
.privacy-page {
  padding: 2rem;
  max-width: 760px;
}
.privacy-page h3 {
  margin-top: 1.5rem;
  margin-bottom: 0.5rem;
  font-size: 1.15rem;
}
.privacy-page ul {
  list-style: disc;
  padding-left: 1.5rem;
  margin-bottom: 1rem;
}
.privacy-page li {
  margin-bottom: 0.5rem;
}
.privacy-page p {
  margin-bottom: 1rem;
}
</style>
