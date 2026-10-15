import { dispatchNoticesHandlers } from './dispatch-notices'
import { dispatchPreviewsHandlers } from './dispatch-previews'
import { integrationLogHandlers } from './integration-log'
import { purchaseOrdersHandlers } from './purchase-orders'

export const handlers = [
  ...purchaseOrdersHandlers,
  // Must precede dispatchNoticesHandlers — otherwise its
  // `GET /avisos-despacho/:avisoId` would swallow `/avisos-despacho/por-fecha`
  // by matching "por-fecha" as the :avisoId param.
  ...dispatchPreviewsHandlers,
  ...dispatchNoticesHandlers,
  ...integrationLogHandlers,
]
