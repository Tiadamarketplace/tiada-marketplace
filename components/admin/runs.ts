import type { Order } from './types';

/** Which delivery run an order goes on: Priority, Lagos or Oyo (older orders keep their area's day). */
export function runOf(o: Pick<Order, 'speed' | 'zone_id'>, z?: { state: string | null; day: string | null } | null) {
  if (o.speed === 'same') return 'Priority';
  if (o.zone_id === 'st:Oyo') return 'Oyo';
  if (z?.state) return 'Courier';
  return z?.day || 'Lagos';
}
export const mapLink = (s: { lat: number; lng: number }) => `https://www.google.com/maps/search/?api=1&query=${s.lat},${s.lng}`;
