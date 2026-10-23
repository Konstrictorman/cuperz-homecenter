/**
 * @jest-environment node
 */
import { setupServer } from 'msw/node'
import { handlers } from './registry'
import { resetDb } from '../data/db'
import type {
  DispatchNoticeResult,
  DispatchPreviewsResponse,
  Paginated,
  PurchaseOrderSummary,
  ReprocessOrderResponse,
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

  it('flags an order as exportada once it has been exported', async () => {
    const before = await json<Paginated<PurchaseOrderSummary>>(
      '/ordenes-compra?ordenCompra=8467343',
    )
    expect(typeof before.body.data[0].exportada).toBe('boolean')

    await fetch(`${BASE}/ordenes-compra/export?ordenCompra=8467343`)
    const after = await json<Paginated<PurchaseOrderSummary>>(
      '/ordenes-compra?ordenCompra=8467343',
    )
    expect(after.body.data[0].exportada).toBe(true)
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

  it('reinjects a PENDIENTE order and counts the attempt', async () => {
    const list = await json<Paginated<PurchaseOrderSummary>>(
      '/ordenes-compra?estado=PENDIENTE&pageSize=1',
    )
    const { ordenCompra } = list.body.data[0]
    const { status, body } = await json<ReprocessOrderResponse>(
      `/ordenes-compra/${ordenCompra}/reinyectar`,
      { method: 'POST' },
    )
    expect(status).toBe(200)
    expect(body.ordenCompra).toBe(ordenCompra)
    expect(body.estado).toBe('PROCESANDO')
    expect(body.intentoNumero).toBe(1)

    // The order stays PENDIENTE, so it can be reinjected again.
    const after = await json<Paginated<PurchaseOrderSummary>>(
      `/ordenes-compra?ordenCompra=${ordenCompra}`,
    )
    expect(after.body.data[0].estado).toBe('PENDIENTE')
    const again = await json<ReprocessOrderResponse>(
      `/ordenes-compra/${ordenCompra}/reinyectar`,
      { method: 'POST' },
    )
    expect(again.status).toBe(200)
    expect(again.body.intentoNumero).toBe(2)
  })

  it('refuses a reinject past the attempt cap (409)', async () => {
    const list = await json<Paginated<PurchaseOrderSummary>>(
      '/ordenes-compra?estado=PENDIENTE&pageSize=1',
    )
    const path = `/ordenes-compra/${list.body.data[0].ordenCompra}/reinyectar`
    for (let i = 0; i < 3; i++) await fetch(BASE + path, { method: 'POST' })
    const { status, body } = await json<{ error: { code: string } }>(path, {
      method: 'POST',
    })
    expect(status).toBe(409)
    expect(body.error.code).toBe('REINTENTO_NO_PERMITIDO')
  })

  it('404s reinjecting an unknown order', async () => {
    const { status, body } = await json<{ error: { code: string } }>(
      '/ordenes-compra/nope/reinyectar',
      { method: 'POST' },
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

  it('generates one PDF for all the requested orders', async () => {
    const res = await fetch(`${BASE}/ordenes-compra/generar-pdf`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ordenes: ['8467343'] }),
    })
    expect(res.status).toBe(200)
    expect(res.headers.get('content-type')).toBe('application/pdf')
    const pdf = await res.text()
    expect(pdf.startsWith('%PDF-1.4')).toBe(true)
    expect(pdf).toContain('Orden de compra 8467343')
  })

  it('skips unknown orders when generating the PDF', async () => {
    const res = await fetch(`${BASE}/ordenes-compra/generar-pdf`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ordenes: ['8467343', '999999999'] }),
    })
    expect(res.status).toBe(200)
    const pdf = await res.text()
    expect(pdf).toContain('/Count 1')
    expect(pdf).toContain('Orden de compra 8467343')
    expect(pdf).not.toContain('999999999')
  })

  it('answers 404 when none of the orders exist', async () => {
    const { status, body } = await json<{ error: { code: string } }>(
      '/ordenes-compra/generar-pdf',
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ordenes: ['999999999'] }),
      },
    )
    expect(status).toBe(404)
    expect(body.error.code).toBe('ORDEN_NO_ENCONTRADA')
  })
})

