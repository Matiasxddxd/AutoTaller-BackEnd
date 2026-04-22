import { Router } from 'express';
import { body } from 'express-validator';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { db } from '../../config/db';
import { validateRequest, AppError } from '../../middleware/errorHandler';
import { authMiddleware } from '../../middleware/auth';

export const authRouter = Router();

// ── POST /api/auth/login ──────────────────────────────────────────────────────
authRouter.post(
  '/login',
  [
    body('email').isEmail().withMessage('Email inválido'),,
    body('password').isLength({ min: 6 }).withMessage('Contraseña mínimo 6 caracteres'),
    validateRequest,
  ],
  async (req, res, next) => {
    try {
      const { email, password } = req.body;

      const { rows } = await db.query(
        'SELECT * FROM users WHERE email = $1 AND activo = TRUE',
        [email]
      );
      const user = rows[0];

      if (!user || !(await bcrypt.compare(password, user.password_hash))) {
        throw new AppError('Credenciales incorrectas', 401);
      }

      const token = jwt.sign(
        { userId: user.id, email: user.email, role: user.role },
        process.env.JWT_SECRET as string,
        { expiresIn: '7d' } as any
      );

      res.json({
        token,
        user: { id: user.id, email: user.email, role: user.role },
      });
    } catch (err) {
      next(err);
    }
  }
);

// ── POST /api/auth/register ───────────────────────────────────────────────────
// Solo admins pueden crear usuarios (excepto primer registro)
authRouter.post(
  '/register',
  authMiddleware,
  [
    body('email').isEmail().normalizeEmail(),
    body('password').isLength({ min: 8 }).withMessage('Mínimo 8 caracteres'),
    body('role').isIn(['admin', 'mecanico', 'cliente']),
    validateRequest,
  ],
  async (req, res, next) => {
    try {
      if (req.user?.role !== 'admin') {
        throw new AppError('Solo los administradores pueden registrar usuarios', 403);
      }

      const { email, password, role } = req.body;
      const hash = await bcrypt.hash(password, 12);

      const { rows } = await db.query(
        `INSERT INTO users (email, password_hash, role)
         VALUES ($1, $2, $3) RETURNING id, email, role`,
        [email, hash, role]
      );

      res.status(201).json({ user: rows[0] });
    } catch (err) {
      next(err);
    }
  }
);

// ── GET /api/auth/me ──────────────────────────────────────────────────────────
authRouter.get('/me', authMiddleware, async (req, res, next) => {
  try {
    const { rows } = await db.query(
      'SELECT id, email, role, created_at FROM users WHERE id = $1',
      [req.user!.userId]
    );
    if (!rows[0]) throw new AppError('Usuario no encontrado', 404);
    res.json(rows[0]);
  } catch (err) {
    next(err);
  }
});
