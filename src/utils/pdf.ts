import puppeteer from 'puppeteer'

const LOGO_BASE64 = '/9j/4AAQSkZJRgABAQAAAQABAAD/4gHYSUNDX1BST0ZJTEUAAQEAAAHIAAAAAAQwAABtbnRyUkdCIFhZWiAH4AABAAEAAAAAAABhY3NwAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAQAA9tYAAQAAAADTLQAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAlkZXNjAAAA8AAAACRyWFlaAAABFAAAABRnWFlaAAABKAAAABRiWFlaAAABPAAAABR3dHB0AAABUAAAABRyVFJDAAABZAAAAChnVFJDAAABZAAAAChiVFJDAAABZAAAAChjcHJ0AAABjAAAADxtbHVjAAAAAAAAAAEAAAAMZW5VUwAAAAgAAAAcAHMAUgBHAEJYWVogAAAAAAAAb6IAADj1AAADkFhZWiAAAAAAAABimQAAt4UAABjaWFlaIAAAAAAAACSgAAAPhAAAts9YWVogAAAAAAAA9tYAAQAAAADTLXBhcmEAAAAAAAQAAAACZmYAAPKnAAANWQAAE9AAAApbAAAAAAAAAABtbHVjAAAAAAAAAAEAAAAMZW5VUwAAACAAAAAcAEcAbwBvAGcAbABlACAASQBuAGMALgAgADIAMAAxADb/2wBDAAUDBAQEAwUEBAQFBQUGBwwIBwcHBw8LCwkMEQ8SEhEPERETFhwXExQaFRERGCEYGh0dHx8fExciJCIeJBweHx7/2wBDAQUFBQcGBw4ICA4eFBEUHh4eHh4eHh4eHh4eHh4eHh4eHh4eHh4eHh4eHh4eHh4eHh4eHh4eHh4eHh4eHh4eHh7/wAARCAKeAp4DASIAAhEBAxEB/8QAHQABAAEEAwEAAAAAAAAAAAAAAAgFBgcJAQMEAv/EAFoQAQABAwMBBAIIEgYHBQcFAAABAgMEBQYRBwgSITETQRQXIlFWYXGTFRYYUlVXgZGSlJWhpcHR0tPhCTIzU7GyIyRCRVRiciVGgoPCNDU2RKLi5Gd2hOPx/8QAHAEBAAIDAQEBAAAAAAAAAAAAAAQFAgMGAQcI/8QAQBEBAAEDAQUFBgQEAwcFAAAAAAECAxEEBRIhMVETQWFxkQYUIlKBoTKxwdEjQpLwFaLhJFNUYrLS8RYzVXKT/9oADAMBAAIRAxEAPwCZYAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA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AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAP/Z'

interface QuoteItem {
  tipo: string
  descripcion: string
  cantidad: number
  precio_unitario: number
  subtotal: number
}

interface QuoteData {
  id: string
  cliente_nombre: string
  cliente_email?: string
  cliente_rut?: string
  marca: string
  modelo: string
  patente: string
  anio?: number
  subtotal: number
  iva: number
  total: number
  notas?: string
  vencimiento?: string
  items: QuoteItem[]
}

