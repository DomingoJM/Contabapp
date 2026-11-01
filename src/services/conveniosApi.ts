const API_BASE_URL = (
  import.meta.env.VITE_API_URL || 'https://comunidadesinteligentes.onrender.com/api/v1'
).replace(/\/+$/, '');

export interface AuthTokens {
  access: string;
  refresh: string;
}

export interface OrganizacionConvenio {
  id: string;
  nombre_razon_social: string;
  nit_o_cedula: string;
  municipio_dane: string;
  ciudad: string;
}

export interface Convenio {
  id: string;
  organizacion: string;
  proyecto: string | null;
  codigo: string;
  nombre: string;
  entidad_contratante: string;
  objeto: string;
  monto_total: string;
  fecha_inicio: string | null;
  fecha_fin: string | null;
  fase: 'PRECONTRACTUAL' | 'CONTRACTUAL' | 'EJECUCION' | 'POSTCONTRACTUAL';
  estado: 'BORRADOR' | 'ACTIVO' | 'SUSPENDIDO' | 'CERRADO';
  firmas_requeridas: number;
  creado_por: number | null;
  creado_en: string;
  actualizado_en: string;
}

export interface Requisito {
  id: number;
  codigo: string;
  nombre: string;
  obligatorio: boolean;
  cumplido: boolean;
  documento_sha256: string;
  verificado_por: number | null;
  verificado_en: string | null;
  creado_en: string;
}

export interface Hito {
  id: number;
  secuencia: number;
  nombre: string;
  descripcion: string;
  monto_maximo: string;
  fecha_limite: string | null;
  estado: 'PENDIENTE' | 'APROBADO' | 'RECHAZADO';
  aprobado_por: number | null;
  aprobado_en: string | null;
  creado_en: string;
}

export interface FirmaEvento {
  usuario_id: number;
  rol: string;
  firma_base64: string;
  firmado_en: string;
}

export interface EventoConvenio {
  id: number;
  secuencia: number;
  tipo: string;
  datos: Record<string, unknown>;
  hash_anterior: string;
  hash_evento: string;
  actor_id: number | null;
  creado_en: string;
  firmas: FirmaEvento[];
}

export interface Desembolso {
  id: number;
  hito: number;
  rubro: number | null;
  descripcion: string;
  monto: string;
  estado: 'PENDIENTE_FIRMAS' | 'APROBADO' | 'PAGADO' | 'ANULADO';
  creado_por: number | null;
  creado_en: string;
  actualizado_en: string;
}

export interface Firmante {
  id: number;
  usuario: number;
  rol: 'PRESIDENTE' | 'TESORERO' | 'SUPERVISOR';
  clave_publica_pem: string;
  activo: boolean;
  creado_en: string;
}

export interface CadenaStatus {
  valida: boolean;
  eventos_verificados: number;
  secuencia_fallida: number | null;
}

export interface CrearConvenioPayload {
  organizacion: string;
  codigo: string;
  nombre: string;
  entidad_contratante: string;
  objeto: string;
  monto_total: string;
  fecha_inicio?: string;
  fecha_fin?: string;
  firmas_requeridas: number;
}

interface ApiOptions extends RequestInit {
  token?: string;
}

function getStoredToken(): string | null {
  return localStorage.getItem('access_token');
}

async function request<T>(path: string, options: ApiOptions = {}): Promise<T> {
  const { token, ...init } = options;
  const headers = new Headers(init.headers);
  if (init.body && !(init.body instanceof FormData)) {
    headers.set('Content-Type', 'application/json');
  }
  const accessToken = token || getStoredToken();
  if (accessToken) headers.set('Authorization', `Bearer ${accessToken}`);

  let response: Response;
  try {
    response = await fetch(`${API_BASE_URL}${path}`, { ...init, headers });
  } catch (error) {
    throw new Error(`No fue posible conectar con el backend: ${String(error)}`);
  }

  const contentType = response.headers.get('content-type') || '';
  const payload = contentType.includes('application/json')
    ? await response.json().catch(() => null)
    : null;
  if (!response.ok) {
    if (response.status === 401) {
      throw new Error('Sesión vencida o credenciales inválidas. Inicia sesión de nuevo.');
    }
    if (response.status === 403) {
      throw new Error('Tu usuario no tiene permisos para esta operación en este convenio.');
    }
    const message = payload?.detail || JSON.stringify(payload) || `Error HTTP ${response.status}`;
    throw new Error(typeof message === 'string' ? message : JSON.stringify(message));
  }
  return payload as T;
}

export async function iniciarSesion(username: string, password: string): Promise<AuthTokens> {
  const tokens = await request<AuthTokens>('/auth/token/', {
    method: 'POST',
    body: JSON.stringify({ username, password }),
  });
  localStorage.setItem('access_token', tokens.access);
  localStorage.setItem('refresh_token', tokens.refresh);
  return tokens;
}

