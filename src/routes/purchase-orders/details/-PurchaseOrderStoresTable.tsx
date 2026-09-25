// Store/products table for `PurchaseOrderDetailModal`. `@mui/x-data-grid` here
// is the Community edition — no tree data / master-detail row expansion — so
// this is a plain MUI `Table` with a `Collapse`d nested table per store,
// following MUI's own collapsible-table pattern instead of `DataTable`.

import { useState } from 'react'
import Box from '@mui/material/Box'
import CircularProgress from '@mui/material/CircularProgress'
import Collapse from '@mui/material/Collapse'
import IconButton from '@mui/material/IconButton'
import Table from '@mui/material/Table'
import TableBody from '@mui/material/TableBody'
import TableCell from '@mui/material/TableCell'
import TableContainer from '@mui/material/TableContainer'
import TableHead from '@mui/material/TableHead'
import TableRow from '@mui/material/TableRow'
import Typography from '@mui/material/Typography'
import KeyboardArrowDownIcon from '@mui/icons-material/KeyboardArrowDown'
import KeyboardArrowUpIcon from '@mui/icons-material/KeyboardArrowUp'
import StatusBadge from '#/components/statusBadge/StatusBadge'
import type { PurchaseOrderStore, PurchaseOrderStoreLine } from '#/api/types'
import { ORDER_LINE_STATUS_UI } from './orderPresentation'
import './PurchaseOrderStoresTable.css'

interface PurchaseOrderStoresTableProps {
  tiendas: Array<PurchaseOrderStore>
  loading?: boolean
}

const PurchaseOrderStoresTable = ({
  tiendas,
  loading,
}: PurchaseOrderStoresTableProps) => {
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

  return (
    <TableContainer className="purchase-order-stores-table">
      <Table size="small">
        <TableHead>
          <TableRow>
            <TableCell
              className="purchase-order-stores-table__expand-cell"
              padding="checkbox"
            />
            <TableCell>Tienda</TableCell>
            <TableCell align="center">EAN tienda</TableCell>
            <TableCell align="center"># Productos</TableCell>
            <TableCell align="center">Cant. solicitada</TableCell>
          </TableRow>
        </TableHead>
        <TableBody>
          {tiendas.map((tienda) => (
            <StoreRow key={tienda.eanTienda} tienda={tienda} />
          ))}
        </TableBody>
      </Table>
    </TableContainer>
  )
}

interface StoreRowProps {
  tienda: PurchaseOrderStore
}

const StoreRow = ({ tienda }: StoreRowProps) => {
  const [open, setOpen] = useState(false)
  const cantidadTotal = tienda.productos.reduce((sum, p) => sum + p.cantidad, 0)

  return (
    <>
      <TableRow className="purchase-order-stores-table__store-row">
        <TableCell padding="checkbox">
          <IconButton
            size="small"
            onClick={() => setOpen((prev) => !prev)}
            aria-label={open ? 'Contraer tienda' : 'Expandir tienda'}
            aria-expanded={open}
          >
            {open ? (
              <KeyboardArrowUpIcon fontSize="small" />
            ) : (
              <KeyboardArrowDownIcon fontSize="small" />
            )}
          </IconButton>
        </TableCell>
        <TableCell>{tienda.nombreTienda}</TableCell>
        <TableCell align="center">{tienda.eanTienda}</TableCell>
        <TableCell align="center">{tienda.productos.length}</TableCell>
        <TableCell align="center">{cantidadTotal}</TableCell>
      </TableRow>
      <TableRow className="purchase-order-stores-table__detail-row">
        <TableCell
          className="purchase-order-stores-table__detail-cell"
          colSpan={5}
        >
          <Collapse in={open} timeout="auto" unmountOnExit>
            <StoreProductsTable productos={tienda.productos} />
          </Collapse>
        </TableCell>
      </TableRow>
    </>
  )
}

interface StoreProductsTableProps {
  productos: Array<PurchaseOrderStoreLine>
}

const StoreProductsTable = ({ productos }: StoreProductsTableProps) => (
  <Box className="purchase-order-stores-table__products">
    <Table size="small">
      <TableHead>
        <TableRow>
          <TableCell>SKU</TableCell>
          <TableCell>Producto</TableCell>
          <TableCell align="center">Cant. tienda</TableCell>
          <TableCell align="center">Cant. solicitada (OC)</TableCell>
          <TableCell align="center">Cant. cancelada</TableCell>
          <TableCell align="center">Estado línea</TableCell>
        </TableRow>
      </TableHead>
      <TableBody>
        {productos.map((producto) => {
          const ui = ORDER_LINE_STATUS_UI[producto.estadoLinea]
          return (
            <TableRow key={producto.eanSku}>
              <TableCell>{producto.eanSku}</TableCell>
              <TableCell>{producto.descripcion}</TableCell>
              <TableCell align="center">{producto.cantidad}</TableCell>
              <TableCell align="center">
                {producto.cantidadSolicitada}
              </TableCell>
              <TableCell align="center">{producto.cantidadCancelada}</TableCell>
              <TableCell align="center">
                <StatusBadge label={ui.label} tone={ui.tone} />
              </TableCell>
            </TableRow>
          )
        })}
      </TableBody>
    </Table>
  </Box>
)

export default PurchaseOrderStoresTable
