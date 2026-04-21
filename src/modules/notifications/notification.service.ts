import twilio from 'twilio';

const client = twilio(
  process.env.TWILIO_ACCOUNT_SID,
  process.env.TWILIO_AUTH_TOKEN
);

// Mensajes predefinidos por tipo de evento
export const MENSAJES = {
  vehiculo_listo: (nombre: string, patente: string) =>
    `🔧 Hola ${nombre}, tu vehículo *${patente}* está listo para retiro.\n` +
    `Por favor pasa por el taller en horario de atención.\n` +
    `¡Gracias por confiar en nosotros!`,

  cotizacion_enviada: (nombre: string, total: number) =>
    `📋 Hola ${nombre}, te enviamos una cotización por $${total.toLocaleString('es-CL')}.\n` +
    `Responde este mensaje para aprobarla o consultarnos.`,

  orden_creada: (nombre: string, patente: string) =>
    `✅ Hola ${nombre}, recibimos tu vehículo *${patente}*.\n` +
    `Te avisaremos cuando esté listo. ¡Gracias!`,

  recordatorio_retiro: (nombre: string, patente: string) =>
    `⏰ Hola ${nombre}, recuerda que tu vehículo *${patente}* ` +
    `lleva más de 24h listo para retiro. ¡Te esperamos!`,
};

export const notificationService = {
  async sendWhatsApp(phone: string, message: string): Promise<void> {
    if (!process.env.TWILIO_ACCOUNT_SID || process.env.NODE_ENV === 'test') {
      console.log(`[WhatsApp simulado] → ${phone}: ${message.slice(0, 60)}...`);
      return;
    }

    try {
      await client.messages.create({
        from: `whatsapp:${process.env.TWILIO_WHATSAPP_NUMBER}`,
        to: `whatsapp:${phone}`,
        body: message,
      });
      console.log(`✅ WhatsApp enviado a ${phone}`);
    } catch (err: any) {
      // Loguear pero NO relanzar — las notificaciones no deben bloquear el flujo
      console.error(`❌ WhatsApp falló para ${phone}:`, err.message);
    }
  },

  async logNotification(
    db: any,
    { orden_id, cliente_id, canal, tipo, mensaje, enviada, error }: {
      orden_id?: string; cliente_id?: string; canal: string;
      tipo: string; mensaje: string; enviada: boolean; error?: string;
    }
  ): Promise<void> {
    await db.query(
      `INSERT INTO notificaciones
         (orden_id, cliente_id, canal, tipo, mensaje, enviada, error, enviada_at)
       VALUES ($1,$2,$3,$4,$5,$6,$7, CASE WHEN $6 THEN NOW() ELSE NULL END)`,
      [orden_id, cliente_id, canal, tipo, mensaje, enviada, error]
    );
  },
};