export async function obtenerOrganizaciones(): Promise<OrganizacionConvenio[]> {
  return request('/contab/convenios-solidarios/organizaciones/');
}

export async function obtenerConvenios(): Promise<Convenio[]> {
  return request('/contab/convenios-solidarios/');
}

export async function crearConvenio(payload: CrearConvenioPayload): Promise<Convenio> {
  return request('/contab/convenios-solidarios/', {
    method: 'POST',
    body: JSON.stringify(payload),
  });
}

export async function obtenerRequisitos(convenioId: string): Promise<Requisito[]> {
  return request(`/contab/convenios-solidarios/${convenioId}/requisitos/`);
}

export async function obtenerHitos(convenioId: string): Promise<Hito[]> {
  return request(`/contab/convenios-solidarios/${convenioId}/hitos/`);
}

export async function obtenerFirmantes(convenioId: string): Promise<Firmante[]> {
  return request(`/contab/convenios-solidarios/${convenioId}/firmantes/`);
}

export async function obtenerEventos(convenioId: string): Promise<EventoConvenio[]> {
  return request(`/contab/convenios-solidarios/${convenioId}/eventos/`);
}

export async function obtenerDesembolsos(convenioId: string): Promise<Desembolso[]> {
  return request(`/contab/convenios-solidarios/${convenioId}/desembolsos/`);
}

export async function verificarCadena(convenioId: string): Promise<CadenaStatus> {
  return request(`/contab/convenios-solidarios/${convenioId}/verificar-cadena/`);
}

export async function verificarRequisito(
  convenioId: string,
  requisitoId: number,
  documentoSha256: string,
): Promise<Requisito> {
  return request(`/contab/convenios-solidarios/${convenioId}/verificar-requisito/`, {
    method: 'POST',
    body: JSON.stringify({ requisito_id: requisitoId, documento_sha256: documentoSha256 }),
  });
}

export async function avanzarFase(convenioId: string): Promise<Convenio> {
  return request(`/contab/convenios-solidarios/${convenioId}/avanzar-fase/`, { method: 'POST' });
}

export async function suspenderConvenio(convenioId: string): Promise<Convenio> {
  return request(`/contab/convenios-solidarios/${convenioId}/suspender/`, { method: 'POST' });
}

export async function reactivarConvenio(convenioId: string): Promise<Convenio> {
  return request(`/contab/convenios-solidarios/${convenioId}/reactivar/`, { method: 'POST' });
}

export async function crearHito(
  convenioId: string,
  payload: { secuencia: number; nombre: string; descripcion: string; monto_maximo: string; fecha_limite?: string },
): Promise<Hito> {
  return request(`/contab/convenios-solidarios/${convenioId}/hitos/`, {
    method: 'POST',
    body: JSON.stringify(payload),
  });
}

export async function aprobarHito(convenioId: string, hitoId: number): Promise<Hito> {
  return request(`/contab/convenios-solidarios/${convenioId}/aprobar-hito/`, {
    method: 'POST',
    body: JSON.stringify({ hito_id: hitoId }),
  });
}

export async function crearDesembolso(
  convenioId: string,
  payload: { hito_id: number; descripcion: string; monto: string },
): Promise<Desembolso> {
  return request(`/contab/convenios-solidarios/${convenioId}/desembolsos/`, {
    method: 'POST',
    body: JSON.stringify(payload),
  });
}

export async function marcarDesembolsoPagado(convenioId: string, desembolsoId: number): Promise<Desembolso> {
  return request(`/contab/convenios-solidarios/${convenioId}/marcar-desembolso-pagado/`, {
    method: 'POST',
    body: JSON.stringify({ desembolso_id: desembolsoId }),
  });
}

export async function anularDesembolso(convenioId: string, desembolsoId: number): Promise<Desembolso> {
  return request(`/contab/convenios-solidarios/${convenioId}/anular-desembolso/`, {
    method: 'POST',
    body: JSON.stringify({ desembolso_id: desembolsoId }),
  });
}

export async function registrarFirmante(
  convenioId: string,
  payload: { usuario: number; rol: Firmante['rol']; clave_publica_pem: string },
): Promise<Firmante> {
  return request(`/contab/convenios-solidarios/${convenioId}/firmantes/`, {
    method: 'POST',
    body: JSON.stringify(payload),
  });
}

export async function firmarEvento(
  convenioId: string,
  eventoId: number,
  firmaBase64: string,
): Promise<{ firmante_id: number; evento_id: number }> {
  return request(`/contab/convenios-solidarios/${convenioId}/firmar-evento/`, {
    method: 'POST',
    body: JSON.stringify({ evento_id: eventoId, firma_base64: firmaBase64 }),
  });
}

export function cerrarSesion(): void {
  localStorage.removeItem('access_token');
  localStorage.removeItem('refresh_token');
}
