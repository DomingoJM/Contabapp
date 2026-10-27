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
  const [mostrarDetalleCliente, setMostrarDetalleCliente] = useState(false);
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
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-3 md:p-4 overflow-y-auto">
      {/* Modal compacto, adaptativo con max-h y scroll interno */}
      <div className="bg-white rounded-3xl shadow-2xl border border-slate-200 w-full max-w-md overflow-hidden animate-fadeIn my-auto max-h-[92vh] flex flex-col">
        
        {/* Encabezado Compacto */}
        <div className="bg-[#0F3963] text-white px-5 py-4 relative flex-shrink-0">
          <button 
            onClick={onClose} 
            className="absolute top-4 right-4 text-white/70 hover:text-white p-1 rounded-full hover:bg-white/10 transition-colors"
          >
            <XMarkIcon className="w-5 h-5" />
          </button>
          
          <div className="flex items-center gap-2.5">
            <div className="p-2 bg-emerald-500/20 text-emerald-300 rounded-xl">
              <BanknotesIcon className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-bold tracking-tight">Caja Rápida POS & Facturación</h2>
              <p className="text-[11px] text-slate-300 truncate max-w-[280px]">
                {empresaActual.nombre_razon_social}
              </p>
            </div>
          </div>
        </div>

        {/* Formulario con scroll vertical fluido */}
        <form onSubmit={handleSubmit} className="p-4 md:p-5 space-y-3.5 overflow-y-auto flex-1 text-xs">
          
          {/* Selector Ingreso / Egreso */}
          <div className="grid grid-cols-2 gap-2 bg-slate-100 p-1 rounded-xl">
            <button
              type="button"
              onClick={() => setTipoTransaccion('INGRESO')}
              className={`py-1.5 px-2 rounded-lg font-bold text-[11px] transition-all text-center ${
                tipoTransaccion === 'INGRESO'
                  ? 'bg-emerald-600 text-white shadow-sm'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              + Venta / Ingreso
            </button>
            <button
              type="button"
              onClick={() => setTipoTransaccion('EGRESO')}
              className={`py-1.5 px-2 rounded-lg font-bold text-[11px] transition-all text-center ${
                tipoTransaccion === 'EGRESO'
                  ? 'bg-rose-600 text-white shadow-sm'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              - Gasto / Salida
            </button>
          </div>

          {/* Campo de Valor Principal */}
          <div>
            <div className="flex items-center justify-between mb-1">
              <label className="font-bold text-slate-700">Valor (COP) *</label>
              {subtotal > 0 && (
                <button
                  type="button"
                  onClick={() => setSubtotal(0)}
                  className="text-[10px] font-semibold text-rose-500 hover:underline"
                >
                  Borrar
                </button>
              )}
            </div>
            <div className="relative">
              <span className="absolute left-3.5 top-2 text-base font-black text-slate-400">$</span>
              <input
                type="number"
                min="0"
                step="100"
                required
                value={subtotal || ''}
                onChange={(e) => setSubtotal(Number(e.target.value))}
                placeholder="0"
                className="w-full pl-7 pr-3 py-2 rounded-xl border border-slate-300 text-lg font-black text-slate-900 focus:border-emerald-500 focus:outline-none focus:ring-2 focus:ring-emerald-500/10"
              />
            </div>
          </div>

          {/* Botones de incremento rápido */}
          <div className="flex items-center gap-1.5">
            {[10000, 20000, 50000, 100000].map(monto => (
              <button
                key={monto}
                type="button"
                onClick={() => setSubtotal(prev => prev + monto)}
                className="flex-1 text-[10px] font-bold py-1 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg transition-colors text-center"
              >
                +{(monto / 1000)}k
              </button>
            ))}
          </div>

          {/* Concepto */}
          <div>
            <label className="block font-semibold text-slate-700 mb-1">Concepto o Descripción</label>
            <input
              type="text"
              value={concepto}
              onChange={(e) => setConcepto(e.target.value)}
              placeholder="Ej: 2 Libras de café especial molido"
              className="w-full px-3 py-1.5 rounded-xl border border-slate-200 text-xs focus:ring-1 focus:ring-emerald-500 focus:outline-none"
            />
          </div>

          {/* Medio de Pago */}
          <div>
            <label className="block font-semibold text-slate-700 mb-1">Medio de Pago</label>
            <div className="grid grid-cols-3 gap-1.5">
              {[
                { id: 'EFECTIVO', label: '💵 Efectivo' },
                { id: 'NEQUI', label: '🟣 Nequi/Bre-B' },
                { id: 'DAVIPLATA', label: '🔴 Daviplata' },
                { id: 'BANCOLOMBIA', label: '🟡 Bancolombia' },
                { id: 'TARJETA', label: '💳 Data / Tarjeta' },
                { id: 'CREDITO', label: '📝 Fiado' }
              ].map(m => (
                <button
                  key={m.id}
                  type="button"
                  onClick={() => setMetodoPago(m.id)}
                  className={`py-1.5 px-1.5 rounded-lg text-[10px] font-bold border transition-all text-center truncate ${
                    metodoPago === m.id
                      ? 'border-emerald-600 bg-emerald-50 text-emerald-900 shadow-xs'
                      : 'border-slate-200 text-slate-600 hover:bg-slate-50'
                  }`}
                >
                  {m.label}
                </button>
              ))}
            </div>
          </div>

          {/* Datos del Cliente Colapsables */}
          <div className="border border-slate-200 rounded-xl p-2.5 bg-slate-50/70">
            <button
              type="button"
              onClick={() => setMostrarDetalleCliente(!mostrarDetalleCliente)}
              className="w-full flex items-center justify-between text-[11px] font-bold text-slate-700 hover:text-[#0F3963]"
            >
              <span className="flex items-center gap-1">
                <UserPlusIcon className="w-3.5 h-3.5 text-slate-400" />
                {mostrarDetalleCliente ? 'Ocultar Cliente' : 'Identificar Cliente (Opcional)'}
              </span>
              <span className="text-[10px] text-slate-400">
                {mostrarDetalleCliente ? '▲' : '▼ Consumidor Final'}
              </span>
            </button>

            {mostrarDetalleCliente && (
              <div className="grid grid-cols-2 gap-2 mt-2 pt-2 border-t border-slate-200">
                <input
                  type="text"
                  value={clienteNombre}
                  onChange={(e) => setClienteNombre(e.target.value)}
                  placeholder="Nombre Cliente"
                  className="w-full px-2.5 py-1 rounded-lg border border-slate-200 text-[11px] bg-white focus:outline-none focus:ring-1 focus:ring-emerald-500"
                />
                <input
                  type="text"
                  value={clienteDoc}
                  onChange={(e) => setClienteDoc(e.target.value)}
                  placeholder="Cédula / NIT"
                  className="w-full px-2.5 py-1 rounded-lg border border-slate-200 text-[11px] bg-white focus:outline-none focus:ring-1 focus:ring-emerald-500"
                />
              </div>
            )}
          </div>

          {/* Opciones Fiscales Compactas */}
          <div className="space-y-1.5 pt-0.5">
            <label className="flex items-center gap-2 cursor-pointer font-medium text-slate-700 text-[11px]">
              <input
                type="checkbox"
                checked={aplicaIva}
                onChange={(e) => setAplicaIva(e.target.checked)}
                className="h-3.5 w-3.5 text-emerald-600 rounded border-slate-300 focus:ring-emerald-500"
              />
              <span>Calcular IVA 19% (+${montoIva.toLocaleString('es-CO')})</span>
            </label>

            {tipoTransaccion === 'INGRESO' && (
              <label className="flex items-center gap-2 cursor-pointer font-medium text-[#0F3963] text-[11px]">
                <input
                  type="checkbox"
                  checked={emitirFacturaDian}
                  onChange={(e) => setEmitirFacturaDian(e.target.checked)}
                  className="h-3.5 w-3.5 text-emerald-600 rounded border-slate-300 focus:ring-emerald-500"
                />
                <span className="flex items-center gap-1">
                  <QrCodeIcon className="w-3.5 h-3.5 text-emerald-600" />
                  Emitir con Factura Electrónica DIAN (CUFE)
                </span>
              </label>
            )}
          </div>

          {/* Barra de Total y Botón de Envío */}
          <div className="flex items-center justify-between p-2.5 bg-emerald-50 border border-emerald-200 rounded-xl">
            <div>
              <span className="text-[10px] text-emerald-800 font-semibold block">Total a Asentar</span>
              <span className="text-[9px] text-emerald-600 font-medium">Partida Doble NIIF</span>
            </div>
            <div className="text-lg font-black text-emerald-950">
              ${total.toLocaleString('es-CO')}
            </div>
          </div>

          <button
            type="submit"
            disabled={enviando || subtotal <= 0}
            className="w-full py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl font-bold text-xs shadow-md shadow-emerald-600/20 transition-all active:scale-95 disabled:opacity-50 flex items-center justify-center gap-1.5"
          >
            <CheckCircleIcon className="w-4 h-4" />
            <span>{enviando ? 'Guardando...' : 'Registrar en Caja y Guardar'}</span>
          </button>
        </form>
      </div>
    </div>
  );
};
