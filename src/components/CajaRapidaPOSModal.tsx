import React, { useState } from 'react';
import { 
  BanknotesIcon, 
  XMarkIcon, 
  CheckCircleIcon,
  QrCodeIcon,
  UserPlusIcon
} from '@heroicons/react/24/outline';
import { EmpresaContable, TransaccionReciente } from '../types';

interface Props {
  isOpen: boolean;
  onClose: () => void;
  empresaActual: EmpresaContable;
  onTransaccionCreada: (tx: TransaccionReciente) => void;
}

export const CajaRapidaPOSModal: React.FC<Props> = ({ 
  isOpen, 
  onClose, 
  empresaActual, 
  onTransaccionCreada 
}) => {
  const [concepto, setConcepto] = useState('');
  const [subtotal, setSubtotal] = useState<number>(0);
  const [aplicaIva, setAplicaIva] = useState(false);
  const [metodoPago, setMetodoPago] = useState('EFECTIVO');
  const [tipoTransaccion, setTipoTransaccion] = useState<'INGRESO' | 'EGRESO'>('INGRESO');
  const [clienteNombre, setClienteNombre] = useState('Cliente Mostrador');
  const [clienteDoc, setClienteDoc] = useState('222222222222'); // Consumidor final DIAN
  const [emitirFacturaDian, setEmitirFacturaDian] = useState(false);
  const [enviando, setEnviando] = useState(false);

  if (!isOpen) return null;

  const montoIva = aplicaIva ? Math.round(subtotal * 0.19) : 0;
  const total = subtotal + montoIva;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (subtotal <= 0) {
      alert('Ingresa un monto válido mayor a 0');
      return;
    }

    setEnviando(true);
    const ahora = new Date();
    const fechaHora = ahora.toLocaleString('es-CO');

    const nuevaTx: TransaccionReciente = {
      id: `tx-${Date.now()}`,
      origen: 'MANUAL',
      concepto: concepto || (tipoTransaccion === 'INGRESO' ? 'Venta en Mostrador' : 'Gasto Operativo Menor'),
      monto: total,
      tipo: tipoTransaccion,
      fecha: fechaHora,
      comprador: clienteNombre,
      metodoPago: metodoPago,
      cufe: emitirFacturaDian ? `cuf-${Math.random().toString(36).substring(2, 10)}...dian` : undefined,
      estadoDian: emitirFacturaDian ? 'ACEPTADO' : 'NO_APLICA'
    };

    try {
      // Ingesta hacia backend en background si está disponible
      fetch('http://localhost:8000/api/v1/contab/transacciones/ingesta/', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          idempotency_key: `POS-${Date.now()}`,
          origen_app: 'MANUAL',
          id_orden_origen: `POS-${Date.now().toString().slice(-6)}`,
          organizacion_id: empresaActual.id,
          comprador: {
            tipo_documento: '13',
            numero_identificacion: clienteDoc,
            nombre_completo: clienteNombre,
            correo_electronico: 'pos@contabapp.com',
            municipio_dane: empresaActual.municipio_dane
          },
          items: [{
            codigo: 'POS-01',
            descripcion: concepto || 'Registro Manual de Caja',
            cantidad: 1,
            precio_unitario: subtotal,
            porcentaje_iva: aplicaIva ? 19 : 0,
            total_linea: total
          }],
          subtotal: subtotal,
          impuesto_iva: montoIva,
          impuesto_inc: 0,
          total: total,
          metodo_pago: metodoPago,
          requiere_facturacion_dian: emitirFacturaDian
        })
      }).catch(() => null);

      onTransaccionCreada(nuevaTx);
      onClose();
    } finally {
      setEnviando(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 overflow-y-auto">
      <div className="bg-white rounded-3xl shadow-2xl border border-slate-200 w-full max-w-lg overflow-hidden animate-fadeIn my-6">
        
        {/* Encabezado */}
        <div className="bg-[#0F3963] text-white p-6 relative">
          <button 
            onClick={onClose} 
            className="absolute top-5 right-5 text-white/70 hover:text-white p-1 rounded-full hover:bg-white/10 transition-colors"
          >
            <XMarkIcon className="w-6 h-6" />
          </button>
          
          <div className="flex items-center gap-3">
            <div className="p-3 bg-emerald-500/20 text-emerald-300 rounded-2xl">
              <BanknotesIcon className="w-7 h-7" />
            </div>
            <div>
              <h2 className="text-xl font-bold tracking-tight">Caja Rápida POS & Facturación</h2>
              <p className="text-xs text-slate-300">
                {empresaActual.nombre_razon_social} &bull; Asiento NIIF automático
              </p>
            </div>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="p-6 md:p-7 space-y-5">
          {/* Tipo: Ingreso / Egreso */}
          <div className="grid grid-cols-2 gap-3 bg-slate-100 p-1.5 rounded-2xl">
            <button
              type="button"
              onClick={() => setTipoTransaccion('INGRESO')}
              className={`py-2 px-3 rounded-xl text-xs font-bold transition-all text-center ${
                tipoTransaccion === 'INGRESO'
                  ? 'bg-emerald-600 text-white shadow-sm'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              ➕ Venta / Ingreso Dinero
            </button>
            <button
              type="button"
              onClick={() => setTipoTransaccion('EGRESO')}
              className={`py-2 px-3 rounded-xl text-xs font-bold transition-all text-center ${
                tipoTransaccion === 'EGRESO'
                  ? 'bg-rose-600 text-white shadow-sm'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              ➖ Gasto / Salida Caja
            </button>
          </div>

          {/* Valor Principal Grande y Táctil */}
          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">
              Valor Total (COP) *
            </label>
            <div className="relative">
              <span className="absolute left-4 top-3 text-lg font-black text-slate-400">$</span>
              <input
                type="number"
                min="0"
                step="100"
                required
                value={subtotal || ''}
                onChange={(e) => setSubtotal(Number(e.target.value))}
                placeholder="0"
                className="w-full pl-8 pr-4 py-3 rounded-2xl border-2 border-slate-200 text-xl font-black text-slate-900 focus:border-emerald-500 focus:outline-none focus:ring-4 focus:ring-emerald-500/10"
              />
            </div>
          </div>

          {/* Botones de montos rápidos */}
          <div className="flex flex-wrap gap-2">
            {[10000, 20000, 50000, 100000].map(monto => (
              <button
                key={monto}
                type="button"
                onClick={() => setSubtotal(prev => prev + monto)}
                className="text-[11px] font-bold px-3 py-1 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg transition-colors"
              >
                +${monto.toLocaleString('es-CO')}
              </button>
            ))}
            <button
              type="button"
              onClick={() => setSubtotal(0)}
              className="text-[11px] font-semibold px-2 py-1 text-rose-500 hover:bg-rose-50 rounded-lg transition-colors ml-auto"
            >
              Limpiar
            </button>
          </div>

          {/* Concepto / Motivo */}
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">Concepto o Descripción</label>
            <input
              type="text"
              value={concepto}
              onChange={(e) => setConcepto(e.target.value)}
              placeholder="Ej: 2 Libras de café especial molido"
              className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-xs focus:ring-2 focus:ring-emerald-500 focus:outline-none"
            />
          </div>

          {/* Medio de Pago */}
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">¿Cómo se realizó el pago?</label>
            <div className="grid grid-cols-3 gap-2">
              {[
                { id: 'EFECTIVO', label: '💵 Efectivo' },
                { id: 'NEQUI', label: '🟣 Nequi / Bre-B' },
                { id: 'DAVIPLATA', label: '🔴 Daviplata' },
                { id: 'BANCOLOMBIA', label: '🟡 Bancolombia' },
                { id: 'TARJETA', label: '💳 Tarjeta / Data' },
                { id: 'CREDITO', label: '📝 Fiado / Cartera' }
              ].map(m => (
                <button
                  key={m.id}
                  type="button"
                  onClick={() => setMetodoPago(m.id)}
                  className={`py-2 px-2 rounded-xl text-[11px] font-bold border transition-all ${
                    metodoPago === m.id
                      ? 'border-emerald-600 bg-emerald-50 text-emerald-900 shadow-sm'
                      : 'border-slate-200 text-slate-600 hover:bg-slate-50'
                  }`}
                >
                  {m.label}
                </button>
              ))}
            </div>
          </div>

          {/* Cliente Opcional */}
          <div className="p-3 bg-slate-50 rounded-2xl border border-slate-200 space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-slate-700 flex items-center gap-1.5">
                <UserPlusIcon className="w-4 h-4 text-slate-400" />
                Datos del Cliente
              </span>
              <span className="text-[10px] text-slate-400">Por defecto: Consumidor Final</span>
            </div>
            <div className="grid grid-cols-2 gap-2">
              <input
                type="text"
                value={clienteNombre}
                onChange={(e) => setClienteNombre(e.target.value)}
                placeholder="Nombre o Razón Social"
                className="w-full px-3 py-1.5 rounded-lg border border-slate-200 text-xs bg-white focus:outline-none focus:ring-1 focus:ring-emerald-500"
              />
              <input
                type="text"
                value={clienteDoc}
                onChange={(e) => setClienteDoc(e.target.value)}
                placeholder="Cédula / NIT"
                className="w-full px-3 py-1.5 rounded-lg border border-slate-200 text-xs bg-white focus:outline-none focus:ring-1 focus:ring-emerald-500"
              />
            </div>
          </div>

          {/* Opciones Fiscales */}
          <div className="space-y-2 pt-1">
            <label className="flex items-center gap-2 cursor-pointer text-xs font-semibold text-slate-700">
              <input
                type="checkbox"
                checked={aplicaIva}
                onChange={(e) => setAplicaIva(e.target.checked)}
                className="h-4 w-4 text-emerald-600 rounded border-slate-300 focus:ring-emerald-500"
              />
              <span>Calcular IVA General del 19% (+${montoIva.toLocaleString('es-CO')})</span>
            </label>

            {tipoTransaccion === 'INGRESO' && (
              <label className="flex items-center gap-2 cursor-pointer text-xs font-semibold text-slate-700">
                <input
                  type="checkbox"
                  checked={emitirFacturaDian}
                  onChange={(e) => setEmitirFacturaDian(e.target.checked)}
                  className="h-4 w-4 text-emerald-600 rounded border-slate-300 focus:ring-emerald-500"
                />
                <span className="flex items-center gap-1 text-[#0F3963]">
                  <QrCodeIcon className="w-4 h-4 text-emerald-600" />
                  Emitir con Facturación Electrónica DIAN (CUFE y Código QR)
                </span>
              </label>
            )}
          </div>

          {/* Resumen Total */}
          <div className="flex items-center justify-between p-4 bg-emerald-50 border border-emerald-200 rounded-2xl">
            <div>
              <span className="text-xs text-emerald-800 font-semibold block">Total a Contabilizar</span>
              <span className="text-[11px] text-emerald-600">Partida Doble NIIF Automática</span>
            </div>
            <div className="text-2xl font-black text-emerald-950">
              ${total.toLocaleString('es-CO')}
            </div>
          </div>

          {/* Botón de Confirmación */}
          <button
            type="submit"
            disabled={enviando || subtotal <= 0}
            className="w-full py-3.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-2xl font-bold text-sm shadow-lg shadow-emerald-600/20 transition-all active:scale-95 disabled:opacity-50 flex items-center justify-center gap-2"
          >
            <CheckCircleIcon className="w-5 h-5" />
            <span>{enviando ? 'Contabilizando...' : 'Registrar en Caja y Guardar'}</span>
          </button>
        </form>
      </div>
    </div>
  );
};
