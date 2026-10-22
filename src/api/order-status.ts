// Order `estado` normalisation at the API boundary.
//
// `ALISTADO` is being renamed to `PREPARADO` on the backend, but responses
// still carry the old value until that change ships. The rest of the app only
// knows `PREPARADO`; drop this mapping once the backend no longer sends
// `ALISTADO`.

const LEGACY_ORDER_STATUS = new Map([['ALISTADO', 'PREPARADO']])

export function normalizeOrderStatus<T extends string | undefined>(
  estado: T,
): T {
  if (estado === undefined) return estado
  return (LEGACY_ORDER_STATUS.get(estado) ?? estado) as T
}
