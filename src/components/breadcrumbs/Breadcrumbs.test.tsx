import { render, screen, fireEvent } from '@testing-library/react'
import {
  Outlet,
  RouterProvider,
  createMemoryHistory,
  createRootRoute,
  createRoute,
  createRouter,
} from '@tanstack/react-router'
import Breadcrumbs from './Breadcrumbs'

function buildRouteTree() {
  const rootRoute = createRootRoute({
    staticData: { crumb: 'Inicio' },
    component: () => (
      <>
        <Breadcrumbs />
        <Outlet />
      </>
    ),
  })

  const homeRoute = createRoute({
    getParentRoute: () => rootRoute,
    path: '/',
    component: () => <div>Home page marker</div>,
  })

  const noCrumbRoute = createRoute({
    getParentRoute: () => rootRoute,
    path: '/no-crumb',
    component: () => <div>No crumb page marker</div>,
  })

  const purchaseOrdersRoute = createRoute({
    getParentRoute: () => rootRoute,
    path: '/purchase-orders',
    staticData: { crumb: 'Órdenes de compra' },
  })

  const purchaseOrderDetailRoute = createRoute({
    getParentRoute: () => purchaseOrdersRoute,
    path: '/$orderId',
    staticData: { crumb: 'Detalle' },
    component: () => <div>Detail page marker</div>,
  })

  return rootRoute.addChildren([
    homeRoute,
    noCrumbRoute,
    purchaseOrdersRoute.addChildren([purchaseOrderDetailRoute]),
  ])
}

async function renderAt(path: string) {
  const history = createMemoryHistory({ initialEntries: [path] })
  const router = createRouter({ routeTree: buildRouteTree(), history })
  // Resolve the initial match before mounting so the first render is
  // already settled, instead of racing an async transition post-mount.
  await router.load()
  return render(<RouterProvider router={router} />)
}

describe('Breadcrumbs', () => {
  it('renders nothing when no matched route defines crumb data', async () => {
    const rootRoute = createRootRoute({
      component: () => (
        <>
          <Breadcrumbs />
          <Outlet />
        </>
      ),
    })
    const leafRoute = createRoute({
      getParentRoute: () => rootRoute,
      path: '/',
      component: () => <div>Leaf page marker</div>,
    })
    const history = createMemoryHistory({ initialEntries: ['/'] })
    const router = createRouter({
      routeTree: rootRoute.addChildren([leafRoute]),
      history,
    })
    await router.load()
    render(<RouterProvider router={router} />)

    expect(await screen.findByText('Leaf page marker')).toBeInTheDocument()
    expect(screen.queryByRole('navigation')).not.toBeInTheDocument()
  })

  it('renders the current page as bold text with no link when it is the only crumb', async () => {
    await renderAt('/')

    expect(await screen.findByText('Inicio')).toBeInTheDocument()
    expect(
      screen.queryByRole('link', { name: 'Inicio' }),
    ).not.toBeInTheDocument()
  })

  it('omits a matched route from the trail when it has no crumb data', async () => {
    await renderAt('/no-crumb')

    expect(await screen.findByText('No crumb page marker')).toBeInTheDocument()
    expect(screen.getByText('Inicio')).toBeInTheDocument()
    // "Inicio" is the only crumb in the trail, so it renders as the current
    // page (plain text), not as a link to somewhere else.
    expect(screen.queryByRole('link')).not.toBeInTheDocument()
  })

  it('renders ancestor crumbs as links and the current page as plain text, in order', async () => {
    await renderAt('/purchase-orders/42')

    const inicio = await screen.findByRole('link', { name: 'Inicio' })
    const ordenes = screen.getByRole('link', { name: 'Órdenes de compra' })
    const detalle = screen.getByText('Detalle')

    expect(screen.queryByRole('link', { name: 'Detalle' })).not.toBeInTheDocument()

    const position = inicio.compareDocumentPosition(ordenes)
    expect(position & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy()
    const secondPosition = ordenes.compareDocumentPosition(detalle)
    expect(secondPosition & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy()
  })

  it('navigates to the linked route when an ancestor crumb is clicked', async () => {
    await renderAt('/purchase-orders/42')

    const inicio = await screen.findByRole('link', { name: 'Inicio' })
    fireEvent.click(inicio)

    expect(await screen.findByText('Home page marker')).toBeInTheDocument()
    expect(screen.getByText('Inicio')).toBeInTheDocument()
    expect(screen.queryByText('Órdenes de compra')).not.toBeInTheDocument()
  })
})
