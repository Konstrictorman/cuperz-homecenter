import { useMemo } from 'react'
import Tooltip from '@mui/material/Tooltip'
import type { GridColDef } from '@mui/x-data-grid'
import type { DispatchOrderProductRow } from './-DispatchOrderProductsTable'

export const useDispatchOrderProductsColumns =
  (): GridColDef<DispatchOrderProductRow>[] =>
    useMemo(
      () => [
        { field: 'nombreTienda', headerName: 'Tienda', flex: 1, minWidth: 160 },
        {
          field: 'contenedor',
          headerName: 'Contenedor',
          flex: 1,
          minWidth: 140,
        },
        {
          field: 'description',
          headerName: 'Producto',
          flex: 1,
          minWidth: 200,
          // The EAN lives in the tooltip instead of its own column.
          renderCell: ({ row, value }) => (
            <Tooltip
              title={`SKU (EAN): ${row.eanSku}`}
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
