export type Size = { label: string; price: number | null; sale: number | null; kg: number; na: boolean; stock?: number | null };
export type Product = { id: string; name: string; cat: string; items: string[] | null; sizes: Size[]; status: string; stock: number; low: number; hidden: boolean; img: string | null; sort: number; updated_at?: string };
export type Item = { pid?: string; name: string; size: string; qty: number; price: number; img?: string | null; swaps?: { from: string; to: string }[] };
export type Order = {
  id: string; customer_id: string | null; email: string; name: string; phone: string; address: string; landmark: string | null; zone_id: string | null; area_label: string | null;
  speed: string; speed_label: string | null; items: Item[]; subtotal: number; discount: number; voucher: string | null; delivery_fee: number; total: number; kg: number; status: string;
  prev_status: string | null; paid_at: string | null; rider: { partner?: string; tracking?: string; driver?: string; phone?: string; cost?: number } | null; confirm: { how?: string; note?: string; by?: string; at?: string } | null;
  issue: { reason?: string; note?: string; eta?: string } | null; refunds: { amount: number; reason: string; at: string; by?: string }[] | null; note: string | null; created_at: string; updated_at: string;
};
export type Promo = { id: string; title: string; eyebrow: string; text: string; button: string | null; style: 'photo' | 'color' | 'image' | null; color: string | null; shade: number | null; img: string | null; link_type: string | null; link_to: string | null; product_id: string | null; starts_at: string | null; ends_at: string; is_on: boolean; sort: number | null };
export type Zone = { id: string; label: string; km: number; fee: number; day: string | null; state: string | null; city: string | null; region: string | null; days: string | null; sort: number };
export type Review = { id: string; product_id: string; order_id: string; name: string; stars: number; text: string; status: string; reply: string | null; created_at: string };
export type Chat = { id: string; customer_id: string | null; name: string | null; email: string | null; status: string; agent: string | null; created_at: string; updated_at: string; messages: { id: number; who: string; text: string; created_at: string }[] };
export type Voucher = { code: string; kind: 'amt' | 'pct'; value: number; cap: number | null; min_order: number; ends_at: string | null; max_uses: number | null; used: number; once_each: boolean; is_on: boolean; created_at: string };
export type Contact = { id: string; name: string; email: string; phone: string | null; text: string; handled: boolean; created_at: string };
export type Customer = { id: string; email: string; name: string | null; phone: string | null; promo_ok: boolean; created_at: string };
export type Staff = { id: string; email: string; name: string; role: string; active: boolean; created_at: string };
export type Fees = { min: number; lagosKg: number; interKg: number; van: number; same: number; express: number; eco: number; regions: Record<string, { fee: number; days: string }> };
export type Business = { name: string; tagline: string; address: string; phone: string; whatsapp: string; email: string; tiktok: string };
export type Alerts = { sound: boolean; email: boolean; emailTo: string; whatsapp: boolean; waTo: string; daily: boolean; lowStock: boolean };
export type Data = {
  me: { name: string; email: string; role: string };
  orders: Order[]; products: Product[]; promos: Promo[]; zones: Zone[]; reviews: Review[]; activity: { staff_name: string; text: string; created_at: string }[];
  customers: Customer[]; chats: Chat[]; messages: { id: string; order_id: string; kind: string; email_to: string; email_ok: boolean; created_at: string }[];
  settings: { fees: Fees; business: Partial<Business>; hours: [string, boolean, string, string][]; alerts: Partial<Alerts>; policies: Partial<{ returns: string; delivery: string }>; slider: Partial<{ on: boolean; seconds: number }> };
  vouchers: Voucher[]; contact: Contact[]; waiting: Record<string, number>; subscribers: number;
  staff: Staff[]; testMode: boolean; testPending: { id: string; name: string; total: number; created_at: string }[]; now: number;
};
export type Sec = 'dash' | 'orders' | 'products' | 'banners' | 'discounts' | 'emails' | 'reviews' | 'chat' | 'customers' | 'messages' | 'settings' | 'delivery' | 'team';
