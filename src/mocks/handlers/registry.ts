import { dispatchNoticesHandlers } from './dispatch-notices'
import { integrationLogHandlers } from './integration-log'
import { purchaseOrdersHandlers } from './purchase-orders'

export const handlers = [
  ...purchaseOrdersHandlers,
  ...dispatchNoticesHandlers,
  ...integrationLogHandlers,
]
