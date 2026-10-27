import React, { useState } from 'react';
import { 
  GlobeAltIcon, 
  XMarkIcon, 
  DocumentChartBarIcon, 
  CheckBadgeIcon,
  FolderArrowDownIcon
} from '@heroicons/react/24/outline';
import { EmpresaContable, ProyectoONG } from '../types';

interface Props {
  isOpen: boolean;
  onClose: () => void;
  empresaActual: EmpresaContable;
}

export const ModuloProyectosONGModal: React.FC<Props> = ({ isOpen, onClose, empresaActual }) => {
  const [proyectos, setProyectos] = useState<ProyectoONG[]>([
    {
      id: 'ong-01',
      codigoProyecto: 'COOP-2026-SEG-ALIM',
      nombreProyecto: 'Fortalecimiento de Seguridad Alimentaria y Huertas Caseras',
      donanteFinanciador: 'Fondo de Cooperación Internacional / Pastoral Social',
      presupuestoTotal: 45000000,
      totalEjecutado: 28500000,
      fechaInicio: '2026-06-01',
      fechaFinalizacion: '2026-12-15',
      poblacionBeneficiaria: '85 Familias Campesinas y Madres Comunitarias',
      estado: 'EN_EJECUCION'
    },
    {
      id: 'ong-02',
      codigoProyecto: 'SUBV-2026-JOVENES',
      nombreProyecto: 'Escuelas Digitales de Robótica y Programación Rural',
      donanteFinanciador: 'Alcaldía Municipal - Fondo de Ciencia y Tecnología',
      presupuestoTotal: 25000000,
      totalEjecutado: 12400000,
      fechaInicio: '2026-08-15',
      fechaFinalizacion: '2026-11-30',
      poblacionBeneficiaria: '120 Niños y Jóvenes Escolarizados',
      estado: 'EN_EJECUCION'
    }
  ]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 overflow-y-auto">
      <div className="bg-white rounded-3xl shadow-2xl border border-slate-200 w-full max-w-4xl overflow-hidden animate-fadeIn my-6 max-h-[90vh] flex flex-col">
        
        {/* Encabezado */}
        <div className="bg-[#0F3963] text-white p-6 relative flex-shrink-0">
          <button 
            onClick={onClose} 
            className="absolute top-5 right-5 text-white/70 hover:text-white p-1 rounded-full hover:bg-white/10 transition-colors"
          >
            <XMarkIcon className="w-6 h-6" />
          </button>
          
          <div className="flex items-center gap-3">
            <div className="p-3 bg-purple-500/20 text-purple-300 rounded-2xl">
              <GlobeAltIcon className="w-7 h-7" />
            </div>
            <div>
              <h2 className="text-xl font-bold tracking-tight">Proyectos Sociales, Subvenciones y Cooperación (ONG)</h2>
              <p className="text-xs text-slate-300">
                {empresaActual.nombre_razon_social} &bull; Trazabilidad de fondos donados y rendición de cuentas
              </p>
            </div>
          </div>
        </div>

        {/* Cuerpo */}
        <div className="p-6 md:p-8 space-y-6 overflow-y-auto flex-1">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {proyectos.map((p) => {
              const porcentaje = Math.round((p.totalEjecutado / p.presupuestoTotal) * 100);
              const saldoDisponible = p.presupuestoTotal - p.totalEjecutado;

              return (
                <div key={p.id} className="border border-slate-200 rounded-3xl p-5 bg-white shadow-sm hover:border-[#0F3963]/30 transition-all">
                  <div className="flex items-center justify-between gap-2 mb-2">
                    <span className="text-[10px] font-bold px-2 py-0.5 bg-blue-100 text-[#0F3963] rounded-md">
                      {p.codigoProyecto}
                    </span>
                    <span className="text-[10px] font-bold px-2 py-0.5 bg-emerald-100 text-emerald-800 rounded-md">
                      {p.estado}
                    </span>
                  </div>

                  <h3 className="font-bold text-slate-900 text-sm mb-1">{p.nombreProyecto}</h3>
                  <p className="text-xs text-slate-500 mb-3"><strong>Financiador:</strong> {p.donanteFinanciador}</p>

                  <div className="p-3 bg-slate-50 rounded-2xl border border-slate-100 space-y-2 mb-4 text-xs">
                    <div className="flex justify-between text-slate-600">
                      <span>Presupuesto Aprobado:</span>
                      <strong className="text-slate-900">${p.presupuestoTotal.toLocaleString('es-CO')}</strong>
                    </div>
                    <div className="flex justify-between text-slate-600">
                      <span>Total Ejecutado:</span>
                      <strong className="text-emerald-700">${p.totalEjecutado.toLocaleString('es-CO')} ({porcentaje}%)</strong>
                    </div>
                    <div className="flex justify-between text-slate-600">
                      <span>Saldo Disponible:</span>
                      <strong className="text-blue-900">${saldoDisponible.toLocaleString('es-CO')}</strong>
                    </div>

                    {/* Barra de Progreso */}
                    <div className="w-full bg-slate-200 h-2 rounded-full overflow-hidden mt-2">
                      <div className="bg-emerald-600 h-2 rounded-full transition-all duration-500" style={{ width: `${porcentaje}%` }} />
                    </div>
                  </div>

                  <div className="flex items-center justify-between text-xs pt-1 border-t border-slate-100">
                    <span className="text-[11px] text-slate-400">Población: {p.poblacionBeneficiaria}</span>
                    <button 
                      onClick={() => alert(`Generando Informe Financiero de Rendición para ${p.donanteFinanciador}...`)}
                      className="flex items-center gap-1 text-[11px] font-bold text-[#0F3963] hover:underline"
                    >
                      <FolderArrowDownIcon className="w-4 h-4 text-emerald-600" />
                      <span>Rendir Cuentas</span>
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Footer */}
        <div className="p-5 border-t border-slate-200 bg-slate-50 flex items-center justify-between flex-shrink-0">
          <button onClick={onClose} className="px-4 py-2 text-xs font-semibold text-slate-600 hover:text-slate-800">
            Cerrar
          </button>
          <button 
            onClick={() => alert('Creación de nuevo proyecto social guiado por rubros.')}
            className="flex items-center gap-1.5 px-4 py-2.5 rounded-xl bg-[#0F3963] hover:bg-[#0b2b4b] text-white text-xs font-bold transition-all shadow-md"
          >
            <DocumentChartBarIcon className="w-4 h-4 text-emerald-400" />
            <span>Formular Nuevo Proyecto</span>
          </button>
        </div>

      </div>
    </div>
  );
};
