import { Resend } from 'resend';

let _resend: Resend | null = null;

export function isResendConfigured(): boolean {
  return !!process.env.RESEND_API_KEY;
}

export function getResend(): Resend {
  if (!process.env.RESEND_API_KEY) {
    throw new Error('Resend is not configured. Set RESEND_API_KEY in environment variables.');
  }
  if (!_resend) {
    _resend = new Resend(process.env.RESEND_API_KEY);
  }
  return _resend;
}
