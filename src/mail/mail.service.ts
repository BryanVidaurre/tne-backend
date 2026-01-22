/* eslint-disable @typescript-eslint/no-unsafe-assignment */
import { Injectable } from '@nestjs/common';
import nodemailer from 'nodemailer';

@Injectable()
export class MailService {
  private transporter: nodemailer.Transporter;

  constructor() {
    console.log('SMTP_HOST=', process.env.SMTP_HOST);
    console.log('SMTP_PORT=', process.env.SMTP_PORT);
    console.log('MAIL_MODE=', process.env.MAIL_MODE);
    console.log('MAIL_REDIRECT_TO=', process.env.MAIL_REDIRECT_TO);

    this.transporter = nodemailer.createTransport({
      host: process.env.SMTP_HOST,
      port: Number(process.env.SMTP_PORT || 587),
      secure: false,
      auth: {
        user: process.env.SMTP_USER,
        pass: process.env.SMTP_PASS,
      },
    });
  }

  async send(to: string, subject: string, html: string) {
    const mode = (process.env.MAIL_MODE || 'real').toLowerCase();
    const redirectTo = process.env.MAIL_REDIRECT_TO;

    let finalTo = to;

    if (mode === 'redirect') {
      if (!redirectTo) throw new Error('MAIL_REDIRECT_TO no está configurado');
      finalTo = redirectTo;
      subject = `[REDIRIGIDO a ${redirectTo}] (real: ${to}) ${subject}`;
    }

    if (mode === 'off') {
      return { skipped: true, reason: 'MAIL_MODE=off', to: finalTo, subject };
    }

    return this.transporter.sendMail({
      from: process.env.MAIL_FROM || '"TNE" <noreply@universidad.cl>',
      to: finalTo,
      subject,
      html,
    });
  }
}
