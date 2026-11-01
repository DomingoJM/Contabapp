import type { TransaccionReciente } from '../types';

const API_BASE_URL = (
  import.meta.env.VITE_API_URL || 'https://comunidadesinteligentes.onrender.com/api/v1'
).replace(/\/+$/, '');

export type RolEmpresa = 'CONTADOR' | 'AUXILIAR_CONTABLE' | 'ADMINISTRADOR' | 'EMPRESARIO';

export interface EmpresaAcceso {
  organizacion_id: string;
  organizacion: string;
  nit: string;
  rol: RolEmpresa;
  rol_nombre: string;
  permisos: Record<string, string[]>;
}

export interface PerfilUsuario {
  id: number;
  username: string;
  email: string;
  nombre: string;
  es_admin_plataforma: boolean;
  empresas: EmpresaAcceso[];
}

export interface MembresiaUsuario {
  id: number;
  usuario: number;
  usuario_username: string;
  usuario_email: string;
  organizacion: string;
  organizacion_nombre: string;
  rol: RolEmpresa;
  rol_nombre: string;
  activo: boolean;
  creado_en: string;
}

export interface ResumenFinancieroApi {
  resumen_financiero: {
    total_ingresos: number;
    total_gastos: number;
    total_costos: number;
    excedente_neto: number;
    saldo_disponible_caja_bancos: number;
  };
  total_facturas_dian: number;
}

export interface TransaccionApi {
  id: string;
  origen_app: TransaccionReciente['origen'];
  id_orden_origen: string;
  comprador: string;
  items_vendidos: string[];
  total: string | number;
  metodo_pago: string;
  estado: string;
  recibido_en: string;
  asiento_tipo: string | null;
  asiento_concepto: string | null;
  factura_estado_dian: TransaccionReciente['estadoDian'];
  cufe: string | null;
}

export interface MovimientoFinanzasPersonales {
  id: string;
  tipo: 'INGRESO' | 'GASTO';
  categoria: string;
  descripcion: string;
  monto: string | number;
  fecha: string;
  medio_pago: string;
  nota: string;
  creado_en: string;
  actualizado_en: string;
}

export interface BorradorDocumentoSoporteAdquisicion {
  id: string;
  organizacion: string;
  vendedor_tipo_documento: string;
  vendedor_numero_identificacion: string;
  vendedor_dv: string;
  vendedor_nombre: string;
  vendedor_no_obligado: boolean;
  fecha_operacion: string;
  descripcion: string;
  subtotal: string | number;
  iva: string | number;
  total: string | number;
  estado: 'BORRADOR';
  creado_en: string;
  actualizado_en: string;
}

export type BorradorDocumentoSoporteNuevo = Pick<
  BorradorDocumentoSoporteAdquisicion,
  | 'organizacion'
  | 'vendedor_tipo_documento'
  | 'vendedor_numero_identificacion'
  | 'vendedor_dv'
  | 'vendedor_nombre'
  | 'vendedor_no_obligado'
  | 'fecha_operacion'
  | 'descripcion'
  | 'subtotal'
  | 'iva'
>;

export type MovimientoFinanzasPersonalNuevo = Pick<
  MovimientoFinanzasPersonales,
  'tipo' | 'categoria' | 'descripcion' | 'monto' | 'fecha' | 'medio_pago' | 'nota'
>;

const ACCESS_KEY = 'access_token';
const REFRESH_KEY = 'refresh_token';

export async function errorDeApi(response: Response, mensaje: string): Promise<Error> {
  const data: unknown = await response.json().catch(() => null);
  if (data && typeof data === 'object') {
    const campos = data as Record<string, unknown>;
    const detalle = campos.error ?? campos.detail;
    if (typeof detalle === 'string') return new Error(detalle);
    const validaciones = Object.entries(campos)
      .map(([campo, valor]) => {
        const mensajes = Array.isArray(valor) ? valor.join(' ') : String(valor);
        return `${campo}: ${mensajes}`;
      })
      .join(' ');
    if (validaciones) return new Error(validaciones);
  }
  return new Error(`${mensaje} (HTTP ${response.status}).`);
}

export async function leerLista<T>(response: Response, mensaje: string): Promise<T[]> {
  if (!response.ok) throw await errorDeApi(response, mensaje);
  const data: unknown = await response.json();
  if (Array.isArray(data)) return data as T[];
  if (data && typeof data === 'object' && 'results' in data) {
    const results = (data as { results?: unknown }).results;
    if (Array.isArray(results)) return results as T[];
  }
  throw new Error('El servidor devolvió un listado con formato inesperado.');
}

export const obtenerToken = (): string | null => localStorage.getItem(ACCESS_KEY);

export function cerrarSesion(): void {
  localStorage.removeItem(ACCESS_KEY);
  localStorage.removeItem(REFRESH_KEY);
}

export function puede(empresa: EmpresaAcceso | undefined, recurso: string, accion: 'read' | 'write' | 'delete'): boolean {
  return Boolean(empresa?.permisos[recurso]?.includes(accion));
}

export async function authFetch(path: string, init: RequestInit = {}): Promise<Response> {
  const headers = new Headers(init.headers);
  if (init.body && !(init.body instanceof FormData)) headers.set('Content-Type', 'application/json');
  const token = obtenerToken();
  if (token) headers.set('Authorization', `Bearer ${token}`);
  const response = await fetch(`${API_BASE_URL}${path}`, { ...init, headers });
  if (response.status === 401) {
    cerrarSesion();
    window.dispatchEvent(new Event('contab:sesion-vencida'));
  }
  return response;
}

