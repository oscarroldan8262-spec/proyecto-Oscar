export type NavSection =
  | 'dashboard'
  | 'bitacoras'
  | 'historial'
  | 'reportes'
  | 'configuracion';

export type EventoCategoria =
  | 'ANOMALÍA'
  | 'PENDIENTE'
  | 'AJUSTE'
  | 'MANTENIMIENTO'
  | 'PRODUCCIÓN';

export type EventoEstado = 'Abierto' | 'En seguimiento' | 'Cerrado';

export type IncidenciaEstado = 'Pendiente' | 'En proceso' | 'Resuelto';

export type MaquinaEstadoTipo = 'Operando' | 'Detenida' | 'Mantenimiento';

export type BitacoraEstado = 'borrador' | 'guardada' | 'cerrada';

export type FirmaTipo = 'saliente' | 'entrante';

export interface UserPublicProfile {
  uid: string;
  displayName: string;
  role: 'supervisor' | 'admin';
  area: string;
  createdAt?: unknown;
  updatedAt?: unknown;
}

export interface Supervisor {
  id: string;
  ownerId: string;
  nombre: string;
  area: string;
  turnoDefault: string;
  activo: boolean;
  createdAt?: unknown;
  updatedAt?: unknown;
}

export interface TurnoConfig {
  id: string;
  ownerId: string;
  codigo: string;
  nombre: string;
  horario: string;
  activo: boolean;
  createdAt?: unknown;
  updatedAt?: unknown;
}

export interface MaquinaCatalogo {
  id: string;
  ownerId: string;
  codigo: string;
  area: string;
  estadoDefault: MaquinaEstadoTipo;
  activo: boolean;
  createdAt?: unknown;
  updatedAt?: unknown;
}

export interface Bitacora {
  id: string;
  ownerId: string;
  folio: string;
  areaLinea: string;
  fecha: string; // YYYY-MM-DD
  turnoSaliente: string;
  turnoEntrante: string;
  supervisorSaliente: string;
  supervisorEntrante: string;
  notas: string;
  estado: BitacoraEstado;
  equiposLimpios: boolean;
  herramientasCompletas: boolean;
  materialAbastecido: boolean;
  sinRiesgosSeguridad: boolean;
  totalProduccion: number;
  cumplimientoPromedio: number;
  totalIncidencias: number;
  incidenciasPendientes: number;
  maquinasDetenidas: number;
  createdAt?: unknown;
  updatedAt?: unknown;
}

export interface Evento {
  id: string;
  ownerId: string;
  bitacoraId: string;
  hora: string;
  fecha: string;
  categoria: EventoCategoria;
  titulo: string;
  descripcion: string;
  responsable: string;
  estado: EventoEstado;
  createdAt?: unknown;
  updatedAt?: unknown;
}

export interface Incidencia {
  id: string;
  ownerId: string;
  bitacoraId: string;
  hora: string;
  descripcion: string;
  maquina: string;
  estado: IncidenciaEstado;
  createdAt?: unknown;
  updatedAt?: unknown;
}

export interface ProduccionItem {
  id: string;
  ownerId: string;
  bitacoraId: string;
  producto: string;
  meta: number;
  producido: number;
  cumplimiento: number;
  createdAt?: unknown;
  updatedAt?: unknown;
}

export interface MaquinaEstado {
  id: string;
  ownerId: string;
  bitacoraId: string;
  nombre: string;
  estado: MaquinaEstadoTipo;
  createdAt?: unknown;
  updatedAt?: unknown;
}

export interface Firma {
  id: string;
  ownerId: string;
  bitacoraId: string;
  tipo: FirmaTipo;
  supervisor: string;
  dataUrl: string;
  createdAt?: unknown;
  updatedAt?: unknown;
}

export interface FullBitacoraSnapshot {
  bitacora: Bitacora;
  eventos: Evento[];
  incidencias: Incidencia[];
  produccion: ProduccionItem[];
  maquinas: MaquinaEstado[];
  firmas: Firma[];
}

export const FIELD_LIMITS = {
  areaLinea: 120,
  folio: 40,
  supervisorNombre: 120,
  turnoLabel: 80,
  notas: 4000,
  eventoTitulo: 160,
  eventoDescripcion: 1000,
  incidenciaDescripcion: 500,
  maquinaNombre: 80,
  producto: 140,
  firmaDataUrl: 150000,
} as const;

export const EVENTO_CATEGORIAS: EventoCategoria[] = [
  'ANOMALÍA',
  'PENDIENTE',
  'AJUSTE',
  'MANTENIMIENTO',
  'PRODUCCIÓN',
];

export const EVENTO_ESTADOS: EventoEstado[] = [
  'Abierto',
  'En seguimiento',
  'Cerrado',
];

export const INCIDENCIA_ESTADOS: IncidenciaEstado[] = [
  'Pendiente',
  'En proceso',
  'Resuelto',
];

export const MAQUINA_ESTADOS: MaquinaEstadoTipo[] = [
  'Operando',
  'Detenida',
  'Mantenimiento',
];

export const TURNO_MATUTINO = 'Matutino (06:00 - 14:00)';
export const TURNO_VESPERTINO = 'Vespertino (14:00 - 22:00)';
export const TURNO_NOCTURNO = 'Nocturno (22:00 - 06:00)';
