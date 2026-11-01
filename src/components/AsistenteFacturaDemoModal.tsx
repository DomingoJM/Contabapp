import React, { useEffect, useRef, useState } from 'react';
import {
  ArrowLeftIcon,
  CheckCircleIcon,
  MicrophoneIcon,
  XMarkIcon,
} from '@heroicons/react/24/outline';

export interface FacturaDemo {
  id: string;
  empresaId: string;
  folio: string;
  cliente: string;
  descripcion: string;
  cantidad: number;
  precioUnitario: number;
  subtotal: number;
  iva: number;
  total: number;
  medioPago: string;
  fecha: string;
}

interface Props {
  isOpen: boolean;
  onClose: () => void;
  empresaId: string;
  empresaNombre: string;
  onConfirmar: (factura: FacturaDemo) => void;
}

interface SpeechRecognitionResultLike {
  readonly length: number;
  readonly [index: number]: { readonly transcript: string };
}

interface SpeechRecognitionEventLike {
  readonly resultIndex: number;
  readonly results: ArrayLike<SpeechRecognitionResultLike>;
}

interface SpeechRecognitionLike {
  lang: string;
  interimResults: boolean;
  onresult: ((event: SpeechRecognitionEventLike) => void) | null;
  onerror: ((event: { error: string }) => void) | null;
  onend: (() => void) | null;
  start: () => void;
  stop: () => void;
}

type SpeechRecognitionWindow = Window & {
  SpeechRecognition?: new () => SpeechRecognitionLike;
  webkitSpeechRecognition?: new () => SpeechRecognitionLike;
};

type Paso = 'orientacion' | 'datos' | 'confirmacion' | 'lista';

const moneda = (valor: number) => `$${valor.toLocaleString('es-CO')}`;

