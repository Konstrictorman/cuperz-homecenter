import { useMemo } from 'react'
import type { GridColDef } from '@mui/x-data-grid'
import type { DispatchOrderProductRow } from './-DispatchOrderProductsTable'

export const useDispatchOrderProductsColumns =
  (): GridColDef<DispatchOrderProductRow>[] =>
    useMemo(
      () => [
        { field: 'eanTienda', headerName: 'Tienda (EAN)', flex: 1, minWidth: 160 },
        {
          field: 'contenedor',
          headerName: 'Contenedor',
          flex: 1,
          minWidth: 140,
        },
        { field: 'eanSku', headerName: 'SKU (EAN)', flex: 1, minWidth: 160 },
        {
          field: 'cantidad',
          headerName: 'Cantidad',
          type: 'number',
          flex: 0.4,
          minWidth: 100,
        },
        {
          field: 'peso',
          headerName: 'Peso (kg)',
          type: 'number',
          flex: 0.4,
          minWidth: 100,
        },
        {
          field: 'volumen',
          headerName: 'Volumen (m³)',
          type: 'number',
          flex: 0.4,
          minWidth: 110,
        },
      ],
      [],
    )
