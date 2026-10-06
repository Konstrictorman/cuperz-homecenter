import { useMemo } from 'react'
import type { GridColDef } from '@mui/x-data-grid'
import type { PurchaseOrderStoreProductRow } from './-PurchaseOrderStoresTable'

export const usePurchaseOrderStoresColumns = (): GridColDef<PurchaseOrderStoreProductRow>[] =>
  useMemo(
    () => [
      { field: 'tienda', headerName: 'Tienda', flex: 1, minWidth: 160 },
      {
        field: 'descripcion',
        headerName: 'Producto',
        flex: 1.5,
        minWidth: 220,
      },
      {
        field: 'cantidad',
        headerName: 'Cantidad',
        type: 'number',
        flex: 1,
      },
      {
        field: 'valorLinea',
        headerName: 'Valor',
        type: 'number',
        valueFormatter: (value: number) =>
          `$${Math.round(value).toLocaleString('en-US')}`,
        flex: 1,
      },
    ],
    [],
  )
