import puppeteer from 'puppeteer';

interface QuoteItem {
  tipo: string;
  descripcion: string;
  cantidad: number;
  precio_unitario: number;
  subtotal: number;
}

interface QuoteData {
  id: string;
  cliente_nombre: string;
  cliente_email?: string;
  cliente_rut?: string;
  marca: string;
  modelo: string;
  patente: string;
  anio?: number;
  subtotal: number;
  iva: number;
  total: number;
  notas?: string;
  vencimiento?: string;
  items: QuoteItem[];
}

export const generateQuotePDF = async (quote: QuoteData): Promise<Buffer> => {
  const browser = await puppeteer.launch({
    args: ['--no-sandbox', '--disable-setuid-sandbox'],
    headless: true,
  });

  const page = await browser.newPage();

  const formatMoney = (n: number) =>
    `$${Math.round(n).toLocaleString('es-CL')}`;

  const itemRows = quote.items.map(item => `
    <tr>
      <td>${item.descripcion}</td>
      <td style="text-align:center">${item.tipo === 'mano_de_obra' ? '🔧 M.O.' : '🔩 Repuesto'}</td>
      <td style="text-align:center">${item.cantidad}</td>
      <td style="text-align:right">${formatMoney(item.precio_unitario)}</td>
      <td style="text-align:right"><strong>${formatMoney(item.subtotal)}</strong></td>
    </tr>
  `).join('');

  const html = `<!DOCTYPE html>
<html lang="es">
<head>
  <meta charset="UTF-8">
  <style>
    * { box-sizing: border-box; margin: 0; padding: 0; }
    body { font-family: 'Helvetica Neue', Arial, sans-serif; color: #1a1a1a; padding: 48px; font-size: 13px; }
    .header { display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 36px; }
    .logo { font-size: 22px; font-weight: 700; color: #1d4ed8; }
    .logo span { color: #64748b; font-weight: 400; font-size: 13px; display: block; }
    .quote-title { text-align: right; }
    .quote-title h1 { font-size: 24px; color: #1d4ed8; }
    .quote-title p { color: #64748b; margin-top: 4px; }
    .divider { border: none; border-top: 2px solid #e2e8f0; margin: 20px 0; }
    .info-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 24px; margin-bottom: 28px; }
    .info-block h3 { font-size: 11px; text-transform: uppercase; color: #94a3b8; letter-spacing: .8px; margin-bottom: 8px; }
    .info-block p { margin-bottom: 4px; }
    table { width: 100%; border-collapse: collapse; margin-bottom: 24px; }
    thead tr { background: #1d4ed8; color: white; }
    thead th { padding: 10px 12px; text-align: left; font-weight: 500; font-size: 12px; }
    tbody tr:nth-child(even) { background: #f8fafc; }
    tbody td { padding: 9px 12px; border-bottom: 1px solid #e2e8f0; }
    .totals { margin-left: auto; width: 260px; }
    .totals table { margin: 0; }
    .totals td { padding: 6px 0; }
    .totals td:last-child { text-align: right; font-weight: 500; }
    .total-final { font-size: 16px; color: #1d4ed8; border-top: 2px solid #1d4ed8; padding-top: 8px !important; }
    .footer { margin-top: 48px; padding-top: 16px; border-top: 1px solid #e2e8f0; color: #94a3b8; font-size: 11px; text-align: center; }
    .badge { display: inline-block; background: #dbeafe; color: #1d4ed8; padding: 3px 10px; border-radius: 20px; font-size: 11px; font-weight: 600; }
  </style>
</head>
<body>
  <div class="header">
    <div class="logo">AutoTaller<span>Sistema de Gestión</span></div>
    <div class="quote-title">
      <h1>Cotización</h1>
      <p>#${quote.id.slice(0, 8).toUpperCase()}</p>
      <p>Fecha: ${new Date().toLocaleDateString('es-CL')}</p>
      ${quote.vencimiento ? `<p>Válida hasta: ${new Date(quote.vencimiento).toLocaleDateString('es-CL')}</p>` : ''}
    </div>
  </div>

  <hr class="divider">

  <div class="info-grid">
    <div class="info-block">
      <h3>Cliente</h3>
      <p><strong>${quote.cliente_nombre}</strong></p>
      ${quote.cliente_rut ? `<p>RUT: ${quote.cliente_rut}</p>` : ''}
      ${quote.cliente_email ? `<p>${quote.cliente_email}</p>` : ''}
    </div>
    <div class="info-block">
      <h3>Vehículo</h3>
      <p><strong>${quote.marca} ${quote.modelo} ${quote.anio || ''}</strong></p>
      <p>Patente: <span class="badge">${quote.patente}</span></p>
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

  <div class="totals">
    <table>
      <tr><td>Subtotal</td><td>${formatMoney(quote.subtotal)}</td></tr>
      <tr><td>IVA (19%)</td><td>${formatMoney(quote.iva)}</td></tr>
      <tr class="total-final"><td><strong>Total</strong></td><td><strong>${formatMoney(quote.total)}</strong></td></tr>
    </table>
  </div>

  ${quote.notas ? `<div style="margin-top:24px;padding:16px;background:#f8fafc;border-radius:8px;"><h3 style="font-size:11px;text-transform:uppercase;color:#94a3b8;margin-bottom:8px;">Observaciones</h3><p>${quote.notas}</p></div>` : ''}

  <div class="footer">
    <p>Esta cotización es válida hasta la fecha indicada. Precios incluyen IVA.</p>
    <p>Ante cualquier consulta, contáctenos por WhatsApp o email.</p>
  </div>
</body>
</html>`;

  await page.setContent(html, { waitUntil: 'networkidle0' });
  const pdf = await page.pdf({
    format: 'A4',
    printBackground: true,
    margin: { top: '0', right: '0', bottom: '0', left: '0' },
  });

  await browser.close();
  return Buffer.from(pdf);
};
