import { avisosHandlers } from './avisos'
import { bitacoraHandlers } from './bitacora'
import { ordenesHandlers } from './ordenes'

export const handlers = [
  ...ordenesHandlers,
  ...avisosHandlers,
  ...bitacoraHandlers,
]
