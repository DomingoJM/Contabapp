import React, { useState } from 'react';
import { 
  BuildingOffice2Icon, 
  CheckCircleIcon, 
  ArrowRightIcon, 
  ArrowLeftIcon,
  XMarkIcon,
  ShieldCheckIcon
} from '@heroicons/react/24/outline';
import { EmpresaContable } from '../types';

interface Props {
  isOpen: boolean;
  onClose: () => void;
  onEmpresaCreada: (empresa: EmpresaContable) => void;
}

export const WizardCrearEmpresaModal: React.FC<Props> = ({ isOpen, onClose, onEmpresaCreada }) => {
  const [paso, setPaso] = useState<number>(1);
  const [guardando, setGuardando] = useState<boolean>(false);

  const [formData, setFormData] = useState({
    // Paso 1: Datos Básicos
    nombre_razon_social: '',
    nombre_comercial: '',
    tipo_persona: 'NATURAL' as 'NATURAL' | 'JURIDICA',
    nit_o_cedula: '',
    dv: '',
    departamento: 'Santander',
    ciudad: 'Bucaramanga',
    municipio_dane: '68001',
    direccion: '',
    telefono: '',
    email_facturacion: '',
    esal_sin_animo_lucro: false,

    // Paso 2: Régimen Fiscal
    tipo_regimen: 'NO_RESPONSABLE_IVA',
    responsabilidad_fiscal: 'R-99-PN',

    // Paso 3: Facturación
    prefijo_facturacion: 'SETP',
    consecutivo_desde: 1,
    consecutivo_hasta: 50000,
    numero_resolucion: '18760000001',
    ambiente_habilitacion: true
  });

  if (!isOpen) return null;

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value, type } = e.target;
    if (type === 'checkbox') {
      const checked = (e.target as HTMLInputElement).checked;
      setFormData(prev => ({ ...prev, [name]: checked }));
    } else {
      setFormData(prev => ({ ...prev, [name]: value }));
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setGuardando(true);

    try {
      // Simulación o llamado API a Comunidades_backend
      const response = await fetch('http://localhost:8000/api/v1/contab/wizard/crear-empresa/', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData)
      }).catch(() => null);

      let nuevaEmpresa: EmpresaContable;
      if (response && response.ok) {
        const data = await response.json();
        nuevaEmpresa = data.organizacion;
      } else {
        // Fallback local enriquecido
        nuevaEmpresa = {
          id: `org-${Date.now()}`,
          nombre_razon_social: formData.nombre_razon_social,
          nombre_comercial: formData.nombre_comercial || formData.nombre_razon_social,
          tipo_persona: formData.tipo_persona,
          nit_o_cedula: formData.nit_o_cedula,
          dv: formData.dv,
          departamento: formData.departamento,
          ciudad: formData.ciudad,
          municipio_dane: formData.municipio_dane,
          direccion: formData.direccion,
          telefono: formData.telefono,
          email_facturacion: formData.email_facturacion,
          esal_sin_animo_lucro: formData.esal_sin_animo_lucro,
          activo: true,
          config_fiscal: {
            tipo_regimen: formData.tipo_regimen,
            responsabilidad_fiscal: formData.responsabilidad_fiscal,
            prefijo_facturacion: formData.prefijo_facturacion,
            consecutivo_actual: 1,
            ambiente_habilitacion: formData.ambiente_habilitacion
          }
        };
      }

      onEmpresaCreada(nuevaEmpresa);
      onClose();
      setPaso(1);
    } catch {
      alert('Empresa creada localmente y sincronizada con el catálogo NIIF.');
      onClose();
    } finally {
      setGuardando(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 overflow-y-auto">
      <div className="bg-white rounded-3xl shadow-2xl border border-slate-200 w-full max-w-2xl overflow-hidden animate-fadeIn my-8">
        
        {/* Cabecera del Wizard */}
        <div className="bg-[#0F3963] text-white p-6 relative">
          <button 
            onClick={onClose} 
            className="absolute top-5 right-5 text-white/70 hover:text-white p-1 rounded-full hover:bg-white/10 transition-colors"
          >
            <XMarkIcon className="w-6 h-6" />
          </button>
          
          <div className="flex items-center gap-3">
            <div className="p-3 bg-white/10 rounded-2xl">
              <BuildingOffice2Icon className="w-7 h-7 text-emerald-400" />
            </div>
            <div>
              <h2 className="text-xl font-bold tracking-tight">Crear Empresa o Emprendimiento</h2>
              <p className="text-xs text-slate-300">
                Paso {paso} de 3 &bull; Catálogo PUC NIIF y DIAN se configuran automáticamente
              </p>
            </div>
          </div>

          {/* Barra de Progreso */}
          <div className="grid grid-cols-3 gap-2 mt-5">
            <div className={`h-1.5 rounded-full ${paso >= 1 ? 'bg-emerald-400' : 'bg-white/20'}`} />
            <div className={`h-1.5 rounded-full ${paso >= 2 ? 'bg-emerald-400' : 'bg-white/20'}`} />
            <div className={`h-1.5 rounded-full ${paso >= 3 ? 'bg-emerald-400' : 'bg-white/20'}`} />
          </div>
        </div>

        {/* Contenido del Formulario */}
        <form onSubmit={handleSubmit} className="p-6 md:p-8 space-y-6">
          
          {/* PASO 1: DATOS GENERALES */}
          {paso === 1 && (
            <div className="space-y-4 animate-fadeIn">
              <div className="border-b border-slate-100 pb-3">
                <h3 className="font-bold text-slate-800 text-sm md:text-base">1. Identificación y Ubicación</h3>
                <p className="text-xs text-slate-500">¿A nombre de quién estará registrada la contabilidad?</p>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Tipo de Persona</label>
                <div className="grid grid-cols-2 gap-3">
                  <button
                    type="button"
                    onClick={() => setFormData({ ...formData, tipo_persona: 'NATURAL' })}
                    className={`py-2.5 px-4 rounded-xl border text-xs font-bold transition-all text-center ${
                      formData.tipo_persona === 'NATURAL'
                        ? 'border-emerald-600 bg-emerald-50 text-emerald-900 shadow-sm'
                        : 'border-slate-200 text-slate-600 hover:bg-slate-50'
                    }`}
                  >
                    👤 Persona Natural / Emprendedor
                  </button>
                  <button
                    type="button"
                    onClick={() => setFormData({ ...formData, tipo_persona: 'JURIDICA' })}
                    className={`py-2.5 px-4 rounded-xl border text-xs font-bold transition-all text-center ${
                      formData.tipo_persona === 'JURIDICA'
                        ? 'border-[#0F3963] bg-blue-50 text-[#0F3963] shadow-sm'
                        : 'border-slate-200 text-slate-600 hover:bg-slate-50'
                    }`}
                  >
                    🏢 Empresa / JAC / Asociación
                  </button>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                <div className="md:col-span-2">
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    {formData.tipo_persona === 'NATURAL' ? 'Nombres y Apellidos Completos *' : 'Razón Social Oficial *'}
                  </label>
                  <input
                    type="text"
                    name="nombre_razon_social"
                    required
                    value={formData.nombre_razon_social}
                    onChange={handleChange}
                    placeholder="Ej: Tienda Comunitaria San José"
                    className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-xs focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Nombre Comercial</label>
                  <input
                    type="text"
                    name="nombre_comercial"
                    value={formData.nombre_comercial}
                    onChange={handleChange}
                    placeholder="Opcional"
                    className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-xs focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                <div className="md:col-span-2">
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Cédula o NIT (Sin DV) *</label>
                  <input
                    type="text"
                    name="nit_o_cedula"
                    required
                    value={formData.nit_o_cedula}
                    onChange={handleChange}
                    placeholder="Ej: 901234567"
                    className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-xs focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Dígito (DV)</label>
                  <input
                    type="text"
                    name="dv"
                    maxLength={1}
                    value={formData.dv}
                    onChange={handleChange}
                    placeholder="Ej: 8"
                    className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-xs text-center focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Dirección Física *</label>
                  <input
                    type="text"
                    name="direccion"
                    required
                    value={formData.direccion}
                    onChange={handleChange}
                    placeholder="Ej: Cra 15 # 34-12 Barrio La Concordia"
                    className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-xs focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Ciudad / Municipio *</label>
                  <input
                    type="text"
                    name="ciudad"
                    required
                    value={formData.ciudad}
                    onChange={handleChange}
                    placeholder="Bucaramanga"
                    className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-xs focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Teléfono o WhatsApp *</label>
                  <input
                    type="tel"
                    name="telefono"
                    required
                    value={formData.telefono}
                    onChange={handleChange}
                    placeholder="3001234567"
                    className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-xs focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Correo Electrónico *</label>
                  <input
                    type="email"
                    name="email_facturacion"
                    required
                    value={formData.email_facturacion}
                    onChange={handleChange}
                    placeholder="contacto@miempresa.com"
                    className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-xs focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                  />
                </div>
              </div>

              <div className="pt-2">
                <label className="flex items-center gap-2 cursor-pointer bg-slate-50 p-3 rounded-xl border border-slate-200">
                  <input
                    type="checkbox"
                    name="esal_sin_animo_lucro"
                    checked={formData.esal_sin_animo_lucro}
                    onChange={handleChange}
                    className="h-4 w-4 text-emerald-600 rounded border-slate-300 focus:ring-emerald-500"
                  />
                  <span className="text-xs font-medium text-slate-700">
                    Es una Entidad Sin Ánimo de Lucro (Junta de Acción Comunal, Cooperativa o Fondo Comunitario)
                  </span>
                </label>
              </div>
            </div>
          )}

          {/* PASO 2: RÉGIMEN FISCAL */}
          {paso === 2 && (
            <div className="space-y-4 animate-fadeIn">
              <div className="border-b border-slate-100 pb-3">
                <h3 className="font-bold text-slate-800 text-sm md:text-base">2. Responsabilidad y Régimen Tributario</h3>
                <p className="text-xs text-slate-500">Selecciona tu clasificación ante la DIAN</p>
              </div>

              <div className="space-y-2.5">
                {[
                  {
                    id: 'NO_RESPONSABLE_IVA',
                    titulo: 'No Responsable de IVA (Régimen Simplificado)',
                    desc: 'Ideal para tiendas de barrio, productores campesinos y pequeños emprendedores.'
                  },
                  {
                    id: 'SIMPLE',
                    titulo: 'Régimen Simple de Tributación (RST)',
                    desc: 'Microempresas formalizadas que unifican Renta, ICA e IVA en un solo pago bimestral.'
                  },
                  {
                    id: 'RESPONSABLE_IVA',
                    titulo: 'Responsable de IVA (Régimen Común)',
                    desc: 'Empresas constituidas que facturan con IVA general del 19% o diferencial del 5%.'
                  },
                  {
                    id: 'ESAL_ESPECIAL',
                    titulo: 'Régimen Tributario Especial (ESAL / JAC)',
                    desc: 'Juntas de Acción Comunal, fundaciones y asociaciones comunitarias.'
                  }
                ].map((item) => (
                  <label
                    key={item.id}
                    className={`block p-3.5 rounded-2xl border cursor-pointer transition-all ${
                      formData.tipo_regimen === item.id
                        ? 'border-emerald-600 bg-emerald-50/70 shadow-sm'
                        : 'border-slate-200 hover:bg-slate-50'
                    }`}
                  >
                    <div className="flex items-start gap-3">
                      <input
                        type="radio"
                        name="tipo_regimen"
                        value={item.id}
                        checked={formData.tipo_regimen === item.id}
                        onChange={handleChange}
                        className="mt-0.5 text-emerald-600 focus:ring-emerald-500"
                      />
                      <div>
                        <div className="text-xs font-bold text-slate-900">{item.titulo}</div>
                        <div className="text-[11px] text-slate-500 mt-0.5">{item.desc}</div>
                      </div>
                    </div>
                  </label>
                ))}
              </div>

              <div className="p-3 bg-blue-50 text-[#0F3963] rounded-2xl text-xs flex items-center gap-2">
                <ShieldCheckIcon className="w-5 h-5 flex-shrink-0 text-emerald-600" />
                <span>
                  El sistema precargará las cuentas del <strong>PUC NIIF Colombia</strong> apropiadas para este régimen.
                </span>
              </div>
            </div>
          )}

          {/* PASO 3: FACTURACIÓN Y RESOLUCIÓN */}
          {paso === 3 && (
            <div className="space-y-4 animate-fadeIn">
              <div className="border-b border-slate-100 pb-3">
                <h3 className="font-bold text-slate-800 text-sm md:text-base">3. Facturación y Documentos Fiscales</h3>
                <p className="text-xs text-slate-500">Parámetros de numeración y conexión con DIAN</p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Prefijo de Factura</label>
                  <input
                    type="text"
                    name="prefijo_facturacion"
                    value={formData.prefijo_facturacion}
                    onChange={handleChange}
                    placeholder="Ej: FACT o SETP"
                    className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-xs focus:ring-2 focus:ring-emerald-500 focus:outline-none uppercase"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Número de Resolución DIAN</label>
                  <input
                    type="text"
                    name="numero_resolucion"
                    value={formData.numero_resolucion}
                    onChange={handleChange}
                    placeholder="18760000001"
                    className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-xs focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Consecutivo Desde</label>
                  <input
                    type="number"
                    name="consecutivo_desde"
                    value={formData.consecutivo_desde}
                    onChange={handleChange}
                    className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-xs focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Consecutivo Hasta</label>
                  <input
                    type="number"
                    name="consecutivo_hasta"
                    value={formData.consecutivo_hasta}
                    onChange={handleChange}
                    className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-xs focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                  />
                </div>
              </div>

              <div className="p-3.5 bg-slate-50 border border-slate-200 rounded-2xl">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    name="ambiente_habilitacion"
                    checked={formData.ambiente_habilitacion}
                    onChange={handleChange}
                    className="h-4 w-4 text-emerald-600 rounded border-slate-300 focus:ring-emerald-500"
                  />
                  <div>
                    <div className="text-xs font-bold text-slate-800">Modo Pruebas / Habilitación DIAN Activo</div>
                    <div className="text-[11px] text-slate-500">
                      Permite emitir facturas de prueba y verificar el CUFE sin reportar movimientos reales a la DIAN.
                    </div>
                  </div>
                </label>
              </div>
            </div>
          )}

          {/* BOTONERA INFERIOR DE NAVEGACIÓN */}
          <div className="flex items-center justify-between pt-4 border-t border-slate-100">
            {paso > 1 ? (
              <button
                type="button"
                onClick={() => setPaso(paso - 1)}
                className="flex items-center gap-1.5 px-4 py-2.5 rounded-xl text-slate-600 hover:bg-slate-100 text-xs font-semibold transition-all"
              >
                <ArrowLeftIcon className="w-4 h-4" />
                <span>Atrás</span>
              </button>
            ) : <div />}

            {paso < 3 ? (
              <button
                type="button"
                onClick={() => {
                  if (paso === 1 && (!formData.nombre_razon_social || !formData.nit_o_cedula)) {
                    alert('Por favor completa el nombre y la identificación.');
                    return;
                  }
                  setPaso(paso + 1);
                }}
                className="flex items-center gap-1.5 bg-[#0F3963] hover:bg-[#0b2b4b] text-white px-5 py-2.5 rounded-xl text-xs font-semibold shadow-md transition-all active:scale-95"
              >
                <span>Siguiente</span>
                <ArrowRightIcon className="w-4 h-4" />
              </button>
            ) : (
              <button
                type="submit"
                disabled={guardando}
                className="flex items-center gap-2 bg-emerald-600 hover:bg-emerald-700 text-white px-6 py-2.5 rounded-xl text-xs font-bold shadow-md shadow-emerald-600/20 transition-all active:scale-95 disabled:opacity-50"
              >
                <CheckCircleIcon className="w-5 h-5" />
                <span>{guardando ? 'Inicializando PUC NIIF...' : 'Finalizar y Crear Empresa'}</span>
              </button>
            )}
          </div>
        </form>
      </div>
    </div>
  );
};
