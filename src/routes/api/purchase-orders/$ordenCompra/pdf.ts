// Proxies Homecenter's `GenerarPdf` endpoint server-side so the bearer token
// never reaches the browser (see docs/mock-api.md — this is a real route,
// not served through the MSW `/api/v1` mock layer).
//
// `tipoProcesoPdf: 'PDF_FBS_RETAIL'` and `idTipoOc: 'retail'` are hardcoded
// from the one example payload Homecenter gave us — unconfirmed whether
// either varies per order type. Flagging per this repo's convention of
// marking unconfirmed Homecenter contract details (see root CLAUDE.md).

import { createFileRoute } from '@tanstack/react-router'
import { env } from '#/env'

export const Route = createFileRoute(
  '/api/purchase-orders/$ordenCompra/pdf',
)({
  server: {
    handlers: {
      GET: async ({ params }) => {
        const { ordenCompra } = params

        let homecenterResponse: Response
        try {
          homecenterResponse = await fetch(env.HOMECENTER_PDF_API_URL, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              Authorization: `Bearer ${env.HOMECENTER_PDF_BEARER_TOKEN}`,
            },
            body: JSON.stringify({
              tipoProcesoPdf: 'PDF_FBS_RETAIL',
              parametroGeneracion: {
                idTipoOc: 'retail',
                ordenes: [ordenCompra],
              },
            }),
          })
        } catch {
          return Response.json(
            {
              error: {
                code: 'HOMECENTER_NO_DISPONIBLE',
                message: 'No se pudo contactar a Homecenter para generar el PDF.',
                details: [],
              },
            },
            { status: 502 },
          )
        }

        if (!homecenterResponse.ok) {
          return Response.json(
            {
              error: {
                code: 'HOMECENTER_NO_DISPONIBLE',
                message: `Homecenter rechazó la generación del PDF (${homecenterResponse.status}).`,
                details: [],
              },
            },
            { status: 502 },
          )
        }

        const pdf = await homecenterResponse.arrayBuffer()
        return new Response(pdf, {
          status: 200,
          headers: {
            'Content-Type': 'application/pdf',
            'Content-Disposition': `attachment; filename="orden-${ordenCompra}.pdf"`,
          },
        })
      },
    },
  },
})
