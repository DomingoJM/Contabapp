import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  ArrowDownCircleIcon,
  ArrowUpCircleIcon,
  PlusCircleIcon,
  TrashIcon,
  WalletIcon,
  XMarkIcon,
} from '@heroicons/react/24/outline';
import {
  crearMovimientoPersonal,
  eliminarMovimientoPersonal,
  MovimientoFinanzasPersonalNuevo,
  MovimientoFinanzasPersonales,
  obtenerMovimientosPersonales,
} from '../services/authApi';

interface Props {
  isOpen: boolean;
  onClose: () => void;
}

type Filtro = 'TODOS' | 'INGRESO' | 'GASTO';

const FECHA_HOY = () => {
  const fecha = new Date();
  return `${fecha.getFullYear()}-${String(fecha.getMonth() + 1).padStart(2, '0')}-${String(fecha.getDate()).padStart(2, '0')}`;
};

const FORMULARIO_INICIAL: MovimientoFinanzasPersonalNuevo = {
  tipo: 'GASTO',
  categoria: 'Alimentación',
  descripcion: '',
  monto: '',
  fecha: FECHA_HOY(),
  medio_pago: 'EFECTIVO',
  nota: '',
};

const MONEDA = new Intl.NumberFormat('es-CO', {
  style: 'currency',
  currency: 'COP',
  maximumFractionDigits: 0,
});

function mostrarError(error: unknown): string {
  return error instanceof Error ? error.message : 'Ocurrió un error inesperado.';
}

