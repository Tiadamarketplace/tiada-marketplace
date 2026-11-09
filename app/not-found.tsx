import Link from '@/components/shop/Link';
export default function NotFound() {
  return (
    <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 14, padding: 24, textAlign: 'center', background: '#FBF9F4' }}>
      <Link href="/"><img src="/logo-sm.png" alt="Tiada Marketplace" style={{ height: 64 }} /></Link>
      <span className="serif" style={{ fontSize: 64, color: '#D49B41', lineHeight: 1 }}>404</span>
      <h1 style={{ margin: 0, fontWeight: 500, fontSize: 28 }}>We can’t find that page</h1>
      <Link href="/" style={{ height: 50, padding: '0 26px', borderRadius: 4, background: '#0B3A23', color: '#FFFFFF', fontWeight: 600, display: 'flex', alignItems: 'center', textDecoration: 'none' }}>Go to the shop</Link>
    </div>
  );
}
