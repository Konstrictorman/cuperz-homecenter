// Minimal, valid PDF stand-in for the barcode labels the real backend renders
// (via Homecenter's `GenerarEtiqueta`) — one plain-text page per label copy,
// so the download path can be exercised without the real service.

/** Escapes the characters that are special inside a PDF literal string. */
function pdfString(text: string): string {
  return `(${text.replace(/[\\()]/g, (char) => `\\${char}`)})`
}

export function buildLabelsPdf(ordenCompra: string, numTags: number): string {
  const pageCount = Math.max(numTags, 1)
  // Object numbering: 1 catalog, 2 pages, 3 font, then (page, content) pairs.
  const pageIds = Array.from({ length: pageCount }, (_, i) => 4 + i * 2)

  const objects: Array<string> = [
    '<< /Type /Catalog /Pages 2 0 R >>',
    `<< /Type /Pages /Kids [${pageIds.map((id) => `${id} 0 R`).join(' ')}] /Count ${pageCount} >>`,
    '<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>',
  ]
  pageIds.forEach((pageId, index) => {
    const stream = [
      'BT /F1 14 Tf 24 120 Td',
      `${pdfString(`MOCK - Orden de compra ${ordenCompra}`)} Tj`,
      `0 -24 Td ${pdfString(`Etiqueta ${index + 1} de ${pageCount}`)} Tj`,
      'ET',
    ].join('\n')
    objects.push(
      `<< /Type /Page /Parent 2 0 R /MediaBox [0 0 288 180] /Resources << /Font << /F1 3 0 R >> >> /Contents ${pageId + 1} 0 R >>`,
      `<< /Length ${stream.length} >>\nstream\n${stream}\nendstream`,
    )
  })

  // Every character here is ASCII, so string length == byte offset.
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
