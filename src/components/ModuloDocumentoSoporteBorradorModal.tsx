import React, { useCallback, useEffect, useState } from 'react';
import { DocumentTextIcon, PencilSquareIcon, XMarkIcon } from '@heroicons/react/24/outline';
import {
  actualizarBorradorDocumentoSoporte,
  BorradorDocumentoSoporteAdquisicion,
  BorradorDocumentoSoporteNuevo,
  crearBorradorDocumentoSoporte,
  obtenerBorradoresDocumentoSoporte,
} from '../services/authApi';

interface Props {
  isOpen: boolean;
  empresaId: string;
  empresaNombre: string;
  onClose: () => void;
}

const FECHA_HOY = () => {
  const fecha = new Date();
  return `${fecha.getFullYear()}-${String(fecha.getMonth() + 1).padStart(2, '0')}-${String(fecha.getDate()).padStart(2, '0')}`;
};

const formularioInicial = (empresaId: string): BorradorDocumentoSoporteNuevo => ({
  organizacion: empresaId,
  vendedor_tipo_documento: '13',
  vendedor_numero_identificacion: '',
  vendedor_dv: '',
  vendedor_nombre: '',
  vendedor_no_obligado: false,
  fecha_operacion: FECHA_HOY(),
  descripcion: '',
  subtotal: '',
  iva: '0',
});

const MONEDA = new Intl.NumberFormat('es-CO', {
  style: 'currency',
  currency: 'COP',
  maximumFractionDigits: 0,
});

function mostrarError(error: unknown): string {
  return error instanceof Error ? error.message : 'Ocurrió un error inesperado.';
}