export const ModuloFinanzasPersonalesModal: React.FC<Props> = ({ isOpen, onClose }) => {
  const [movimientos, setMovimientos] = useState<MovimientoFinanzasPersonales[]>([]);
  const [formulario, setFormulario] = useState(FORMULARIO_INICIAL);
  const [filtro, setFiltro] = useState<Filtro>('TODOS');
  const [cargando, setCargando] = useState(false);
  const [guardando, setGuardando] = useState(false);
  const [eliminando, setEliminando] = useState<string | null>(null);
  const [error, setError] = useState('');

  const cargarMovimientos = useCallback(async () => {
    setCargando(true);
    setError('');
    try {
      setMovimientos(await obtenerMovimientosPersonales());
    } catch (err) {
      setError(mostrarError(err));
    } finally {
      setCargando(false);
    }
  }, []);

  useEffect(() => {
    if (isOpen) void cargarMovimientos();
  }, [isOpen, cargarMovimientos]);

  const resumen = useMemo(() => movimientos.reduce(
    (total, movimiento) => {
      const monto = Number(movimiento.monto);
      if (movimiento.tipo === 'INGRESO') total.ingresos += monto;
      else total.gastos += monto;
      return total;
    },
    { ingresos: 0, gastos: 0 }
  ), [movimientos]);

  const movimientosFiltrados = movimientos.filter(
    (movimiento) => filtro === 'TODOS' || movimiento.tipo === filtro
  );

  if (!isOpen) return null;

  const guardarMovimiento = async (event: React.FormEvent) => {
    event.preventDefault();
    setGuardando(true);
    setError('');
    try {
      const nuevo = await crearMovimientoPersonal({
        ...formulario,
        categoria: formulario.categoria.trim(),
        descripcion: formulario.descripcion.trim(),
        monto: String(formulario.monto),
        nota: formulario.nota.trim(),
      });
      setMovimientos((actuales) => [nuevo, ...actuales]);
      setFormulario({ ...FORMULARIO_INICIAL, fecha: FECHA_HOY() });
    } catch (err) {
      setError(mostrarError(err));
    } finally {
      setGuardando(false);
    }
  };

  const borrarMovimiento = async (movimiento: MovimientoFinanzasPersonales) => {
    if (!window.confirm(`¿Eliminar el movimiento "${movimiento.descripcion}"?`)) return;
    setEliminando(movimiento.id);
    setError('');
    try {
      await eliminarMovimientoPersonal(movimiento.id);
      setMovimientos((actuales) => actuales.filter((item) => item.id !== movimiento.id));
    } catch (err) {
      setError(mostrarError(err));
    } finally {
      setEliminando(null);
    }
  };

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center overflow-y-auto bg-slate-950/60 p-3 backdrop-blur-sm">
      <section
        role="dialog"
        aria-modal="true"
        aria-labelledby="finanzas-personales-titulo"
        className="my-auto flex max-h-[94vh] w-full max-w-5xl flex-col overflow-hidden rounded-3xl bg-slate-50 shadow-2xl"
      >
        <header className="flex items-start justify-between gap-4 bg-[#0F3963] p-5 text-white">
          <div className="flex items-center gap-3">
            <div className="rounded-2xl bg-white/10 p-2.5">
              <WalletIcon className="h-6 w-6 text-emerald-300" />
            </div>
            <div>
              <h2 id="finanzas-personales-titulo" className="text-lg font-bold">Mis finanzas personales</h2>
              <p className="mt-1 text-xs text-blue-100">Organiza ingresos y gastos sin conexión con la DIAN.</p>
            </div>
          </div>
          <button onClick={onClose} aria-label="Cerrar" className="rounded-lg p-2 text-white/80 hover:bg-white/10">
            <XMarkIcon className="h-5 w-5" />
          </button>
        </header>

        <div className="grid gap-5 overflow-y-auto p-4 md:grid-cols-[minmax(0,1.1fr)_minmax(320px,0.9fr)] md:p-6">
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-3">
              <article className="rounded-2xl border border-emerald-200 bg-white p-4 shadow-sm">
                <p className="text-[10px] font-bold uppercase tracking-wider text-emerald-700">Ingresos registrados</p>
                <p className="mt-2 text-lg font-black text-slate-900">{MONEDA.format(resumen.ingresos)}</p>
              </article>
              <article className="rounded-2xl border border-rose-200 bg-white p-4 shadow-sm">
                <p className="text-[10px] font-bold uppercase tracking-wider text-rose-700">Gastos registrados</p>
                <p className="mt-2 text-lg font-black text-slate-900">{MONEDA.format(resumen.gastos)}</p>
              </article>
            </div>
            <article className="rounded-2xl border border-blue-200 bg-blue-50 p-4">
              <p className="text-[10px] font-bold uppercase tracking-wider text-blue-800">Balance personal</p>
              <p className="mt-1 text-2xl font-black text-[#0F3963]">
                {MONEDA.format(resumen.ingresos - resumen.gastos)}
              </p>
              <p className="mt-1 text-[11px] text-blue-800">
                Basado en los movimientos que has registrado.
              </p>
            </article>

            <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div>
                  <h3 className="text-sm font-bold text-slate-900">Movimientos</h3>
                  <p className="text-[11px] text-slate-500">Solo tú puedes consultar estos registros.</p>
                </div>
                <div className="flex gap-1 rounded-xl bg-slate-100 p-1">
                  {(['TODOS', 'INGRESO', 'GASTO'] as const).map((opcion) => (
                    <button
                      key={opcion}
                      type="button"
                      onClick={() => setFiltro(opcion)}
                      className={`rounded-lg px-2.5 py-1.5 text-[10px] font-bold ${
                        filtro === opcion ? 'bg-white text-[#0F3963] shadow-sm' : 'text-slate-500'
                      }`}
                    >
                      {opcion === 'TODOS' ? 'Todos' : opcion === 'INGRESO' ? 'Ingresos' : 'Gastos'}
                    </button>
                  ))}
                </div>
              </div>

              {error && <p role="alert" className="mt-3 rounded-xl bg-rose-50 p-3 text-xs text-rose-800">{error}</p>}
              {cargando ? (
                <p className="py-8 text-center text-xs text-slate-500">Cargando tus movimientos…</p>
              ) : movimientosFiltrados.length === 0 ? (
                <p className="py-8 text-center text-xs text-slate-500">No hay movimientos para mostrar.</p>
              ) : (
                <ul className="mt-3 divide-y divide-slate-100">
                  {movimientosFiltrados.map((movimiento) => {
                    const esIngreso = movimiento.tipo === 'INGRESO';
                    return (
                      <li key={movimiento.id} className="flex items-start gap-3 py-3">
                        {esIngreso
                          ? <ArrowDownCircleIcon className="mt-0.5 h-5 w-5 shrink-0 text-emerald-600" />
                          : <ArrowUpCircleIcon className="mt-0.5 h-5 w-5 shrink-0 text-rose-600" />}
                        <div className="min-w-0 flex-1">
                          <p className="truncate text-xs font-bold text-slate-900">{movimiento.descripcion}</p>
                          <p className="mt-0.5 text-[10px] text-slate-500">
                            {movimiento.categoria} · {movimiento.fecha} · {movimiento.medio_pago}
                          </p>
                          {movimiento.nota && <p className="mt-1 text-[10px] text-slate-500">{movimiento.nota}</p>}
                        </div>
                        <span className={`whitespace-nowrap text-xs font-black ${esIngreso ? 'text-emerald-700' : 'text-rose-700'}`}>
                          {esIngreso ? '+' : '−'}{MONEDA.format(Number(movimiento.monto))}
                        </span>
                        <button
                          type="button"
                          aria-label={`Eliminar ${movimiento.descripcion}`}
                          disabled={eliminando === movimiento.id}
                          onClick={() => void borrarMovimiento(movimiento)}
                          className="rounded-lg p-1 text-slate-400 hover:bg-rose-50 hover:text-rose-700 disabled:opacity-50"
                        >
                          <TrashIcon className="h-4 w-4" />
                        </button>
                      </li>
                    );
                  })}
                </ul>
              )}
            </div>
          </div>

          <form onSubmit={guardarMovimiento} className="h-fit space-y-3 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
            <div className="flex items-center gap-2">
              <PlusCircleIcon className="h-5 w-5 text-emerald-600" />
              <h3 className="text-sm font-bold text-slate-900">Registrar movimiento</h3>
            </div>

            <div className="grid grid-cols-2 gap-2 rounded-xl bg-slate-100 p-1">
              {(['GASTO', 'INGRESO'] as const).map((tipo) => (
                <button
                  type="button"
                  key={tipo}
                  onClick={() => setFormulario({
                    ...formulario,
                    tipo,
                    categoria: tipo === 'GASTO' ? 'Alimentación' : 'Trabajo',
                  })}
                  className={`rounded-lg py-2 text-xs font-bold ${
                    formulario.tipo === tipo
                      ? tipo === 'GASTO' ? 'bg-rose-600 text-white' : 'bg-emerald-600 text-white'
                      : 'text-slate-600'
                  }`}
                >
                  {tipo === 'GASTO' ? 'Registrar gasto' : 'Registrar ingreso'}
                </button>
              ))}
            </div>

            <label className="block text-xs font-semibold text-slate-700">
              Categoría
              <input
                required
                maxLength={60}
                value={formulario.categoria}
                onChange={(event) => setFormulario({ ...formulario, categoria: event.target.value })}
                placeholder="Ej. Transporte"
                className="mt-1 w-full rounded-xl border border-slate-300 px-3 py-2.5 font-normal outline-none focus:border-emerald-500"
              />
            </label>
            <label className="block text-xs font-semibold text-slate-700">
              Descripción
              <input
                required
                maxLength={255}
                value={formulario.descripcion}
                onChange={(event) => setFormulario({ ...formulario, descripcion: event.target.value })}
                placeholder="¿En qué recibiste o gastaste?"
                className="mt-1 w-full rounded-xl border border-slate-300 px-3 py-2.5 font-normal outline-none focus:border-emerald-500"
              />
            </label>
            <div className="grid grid-cols-2 gap-2">
              <label className="block text-xs font-semibold text-slate-700">
                Valor (COP)
                <input
                  required
                  type="number"
                  min="1"
                  step="100"
                  value={formulario.monto}
                  onChange={(event) => setFormulario({ ...formulario, monto: event.target.value })}
                  placeholder="0"
                  className="mt-1 w-full rounded-xl border border-slate-300 px-3 py-2.5 font-normal"
                />
              </label>
              <label className="block text-xs font-semibold text-slate-700">
                Fecha
                <input
                  required
                  type="date"
                  value={formulario.fecha}
                  onChange={(event) => setFormulario({ ...formulario, fecha: event.target.value })}
                  className="mt-1 w-full rounded-xl border border-slate-300 px-2 py-2.5 font-normal"
                />
              </label>
            </div>
            <label className="block text-xs font-semibold text-slate-700">
              Medio de pago
              <select
                value={formulario.medio_pago}
                onChange={(event) => setFormulario({ ...formulario, medio_pago: event.target.value })}
                className="mt-1 w-full rounded-xl border border-slate-300 bg-white px-3 py-2.5 font-normal"
              >
                {[
                  ['EFECTIVO', 'Efectivo'],
                  ['TRANSFERENCIA', 'Transferencia bancaria'],
                  ['TARJETA', 'Tarjeta'],
                  ['NEQUI', 'Nequi / Bre-B'],
                  ['DAVIPLATA', 'Daviplata'],
                  ['OTRO', 'Otro'],
                ].map(([valor, etiqueta]) => <option key={valor} value={valor}>{etiqueta}</option>)}
              </select>
            </label>
            <label className="block text-xs font-semibold text-slate-700">
              Nota (opcional)
              <textarea
                rows={2}
                value={formulario.nota}
                onChange={(event) => setFormulario({ ...formulario, nota: event.target.value })}
                className="mt-1 w-full resize-y rounded-xl border border-slate-300 px-3 py-2.5 font-normal"
              />
            </label>
            <button
              type="submit"
              disabled={guardando}
              className="w-full rounded-xl bg-[#0F3963] px-4 py-3 text-sm font-bold text-white disabled:opacity-60"
            >
              {guardando ? 'Guardando…' : 'Guardar movimiento personal'}
            </button>
            <p className="text-center text-[10px] leading-relaxed text-slate-500">
              Información personal separada de la contabilidad empresarial. No genera factura ni se transmite a la DIAN.
            </p>
          </form>
        </div>
      </section>
    </div>
  );
};
