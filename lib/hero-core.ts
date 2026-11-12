/** Home page hero: the built-in Tiada slide plus any slides added in Admin → Hero. Stored in settings key "hero". */
export type HeroButton = { label: string; href: string; look: 'gold' | 'green' | 'white' | 'link' };
export type HeroSlide = {
  id: string; on: boolean;
  /** back: picture fills the hero, words on top · front: colour behind, picture beside the words · image: a finished banner shown whole */
  layout: 'back' | 'front' | 'image';
  kicker: string; title: string; text: string;
  img: string | null; imgPhone: string | null; bg: string;
  buttons: HeroButton[];
  starts: string | null; ends: string | null;
};
export type HeroSettings = { main: boolean; seconds: number; slides: HeroSlide[] };
export const HERO_DEFAULT: HeroSettings = { main: true, seconds: 7, slides: [] };

export function liveSlides(h: HeroSettings, now = Date.now()) {
  return h.slides.filter(s => s.on && (!s.starts || Date.parse(s.starts) <= now) && (!s.ends || Date.parse(s.ends) > now));
}
