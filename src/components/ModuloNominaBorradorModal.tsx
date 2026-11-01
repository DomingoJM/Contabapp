import React, { useCallback, useEffect, useState } from 'react';
import { CheckBadgeIcon, PencilSquareIcon, UserGroupIcon, XMarkIcon } from '@heroicons/react/24/outline';
import {
  actualizarNominaBorrador,
  crearNominaBorrador,
  NominaBorrador,
  NominaBorradorNuevo,
  obtenerNominasBorrador,
  obtenerTrabajadores,
  revisarNominaBorrador,
  TrabajadorTercero,
} from '../services/nominaApi';

interface Props {
  isOpen: boolean;
  empresaId: string;
  empresaNombre: string;
  puedeRevisar: boolean;
  onClose: () => void;
}

const MONEDA = new Intl.NumberFormat('es-CO', { style: 'currency', currency: 'COP', maximumFractionDigits: 0 });
const dinero = (valor: string) => MONEDA.format(Number(valor));

const inicial = (empresaId: string): NominaBorradorNuevo => {
  const hoy = new Date();
  const mes = String(hoy.getMonth() + 1).padStart(2, '0');
  const ultimo = new Date(hoy.getFullYear(), hoy.getMonth() + 1, 0).getDate();
  return {
    organizacion: empresaId,
    trabajador: 0,
    periodicidad: 'MENSUAL',
    periodo_inicio: `${hoy.getFullYear()}-${mes}-01`,
    periodo_fin: `${hoy.getFullYear()}-${mes}-${ultimo}`,
    salario_mensual: '',
    dias_trabajados: '30',
    horas_extra_diurnas: '0',
    horas_extra_nocturnas: '0',
    horas_recargo_nocturno: '0',
    horas_dominical_festivo: '0',
    otros_devengos_salariales: '0',
    otros_devengos_no_salariales: '0',
    libranzas_y_otras_deducciones: '0',
    anticipos: '0',
    deduccion_dependientes_y_otras: '0',
    tarifa_arl: '0.00522',
  };
};

const CAMPOS_NUMERICOS: [keyof NominaBorradorNuevo, string][] = [
  ['salario_mensual', 'Salario mensual'],
  ['dias_trabajados', 'Días trabajados'],
  ['horas_extra_diurnas', 'Horas extra diurnas'],
  ['horas_extra_nocturnas', 'Horas extra nocturnas'],
  ['horas_recargo_nocturno', 'Horas recargo nocturno'],
  ['horas_dominical_festivo', 'Horas dominical/festivo'],
  ['otros_devengos_salariales', 'Otros devengos salariales'],
  ['otros_devengos_no_salariales', 'Otros devengos no salariales'],
  ['libranzas_y_otras_deducciones', 'Libranzas y otras deducciones'],
  ['anticipos', 'Anticipos'],
  ['deduccion_dependientes_y_otras', 'Deducciones/rentas exentas (retención)'],
  ['tarifa_arl', 'Tarifa ARL (decimal)'],
];

const ETIQUETAS: Record<string, string> = {
  salario: 'Salario', horas_extra_diurnas: 'Extra diurna', horas_extra_nocturnas: 'Extra nocturna',
  recargo_nocturno: 'Recargo nocturno', recargo_dominical_festivo: 'Dominical/festivo',
  otros_devengos_salariales: 'Otros salariales', auxilio_transporte: 'Auxilio de transporte',
  otros_devengos_no_salariales: 'Otros no salariales', salud: 'Salud', pension: 'Pensión',
  fondo_solidaridad_pensional: 'Fondo solidaridad', retencion_fuente: 'Retención en la fuente',
  libranzas_y_otras: 'Libranzas y otras', anticipos: 'Anticipos', arl: 'ARL',
  caja_compensacion: 'Caja de compensación', sena: 'SENA', icbf: 'ICBF', cesantias: 'Cesantías',
  intereses_cesantias: 'Intereses cesantías', prima: 'Prima', vacaciones: 'Vacaciones',
};

