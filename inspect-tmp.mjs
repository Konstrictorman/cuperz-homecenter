import { chromium } from 'playwright'

const browser = await chromium.launch()
const page = await browser.newPage()
await page.setViewportSize({ width: 1400, height: 900 })
await page.goto('http://localhost:3000/purchase-orders', { waitUntil: 'networkidle' })
await page.waitForSelector('.MuiDataGrid-root')

const themeSwitch = page.locator('input[type="checkbox"]').first()
await themeSwitch.click()
await page.waitForTimeout(300)

const info = await page.evaluate(() => {
  const pick = (sel) => {
    const el = document.querySelector(sel)
    if (!el) return { sel, found: false }
    const cs = getComputedStyle(el)
    return {
      sel,
      found: true,
      className: el.className,
      backgroundColor: cs.backgroundColor,
      zIndex: cs.zIndex,
      position: cs.position,
    }
  }
  return [
    pick('.purchase-orders-table .MuiDataGrid-root'),
    pick('.purchase-orders-table .MuiDataGrid-columnHeaders'),
    pick('.purchase-orders-table .MuiDataGrid-columnHeader'),
    pick('.purchase-orders-table .MuiDataGrid-columnHeaderTitleContainer'),
    pick('.purchase-orders-table .MuiDataGrid-columnHeaderTitleContainerContent'),
    pick('.purchase-orders-table .MuiDataGrid-row'),
    pick('.purchase-orders-table .MuiDataGrid-cell'),
    pick('.purchase-orders-table .MuiDataGrid-virtualScroller'),
    pick('.purchase-orders-table .MuiDataGrid-main'),
    pick('.purchase-orders-table .MuiDataGrid-topContainer'),
  ]
})
console.log(JSON.stringify(info, null, 2))

await browser.close()
