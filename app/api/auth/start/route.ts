import crypto from 'crypto';
import { z } from 'zod';
import { handle, ok, limit, clientIp } from '@/lib/http';
import { db, must } from '@/lib/db';
import { sendEmail, layout } from '@/lib/email';

const Body = z.object({ email: z.string().trim().toLowerCase().email('Enter a valid email address.').max(120) });
export const POST = handle(async (req: Request) => {
  const { email } = Body.parse(await req.json());
  const ip = clientIp(req);
  limit('start:' + ip, 8, 10 * 60000);
  limit('start:' + email, 4, 10 * 60000);
  const code = String(crypto.randomInt(0, 1000000)).padStart(6, '0');
  const hash = crypto.createHash('sha256').update(code + email).digest('hex');
  must(await db().from('login_codes').insert({ email, code_hash: hash, expires_at: new Date(Date.now() + 10 * 60000).toISOString(), ip }));
  const sent = await sendEmail(email, `${code} is your Tiada sign-in code`, layout({ heading: 'Your sign-in code', preheader: `${code} is your code`, bodyHtml:
    `<p style="margin:0 0 12px">Use this code to sign in to Tiada Marketplace. It expires in 10 minutes.</p>
     <p style="font-size:34px;font-weight:800;letter-spacing:10px;text-align:center;color:#0B3A23;margin:18px 0">${code}</p>
     <p style="margin:0;color:#6B7A70;font-size:13px">Never share this code. Tiada staff will never ask for it. If you didn’t try to sign in, you can ignore this email.</p>` }),
    `Your Tiada sign-in code is ${code}. It expires in 10 minutes.`);
  if (!sent.ok) console.error('code email failed', sent.error);
  return ok({ sent: true, devNote: sent.ok ? undefined : 'Email is not set up yet. Check RESEND_API_KEY.' });
});
