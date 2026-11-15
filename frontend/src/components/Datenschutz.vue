<template>
  <div class="privacy-page">
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
  </div>
</template>

<style scoped>
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
