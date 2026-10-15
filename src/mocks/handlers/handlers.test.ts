/**
 * @jest-environment node
 */
import { setupServer } from 'msw/node'
import { handlers } from './registry'
import { resetDb } from '../data/db'
import type {
  DispatchNoticeResult,
  DispatchPreviewsByDateResponse,
  Paginated,
  PurchaseOrderSummary,
} from '#/api/types'

const server = setupServer(...handlers)
const BASE = 'http://localhost/api/v1'

beforeAll(() => server.listen({ onUnhandledRequest: 'error' }))
afterEach(() => {
  server.resetHandlers()
  resetDb()
})
afterAll(() => server.close())

async function json<T>(
  path: string,
  init?: RequestInit,
): Promise<{ status: number; body: T }> {
  const res = await fetch(BASE + path, init)
  return { status: res.status, body: (await res.json()) as T }
}

function post(body: unknown): RequestInit {
  return {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify(body),
  }
}

describe('purchase orders', () => {
  it('lists with the pagination envelope', async () => {
    const { status, body } = await json<Paginated<PurchaseOrderSummary>>(
      '/ordenes-compra?pageSize=5',
    )
    expect(status).toBe(200)
    expect(body.data).toHaveLength(5)
    expect(body.pagination.total).toBeGreaterThan(40)
  })

  it('returns the canonical order detail grouped by store', async () => {
    const { status, body } = await json<{
      cabecera: { ordenCompra: string }
      tiendas: Array<{ eanTienda: string; productos: unknown[] }>
    }>('/ordenes-compra/8467343')
    expect(status).toBe(200)
    expect(body.cabecera.ordenCompra).toBe('8467343')
    expect(body.tiendas).toHaveLength(1)
    expect(body.tiendas[0].productos).toHaveLength(2)
  })

  it('404s an unknown order', async () => {
    const { status, body } = await json<{ error: { code: string } }>(
      '/ordenes-compra/nope',
    )
    expect(status).toBe(404)
    expect(body.error.code).toBe('ORDEN_NO_ENCONTRADA')
  })

  it('syncs asynchronously (202)', async () => {
    const { status, body } = await json<{ estado: string }>(
      '/ordenes-compra/sincronizar',
      post({ modo: 'INCREMENTAL' }),
    )
    expect(status).toBe(202)
    expect(body.estado).toBe('EN_PROCESO')
  })

  it('exports CSV', async () => {
    const res = await fetch(`${BASE}/ordenes-compra/export`)
    expect(res.headers.get('content-type')).toContain('text/csv')
    expect(await res.text()).toContain(
      'Numero de la Orden de Compra;EAN Entidad a Facturar',
    )
  })

  it('generates the barcode labels PDF', async () => {
    const res = await fetch(`${BASE}/ordenes-compra/8467343/etiquetas/3`)
    expect(res.status).toBe(200)
    expect(res.headers.get('content-type')).toBe('application/pdf')
    const pdf = await res.text()
    expect(pdf.startsWith('%PDF-1.4')).toBe(true)
    expect(pdf).toContain('/Count 3')
  })

  it('rejects non-integer label params with 422', async () => {
    const res = await fetch(`${BASE}/ordenes-compra/abc/etiquetas/1`)
    expect(res.status).toBe(422)
  })
})

