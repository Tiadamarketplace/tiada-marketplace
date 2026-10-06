import { handle, ok } from '@/lib/http';
import { clearSession } from '@/lib/session';
import { currentStaff, logAct } from '@/lib/staff';

export const POST = handle(async (req: Request) => {
  const s = await currentStaff();
  if (s) await logAct(s.name, new URL(req.url).searchParams.get('idle') ? 'Locked after 15 minutes idle' : 'Signed out');
  await clearSession('s');
  return ok({ ok: true });
});
