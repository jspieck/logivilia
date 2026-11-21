// Texts of the e-mails the server sends, in German and English. The language
// is the one the visitor uses the site in: the frontend sends its locale as
// Accept-Language (frontend/src/services/Api.js); German is the default.

const MAIL_LOCALES = ['de', 'en'];

/** 'de' or 'en' for a request. */
function mailLocale (req) {
  const match = req && typeof req.acceptsLanguages === 'function' && req.acceptsLanguages(...MAIL_LOCALES);
  return MAIL_LOCALES.includes(match) ? match : 'de';
}

const SIGNATURE = {
  de: 'Mit freundlichen Grüßen\nIhr Logivilia Team',
  en: 'Best regards\nYour Logivilia team'
};

const TEXTS = {
  de: {
    forgot: ({ appUrl, link }) => ({
      subject: '[Logivilia] Informationen zum Zurücksetzen des Passworts',
      text: `Sie erhalten diese E-Mail, da Sie (oder jemand anderes) das Zurücksetzen des Passworts Ihres Accounts bei ${appUrl} beantragt hat.\n` +
        'Bitte klicken Sie auf folgenden Link oder kopieren Sie diesen in Ihren Browser, um diesen Prozess fertigzustellen.\n\n' +
        `${link} \n\n` +
        'Wenn Sie das Zurücksetzen Ihres Passworts nicht beantragt haben, ignorieren Sie bitte diese E-Mail und Ihr Passwort bleibt unverändert.\n\n' +
        SIGNATURE.de
    }),
    verify: ({ link }) => ({
      subject: '[Logivilia] Bitte bestätigen Sie Ihre E-Mail-Adresse',
      text: 'Willkommen bei Logivilia!\n\n' +
        'Bitte bestätigen Sie Ihre E-Mail-Adresse, indem Sie auf folgenden Link klicken oder ihn in Ihren Browser kopieren. ' +
        'Erst danach können Sie Kommentare schreiben und eigene Rätsel veröffentlichen.\n\n' +
        `${link} \n\n` +
        'Wenn Sie sich nicht bei Logivilia registriert haben, ignorieren Sie diese E-Mail bitte.\n\n' +
        SIGNATURE.de
    }),
    resetDone: () => ({
      subject: '[Logivilia] Passwort erfolgreich geändert',
      text: 'Sie erhalten diese E-Mail, da Sie das Passwort erfolgreich geändert haben.\n' +
        'Sie können sich nun mit Ihrem neuen Passwort anmelden.\n\n' +
        SIGNATURE.de
    }),
    test: () => ({
      subject: '[Logivilia] Test-E-Mail',
      text: 'Diese Test-E-Mail bestätigt, dass Logivilia E-Mails versenden kann.'
    })
  },
  en: {
    forgot: ({ appUrl, link }) => ({
      subject: '[Logivilia] Resetting your password',
      text: `You are receiving this e-mail because you (or someone else) asked to reset the password of your account at ${appUrl}.\n` +
        'Please click the following link, or copy it into your browser, to complete the process.\n\n' +
        `${link} \n\n` +
        'If you did not ask to reset your password, please ignore this e-mail and your password will stay unchanged.\n\n' +
        SIGNATURE.en
    }),
    verify: ({ link }) => ({
      subject: '[Logivilia] Please confirm your e-mail address',
      text: 'Welcome to Logivilia!\n\n' +
        'Please confirm your e-mail address by clicking the following link or copying it into your browser. ' +
        'Only then can you write comments and publish your own puzzles.\n\n' +
        `${link} \n\n` +
        'If you did not sign up for Logivilia, please ignore this e-mail.\n\n' +
        SIGNATURE.en
    }),
    resetDone: () => ({
      subject: '[Logivilia] Password changed',
      text: 'You are receiving this e-mail because you have successfully changed your password.\n' +
        'You can now log in with your new password.\n\n' +
        SIGNATURE.en
    }),
    test: () => ({
      subject: '[Logivilia] Test e-mail',
      text: 'This test e-mail confirms that Logivilia can send e-mails.'
    })
  }
};

/**
 * { subject, text } of one e-mail.
 * @param {'forgot'|'verify'|'resetDone'|'test'} kind
 * @param {string} locale
 * @param {object} [params]
 */
function mailText (kind, locale, params = {}) {
  const texts = TEXTS[MAIL_LOCALES.includes(locale) ? locale : 'de'];
  return texts[kind](params);
}

module.exports = { mailLocale, mailText, MAIL_LOCALES };
