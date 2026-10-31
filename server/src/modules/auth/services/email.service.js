import nodemailer from 'nodemailer';
import env from '../../../config/env.js';
import { ApiError } from '../../../utils/ApiError.js';

let transporter;
const getTransporter = () => {
  if (!env.smtp.configured) throw new ApiError(503, 'Password reset email service is not configured');
  transporter ??= nodemailer.createTransport({
    host: env.smtp.host,
    port: env.smtp.port,
    secure: env.smtp.secure,
    auth: { user: env.smtp.user, pass: env.smtp.password },
    disableFileAccess: true,
    disableUrlAccess: true,
  });
  return transporter;
};

export const sendEmail = ({ to, subject, text, html }) => getTransporter().sendMail({
  from: env.smtp.from,
  to,
  subject,
  text,
  ...(html ? { html } : {}),
});

export const sendPasswordResetEmail = ({ email, fullName, resetUrl }) => sendEmail({
  to: email,
  subject: 'Reset your CivicConnect password',
  text: `Hello ${fullName}, reset your password using this link: ${resetUrl}. This link expires in 15 minutes. If you did not request this, ignore this email.`,
});
