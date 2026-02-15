import dotenv from 'dotenv';
dotenv.config();

import nodemailer from 'nodemailer';

const transporter = nodemailer.createTransport({
  service: 'gmail',
  auth: {
    user: process.env.EMAIL_USERNAME,
    pass: process.env.EMAIL_PASSWORD,
  },
});

export async function sendEmail(to, subject, text) {
  await transporter.sendMail({
    from: `"JoblyNest" <${process.env.EMAIL_USERNAME}>`,
    to,
    subject,
    text,
  });
}
