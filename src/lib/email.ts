import nodemailer from 'nodemailer';

function getTransporter() {
  if (!process.env.EMAIL_HOST || !process.env.EMAIL_USER || !process.env.EMAIL_PASS) {
    return null;
  }
  return nodemailer.createTransport({
    host: process.env.EMAIL_HOST,
    port: parseInt(process.env.EMAIL_PORT || '587', 10),
    secure: process.env.EMAIL_PORT === '465',
    auth: {
      user: process.env.EMAIL_USER,
      pass: process.env.EMAIL_PASS,
    },
  });
}

async function sendMail(subject: string, html: string, to: string): Promise<boolean> {
  const transporter = getTransporter();
  if (!transporter) {
    // Terminal mod (razvoj bez SMTP podešavanja)
    console.log('=======================================');
    console.log(`📧 [TERMINAL MOD] ${subject}`);
    console.log(`TO: ${to}`);
    console.log(html.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim().slice(0, 900));
    console.log('=======================================');
    return true;
  }

  try {
    await transporter.sendMail({
      from: process.env.EMAIL_FROM || process.env.EMAIL_USER,
      to,
      subject,
      html,
    });
    console.log(`📧 Email poslat: ${subject} → ${to}`);
    return true;
  } catch (error) {
    console.error('📧 Email slanje nije uspjelo:', error);
    return false;
  }
}

const WRAPPER = (inner: string) => `
  <div style="font-family: Arial, sans-serif; max-width: 480px; margin: 0 auto; padding: 24px; background: #0F0E17; color: #FFFFFF; border-radius: 16px;">
    <h2 style="color: #FF0080; margin: 0 0 16px; text-transform: uppercase;">Gdje Večeras</h2>
    ${inner}
    <p style="font-size: 11px; color: #4A4A60; margin-top: 24px;">Ako nisi tražio/la ovaj email, ignoriši ga. Gdje Večeras — Gdje večeras?</p>
  </div>
`;

export async function sendVerificationEmail(email: string, token: string) {
  const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';
  const verificationLink = `${baseUrl}/verify-email?token=${token}`;
  return sendMail(
    'Potvrdi svoju email adresu — Gdje Večeras',
    WRAPPER(`
      <p style="font-size: 14px; line-height: 1.6; color: #B0B0C0;">Zdravo!<br/>Hvala što si se registrovao/la. Klikni na dugme ispod da potvrdiš svoju email adresu.</p>
      <a href="${verificationLink}" style="display: inline-block; margin: 16px 0; padding: 14px 28px; background: #FF0080; color: #FFFFFF; text-decoration: none; border-radius: 10px; font-weight: bold; text-transform: uppercase; font-size: 13px; letter-spacing: 1px;">Potvrdi email</a>
      <p style="font-size: 12px; color: #6B6B80;">Ako dugme ne radi, kopiraj ovaj link u preglednik:<br/>${verificationLink}</p>
    `),
    email
  );
}

/** Nova (jednokratna) lozinka za admin prijavu. */
export async function sendAdminPasswordEmail(email: string, password: string) {
  return sendMail(
    'Tvoja nova lozinka za prijavu — Gdje Večeras',
    WRAPPER(`
      <p style="font-size: 14px; line-height: 1.6; color: #B0B0C0;">Neko je zatražio prijavu na tvoj administratorski nalog.</p>
      <div style="margin: 16px 0; padding: 18px; background: #1A1825; border: 1px dashed #FF0080; border-radius: 10px; text-align: center;">
        <p style="margin: 0 0 6px; font-size: 11px; color: #6B6B80; text-transform: uppercase; letter-spacing: 1px;">Tvoja nova lozinka</p>
        <p style="margin: 0; font-size: 22px; font-weight: bold; letter-spacing: 2px; color: #FFFFFF;">${password}</p>
      </div>
      <p style="font-size: 12px; color: #6B6B80;">Lozinka važi <b>15 minuta</b> i može se iskoristiti <b>samo jednom</b>. Ako nisi ti zatražio/la prijavu, ignoriši ovaj email — tvoj nalog je i dalje bezbedan.</p>
    `),
    email
  );
}

/** Link za resetovanje lozinke (obični korisnici). */
export async function sendPasswordResetEmail(email: string, token: string) {
  const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';
  const resetLink = `${baseUrl}/reset-password?token=${token}`;
  return sendMail(
    'Resetovanje lozinke — Gdje Večeras',
    WRAPPER(`
      <p style="font-size: 14px; line-height: 1.6; color: #B0B0C0;">Zatražio/la si resetovanje lozinke. Klikni na dugme ispod da postaviš novu lozinku.</p>
      <a href="${resetLink}" style="display: inline-block; margin: 16px 0; padding: 14px 28px; background: #FF0080; color: #FFFFFF; text-decoration: none; border-radius: 10px; font-weight: bold; text-transform: uppercase; font-size: 13px; letter-spacing: 1px;">Postavi novu lozinku</a>
      <p style="font-size: 12px; color: #6B6B80;">Link važi 30 minuta. Ako dugme ne radi, kopiraj ovaj link:<br/>${resetLink}</p>
    `),
    email
  );
}
