import React, { useEffect, useState } from 'react';
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
  DocumentTextIcon,
  GlobeAltIcon,
  ShieldCheckIcon,
  UsersIcon,
  MicrophoneIcon,
  WalletIcon
} from '@heroicons/react/24/outline';

import { EmpresaContable, MetricasFinancieras, TransaccionReciente } from './types';
import { WizardCrearEmpresaModal } from './components/WizardCrearEmpresaModal';
import { CajaRapidaPOSModal } from './components/CajaRapidaPOSModal';
import { ReportesInformesModal } from './components/ReportesInformesModal';
import { ModuloCarteraFiadosModal } from './components/ModuloCarteraFiadosModal';
import { ModuloProyectosONGModal } from './components/ModuloProyectosONGModal';
import { ModuloConveniosSolidariosModal } from './components/ModuloConveniosSolidariosModal';
import { GestionUsuariosEmpresaModal } from './components/GestionUsuariosEmpresaModal';
import { AsistenteFacturaDemoModal, FacturaDemo } from './components/AsistenteFacturaDemoModal';
import { ModuloFinanzasPersonalesModal } from './components/ModuloFinanzasPersonalesModal';
import { ModuloDocumentoSoporteBorradorModal } from './components/ModuloDocumentoSoporteBorradorModal';
import { ModuloNominaBorradorModal } from './components/ModuloNominaBorradorModal';
import {
  obtenerResumenFinanciero,
  obtenerTransaccionesEmpresa,
  PerfilUsuario,
  puede,
  ResumenFinancieroApi,
  TransaccionApi,
} from './services/authApi';
import { datosFicticiosDemo, RolDemo } from './demoData';

interface DashboardProps {
  perfil: PerfilUsuario;
  empresasIniciales: EmpresaContable[];
  onSalir: () => void;
  modoDemo?: boolean;
  rolDemo?: RolDemo;
  datosDemo?: typeof datosFicticiosDemo;
  onCambiarRolDemo?: (rol: RolDemo) => void;
}

function convertirTransaccion(transaccion: TransaccionApi): TransaccionReciente {
  const conceptos = transaccion.items_vendidos
    .map((item) => item)
    .filter((descripcion): descripcion is string => Boolean(descripcion));
  const fecha = new Date(transaccion.recibido_en);
  return {
    id: transaccion.id,
    origen: transaccion.origen_app,
    concepto: transaccion.asiento_concepto || conceptos.join(', ') || `Orden ${transaccion.id_orden_origen}`,
    monto: Number(transaccion.total),
    tipo: transaccion.asiento_tipo === 'EGRESO' ? 'EGRESO' : 'INGRESO',
    fecha: Number.isNaN(fecha.getTime()) ? transaccion.recibido_en : fecha.toLocaleString('es-CO'),
    cufe: transaccion.cufe || undefined,
    estadoDian: transaccion.factura_estado_dian,
    comprador: transaccion.comprador || 'Consumidor final',
    metodoPago: transaccion.metodo_pago,
  };
}

function convertirMetricas(resumen: ResumenFinancieroApi): MetricasFinancieras {
  return {
    totalIngresos: Number(resumen.resumen_financiero.total_ingresos),
    totalGastos: Number(resumen.resumen_financiero.total_gastos),
    totalCostos: Number(resumen.resumen_financiero.total_costos),
    excedenteNeto: Number(resumen.resumen_financiero.excedente_neto),
    saldoCajaBancos: Number(resumen.resumen_financiero.saldo_disponible_caja_bancos),
    facturasEmitidasDian: Number(resumen.total_facturas_dian),
  };
}

