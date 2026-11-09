'use client';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import { useShop } from '../ShopProvider';
import Row from '../Row';
import { Lightbox } from '../Overlays';
import { ProductImage } from '../ProductCard';
import { naira, nowPrice, inStock, defaultSize, isCombo, aisleLabel, SWAP_CEREAL, SWAP_FOOD, api, maxOff } from '@/lib/shop-client';
import { IExpand } from '../Icons';

const DESC: Record<string, string> = {
  cereal: 'Repacked by weight from sealed bulk cartons into clean, food-grade zip bags on the day we pack your order. Choose the size that suits your home.',
  milk: 'Powdered milk and chocolate drinks measured out by weight and sealed in food-grade packs. Keep in a cool, dry place and close the bag after use.',
  grain: 'Oats, granola and custard for warm breakfasts, packed by weight in sealed food-grade bags.',
  food: 'Everyday pantry staples, cleaned and packed in the size your home needs. Bigger sizes cost less per kilo.',
  ccombo: 'A ready-made breakfast box at one price. Swap any item for another cereal, milk or drink before you add it, and the price stays the same.',
  fcombo: 'A pantry pack for students and families at one price. Swap any item before you add it, and the price stays the same.',
};
type Review = { id: string; name: string; stars: number; text: string; reply: string | null; created_at: string; mine: boolean };
const stars = (n: number) => '★★★★★'.slice(0, Math.round(n)) + '☆☆☆☆☆'.slice(0, 5 - Math.round(n));
const ago = (iso: string) => { const d = Math.floor((Date.now() - +new Date(iso)) / 864e5); return d < 1 ? 'Today' : d < 2 ? 'Yesterday' : d < 30 ? `${d} days ago` : new Date(iso).toLocaleDateString('en-NG', { month: 'short', year: 'numeric' }); };

