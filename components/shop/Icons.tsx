type P = { size?: number; color?: string; stroke?: number; style?: React.CSSProperties };
const S = ({ size = 20, color = 'currentColor', stroke = 1.8, style, children }: P & { children: React.ReactNode }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth={stroke} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" style={style}>{children}</svg>
);
export const ISearch = (p: P) => <S {...p}><circle cx="11" cy="11" r="6.5" /><path d="M16 16l4.5 4.5" /></S>;
export const IUser = (p: P) => <S {...p}><path d="M12 12a4 4 0 1 0 0-8 4 4 0 0 0 0 8zM4.5 20c1.2-3.6 4-5.5 7.5-5.5s6.3 1.9 7.5 5.5" /></S>;
export const IBag = (p: P) => <S {...p}><path d="M3.5 9h17l-1.6 9.6a1.8 1.8 0 0 1-1.8 1.4H6.9a1.8 1.8 0 0 1-1.8-1.4zM8 9l3-5M16 9l-3-5" /></S>;
export const IMenu = (p: P) => <S {...p}><path d="M4 7h16M4 12h16M4 17h16" /></S>;
export const IClose = (p: P) => <S {...p}><path d="M6 6l12 12M18 6L6 18" /></S>;
export const IChevron = (p: P & { dir?: 'down' | 'up' | 'left' | 'right' }) => <S {...p}><path d={{ down: 'M6 9l6 6 6-6', up: 'M6 15l6-6 6 6', left: 'M15 6l-6 6 6 6', right: 'M9 6l6 6-6 6' }[p.dir || 'down']} /></S>;
export const ICheck = (p: P) => <S {...p}><path d="M5 12.5l4.5 4.5L19 7.5" /></S>;
export const ILock = (p: P) => <S {...p}><rect x="5" y="10" width="14" height="10" rx="2" /><path d="M8 10V7a4 4 0 0 1 8 0v3" /></S>;
export const IChat = (p: P) => <S {...p}><path d="M5 5h14v10H9l-4 4z" /></S>;
export const ITruck = (p: P) => <S {...p}><path d="M3 7h11v9H3zM14 10h4l3 3v3h-7" /><circle cx="7" cy="17.5" r="1.8" /><circle cx="17" cy="17.5" r="1.8" /></S>;
export const IBox = (p: P) => <S {...p}><path d="M4 8l8-4 8 4-8 4z" /><path d="M4 8v8l8 4 8-4V8" /><path d="M12 12v8" /></S>;
export const ICard = (p: P) => <S {...p}><rect x="3" y="6" width="18" height="13" rx="2" /><path d="M3 10h18M7 15h4" /></S>;
export const IPlus = (p: P) => <S {...p}><path d="M12 5v14M5 12h14" /></S>;
export const IMinus = (p: P) => <S {...p}><path d="M5 12h14" /></S>;
export const IGrid = (p: P) => <S {...p}><path d="M4 4h7v7H4zM13 4h7v7h-7zM4 13h7v7H4zM13 13h7v7h-7z" /></S>;
export const IList = (p: P) => <S {...p}><path d="M8 6h12M8 12h12M8 18h12M4 6h.01M4 12h.01M4 18h.01" /></S>;
export const IFilter = (p: P) => <S {...p}><path d="M4 6h16M7 12h10M10 18h4" /></S>;
export const IExpand = (p: P) => <S {...p}><path d="M14 4h6v6M10 20H4v-6M20 4l-7 7M4 20l7-7" /></S>;
export const IClock = (p: P) => <S {...p}><circle cx="12" cy="12" r="8.5" /><path d="M12 7.5V12l3 2" /></S>;
export const IWhatsApp = ({ size = 20, color = 'currentColor' }: P) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill={color} aria-hidden="true"><path d="M12 2a10 10 0 0 0-8.6 15.1L2 22l5-1.3A10 10 0 1 0 12 2zm0 18.2a8.2 8.2 0 0 1-4.2-1.2l-.3-.2-3 .8.8-2.9-.2-.3A8.2 8.2 0 1 1 12 20.2zm4.5-6.1c-.2-.1-1.5-.7-1.7-.8-.2-.1-.4-.1-.6.1l-.8 1c-.1.2-.3.2-.5.1a6.7 6.7 0 0 1-3.3-2.9c-.2-.4.2-.4.7-1.3.1-.2 0-.3 0-.4l-.8-1.8c-.2-.5-.4-.4-.6-.4h-.5a1 1 0 0 0-.7.3 3 3 0 0 0-.9 2.2 5.2 5.2 0 0 0 1.1 2.8 11.9 11.9 0 0 0 4.6 4c1.7.7 2.4.8 3.2.7.5-.1 1.5-.6 1.7-1.2.2-.6.2-1.1.2-1.2-.1-.1-.3-.2-.5-.3z" /></svg>
);
export const INote = (p: P) => <S {...p}><path d="M14 4v10.5a3.5 3.5 0 1 1-3.5-3.5" /><path d="M14 4c.4 2.4 2 4 4.5 4.3" /></S>;
