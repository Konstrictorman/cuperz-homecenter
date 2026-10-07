import { dispatchNoticesHandlers } from './dispatch-notices'
import { integrationLogHandlers } from './integration-log'
import { purchaseOrderDispatchHandlers } from './purchase-order-dispatch'
import { purchaseOrdersHandlers } from './purchase-orders'

export const handlers = [
  // Must precede purchaseOrdersHandlers — otherwise its
  // `GET /ordenes-compra/:ordenCompra` would swallow `/ordenes-compra/despacho`
  // by matching "despacho" as the :ordenCompra param.
  ...purchaseOrderDispatchHandlers,
  ...purchaseOrdersHandlers,
  ...dispatchNoticesHandlers,
  ...integrationLogHandlers,
]
