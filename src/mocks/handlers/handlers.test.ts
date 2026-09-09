/**
 * @jest-environment node
 */
import { setupServer } from 'msw/node'
import { handlers } from './registry'
import { resetDb } from '../data/db'
import type {
  AvisoDespachoResultado,
  Paginated,
  OrdenCompraResumen,
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

describe('órdenes de compra', () => {
  it('lists with the pagination envelope', async () => {
    const { status, body } = await json<Paginated<OrdenCompraResumen>>(
      '/ordenes-compra?pageSize=5',
    )
    expect(status).toBe(200)
    expect(body.data).toHaveLength(5)
    expect(body.pagination.total).toBeGreaterThan(40)
  })

  it('returns the canonical order detail', async () => {
    const { status, body } = await json<{
      ordenCompra: string
      tiendas: unknown[]
    }>('/ordenes-compra/8467343')
    expect(status).toBe(200)
    expect(body.ordenCompra).toBe('8467343')
    expect(body.tiendas).toHaveLength(1)
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
    expect(await res.text()).toContain('ordenCompra;eanPuntoEntrega')
  })
})

describe('avisos de despacho', () => {
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

  it('creates and sends an aviso (201 ENVIADO)', async () => {
    const { status, body } = await json<AvisoDespachoResultado>(
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
    const { body } = await json<AvisoDespachoResultado>(
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

describe('bitácora', () => {
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
