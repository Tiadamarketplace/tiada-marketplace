import crypto from 'crypto';
import { z } from 'zod';
import { handle, ok, fail } from '@/lib/http';
import { db } from '@/lib/db';
import { requireStaff } from '@/lib/staff';

export const dynamic = 'force-dynamic';
const Body = z.object({ dataUrl: z.string().max(4_000_000), folder: z.enum(['products', 'banners']).default('products') });

/** Saves a photo (already cropped in the browser) to Supabase Storage and returns its public link. */
export const POST = handle(async (req: Request) => {
  await requireStaff(req, 'catalog');
  const b = Body.parse(await req.json());
  const m = /^data:image\/(jpeg|png|webp);base64,([A-Za-z0-9+/=]+)$/.exec(b.dataUrl);
  if (!m) return fail('Choose a JPG or PNG picture.');
  const buf = Buffer.from(m[2], 'base64');
  if (buf.length > 2_500_000) return fail('That picture is too large. Use one under 2.5 MB.');
  const magicOk = (m[1] === 'jpeg' && buf[0] === 0xff && buf[1] === 0xd8) || (m[1] === 'png' && buf[0] === 0x89 && buf[1] === 0x50) || (m[1] === 'webp' && buf.subarray(8, 12).toString() === 'WEBP');
  if (!magicOk) return fail('That file isn’t a real picture.');
  const path = `${b.folder}/${Date.now()}-${crypto.randomBytes(4).toString('hex')}.${m[1] === 'jpeg' ? 'jpg' : m[1]}`;
  const up = await db().storage.from('products').upload(path, buf, { contentType: 'image/' + m[1], cacheControl: '31536000', upsert: false });
  if (up.error) return fail('Upload failed: ' + up.error.message, 500);
  return ok({ url: db().storage.from('products').getPublicUrl(path).data.publicUrl });
});
