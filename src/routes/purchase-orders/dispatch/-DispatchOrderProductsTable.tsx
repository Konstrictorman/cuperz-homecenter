// Tienda → Contenedor → Producto table for `DispatchOrderDetailModal`, built
// on `GroupedDataTable` (see its own doc comment: a `['tienda', 'contenedor']`
// `groupBy` is its literal worked example for this exact tree shape).

import Box from '@mui/material/Box'
import CircularProgress from '@mui/material/CircularProgress'
import Typography from '@mui/material/Typography'
import type { DispatchNoticeStoreInput } from '#/api/types'
import GroupedDataTable from '#/components/groupedDataTable/GroupedDataTable'
import type { AggregationFunction } from '#/components/groupedDataTable/GroupedDataTable'
import { useDispatchOrderProductsColumns } from './-useDispatchOrderProductsColumns'
import './DispatchOrderProductsTable.css'

interface DispatchOrderProductsTableProps {
  numPedido: string
  tiendas: Array<DispatchNoticeStoreInput>
  loading?: boolean
}

/** Overrides the built-in `sum` so `peso`/`volumen` subtotals and grand
 *  totals round to 2 decimals instead of showing raw binary-float noise
 *  (e.g. summing 0.011 + 0.024 + ... lands on 2.8640000000000008, not
 *  2.864) — only `sum`'s *result* is rounded, individual product rows
 *  still show their own exact value untouched. */
const aggregationFunctions: Record<string, AggregationFunction> = {
  sum: (values) =>
    Math.round(values.reduce((total, value) => total + value, 0) * 100) / 100,
}

/** One product line flattened out of a tienda → contenedor pair — the grain
 *  `GroupedDataTable` actually renders/groups. `DispatchNoticeStoreInput` is
 *  a nested tienda → contenedor → producto tree, which `GroupedDataTable`
 *  can't group on directly: it expects one flat row per leaf record, with
 *  every `groupBy` field (`eanTienda`, `contenedor`) repeated on each row. */
export interface DispatchOrderProductRow {
  id: string
  eanTienda: string
  contenedor: string
  eanSku: string
  cantidad: number
  peso: number
  volumen: number
}

const DispatchOrderProductsTable = ({
  numPedido,
  tiendas,
  loading,
}: DispatchOrderProductsTableProps) => {
  const columns = useDispatchOrderProductsColumns()

  if (loading) {
    return (
      <Box className="dispatch-order-products-table__status">
        <CircularProgress size={28} />
      </Box>
    )
  }

  if (tiendas.length === 0) {
    return (
      <Box className="dispatch-order-products-table__status">
        <Typography>Sin tiendas asociadas.</Typography>
      </Box>
    )
  }

  const rows: Array<DispatchOrderProductRow> = tiendas.flatMap((tienda) =>
    tienda.contenedores.flatMap((contenedor) =>
      contenedor.productos.map((producto) => ({
        id: `${tienda.eanTienda}-${contenedor.contenedor}-${producto.eanSku}`,
        eanTienda: tienda.eanTienda,
        contenedor: contenedor.contenedor,
        eanSku: producto.eanSku,
        cantidad: producto.cantidad,
        peso: producto.peso,
        volumen: producto.volumen,
      })),
    ),
  )

  return (
    <GroupedDataTable
      groupBy={['eanTienda', 'contenedor']}
      aggregations={[
        { field: 'cantidad', fn: 'sum' },
        { field: 'peso', fn: 'sum' },
        { field: 'volumen', fn: 'sum' },
      ]}
      rows={rows}
      columns={columns}
      aggregationFunctions={aggregationFunctions}
      exportFileName={`Detalle despacho ${numPedido}`}
      tableTitle={`Detalle de productos por tienda y contenedor — Pedido ${numPedido}`}
    />
  )
}

export default DispatchOrderProductsTable
