import React, { useState } from 'react';
import { 
  BuildingLibraryIcon, 
  ArrowTrendingUpIcon, 
  ArrowTrendingDownIcon, 
  DocumentCheckIcon, 
  PlusCircleIcon,
  WifiIcon,
  BuildingOfficeIcon,
  ScaleIcon,
  BanknotesIcon,
  QrCodeIcon,
  CreditCardIcon,
  GlobeAltIcon
} from '@heroicons/react/24/outline';

import { EmpresaContable, MetricasFinancieras, TransaccionReciente } from './types';
import { WizardCrearEmpresaModal } from './components/WizardCrearEmpresaModal';
import { CajaRapidaPOSModal } from './components/CajaRapidaPOSModal';
import { ReportesInformesModal } from './components/ReportesInformesModal';
import { ModuloCarteraFiadosModal } from './components/ModuloCarteraFiadosModal';
import { ModuloProyectosONGModal } from './components/ModuloProyectosONGModal';

export const ContabAppDashboard: React.FC = () => {
  // Lista de empresas administradas (Multi-tenant)
  const [empresas, setEmpresas] = useState<EmpresaContable[]>([
    {
      id: 'org-principal-01',
      nombre_razon_social: 'Fundación Comunidades Sin Fronteras (ONG)',
      nombre_comercial: 'FCS Fronteras',
      tipo_persona: 'JURIDICA',
      nit_o_cedula: '901845123',
      dv: '4',
      departamento: 'Santander',
      ciudad: 'Bucaramanga',
      municipio_dane: '68001',
      direccion: 'Carrera 15 # 34-21',
      telefono: '3002020325',
      email_facturacion: 'contabilidad@fundacionfronteras.org',
      esal_sin_animo_lucro: true,
      activo: true,
      config_fiscal: {
        tipo_regimen: 'ESAL_ESPECIAL',
        responsabilidad_fiscal: 'R-99-PN',
        prefijo_facturacion: 'SETP',
        consecutivo_actual: 43,
        ambiente_habilitacion: true
      }
    },
    {
      id: 'org-emprendedor-02',
      nombre_razon_social: 'Café & Cacao La Esperanza (AICampo)',
      tipo_persona: 'NATURAL',
      nit_o_cedula: '1098765432',
      departamento: 'Santander',
      ciudad: 'Rionegro',
      municipio_dane: '68615',
      direccion: 'Vereda El Salado Finca La Esperanza',
      telefono: '3157894512',
      email_facturacion: 'cosechas@aicampo.online',
      esal_sin_animo_lucro: false,
      activo: true,
      config_fiscal: {
        tipo_regimen: 'SIMPLE',
        responsabilidad_fiscal: 'R-99-PN',
        prefijo_facturacion: 'AGRO',
        consecutivo_actual: 15,
        ambiente_habilitacion: true
      }
    },
    {
      id: 'org-tienda-03',
      nombre_razon_social: 'Tienda y Superetes El Porvenir (HormigApp)',
      tipo_persona: 'NATURAL',
      nit_o_cedula: '63541289',
      departamento: 'Santander',
      ciudad: 'Bucaramanga',
      municipio_dane: '68001',
      direccion: 'Calle 45 # 12-08 Barrio Santander',
      telefono: '3189998877',
      email_facturacion: 'tienda.porvenir@gmail.com',
      esal_sin_animo_lucro: false,
      activo: true,
      config_fiscal: {
        tipo_regimen: 'NO_RESPONSABLE_IVA',
        responsabilidad_fiscal: 'R-99-PN',
        prefijo_facturacion: 'TIEN',
        consecutivo_actual: 89,
        ambiente_habilitacion: true
      }
    }
  ]);

  const [empresaActualIndex, setEmpresaActualIndex] = useState<number>(0);
  const empresaActual = empresas[empresaActualIndex];

  // Modales
  const [modalWizardEmpresa, setModalWizardEmpresa] = useState<boolean>(false);
  const [modalCajaRapida, setModalCajaRapida] = useState<boolean>(false);
  const [modalReportes, setModalReportes] = useState<boolean>(false);
  const [modalCarteraFiados, setModalCarteraFiados] = useState<boolean>(false);
  const [modalProyectosONG, setModalProyectosONG] = useState<boolean>(false);

  // Filtro de Origen
  const [filtroOrigen, setFiltroOrigen] = useState<string>('TODAS');

  // Transacciones del Ecosistema
  const [transacciones, setTransacciones] = useState<TransaccionReciente[]>([
    {
      id: 'tx-001',
      origen: 'AICAMPO',
      concepto: 'Subasta de 20 Cargas de Cacao Seco (Asoc. Campesina)',
      monto: 3450000,
      tipo: 'INGRESO',
      fecha: '2026-10-27 08:15',
      cufe: 'd7a4b081fa2c...89cf',
      estadoDian: 'ACEPTADO',
      comprador: 'Cooperativa Nacional Cacaotera',
      metodoPago: 'TRANSFERENCIA'
    },
    {
      id: 'tx-002',
      origen: 'HORMIGAPP',
      concepto: 'Venta de Víveres y Panela - Tienda La Ceiba',
      monto: 125000,
      tipo: 'INGRESO',
      fecha: '2026-10-27 07:45',
      cufe: 'a12bc884ef11...441e',
      estadoDian: 'ACEPTADO',
      comprador: 'Consumidor Final',
      metodoPago: 'NEQUI'
    },
    {
      id: 'tx-003',
      origen: 'MYPSICO',
      concepto: 'Sesión Terapéutica y Orientación Psicosocial',
      monto: 80000,
      tipo: 'INGRESO',
      fecha: '2026-10-26 16:30',
      cufe: 'e39c4a89d001...21fa',
      estadoDian: 'ACEPTADO',
      comprador: 'María Gómez Morales',
      metodoPago: 'DAVIPLATA'
    },
    {
      id: 'tx-004',
      origen: 'DONACIONES',
      concepto: 'Aporte Solidario Conectividad Escolar Veredal',
      monto: 50000,
      tipo: 'INGRESO',
      fecha: '2026-10-26 14:10',
      estadoDian: 'NO_APLICA',
      comprador: 'Donante Solidario Bre-B',
      metodoPago: 'BRE-B'
    },
    {
      id: 'tx-005',
      origen: 'MANUAL',
      concepto: 'Mantenimiento Motobomba Acueducto Veredal',
      monto: 350000,
      tipo: 'EGRESO',
      fecha: '2026-10-25 18:00',
      estadoDian: 'NO_APLICA',
      comprador: 'Taller Hidráulico del Oriente',
      metodoPago: 'EFECTIVO'
    }
  ]);

  // Métricas Financieras NIIF en Tiempo Real
  const metricas: MetricasFinancieras = {
    totalIngresos: transacciones.filter(t => t.tipo === 'INGRESO').reduce((acc, t) => acc + t.monto, 0),
    totalGastos: transacciones.filter(t => t.tipo === 'EGRESO').reduce((acc, t) => acc + t.monto, 0),
    totalCostos: 480000,
    excedenteNeto: 0,
    saldoCajaBancos: 0,
    facturasEmitidasDian: transacciones.filter(t => t.estadoDian === 'ACEPTADO').length
  };
  metricas.excedenteNeto = metricas.totalIngresos - metricas.totalGastos - metricas.totalCostos;
  metricas.saldoCajaBancos = metricas.totalIngresos - metricas.totalGastos;

  // Handlers
  const handleNuevaEmpresa = (nueva: EmpresaContable) => {
    setEmpresas([...empresas, nueva]);
    setEmpresaActualIndex(empresas.length);
  };

  const handleNuevaTransaccion = (nuevaTx: TransaccionReciente) => {
    setTransacciones([nuevaTx, ...transacciones]);
  };

  const transaccionesFiltradas = filtroOrigen === 'TODAS'
    ? transacciones
    : transacciones.filter(t => t.origen === filtroOrigen);

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 font-sans p-4 md:p-8">
      
      {/* 1. HEADER SUPERIOR CON SELECTOR DE EMPRESAS Y ACCIONES */}
      <header className="flex flex-col md:flex-row md:items-center justify-between pb-6 border-b border-slate-200 gap-4">
        
        {/* Identidad de la App */}
        <div className="flex items-center gap-3">
          <img 
            src="/logo.png" 
            alt="Logo ContabApp" 
            className="h-12 w-12 object-contain rounded-2xl shadow-sm bg-white p-1 border border-slate-200" 
          />
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-2xl font-black text-slate-900 tracking-tight">ContabApp</h1>
              <span className="text-[10px] bg-emerald-100 text-emerald-800 font-bold px-2 py-0.5 rounded-full uppercase tracking-wider">
                Comunidades
              </span>
            </div>
            <p className="text-xs md:text-sm text-slate-500 font-medium">
              Gestión Integral para ONGs, Emprendedores Populares, Tiendas y NIIF DIAN
            </p>
          </div>
        </div>

        {/* Selector de Empresa y Botonera */}
        <div className="flex flex-wrap items-center gap-2">
          {/* Selector Multi-tenant */}
          <div className="flex items-center bg-white border border-slate-200 rounded-2xl px-3 py-1.5 shadow-sm">
            <BuildingOfficeIcon className="w-5 h-5 text-slate-400 mr-2" />
            <select
              value={empresaActualIndex}
              onChange={(e) => setEmpresaActualIndex(Number(e.target.value))}
              className="text-xs font-bold text-slate-800 bg-transparent focus:outline-none cursor-pointer pr-2"
            >
              {empresas.map((emp, idx) => (
                <option key={emp.id} value={idx}>
                  {emp.nombre_razon_social} ({emp.nit_o_cedula})
                </option>
              ))}
            </select>
          </div>

          {/* Botón Crear Empresa Wizard */}
          <button
            onClick={() => setModalWizardEmpresa(true)}
            className="flex items-center gap-1.5 px-3 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-bold transition-all shadow-sm"
          >
            <PlusCircleIcon className="w-4 h-4 text-emerald-600" />
            <span>Nueva Empresa</span>
          </button>

          {/* Botón Cartera y Fiados */}
          <button
            onClick={() => setModalCarteraFiados(true)}
            className="flex items-center gap-1.5 px-3 py-2 bg-amber-50 hover:bg-amber-100 text-amber-900 rounded-xl text-xs font-bold transition-all border border-amber-200 shadow-sm"
          >
            <CreditCardIcon className="w-4 h-4 text-amber-600" />
            <span>Cartera & Fiados</span>
          </button>

          {/* Botón Proyectos ONG */}
          {empresaActual.esal_sin_animo_lucro && (
            <button
              onClick={() => setModalProyectosONG(true)}
              className="flex items-center gap-1.5 px-3 py-2 bg-purple-50 hover:bg-purple-100 text-purple-900 rounded-xl text-xs font-bold transition-all border border-purple-200 shadow-sm"
            >
              <GlobeAltIcon className="w-4 h-4 text-purple-600" />
              <span>Proyectos ONG</span>
            </button>
          )}

          {/* Botón Reportes NIIF */}
          <button
            onClick={() => setModalReportes(true)}
            className="flex items-center gap-1.5 px-3 py-2 bg-blue-50 hover:bg-blue-100 text-[#0F3963] rounded-xl text-xs font-bold transition-all border border-blue-200 shadow-sm"
          >
            <ScaleIcon className="w-4 h-4 text-blue-600" />
            <span>Reportes</span>
          </button>

          {/* Botón Caja Rápida POS */}
          <button 
            onClick={() => setModalCajaRapida(true)}
            className="flex items-center gap-2 bg-[#0F3963] hover:bg-[#0b2b4b] text-white px-4 py-2.5 rounded-xl text-xs font-bold shadow-md transition-all active:scale-95"
          >
            <BanknotesIcon className="w-4 h-4 text-emerald-400" />
            <span>Caja Rápida POS</span>
          </button>
        </div>
      </header>

      {/* 2. BARRA DE ESTADO TRIBUTARIO Y AMBIENTE */}
      <section className="mt-4 flex flex-wrap items-center justify-between gap-3 bg-white p-3.5 rounded-2xl border border-slate-200 shadow-sm text-xs">
        <div className="flex items-center gap-2 text-slate-600 font-medium">
          <span className="font-bold text-slate-900">{empresaActual.nombre_razon_social}</span>
          <span>&bull;</span>
          <span>Régimen: <strong className="text-emerald-700">{empresaActual.config_fiscal?.tipo_regimen}</strong></span>
          <span>&bull;</span>
          <span>Municipio: <strong>{empresaActual.ciudad} (DANE {empresaActual.municipio_dane})</strong></span>
        </div>

        <div className="flex items-center gap-3">
          <span className="flex items-center gap-1 text-[11px] font-semibold text-emerald-700 bg-emerald-50 px-2.5 py-1 rounded-full border border-emerald-200">
            <WifiIcon className="w-3.5 h-3.5" />
            Sincronización Ecosistema Activa
          </span>
          <span className="text-[11px] font-semibold text-blue-800 bg-blue-50 px-2.5 py-1 rounded-full border border-blue-200">
            Prefijo DIAN: {empresaActual.config_fiscal?.prefijo_facturacion}
          </span>
        </div>
      </section>

      {/* 3. TARJETAS DE MÉTRICAS FINANCIERAS (NIIF) */}
      <section className="grid grid-cols-1 md:grid-cols-4 gap-4 mt-6">
        
        {/* Ingresos Operacionales */}
        <div className="bg-white p-5 rounded-3xl border border-slate-200 shadow-sm relative overflow-hidden">
          <div className="flex items-center justify-between text-slate-500 mb-2">
            <span className="text-xs font-bold uppercase tracking-wider">Ingresos Totales</span>
            <div className="p-2 bg-emerald-50 text-emerald-600 rounded-xl">
              <ArrowTrendingUpIcon className="w-5 h-5" />
            </div>
          </div>
          <div className="text-2xl font-black text-slate-900 tracking-tight">
            ${metricas.totalIngresos.toLocaleString('es-CO')}
          </div>
          <p className="text-[11px] text-slate-400 mt-1">HormigApp, AICampo, MyPsico, Donaciones</p>
        </div>

        {/* Saldo en Caja y Billeteras */}
        <div className="bg-white p-5 rounded-3xl border border-slate-200 shadow-sm relative overflow-hidden">
          <div className="flex items-center justify-between text-slate-500 mb-2">
            <span className="text-xs font-bold uppercase tracking-wider">Disponible en Caja</span>
            <div className="p-2 bg-blue-50 text-[#0F3963] rounded-xl">
              <BuildingLibraryIcon className="w-5 h-5" />
            </div>
          </div>
          <div className="text-2xl font-black text-slate-900 tracking-tight">
            ${metricas.saldoCajaBancos.toLocaleString('es-CO')}
          </div>
          <p className="text-[11px] text-slate-400 mt-1">Efectivo, Nequi, Daviplata, Bre-B</p>
        </div>

        {/* Excedente Neto / Utilidad */}
        <div className="bg-white p-5 rounded-3xl border border-slate-200 shadow-sm relative overflow-hidden">
          <div className="flex items-center justify-between text-slate-500 mb-2">
            <span className="text-xs font-bold uppercase tracking-wider">
              {empresaActual.esal_sin_animo_lucro ? 'Excedente ONG' : 'Utilidad Neta'}
            </span>
            <div className="p-2 bg-purple-50 text-purple-600 rounded-xl">
              <ScaleIcon className="w-5 h-5" />
            </div>
          </div>
          <div className="text-2xl font-black text-purple-950 tracking-tight">
            ${metricas.excedenteNeto.toLocaleString('es-CO')}
          </div>
          <p className="text-[11px] text-slate-400 mt-1">Ingresos menos Gastos y Costos</p>
        </div>

        {/* Facturación Electrónica DIAN */}
        <div className="bg-white p-5 rounded-3xl border border-slate-200 shadow-sm relative overflow-hidden">
          <div className="flex items-center justify-between text-slate-500 mb-2">
            <span className="text-xs font-bold uppercase tracking-wider">Facturas DIAN</span>
            <div className="p-2 bg-amber-50 text-amber-600 rounded-xl">
              <DocumentCheckIcon className="w-5 h-5" />
            </div>
          </div>
          <div className="text-2xl font-black text-slate-900 tracking-tight">
            {metricas.facturasEmitidasDian}
          </div>
          <p className="text-[11px] text-emerald-600 font-semibold mt-1 flex items-center gap-1">
            <QrCodeIcon className="w-3.5 h-3.5" />
            Validada con CUFE Oficial
          </p>
        </div>

      </section>

      {/* 4. TABLA DEL LIBRO DIARIO Y TRANSACCIONES DEL ECOSISTEMA */}
      <section className="mt-8 bg-white rounded-3xl border border-slate-200 shadow-sm p-6">
        
        {/* Cabecera y Filtros */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-5 border-b border-slate-100">
          <div>
            <h2 className="text-lg font-bold text-slate-900">Libro Diario & Movimientos del Ecosistema</h2>
            <p className="text-xs text-slate-500">
              Asentamiento por partida doble con comprobante y tercero asociado
            </p>
          </div>

          {/* Filtros por Origen */}
          <div className="flex flex-wrap gap-1.5">
            {[
              { id: 'TODAS', label: 'Todas' },
              { id: 'HORMIGAPP', label: '🛒 HormigApp' },
              { id: 'AICAMPO', label: '🌾 AICampo' },
              { id: 'MYPSICO', label: '🧠 MyPsico' },
              { id: 'DONACIONES', label: '🤝 Donaciones' },
              { id: 'MANUAL', label: '💵 Caja POS' },
            ].map(f => (
              <button
                key={f.id}
                onClick={() => setFiltroOrigen(f.id)}
                className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all ${
                  filtroOrigen === f.id
                    ? 'bg-[#0F3963] text-white shadow-sm'
                    : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                }`}
              >
                {f.label}
              </button>
            ))}
          </div>
        </div>

        {/* Tabla */}
        <div className="overflow-x-auto mt-4">
          <table className="w-full text-left text-xs">
            <thead>
              <tr className="border-b border-slate-200 text-slate-400 uppercase font-semibold text-[10px] tracking-wider">
                <th className="py-3 px-3">Origen / App</th>
                <th className="py-3 px-3">Fecha</th>
                <th className="py-3 px-3">Concepto y Tercero</th>
                <th className="py-3 px-3">Medio Pago</th>
                <th className="py-3 px-3 text-right">Monto</th>
                <th className="py-3 px-3 text-center">Estado DIAN</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {transaccionesFiltradas.map((t) => (
                <tr key={t.id} className="hover:bg-slate-50/70 transition-colors">
                  <td className="py-3.5 px-3">
                    <span className={`inline-block font-bold text-[10px] px-2 py-0.5 rounded-lg ${
                      t.origen === 'HORMIGAPP' ? 'bg-amber-100 text-amber-900' :
                      t.origen === 'AICAMPO' ? 'bg-emerald-100 text-emerald-900' :
                      t.origen === 'MYPSICO' ? 'bg-teal-100 text-teal-900' :
                      t.origen === 'DONACIONES' ? 'bg-purple-100 text-purple-900' :
                      'bg-blue-100 text-[#0F3963]'
                    }`}>
                      {t.origen}
                    </span>
                  </td>
                  <td className="py-3.5 px-3 text-slate-500 font-medium whitespace-nowrap">
                    {t.fecha}
                  </td>
                  <td className="py-3.5 px-3">
                    <div className="font-bold text-slate-800">{t.concepto}</div>
                    <div className="text-[11px] text-slate-400 mt-0.5">Tercero: {t.comprador}</div>
                  </td>
                  <td className="py-3.5 px-3 font-semibold text-slate-600">
                    {t.metodoPago}
                  </td>
                  <td className="py-3.5 px-3 text-right whitespace-nowrap">
                    <span className={`font-black text-sm ${t.tipo === 'INGRESO' ? 'text-emerald-700' : 'text-rose-600'}`}>
                      {t.tipo === 'INGRESO' ? '+' : '-'}${t.monto.toLocaleString('es-CO')}
                    </span>
                  </td>
                  <td className="py-3.5 px-3 text-center whitespace-nowrap">
                    {t.estadoDian === 'ACEPTADO' ? (
                      <span className="inline-flex items-center gap-1 text-[10px] font-bold text-emerald-700 bg-emerald-50 px-2.5 py-1 rounded-full border border-emerald-200">
                        <QrCodeIcon className="w-3.5 h-3.5 text-emerald-600" />
                        Validada
                      </span>
                    ) : (
                      <span className="text-[10px] font-medium text-slate-400 bg-slate-100 px-2 py-0.5 rounded-full">
                        No Aplica
                      </span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

      </section>

      {/* 5. MODALES INTERACTIVOS */}
      <WizardCrearEmpresaModal 
        isOpen={modalWizardEmpresa}
        onClose={() => setModalWizardEmpresa(false)}
        onEmpresaCreada={handleNuevaEmpresa}
      />

      <CajaRapidaPOSModal 
        isOpen={modalCajaRapida}
        onClose={() => setModalCajaRapida(false)}
        empresaActual={empresaActual}
        onTransaccionCreada={handleNuevaTransaccion}
      />

      <ModuloCarteraFiadosModal 
        isOpen={modalCarteraFiados}
        onClose={() => setModalCarteraFiados(false)}
        empresaActual={empresaActual}
      />

      <ModuloProyectosONGModal 
        isOpen={modalProyectosONG}
        onClose={() => setModalProyectosONG(false)}
        empresaActual={empresaActual}
      />

      <ReportesInformesModal 
        isOpen={modalReportes}
        onClose={() => setModalReportes(false)}
        empresaActual={empresaActual}
        metricas={metricas}
        transacciones={transacciones}
      />

    </div>
  );
};

export default ContabAppDashboard;
