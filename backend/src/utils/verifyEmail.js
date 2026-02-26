// backend/src/utils/verifyEmail.js
/**
 * Email verification utility
 * 1. Blocks known disposable / throwaway email domains
 * 2. Verifies the domain has valid MX (mail exchange) DNS records
 *    using Node's built-in `dns` module — no external package needed
 */

const dns = require('dns').promises;

// ─────────────────────────────────────────────────────────────────────────────
// Disposable / temporary email domain blocklist
// ─────────────────────────────────────────────────────────────────────────────
const DISPOSABLE_DOMAINS = new Set([
    // Mailinator family
    'mailinator.com', 'mailinator2.com', 'trashmail.com', 'trashmail.at',
    'trashmail.io', 'trashmail.me', 'trashmail.net', 'trashmail.org',
    // Guerrilla Mail
    'guerrillamail.com', 'guerrillamail.net', 'guerrillamail.org',
    'guerrillamail.biz', 'guerrillamail.de', 'guerrillamail.info',
    'grr.la', 'guerrillamailblock.com', 'spam4.me',
    // 10 Minute Mail
    '10minutemail.com', '10minutemail.net', '10minutemail.org',
    '10minutemail.co.uk', '10minutemail.de', '10minemail.com',
    // Temp Mail
    'tempmail.com', 'temp-mail.org', 'temp-mail.ru', 'tmpmail.net',
    'tmpmail.org', 'tempmail.net', 'tempinbox.com', 'tempr.email',
    'dispostable.com', 'droplette.app', 'discard.email',
    // Yopmail
    'yopmail.com', 'yopmail.fr', 'cool.fr.nf', 'jetable.fr.nf',
    'nospam.ze.tc', 'nomail.xl.cx', 'mega.zik.dj', 'speed.1s.fr',
    'courriel.fr.nf', 'moncourrier.fr.nf', 'monemail.fr.nf',
    // Throwam, Fake Email, etc.
    'throwam.com', 'fakeinbox.com', 'fakemailgenerator.com',
    'sharklasers.com', 'guerrillamail.info', 'grr.la', 'guerrillamail.biz',
    'spam.la', 'spamgourmet.com', 'spamgourmet.net', 'spamgourmet.org',
    'spamherelots.com', 'spamhereplease.com', 'spamthisplease.com',
    'spam4.me', 'spamfree24.org', 'spamfree24.de', 'spamfree24.eu',
    'spamfree24.info', 'spamfree24.net',
    // Mailnull / Spambox
    'mailnull.com', 'spambox.us', 'spambox.info', 'spambox.irishspringrealty.com',
    // Discard / Throwaway
    'discardmail.com', 'discardmail.de', 'spamgap.com',
    'throwam.com', 'throwaway.email',
    // Maildrop
    'maildrop.cc', 'mailsac.com', 'mailsac.email',
    // Disporto, Burner, etc.
    'disporto.com', 'burnthespam.info', 'byom.de',
    'owlpic.com', 'clrmail.com', 'ctos.ch',
    // Nada / Einrot
    'nada.email', 'einrot.com', 'einrot.de',
    // Getairmail / Spamgourmet
    'getairmail.com', 'filzmail.com', 'zetmail.com',
    // Crap mail
    'crapmail.org', 'dontreg.com', 'dontsendmespam.de',
    // Misc popular throwaway
    'mailnesia.com', 'mailnull.com', 'mailbucket.org',
    'mail-filter.com', 'mail-temporaire.com', 'mail-temporaire.fr',
    'mytrashmail.com', 'mt2009.com', 'mt2014.com',
    'notmailinator.com', 'nowmymail.com',
    'objectmail.com', 'obobbo.com', 'odaymail.com',
    'oneoffemail.com', 'onewaymail.com',
    'pookmail.com', 'powered.name',
    'proxymail.eu', 'putthisinyourspamdatabase.com',
    'qq.com', // sometimes used as throwaway
    'rcpt.at', 'recode.me', 'recursor.net',
    'safe-mail.net', 'safetypost.de', 'sandelf.de',
    'saynotospams.com', 'shieldedmail.com', 'shiftmail.com',
    'shortmail.net', 'sibmail.com', 'skeefmail.com', 'slapsfromlastnight.com',
    'slipry.net', 'slopsbox.com', 'slushmail.com', 'smellfear.com',
    'sneakemail.com', 'sneakmail.de', 'snkmail.com', 'sofimail.com',
    'spam.su', 'spamdecoy.net', 'spamex.com',
    'spamfree.eu', 'spamgob.com',
    'spamhole.com', 'spamify.com',
    'spaml.com', 'spaml.de', 'spammotel.com', 'spamoff.de',
    'spamspot.com', 'spamstack.net', 'spamtrail.com',
    'speed.1s.fr', 'super-auswahl.de',
    'sweetxxx.de', 'tafmail.com',
    'teleworm.us', 'tempalias.com',
    'tempe-mail.com', 'tempinbox.co.uk',
    'tempmail.eu', 'tempmailer.com', 'tempmailer.de',
    'tempomail.fr', 'temporarily.de', 'temporarioemail.com.br',
    'temporaryemail.net', 'temporaryemail.us', 'temporaryforwarding.com',
    'temporaryinbox.com', 'temporarymailaddress.com', 'thanksnospam.info',
    'thisisnotmyrealemail.com', 'throwam.com', 'throwam.info',
    'throwam.net', 'throwam.org',
    'tradermail.info', 'trash-mail.at', 'trash-mail.com',
    'trash-mail.de', 'trash-mail.ga', 'trash-mail.io',
    'trash-mail.net', 'trash2009.com', 'trashdevil.com',
    'trashdevil.de', 'trashemail.de',
    'u.civvic.ro', 'uggsrock.com', 'umail.net', 'unids.com',
    'upliftnow.com', 'uroid.com',
    'veryrealemail.com', 'vidchart.com', 'viditag.com', 'viewcastmedia.com',
    'viewcastmedia.net', 'viewcastmedia.org',
    'wegwerfmail.de', 'wegwerfmail.net', 'wegwerfmail.org',
    'wetrainbayarea.com', 'wetrainbayarea.org',
    'wh4f.org', 'whyspam.me', 'willhackforfood.biz',
    'willselfdestruct.com', 'winemaven.info', 'wronghead.com',
    'www.e4ward.com', 'wwwnew.eu',
    'xemaps.com', 'xents.com', 'xmaily.com', 'xoxy.net',
    'yapped.net', 'yeah.net', 'yepmail.net',
    'z1p.biz', 'za.com', 'zehnminutenmail.de',
    'zippymail.info', 'zoemail.net', 'zoemail.org',
    'zomg.info',
]);