export async function iniciarSesionContab(identificador: string, password: string): Promise<PerfilUsuario> {
  const response = await fetch(`${API_BASE_URL}/contab/auth/login/`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ identificador, password }),
  });
  const data = await response.json().catch(() => null);
  if (!response.ok) {
    throw new Error(data?.error || data?.detail || 'No fue posible iniciar sesión.');
  }
  localStorage.setItem(ACCESS_KEY, data.access);
  localStorage.setItem(REFRESH_KEY, data.refresh);
  return data.usuario as PerfilUsuario;
}

export async function obtenerPerfil(): Promise<PerfilUsuario | null> {
  if (!obtenerToken()) return null;
  const response = await authFetch('/contab/auth/me/');
  return response.ok ? ((await response.json()) as PerfilUsuario) : null;
}

export async function obtenerEmpresas<T>(): Promise<T[]> {
  const response = await authFetch('/contab/empresas/');
  return leerLista<T>(response, 'No fue posible cargar las empresas.');
}

export async function obtenerTransaccionesEmpresa(organizacionId: string): Promise<TransaccionApi[]> {
  const response = await authFetch(
    `/contab/transacciones/?organizacion_id=${encodeURIComponent(organizacionId)}`
  );
  return leerLista<TransaccionApi>(response, 'No fue posible cargar las transacciones.');
}

export async function obtenerMovimientosPersonales(): Promise<MovimientoFinanzasPersonales[]> {
  const response = await authFetch('/contab/finanzas-personales/');
  return leerLista<MovimientoFinanzasPersonales>(
    response,
    'No fue posible cargar tus movimientos personales.'
  );
}

export async function crearMovimientoPersonal(
  datos: MovimientoFinanzasPersonalNuevo
): Promise<MovimientoFinanzasPersonales> {
  const response = await authFetch('/contab/finanzas-personales/', {
    method: 'POST',
    body: JSON.stringify(datos),
  });
  if (!response.ok) throw await errorDeApi(response, 'No fue posible guardar el movimiento personal.');
  return response.json();
}

export async function eliminarMovimientoPersonal(id: string): Promise<void> {
  const response = await authFetch(`/contab/finanzas-personales/${encodeURIComponent(id)}/`, {
    method: 'DELETE',
  });
  if (!response.ok) throw await errorDeApi(response, 'No fue posible eliminar el movimiento personal.');
}

export async function obtenerBorradoresDocumentoSoporte(
  organizacionId: string
): Promise<BorradorDocumentoSoporteAdquisicion[]> {
  const response = await authFetch(
    `/contab/documentos-soporte-borradores/?organizacion_id=${encodeURIComponent(organizacionId)}`
  );
  return leerLista<BorradorDocumentoSoporteAdquisicion>(
    response,
    'No fue posible cargar los borradores de documento soporte.'
  );
}

export async function crearBorradorDocumentoSoporte(
  datos: BorradorDocumentoSoporteNuevo
): Promise<BorradorDocumentoSoporteAdquisicion> {
  const response = await authFetch('/contab/documentos-soporte-borradores/', {
    method: 'POST',
    body: JSON.stringify(datos),
  });
  if (!response.ok) throw await errorDeApi(response, 'No fue posible guardar el borrador.');
  return response.json();
}

export async function actualizarBorradorDocumentoSoporte(
  id: string,
  cambios: Partial<BorradorDocumentoSoporteNuevo>
): Promise<BorradorDocumentoSoporteAdquisicion> {
  const response = await authFetch(
    `/contab/documentos-soporte-borradores/${encodeURIComponent(id)}/`,
    {
      method: 'PATCH',
      body: JSON.stringify(cambios),
    }
  );
  if (!response.ok) throw await errorDeApi(response, 'No fue posible actualizar el borrador.');
  return response.json();
}

export async function obtenerResumenFinanciero(organizacionId: string): Promise<ResumenFinancieroApi> {
  const response = await authFetch(
    `/contab/reportes/resumen/${encodeURIComponent(organizacionId)}/`
  );
  if (!response.ok) throw await errorDeApi(response, 'No fue posible cargar el resumen financiero.');
  return response.json();
}

export async function obtenerMembresiasEmpresa(organizacionId: string): Promise<MembresiaUsuario[]> {
  const response = await authFetch(
    `/contab/admin/membresias/?organizacion_id=${encodeURIComponent(organizacionId)}`
  );
  return leerLista<MembresiaUsuario>(response, 'No fue posible cargar los usuarios.');
}

export async function crearUsuarioEmpresa(datos: {
  username: string;
  email: string;
  password: string;
  first_name: string;
  last_name: string;
  organizacion: string;
  rol: RolEmpresa;
}): Promise<MembresiaUsuario> {
  const response = await authFetch('/contab/admin/usuarios/', {
    method: 'POST',
    body: JSON.stringify(datos),
  });
  if (!response.ok) throw await errorDeApi(response, 'No fue posible crear el usuario.');
  return response.json();
}

export async function actualizarMembresia(
  membresiaId: number,
  cambios: Partial<Pick<MembresiaUsuario, 'rol' | 'activo'>>
): Promise<MembresiaUsuario> {
  const response = await authFetch(`/contab/admin/membresias/${membresiaId}/`, {
    method: 'PATCH',
    body: JSON.stringify(cambios),
  });
  if (!response.ok) throw await errorDeApi(response, 'No fue posible actualizar el acceso.');
  return response.json();
}
