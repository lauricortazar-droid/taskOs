export interface Contact {
  id: string;
  nombre: string;
  telefono: string; // e.g. "5215512345678" or "+52 55 1234 5678" or "19999011852"
  rol?: string; // e.g. "Coordinación", "Líder Zona", "Proveedor"
  dominio?: string; // e.g. "Laura", "FGDLL", "Diseño", "Lonas", "Finanzas"
  etiquetas?: string[]; // Array of tag names or IDs
  email?: string;
  empresa?: string;
  notas?: string;
}

export interface WhatsAppMessageItem {
  id: string;
  destinatario: string;
  telefono?: string;
  mensaje: string;
  tareaId?: number;
  enviado?: boolean;
}

export type TagCategory = "prioridad" | "zona" | "area";

export interface TagItem {
  id: string;
  nombre: string;
  categoria: TagCategory;
  color: string; // "rose" | "amber" | "blue" | "purple" | "cyan" | "emerald" | "orange" | "violet" | "stone"
}

export interface TaskItem {
  id: number;
  solicitante: string;
  tarea: string;
  estado: "Pendiente" | "En Proceso" | "Completado";
  fechaIngreso: string;
  dominio?: string;
  imagenReferencia?: string; // Base64 data URL
  contacto?: {
    nombre: string;
    telefono?: string;
  };
  etiquetas?: string[]; // Array of tag names or IDs
  notas?: string; // Sub-notas u observaciones persistentes de la tarea
  fechaLimite?: string; // YYYY-MM-DD fecha límite / deadline de entrega
}

export interface TaskOSResponse {
  mensajeParaEnviar?: string | null;
  mensajesMultiples?: Array<{
    destinatario: string;
    telefono?: string;
    mensaje: string;
  }>;
  tasks: TaskItem[];
  tareaEsencialId?: number | null;
  tareasSecundariasIds?: number[];
  activarPomodoro?: boolean;
  pomodoroTarea?: string | null;
  pomodoroMinutos?: number;
  resumenAccion?: string;
  dominioDetectado?: string;
}

export type DomainType =
  | "Todos"
  | "FGDLL"
  | "Universidad"
  | "Tecnología"
  | "Technology"
  | "Diseño"
  | "Profesional"
  | "Personal"
  | "Laura"
  | "Lonas"
  | "Finanzas";

export type StatusFilter = "Todos" | "Pendiente" | "En Proceso" | "Completado" | "Activas";

export interface SyncStatus {
  email: string;
  isSyncing: boolean;
  lastSyncedAt: string | null;
  error?: string | null;
  isConnected?: boolean;
  deviceType?: "mobile" | "desktop";
}

export interface CloudSyncPayload {
  email: string;
  tasks: TaskItem[];
  contacts?: Contact[];
  tags?: TagItem[];
  esencialTaskId?: number | null;
  secundariasTaskIds?: number[];
  deviceName?: string;
  updatedAt?: string;
}

/* =========================================================
   MUSIC & PLAYLIST PLAYER TYPES (Spotify, YouTube Music, Google Drive)
========================================================= */
export type MusicPlatform = "spotify" | "youtube" | "gdrive";

export interface WorkPlaylist {
  id: string;
  title: string;
  platform: MusicPlatform;
  url: string;
  embedUrl: string;
  description: string;
  isCustom?: boolean;
}

/* =========================================================
   LONAS OS TYPES (Gran Formato, Cotizaciones, Pedidos, Producción, Cobros)
========================================================= */
export type LonasStatus =
  | "Cotización"
  | "Diseño"
  | "Esperando aprobación"
  | "Aprobado"
  | "Producción"
  | "Listo"
  | "Entregado";

export interface LonasOrderItem {
  id: string;
  descripcion: string; // e.g. "Lona Front 13oz", "Vinil brillante", "Estructura banner"
  ancho: number; // metros
  alto: number; // metros
  cantidad: number;
  m2: number; // ancho * alto * cantidad
  costoPorM2: number;
  precioVentaPorM2: number;
  costoCalculado: number;
  precioCalculado: number;
  precioFinal: number; // editable
  costoFinal: number;
  observaciones?: string;
}

export interface LonasPayment {
  id: string;
  fecha: string;
  monto: number;
  metodo: "Efectivo" | "Transferencia" | "Depósito" | "Tarjeta";
  referencia?: string;
  nota?: string;
}

export interface LonasOrder {
  id: string;
  folio: number; // e.g. 101, 102...
  cliente: {
    nombre: string;
    telefono: string;
    empresa?: string;
    email?: string;
  };
  items: LonasOrderItem[];
  subtotal: number;
  descuento: number;
  total: number;
  anticipo: number;
  pagos: LonasPayment[];
  saldo: number; // total - suma de pagos
  estado: LonasStatus;
  fechaIngreso: string;
  fechaEntregaEstimada: string;
  comprobanteUrl?: string;
  notasInternas?: string;
  notasCliente?: string;
  entregadoAt?: string;
}

/* =========================================================
   MI SALUD FINANCIERA TYPES (Flujo de Efectivo, Disponible Real, Deudas)
========================================================= */
export type AccountType = "Efectivo" | "Cuenta Bancaria" | "Tarjeta Débito" | "Billetera Digital" | "Ahorro";

export interface FinancialAccount {
  id: string;
  nombre: string;
  tipo: AccountType;
  saldoActual: number;
  notas?: string;
}

export interface ExpectedIncome {
  id: string;
  concepto: string;
  montoEsperado: number;
  fechaEsperada: string;
  montoRecibido: number;
  estado: "Esperado" | "Parcial" | "Recibido" | "Atrasado" | "Cancelado";
  categoria: string;
  cuentaDestinoId?: string;
  notas?: string;
}

export interface FinancialDebtPayment {
  id: string;
  fecha: string;
  monto: number;
  cuentaOrigenId: string;
  nota?: string;
}

export interface FinancialDebt {
  id: string;
  acreedor: string;
  concepto: string;
  montoOriginal: number;
  saldoActual: number;
  vencimiento: string;
  pagoMinimo: number;
  prioridad: "Alta" | "Media" | "Baja";
  estado: "Activa" | "Liquidada";
  historialPagos: FinancialDebtPayment[];
  notas?: string;
}

export interface FinancialCommitment {
  id: string;
  concepto: string;
  monto: number;
  fechaVencimiento: string;
  categoria: string;
  esRecurrente?: boolean;
  periodicidad?: "Semanal" | "Quincenal" | "Mensual" | "Anual";
  pagado?: boolean;
}

export interface FinancialAllocation {
  id: string;
  concepto: string;
  montoApartado: number;
  estado: "Apartado" | "Usado" | "Liberado";
  compromisoId?: string;
}

export interface EcosystemSyncPayload {
  email: string;
  tasks: TaskItem[];
  lonasOrders: LonasOrder[];
  financialAccounts: FinancialAccount[];
  financialIncomes: ExpectedIncome[];
  financialDebts: FinancialDebt[];
  financialCommitments: FinancialCommitment[];
  financialAllocations: FinancialAllocation[];
  updatedAt: string;
}


