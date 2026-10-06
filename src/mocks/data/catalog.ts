// Reference catalogue the mock generators draw from. Purchase-order
// products/stores/clients now come from the real export seeded in
// `purchase-orders-seed.json` (see `db.ts`) — these arrays only cover the
// per-line fields that export never carries at all.

export const PAYMENT_CONDITIONS: Array<string> = [
  '30 Dias',
  '45 Dias',
  '60 Dias',
  'Contado',
]

export const SALE_UNITS: Array<string> = ['UND', 'CJA', 'M2', 'KG', 'MT']
