import { handle, ok } from '@/lib/http';
import { currentStaff, ROLE_LABEL } from '@/lib/staff';

export const dynamic = 'force-dynamic';
export const GET = handle(async () => {
  const s = await currentStaff();
  return ok({ staff: s ? { name: s.name, email: s.email, role: ROLE_LABEL[s.role] } : null });
});
