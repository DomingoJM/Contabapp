import React from 'react';
import { 
  XMarkIcon,
  DocumentArrowDownIcon,
  PrinterIcon,
  BuildingLibraryIcon,
  ScaleIcon,
  ArrowTrendingUpIcon,
  ArrowTrendingDownIcon
} from '@heroicons/react/24/outline';
import { EmpresaContable, MetricasFinancieras, TransaccionReciente } from '../types';

interface Props {
  isOpen: boolean;
  onClose: () => void;
  empresaActual: EmpresaContable;
  metricas: MetricasFinancieras;
  transacciones: TransaccionReciente[];
}

export const ReportesInformesModal: React.FC<Props> = ({
  isOpen,
  onClose,
  empresaActual,
  metricas,
  transacciones
}) => {
  if (!isOpen) return null;

  const handleImprimir = () => {
    window.print();
  };

  const exportarCSV = () => {
    const headers = 'ID,Origen,Concepto,Monto,Tipo,Fecha,MetodoPago,EstadoDIAN,CUFE\n';
    const filas = transacciones.map(t => 
      `"${t.id}","${t.origen}","${t.concepto}",${t.monto},"${t.tipo}","${t.fecha}","${t.metodoPago}","${t.estadoDian}","${t.cufe || ''}"`
    ).join('\n');

    const blob = new Blob([headers + filas], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', `Libro_Diario_${empresaActual.nombre_razon_social}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 overflow-y-auto">
      <div className="bg-white rounded-3xl shadow-2xl border border-slate-200 w-full max-w-3xl overflow-hidden animate-fadeIn my-6 max-h-[90vh] flex flex-col">
        
        {/* Encabezado */}
        <div className="bg-[#0F3963] text-white p-6 relative flex-shrink-0">
          <button 
            onClick={onClose} 
            className="absolute top-5 right-5 text-white/70 hover:text-white p-1 rounded-full hover:bg-white/10 transition-colors"
          >
            <XMarkIcon className="w-6 h-6" />
          </button>
          
          <div className="flex items-center gap-3">
            <div className="p-3 bg-emerald-500/20 text-emerald-300 rounded-2xl">
              <ScaleIcon className="w-7 h-7" />
            </div>
            <div>
              <h2 className="text-xl font-bold tracking-tight">Centro de Reportes NIIF y DIAN</h2>
              <p className="text-xs text-slate-300">
                {empresaActual.nombre_razon_social} &bull; NIT: {empresaActual.nit_o_cedula}
              </p>
            </div>
          </div>
        </div>

        {/* Cuerpo del Reporte */}
        <div className="p-6 md:p-8 space-y-6 overflow-y-auto flex-1">
          
          {/* ESTADO DE RESULTADOS NIIF */}
          <div className="border border-slate-200 rounded-2xl p-5 bg-slate-50/50">
            <div className="flex items-center justify-between pb-3 border-b border-slate-200">
              <div className="flex items-center gap-2">
                <BuildingLibraryIcon className="w-5 h-5 text-emerald-600" />
                <h3 className="font-bold text-slate-900 text-sm">Estado de Resultados Integral (NIIF Microempresas / ESAL)</h3>
              </div>
              <span className="text-[11px] bg-emerald-100 text-emerald-800 font-semibold px-2.5 py-0.5 rounded-full">
                Periodo Actual
              </span>
            </div>

            <div className="divide-y divide-slate-100 text-xs mt-3">
              <div className="py-2.5 flex justify-between items-center text-slate-700">
                <span className="flex items-center gap-1.5 font-medium">
                  <ArrowTrendingUpIcon className="w-4 h-4 text-emerald-600" />
                  Ingresos Operacionales (Comercio, Cosechas, Terapias, Suscripciones)
                </span>
                <span className="font-bold text-emerald-700">+${metricas.totalIngresos.toLocaleString('es-CO')}</span>
              </div>
              <div className="py-2.5 flex justify-between items-center text-slate-700">
                <span className="flex items-center gap-1.5 font-medium">
                  <ArrowTrendingDownIcon className="w-4 h-4 text-rose-500" />
                  Costos de Mercancía y Cosechas (Clase 6)
                </span>
                <span className="font-bold text-rose-600">-${metricas.totalCostos.toLocaleString('es-CO')}</span>
              </div>
              <div className="py-2.5 flex justify-between items-center text-slate-700">
                <span className="flex items-center gap-1.5 font-medium">
                  <ArrowTrendingDownIcon className="w-4 h-4 text-amber-500" />
                  Gastos de Administración y Servicios (Clase 5)
                </span>
                <span className="font-bold text-amber-700">-${metricas.totalGastos.toLocaleString('es-CO')}</span>
              </div>
              <div className="py-3 flex justify-between items-center bg-emerald-50/60 px-3 rounded-xl mt-2 font-bold text-sm">
                <span className="text-emerald-950 font-black">
                  {empresaActual.esal_sin_animo_lucro ? 'Excedente Neto Comunitario:' : 'Utilidad Neta del Ejercicio:'}
                </span>
                <span className="text-emerald-800 text-base font-black">
                  ${metricas.excedenteNeto.toLocaleString('es-CO')}
                </span>
              </div>
            </div>
          </div>

          {/* BALANCE Y DISPONIBILIDAD DE CAJA */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="p-4 rounded-2xl border border-slate-200 bg-white shadow-sm">
              <span className="text-xs text-slate-500 block mb-1">Efectivo Disponible (Caja + Billeteras)</span>
              <span className="text-xl font-black text-slate-900">${metricas.saldoCajaBancos.toLocaleString('es-CO')}</span>
              <p className="text-[11px] text-slate-400 mt-1">Cuentas 110505 (Efectivo) y 111010 (Nequi/Bre-B)</p>
            </div>
            <div className="p-4 rounded-2xl border border-slate-200 bg-white shadow-sm">
              <span className="text-xs text-slate-500 block mb-1">Facturas Electrónicas Emitidas DIAN</span>
              <span className="text-xl font-black text-[#0F3963]">{metricas.facturasEmitidasDian} comprobantes</span>
              <p className="text-[11px] text-slate-400 mt-1">UBL 2.1 con validación previa DIAN</p>
            </div>
          </div>

          {/* INFORMACIÓN EXÓGENA DIAN */}
          <div className="p-4 bg-blue-50 border border-blue-100 rounded-2xl">
            <h4 className="text-xs font-bold text-[#0F3963] mb-1">
              📊 Exportación para Información Exógena (Medios Magnéticos DIAN)
            </h4>
            <p className="text-[11px] text-slate-600">
              Formato 1007 (Ingresos Propios) y Formato 1001 (Pagos a Terceros) listos para compaginar con el prevalidador DIAN.
            </p>
          </div>
        </div>

        {/* Acciones de Exportación e Impresión */}
        <div className="p-5 border-t border-slate-200 bg-slate-50 flex items-center justify-between flex-shrink-0">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 text-xs font-semibold text-slate-600 hover:text-slate-800"
          >
            Cerrar
          </button>
          
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={handleImprimir}
              className="flex items-center gap-1.5 px-4 py-2.5 rounded-xl border border-slate-200 bg-white text-slate-700 hover:bg-slate-100 text-xs font-bold transition-all shadow-sm"
            >
              <PrinterIcon className="w-4 h-4 text-slate-500" />
              <span>Imprimir / PDF</span>
            </button>
            <button
              type="button"
              onClick={exportarCSV}
              className="flex items-center gap-1.5 px-5 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold transition-all shadow-md shadow-emerald-600/20 active:scale-95"
            >
              <DocumentArrowDownIcon className="w-4 h-4" />
              <span>Descargar Excel / CSV</span>
            </button>
          </div>
        </div>

      </div>
    </div>
  );
};