export const ContabAppDashboard: React.FC<DashboardProps> = ({
  perfil,
  empresasIniciales,
  onSalir,
  modoDemo = false,
  rolDemo = 'EMPRENDEDOR',
  datosDemo,
  onCambiarRolDemo,
}) => {
  // Empresas a las que el usuario tiene credenciales (Multi-tenant)
  const [empresas, setEmpresas] = useState<EmpresaContable[]>(empresasIniciales);

  const [empresaActualIndex, setEmpresaActualIndex] = useState<number>(0);
  const empresaActual = empresas[empresaActualIndex];
  const accesoActual = perfil.empresas.find((e) => e.organizacion_id === empresaActual.id);
  const ve = (recurso: string, accion: 'read' | 'write' = 'read') =>
    puede(accesoActual, recurso, accion) || (perfil.es_admin_plataforma && recurso === 'empresa');
  const puedeVerReportes = ve('reportes');
  const puedeCrearFacturaDemo = puede(accesoActual, 'facturas_demo', 'write');

  // Modales
  const [modalWizardEmpresa, setModalWizardEmpresa] = useState<boolean>(false);
  const [modalCajaRapida, setModalCajaRapida] = useState<boolean>(false);
  const [modalReportes, setModalReportes] = useState<boolean>(false);
  const [modalCarteraFiados, setModalCarteraFiados] = useState<boolean>(false);
  const [modalProyectosONG, setModalProyectosONG] = useState<boolean>(false);
  const [modalConveniosSolidarios, setModalConveniosSolidarios] = useState<boolean>(false);
  const [modalGestionUsuarios, setModalGestionUsuarios] = useState<boolean>(false);
  const [modalFacturaDemo, setModalFacturaDemo] = useState<boolean>(false);
  const [modalFinanzasPersonales, setModalFinanzasPersonales] = useState<boolean>(false);
  const [modalDocumentoSoporteBorrador, setModalDocumentoSoporteBorrador] = useState<boolean>(false);
  const [modalNomina, setModalNomina] = useState<boolean>(false);
  const [facturasDemo, setFacturasDemo] = useState<FacturaDemo[]>([]);

  // Filtro de Origen
  const [filtroOrigen, setFiltroOrigen] = useState<string>('TODAS');

  const [transacciones, setTransacciones] = useState<TransaccionReciente[]>([]);
  const [metricas, setMetricas] = useState<MetricasFinancieras | null>(null);
  const [cargandoDatos, setCargandoDatos] = useState(true);
  const [errorTransacciones, setErrorTransacciones] = useState('');
  const [errorMetricas, setErrorMetricas] = useState('');
  const [actualizacionDatos, setActualizacionDatos] = useState(0);

  useEffect(() => {
    let vigente = true;
    setCargandoDatos(true);
    setTransacciones([]);
    setMetricas(null);
    setErrorTransacciones('');
    setErrorMetricas('');

    const cargarDatos = async () => {
      if (modoDemo) {
        setTransacciones(datosDemo?.transacciones ?? []);
        setMetricas(datosDemo?.metricas ?? null);
        setCargandoDatos(false);
        return;
      }

      const resultados = await Promise.allSettled([
        obtenerTransaccionesEmpresa(empresaActual.id),
        puedeVerReportes
          ? obtenerResumenFinanciero(empresaActual.id)
          : Promise.resolve(null),
      ]);
      if (!vigente) return;

      const resultadoTransacciones = resultados[0];
      if (resultadoTransacciones.status === 'fulfilled') {
        setTransacciones(resultadoTransacciones.value.map(convertirTransaccion));
      } else {
        setErrorTransacciones(
          resultadoTransacciones.reason instanceof Error
            ? resultadoTransacciones.reason.message
            : 'No fue posible cargar las transacciones.'
        );
      }

      const resultadoMetricas = resultados[1];
      if (resultadoMetricas.status === 'fulfilled' && resultadoMetricas.value) {
        setMetricas(convertirMetricas(resultadoMetricas.value));
      } else if (resultadoMetricas.status === 'rejected') {
        setErrorMetricas(
          resultadoMetricas.reason instanceof Error
            ? resultadoMetricas.reason.message
            : 'No fue posible cargar el resumen financiero.'
        );
      }
      setCargandoDatos(false);
    };

    void cargarDatos();
    return () => { vigente = false; };
  }, [empresaActual.id, puedeVerReportes, actualizacionDatos, modoDemo, datosDemo]);

  // Handlers
  const handleNuevaEmpresa = (nueva: EmpresaContable) => {
    setEmpresas([...empresas, nueva]);
    setEmpresaActualIndex(empresas.length);
  };

  const handleNuevaTransaccion = (_nuevaTx: TransaccionReciente) => {
    setActualizacionDatos((actual) => actual + 1);
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

          {/* Usuario y rol */}
          <div className="flex items-center gap-2 text-[11px] text-slate-600">
            <span className="font-bold">{perfil.username}</span>
            <span className="bg-slate-100 rounded-full px-2 py-0.5">
              {perfil.es_admin_plataforma ? 'Admin plataforma' : accesoActual?.rol_nombre}
            </span>
            {modoDemo && onCambiarRolDemo && (
              <select
                value={rolDemo}
                onChange={(e) => onCambiarRolDemo(e.target.value as RolDemo)}
                aria-label="Cambiar perspectiva de demostración"
                className="rounded-lg border border-emerald-200 bg-emerald-50 px-2 py-1 text-[11px] font-bold text-emerald-900"
              >
                <option value="GERENTE">Gerente</option>
                <option value="CONTADOR">Contador</option>
                <option value="EMPRENDEDOR">Emprendedor</option>
                <option value="ADMIN">Admin</option>
                <option value="SUPERADMIN">Superadmin</option>
              </select>
            )}
            <button onClick={onSalir} className="underline text-slate-500">Salir</button>
          </div>

          {/* Botón Crear Empresa Wizard */}
          {perfil.es_admin_plataforma && (
          <button
            onClick={() => setModalWizardEmpresa(true)}
            className="flex items-center gap-1.5 px-3 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-bold transition-all shadow-sm"
          >
            <PlusCircleIcon className="w-4 h-4 text-emerald-600" />
            <span>Nueva Empresa</span>
          </button>
          )}

          {(perfil.es_admin_plataforma || puede(accesoActual, 'accesos', 'write')) && (
            <button
              onClick={() => setModalGestionUsuarios(true)}
              className="flex items-center gap-1.5 rounded-xl border border-indigo-200 bg-indigo-50 px-3 py-2 text-xs font-bold text-indigo-900 shadow-sm transition-all hover:bg-indigo-100"
            >
              <UsersIcon className="h-4 w-4 text-indigo-700" />
              <span>Usuarios y roles</span>
            </button>
          )}

          <button
            onClick={() => setModalFinanzasPersonales(true)}
            className="flex items-center gap-2 rounded-xl border border-violet-200 bg-violet-50 px-3 py-2.5 text-xs font-bold text-violet-900 shadow-sm transition-all hover:bg-violet-100"
          >
            <WalletIcon className="h-4 w-4 text-violet-700" />
            <span>Finanzas personales</span>
          </button>

          {ve('cuentas_por_pagar', 'write') && (
            <button
              onClick={() => setModalDocumentoSoporteBorrador(true)}
              className="flex items-center gap-2 rounded-xl border border-amber-200 bg-amber-50 px-3 py-2.5 text-xs font-bold text-amber-900 shadow-sm transition-all hover:bg-amber-100"
            >
              <DocumentTextIcon className="h-4 w-4 text-amber-700" />
              <span>Soporte de compra (borrador)</span>
            </button>
          )}

          {ve('nomina') && (
            <button
              onClick={() => setModalNomina(true)}
              className="flex items-center gap-2 rounded-xl border border-sky-200 bg-sky-50 px-3 py-2.5 text-xs font-bold text-sky-900 shadow-sm transition-all hover:bg-sky-100"
            >
              <UsersIcon className="h-4 w-4 text-sky-700" />
              <span>Nómina (borrador)</span>
            </button>
          )}

          {/* Botón Cartera y Fiados */}
          {ve('fiados') && (
          <button
            onClick={() => setModalCarteraFiados(true)}
            className="flex items-center gap-1.5 px-3 py-2 bg-amber-50 hover:bg-amber-100 text-amber-900 rounded-xl text-xs font-bold transition-all border border-amber-200 shadow-sm"
          >
            <CreditCardIcon className="w-4 h-4 text-amber-600" />
            <span>Cartera & Fiados</span>
          </button>
          )}

          {/* Botón Proyectos ONG */}
          {empresaActual.esal_sin_animo_lucro && ve('proyectos') && (
            <button
              onClick={() => setModalProyectosONG(true)}
              className="flex items-center gap-1.5 px-3 py-2 bg-purple-50 hover:bg-purple-100 text-purple-900 rounded-xl text-xs font-bold transition-all border border-purple-200 shadow-sm"
            >
              <GlobeAltIcon className="w-4 h-4 text-purple-600" />
              <span>Proyectos ONG</span>
            </button>
          )}

          <button
            onClick={() => setModalConveniosSolidarios(true)}
            className="flex items-center gap-1.5 rounded-xl border border-teal-200 bg-teal-50 px-3 py-2 text-xs font-bold text-teal-900 shadow-sm transition-all hover:bg-teal-100"
          >
            <ShieldCheckIcon className="h-4 w-4 text-teal-700" />
            <span>Convenios Solidarios</span>
          </button>

          {/* Botón Reportes NIIF */}
          {ve('reportes') && (
          <button
            onClick={() => setModalReportes(true)}
            disabled={!metricas}
            className="flex items-center gap-1.5 px-3 py-2 bg-blue-50 hover:bg-blue-100 disabled:cursor-wait disabled:opacity-50 text-[#0F3963] rounded-xl text-xs font-bold transition-all border border-blue-200 shadow-sm"
          >
            <ScaleIcon className="w-4 h-4 text-blue-600" />
            <span>Reportes</span>
          </button>
          )}

          {/* Botón Caja Rápida POS */}
          {puedeCrearFacturaDemo && (
            <button
              onClick={() => setModalFacturaDemo(true)}
              className="flex items-center gap-2 rounded-xl border border-emerald-200 bg-emerald-50 px-3 py-2.5 text-xs font-bold text-emerald-900 shadow-sm transition-all hover:bg-emerald-100"
            >
              <MicrophoneIcon className="h-4 w-4 text-emerald-700" />
              <span>Crear factura de muestra</span>
            </button>
          )}

          {/* Botón Caja Rápida POS */}
          {ve('ingesta', 'write') && (
          <button 
            onClick={() => setModalCajaRapida(true)}
            className="flex items-center gap-2 bg-[#0F3963] hover:bg-[#0b2b4b] text-white px-4 py-2.5 rounded-xl text-xs font-bold shadow-md transition-all active:scale-95"
          >
            <BanknotesIcon className="w-4 h-4 text-emerald-400" />
            <span>Caja Rápida POS</span>
          </button>
          )}
        </div>
      </header>

      {modoDemo && (
        <div className="mt-4 flex flex-wrap items-center justify-between gap-2 rounded-2xl border border-amber-300 bg-amber-50 px-4 py-3 text-xs text-amber-950">
          <span><strong>Modo demostración:</strong> todos los valores son ficticios y no generan documentos fiscales.</span>
          <span className="rounded-full bg-white px-2.5 py-1 font-bold uppercase tracking-wide text-amber-800">Sin persistencia real</span>
        </div>
      )}

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

      {errorMetricas && (
        <p role="alert" className="mt-4 rounded-xl border border-rose-200 bg-rose-50 p-3 text-xs text-rose-800">
          No fue posible cargar el resumen financiero: {errorMetricas}
        </p>
      )}
      {!puedeVerReportes && (
        <p className="mt-4 rounded-xl border border-slate-200 bg-slate-100 p-3 text-xs text-slate-600">
          Su rol no tiene permiso para consultar métricas ni estados financieros.
        </p>
      )}

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
            {metricas ? `$${metricas.totalIngresos.toLocaleString('es-CO')}` : '—'}
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
            {metricas ? `$${metricas.saldoCajaBancos.toLocaleString('es-CO')}` : '—'}
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
            {metricas ? `$${metricas.excedenteNeto.toLocaleString('es-CO')}` : '—'}
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
            {metricas?.facturasEmitidasDian ?? '—'}
          </div>
          <p className="text-[11px] text-emerald-600 font-semibold mt-1 flex items-center gap-1">
            <QrCodeIcon className="w-3.5 h-3.5" />
            Total de facturas registradas
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
              Últimos 50 movimientos contabilizados, con comprobante y tercero asociado
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
              { id: 'SUSCRIPCIONES', label: '🔁 Suscripciones' },
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
              {errorTransacciones ? (
                <tr><td colSpan={6} role="alert" className="py-8 text-center text-rose-700">{errorTransacciones}</td></tr>
              ) : cargandoDatos ? (
                <tr><td colSpan={6} className="py-8 text-center text-slate-500">Cargando movimientos…</td></tr>
              ) : transaccionesFiltradas.length === 0 ? (
                <tr><td colSpan={6} className="py-8 text-center text-slate-500">No hay transacciones para este filtro.</td></tr>
              ) : transaccionesFiltradas.map((t) => (
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
                    <span className={`inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-[10px] font-bold ${
                      t.estadoDian === 'ACEPTADO' ? 'border border-emerald-200 bg-emerald-50 text-emerald-700' :
                      t.estadoDian === 'RECHAZADO' ? 'border border-rose-200 bg-rose-50 text-rose-700' :
                      t.estadoDian === 'NO_APLICA' ? 'bg-slate-100 text-slate-500' :
                      'border border-amber-200 bg-amber-50 text-amber-800'
                    }`}>
                      {t.estadoDian === 'ACEPTADO' && <QrCodeIcon className="h-3.5 w-3.5" />}
                      {t.estadoDian === 'NO_APLICA' ? 'No aplica' : t.estadoDian.replace('_', ' ')}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

      </section>

      {puedeCrearFacturaDemo && (
        <section className="mt-6 rounded-3xl border border-amber-200 bg-amber-50/70 p-5 shadow-sm">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <h2 className="text-sm font-bold text-amber-950">Facturas ficticias de presentación</h2>
              <p className="mt-1 text-xs text-amber-900">
                No son documentos fiscales. Estas muestras solo se conservan mientras esta sesión permanezca abierta.
              </p>
            </div>
            <span className="rounded-full border border-amber-300 bg-white px-3 py-1 text-[10px] font-bold uppercase tracking-wide text-amber-900">
              {facturasDemo.filter((factura) => factura.empresaId === empresaActual.id).length} muestras
            </span>
          </div>
          <div className="mt-4 space-y-2">
            {facturasDemo.filter((factura) => factura.empresaId === empresaActual.id).length === 0 ? (
              <p className="rounded-xl bg-white/70 p-3 text-xs text-amber-900">
                Aún no hay muestras. Usa el asistente para crear una sin afectar los registros reales.
              </p>
            ) : facturasDemo
              .filter((factura) => factura.empresaId === empresaActual.id)
              .map((factura) => (
                <div key={factura.id} className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-amber-200 bg-white p-3">
                  <div>
                    <p className="text-xs font-bold text-slate-900">{factura.folio} · {factura.cliente}</p>
                    <p className="mt-0.5 text-[11px] text-slate-500">
                      {factura.descripcion} · {factura.medioPago} · {factura.fecha}
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="text-sm font-black text-slate-900">${factura.total.toLocaleString('es-CO')}</p>
                    <span className="text-[10px] font-bold text-amber-800">FICTICIA · SIN VALIDEZ TRIBUTARIA</span>
                  </div>
                </div>
              ))}
          </div>
        </section>
      )}

      {/* 5. MODALES INTERACTIVOS */}
      <WizardCrearEmpresaModal 
        isOpen={modalWizardEmpresa}
        onClose={() => setModalWizardEmpresa(false)}
        onEmpresaCreada={handleNuevaEmpresa}
      />

      <AsistenteFacturaDemoModal
        isOpen={modalFacturaDemo}
        onClose={() => setModalFacturaDemo(false)}
        empresaId={empresaActual.id}
        empresaNombre={empresaActual.nombre_razon_social}
        onConfirmar={(factura) => setFacturasDemo((actuales) => [factura, ...actuales])}
      />

      <ModuloFinanzasPersonalesModal
        isOpen={modalFinanzasPersonales}
        onClose={() => setModalFinanzasPersonales(false)}
      />

      <ModuloDocumentoSoporteBorradorModal
        isOpen={modalDocumentoSoporteBorrador}
        empresaId={empresaActual.id}
        empresaNombre={empresaActual.nombre_razon_social}
        onClose={() => setModalDocumentoSoporteBorrador(false)}
      />

      <ModuloNominaBorradorModal
        isOpen={modalNomina}
        empresaId={empresaActual.id}
        empresaNombre={empresaActual.nombre_razon_social}
        puedeRevisar={ve('nomina_revision', 'write')}
        onClose={() => setModalNomina(false)}
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

      <ModuloConveniosSolidariosModal
        isOpen={modalConveniosSolidarios}
        onClose={() => setModalConveniosSolidarios(false)}
        empresaActual={empresaActual}
      />

      <GestionUsuariosEmpresaModal
        isOpen={modalGestionUsuarios}
        onClose={() => setModalGestionUsuarios(false)}
        empresa={empresaActual}
        perfil={perfil}
      />

      {metricas && (
        <ReportesInformesModal
          isOpen={modalReportes}
          onClose={() => setModalReportes(false)}
          empresaActual={empresaActual}
          metricas={metricas}
          transacciones={transacciones}
        />
      )}

    </div>
  );
};

export default ContabAppDashboard;
