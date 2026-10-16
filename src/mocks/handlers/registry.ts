import { dispatchNoticesHandlers } from './dispatch-notices'
import { dispatchPreviewsHandlers } from './dispatch-previews'
import { integrationLogHandlers } from './integration-log'
import { purchaseOrdersHandlers } from './purchase-orders'

export const handlers = [
  ...purchaseOrdersHandlers,
  // Kept ahead of dispatchNoticesHandlers so its fixed `/avisos-despacho/*`
  // routes (e.g. `POST /avisos-despacho/enviar`) win over `:avisoId` ones.
  ...dispatchPreviewsHandlers,
  ...dispatchNoticesHandlers,
  ...integrationLogHandlers,
]