export const generateQuotePDF = async (quote: QuoteData): Promise<Buffer> => {
  const browser = await puppeteer.launch({
    args: ['--no-sandbox', '--disable-setuid-sandbox'],
    headless: true,
  })

  const page = await browser.newPage()

  const formatMoney = (n: number) =>
    `$${Math.round(n).toLocaleString('es-CL')}`

  const itemRows = quote.items.map(item => `
    <tr>
      <td>${item.descripcion}</td>
      <td style="text-align:center">${item.tipo === 'mano_de_obra' ? '🔧 M.O.' : '🔩 Repuesto'}</td>
      <td style="text-align:center">${item.cantidad}</td>
      <td style="text-align:right">${formatMoney(item.precio_unitario)}</td>
      <td style="text-align:right"><strong>${formatMoney(item.subtotal)}</strong></td>
    </tr>
  `).join('')

  const html = `<!DOCTYPE html>
<html lang="es">
<head>
  <meta charset="UTF-8">
  <style>
    * { box-sizing: border-box; margin: 0; padding: 0; }
    body { font-family: 'Helvetica Neue', Arial, sans-serif; color: #1a1a1a; padding: 48px; font-size: 13px; }

    /* Header */
    .header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 32px; padding-bottom: 24px; border-bottom: 3px solid #111; }
    .logo-container { display: flex; align-items: center; }
    .logo-img { height: 80px; width: auto; border-radius: 8px; }
    .quote-title { text-align: right; }
    .quote-title h1 { font-size: 28px; font-weight: 800; color: #111; letter-spacing: -1px; }
    .quote-title .quote-id { font-size: 13px; color: #666; margin-top: 4px; font-family: monospace; }
    .quote-title .quote-date { font-size: 12px; color: #888; margin-top: 2px; }

    /* Info grid */
    .info-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 24px; margin-bottom: 28px; }
    .info-block { background: #f8f9fa; border-radius: 10px; padding: 16px; }
    .info-block h3 { font-size: 10px; text-transform: uppercase; color: #999; letter-spacing: 1px; margin-bottom: 10px; }
    .info-block p { margin-bottom: 4px; font-size: 13px; }
    .info-block .value { font-weight: 600; color: #111; }

    /* Patente badge */
    .patente-badge { display: inline-block; background: #111; color: #fff; padding: 4px 12px; border-radius: 6px; font-family: monospace; font-size: 15px; font-weight: 700; letter-spacing: 2px; margin-top: 4px; }

    /* Table */
    table { width: 100%; border-collapse: collapse; margin-bottom: 24px; border-radius: 10px; overflow: hidden; }
    thead tr { background: #111; color: #fff; }
    thead th { padding: 12px 14px; text-align: left; font-weight: 600; font-size: 11px; text-transform: uppercase; letter-spacing: 0.5px; }
    tbody tr:nth-child(even) { background: #f8f9fa; }
    tbody tr:nth-child(odd) { background: #fff; }
    tbody td { padding: 10px 14px; border-bottom: 1px solid #eee; font-size: 13px; }

    /* Totals */
    .totals-wrapper { display: flex; justify-content: flex-end; margin-bottom: 24px; }
    .totals { min-width: 260px; background: #f8f9fa; border-radius: 10px; padding: 16px; }
    .totals table { margin: 0; border-radius: 0; overflow: visible; }
    .totals td { padding: 6px 0; border: none; background: transparent; }
    .totals td:last-child { text-align: right; font-weight: 500; }
    .total-final td { font-size: 16px; font-weight: 800; color: #111; border-top: 2px solid #111; padding-top: 10px !important; }

    /* Notes */
    .notes { background: #fffbeb; border-left: 4px solid #f59e0b; border-radius: 0 8px 8px 0; padding: 14px 16px; margin-bottom: 24px; }
    .notes h3 { font-size: 10px; text-transform: uppercase; color: #92400e; letter-spacing: 1px; margin-bottom: 6px; }
    .notes p { font-size: 13px; color: #78350f; }

    /* Footer */
    .footer { margin-top: 40px; padding-top: 16px; border-top: 1px solid #eee; display: flex; justify-content: space-between; align-items: flex-end; }
    .footer-left { font-size: 11px; color: #999; }
    .footer-right { font-size: 11px; color: #999; text-align: right; }
    .valid-badge { display: inline-block; background: #d1fae5; color: #065f46; padding: 4px 10px; border-radius: 20px; font-size: 11px; font-weight: 600; margin-top: 4px; }
  </style>
</head>
<body>
  <div class="header">
    <div class="logo-container">
      <img class="logo-img" src="data:image/png;base64,${LOGO_BASE64}" alt="Logo" />
    </div>
    <div class="quote-title">
      <h1>Cotización</h1>
      <p class="quote-id">#${quote.id.slice(0, 8).toUpperCase()}</p>
      <p class="quote-date">Emitida el ${new Date().toLocaleDateString('es-CL', { day: '2-digit', month: 'long', year: 'numeric' })}</p>
    </div>
  </div>

  <div class="info-grid">
    <div class="info-block">
      <h3>Cliente</h3>
      <p class="value">${quote.cliente_nombre}</p>
      ${quote.cliente_rut ? `<p style="color:#666">RUT: ${quote.cliente_rut}</p>` : ''}
      ${quote.cliente_email ? `<p style="color:#666">${quote.cliente_email}</p>` : ''}
    </div>
    <div class="info-block">
      <h3>Vehículo</h3>
      <p class="value">${quote.marca} ${quote.modelo} ${quote.anio ?? ''}</p>
      <div class="patente-badge">${quote.patente}</div>
    </div>
  </div>

  <table>
    <thead>
      <tr>
        <th>Descripción</th>
        <th style="text-align:center">Tipo</th>
        <th style="text-align:center">Cant.</th>
        <th style="text-align:right">Precio unit.</th>
        <th style="text-align:right">Subtotal</th>
      </tr>
    </thead>
    <tbody>${itemRows}</tbody>
  </table>

  <div class="totals-wrapper">
    <div class="totals">
      <table>
        <tr><td style="color:#666">Subtotal</td><td>${formatMoney(quote.subtotal)}</td></tr>
        <tr><td style="color:#666">IVA (19%)</td><td>${formatMoney(quote.iva)}</td></tr>
        <tr class="total-final"><td>Total</td><td>${formatMoney(quote.total)}</td></tr>
      </table>
    </div>
  </div>

  ${quote.notas ? `
  <div class="notes">
    <h3>Observaciones</h3>
    <p>${quote.notas}</p>
  </div>` : ''}

  <div class="footer">
    <div class="footer-left">
      <p>Esta cotización es válida hasta la fecha indicada.</p>
      <p>Precios incluyen IVA (19%).</p>
    </div>
    <div class="footer-right">
      ${quote.vencimiento ? `<p>Válida hasta</p><span class="valid-badge">${new Date(quote.vencimiento).toLocaleDateString('es-CL')}</span>` : ''}
    </div>
  </div>
</body>
</html>`

  await page.setContent(html, { waitUntil: 'networkidle0' })
  const pdf = await page.pdf({
    format: 'A4',
    printBackground: true,
    margin: { top: '0', right: '0', bottom: '0', left: '0' },
  })

  await browser.close()
  return Buffer.from(pdf)
}