describe('dispatch previews', () => {
  it('lists under `ordenes` with the pagination envelope', async () => {
    const { status, body } = await json<DispatchPreviewsResponse>(
      '/avisos-despacho?pageSize=5',
    )
    expect(status).toBe(200)
    expect(body.ordenes).toHaveLength(5)
    expect(body.pagination.total).toBe(36)
  })

  it('returns the Orden→Tienda→Contenedor→Producto tree with string numbers', async () => {
    const { body } = await json<DispatchPreviewsResponse>(
      '/avisos-despacho?pageSize=1',
    )
    const [order] = body.ordenes
    expect(order).toMatchObject({
      ordenCompra: '15925353',
      valorTotal: expect.stringMatching(/^\d+\.\d{2}$/),
      cantidadTotal: expect.stringMatching(/^\d+\.\d{2}$/),
      numpedido: null,
      fechaTransmision: expect.stringMatching(/^\d{4}-\d{2}-\d{2}T/),
      minimaFechaEntrega: expect.any(String),
      maximaFechaEntrega: expect.any(String),
    })
    expect(order.tiendas[0]).toMatchObject({
      codTienda: '95',
      nombreTienda: 'Bucaramanga La Rosita',
    })
    expect(order.tiendas[0].contenedores[0].productos[0]).toMatchObject({
      eanSku: expect.any(String),
      cantidad: expect.any(String),
      valorUnitario: expect.stringMatching(/^\d+\.\d{2}$/),
      peso: expect.any(String),
      volumen: expect.any(String),
    })
  })

  it('filters by estado', async () => {
    const pending = await json<DispatchPreviewsResponse>(
      '/avisos-despacho?estado=ALISTADO&pageSize=100',
    )
    expect(pending.body.ordenes.length).toBeGreaterThan(0)
    for (const order of pending.body.ordenes) {
      expect(order.estado).toBe('ALISTADO')
    }
  })

  it('filters by partial ordenCompra', async () => {
    const { body } = await json<DispatchPreviewsResponse>(
      '/avisos-despacho?ordenCompra=592535',
    )
    expect(body.ordenes.map((o) => o.ordenCompra)).toEqual(['15925353'])
  })

  it('422s a half-open date range', async () => {
    const { status, body } = await json<{ error: { code: string } }>(
      '/avisos-despacho?fechaDesde=2026-10-01',
    )
    expect(status).toBe(422)
    expect(body.error.code).toBe('RANGO_FECHAS_INCOMPLETO')
  })
})

describe('dispatching an order', () => {
  it('stamps the real dispatch date and sends the notice', async () => {
    const sent = await json<{ ordenCompra: string; estado: string }>(
      '/avisos-despacho/enviar',
      post({ ordenCompra: '15925353', fechaRealDespacho: '2026-10-15' }),
    )
    expect(sent.status).toBe(200)
    expect(sent.body).toMatchObject({
      ordenCompra: '15925353',
      estado: 'EXITOSO',
    })

    const dispatched = await json<DispatchPreviewsResponse>(
      '/avisos-despacho?estado=DESPACHADO',
    )
    expect(dispatched.body.ordenes).toEqual([
      expect.objectContaining({
        ordenCompra: '15925353',
        fechaRealDespacho: '2026-10-15',
      }),
    ])
  })

  it('404s an unknown order', async () => {
    const { status } = await json<unknown>(
      '/avisos-despacho/enviar',
      post({ ordenCompra: 'nope', fechaRealDespacho: '2026-10-15' }),
    )
    expect(status).toBe(404)
  })

  it('422s a malformed fechaRealDespacho', async () => {
    const { status } = await json<unknown>(
      '/avisos-despacho/enviar',
      post({ ordenCompra: '15925353', fechaRealDespacho: '15/10/2026' }),
    )
    expect(status).toBe(422)
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

  it('creates and sends a notice (201 DESPACHADA)', async () => {
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
    expect(body.estado).toBe('DESPACHADA')
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
    expect(body.estado).toBe('PENDIENTE')
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