export const AsistenteFacturaDemoModal: React.FC<Props> = ({
  isOpen,
  onClose,
  empresaId,
  empresaNombre,
  onConfirmar,
}) => {
  const [paso, setPaso] = useState<Paso>('orientacion');
  const [orientacion, setOrientacion] = useState('');
  const [cliente, setCliente] = useState('');
  const [descripcion, setDescripcion] = useState('');
  const [cantidad, setCantidad] = useState(1);
  const [precioUnitario, setPrecioUnitario] = useState(0);
  const [incluyeIva, setIncluyeIva] = useState(false);
  const [medioPago, setMedioPago] = useState('Efectivo');
  const [error, setError] = useState('');
  const [escuchando, setEscuchando] = useState(false);
  const [facturaCreada, setFacturaCreada] = useState<FacturaDemo | null>(null);
  const reconocimiento = useRef<SpeechRecognitionLike | null>(null);

  const subtotal = cantidad * precioUnitario;
  const iva = incluyeIva ? Math.round(subtotal * 0.19) : 0;
  const total = subtotal + iva;

  useEffect(() => {
    if (!isOpen) {
      reconocimiento.current?.stop();
      reconocimiento.current = null;
      setEscuchando(false);
      return;
    }

    setPaso('orientacion');
    setOrientacion('');
    setCliente('');
    setDescripcion('');
    setCantidad(1);
    setPrecioUnitario(0);
    setIncluyeIva(false);
    setMedioPago('Efectivo');
    setError('');
    setFacturaCreada(null);
  }, [isOpen]);

  useEffect(() => () => reconocimiento.current?.stop(), []);

  if (!isOpen) return null;

  const escuchar = () => {
    if (escuchando) {
      reconocimiento.current?.stop();
      return;
    }

    const ventana = window as SpeechRecognitionWindow;
    const Reconocimiento = ventana.SpeechRecognition || ventana.webkitSpeechRecognition;
    if (!Reconocimiento) {
      setError('Este navegador no ofrece dictado por voz. Puedes escribir la solicitud.');
      return;
    }

    const instancia = new Reconocimiento();
    instancia.lang = 'es-CO';
    instancia.interimResults = false;
    instancia.onresult = (event) => {
      const transcripcion = Array.from(
        { length: event.results.length - event.resultIndex },
        (_, index) => event.results[event.resultIndex + index][0].transcript
      ).join(' ').trim();
      if (transcripcion) {
        setOrientacion((texto) => `${texto}${texto ? ' ' : ''}${transcripcion}`);
      }
      setError('');
    };
    instancia.onerror = (event) => {
      setEscuchando(false);
      setError(
        event.error === 'not-allowed'
          ? 'El navegador no permitió usar el micrófono. Revisa sus permisos o escribe la solicitud.'
          : 'No se pudo transcribir la voz. Inténtalo de nuevo o escribe la solicitud.'
      );
    };
    instancia.onend = () => setEscuchando(false);

    reconocimiento.current = instancia;
    setError('');
    try {
      instancia.start();
      setEscuchando(true);
    } catch {
      setEscuchando(false);
      setError('No se pudo iniciar el micrófono. Comprueba el permiso del navegador.');
    }
  };

  const pasarARevision = (event: React.FormEvent) => {
    event.preventDefault();
    if (orientacion.trim().length < 5) {
      setError('Cuéntanos brevemente qué vendiste para preparar la revisión.');
      return;
    }
    reconocimiento.current?.stop();
    setDescripcion(orientacion.trim());
    setError('');
    setPaso('datos');
  };

  const pasarAConfirmacion = (event: React.FormEvent) => {
    event.preventDefault();
    if (!cliente.trim() || !descripcion.trim() || cantidad <= 0 || precioUnitario <= 0) {
      setError('Completa el cliente, el producto o servicio, la cantidad y un valor mayor que cero.');
      return;
    }
    setError('');
    setPaso('confirmacion');
  };

  const confirmar = () => {
    const nuevaFactura: FacturaDemo = {
      id: `demo-${Date.now()}`,
      empresaId,
      folio: `MUESTRA-${Date.now().toString().slice(-8)}`,
      cliente: cliente.trim(),
      descripcion: descripcion.trim(),
      cantidad,
      precioUnitario,
      subtotal,
      iva,
      total,
      medioPago,
      fecha: new Date().toLocaleString('es-CO'),
    };
    onConfirmar(nuevaFactura);
    setFacturaCreada(nuevaFactura);
    setPaso('lista');
  };

  const regresar = () => {
    setError('');
    setPaso(paso === 'confirmacion' ? 'datos' : 'orientacion');
  };

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center overflow-y-auto bg-slate-950/60 p-3 backdrop-blur-sm">
      <section
        role="dialog"
        aria-modal="true"
        aria-labelledby="asistente-factura-titulo"
        className="my-auto flex max-h-[94vh] w-full max-w-2xl flex-col overflow-hidden rounded-3xl bg-white shadow-2xl"
      >
        <header className="flex items-start justify-between gap-4 bg-[#0F3963] p-5 text-white">
          <div>
            <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-emerald-300">
              Asistente de facturas de muestra
            </p>
            <h2 id="asistente-factura-titulo" className="mt-1 text-lg font-bold">
              {paso === 'orientacion' ? 'Cuéntanos sobre la venta' :
                paso === 'datos' ? 'Revisa y completa los datos' :
                  paso === 'confirmacion' ? 'Confirma la factura ficticia' : 'Muestra creada'}
            </h2>
            <p className="mt-1 max-w-lg truncate text-xs text-blue-100">{empresaNombre}</p>
          </div>
          {paso !== 'lista' && (
            <button
              type="button"
              onClick={onClose}
              aria-label="Cerrar asistente"
              className="rounded-lg p-2 text-white/80 hover:bg-white/10 hover:text-white"
            >
              <XMarkIcon className="h-5 w-5" />
            </button>
          )}
        </header>

        <div className="overflow-y-auto p-5 md:p-7">
          <div className="mb-5 rounded-2xl border border-amber-200 bg-amber-50 p-3 text-xs leading-relaxed text-amber-950">
            <strong>Demostración:</strong> esta factura es ficticia, solo para presentación. No se guarda
            en el sistema contable ni se envía a la DIAN; no tiene validez tributaria.
          </div>

          {paso === 'orientacion' && (
            <form onSubmit={pasarARevision} className="space-y-4">
              <p className="text-sm leading-relaxed text-slate-600">
                ¿Qué vendiste y a quién? Puedes dictarlo o escribirlo. Incluye el producto o servicio,
                la cantidad, el valor y, si lo sabes, el medio de pago. Después podrás revisar y corregir
                cada dato antes de confirmar.
              </p>
              <label htmlFor="orientacion-venta" className="block text-xs font-bold text-slate-700">
                Describe la venta
              </label>
              <textarea
                id="orientacion-venta"
                required
                rows={4}
                value={orientacion}
                onChange={(event) => setOrientacion(event.target.value)}
                placeholder="Ejemplo: Vendí dos canastas de frutas a María por $80.000 y pagó en efectivo."
                className="w-full resize-y rounded-2xl border border-slate-300 px-4 py-3 text-sm text-slate-800 outline-none transition focus:border-emerald-500 focus:ring-2 focus:ring-emerald-100"
              />
              <div className="flex flex-wrap items-center justify-between gap-3">
                <button
                  type="button"
                  onClick={escuchar}
                  className={`inline-flex items-center gap-2 rounded-xl border px-4 py-2.5 text-sm font-bold transition ${
                    escuchando
                      ? 'border-rose-300 bg-rose-50 text-rose-800'
                      : 'border-blue-200 bg-blue-50 text-[#0F3963] hover:bg-blue-100'
                  }`}
                >
                  <MicrophoneIcon className="h-4 w-4" />
                  {escuchando ? 'Detener dictado' : 'Dictar por voz'}
                </button>
                <span className="text-[11px] text-slate-500">
                  El navegador gestiona el dictado y puede usar su propio servicio de voz.
                </span>
              </div>
              {error && <p role="alert" className="text-xs font-medium text-rose-700">{error}</p>}
              <button
                type="submit"
                className="w-full rounded-xl bg-[#0F3963] px-4 py-3 text-sm font-bold text-white transition hover:bg-[#0b2b4b]"
              >
                Continuar a revisar
              </button>
            </form>
          )}

          {paso === 'datos' && (
            <form onSubmit={pasarAConfirmacion} className="space-y-4">
              <p className="text-xs text-slate-500">
                Completa los campos que falten. La descripción de voz es solo una guía: confirma los
                datos reales de esta muestra.
              </p>
              <div className="grid gap-4 sm:grid-cols-2">
                <label className="text-xs font-bold text-slate-700">
                  Cliente o comprador
                  <input
                    required
                    value={cliente}
                    onChange={(event) => setCliente(event.target.value)}
                    placeholder="Nombre del cliente"
                    className="mt-1.5 w-full rounded-xl border border-slate-300 px-3 py-2.5 font-normal outline-none focus:border-emerald-500"
                  />
                </label>
                <label className="text-xs font-bold text-slate-700">
                  Medio de pago
                  <select
                    value={medioPago}
                    onChange={(event) => setMedioPago(event.target.value)}
                    className="mt-1.5 w-full rounded-xl border border-slate-300 bg-white px-3 py-2.5 font-normal"
                  >
                    {['Efectivo', 'Transferencia', 'Tarjeta', 'Nequi / Bre-B', 'Daviplata', 'Otro'].map((medio) => (
                      <option key={medio}>{medio}</option>
                    ))}
                  </select>
                </label>
              </div>
              <label className="block text-xs font-bold text-slate-700">
                Producto o servicio
                <input
                  required
                  value={descripcion}
                  onChange={(event) => setDescripcion(event.target.value)}
                  className="mt-1.5 w-full rounded-xl border border-slate-300 px-3 py-2.5 font-normal outline-none focus:border-emerald-500"
                />
              </label>
              <div className="grid gap-4 sm:grid-cols-2">
                <label className="text-xs font-bold text-slate-700">
                  Cantidad
                  <input
                    required
                    type="number"
                    min="1"
                    step="1"
                    value={cantidad}
                    onChange={(event) => setCantidad(Number(event.target.value))}
                    className="mt-1.5 w-full rounded-xl border border-slate-300 px-3 py-2.5 font-normal"
                  />
                </label>
                <label className="text-xs font-bold text-slate-700">
                  Valor unitario (COP)
                  <input
                    required
                    type="number"
                    min="1"
                    step="100"
                    value={precioUnitario || ''}
                    onChange={(event) => setPrecioUnitario(Number(event.target.value))}
                    placeholder="0"
                    className="mt-1.5 w-full rounded-xl border border-slate-300 px-3 py-2.5 font-normal"
                  />
                </label>
              </div>
              <label className="flex items-center gap-2 rounded-xl bg-slate-50 p-3 text-xs font-medium text-slate-700">
                <input
                  type="checkbox"
                  checked={incluyeIva}
                  onChange={(event) => setIncluyeIva(event.target.checked)}
                  className="h-4 w-4 accent-emerald-600"
                />
                Incluir IVA ilustrativo del 19% (solo demostración)
              </label>
              <div className="rounded-2xl border border-emerald-200 bg-emerald-50 p-4">
                <div className="flex justify-between text-xs text-slate-600">
                  <span>Subtotal</span><span>{moneda(subtotal)}</span>
                </div>
                <div className="mt-1 flex justify-between text-xs text-slate-600">
                  <span>IVA de muestra</span><span>{moneda(iva)}</span>
                </div>
                <div className="mt-3 flex justify-between border-t border-emerald-200 pt-3 text-sm font-black text-emerald-950">
                  <span>Total estimado</span><span>{moneda(total)}</span>
                </div>
              </div>
              {error && <p role="alert" className="text-xs font-medium text-rose-700">{error}</p>}
              <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-between">
                <button type="button" onClick={regresar} className="rounded-xl border border-slate-300 px-4 py-2.5 text-sm font-bold text-slate-700">
                  <span className="inline-flex items-center gap-1"><ArrowLeftIcon className="h-4 w-4" /> Volver</span>
                </button>
                <button type="submit" className="rounded-xl bg-[#0F3963] px-4 py-2.5 text-sm font-bold text-white">
                  Revisar antes de confirmar
                </button>
              </div>
            </form>
          )}

          {paso === 'confirmacion' && (
            <div className="space-y-5">
              <p className="text-sm text-slate-600">
                Verifica el siguiente resumen. Solo al confirmar se agregará a las muestras temporales de esta sesión.
              </p>
              <dl className="divide-y divide-slate-100 rounded-2xl border border-slate-200 px-4">
                {[
                  ['Empresa', empresaNombre],
                  ['Cliente', cliente.trim()],
                  ['Producto o servicio', descripcion.trim()],
                  ['Cantidad', String(cantidad)],
                  ['Valor unitario', moneda(precioUnitario)],
                  ['Medio de pago', medioPago],
                  ['Subtotal', moneda(subtotal)],
                  ['IVA ilustrativo', moneda(iva)],
                  ['Total de muestra', moneda(total)],
                ].map(([etiqueta, valor]) => (
                  <div key={etiqueta} className="flex flex-wrap justify-between gap-2 py-3 text-sm">
                    <dt className="text-slate-500">{etiqueta}</dt>
                    <dd className="text-right font-semibold text-slate-900">{valor}</dd>
                  </div>
                ))}
              </dl>
              <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-between">
                <button type="button" onClick={regresar} className="rounded-xl border border-slate-300 px-4 py-2.5 text-sm font-bold text-slate-700">
                  Corregir datos
                </button>
                <button
                  type="button"
                  onClick={confirmar}
                  className="inline-flex items-center justify-center gap-2 rounded-xl bg-emerald-600 px-4 py-2.5 text-sm font-bold text-white hover:bg-emerald-700"
                >
                  <CheckCircleIcon className="h-5 w-5" />
                  Confirmar factura ficticia
                </button>
              </div>
            </div>
          )}

          {paso === 'lista' && facturaCreada && (
            <div className="space-y-5 text-center">
              <CheckCircleIcon className="mx-auto h-14 w-14 text-emerald-600" />
              <div>
                <h3 className="text-lg font-black text-slate-900">Muestra confirmada</h3>
                <p className="mt-1 text-sm text-slate-600">
                  {facturaCreada.folio} · {moneda(facturaCreada.total)}
                </p>
              </div>
              <p className="rounded-xl bg-slate-50 p-3 text-xs text-slate-600">
                La factura queda visible únicamente en esta sesión y no se transmitió ni se registró como documento fiscal.
              </p>
              <button
                type="button"
                onClick={onClose}
                className="w-full rounded-xl bg-[#0F3963] px-4 py-3 text-sm font-bold text-white"
              >
                Cerrar
              </button>
            </div>
          )}
        </div>
      </section>
    </div>
  );
};