export default function ProductPage({ id }: { id: string }) {
  const { byId, data, add, seen, recent, user, notify, setChoose } = useShop();
  const router = useRouter();
  const p = byId[id];
  const combo = isCombo(p);
  const [si, setSi] = useState(() => defaultSize(p));
  const [qty, setQty] = useState(1);
  const [swaps, setSwaps] = useState<Record<string, string>>({});
  const [acc, setAcc] = useState<Record<number, boolean>>({ 0: true });
  const [view, setView] = useState(false);
  const [nEmail, setNEmail] = useState('');
  const [nDone, setNDone] = useState('');
  const [nErr, setNErr] = useState('');
  const [nBusy, setNBusy] = useState(false);
  const [rv, setRv] = useState<{ reviews: Review[]; canReview: boolean; mine: { status: string } | null } | null>(null);
  const [writing, setWriting] = useState(false);
  const [rStars, setRStars] = useState(0);
  const [rText, setRText] = useState('');
  const [rErr, setRErr] = useState('');
  const [rSent, setRSent] = useState(false);

  useEffect(() => { seen(id); setSi(defaultSize(p)); setQty(1); setSwaps({}); setNDone(''); setWriting(false); setRSent(false); }, [id]); // eslint-disable-line react-hooks/exhaustive-deps
  useEffect(() => { if (user?.email) setNEmail(e => e || user.email); }, [user]);
  useEffect(() => {
    // arriving from the "How was your order?" stars in the delivered email
    if (!rv?.canReview || rv.mine) return;
    const u = new URL(window.location.href); if (u.searchParams.get('rate') !== '1') return;
    const n = Number(u.searchParams.get('stars')); if (n >= 1 && n <= 5) setRStars(n);
    setWriting(true); setTimeout(() => document.getElementById('rv-h')?.scrollIntoView({ behavior: 'smooth' }), 200);
  }, [rv]);
  useEffect(() => { let on = true; api<typeof rv>('/api/reviews?pid=' + encodeURIComponent(id)).then(r => on && setRv(r)).catch(() => on && setRv({ reviews: [], canReview: false, mine: null })); return () => { on = false; }; }, [id, user]);

  const s = p.sizes[si];
  const ok = !!s && inStock(p, s);
  const cap = s?.left != null ? s.left : 50;
  const price = s ? nowPrice(s) : 0;
  const was = s?.sale && s.price && s.sale < s.price ? s.price : null;
  const swapList = combo ? (p.cat === 'ccombo' ? SWAP_CEREAL : SWAP_FOOD) : [];
  const swapArr = Object.entries(swaps).filter(([a, b]) => a !== b).map(([from, to]) => ({ from, to }));
  const doAdd = () => { if (!ok) return; add(p.id, s.label, qty, swapArr.length ? swapArr : undefined); };
  const buyNow = () => { doAdd(); router.push('/checkout'); };

  const tellMe = async () => {
    setNErr('');
    if (!/^\S+@\S+\.\S+$/.test(nEmail.trim())) return setNErr('Enter a full email address, like name@gmail.com.');
    setNBusy(true);
    try { await api('/api/stock-alert', { json: { pid: p.id, size: s.label, email: nEmail.trim() } }); setNDone(nEmail.trim()); }
    catch (e) { setNErr((e as Error).message); } finally { setNBusy(false); }
  };
  const postReview = async () => {
    setRErr('');
    if (!rStars) return setRErr('Tap a star to rate it.');
    if (rText.trim().length < 10) return setRErr('Write a little more. At least 10 characters.');
    try { await api('/api/reviews', { json: { pid: p.id, stars: rStars, text: rText.trim() } }); setRSent(true); setWriting(false); notify('ok', 'Thanks for your review.', 'It will show once we’ve checked it.'); }
    catch (e) { setRErr((e as Error).message); }
  };

  const list = rv?.reviews || [];
  const avg = list.length ? list.reduce((a, r) => a + r.stars, 0) / list.length : 0;
  const related = data.products.filter(x => x.id !== p.id && (x.cat === p.cat || (p.cat === 'milk' && x.cat === 'ccombo'))).slice(0, 10);
  const seenRow = recent.filter(x => x !== p.id).map(x => byId[x]).filter(Boolean);
  const off = maxOff(p);
  const accs: [string, string][] = [
    ['Description', DESC[p.cat] || ''],
    ['Delivery', data.policies.delivery || 'Choose your Lagos area at checkout to see your fee and delivery day. Outside Lagos, we send through a courier and tell you the cost before you pay.'],
    ['Payment', 'Pay online through Paystack by card, bank transfer or USSD. Your payment confirms on its own and we email your receipt.'],
  ];
  if (data.policies.returns) accs.push(['Returns', data.policies.returns]);

  return (
    <>
      <div style={{ maxWidth: 1240, margin: '0 auto', padding: '18px clamp(16px, 3vw, 28px) 0' }}>
        <nav aria-label="Breadcrumb"><ol style={{ listStyle: 'none', margin: 0, padding: 0, display: 'flex', flexWrap: 'wrap', gap: 8, fontSize: 12.5, color: '#66736B' }}>
          <li><Link href="/" className="quiet" style={{ color: 'inherit', textDecoration: 'none' }}>Home</Link></li><li aria-hidden="true">›</li>
          <li><Link href={'/aisle/' + p.cat} className="quiet" style={{ color: 'inherit', textDecoration: 'none' }}>{aisleLabel(p.cat)}</Link></li><li aria-hidden="true">›</li>
          <li aria-current="page" style={{ color: '#1F2A23' }}>{p.name}</li>
        </ol></nav>
        <div className="fade" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(min(320px, 100%), 1fr))', gap: 'clamp(28px, 5vw, 72px)', marginTop: 26, alignItems: 'start' }}>
          <button type="button" className="ub viewer" onClick={() => p.img && setView(true)} aria-label={`View larger picture of ${p.name}`} style={{ position: 'relative', width: '100%', maxWidth: 460, justifySelf: 'center', aspectRatio: '1 / 1', borderRadius: 8, overflow: 'hidden', background: '#F7F4EC', display: 'block', cursor: p.img ? 'zoom-in' : 'default' }}>
            <ProductImage p={p} size={40} />
            {p.img && <span className="view-hint" style={{ position: 'absolute', right: 12, bottom: 12, width: 40, height: 40, borderRadius: '50%', background: 'rgba(255,255,255,0.94)', boxShadow: '0 4px 14px rgba(17,32,23,0.14)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}><IExpand size={18} color="#0B3A23" /></span>}
            {off > 0 && <span style={{ position: 'absolute', top: 16, left: 16, background: '#D49B41', color: '#0B3A23', fontSize: 12, fontWeight: 700, padding: '5px 10px', borderRadius: 3 }}>Up to {off}% off</span>}
          </button>

          <div style={{ display: 'flex', flexDirection: 'column', gap: 18, maxWidth: 520, minWidth: 0 }}>
            <Link href={'/aisle/' + p.cat} className="lnk" style={{ alignSelf: 'flex-start', fontSize: 13, color: '#0B3A23' }}>{aisleLabel(p.cat)}</Link>
            <h1 style={{ margin: '-6px 0 0', fontWeight: 500, fontSize: 'clamp(28px, 3.4vw, 38px)', lineHeight: 1.15, letterSpacing: '-0.015em' }}>{p.name}</h1>
            {p.rating && <a href="#rv-h" style={{ marginTop: -8, fontSize: 13, color: '#66736B', textDecoration: 'none' }}><span style={{ color: '#D49B41', letterSpacing: 2 }}>{stars(p.rating.avg)}</span> {p.rating.avg} · {p.rating.n} review{p.rating.n === 1 ? '' : 's'}</a>}
            <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'baseline', gap: '4px 12px' }}>
              <span style={{ fontSize: 28, fontWeight: 500, color: was ? '#8A5F1C' : '#1F2A23' }}>{naira(price)}</span>
              {was && <><s style={{ fontSize: 17, color: '#8B958E' }}>{naira(was)}</s><span style={{ fontSize: 13, fontWeight: 600, color: '#8A5F1C' }}>You save {naira(was - price)}</span></>}
            </div>

            {!combo && (
              <fieldset style={{ border: 0, margin: 0, padding: 0, display: 'flex', flexDirection: 'column', gap: 10 }}>
                <legend style={{ fontSize: 13.5, fontWeight: 600, marginBottom: 10 }}>Size: <span style={{ fontWeight: 500, color: '#4D5A52' }}>{s?.label}</span></legend>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
                  {p.sizes.map((z, j) => {
                    if (z.na || z.price == null) return <span key={z.label} aria-label={`${z.label} not available`} style={{ minWidth: 84, height: 46, padding: '0 16px', borderRadius: 4, border: '1.5px dashed #E2DDD0', color: '#A3ABA5', fontSize: 14, textDecoration: 'line-through', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>{z.label}</span>;
                    const sel = j === si, out = !inStock(p, z), sale = !!(z.sale && z.price && z.sale < z.price);
                    const note = out ? 'Sold out' : z.left != null ? `${z.left} left` : sale ? 'Sale' : '';
                    return (
                      <button key={z.label} type="button" className={sel ? 'ub' : 'ub opt'} aria-pressed={sel} onClick={() => { setSi(j); setQty(1); setNDone(''); setNErr(''); }}
                        style={{ minWidth: 84, height: 46, padding: '0 16px', borderRadius: 4, border: `1.5px ${out ? 'dashed' : 'solid'} ${sel ? '#0B3A23' : '#DCD6CA'}`, background: sel ? (out ? '#F4F2EC' : '#0B3A23') : '#FFFFFF', color: sel ? (out ? '#66736B' : '#FFFFFF') : out ? '#8B958E' : '#1F2A23', fontSize: 14, fontWeight: sel ? 600 : 500, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', lineHeight: 1.15 }}>
                        <span>{z.label}</span>{note && <span style={{ fontSize: 10.5, fontWeight: 600, color: sel && !out ? '#F6E9CF' : out || z.left != null ? '#B8402B' : '#8A5F1C' }}>{note}</span>}
                      </button>
                    );
                  })}
                </div>
                {ok && s.left != null && <span style={{ fontSize: 13, fontWeight: 600, color: '#9A4E12' }}>Only {s.left} left in {s.label}. Order soon.</span>}
              </fieldset>
            )}

            {!ok && s && (
              <div className="fade" style={{ padding: '16px 18px', borderRadius: 8, background: '#FBF9F4', border: '1px solid #ECE8DF', display: 'flex', flexDirection: 'column', gap: 10 }}>
                {!nDone ? (
                  <>
                    <span style={{ fontSize: 14.5, fontWeight: 600 }}>{combo ? `${p.name} is sold out` : `${s.label} is sold out`}</span>
                    <span style={{ fontSize: 13.5, color: '#4D5A52', lineHeight: 1.55 }}>Leave your email and we’ll tell you the moment it’s back. Nothing else, no spam.</span>
                    <form onSubmit={e => { e.preventDefault(); tellMe(); }} style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
                      <input type="email" value={nEmail} onChange={e => setNEmail(e.target.value)} placeholder="you@example.com" aria-label="Your email" autoComplete="email" style={{ flex: '1 1 200px', height: 46, padding: '0 14px', borderRadius: 4, border: '1px solid #DCD6CA', fontSize: 14.5, minWidth: 0 }} />
                      <button type="submit" disabled={nBusy} className="ub btn-solid press" style={{ height: 46, padding: '0 18px', borderRadius: 4, background: '#0B3A23', color: '#FFFFFF', fontWeight: 600, fontSize: 14, display: 'flex', alignItems: 'center', opacity: nBusy ? 0.6 : 1 }}>{nBusy ? 'Saving…' : 'Tell me when it’s back'}</button>
                    </form>
                    {nErr && <span role="alert" style={{ fontSize: 13, fontWeight: 600, color: '#9E3522' }}>{nErr}</span>}
                  </>
                ) : <span className="pop" role="status" style={{ fontSize: 14, lineHeight: 1.55, color: '#0B3A23' }}><strong style={{ fontWeight: 600 }}>You’re on the list.</strong> We’ll email {nDone} when {p.name}{combo ? '' : ' ' + s.label} is back.</span>}
              </div>
            )}

            {combo && (
              <div style={{ border: '1px solid #ECE8DF', borderRadius: 8, padding: 16, display: 'flex', flexDirection: 'column', gap: 10 }}>
                <span style={{ fontSize: 13.5, fontWeight: 600 }}>What’s inside · swap anything, the price stays the same</span>
                {(p.items || []).map(it => (
                  <label key={it} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12, fontSize: 14 }}>
                    <span style={{ display: 'flex', alignItems: 'center', gap: 10, minWidth: 0 }}><span aria-hidden="true" style={{ width: 6, height: 6, flex: 'none', borderRadius: '50%', background: '#D49B41' }} />{it}</span>
                    <select value={swaps[it] || it} onChange={e => setSwaps(w => ({ ...w, [it]: e.target.value }))} aria-label={`Swap ${it} for`} style={{ height: 38, minWidth: 140, maxWidth: '50%', borderRadius: 4, border: '1px solid #DCD6CA', background: '#FFFFFF', fontSize: 13, color: '#1F2A23', padding: '0 8px' }}>
                      {[it, ...swapList.filter(x => x !== it)].map(o => <option key={o} value={o}>{o === it ? `${o} (keep)` : o}</option>)}
                    </select>
                  </label>
                ))}
              </div>
            )}

            {ok && (
              <>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 10 }}>
                  <div style={{ display: 'flex', alignItems: 'stretch', height: 50, border: '1px solid #DCD6CA', borderRadius: 4, overflow: 'hidden' }}>
                    <button type="button" className="ub btn-solid" aria-label="Decrease quantity" onClick={() => setQty(q => Math.max(1, q - 1))} style={{ width: 46, background: '#0B3A23', color: '#FFFFFF', fontSize: 20, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>−</button>
                    <span aria-live="polite" style={{ minWidth: 54, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 15, fontWeight: 600 }}>{qty}</span>
                    <button type="button" className="ub btn-solid" aria-label="Increase quantity" onClick={() => { if (qty >= cap) notify('warn', `Only ${cap} left in ${s.label}.`); setQty(q => Math.min(cap, q + 1)); }} style={{ width: 46, background: '#0B3A23', color: '#FFFFFF', fontSize: 20, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>+</button>
                  </div>
                  <button type="button" className="ub btn-solid press" onClick={doAdd} style={{ flex: '1 1 200px', height: 50, borderRadius: 4, background: '#0B3A23', color: '#FFFFFF', fontSize: 15, fontWeight: 600, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>Add to cart · {naira(price * qty)}</button>
                </div>
                <button type="button" className="ub btn-out" onClick={buyNow} style={{ height: 50, borderRadius: 4, border: '1.5px solid #0B3A23', color: '#0B3A23', fontSize: 15, fontWeight: 600, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>Buy it now</button>
              </>
            )}

            <div style={{ borderTop: '1px solid #ECE8DF' }}>
              {accs.map(([t, b], i) => (
                <div key={t} style={{ borderBottom: '1px solid #ECE8DF' }}>
                  <button type="button" className="ub" aria-expanded={!!acc[i]} onClick={() => setAcc(a => ({ ...a, [i]: !a[i] }))} style={{ width: '100%', minHeight: 56, display: 'flex', alignItems: 'center', justifyContent: 'space-between', fontSize: 14.5, fontWeight: 600 }}>{t}<span aria-hidden="true" style={{ fontSize: 20, fontWeight: 400, transition: 'transform .2s', transform: `rotate(${acc[i] ? 45 : 0}deg)` }}>+</span></button>
                  {acc[i] && <p className="fade" style={{ margin: '0 0 18px', fontSize: 14.5, lineHeight: 1.75, color: '#4D5A52', whiteSpace: 'pre-line' }}>{b}</p>}
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      <section aria-labelledby="rv-h" style={{ maxWidth: 1240, margin: '0 auto', padding: '64px clamp(16px, 3vw, 28px) 0' }}>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '40px 64px', paddingTop: 40, borderTop: '1px solid #ECE8DF' }}>
          <div style={{ flex: '1 1 260px', display: 'flex', flexDirection: 'column', gap: 14 }}>
            <h2 id="rv-h" style={{ margin: 0, fontWeight: 500, fontSize: 26, letterSpacing: '-0.01em' }}>Customer reviews</h2>
            {list.length > 0 ? (
              <>
                <div style={{ display: 'flex', alignItems: 'baseline', gap: 12 }}><span style={{ fontSize: 44, fontWeight: 500, lineHeight: 1 }}>{avg.toFixed(1)}</span><span style={{ display: 'flex', flexDirection: 'column', gap: 2 }}><span aria-label={`${avg.toFixed(1)} out of 5`} style={{ color: '#D49B41', fontSize: 17, letterSpacing: 2 }}>{stars(avg)}</span><span style={{ fontSize: 13, color: '#66736B' }}>{list.length} review{list.length === 1 ? '' : 's'}</span></span></div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                  {[5, 4, 3, 2, 1].map(n => { const c = list.filter(r => r.stars === n).length; return (
                    <div key={n} style={{ display: 'grid', gridTemplateColumns: '34px 1fr 24px', alignItems: 'center', gap: 10, fontSize: 12.5, color: '#66736B' }}><span>{n} ★</span><span style={{ height: 6, borderRadius: 6, background: '#EFEDE6', overflow: 'hidden' }}><span style={{ display: 'block', height: '100%', width: `${(c / list.length) * 100}%`, background: '#D49B41', borderRadius: 6 }} /></span><span>{c}</span></div>); })}
                </div>
              </>
            ) : <p style={{ margin: 0, fontSize: 14, color: '#66736B', lineHeight: 1.6 }}>{rv ? 'No reviews yet. Customers can review once their order has been delivered.' : 'Loading reviews…'}</p>}
            {rv?.canReview && !rv.mine && !rSent && !writing && <button type="button" className="ub btn-out" onClick={() => setWriting(true)} style={{ height: 46, borderRadius: 4, border: '1.5px solid #0B3A23', color: '#0B3A23', fontSize: 14, fontWeight: 600, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>Write a review</button>}
            {rv && !user && <span style={{ fontSize: 13, color: '#66736B' }}>Bought this? <Link href={`/account?next=/p/${p.id}`} className="lnk" style={{ color: '#0B3A23' }}>Sign in</Link> to review it.</span>}
            {rv?.mine?.status === 'pending' && <span style={{ fontSize: 13, color: '#66736B' }}>Your review is waiting to be approved.</span>}
          </div>
          <div style={{ flex: '999 1 480px', minWidth: 0, display: 'flex', flexDirection: 'column' }}>
            {writing && (
              <div className="fade" style={{ padding: 22, borderRadius: 8, background: '#FBF9F4', display: 'flex', flexDirection: 'column', gap: 14, marginBottom: 18 }}>
                <span style={{ fontSize: 15, fontWeight: 600 }}>Your review of {p.name}</span>
                <div role="radiogroup" aria-label="Your rating" style={{ display: 'flex', gap: 2 }}>
                  {[1, 2, 3, 4, 5].map(n => <button key={n} type="button" className="ub" role="radio" aria-checked={rStars === n} aria-label={`${n} stars`} onClick={() => setRStars(n)} style={{ width: 40, height: 40, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 26, color: n <= rStars ? '#D49B41' : '#D7D2C6' }}>★</button>)}
                </div>
                <label style={{ display: 'flex', flexDirection: 'column', gap: 6, fontSize: 13, fontWeight: 600 }}>What did you think?
                  <textarea rows={3} value={rText} onChange={e => setRText(e.target.value)} maxLength={400} placeholder="Taste, freshness, packing, delivery…" style={{ padding: '12px 14px', borderRadius: 4, border: '1px solid #DCD6CA', background: '#FFFFFF', fontSize: 14, resize: 'vertical', fontWeight: 400 }} />
                </label>
                {rErr && <p role="alert" style={{ margin: 0, fontSize: 13, color: '#9E3522' }}>{rErr}</p>}
                <div style={{ display: 'flex', gap: 10 }}><button type="button" className="ub btn-solid press" onClick={postReview} style={{ height: 46, padding: '0 24px', borderRadius: 4, background: '#0B3A23', color: '#FFFFFF', fontWeight: 600, display: 'flex', alignItems: 'center' }}>Post review</button><button type="button" className="ub lnk" onClick={() => setWriting(false)} style={{ fontSize: 14, minHeight: 46 }}>Cancel</button></div>
              </div>
            )}
            {rSent && <p className="pop" role="status" style={{ margin: '0 0 18px', padding: '14px 16px', borderRadius: 6, background: '#E6EEE8', color: '#0B3A23', fontSize: 14, fontWeight: 500 }}>Thank you. Your review will show here once the Tiada team approves it.</p>}
            {list.map(r => (
              <article key={r.id} style={{ padding: '22px 0', borderBottom: '1px solid #ECE8DF', display: 'flex', flexDirection: 'column', gap: 8 }}>
                <div style={{ display: 'flex', flexWrap: 'wrap', justifyContent: 'space-between', gap: 8 }}>
                  <span style={{ display: 'flex', alignItems: 'center', gap: 10 }}><span style={{ width: 34, height: 34, borderRadius: '50%', background: '#F1EEE6', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 13, fontWeight: 600, color: '#0B3A23' }}>{r.name[0]}</span><span style={{ display: 'flex', flexDirection: 'column' }}><span style={{ fontSize: 14, fontWeight: 600 }}>{r.name}</span><span style={{ fontSize: 12, color: '#66736B' }}>Verified order</span></span></span>
                  <span style={{ fontSize: 12.5, color: '#66736B' }}>{ago(r.created_at)}</span>
                </div>
                <span aria-label={`${r.stars} out of 5`} style={{ color: '#D49B41', letterSpacing: 2 }}>{stars(r.stars)}</span>
                <p style={{ margin: 0, fontSize: 14.5, lineHeight: 1.7, color: '#4D5A52' }}>{r.text}</p>
                {r.reply && <p style={{ margin: '4px 0 0', padding: '10px 14px', borderLeft: '3px solid #D49B41', background: '#FBF9F4', fontSize: 13.5, lineHeight: 1.6, color: '#4D5A52' }}><strong style={{ fontWeight: 600, color: '#0B3A23' }}>Tiada:</strong> {r.reply}</p>}
              </article>
            ))}
          </div>
        </div>
      </section>

      <Row title="You may also like" items={related} href={'/aisle/' + p.cat} />
      {seenRow.length > 0 && <Row title="Recently viewed" items={seenRow} />}

      <div className="mob-only buybar" style={{ position: 'fixed', left: 0, right: 0, bottom: 0, zIndex: 35, alignItems: 'center', gap: 12, padding: '12px 16px', background: '#FFFFFF', borderTop: '1px solid #ECE8DF', boxShadow: '0 -10px 30px rgba(17,32,23,0.08)' }}>
        <span style={{ display: 'flex', flexDirection: 'column' }}><strong style={{ fontSize: 16, fontWeight: 600 }}>{naira(price * qty)}</strong><span style={{ fontSize: 12, color: '#66736B' }}>{s?.label} · Qty {qty}</span></span>
        {ok
          ? <button type="button" className="ub btn-solid press" onClick={doAdd} style={{ flex: 1, height: 50, borderRadius: 4, background: '#0B3A23', color: '#FFFFFF', fontSize: 15, fontWeight: 600, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>Add to cart</button>
          : <button type="button" className="ub" onClick={() => (!combo ? setChoose(p.id) : null)} style={{ flex: 1, height: 50, borderRadius: 4, background: '#EDEBE5', color: '#66736B', fontSize: 15, fontWeight: 600, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>Sold out</button>}
      </div>
      {view && p.img && <Lightbox src={p.img} name={p.name} onClose={() => setView(false)} />}
    </>
  );
}
