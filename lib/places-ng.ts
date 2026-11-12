/**
 * Well-known areas in the places we deliver, so the address box can suggest them the instant someone types,
 * before the map search answers. Coordinates are the middle of each area (good enough for the delivery fee);
 * the customer adds their street and landmark.
 */
export type LocalPlace = { name: string; sub: string; state: 'Lagos' | 'Oyo'; lat: number; lng: number; alt?: string };

const L = (name: string, sub: string, lat: number, lng: number, alt?: string): LocalPlace => ({ name, sub, state: 'Lagos', lat, lng, alt });
const O = (name: string, sub: string, lat: number, lng: number, alt?: string): LocalPlace => ({ name, sub, state: 'Oyo', lat, lng, alt });

export const LOCAL_PLACES: LocalPlace[] = [
  // Lagos mainland
  L('Ikeja', 'Ikeja, Lagos', 6.6018, 3.3515), L('Allen Avenue', 'Ikeja, Lagos', 6.6015, 3.3545, 'allen'), L('Ikeja GRA', 'Ikeja, Lagos', 6.5785, 3.3570),
  L('Opebi', 'Ikeja, Lagos', 6.5925, 3.3620), L('Alausa', 'Ikeja, Lagos', 6.6160, 3.3590), L('Oregun', 'Ikeja, Lagos', 6.6070, 3.3720),
  L('Maryland', 'Lagos', 6.5710, 3.3670), L('Ogba', 'Ikeja, Lagos', 6.6260, 3.3410), L('Agege', 'Lagos', 6.6156, 3.3209), L('Abule Egba', 'Lagos', 6.6480, 3.3020),
  L('Iyana Ipaja', 'Alimosho, Lagos', 6.6110, 3.2900), L('Egbeda', 'Alimosho, Lagos', 6.5910, 3.2860), L('Ikotun', 'Alimosho, Lagos', 6.5500, 3.2600),
  L('Idimu', 'Alimosho, Lagos', 6.5850, 3.2580), L('Igando', 'Alimosho, Lagos', 6.5560, 3.2420), L('Ojodu Berger', 'Lagos', 6.6430, 3.3770, 'berger'),
  L('Magodo', 'Lagos', 6.6200, 3.3850), L('Ketu', 'Kosofe, Lagos', 6.5970, 3.3900), L('Ojota', 'Kosofe, Lagos', 6.5850, 3.3800), L('Ogudu', 'Kosofe, Lagos', 6.5780, 3.3940),
  L('Gbagada', 'Lagos', 6.5550, 3.3900), L('Anthony Village', 'Lagos', 6.5600, 3.3700, 'anthony'), L('Ilupeju', 'Lagos', 6.5530, 3.3570), L('Mushin', 'Lagos', 6.5300, 3.3460),
  L('Oshodi', 'Lagos', 6.5560, 3.3380), L('Isolo', 'Oshodi-Isolo, Lagos', 6.5280, 3.3220), L('Ejigbo', 'Lagos', 6.5440, 3.3010), L('Ikotun-Egbe', 'Lagos', 6.5340, 3.2620),
  L('Yaba', 'Lagos', 6.5095, 3.3711), L('Akoka', 'Yaba, Lagos', 6.5200, 3.3880, 'unilag'), L('Ebute Metta', 'Lagos', 6.4880, 3.3780), L('Surulere', 'Lagos', 6.4969, 3.3481),
  L('Ojuelegba', 'Surulere, Lagos', 6.5080, 3.3640), L('Aguda', 'Surulere, Lagos', 6.4920, 3.3380), L('Ilasamaja', 'Lagos', 6.5260, 3.3330), L('Ajegunle', 'Lagos', 6.4520, 3.3340),
  L('Apapa', 'Lagos', 6.4489, 3.3590), L('Festac Town', 'Amuwo-Odofin, Lagos', 6.4667, 3.2833, 'festac'), L('Satellite Town', 'Lagos', 6.4520, 3.2550), L('Amuwo Odofin', 'Lagos', 6.4610, 3.3010),
  L('Ojo', 'Lagos', 6.4660, 3.1800), L('Iyana Iba', 'Ojo, Lagos', 6.4880, 3.1950), L('Badagry', 'Lagos', 6.4153, 2.8813), L('Ikorodu', 'Lagos', 6.6194, 3.5105),
  L('Ogolonto', 'Ikorodu, Lagos', 6.6050, 3.4920), L('Agric', 'Ikorodu, Lagos', 6.6290, 3.4560), L('Mile 12', 'Kosofe, Lagos', 6.6030, 3.4010), L('Ikosi', 'Ketu, Lagos', 6.5950, 3.3950),
  // Lagos island and Lekki axis
  L('Lagos Island', 'Lagos', 6.4549, 3.3947, 'idumota marina'), L('Obalende', 'Lagos Island, Lagos', 6.4480, 3.4060), L('Ikoyi', 'Lagos', 6.4526, 3.4380),
  L('Victoria Island', 'Lagos', 6.4281, 3.4219, 'vi'), L('Oniru', 'Victoria Island, Lagos', 6.4350, 3.4520), L('Lekki Phase 1', 'Lekki, Lagos', 6.4478, 3.4723, 'lekki'),
  L('Ikate', 'Lekki, Lagos', 6.4400, 3.4920), L('Chevron', 'Lekki, Lagos', 6.4400, 3.5260), L('Ikota', 'Lekki, Lagos', 6.4520, 3.5520), L('Osapa London', 'Lekki, Lagos', 6.4380, 3.5170),
  L('Agungi', 'Lekki, Lagos', 6.4430, 3.5110), L('Jakande', 'Lekki, Lagos', 6.4400, 3.5040), L('VGC', 'Lekki, Lagos', 6.4530, 3.5440), L('Ajah', 'Lagos', 6.4682, 3.5852),
  L('Badore', 'Ajah, Lagos', 6.4900, 3.5950), L('Sangotedo', 'Ajah, Lagos', 6.4700, 3.6400), L('Abijo', 'Lekki, Lagos', 6.4620, 3.6850), L('Awoyaya', 'Lekki, Lagos', 6.4650, 3.7080),
  L('Lakowe', 'Lekki, Lagos', 6.4630, 3.6640), L('Epe', 'Lagos', 6.5841, 3.9834),
  // Oyo State
  O('Iseyin', 'Oyo State', 7.967, 3.6), O('Okeho', 'Oyo State', 8.033, 3.35), O('Ado-Awaye', 'Oyo State', 7.817, 3.433), O('Oyo', 'Oyo State', 7.85, 3.933, 'oyo town'),
  O('Ibadan', 'Oyo State', 7.3775, 3.947), O('Bodija', 'Ibadan, Oyo State', 7.429, 3.911), O('Challenge', 'Ibadan, Oyo State', 7.351, 3.878), O('Dugbe', 'Ibadan, Oyo State', 7.388, 3.884),
  O('Ring Road', 'Ibadan, Oyo State', 7.369, 3.869), O('Agodi', 'Ibadan, Oyo State', 7.405, 3.910), O('Mokola', 'Ibadan, Oyo State', 7.406, 3.892), O('Sango', 'Ibadan, Oyo State', 7.415, 3.896),
  O('UI', 'Ibadan, Oyo State', 7.443, 3.900, 'university of ibadan'), O('Ojoo', 'Ibadan, Oyo State', 7.468, 3.912), O('Moniya', 'Ibadan, Oyo State', 7.522, 3.913),
  O('Akobo', 'Ibadan, Oyo State', 7.424, 3.958), O('Iwo Road', 'Ibadan, Oyo State', 7.403, 3.937), O('Oluyole Estate', 'Ibadan, Oyo State', 7.358, 3.858, 'oluyole'),
  O('Apata', 'Ibadan, Oyo State', 7.370, 3.825), O('Eleyele', 'Ibadan, Oyo State', 7.415, 3.865), O('Jericho', 'Ibadan, Oyo State', 7.398, 3.866), O('Samonda', 'Ibadan, Oyo State', 7.433, 3.893),
  O('Eruwa', 'Oyo State', 7.533, 3.417), O('Ogbomoso', 'Oyo State', 8.134, 4.24), O('Saki', 'Oyo State', 8.667, 3.383, 'shaki'), O('Igboho', 'Oyo State', 8.833, 3.767),
  O('Igbo-Ora', 'Oyo State', 7.433, 3.283), O('Ilora', 'Oyo State', 7.80, 3.85), O('Fiditi', 'Oyo State', 7.70, 3.90), O('Kishi', 'Oyo State', 9.083, 3.85), O('Igbeti', 'Oyo State', 8.75, 4.13),
];

