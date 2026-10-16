import { useMemo } from 'react'
import Tooltip from '@mui/material/Tooltip'
import type { GridColDef } from '@mui/x-data-grid'
import type { PurchaseOrderStoreProductRow } from './-PurchaseOrderStoresTable'

export const usePurchaseOrderStoresColumns =
  (): GridColDef<PurchaseOrderStoreProductRow>[] =>
    useMemo(
      () => [
        { field: 'tienda', headerName: 'Tienda', flex: 1, minWidth: 160 },
        {
          field: 'descripcion',
          headerName: 'Producto',
          flex: 1.5,
          minWidth: 220,
          // The EAN lives in the tooltip instead of its own column.
          renderCell: ({ row, value }) => (
            <Tooltip
              title={`SKU (EAN): ${row.eanProducto}`}
              placement="top-end"
              arrow
            >
              <span>{value}</span>
            </Tooltip>
          ),
        },
        {
          field: 'cantidad',
          headerName: 'Cantidad',
          type: 'number',
          flex: 0.3,
          valueFormatter: (value: number) =>
            `${Math.round(value).toLocaleString('es-CO')}`,
        },
        {
          field: 'valorLinea',
          headerName: 'Valor',
          type: 'number',
          valueFormatter: (value: number) =>
            `$${Math.round(value).toLocaleString('es-CO')}`,
          flex: 0.4,
        },
      ],
      [],
    )
