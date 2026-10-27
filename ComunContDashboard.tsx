import React, { useState } from 'react';
import { 
  BuildingLibraryIcon, 
  ArrowTrendingUpIcon, 
  ArrowTrendingDownIcon, 
  DocumentCheckIcon, 
  PlusCircleIcon,
  WifiIcon,
  QrCodeIcon,
  UserGroupIcon
} from '@heroicons/react/24/outline';

interface TransaccionReciente {
  id: string;
  origen: 'HORMIGAPP' | 'AICAMPO' | 'MANUAL';
  concepto: string;
  monto: number;
  tipo: 'INGRESO' | 'EGRESO';
  fecha: string;
  cufe?: string;
  estadoDian: 'ACEPTADO' | 'NO_APLICA' | 'PENDIENTE';
}

export const ComunContDashboard: React.FC = () => {
  // Estado local para formulario PWA
  const [modalAbierto, setModalAbierto] = useState<boolean>(false);
  const [offlineSync, setOfflineSync] = useState<boolean>(false);

  // Formulario de Facturación / Registro Comunitario
  const [formData, setFormData] = useState({
    clienteNombre: '',
    clienteDoc: '',
    tipoDoc: '13',
    concepto: '',
    subtotal: 0,
    aplicaIva: false,
    metodoPago: 'EFECTIVO',
    emitirFacturaDian: true
  });

  // Métricas financieras calculadas desde NIIF
  const metricas = {
    ingresosTotales: 8450000,
    gastosTotales: 3120000,
    excedenteNeto: 5330000,
    saldoCajaComunitaria: 6240000,
    facturasEmitidasDian: 42
  };

  const transaccionesRecientes: TransaccionReciente[] = [
    {
      id: 'tx-001',
      origen: 'AICAMPO',
      concepto: 'Venta de Cacao Orgánico (Asoc. Campesina)',
      monto: 1450000,
      tipo: 'INGRESO',
      fecha: '2026-10-26 14:30',
      cufe: 'd7a4b...89cf',
      estadoDian: 'ACEPTADO'
    },
    {
      id: 'tx-002',
      origen: 'HORMIGAPP',
      concepto: 'Pedido #4521 - Tienda El Porvenir',
      monto: 85000,
      tipo: 'INGRESO',
      fecha: '2026-10-26 11:15',
      cufe: 'a12bc...441e',
      estadoDian: 'ACEPTADO'
    },
    {
      id: 'tx-003',
      origen: 'MANUAL',
      concepto: 'Mantenimiento Bomba de Agua JAC Sector Norte',
      monto: 320000,
      tipo: 'EGRESO',
      fecha: '2026-10-25 18:00',
      estadoDian: 'NO_APLICA'
    }
  ];

  const handleRegistrarTransaccion = (e: React.FormEvent) => {
    e.preventDefault();
    alert('Transacción guardada localmente (PWA IndexedDB) y encolada para conciliación NIIF y transmisión DIAN.');
    setModalAbierto(false);
  };

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 font-sans p-4 md:p-8">
      {/* HEADER SUPERIOR */}
      <header className="flex flex-col md:flex-row md:items-center justify-between pb-6 border-b border-slate-200 gap-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="bg-emerald-600 text-white p-2 rounded-xl shadow-md">
              <BuildingLibraryIcon className="w-6 h-6" />
            </span>
            <div>
              <h1 className="text-2xl font-bold text-slate-800">ComunCont</h1>
              <p className="text-sm text-slate-500 font-medium">
                Contabilidad Comunitaria & Facturación DIAN | JAC San Isidro & Ecosistema
              </p>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <div className="flex items-center gap-1.5 px-3 py-1.5 bg-emerald-50 text-emerald-700 rounded-full text-xs font-semibold border border-emerald-200">
            <WifiIcon className="w-4 h-4 text-emerald-600" />
            <span>PWA Sincronizada (En Línea)</span>
          </div>
          <button 
            onClick={() => setModalAbierto(true)}
            className="flex items-center gap-2 bg-emerald-700 hover:bg-emerald-800 text-white px-4 py-2.5 rounded-xl font-medium shadow-md transition-all active:scale-95"
          >
            <PlusCircleIcon className="w-5 h-5" />
            <span>Emitir / Registrar</span>
          </button>
        </div>
      </header>

      {/* TARJETAS DE INDICADORES FINANCIEROS (NIIF) */}
      <section className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 my-6">
        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">Caja & Bancos (11)</span>
            <div className="p-2 bg-blue-50 text-blue-600 rounded-lg">
              <BuildingLibraryIcon className="w-5 h-5" />
            </div>
          </div>
          <div className="mt-3">
            <p className="text-2xl font-extrabold text-slate-800">
              ${metricas.saldoCajaComunitaria.toLocaleString('es-CO')}
            </p>
            <span className="text-xs text-emerald-600 font-semibold flex items-center gap-1 mt-1">
              Disponible para proyectos comunitarios
            </span>
          </div>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">Ingresos Totales (4)</span>
            <div className="p-2 bg-emerald-50 text-emerald-600 rounded-lg">
              <ArrowTrendingUpIcon className="w-5 h-5" />
            </div>
          </div>
          <div className="mt-3">
            <p className="text-2xl font-extrabold text-emerald-700">
              ${metricas.ingresosTotales.toLocaleString('es-CO')}
            </p>
            <span className="text-xs text-slate-500 font-medium">HormigApp + AICampo + Aportes</span>
          </div>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">Costos y Gastos (5/6)</span>
            <div className="p-2 bg-rose-50 text-rose-600 rounded-lg">
              <ArrowTrendingDownIcon className="w-5 h-5" />
            </div>
          </div>
          <div className="mt-3">
            <p className="text-2xl font-extrabold text-rose-600">
              ${metricas.gastosTotales.toLocaleString('es-CO')}
            </p>
            <span className="text-xs text-slate-500 font-medium">Insumos y mantenimiento</span>
          </div>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">Facturas Validadas DIAN</span>
            <div className="p-2 bg-purple-50 text-purple-600 rounded-lg">
              <DocumentCheckIcon className="w-5 h-5" />
            </div>
          </div>
          <div className="mt-3">
            <p className="text-2xl font-extrabold text-purple-700">
              {metricas.facturasEmitidasDian}
            </p>
            <span className="text-xs text-purple-600 font-semibold flex items-center gap-1 mt-1">
              UBL 2.1 con CUFE y QR emitidos
            </span>
          </div>
        </div>
      </section>

      {/* TABLA DE MOVIMIENTOS RECIENTES Y CONCILIACIÓN */}
      <section className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="p-5 border-b border-slate-100 flex items-center justify-between">
          <div>
            <h2 className="text-lg font-bold text-slate-800">Libro Diario & Sincronización del Ecosistema</h2>
            <p className="text-xs text-slate-500">Transacciones automáticas provenientes de HormigApp, AICampo y ventas directas</p>
          </div>
          <span className="text-xs bg-slate-100 text-slate-600 font-semibold px-3 py-1 rounded-md">
            Partida Doble NIIF
          </span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm text-slate-600">
            <thead className="bg-slate-50 text-xs text-slate-400 uppercase font-semibold border-b border-slate-100">
              <tr>
                <th className="px-6 py-3">Origen</th>
                <th className="px-6 py-3">Concepto / Tercero</th>
                <th className="px-6 py-3">Monto (COP)</th>
                <th className="px-6 py-3">Validación DIAN</th>
                <th className="px-6 py-3">Fecha</th>
                <th className="px-6 py-3 text-right">Acciones</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {transaccionesRecientes.map((tx) => (
                <tr key={tx.id} className="hover:bg-slate-50/70 transition-colors">
                  <td className="px-6 py-4">
                    <span className={`px-2.5 py-1 rounded-full text-xs font-bold ${
                      tx.origen === 'AICAMPO' ? 'bg-amber-100 text-amber-800' :
                      tx.origen === 'HORMIGAPP' ? 'bg-indigo-100 text-indigo-800' :
                      'bg-slate-100 text-slate-800'
                    }`}>
                      {tx.origen}
                    </span>
                  </td>
                  <td className="px-6 py-4 font-medium text-slate-800">
                    {tx.concepto}
                  </td>
                  <td className="px-6 py-4 font-bold">
                    <span className={tx.tipo === 'INGRESO' ? 'text-emerald-600' : 'text-rose-600'}>
                      {tx.tipo === 'INGRESO' ? '+' : '-'} ${tx.monto.toLocaleString('es-CO')}
                    </span>
                  </td>
                  <td className="px-6 py-4">
                    {tx.estadoDian === 'ACEPTADO' ? (
                      <div className="flex items-center gap-1.5 text-xs text-emerald-700 font-semibold">
                        <QrCodeIcon className="w-4 h-4 text-emerald-600" />
                        <span>CUFE Validado</span>
                      </div>
                    ) : (
                      <span className="text-xs text-slate-400 font-medium">Doc. Equivalente</span>
                    )}
                  </td>
                  <td className="px-6 py-4 text-xs text-slate-500">
                    {tx.fecha}
                  </td>
                  <td className="px-6 py-4 text-right">
                    <button className="text-xs font-semibold text-emerald-700 hover:text-emerald-900 underline">
                      Ver Asiento
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      {/* MODAL REGISTRAR FACTURA / INGRESO */}
      {modalAbierto && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-lg w-full p-6 shadow-2xl border border-slate-100 animate-in fade-in zoom-in-95 duration-150">
            <div className="flex items-center justify-between pb-4 border-b border-slate-100">
              <h3 className="text-lg font-bold text-slate-800">Emitir Documento / Venta</h3>
              <button 
                onClick={() => setModalAbierto(false)}
                className="text-slate-400 hover:text-slate-600 text-lg font-bold"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleRegistrarTransaccion} className="space-y-4 mt-4">
              <div>
                <label className="block text-xs font-bold text-slate-600 uppercase mb-1">Nombre o Razón Social</label>
                <input 
                  type="text" 
                  required
                  placeholder="Ej: Cooperativa Agropecuaria / Vecino"
                  value={formData.clienteNombre}
                  onChange={(e) => setFormData({...formData, clienteNombre: e.target.value})}
                  className="w-full text-sm px-3.5 py-2.5 rounded-xl border border-slate-300 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-600 uppercase mb-1">Tipo Identificación</label>
                  <select 
                    value={formData.tipoDoc}
                    onChange={(e) => setFormData({...formData, tipoDoc: e.target.value})}
                    className="w-full text-sm px-3.5 py-2.5 rounded-xl border border-slate-300 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                  >
                    <option value="13">Cédula de Ciudadanía</option>
                    <option value="31">NIT</option>
                    <option value="22">Cédula Extranjería</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-600 uppercase mb-1">Número Documento</label>
                  <input 
                    type="text" 
                    required
                    placeholder="1020304050"
                    value={formData.clienteDoc}
                    onChange={(e) => setFormData({...formData, clienteDoc: e.target.value})}
                    className="w-full text-sm px-3.5 py-2.5 rounded-xl border border-slate-300 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-600 uppercase mb-1">Concepto / Producto</label>
                <input 
                  type="text" 
                  required
                  placeholder="Ej: Bulto de Café Pergamino Seco 50kg"
                  value={formData.concepto}
                  onChange={(e) => setFormData({...formData, concepto: e.target.value})}
                  className="w-full text-sm px-3.5 py-2.5 rounded-xl border border-slate-300 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-600 uppercase mb-1">Subtotal (COP)</label>
                  <input 
                    type="number" 
                    required
                    placeholder="250000"
                    value={formData.subtotal || ''}
                    onChange={(e) => setFormData({...formData, subtotal: parseFloat(e.target.value) || 0})}
                    className="w-full text-sm px-3.5 py-2.5 rounded-xl border border-slate-300 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-600 uppercase mb-1">Forma de Pago</label>
                  <select 
                    value={formData.metodoPago}
                    onChange={(e) => setFormData({...formData, metodoPago: e.target.value})}
                    className="w-full text-sm px-3.5 py-2.5 rounded-xl border border-slate-300 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                  >
                    <option value="EFECTIVO">Efectivo Comunitario</option>
                    <option value="NEQUI">Nequi / Daviplata</option>
                    <option value="FIADO">Crédito / Fiado Solidario</option>
                  </select>
                </div>
              </div>

              <div className="pt-2">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input 
                    type="checkbox"
                    checked={formData.emitirFacturaDian}
                    onChange={(e) => setFormData({...formData, emitirFacturaDian: e.target.checked})}
                    className="rounded text-emerald-600 focus:ring-emerald-500 w-4 h-4"
                  />
                  <span className="text-xs font-semibold text-slate-700">
                    Emitir Factura Electrónica Validada ante la DIAN (UBL 2.1)
                  </span>
                </label>
              </div>

              <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setModalAbierto(false)}
                  className="px-4 py-2 text-sm font-semibold text-slate-600 hover:bg-slate-100 rounded-xl"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="px-5 py-2.5 text-sm font-semibold bg-emerald-700 hover:bg-emerald-800 text-white rounded-xl shadow-md transition-all"
                >
                  Confirmar y Contabilizar
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default ComunContDashboard;