const mostrarError = (error: unknown) => (error instanceof Error ? error.message : 'Ocurrió un error inesperado.');

const Desglose: React.FC<{ titulo: string; datos: Record<string, string> }> = ({ titulo, datos }) => (
  <div>
    <h4 className="text-[10px] font-black uppercase tracking-wide text-slate-500">{titulo}</h4>
    <dl className="mt-1 space-y-0.5 text-[11px]">
      {Object.entries(datos).filter(([, v]) => Number(v) !== 0).map(([clave, valor]) => (
        <div key={clave} className="flex justify-between gap-2">
          <dt className="text-slate-600">{ETIQUETAS[clave] ?? clave}</dt>
          <dd className="font-bold text-slate-900">{dinero(valor)}</dd>
        </div>
      ))}
    </dl>
  </div>
);

export const ModuloNominaBorradorModal: React.FC<Props> = ({
  isOpen, empresaId, empresaNombre, puedeRevisar, onClose,
}) => {
  const [nominas, setNominas] = useState<NominaBorrador[]>([]);
  const [trabajadores, setTrabajadores] = useState<TrabajadorTercero[]>([]);
  const [formulario, setFormulario] = useState(() => inicial(empresaId));
  const [editandoId, setEditandoId] = useState<string | null>(null);
  const [detalle, setDetalle] = useState<NominaBorrador | null>(null);
  const [cargando, setCargando] = useState(false);
  const [guardando, setGuardando] = useState(false);
  const [error, setError] = useState('');

  const cargar = useCallback(async () => {
    setCargando(true);
    setError('');
    try {
      const [listado, terceros] = await Promise.all([obtenerNominasBorrador(empresaId), obtenerTrabajadores(empresaId)]);
      setNominas(listado);
      setTrabajadores(terceros);
    } catch (err) {
      setError(mostrarError(err));
    } finally {
      setCargando(false);
    }
  }, [empresaId]);

  useEffect(() => {
    if (isOpen) void cargar();
  }, [isOpen, cargar]);

  if (!isOpen) return null;

  const limpiar = () => {
    setFormulario(inicial(empresaId));
    setEditandoId(null);
  };

  const reemplazar = (nomina: NominaBorrador) => {
    setNominas((actuales) => actuales.map((n) => (n.id === nomina.id ? nomina : n)));
    setDetalle(nomina);
  };

  const guardar = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!formulario.trabajador) {
      setError('Selecciona un trabajador.');
      return;
    }
    setGuardando(true);
    setError('');
    try {
      if (editandoId) {
        reemplazar(await actualizarNominaBorrador(editandoId, formulario));
      } else {
        const creada = await crearNominaBorrador(formulario);
        setNominas((actuales) => [creada, ...actuales]);
        setDetalle(creada);
      }
      limpiar();
    } catch (err) {
      setError(mostrarError(err));
    } finally {
      setGuardando(false);
    }
  };

  const editar = (nomina: NominaBorrador) => {
    const campos = Object.fromEntries(
      CAMPOS_NUMERICOS.map(([campo]) => [campo, String(nomina[campo as keyof NominaBorrador])])
    );
    setFormulario({
      ...inicial(empresaId),
      ...campos,
      trabajador: nomina.trabajador,
      periodicidad: nomina.periodicidad,
      periodo_inicio: nomina.periodo_inicio,
      periodo_fin: nomina.periodo_fin,
    });
    setEditandoId(nomina.id);
    setDetalle(nomina);
  };

  const revisar = async (nomina: NominaBorrador) => {
    setError('');
    try {
      reemplazar(await revisarNominaBorrador(nomina.id));
    } catch (err) {
      setError(mostrarError(err));
    }
  };

  const entrada = 'mt-1 w-full rounded-xl border border-slate-300 px-3 py-2 text-xs';

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center overflow-y-auto bg-slate-950/60 p-3 backdrop-blur-sm">
      <section
        role="dialog"
        aria-modal="true"
        aria-labelledby="nomina-borrador-titulo"
        className="my-auto flex max-h-[94vh] w-full max-w-6xl flex-col overflow-hidden rounded-3xl bg-slate-50 shadow-2xl"
      >
        <header className="flex items-start justify-between gap-4 bg-[#0F3963] p-5 text-white">
          <div className="flex items-center gap-3">
            <UserGroupIcon className="h-7 w-7 text-emerald-300" />
            <div>
              <h2 id="nomina-borrador-titulo" className="text-lg font-bold">Nómina · borrador interno</h2>
              <p className="mt-1 text-xs text-blue-100">{empresaNombre}</p>
            </div>
          </div>
          <button onClick={onClose} aria-label="Cerrar" className="rounded-lg p-2 text-white/80 hover:bg-white/10">
            <XMarkIcon className="h-5 w-5" />
          </button>
        </header>

        <div className="grid gap-5 overflow-y-auto p-4 md:grid-cols-[minmax(0,1fr)_minmax(340px,0.9fr)] md:p-6">
          <section className="space-y-3">
            <div className="rounded-2xl border border-amber-300 bg-amber-50 p-4 text-xs leading-relaxed text-amber-950">
              <strong>Solo cálculo interno.</strong> No es el Documento Soporte de Pago de Nómina Electrónica:
              no tiene CUNE, firma ni transmisión a DIAN. Todo cálculo requiere revisión del contador.
            </div>
            {error && <p role="alert" className="rounded-xl bg-rose-50 p-3 text-xs text-rose-800">{error}</p>}
            <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
              <h3 className="text-sm font-bold text-slate-900">Liquidaciones</h3>
              {cargando ? (
                <p className="py-8 text-center text-xs text-slate-500">Cargando…</p>
              ) : nominas.length === 0 ? (
                <p className="py-8 text-center text-xs text-slate-500">No hay liquidaciones para esta empresa.</p>
              ) : (
                <ul className="mt-3 divide-y divide-slate-100">
                  {nominas.map((n) => (
                    <li key={n.id} className="flex items-start gap-3 py-3">
                      <button type="button" onClick={() => setDetalle(n)} className="min-w-0 flex-1 text-left">
                        <p className="truncate text-xs font-bold text-slate-900">{n.trabajador_nombre}</p>
                        <p className="mt-0.5 text-[10px] text-slate-500">
                          {n.periodicidad === 'MENSUAL' ? 'Mensual' : 'Quincenal'} · {n.periodo_inicio} → {n.periodo_fin}
                        </p>
                        <p className={`mt-1 text-[10px] font-bold ${n.estado === 'REVISADO' ? 'text-emerald-700' : 'text-amber-800'}`}>
                          {n.estado === 'REVISADO' ? 'REVISADO POR CONTADOR' : 'BORRADOR'} · SIN ENVÍO A DIAN
                        </p>
                      </button>
                      <span className="whitespace-nowrap text-xs font-black text-slate-900">{dinero(n.neto_a_pagar)}</span>
                      {n.estado === 'BORRADOR' && (
                        <button
                          type="button"
                          aria-label={`Editar nómina de ${n.trabajador_nombre}`}
                          onClick={() => editar(n)}
                          className="rounded-lg p-1 text-slate-500 hover:bg-blue-50 hover:text-blue-800"
                        >
                          <PencilSquareIcon className="h-4 w-4" />
                        </button>
                      )}
                    </li>
                  ))}
                </ul>
              )}
            </div>

            {detalle && (
              <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
                <div className="flex items-center justify-between gap-2">
                  <h3 className="text-sm font-bold text-slate-900">{detalle.trabajador_nombre}</h3>
                  {puedeRevisar && detalle.estado === 'BORRADOR' && (
                    <button
                      type="button"
                      onClick={() => void revisar(detalle)}
                      className="flex items-center gap-1 rounded-lg bg-emerald-600 px-3 py-1.5 text-[11px] font-bold text-white hover:bg-emerald-700"
                    >
                      <CheckBadgeIcon className="h-4 w-4" /> Marcar revisada
                    </button>
                  )}
                </div>
                <div className="mt-3 grid gap-4 sm:grid-cols-2">
                  <Desglose titulo="Devengados" datos={detalle.calculo.devengados} />
                  <Desglose titulo="Deducciones" datos={detalle.calculo.deducciones} />
                  <Desglose titulo="Aportes empleador" datos={detalle.calculo.aportes_empleador} />
                  <Desglose titulo="Provisiones" datos={detalle.calculo.provisiones} />
                </div>
                <p className="mt-3 flex justify-between border-t border-slate-100 pt-2 text-xs font-black text-slate-900">
                  <span>Neto a pagar</span><span>{dinero(detalle.neto_a_pagar)}</span>
                </p>
                {detalle.calculo.advertencias.map((aviso) => (
                  <p key={aviso} className="mt-2 rounded-lg bg-amber-50 p-2 text-[10px] text-amber-900">{aviso}</p>
                ))}
              </div>
            )}
          </section>

          <form onSubmit={guardar} className="h-fit space-y-3 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
            <div className="flex items-center justify-between gap-2">
              <h3 className="text-sm font-bold text-slate-900">{editandoId ? 'Editar liquidación' : 'Nueva liquidación'}</h3>
              {editandoId && (
                <button type="button" onClick={limpiar} className="text-[11px] font-bold text-slate-500 underline">
                  Cancelar edición
                </button>
              )}
            </div>
            <label className="block text-[11px] font-bold text-slate-700">
              Trabajador
              <select
                value={formulario.trabajador}
                disabled={Boolean(editandoId)}
                onChange={(e) => setFormulario({ ...formulario, trabajador: Number(e.target.value) })}
                className={entrada}
              >
                <option value={0}>Selecciona…</option>
                {trabajadores.map((t) => (
                  <option key={t.id} value={t.id}>{t.razon_social_o_nombres} · {t.numero_identificacion}</option>
                ))}
              </select>
            </label>
            <div className="grid grid-cols-3 gap-2">
              <label className="block text-[11px] font-bold text-slate-700">
                Periodicidad
                <select
                  value={formulario.periodicidad}
                  onChange={(e) => setFormulario({
                    ...formulario,
                    periodicidad: e.target.value as NominaBorradorNuevo['periodicidad'],
                    dias_trabajados: e.target.value === 'QUINCENAL' ? '15' : '30',
                  })}
                  className={entrada}
                >
                  <option value="MENSUAL">Mensual</option>
                  <option value="QUINCENAL">Quincenal</option>
                </select>
              </label>
              <label className="block text-[11px] font-bold text-slate-700">
                Inicio
                <input type="date" required value={formulario.periodo_inicio} className={entrada}
                  onChange={(e) => setFormulario({ ...formulario, periodo_inicio: e.target.value })} />
              </label>
              <label className="block text-[11px] font-bold text-slate-700">
                Fin
                <input type="date" required value={formulario.periodo_fin} className={entrada}
                  onChange={(e) => setFormulario({ ...formulario, periodo_fin: e.target.value })} />
              </label>
            </div>
            <div className="grid grid-cols-2 gap-2">
              {CAMPOS_NUMERICOS.map(([campo, etiqueta]) => (
                <label key={campo} className="block text-[11px] font-bold text-slate-700">
                  {etiqueta}
                  <input
                    type="number" min="0" step="any" inputMode="decimal"
                    required={campo === 'salario_mensual' || campo === 'dias_trabajados'}
                    value={formulario[campo] as string}
                    onChange={(e) => setFormulario({ ...formulario, [campo]: e.target.value })}
                    className={entrada}
                  />
                </label>
              ))}
            </div>
            <button
              type="submit"
              disabled={guardando}
              className="w-full rounded-xl bg-[#0F3963] px-4 py-2.5 text-xs font-bold text-white hover:bg-[#0b2b4a] disabled:opacity-60"
            >
              {guardando ? 'Calculando…' : editandoId ? 'Guardar y recalcular' : 'Calcular y guardar borrador'}
            </button>
          </form>
        </div>
      </section>
    </div>
  );
};
