// Minimal, valid PDF stand-ins for the documents the real backend renders via
// Homecenter (`GenerarEtiqueta`, `GenerarPdf`) — plain-text pages only, so the
// download paths can be exercised without the real services.

/** Escapes the characters that are special inside a PDF literal string. */
function pdfString(text: string): string {
  return `(${text.replace(/[\\()]/g, (char) => `\\${char}`)})`
}

/** One page per entry, each a list of text lines. Lines must be ASCII — the
 *  xref offsets below assume one byte per character. */
function buildMockPdf(
  pages: Array<Array<string>>,
  { width, height }: { width: number; height: number },
): string {
  // Object numbering: 1 catalog, 2 pages, 3 font, then (page, content) pairs.
  const pageIds = pages.map((_, i) => 4 + i * 2)

  const objects: Array<string> = [
    '<< /Type /Catalog /Pages 2 0 R >>',
    `<< /Type /Pages /Kids [${pageIds.map((id) => `${id} 0 R`).join(' ')}] /Count ${pages.length} >>`,
    '<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>',
  ]
  pages.forEach((lines, index) => {
    const stream = [
      `BT /F1 14 Tf 24 ${height - 60} Td`,
      ...lines.map(
        (line, i) => `${i === 0 ? '' : '0 -24 Td '}${pdfString(line)} Tj`,
      ),
      'ET',
    ].join('\n')
    objects.push(
      `<< /Type /Page /Parent 2 0 R /MediaBox [0 0 ${width} ${height}] /Resources << /Font << /F1 3 0 R >> >> /Contents ${pageIds[index] + 1} 0 R >>`,
      `<< /Length ${stream.length} >>\nstream\n${stream}\nendstream`,
    )
  })

  let pdf = '%PDF-1.4\n'
  const offsets = objects.map((body, index) => {
    const offset = pdf.length
    pdf += `${index + 1} 0 obj\n${body}\nendobj\n`
    return offset
  })
  const xrefOffset = pdf.length
  pdf += `xref\n0 ${objects.length + 1}\n0000000000 65535 f \n`
  pdf += offsets
    .map((offset) => `${String(offset).padStart(10, '0')} 00000 n \n`)
    .join('')
  pdf += `trailer\n<< /Size ${objects.length + 1} /Root 1 0 R >>\nstartxref\n${xrefOffset}\n%%EOF\n`
  return pdf
}

/** Barcode labels — one small page per label copy. */
export function buildLabelsPdf(ordenCompra: string, numTags: number): string {
  const pageCount = Math.max(numTags, 1)
  return buildMockPdf(
    Array.from({ length: pageCount }, (_, index) => [
      `MOCK - Orden de compra ${ordenCompra}`,
      `Etiqueta ${index + 1} de ${pageCount}`,
    ]),
    { width: 288, height: 180 },
  )
}

/** The purchase orders document — one letter-size page per order. */
export function buildPurchaseOrdersPdf(ordenCompras: Array<string>): string {
  return buildMockPdf(
    ordenCompras.map((ordenCompra) => [
      `MOCK - Orden de compra ${ordenCompra}`,
    ]),
    { width: 612, height: 792 },
  )
}
