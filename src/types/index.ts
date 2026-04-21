// ─── Roles ───────────────────────────────────────────────────────────────────
export type UserRole = 'admin' | 'mecanico' | 'cliente';

// ─── Estados ─────────────────────────────────────────────────────────────────
export type OrderStatus     = 'pendiente' | 'en_proceso' | 'terminado' | 'entregado';
export type QuoteStatus     = 'borrador'  | 'enviada' | 'aprobada' | 'rechazada' | 'vencida';
export type ItemType        = 'repuesto'  | 'mano_de_obra' | 'otro';
export type NotifChannel    = 'whatsapp'  | 'email' | 'sms';
export type OrderPriority   = 'baja'      | 'normal' | 'alta' | 'urgente';

// ─── Entidades principales ───────────────────────────────────────────────────
export interface User {
  id: string;
  email: string;
  role: UserRole;
  activo: boolean;
  created_at: Date;
}

export interface Cliente {
  id: string;
  user_id?: string;
  nombre: string;
  telefono?: string;
  email?: string;
  rut?: string;
  direccion?: string;
  notas?: string;
  created_at: Date;
}

export interface Vehiculo {
  id: string;
  cliente_id: string;
  marca: string;
  modelo: string;
  anio?: number;
  patente: string;
  vin?: string;
  color?: string;
  kilometraje?: number;
  combustible: string;
  notas?: string;
}

export interface Repuesto {
  id: string;
  nombre: string;
  codigo_sku?: string;
  precio_venta: number;
  precio_costo: number;
  stock: number;
  stock_minimo: number;
  unidad: string;
}

export interface CotizacionItem {
  id?: string;
  repuesto_id?: string;
  tipo: ItemType;
  descripcion: string;
  cantidad: number;
  precio_unitario: number;
}

export interface Cotizacion {
  id: string;
  cliente_id: string;
  vehiculo_id: string;
  estado: QuoteStatus;
  subtotal: number;
  iva: number;
  total: number;
  notas?: string;
  vencimiento?: Date;
  pdf_url?: string;
  items?: CotizacionItem[];
}

export interface OrdenTrabajo {
  id: string;
  cotizacion_id?: string;
  vehiculo_id: string;
  mecanico_id?: string;
  sucursal_id?: string;
  estado: OrderStatus;
  prioridad: OrderPriority;
  diagnostico?: string;
  notas_internas?: string;
  kilometraje_ingreso?: number;
  fecha_ingreso: Date;
  fecha_estimada?: Date;
  fecha_entrega?: Date;
}

// ─── JWT Payload ─────────────────────────────────────────────────────────────
export interface JwtPayload {
  userId: string;
  email: string;
  role: UserRole;
}

// ─── Express Request extendido ───────────────────────────────────────────────
declare global {
  namespace Express {
    interface Request {
      user?: JwtPayload;
    }
  }
}
