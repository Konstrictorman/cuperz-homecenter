// Tienda → Contenedor → Producto table for `DispatchOrderDetailModal`, built
// on `GroupedDataTable` (see its own doc comment: a `['tienda', 'contenedor']`
// `groupBy` is its literal worked example for this exact tree shape).

import { useCallback, useMemo } from 'react'
import Box from '@mui/material/Box'
import Tooltip from '@mui/material/Tooltip'
import Typography from '@mui/material/Typography'
import type { DispatchPreviewStore } from '#/api/types'
import GroupedDataTable from '#/components/groupedDataTable/GroupedDataTable'
import type {
  AggregationFunction,
  GroupRow,
} from '#/components/groupedDataTable/GroupedDataTable'
import { useDispatchOrderProductsColumns } from './-useDispatchOrderProductsColumns'
import './DispatchOrderProductsTable.css'

interface DispatchOrderProductsTableProps {
  ordenCompra: string
  tiendas: Array<DispatchPreviewStore>
}

/** The backend sends a stringified Python `None` for an unknown store. */
const MISSING_STORE = 'None'

/** Store group label: `T{codTienda} - {nombreTienda}` (e.g. `T95 - Calle 80`). */
const storeLabel = (tienda: DispatchPreviewStore) =>
  tienda.nombreTienda === MISSING_STORE
    ? 'Sin tienda'
    : `T${tienda.codTienda} - ${tienda.nombreTienda}`

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
 *  `GroupedDataTable` actually renders/groups. `DispatchPreviewStore` is
 *  a nested tienda → contenedor → producto tree, which `GroupedDataTable`
 *  can't group on directly: it expects one flat row per leaf record, with
 *  every `groupBy` field (`tienda`, `contenedor`) repeated on each row. */
export interface DispatchOrderProductRow {
  id: string
  /** Display/grouping label built by `storeLabel`. */
  tienda: string
  nombreTienda: string
  eanTienda: string
  codTienda: string
  contenedor: string
  eanSku: string
  description: string
  cantidad: number
  peso: number
  volumen: number
  valorUnitario: number
}

const DispatchOrderProductsTable = ({
  ordenCompra,
  tiendas,
}: DispatchOrderProductsTableProps) => {
  const columns = useDispatchOrderProductsColumns()

  const eanByStoreLabel = useMemo(
    () =>
      new Map(tiendas.map((tienda) => [storeLabel(tienda), tienda.eanTienda])),
    [tiendas],
  )

  // Store group rows only carry the code + name; the EAN goes in the tooltip.
  const renderGroupLabel = useCallback(
    (group: GroupRow, label: string) => {
      const eanTienda =
        group.field === 'tienda'
          ? eanByStoreLabel.get(group.groupValue)
          : undefined
      return eanTienda ? (
        <Tooltip title={`EAN tienda: ${eanTienda}`} placement="top-end" arrow>
          <span>{label}</span>
        </Tooltip>
      ) : (
        label
      )
    },
    [eanByStoreLabel],
  )

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
        id: `${tienda.nombreTienda}-${contenedor.contenedor}-${producto.eanSku}`,
        tienda: storeLabel(tienda),
        nombreTienda: tienda.nombreTienda,
        eanTienda: tienda.eanTienda,
        codTienda: tienda.codTienda,
        contenedor: contenedor.contenedor,
        eanSku: producto.eanSku,
        description: producto.description,
        // API sends decimal strings (`"6.000"`); the grid sums numbers.
        cantidad: Number(producto.cantidad),
        peso: Number(producto.peso),
        volumen: Number(producto.volumen),
        valorUnitario:
          Number(producto.valorUnitario) * Number(producto.cantidad),
      })),
    ),
  )

  return (
    <GroupedDataTable
      groupBy={['tienda', 'contenedor']}
      mainGroupLabel="tiendas"
      aggregations={[
        { field: 'cantidad', fn: 'sum' },
        { field: 'peso', fn: 'sum' },
        { field: 'volumen', fn: 'sum' },
        { field: 'valorUnitario', fn: 'sum' },
      ]}
      rows={rows}
      columns={columns}
      aggregationFunctions={aggregationFunctions}
      exportFileName={`Detalle despacho ${ordenCompra}`}
      renderGroupLabel={renderGroupLabel}
      tableTitle={`Detalle de productos por tienda y contenedor — Orden ${ordenCompra}`}
    />
  )
}

export default DispatchOrderProductsTable
