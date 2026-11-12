'use client';
export default function GlobalError({ reset }: { error: Error; reset: () => void }) {
  return (
    <html lang="en"><body style={{ margin: 0, fontFamily: 'system-ui, sans-serif', background: '#FBF9F4', color: '#1F2A23' }}>
      <div style={{ maxWidth: 520, margin: '0 auto', padding: '96px 20px', textAlign: 'center' }}>
        <h1 style={{ fontWeight: 600, fontSize: 26 }}>Tiada is having a moment</h1>
        <p style={{ fontSize: 15, lineHeight: 1.7, color: '#3C4741' }}>The shop couldn’t load just now. Please try again in a minute, or order on WhatsApp: <a href="https://wa.me/2348075110000" style={{ color: '#0B3A23' }}>0807 511 0000</a>.</p>
        <button type="button" onClick={reset} style={{ marginTop: 12, height: 48, padding: '0 24px', border: 0, borderRadius: 4, background: '#0B3A23', color: '#FFF', fontWeight: 600, cursor: 'pointer' }}>Try again</button>
      </div>
    </body></html>
  );
}
