import puppeteer from 'puppeteer'

const LOGO_BASE64 = '/9j/4AAQSkZJRgABAQAAAQABAAD/4gHYSUNDX1BST0ZJTEUAAQEAAAHIAAAAAAQwAABtbnRyUkdCIFhZWiAH4AABAAEAAAAAAABhY3NwAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAQAA9tYAAQAAAADTLQAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAlkZXNjAAAA8AAAACRyWFlaAAABFAAAABRnWFlaAAABKAAAABRiWFlaAAABPAAAABR3dHB0AAABUAAAABRyVFJDAAABZAAAAChnVFJDAAABZAAAAChiVFJDAAABZAAAAChjcHJ0AAABjAAAADxtbHVjAAAAAAAAAAEAAAAMZW5VUwAAAAgAAAAcAHMAUgBHAEJYWVogAAAAAAAAb6IAADj1AAADkFhZWiAAAAAAAABimQAAt4UAABjaWFlaIAAAAAAAACSgAAAPhAAAts9YWVogAAAAAAAA9tYAAQAAAADTLXBhcmEAAAAAAAQAAAACZmYAAPKnAAANWQAAE9AAAApbAAAAAAAAAABtbHVjAAAAAAAAAAEAAAAMZW5VUwAAACAAAAAcAEcAbwBvAGcAbABlACAASQBuAGMALgAgADIAMAAxADb/2wBDAAUDBAQEAwUEBAQFBQUGBwwIBwcHBw8LCwkMEQ8SEhEPERETFhwXExQaFRERGCEYGh0dHx8fExciJCIeJBweHx7/2wBDAQUFBQcGBw4ICA4eFBEUHh4eHh4eHh4eHh4eHh4eHh4eHh4eHh4eHh4eHh4eHh4eHh4eHh4eHh4eHh4eHh4eHh7/wAARCAKgAqUDASIAAhEBAxEB/8QAHQABAAAHAQEAAAAAAAAAAAAAAAEEBQYHCAkDAv/EAFgQAQABAwMBAwUIDQkGBAMJAAABAgMEBQYRBxIhMQgTFEFRFyJhcYGRktIVGCMyVFZXlaGlsdHTFkJSU1VilMHUCUOCk6KyJDM0wjV04SVYY3KDhKSmw//EABwBAQACAwEBAQAAAAAAAAAAAAAEBQIDBgEHCP/EAD4RAQABAwEEBwQIBAYDAQAAAAABAgMRBAUSITETQVFhcYGRBiKhsRQyQlJTwdHwFZLC4SMzYnKi8SRDgoP/2gAMAwEAAhEDEQA/ANMgAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA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AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA//2Q=='

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