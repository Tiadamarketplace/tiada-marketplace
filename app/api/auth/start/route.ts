import crypto from 'crypto';
import { z } from 'zod';
import { handle, ok, limit, clientIp } from '@/lib/http';
import { db, must } from '@/lib/db';
import { signInCode } from '@/lib/notify';

const Body = z.object({ email: z.string().trim().toLowerCase().email('Enter a valid email address.').max(120) });
export const POST = handle(async (req: Request) => {
  const { email } = Body.parse(await req.json());
  const ip = clientIp(req);
  limit('start:' + ip, 8, 10 * 60000);
  limit('start:' + email, 4, 10 * 60000);
  const code = String(crypto.randomInt(0, 1000000)).padStart(6, '0');
  const hash = crypto.createHash('sha256').update(code + email).digest('hex');
  must(await db().from('login_codes').insert({ email, code_hash: hash, expires_at: new Date(Date.now() + 10 * 60000).toISOString(), ip }));
  const sent = await signInCode(email, code);
  if (!sent.ok) console.error('code email failed', sent.error);
  return ok({ sent: true, devNote: sent.ok ? undefined : 'Email is not set up yet. Check RESEND_API_KEY.' });
});
