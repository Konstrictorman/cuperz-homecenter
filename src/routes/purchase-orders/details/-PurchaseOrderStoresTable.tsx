// Store/products table for `PurchaseOrderDetailModal`. `@mui/x-data-grid` here
// is the Community edition — no tree data / master-detail row expansion — so
// this is a plain MUI `Table` with a `Collapse`d nested table per store,
// following MUI's own collapsible-table pattern instead of `DataTable`.

import { useCallback, useMemo } from 'react'
import Box from '@mui/material/Box'
import CircularProgress from '@mui/material/CircularProgress'
import Tooltip from '@mui/material/Tooltip'
import Typography from '@mui/material/Typography'
import type { PurchaseOrderStore } from '#/api/types'
import './PurchaseOrderStoresTable.css'
import GroupedDataTable from '#/components/groupedDataTable/GroupedDataTable'
import type { GroupRow } from '#/components/groupedDataTable/GroupedDataTable'
import { usePurchaseOrderStoresColumns } from './-usePurchaseOrderStoresColumns'

interface PurchaseOrderStoresTableProps {
  purchaseOrderNumber: string
  tiendas: Array<PurchaseOrderStore>
  loading?: boolean
}

/** One product line flattened out of a store — the grain `GroupedDataTable`
 *  actually renders/groups. `PurchaseOrderStore.productos` is a nested array
 *  per store, which `GroupedDataTable` can't group on directly: it expects
 *  one flat row per leaf record, with the `groupBy` field (`tienda`) repeated
 *  on every row of that group, the same shape `GroupedDataTable.stories.tsx`
 *  flattens the real OC 15669499 sample into. */
export interface PurchaseOrderStoreProductRow {
  id: string
  tienda: string
  eanTienda: string
  descripcion: string
  eanProducto: string
  cantidad: number
  valorLinea: number
}

const PurchaseOrderStoresTable = ({
  purchaseOrderNumber,
  tiendas,
  loading,
}: PurchaseOrderStoresTableProps) => {
  const columns = usePurchaseOrderStoresColumns()

  const eanByStoreName = useMemo(
    () =>
      new Map(tiendas.map((tienda) => [tienda.nombreTienda, tienda.eanTienda])),
    [tiendas],
  )

  // Store group rows only carry the name; the EAN goes in the tooltip.
  const renderGroupLabel = useCallback(
    (group: GroupRow, label: string) => {
      const eanTienda = eanByStoreName.get(group.groupValue)
      return eanTienda ? (
        <Tooltip title={`EAN tienda: ${eanTienda}`} placement="top-end" arrow>
          <span>{label}</span>
        </Tooltip>
      ) : (
        label
      )
    },
    [eanByStoreName],
  )

  if (loading) {
    return (
      <Box className="purchase-order-stores-table__status">
        <CircularProgress size={28} />
      </Box>
    )
  }

  if (tiendas.length === 0) {
    return (
      <Box className="purchase-order-stores-table__status">
        <Typography>Sin tiendas asociadas.</Typography>
      </Box>
    )
  }

  const rows: Array<PurchaseOrderStoreProductRow> = tiendas.flatMap((tienda) =>
    tienda.productos.map((producto) => ({
      id: `${tienda.eanTienda}-${producto.detalleId}`,
      tienda: tienda.nombreTienda,
      eanTienda: tienda.eanTienda,
      descripcion: producto.producto,
      eanProducto: producto.eanProducto,
      cantidad: producto.cantidad,
      valorLinea: producto.cantidad * producto.costoSku,
    })),
  )

  return (
    <GroupedDataTable
      groupBy="tienda"
      aggregations={[
        { field: 'valorLinea', fn: 'sum' },
        { field: 'cantidad', fn: 'sum' },
      ]}
      rows={rows}
      columns={columns}
      renderGroupLabel={renderGroupLabel}
      exportFileName={`Detalle orden de compra ${purchaseOrderNumber}`}
      tableTitle={`Detalle de productos por tienda — OC ${purchaseOrderNumber}`}
    />
  )
}

export default PurchaseOrderStoresTable
