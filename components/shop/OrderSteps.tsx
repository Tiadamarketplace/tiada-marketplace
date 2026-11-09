'use client';
/** The four delivery steps used on Track and in My account. */
const STEPS = [['new', 'Paid'], ['packed', 'Packed'], ['route', 'On the way'], ['done', 'Delivered']] as const;
export const STATUS_LABEL: Record<string, string> = { new: 'Paid · being packed', packed: 'Packed', route: 'On the way', done: 'Delivered', issue: 'Needs attention', refunded: 'Refunded', cancelled: 'Cancelled' };
export const STATUS_COLOR: Record<string, [string, string]> = { new: ['#F6E9CF', '#6B4A12'], packed: ['#E6EEE8', '#0B3A23'], route: ['#E6EEE8', '#0B3A23'], done: ['#0B3A23', '#FFFFFF'], issue: ['#FBEFEB', '#7A2A1B'], refunded: ['#EFEDE6', '#4D5A52'], cancelled: ['#EFEDE6', '#4D5A52'] };

export function StatusPill({ s }: { s: string }) {
  const [bg, fg] = STATUS_COLOR[s] || STATUS_COLOR.new;
  return <span style={{ padding: '4px 10px', borderRadius: 999, background: bg, color: fg, fontSize: 12, fontWeight: 600, whiteSpace: 'nowrap' }}>{STATUS_LABEL[s] || s}</span>;
}
export default function OrderSteps({ status }: { status: string }) {
  const at = STEPS.findIndex(x => x[0] === status);
  if (at < 0) return null;
  return (
    <ol aria-label="Order progress" style={{ listStyle: 'none', margin: 0, padding: 0, display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 6 }}>
      {STEPS.map(([k, l], i) => (
        <li key={k} aria-current={i === at ? 'step' : undefined} style={{ display: 'flex', flexDirection: 'column', gap: 8, fontSize: 12.5, fontWeight: i === at ? 600 : 500, color: i <= at ? '#0B3A23' : '#8B958E' }}>
          <span style={{ height: 4, borderRadius: 4, background: i <= at ? '#0B3A23' : '#E6E2D8' }} />{l}
        </li>
      ))}
    </ol>
  );
}
