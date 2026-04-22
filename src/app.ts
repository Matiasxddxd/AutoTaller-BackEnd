import 'dotenv/config';
import express from 'express';
import { createServer } from 'http';
import { Server as SocketServer } from 'socket.io';
import cors from 'cors';
import helmet from 'helmet';
import rateLimit from 'express-rate-limit';

import { authRouter }      from './modules/auth/auth.routes';
import { clientsRouter }   from './modules/clients/clients.routes';
import { vehiclesRouter }  from './modules/vehicles/vehicles.routes';
import { quotesRouter }    from './modules/quotes/quotes.routes';
import { ordersRouter, setSocketIO } from './modules/orders/orders.routes';
import { repuestosRouter } from './modules/repuestos/repuestos.routes';
import { adminRouter }     from './modules/admin/admin.routes';
import { authMiddleware } from './middleware/auth';
import { errorHandler }  from './middleware/errorHandler';

const app = express();
const httpServer = createServer(app);

// ── WebSocket ──────────────────────────────────────────────────────────────────
export const io = new SocketServer(httpServer, {
  cors: {
    origin: '*', // En producción, restringir a CLIENT_URL
    credentials: true,
  },
});

setSocketIO(io); // Inyectar en el módulo de órdenes

io.on('connection', (socket) => {
  console.log(`🔌 Cliente conectado: ${socket.id}`);

  // Unirse a sala de una orden específica
  socket.on('join:order', (orderId: string) => {
    socket.join(`order:${orderId}`);
    console.log(`   → Unido a order:${orderId}`);
  });

  socket.on('disconnect', () => {
    console.log(`🔌 Cliente desconectado: ${socket.id}`);
  });
});

// ── Middlewares globales ───────────────────────────────────────────────────────
app.use(helmet());
app.use(cors({
  origin: (origin, callback) => {
    // Permitir: sin origin (Electron/mobile), CLIENT_URL, localhost
    const allowed = [
      process.env.CLIENT_URL,
      'http://localhost:5173',
      'http://localhost:3000',
    ].filter(Boolean)

    if (!origin || allowed.includes(origin)) {
      callback(null, true)
    } else {
      callback(null, true) // En producción aceptar todo — el JWT protege las rutas
    }
  },
  credentials: true,
}));
app.use(express.json({ limit: '5mb' }));
app.use(express.urlencoded({ extended: true }));

// Rate limiting
app.use(rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 100,
  message: { error: 'Demasiadas solicitudes, intenta más tarde.' },
}));
// ── Rutas ──────────────────────────────────────────────────────────────────────
app.use('/api/auth',      authRouter);                        // Pública
app.use('/api/clients',  authMiddleware, clientsRouter);     // Protegida
app.use('/api/vehicles', authMiddleware, vehiclesRouter);    // Protegida
app.use('/api/quotes',   authMiddleware, quotesRouter);      // Protegida
app.use('/api/orders',   authMiddleware, ordersRouter);      // Protegida
app.use('/api/repuestos',authMiddleware, repuestosRouter);   // Protegida
app.use('/api/admin',    authMiddleware, adminRouter);       // Solo admin

// Healthcheck
app.get('/health', (_req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// ── Error handler (siempre al final) ──────────────────────────────────────────
app.use(errorHandler);

export default httpServer;