describe('dispatch previews by date', () => {
  it('lists under `ordenes` with the pagination envelope', async () => {
    const { status, body } = await json<DispatchPreviewsByDateResponse>(
      '/avisos-despacho/por-fecha?pageSize=5',
    )
    expect(status).toBe(200)
    expect(body.ordenes).toHaveLength(5)
    expect(body.pagination.total).toBe(36)
  })

  it('returns the Orden→Tienda→Contenedor→Producto tree with string numbers', async () => {
    const { body } = await json<DispatchPreviewsByDateResponse>(
      '/avisos-despacho/por-fecha?pageSize=1',
    )
    const [order] = body.ordenes
    expect(order.ordenCompra).toBe('15925353')
    expect(order.tiendas[0].contenedores[0].productos[0]).toMatchObject({
      eanSku: expect.any(String),
      cantidad: expect.any(String),
      peso: expect.any(String),
      volumen: expect.any(String),
    })
  })

  it('filters by estado from fechaRealDespacho', async () => {
    const pending = await json<DispatchPreviewsByDateResponse>(
      '/avisos-despacho/por-fecha?estado=NODESPACHADO&pageSize=100',
    )
    expect(pending.body.ordenes.length).toBeGreaterThan(0)
    for (const order of pending.body.ordenes) {
      expect(order.fechaRealDespacho).toBeNull()
    }
  })

  it('422s a half-open date range', async () => {
    const { status, body } = await json<{ error: { code: string } }>(
      '/avisos-despacho/por-fecha?fechaDesde=2026-10-01',
    )
    expect(status).toBe(422)
    expect(body.error.code).toBe('RANGO_FECHAS_INCOMPLETO')
  })

  it('is not swallowed by GET /avisos-despacho/:avisoId', async () => {
    const { status } = await json<unknown>('/avisos-despacho/por-fecha')
    expect(status).toBe(200)
  })
})

describe('dispatch notices', () => {
  it('rejects quantities over what was requested (400)', async () => {
    const { status, body } = await json<{
      error: { code: string; details: unknown[] }
    }>(
      '/avisos-despacho',
      post({
        ordenCompra: '8467343',
        fechaRealDespacho: '2026-08-20',
        enviarInmediatamente: true,
        tiendas: [
          {
            eanTienda: '7703670900306',
            contenedores: [
              {
                contenedor: 'CONT001',
                productos: [
                  {
                    eanSku: '7703670004288',
                    cantidad: 999,
                    peso: 10,
                    volumen: 1,
                  },
                ],
              },
            ],
          },
        ],
      }),
    )
    expect(status).toBe(400)
    expect(body.error.code).toBe('CANTIDAD_EXCEDE_SOLICITADO')
    expect(body.error.details.length).toBeGreaterThan(0)
  })

  it('creates and sends a notice (201 ENVIADO)', async () => {
    const { status, body } = await json<DispatchNoticeResult>(
      '/avisos-despacho',
      post({
        ordenCompra: '8467343',
        fechaRealDespacho: '2026-08-20',
        enviarInmediatamente: true,
        tiendas: [
          {
            eanTienda: '7703670900306',
            contenedores: [
              {
                contenedor: 'CONT001',
                productos: [
                  {
                    eanSku: '7703670004288',
                    cantidad: 10,
                    peso: 10,
                    volumen: 1,
                  },
                ],
              },
            ],
          },
        ],
      }),
    )
    expect(status).toBe(201)
    expect(body.estado).toBe('ENVIADO')
    expect(body.homecenter.isError).toBe(false)
  })

  it('saves a draft without contacting Homecenter', async () => {
    const { body } = await json<DispatchNoticeResult>(
      '/avisos-despacho',
      post({
        ordenCompra: '8467343',
        fechaRealDespacho: '2026-08-20',
        enviarInmediatamente: false,
        tiendas: [
          {
            eanTienda: '7703670900306',
            contenedores: [
              {
                contenedor: 'CONT001',
                productos: [
                  {
                    eanSku: '7703670004288',
                    cantidad: 5,
                    peso: 10,
                    volumen: 1,
                  },
                ],
              },
            ],
          },
        ],
      }),
    )
    expect(body.estado).toBe('BORRADOR')
  })
})

describe('integration log', () => {
  it('lists newest-first and resolves a detail', async () => {
    const { body } = await json<Paginated<{ integracionLogId: string }>>(
      '/integracion-log?pageSize=1',
    )
    const id = body.data[0].integracionLogId
    const { status, body: detail } = await json<{ requestEnviado: unknown }>(
      `/integracion-log/${id}`,
    )
    expect(status).toBe(200)
    expect(detail.requestEnviado).toBeDefined()
  })
})
