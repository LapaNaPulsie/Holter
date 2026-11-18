import type { Mailer, MailMessage } from './send-core';

/**
 * Usługi pocztowe. Wybór i dane dostępowe pochodzą WYŁĄCZNIE ze zmiennych środowiskowych Netlify:
 *
 *  Wariant A – SMTP (np. skrzynka w domenie lapanapulsie.pl na serwerze cyber_Folks):
 *    SMTP_HOST, SMTP_PORT (465 lub 587), SMTP_USER, SMTP_PASS, MAIL_FROM
 *  Wariant B – Resend (https://resend.com):
 *    RESEND_API_KEY, MAIL_FROM (adres w domenie zweryfikowanej w Resend)
 *
 *  EMAIL_PROVIDER = "smtp" | "resend" – opcjonalnie, gdy ustawione są oba warianty.
 *  Komunikaty błędów zawierają tylko kody techniczne, nigdy treść wiadomości.
 */

type Env = Record<string, string | undefined>;

export function resendMailer(apiKey: string, from: string, fetchImpl: typeof fetch = fetch): Mailer {
  return {
    async send(msg: MailMessage) {
      const res = await fetchImpl('https://api.resend.com/emails', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${apiKey}`,
          'Content-Type': 'application/json',
          'Idempotency-Key': msg.idempotencyKey,
        },
        body: JSON.stringify({
          from,
          to: [msg.to],
          subject: msg.subject,
          text: msg.text,
          html: msg.html,
          attachments: [{ filename: msg.attachment.filename, content: msg.attachment.contentBase64 }],
        }),
      });
      if (!res.ok) throw new Error(`resend_http_${res.status}`);
      const body = (await res.json().catch(() => ({}))) as { id?: string };
      if (!body.id) throw new Error('resend_no_id');
      return { id: body.id };
    },
  };
}

export async function smtpMailer(cfg: { host: string; port: number; user: string; pass: string; from: string; secure?: boolean; tls?: { rejectUnauthorized: boolean } }): Promise<Mailer> {
  const nodemailer = await import('nodemailer');
  const transport = nodemailer.createTransport({
    host: cfg.host,
    port: cfg.port,
    secure: cfg.secure ?? cfg.port === 465,
    requireTLS: !(cfg.secure ?? cfg.port === 465),
    auth: { user: cfg.user, pass: cfg.pass },
    connectionTimeout: 10_000,
    greetingTimeout: 10_000,
    socketTimeout: 20_000,
    tls: cfg.tls,
    logger: false,
    debug: false,
  });
  return {
    async send(msg: MailMessage) {
      let info: { messageId: string; accepted: unknown[]; rejected: unknown[] };
      try {
        info = await transport.sendMail({
          from: cfg.from,
          to: msg.to,
          subject: msg.subject,
          text: msg.text,
          html: msg.html,
          attachments: [{ filename: msg.attachment.filename, content: msg.attachment.contentBase64, encoding: 'base64', contentType: 'application/pdf' }],
          headers: { 'X-Entity-Ref-ID': msg.idempotencyKey },
        });
      } catch (e) {
        const code = (e as { code?: string; responseCode?: number }).responseCode ?? (e as { code?: string }).code ?? 'unknown';
        throw new Error(`smtp_${code}`);
      }
      const accepted = info.accepted.map(String).map((a) => a.toLowerCase());
      if (!accepted.includes(msg.to.toLowerCase()) || info.rejected.length > 0) throw new Error('smtp_not_accepted');
      return { id: info.messageId };
    },
  };
}

export async function mailerFromEnv(env: Env): Promise<Mailer | null> {
  const from = env.MAIL_FROM?.trim();
  if (!from) return null;
  const hasResend = !!env.RESEND_API_KEY?.trim();
  const hasSmtp = !!(env.SMTP_HOST?.trim() && env.SMTP_USER?.trim() && env.SMTP_PASS);
  const pref = env.EMAIL_PROVIDER?.trim().toLowerCase();
  if ((pref === 'resend' || (!pref && hasResend)) && hasResend) return resendMailer(env.RESEND_API_KEY!.trim(), from);
  if ((pref === 'smtp' || !pref) && hasSmtp) {
    return smtpMailer({ host: env.SMTP_HOST!.trim(), port: Number(env.SMTP_PORT || 465), user: env.SMTP_USER!.trim(), pass: env.SMTP_PASS!, from });
  }
  return null;
}