const norm = (s: string) => s.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/[^a-z0-9 ]+/g, ' ').replace(/\s+/g, ' ').trim();

/** Areas whose name starts (or a word starts) with what was typed, or that appear in it ("12 allen avenue ikeja"). */
export function matchLocal(q: string, state?: string, max = 5): LocalPlace[] {
  const t = norm(q); if (t.length < 2) return [];
  const words = t.split(' ');
  const scored: [number, LocalPlace][] = [];
  for (const p of LOCAL_PLACES) {
    if (state && p.state !== state) continue;
    const n = norm(p.name), a = norm(p.alt || ''), full = n + ' ' + a;
    let s = 0;
    if (n.startsWith(t)) s = 100;
    else if (full.split(' ').some(w => w && w.startsWith(t))) s = 80;
    else if (norm(p.sub).split(' ').some(w => w.startsWith(t))) s = 60; // "lekk" → areas in Lekki, "ibad" → areas in Ibadan
    else if (t.includes(n) && n.length >= 3) s = 70; // they typed a street and the area: "12 allen avenue ikeja"
    else if (words.length > 1 && words.slice(-1)[0].length >= 2 && full.split(' ').some(w => w.startsWith(words[words.length - 1]))) s = 40; // last word they're typing
    if (s) scored.push([s - n.length / 100, p]);
  }
  return scored.sort((x, y) => y[0] - x[0]).slice(0, max).map(x => x[1]);
}
