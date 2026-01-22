import { Injectable } from '@nestjs/common';
import nodemailer from 'nodemailer';

type MailMode = 'real' | 'redirect' | 'off' | 'ethereal' | 'file';

@Injectable()
export class MailService {
  private transporter!: nodemailer.Transporter;
  private ready: Promise<void>;

  constructor() {
    this.ready = this.init();
  }

  private async init() {
    const mode = (process.env.MAIL_MODE || 'real').toLowerCase() as MailMode;

    if (mode === 'off') {
      this.transporter = nodemailer.createTransport({ jsonTransport: true });
      console.log('MAIL_MODE=off');
      return;
    }

    if (mode === 'file') {
      // 100% local: no red, no SMTP
      this.transporter = nodemailer.createTransport({
        streamTransport: true,
        newline: 'unix',
        buffer: true,
      });
      console.log('MAIL_MODE=file');
      console.log('MAIL_FILE_PATH=', process.env.MAIL_FILE_PATH || 'mails.eml');
      return;
    }

    if (mode === 'ethereal') {
      // Requiere internet. Agregamos timeout para que no se quede colgado.
      const testAccount = await nodemailer.createTestAccount();

      this.transporter = nodemailer.createTransport({
        host: testAccount.smtp.host,
        port: testAccount.smtp.port,
        secure: testAccount.smtp.secure,
        auth: { user: testAccount.user, pass: testAccount.pass },

        // Evita cuelgues por red bloqueada
        connectionTimeout: 10_000,
        greetingTimeout: 10_000,
        socketTimeout: 20_000,
      });

      console.log('MAIL_MODE=ethereal');
      console.log('ETHEREAL user=', testAccount.user);
      console.log('ETHEREAL pass=', testAccount.pass);
      return;
    }

    // REAL / REDIRECT: SMTP real (Gmail/SES/etc)
    this.transporter = nodemailer.createTransport({
      host: process.env.SMTP_HOST,
      port: Number(process.env.SMTP_PORT || 587),
      secure: (process.env.SMTP_SECURE || 'false').toLowerCase() === 'true',
      auth: { user: process.env.SMTP_USER, pass: process.env.SMTP_PASS },

      // Evita cuelgues por red/firewall
      connectionTimeout: 10_000,
      greetingTimeout: 10_000,
      socketTimeout: 20_000,
    });

    console.log('SMTP_HOST=', process.env.SMTP_HOST);
    console.log('SMTP_PORT=', process.env.SMTP_PORT);
    console.log('MAIL_MODE=', process.env.MAIL_MODE);
    console.log('MAIL_REDIRECT_TO=', process.env.MAIL_REDIRECT_TO);
  }

  async send(to: string, subject: string, html: string) {
    await this.ready;

    const mode = (process.env.MAIL_MODE || 'real').toLowerCase() as MailMode;
    const redirectTo = process.env.MAIL_REDIRECT_TO;

    let finalTo = to;
    let finalSubject = subject;

    if (mode === 'redirect') {
      if (!redirectTo) throw new Error('MAIL_REDIRECT_TO no está configurado');
      finalTo = redirectTo;
      finalSubject = `[REDIRIGIDO a ${redirectTo}] (real: ${to}) ${subject}`;
    }

    if (mode === 'off') {
      return {
        skipped: true,
        reason: 'MAIL_MODE=off',
        to: finalTo,
        subject: finalSubject,
      };
    }

    console.log(
      'MailService.send() to=',
      finalTo,
      'subject=',
      finalSubject,
      'mode=',
      mode,
    );

    const info = await this.transporter.sendMail({
      from: process.env.MAIL_FROM || '"TNE" <noreply@universidad.cl>',
      to: finalTo,
      subject: finalSubject,
      html,
    });

    if (mode === 'ethereal') {
      const previewUrl = nodemailer.getTestMessageUrl(info);
      console.log('Ethereal Preview URL:', previewUrl);
      return {
        ok: true,
        previewUrl: previewUrl || null,
        messageId: (info as any).messageId ?? null,
        response: (info as any).response ?? null,
        to: finalTo,
        subject: finalSubject,
      };
    }

    if (mode === 'file') {
      const fs = await import('fs');
      const path = process.env.MAIL_FILE_PATH || 'mails.eml';
      const content =
        (info as any).message?.toString?.() || JSON.stringify(info, null, 2);

      fs.appendFileSync(path, content + '\n\n---\n\n', { encoding: 'utf8' });
      console.log('Mail saved to:', path);
      return { ok: true, savedTo: path, to: finalTo, subject: finalSubject };
    }

    return info;
  }
}
