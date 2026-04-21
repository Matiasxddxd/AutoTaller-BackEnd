import { Request, Response, NextFunction } from 'express';
import { validationResult } from 'express-validator';

// ─── Clase de error con código HTTP ──────────────────────────────────────────
export class AppError extends Error {
  constructor(
    public message: string,
    public statusCode: number = 500
  ) {
    super(message);
    this.name = 'AppError';
  }
}

// ─── Validar resultado de express-validator ───────────────────────────────────
export const validateRequest = (
  req: Request, res: Response, next: NextFunction
): void => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    res.status(422).json({
      error: 'Datos inválidos',
      details: errors.array().map(e => ({
        field: e.type === 'field' ? e.path : 'general',
        message: e.msg,
      })),
    });
    return;
  }
  next();
};

// ─── Handler global de errores ────────────────────────────────────────────────
export const errorHandler = (
  err: Error, req: Request, res: Response, _next: NextFunction
): void => {
  console.error(`[${new Date().toISOString()}] ${req.method} ${req.path} →`, err.message);

  if (err instanceof AppError) {
    res.status(err.statusCode).json({ error: err.message });
    return;
  }

  // Error de constraint de PostgreSQL (ej: UNIQUE violation)
  if ((err as any).code === '23505') {
    res.status(409).json({ error: 'Ya existe un registro con esos datos' });
    return;
  }

  // Error genérico — no exponer detalles en producción
  res.status(500).json({
    error: process.env.NODE_ENV === 'development'
      ? err.message
      : 'Error interno del servidor',
  });
};
