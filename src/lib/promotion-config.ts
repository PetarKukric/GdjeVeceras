export const PROMOTION_PLANS = [
  { id: '1_day', durationDays: 1, price: 5.00, label: '1 DAN' },
  { id: '3_days', durationDays: 3, price: 12.00, label: '3 DANA' },
  { id: '7_days', durationDays: 7, price: 25.00, label: '7 DANA' },
];

export const CURRENCY = 'EUR';

export function getPlanById(id: string) {
  return PROMOTION_PLANS.find(p => p.id === id);
}