// ─────────────────────────────────────────────────────────────────────────────
// Check if a domain is disposable / throwaway
// ─────────────────────────────────────────────────────────────────────────────
const isDisposableDomain = (email) => {
    const domain = email.split('@')[1]?.toLowerCase();
    if (!domain) return true;
    return DISPOSABLE_DOMAINS.has(domain);
};

// ─────────────────────────────────────────────────────────────────────────────
// Check if the email domain has MX records (i.e. can actually receive mail)
// ─────────────────────────────────────────────────────────────────────────────
const hasMxRecords = async (email) => {
    const domain = email.split('@')[1]?.toLowerCase();
    if (!domain) return false;
    try {
        const records = await dns.resolveMx(domain);
        return Array.isArray(records) && records.length > 0;
    } catch {
        // NXDOMAIN, timeout, etc. — domain doesn't exist or has no MX
        return false;
    }
};

// ─────────────────────────────────────────────────────────────────────────────
// Full email verification — returns { valid: bool, reason: string }
// ─────────────────────────────────────────────────────────────────────────────
const verifyEmail = async (email) => {
    if (!email || typeof email !== 'string') {
        return { valid: false, reason: 'Email is required.' };
    }

    const cleaned = email.trim().toLowerCase();

    // Basic format check
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(cleaned)) {
        return { valid: false, reason: 'Invalid email format.' };
    }

    // Disposable domain check
    if (isDisposableDomain(cleaned)) {
        return { valid: false, reason: 'Disposable or temporary email addresses are not allowed.' };
    }

    // MX record check
    const mxExists = await hasMxRecords(cleaned);
    if (!mxExists) {
        return { valid: false, reason: 'Email domain does not exist or cannot receive emails.' };
    }

    return { valid: true, reason: null };
};

module.exports = { verifyEmail, isDisposableDomain, hasMxRecords };