export const ModuloDocumentoSoporteBorradorModal: React.FC<Props> = ({
  isOpen,
  empresaId,
  empresaNombre,
  onClose,
}) => {
  const [borradores, setBorradores] = useState<BorradorDocumentoSoporteAdquisicion[]>([]);
  const [formulario, setFormulario] = useState(() => formularioInicial(empresaId));
  const [editandoId, setEditandoId] = useState<string | null>(null);
  const [cargando, setCargando] = useState(false);
  const [guardando, setGuardando] = useState(false);
  const [error, setError] = useState('');

  const cargarBorradores = useCallback(async () => {
    setCargando(true);
    setError('');
    try {
      setBorradores(await obtenerBorradoresDocumentoSoporte(empresaId));
    } catch (err) {
      setError(mostrarError(err));
    } finally {
      setCargando(false);
    }
  }, [empresaId]);

  useEffect(() => {
    if (isOpen) void cargarBorradores();
  }, [isOpen, cargarBorradores]);

  if (!isOpen) return null;

  const limpiarFormulario = () => {
    setFormulario(formularioInicial(empresaId));
    setEditandoId(null);
  };

  const editarBorrador = (borrador: BorradorDocumentoSoporteAdquisicion) => {
    setFormulario({
      organizacion: empresaId,
      vendedor_tipo_documento: borrador.vendedor_tipo_documento,
      vendedor_numero_identificacion: borrador.vendedor_numero_identificacion,
      vendedor_dv: borrador.vendedor_dv,
      vendedor_nombre: borrador.vendedor_nombre,
      vendedor_no_obligado: borrador.vendedor_no_obligado,
      fecha_operacion: borrador.fecha_operacion,
      descripcion: borrador.descripcion,
      subtotal: String(borrador.subtotal),
      iva: String(borrador.iva),
    });
    setEditandoId(borrador.id);
  };

  const guardarBorrador = async (event: React.FormEvent) => {
    event.preventDefault();
    setGuardando(true);
    setError('');
    try {
      const datos = {
        ...formulario,
        vendedor_numero_identificacion: formulario.vendedor_numero_identificacion.trim(),
        vendedor_dv: formulario.vendedor_dv.trim(),
        vendedor_nombre: formulario.vendedor_nombre.trim(),
        descripcion: formulario.descripcion.trim(),
        subtotal: String(formulario.subtotal),
        iva: String(formulario.iva || 0),
      };
      if (editandoId) {
        const actualizado = await actualizarBorradorDocumentoSoporte(editandoId, datos);
        setBorradores((actuales) => actuales.map((item) => item.id === actualizado.id ? actualizado : item));
      } else {
        const creado = await crearBorradorDocumentoSoporte(datos);
        setBorradores((actuales) => [creado, ...actuales]);
      }
      limpiarFormulario();
    } catch (err) {
      setError(mostrarError(err));
    } finally {
      setGuardando(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center overflow-y-auto bg-slate-950/60 p-3 backdrop-blur-sm">
      <section
        role="dialog"
        aria-modal="true"
        aria-labelledby="documento-soporte-borrador-titulo"
        className="my-auto flex max-h-[94vh] w-full max-w-5xl flex-col overflow-hidden rounded-3xl bg-slate-50 shadow-2xl"
      >
        <header className="flex items-start justify-between gap-4 bg-[#0F3963] p-5 text-white">
          <div className="flex items-center gap-3">
            <DocumentTextIcon className="h-7 w-7 text-emerald-300" />
            <div>
              <h2 id="documento-soporte-borrador-titulo" className="text-lg font-bold">
                Soporte de compra · borrador interno
              </h2>
              <p className="mt-1 text-xs text-blue-100">{empresaNombre}</p>
            </div>
          </div>
          <button onClick={onClose} aria-label="Cerrar" className="rounded-lg p-2 text-white/80 hover:bg-white/10">
            <XMarkIcon className="h-5 w-5" />
          </button>
        </header>

        <div className="grid gap-5 overflow-y-auto p-4 md:grid-cols-[minmax(0,1.1fr)_minmax(320px,0.9fr)] md:p-6">
          <section className="space-y-3">
            <div className="rounded-2xl border border-amber-300 bg-amber-50 p-4 text-xs leading-relaxed text-amber-950">
              <strong>Solo borrador interno.</strong> Este registro no es un Documento Soporte electrónico:
              no tiene numeración DIAN, CUDS, firma ni transmisión. La empresa aún debe habilitar su software propio.
            </div>
            <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
              <h3 className="text-sm font-bold text-slate-900">Borradores guardados</h3>
              {error && <p role="alert" className="mt-3 rounded-xl bg-rose-50 p-3 text-xs text-rose-800">{error}</p>}
              {cargando ? (
                <p className="py-8 text-center text-xs text-slate-500">Cargando borradores…</p>
              ) : borradores.length === 0 ? (
                <p className="py-8 text-center text-xs text-slate-500">No hay borradores para esta empresa.</p>
              ) : (
                <ul className="mt-3 divide-y divide-slate-100">
                  {borradores.map((borrador) => (
                    <li key={borrador.id} className="flex items-start gap-3 py-3">
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-xs font-bold text-slate-900">{borrador.vendedor_nombre}</p>
                        <p className="mt-0.5 text-[10px] text-slate-500">
                          {borrador.fecha_operacion} · {borrador.descripcion}
                        </p>
                        <p className="mt-1 text-[10px] font-bold text-amber-800">BORRADOR · SIN ENVÍO A DIAN</p>
                      </div>
                      <span className="whitespace-nowrap text-xs font-black text-slate-900">
                        {MONEDA.format(Number(borrador.total))}
                      </span>
                      <button
                        type="button"
                        aria-label={`Editar borrador de ${borrador.vendedor_nombre}`}
                        onClick={() => editarBorrador(borrador)}
                        className="rounded-lg p-1 text-slate-500 hover:bg-blue-50 hover:text-blue-800"
                      >
                        <PencilSquareIcon className="h-4 w-4" />
                      </button>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </section>

          <form onSubmit={guardarBorrador} className="h-fit space-y-3 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
            <div className="flex items-center justify-between gap-2">
              <h3 className="text-sm font-bold text-slate-900">
                {editandoId ? 'Editar borrador' : 'Registrar compra'}
              </h3>
              {editandoId && (
                <button type="button" onClick={limpiarFormulario} className="text-[11px] font-bold text-slate-500 underline">
                  Cancelar edición
                </button>
              )}
            </div>

            <div className="grid grid-cols-[minmax(0,0.8fr)_minmax(0,1.2fr)] gap-2">
              <label className="block text-xs font-semibold text-slate-700">
                Tipo de identificación
                <select
                  required
                  value={formulario.vendedor_tipo_documento}
                  onChange={(event) => setFormulario({ ...formulario, vendedor_tipo_documento: event.target.value })}
                  className="mt-1 w-full rounded-xl border border-slate-300 bg-white px-2 py-2.5 font-normal"
                >
                  <option value="13">Cédula</option>
                  <option value="31">NIT</option>
                  <option value="22">Cédula extranjería</option>
                  <option value="41">Pasaporte</option>
                  <option value="42">Documento extranjero</option>
                  <option value="50">NIT extranjero</option>
                </select>
              </label>
              <label className="block text-xs font-semibold text-slate-700">
                Número de identificación
                <input
                  required
                  maxLength={30}
                  value={formulario.vendedor_numero_identificacion}
                  onChange={(event) => setFormulario({ ...formulario, vendedor_numero_identificacion: event.target.value })}
                  className="mt-1 w-full rounded-xl border border-slate-300 px-3 py-2.5 font-normal"
                />
              </label>
            </div>
            {formulario.vendedor_tipo_documento === '31' && (
              <label className="block text-xs font-semibold text-slate-700">
                Dígito de verificación (opcional)
                <input
                  maxLength={1}
                  value={formulario.vendedor_dv}
                  onChange={(event) => setFormulario({ ...formulario, vendedor_dv: event.target.value })}
                  className="mt-1 w-full rounded-xl border border-slate-300 px-3 py-2.5 font-normal"
                />
              </label>
            )}
            <label className="block text-xs font-semibold text-slate-700">
              Nombre o razón social del vendedor
              <input
                required
                maxLength={255}
                value={formulario.vendedor_nombre}
                onChange={(event) => setFormulario({ ...formulario, vendedor_nombre: event.target.value })}
                className="mt-1 w-full rounded-xl border border-slate-300 px-3 py-2.5 font-normal"
              />
            </label>
            <label className="block text-xs font-semibold text-slate-700">
              Fecha de la operación
              <input
                required
                type="date"
                value={formulario.fecha_operacion}
                onChange={(event) => setFormulario({ ...formulario, fecha_operacion: event.target.value })}
                className="mt-1 w-full rounded-xl border border-slate-300 px-3 py-2.5 font-normal"
              />
            </label>
            <label className="block text-xs font-semibold text-slate-700">
              Descripción del bien o servicio
              <textarea
                required
                maxLength={500}
                rows={2}
                value={formulario.descripcion}
                onChange={(event) => setFormulario({ ...formulario, descripcion: event.target.value })}
                className="mt-1 w-full resize-y rounded-xl border border-slate-300 px-3 py-2.5 font-normal"
              />
            </label>
            <div className="grid grid-cols-2 gap-2">
              <label className="block text-xs font-semibold text-slate-700">
                Subtotal (COP)
                <input
                  required
                  type="number"
                  min="0.01"
                  step="0.01"
                  value={formulario.subtotal}
                  onChange={(event) => setFormulario({ ...formulario, subtotal: event.target.value })}
                  className="mt-1 w-full rounded-xl border border-slate-300 px-3 py-2.5 font-normal"
                />
              </label>
              <label className="block text-xs font-semibold text-slate-700">
                IVA registrado (COP)
                <input
                  required
                  type="number"
                  min="0"
                  step="0.01"
                  value={formulario.iva}
                  onChange={(event) => setFormulario({ ...formulario, iva: event.target.value })}
                  className="mt-1 w-full rounded-xl border border-slate-300 px-3 py-2.5 font-normal"
                />
              </label>
            </div>
            <p className="text-right text-xs font-bold text-slate-700">
              Total del borrador: {MONEDA.format(Number(formulario.subtotal || 0) + Number(formulario.iva || 0))}
            </p>
            <label className="flex items-start gap-2 rounded-xl bg-slate-50 p-3 text-[11px] leading-relaxed text-slate-700">
              <input
                required
                type="checkbox"
                checked={formulario.vendedor_no_obligado}
                onChange={(event) => setFormulario({ ...formulario, vendedor_no_obligado: event.target.checked })}
                className="mt-0.5"
              />
              Confirmo que el vendedor no está obligado a expedir factura ni documento equivalente.
            </label>
            {error && <p role="alert" className="rounded-xl bg-rose-50 p-3 text-xs text-rose-800">{error}</p>}
            <button
              type="submit"
              disabled={guardando}
              className="w-full rounded-xl bg-[#0F3963] px-4 py-3 text-sm font-bold text-white disabled:opacity-60"
            >
              {guardando ? 'Guardando…' : editandoId ? 'Actualizar borrador' : 'Guardar borrador'}
            </button>
          </form>
        </div>
      </section>
    </div>
  );
};
