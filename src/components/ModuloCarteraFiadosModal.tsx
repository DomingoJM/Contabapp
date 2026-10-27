import React, { useState } from 'react';
import { 
  CreditCardIcon, 
  XMarkIcon, 
  ChatBubbleLeftRightIcon,
  CheckCircleIcon,
  PlusIcon
} from '@heroicons/react/24/outline';
import { CuentaFiado, EmpresaContable } from '../types';

interface Props {
  isOpen: boolean;
  onClose: () => void;
  empresaActual: EmpresaContable;
}

export const ModuloCarteraFiadosModal: React.FC<Props> = ({ isOpen, onClose, empresaActual }) => {
  const [fiados, setFiados] = useState<CuentaFiado[]>([
    {
      id: 'fia-01',
      clienteNombre: 'Don Carlos Rueda (Vereda El Centro)',
      clienteTelefono: '3158941230',
      concepto: 'Mercado de granos, aceite y café',
      montoTotal: 180000,
      montoAbonado: 60000,
      saldoPendiente: 120000,
      fechaCredito: '2026-10-18',
      fechaLimitePago: '2026-10-31',
      estado: 'ABONADO_PARCIAL'
    },
    {
      id: 'fia-02',
      clienteNombre: 'Doña Gloria Martínez',
      clienteTelefono: '3004567891',
      concepto: '2 Bultos de abono orgánico para siembra',
      montoTotal: 140000,
      montoAbonado: 0,
      saldoPendiente: 140000,
      fechaCredito: '2026-10-22',
      fechaLimitePago: '2026-11-05',
      estado: 'PENDIENTE'
    },
    {
      id: 'fia-03',
      clienteNombre: 'Hernán Darío Celis',
      clienteTelefono: '3187654321',
      concepto: 'Materiales y herramientas de mano',
      montoTotal: 95000,
      montoAbonado: 95000,
      saldoPendiente: 0,
      fechaCredito: '2026-10-10',
      fechaLimitePago: '2026-10-25',
      estado: 'CANCELADO'
    }
  ]);

  const [modalAbono, setModalAbono] = useState<CuentaFiado | null>(null);
  const [montoAbono, setMontoAbono] = useState<number>(0);
  const [metodoAbono, setMetodoAbono] = useState<string>('EFECTIVO');

  if (!isOpen) return null;

  const totalCarteraPendiente = fiados.reduce((acc, f) => acc + f.saldoPendiente, 0);

  const enviarWhatsAppCobro = (fiado: CuentaFiado) => {
    const mensaje = encodeURIComponent(
      `Hola ${fiado.clienteNombre}, un cordial saludo desde ${empresaActual.nombre_razon_social}. Le recordamos su saldo pendiente de $${fiado.saldoPendiente.toLocaleString('es-CO')} por concepto de "${fiado.concepto}". Puede realizar su pago en efectivo o por Nequi/Bre-B al ${empresaActual.telefono}. ¡Muchas gracias!`
    );
    window.open(`https://wa.me/57${fiado.clienteTelefono}?text=${mensaje}`, '_blank');
  };

  const handleAplicarAbono = (e: React.FormEvent) => {
    e.preventDefault();
    if (!modalAbono || montoAbono <= 0) return;

    setFiados(fiados.map(f => {
      if (f.id === modalAbono.id) {
        const nuevoAbonado = f.montoAbonado + montoAbono;
        const nuevoSaldo = Math.max(0, f.montoTotal - nuevoAbonado);
        return {
          ...f,
          montoAbonado: nuevoAbonado,
          saldoPendiente: nuevoSaldo,
          estado: nuevoSaldo === 0 ? 'CANCELADO' : 'ABONADO_PARCIAL'
        };
      }
      return f;
    }));

    alert(`¡Abono de $${montoAbono.toLocaleString('es-CO')} registrado con éxito en Libro Diario NIIF (Cuentas por Cobrar)!`);
    setModalAbono(null);
    setMontoAbono(0);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 overflow-y-auto">
      <div className="bg-white rounded-3xl shadow-2xl border border-slate-200 w-full max-w-4xl overflow-hidden animate-fadeIn my-6 max-h-[90vh] flex flex-col">
        
        {/* Cabecera */}
        <div className="bg-[#0F3963] text-white p-6 relative flex-shrink-0">
          <button 
            onClick={onClose} 
            className="absolute top-5 right-5 text-white/70 hover:text-white p-1 rounded-full hover:bg-white/10 transition-colors"
          >
            <XMarkIcon className="w-6 h-6" />
          </button>
          
          <div className="flex items-center gap-3">
            <div className="p-3 bg-emerald-500/20 text-emerald-300 rounded-2xl">
              <CreditCardIcon className="w-7 h-7" />
            </div>
            <div>
              <h2 className="text-xl font-bold tracking-tight">Control de Cartera, Fiados y Cobranza WhatsApp</h2>
              <p className="text-xs text-slate-300">
                {empresaActual.nombre_razon_social} &bull; Cuentas por Cobrar (Cuenta NIIF 130505)
              </p>
            </div>
          </div>
        </div>

        {/* Resumen Superior */}
        <div className="p-6 border-b border-slate-200 bg-slate-50/70 flex flex-wrap items-center justify-between gap-4">
          <div>
            <span className="text-xs text-slate-500 font-semibold block">Total Cartera Pendiente por Cobrar</span>
            <span className="text-2xl font-black text-rose-700">${totalCarteraPendiente.toLocaleString('es-CO')}</span>
          </div>

          <div className="flex items-center gap-2">
            <span className="text-xs font-bold text-slate-700 bg-white px-3 py-1.5 rounded-xl border border-slate-200 shadow-sm">
              {fiados.filter(f => f.saldoPendiente > 0).length} clientes con saldo pendiente
            </span>
          </div>
        </div>

        {/* Tabla de Fiados */}
        <div className="p-6 overflow-y-auto flex-1">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="border-b border-slate-200 text-slate-400 uppercase font-semibold text-[10px] tracking-wider">
                  <th className="py-2.5 px-3">Cliente / Teléfono</th>
                  <th className="py-2.5 px-3">Concepto</th>
                  <th className="py-2.5 px-3">Vencimiento</th>
                  <th className="py-2.5 px-3 text-right">Total / Abonado</th>
                  <th className="py-2.5 px-3 text-right">Saldo Deudor</th>
                  <th className="py-2.5 px-3 text-center">Acciones</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {fiados.map((f) => (
                  <tr key={f.id} className="hover:bg-slate-50/70 transition-colors">
                    <td className="py-3 px-3">
                      <div className="font-bold text-slate-900">{f.clienteNombre}</div>
                      <div className="text-[11px] text-slate-400">{f.clienteTelefono}</div>
                    </td>
                    <td className="py-3 px-3 text-slate-600 max-w-xs">
                      {f.concepto}
                    </td>
                    <td className="py-3 px-3 text-slate-500 whitespace-nowrap">
                      {f.fechaLimitePago}
                    </td>
                    <td className="py-3 px-3 text-right whitespace-nowrap">
                      <div className="font-bold text-slate-800">${f.montoTotal.toLocaleString('es-CO')}</div>
                      <div className="text-[11px] text-emerald-600 font-semibold">Abono: ${f.montoAbonado.toLocaleString('es-CO')}</div>
                    </td>
                    <td className="py-3 px-3 text-right whitespace-nowrap">
                      <span className={`font-black text-sm ${f.saldoPendiente > 0 ? 'text-rose-600' : 'text-emerald-700'}`}>
                        ${f.saldoPendiente.toLocaleString('es-CO')}
                      </span>
                    </td>
                    <td className="py-3 px-3 text-center whitespace-nowrap">
                      {f.saldoPendiente > 0 ? (
                        <div className="flex items-center justify-center gap-1.5">
                          <button
                            onClick={() => setModalAbono(f)}
                            className="px-2.5 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg font-bold text-[11px] transition-colors shadow-sm"
                          >
                            Abonar
                          </button>
                          <button
                            onClick={() => enviarWhatsAppCobro(f)}
                            title="Enviar recordatorio cordial por WhatsApp"
                            className="p-1.5 bg-green-500 hover:bg-green-600 text-white rounded-lg transition-colors shadow-sm"
                          >
                            <ChatBubbleLeftRightIcon className="w-4 h-4" />
                          </button>
                        </div>
                      ) : (
                        <span className="inline-flex items-center gap-1 text-[11px] font-bold text-emerald-700 bg-emerald-50 px-2.5 py-0.5 rounded-full border border-emerald-200">
                          <CheckCircleIcon className="w-3.5 h-3.5" />
                          Pagado
                        </span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Modal de Registro de Abono */}
        {modalAbono && (
          <div className="fixed inset-0 z-60 flex items-center justify-center bg-black/50 p-4">
            <div className="bg-white rounded-2xl p-6 w-full max-w-sm shadow-2xl border border-slate-200 animate-fadeIn">
              <h3 className="font-bold text-slate-900 text-sm mb-1">Registrar Abono a Cartera</h3>
              <p className="text-xs text-slate-500 mb-4">{modalAbono.clienteNombre} (Debe: ${modalAbono.saldoPendiente.toLocaleString('es-CO')})</p>
              
              <form onSubmit={handleAplicarAbono} className="space-y-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Monto del Abono (COP)</label>
                  <input
                    type="number"
                    max={modalAbono.saldoPendiente}
                    min="1000"
                    step="1000"
                    required
                    value={montoAbono || ''}
                    onChange={(e) => setMontoAbono(Number(e.target.value))}
                    placeholder="0"
                    className="w-full px-3 py-2 rounded-xl border border-slate-300 font-bold text-slate-900 text-sm focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Medio de Pago</label>
                  <select
                    value={metodoAbono}
                    onChange={(e) => setMetodoAbono(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl border border-slate-300 text-xs font-medium focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                  >
                    <option value="EFECTIVO">💵 Efectivo (Caja General)</option>
                    <option value="NEQUI">🟣 Nequi / Bre-B</option>
                    <option value="DAVIPLATA">🔴 Daviplata</option>
                    <option value="BANCOLOMBIA">🟡 Bancolombia Transferencia</option>
                  </select>
                </div>

                <div className="flex items-center justify-end gap-2 pt-2">
                  <button
                    type="button"
                    onClick={() => setModalAbono(null)}
                    className="px-3 py-1.5 text-xs text-slate-600 hover:text-slate-800"
                  >
                    Cancelar
                  </button>
                  <button
                    type="submit"
                    className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs rounded-xl shadow-md transition-all"
                  >
                    Confirmar Abono
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

      </div>
    </div>
  );
};
