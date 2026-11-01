import { authFetch, errorDeApi, leerLista } from './authApi';

export type PeriodicidadNomina = 'QUINCENAL' | 'MENSUAL';

export interface TrabajadorTercero {
  id: number;
  razon_social_o_nombres: string;
  numero_identificacion: string;
}

export interface CalculoNomina {
  devengados: Record<string, string>;
  deducciones: Record<string, string>;
  aportes_empleador: Record<string, string>;
  provisiones: Record<string, string>;
  ibc: string;
  advertencias: string[];
}

export interface NominaBorrador {
  id: string;
  organizacion: string;
  trabajador: number;
  trabajador_nombre: string;
  trabajador_identificacion: string;
  periodicidad: PeriodicidadNomina;
  periodo_inicio: string;
  periodo_fin: string;
  salario_mensual: string;
  dias_trabajados: string;
  horas_extra_diurnas: string;
  horas_extra_nocturnas: string;
  horas_recargo_nocturno: string;
  horas_dominical_festivo: string;
  otros_devengos_salariales: string;
  otros_devengos_no_salariales: string;
  libranzas_y_otras_deducciones: string;
  anticipos: string;
  deduccion_dependientes_y_otras: string;
  tarifa_arl: string;
  total_devengado: string;
  total_deducciones: string;
  neto_a_pagar: string;
  calculo: CalculoNomina;
  estado: 'BORRADOR' | 'REVISADO';
}

export type NominaBorradorNuevo = Omit<
  NominaBorrador,
  | 'id' | 'trabajador_nombre' | 'trabajador_identificacion' | 'total_devengado'
  | 'total_deducciones' | 'neto_a_pagar' | 'calculo' | 'estado'
>;

const base = '/contab/nomina/borradores/';

export async function obtenerTrabajadores(organizacionId: string): Promise<TrabajadorTercero[]> {
  const response = await authFetch(`/contab/terceros/?organizacion_id=${encodeURIComponent(organizacionId)}`);
  return leerLista<TrabajadorTercero>(response, 'No fue posible cargar los terceros.');
}

export async function obtenerNominasBorrador(organizacionId: string): Promise<NominaBorrador[]> {
  const response = await authFetch(`${base}?organizacion_id=${encodeURIComponent(organizacionId)}`);
  return leerLista<NominaBorrador>(response, 'No fue posible cargar los borradores de nómina.');
}

export async function crearNominaBorrador(datos: NominaBorradorNuevo): Promise<NominaBorrador> {
  const response = await authFetch(base, { method: 'POST', body: JSON.stringify(datos) });
  if (!response.ok) throw await errorDeApi(response, 'No fue posible guardar la nómina.');
  return response.json();
}

export async function actualizarNominaBorrador(
  id: string,
  cambios: Partial<NominaBorradorNuevo>
): Promise<NominaBorrador> {
  const response = await authFetch(`${base}${encodeURIComponent(id)}/`, {
    method: 'PATCH',
    body: JSON.stringify(cambios),
  });
  if (!response.ok) throw await errorDeApi(response, 'No fue posible actualizar la nómina.');
  return response.json();
}

export async function revisarNominaBorrador(id: string): Promise<NominaBorrador> {
  const response = await authFetch(`${base}${encodeURIComponent(id)}/revisar/`, { method: 'POST' });
  if (!response.ok) throw await errorDeApi(response, 'No fue posible marcar la nómina como revisada.');
  return response.json();
}
