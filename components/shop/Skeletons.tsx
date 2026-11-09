/** Loading screens shaped like the real pages, shown the moment a link is tapped. */
const bar = (w: number | string, h: number, extra?: React.CSSProperties) => <span className="skel" style={{ display: 'block', width: w, height: h, borderRadius: 4, ...extra }} />;
const wrap: React.CSSProperties = { maxWidth: 1360, margin: '0 auto', padding: '36px clamp(16px, 3vw, 28px) 60px' };

export function GridSkeleton() {
  return (
    <div role="status" aria-label="Loading" style={wrap}>
      {bar(90, 11)}
      {bar('min(340px, 70%)', 34, { marginTop: 14 })}
      {bar('min(520px, 90%)', 14, { marginTop: 14 })}
      <div className="grid grid4" style={{ marginTop: 34 }}>
        {Array.from({ length: 8 }, (_, i) => (
          <div key={i} style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            <span className="skel" style={{ display: 'block', aspectRatio: '1 / 1', borderRadius: 5 }} />
            {bar('75%', 14)}
            {bar('45%', 12)}
            {bar('35%', 15, { marginTop: 4 })}
          </div>
        ))}
      </div>
    </div>
  );
}

export function ProductSkeleton() {
  return (
    <div role="status" aria-label="Loading" style={wrap}>
      {bar(220, 11)}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(min(320px, 100%), 1fr))', gap: 'clamp(28px, 5vw, 72px)', marginTop: 26, alignItems: 'start' }}>
        <span className="skel" style={{ display: 'block', aspectRatio: '1 / 1', borderRadius: 6 }} />
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          {bar(110, 11)}
          {bar('80%', 36)}
          {bar(140, 24)}
          {bar('95%', 14, { marginTop: 8 })}
          {bar('85%', 14)}
          <div style={{ display: 'flex', gap: 10, marginTop: 12 }}>{[0, 1, 2, 3].map(i => <span key={i} className="skel" style={{ display: 'block', width: 72, height: 44, borderRadius: 4 }} />)}</div>
          {bar('100%', 52, { marginTop: 12 })}
        </div>
      </div>
    </div>
  );
}
