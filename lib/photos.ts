/**
 * Tiada's own product photos, bundled with the website in public/img/p/.
 * These win over the old bundled pictures (/img/...) and fill in products with no picture.
 * A photo uploaded in Admin (a full https:// link) always wins.
 */
const OWN = new Set([
  'brownbeans', 'cc1', 'cc2', 'cc3', 'cc4', 'cc5', 'chocomalt', 'cocopops', 'cornflakes', 'custard', 'dano', 'frosties',
  'fruitfiber', 'garri', 'goldenmorn', 'granola', 'milk', 'milo', 'moonstar', 'noodles', 'oat', 'palmoil', 'peak', 'rice',
  'semovita', 'vegoil',
]);
const SHARED: Record<string, string> = {
  fcE: 'foodcombo', fc1: 'foodcombo', fc2: 'foodcombo', // beans
  fc3: 'foodcombo-oil', // vegetable oil
  fc4: 'foodcombo-semo', fc5: 'foodcombo-semo', fc6: 'foodcombo-semo', // Semovita
};

export function photoFor(id: string, img: string | null | undefined, cat?: string | null): string | null {
  if (img && /^https?:\/\//.test(img)) return img; // uploaded in Admin
  if (OWN.has(id)) return `/img/p/${id}.jpg`;
  if (SHARED[id]) return `/img/p/${SHARED[id]}.jpg`;
  if (cat === 'fcombo') return '/img/p/foodcombo.jpg';
  return img || null;
}
