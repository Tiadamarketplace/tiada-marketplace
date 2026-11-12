import Link from '@/components/shop/Link';
export default function NotFound() {
  return (
    <div className="fade" style={{ maxWidth: 560, margin: '0 auto', padding: '80px clamp(16px, 3vw, 28px) 0', textAlign: 'center', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 14 }}>
      <span className="serif" style={{ fontSize: 72, color: '#D49B41', lineHeight: 1 }}>404</span>
      <h1 style={{ margin: 0, fontWeight: 500, fontSize: 30 }}>We can’t find that page</h1>
      <p style={{ margin: 0, fontSize: 15, lineHeight: 1.7, color: '#3C4741' }}>It may have moved, or the product is no longer listed. Try searching, or start from the home page.</p>
      <div style={{ display: 'flex', flexWrap: 'wrap', justifyContent: 'center', gap: 10, marginTop: 6 }}>
        <Link href="/" className="ub btn-solid press" style={{ height: 50, padding: '0 26px', borderRadius: 4, background: '#0B3A23', color: '#FFFFFF', fontWeight: 600, display: 'flex', alignItems: 'center', textDecoration: 'none' }}>Go to the home page</Link>
        <Link href="/aisle/all" className="btn-out" style={{ height: 50, padding: '0 22px', borderRadius: 4, border: '1.5px solid #0B3A23', color: '#0B3A23', fontWeight: 600, display: 'flex', alignItems: 'center', textDecoration: 'none' }}>Browse all products</Link>
      </div>
    </div>
  );
}
