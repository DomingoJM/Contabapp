import React, { useEffect, useMemo, useState } from 'react';
import {
  ArrowPathIcon,
  CheckCircleIcon,
  DocumentCheckIcon,
  FingerPrintIcon,
  LockClosedIcon,
  ShieldCheckIcon,
  XMarkIcon,
} from '@heroicons/react/24/outline';
import { EmpresaContable } from '../types';
import {
  aprobarHito,
  avanzarFase,
  anularDesembolso,
  cerrarSesion,
  crearConvenio,
  crearDesembolso,
  crearHito,
  firmarEvento,
  iniciarSesion,
  marcarDesembolsoPagado,
  obtenerConvenios,
  obtenerDesembolsos,
  obtenerEventos,
  obtenerFirmantes,
  obtenerHitos,
  obtenerOrganizaciones,
  obtenerRequisitos,
  OrganizacionConvenio,
  Convenio,
  Desembolso,
  EventoConvenio,
  Firmante,
  Hito,
  Requisito,
  verificarCadena,
  verificarRequisito,
  registrarFirmante,
  reactivarConvenio,
  suspenderConvenio,
} from '../services/conveniosApi';

interface Props {
  isOpen: boolean;
  onClose: () => void;
  empresaActual: EmpresaContable;
}

const FASES = [
  { codigo: 'PRECONTRACTUAL', nombre: '1. Precontractual' },
  { codigo: 'CONTRACTUAL', nombre: '2. Contractual' },
  { codigo: 'EJECUCION', nombre: '3. Ejecución' },
  { codigo: 'POSTCONTRACTUAL', nombre: '4. Postcontractual' },
] as const;

const PLANTILLAS = {
  OBRA: {
    nombre: 'Obra o mejoramiento comunitario',
    objeto: 'Ejecución de obra comunitaria definida en el convenio, con seguimiento por hitos y rendición de cuentas.',
  },
  SOCIAL: {
    nombre: 'Programa social comunitario',
    objeto: 'Implementación de un programa social comunitario con población beneficiaria, actividades e indicadores acordados.',
  },
  ASISTENCIA: {
    nombre: 'Asistencia técnica y capacitación',
    objeto: 'Prestación de asistencia técnica y capacitación comunitaria con productos verificables y actas de recibo.',
  },
};

const formatMoney = (value: string | number) =>
  Number(value).toLocaleString('es-CO', { style: 'currency', currency: 'COP', maximumFractionDigits: 0 });

function bytesToBase64(bytes: Uint8Array): string {
  let binary = '';
  bytes.forEach((byte) => { binary += String.fromCharCode(byte); });
  return window.btoa(binary);
}

function toPem(label: string, bytes: Uint8Array): string {
  const base64 = bytesToBase64(bytes);
  const lines = base64.match(/.{1,64}/g) || [];
  return `-----BEGIN ${label}-----\n${lines.join('\n')}\n-----END ${label}-----\n`;
}

function pemToBytes(pem: string): Uint8Array {
  const base64 = pem.replace(/-----[^-]+-----/g, '').replace(/\s/g, '');
  const binary = window.atob(base64);
  return Uint8Array.from(binary, (character) => character.charCodeAt(0));
}

function toArrayBuffer(bytes: Uint8Array): ArrayBuffer {
  const buffer = new ArrayBuffer(bytes.length);
  new Uint8Array(buffer).set(bytes);
  return buffer;
}

function guardarArchivo(nombre: string, contenido: string): void {
  const url = URL.createObjectURL(new Blob([contenido], { type: 'application/x-pem-file' }));
  const anchor = document.createElement('a');
  anchor.href = url;
  anchor.download = nombre;
  anchor.click();
  URL.revokeObjectURL(url);
}

async function calcularSha256(file: File): Promise<string> {
  const digest = await crypto.subtle.digest('SHA-256', await file.arrayBuffer());
  return Array.from(new Uint8Array(digest), (byte) => byte.toString(16).padStart(2, '0')).join('');
}

export const ModuloConveniosSolidariosModal: React.FC<Props> = ({
  isOpen,
  onClose,
  empresaActual,
}) => {
  const [authenticated, setAuthenticated] = useState(false);
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [organizaciones, setOrganizaciones] = useState<OrganizacionConvenio[]>([]);
  const [convenios, setConvenios] = useState<Convenio[]>([]);
  const [convenioActualId, setConvenioActualId] = useState<string | null>(null);
  const [requisitos, setRequisitos] = useState<Requisito[]>([]);
  const [hitos, setHitos] = useState<Hito[]>([]);
  const [firmantes, setFirmantes] = useState<Firmante[]>([]);
  const [eventos, setEventos] = useState<EventoConvenio[]>([]);
  const [desembolsos, setDesembolsos] = useState<Desembolso[]>([]);
  const [cadenaValida, setCadenaValida] = useState<boolean | null>(null);
  const [cargando, setCargando] = useState(false);
  const [guardando, setGuardando] = useState(false);
  const [error, setError] = useState('');
  const [mensaje, setMensaje] = useState('');
  const [mostrarFormulario, setMostrarFormulario] = useState(false);
  const [plantilla, setPlantilla] = useState<keyof typeof PLANTILLAS>('OBRA');
  const [organizacionId, setOrganizacionId] = useState('');
  const [codigo, setCodigo] = useState('');
  const [nombre, setNombre] = useState('');
  const [entidad, setEntidad] = useState('');
  const [objeto, setObjeto] = useState(PLANTILLAS.OBRA.objeto);
  const [monto, setMonto] = useState('');
  const [firmasRequeridas, setFirmasRequeridas] = useState(2);
  const [hitoNombre, setHitoNombre] = useState('');
  const [hitoMonto, setHitoMonto] = useState('');
  const [hitoFecha, setHitoFecha] = useState('');
  const [desembolsoHito, setDesembolsoHito] = useState('');
  const [desembolsoNombre, setDesembolsoNombre] = useState('');
  const [desembolsoMonto, setDesembolsoMonto] = useState('');
  const [firmanteUsuario, setFirmanteUsuario] = useState('');
  const [firmanteRol, setFirmanteRol] = useState<Firmante['rol']>('PRESIDENTE');

  const convenioActual = useMemo(
    () => convenios.find((convenio) => convenio.id === convenioActualId) || null,
    [convenios, convenioActualId],
  );
  const faseIndex = FASES.findIndex((fase) => fase.codigo === convenioActual?.fase);

  const cargarDetalle = async (convenioId: string) => {
    const [requisitosData, hitosData, firmantesData, eventosData, desembolsosData, cadena] = await Promise.all([
      obtenerRequisitos(convenioId),
      obtenerHitos(convenioId),
      obtenerFirmantes(convenioId),
      obtenerEventos(convenioId),
      obtenerDesembolsos(convenioId),
      verificarCadena(convenioId),
    ]);
    setRequisitos(requisitosData);
    setHitos(hitosData);
    setFirmantes(firmantesData);
    setEventos(eventosData);
    setDesembolsos(desembolsosData);
    setCadenaValida(cadena.valida);
  };

  const cargarDatos = async () => {
    setCargando(true);
    setError('');
    try {
      const [organizacionesData, conveniosData] = await Promise.all([
        obtenerOrganizaciones(),
        obtenerConvenios(),
      ]);
      setOrganizaciones(organizacionesData);
      setConvenios(conveniosData);
      setOrganizacionId((actual) => (
        organizacionesData.some((organizacion) => organizacion.id === actual)
          ? actual
          : organizacionesData.find((organizacion) => organizacion.id === empresaActual.id)?.id
            || organizacionesData[0]?.id
            || ''
      ));
      if (convenioActualId && conveniosData.some((item) => item.id === convenioActualId)) {
        await cargarDetalle(convenioActualId);
      } else {
        setConvenioActualId(null);
        setRequisitos([]);
        setHitos([]);
        setFirmantes([]);
        setEventos([]);
        setDesembolsos([]);
        setCadenaValida(null);
      }
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : 'No se pudieron cargar los convenios.');
    } finally {
      setCargando(false);
    }
  };

  useEffect(() => {
    if (!isOpen) return;
    const hasToken = Boolean(localStorage.getItem('access_token'));
    setAuthenticated(hasToken);
    if (hasToken) void cargarDatos();
  }, [isOpen]);

  useEffect(() => {
    if (isOpen && authenticated && convenioActualId) {
      cargarDetalle(convenioActualId).catch((requestError: unknown) => {
        setError(requestError instanceof Error ? requestError.message : 'No se pudo cargar el detalle.');
      });
    }
  }, [convenioActualId, authenticated, isOpen]);

  if (!isOpen) return null;

  const ejecutar = async (operation: () => Promise<unknown>, successMessage: string) => {
    setGuardando(true);
    setError('');
    setMensaje('');
    try {
      await operation();
      if (convenioActualId) await cargarDetalle(convenioActualId);
      const conveniosData = await obtenerConvenios();
      setConvenios(conveniosData);
      setMensaje(successMessage);
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : 'No fue posible completar la operación.');
    } finally {
      setGuardando(false);
    }
  };

  const handleLogin = async (event: React.FormEvent) => {
    event.preventDefault();
    setGuardando(true);
    setError('');
    try {
      await iniciarSesion(username, password);
      setPassword('');
      setAuthenticated(true);
      await cargarDatos();
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : 'No fue posible iniciar sesión.');
    } finally {
      setGuardando(false);
    }
  };

  const handleCreate = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!organizacionId) {
      setError('No hay organizaciones disponibles para esta cuenta.');
      return;
    }
    setGuardando(true);
    setError('');
    try {
      const convenio = await crearConvenio({
        organizacion: organizacionId,
        codigo,
        nombre,
        entidad_contratante: entidad,
        objeto,
        monto_total: monto,
        firmas_requeridas: firmasRequeridas,
      });
      setConvenios((actuales) => [convenio, ...actuales]);
      setConvenioActualId(convenio.id);
      setMostrarFormulario(false);
      setCodigo('');
      setNombre('');
      setEntidad('');
      setMonto('');
      setMensaje('Convenio creado. Verifica los requisitos antes de avanzar de fase.');
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : 'No se pudo crear el convenio.');
    } finally {
      setGuardando(false);
    }
  };

  const handleVerifyDocument = async (requisito: Requisito, file?: File) => {
    if (!convenioActual || !file) return;
    setGuardando(true);
    setError('');
    try {
      const sha256 = await calcularSha256(file);
      await verificarRequisito(convenioActual.id, requisito.id, sha256);
      await cargarDetalle(convenioActual.id);
      setMensaje(`Requisito verificado. Solo se guardó su huella SHA-256: ${sha256}`);
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : 'No se pudo verificar el documento.');
    } finally {
      setGuardando(false);
    }
  };

  const handleCreateSigner = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!convenioActual) return;
    setGuardando(true);
    setError('');
    setMensaje('');
    try {
      const keyPair = await crypto.subtle.generateKey(
        { name: 'Ed25519' },
        true,
        ['sign', 'verify'],
      );
      const publicKey = new Uint8Array(await crypto.subtle.exportKey('spki', keyPair.publicKey));
      const privateKey = new Uint8Array(await crypto.subtle.exportKey('pkcs8', keyPair.privateKey));
      await registrarFirmante(convenioActual.id, {
        usuario: Number(firmanteUsuario),
        rol: firmanteRol,
        clave_publica_pem: toPem('PUBLIC KEY', publicKey),
      });
      guardarArchivo(`clave-privada-${firmanteRol.toLowerCase()}-${firmanteUsuario}.pem`, toPem('PRIVATE KEY', privateKey));
      setFirmanteUsuario('');
      await cargarDetalle(convenioActual.id);
      setMensaje('Firmante registrado. Guarda la clave privada fuera de este dispositivo; nunca se envía al servidor.');
    } catch (requestError) {
      setError(requestError instanceof Error
        ? `No se pudo registrar el firmante: ${requestError.message}. Verifica que este navegador admita Ed25519.`
        : 'No se pudo registrar el firmante.');
    } finally {
      setGuardando(false);
    }
  };

  const handleSignEvent = async (event: EventoConvenio, file?: File) => {
    if (!convenioActual || !file) return;
    setGuardando(true);
    setError('');
    try {
      const pem = await file.text();
      const privateKeyBytes = pemToBytes(pem);
      const privateKey = await crypto.subtle.importKey(
        'pkcs8',
        toArrayBuffer(privateKeyBytes),
        { name: 'Ed25519' },
        false,
        ['sign'],
      );
      const eventHash = Uint8Array.from(
        event.hash_evento.match(/.{2}/g) || [],
        (byte) => Number.parseInt(byte, 16),
      );
      const signature = new Uint8Array(await crypto.subtle.sign({ name: 'Ed25519' }, privateKey, toArrayBuffer(eventHash)));
      await firmarEvento(convenioActual.id, event.id, bytesToBase64(signature));
      await cargarDetalle(convenioActual.id);
      const conveniosData = await obtenerConvenios();
      setConvenios(conveniosData);
      setMensaje('Firma verificada y registrada para este evento.');
    } catch (requestError) {
      setError(requestError instanceof Error
        ? `No se pudo firmar el evento: ${requestError.message}`
        : 'No se pudo firmar el evento.');
    } finally {
      setGuardando(false);
    }
  };

  const handleLogout = () => {
    cerrarSesion();
    setAuthenticated(false);
    setConvenios([]);
    setOrganizaciones([]);
    setConvenioActualId(null);
    setError('');
    setMensaje('');
  };

  const faseNombre = (fase: Convenio['fase']) =>
    FASES.find((item) => item.codigo === fase)?.nombre.replace(/^\d+\.\s/, '') || fase;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/70 p-3 backdrop-blur-sm md:p-6">
      <section
        role="dialog"
        aria-modal="true"
        aria-labelledby="convenios-title"
        className="flex max-h-[94vh] w-full max-w-6xl flex-col overflow-hidden rounded-3xl bg-slate-50 shadow-2xl"
      >
        <header className="flex items-start justify-between gap-4 bg-[#0F3963] p-5 text-white md:p-6">
          <div className="flex items-start gap-3">
            <div className="rounded-2xl bg-white/10 p-3">
              <ShieldCheckIcon className="h-7 w-7 text-emerald-300" />
            </div>
            <div>
              <h2 id="convenios-title" className="text-xl font-black md:text-2xl">Convenios Solidarios</h2>
              <p className="mt-1 text-xs text-blue-100">
                Cuatro fases, requisitos verificables y trazabilidad SHA-256. No reemplaza SECOP ni el convenio jurídico.
              </p>
            </div>
          </div>
          <button type="button" onClick={onClose} aria-label="Cerrar" className="rounded-full p-2 text-white/80 hover:bg-white/10 hover:text-white">
            <XMarkIcon className="h-6 w-6" />
          </button>
        </header>

        <div className="flex-1 overflow-y-auto p-4 md:p-6">
          {error && <div role="alert" className="mb-4 rounded-xl border border-rose-200 bg-rose-50 p-3 text-sm text-rose-800">{error}</div>}
          {mensaje && <div role="status" className="mb-4 rounded-xl border border-emerald-200 bg-emerald-50 p-3 text-sm text-emerald-800">{mensaje}</div>}

          {!authenticated ? (
            <form onSubmit={handleLogin} className="mx-auto max-w-md rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
              <div className="mb-4 flex items-center gap-2 text-[#0F3963]">
                <LockClosedIcon className="h-5 w-5" />
                <h3 className="font-bold">Inicia sesión con tu cuenta</h3>
              </div>
              <p className="mb-5 text-sm text-slate-600">Usa la cuenta propietaria de la organización registrada en ContabApp. La contraseña solo se utiliza para solicitar el token JWT.</p>
              <label className="mb-3 block text-xs font-bold text-slate-700">
                Usuario
                <input required autoComplete="username" value={username} onChange={(event) => setUsername(event.target.value)} className="mt-1 w-full rounded-xl border border-slate-300 px-3 py-2.5 text-sm font-normal" />
              </label>
              <label className="mb-5 block text-xs font-bold text-slate-700">
                Contraseña
                <input required type="password" autoComplete="current-password" value={password} onChange={(event) => setPassword(event.target.value)} className="mt-1 w-full rounded-xl border border-slate-300 px-3 py-2.5 text-sm font-normal" />
              </label>
              <button disabled={guardando} className="w-full rounded-xl bg-[#0F3963] px-4 py-3 text-sm font-bold text-white disabled:opacity-60">
                {guardando ? 'Conectando…' : 'Conectar de forma segura'}
              </button>
            </form>
          ) : (
            <div className="grid gap-5 lg:grid-cols-[300px_minmax(0,1fr)]">
              <aside className="space-y-4">
                <div className="rounded-2xl border border-slate-200 bg-white p-4">
                  <div className="mb-3 flex items-center justify-between gap-2">
                    <h3 className="font-black text-slate-900">Mis convenios</h3>
                    <button type="button" onClick={() => void cargarDatos()} disabled={cargando} aria-label="Actualizar convenios" className="rounded-lg p-2 text-slate-500 hover:bg-slate-100">
                      <ArrowPathIcon className={`h-4 w-4 ${cargando ? 'animate-spin' : ''}`} />
                    </button>
                  </div>
                  {convenios.length ? (
                    <div className="space-y-2">
                      {convenios.map((convenio) => (
                        <button
                          key={convenio.id}
                          type="button"
                          onClick={() => { setConvenioActualId(convenio.id); setMostrarFormulario(false); setError(''); setMensaje(''); }}
                          className={`w-full rounded-xl border p-3 text-left transition ${convenioActualId === convenio.id ? 'border-blue-300 bg-blue-50' : 'border-slate-200 hover:bg-slate-50'}`}
                        >
                          <span className="block truncate text-xs font-black text-slate-900">{convenio.codigo}</span>
                          <span className="mt-1 block text-xs text-slate-600">{convenio.nombre}</span>
                          <span className="mt-2 inline-flex rounded-full bg-slate-100 px-2 py-0.5 text-[10px] font-bold text-slate-700">{faseNombre(convenio.fase)} · {convenio.estado}</span>
                        </button>
                      ))}
                    </div>
                  ) : (
                    <p className="rounded-xl bg-slate-50 p-3 text-xs text-slate-500">
                      {cargando ? 'Cargando convenios…' : 'Aún no tienes convenios registrados.'}
                    </p>
                  )}
                  <button type="button" onClick={() => { setMostrarFormulario(true); setConvenioActualId(null); setError(''); setMensaje(''); }} className="mt-3 w-full rounded-xl bg-[#0F3963] px-3 py-2.5 text-xs font-bold text-white hover:bg-[#0b2b4b]">
                    + Crear convenio
                  </button>
                  <button type="button" onClick={handleLogout} className="mt-2 w-full rounded-xl border border-slate-200 px-3 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-50">
                    Cerrar sesión
                  </button>
                </div>
                <div className="rounded-2xl border border-amber-200 bg-amber-50 p-4 text-xs leading-relaxed text-amber-950">
                  <strong>Alcance del registro:</strong> las huellas prueban integridad técnica. No certifican por sí solas la validez jurídica, ni sustituyen la minuta, las pólizas, SECOP o la revisión profesional.
                </div>
              </aside>

              <main className="min-w-0 space-y-4">
                {mostrarFormulario ? (
                  <form onSubmit={handleCreate} className="rounded-2xl border border-slate-200 bg-white p-5">
                    <h3 className="text-lg font-black text-slate-900">Nuevo convenio · Fase precontractual</h3>
                    <p className="mb-4 mt-1 text-xs text-slate-500">El asistente inicia con una plantilla editable y carga el checklist de diez requisitos.</p>
                    <div className="grid gap-3 sm:grid-cols-2">
                      <label className="text-xs font-bold text-slate-700 sm:col-span-2">
                        Organización propietaria
                        <select required value={organizacionId} onChange={(event) => setOrganizacionId(event.target.value)} className="mt-1 w-full rounded-xl border border-slate-300 bg-white px-3 py-2.5 text-sm font-normal">
                          <option value="">Selecciona una organización</option>
                          {organizaciones.map((organizacion) => <option key={organizacion.id} value={organizacion.id}>{organizacion.nombre_razon_social} · NIT {organizacion.nit_o_cedula}</option>)}
                        </select>
                      </label>
                      <label className="text-xs font-bold text-slate-700">
                        Plantilla inicial
                        <select value={plantilla} onChange={(event) => { const next = event.target.value as keyof typeof PLANTILLAS; setPlantilla(next); setObjeto(PLANTILLAS[next].objeto); }} className="mt-1 w-full rounded-xl border border-slate-300 bg-white px-3 py-2.5 text-sm font-normal">
                          {Object.entries(PLANTILLAS).map(([key, value]) => <option key={key} value={key}>{value.nombre}</option>)}
                        </select>
                      </label>
                      <label className="text-xs font-bold text-slate-700">
                        Código del convenio
                        <input required maxLength={50} value={codigo} onChange={(event) => setCodigo(event.target.value)} placeholder="Ej. JAC-2026-001" className="mt-1 w-full rounded-xl border border-slate-300 px-3 py-2.5 text-sm font-normal" />
                      </label>
                      <label className="text-xs font-bold text-slate-700 sm:col-span-2">
                        Nombre del convenio
                        <input required maxLength={255} value={nombre} onChange={(event) => setNombre(event.target.value)} className="mt-1 w-full rounded-xl border border-slate-300 px-3 py-2.5 text-sm font-normal" />
                      </label>
                      <label className="text-xs font-bold text-slate-700 sm:col-span-2">
                        Entidad contratante
                        <input required maxLength={255} value={entidad} onChange={(event) => setEntidad(event.target.value)} className="mt-1 w-full rounded-xl border border-slate-300 px-3 py-2.5 text-sm font-normal" />
                      </label>
                      <label className="text-xs font-bold text-slate-700 sm:col-span-2">
                        Objeto del convenio
                        <textarea required value={objeto} onChange={(event) => setObjeto(event.target.value)} rows={3} className="mt-1 w-full rounded-xl border border-slate-300 px-3 py-2.5 text-sm font-normal" />
                      </label>
                      <label className="text-xs font-bold text-slate-700">
                        Monto total (COP)
                        <input required type="number" min="0.01" step="0.01" value={monto} onChange={(event) => setMonto(event.target.value)} className="mt-1 w-full rounded-xl border border-slate-300 px-3 py-2.5 text-sm font-normal" />
                      </label>
                      <label className="text-xs font-bold text-slate-700">
                        Firmas requeridas para desembolsos
                        <select value={firmasRequeridas} onChange={(event) => setFirmasRequeridas(Number(event.target.value))} className="mt-1 w-full rounded-xl border border-slate-300 bg-white px-3 py-2.5 text-sm font-normal">
                          <option value={1}>1 de hasta 3</option>
                          <option value={2}>2 de hasta 3 (recomendado)</option>
                          <option value={3}>3 de hasta 3</option>
                        </select>
                      </label>
                    </div>
                    <div className="mt-5 flex flex-wrap justify-end gap-2">
                      <button type="button" onClick={() => setMostrarFormulario(false)} className="rounded-xl border border-slate-200 px-4 py-2.5 text-xs font-bold text-slate-600">Cancelar</button>
                      <button disabled={guardando || !organizacionId} className="rounded-xl bg-[#0F3963] px-4 py-2.5 text-xs font-bold text-white disabled:opacity-50">{guardando ? 'Guardando…' : 'Crear y cargar checklist'}</button>
                    </div>
                    {!organizaciones.length && !cargando && <p className="mt-3 text-xs text-amber-700">Esta cuenta no tiene organizaciones propias. Las organizaciones de demostración locales no se pueden usar para convenios.</p>}
                  </form>
                ) : convenioActual ? (
                  <>
                    <section className="rounded-2xl border border-slate-200 bg-white p-5">
                      <div className="flex flex-wrap items-start justify-between gap-3">
                        <div>
                          <div className="flex flex-wrap items-center gap-2">
                            <span className="rounded-lg bg-blue-50 px-2 py-1 text-[10px] font-black text-[#0F3963]">{convenioActual.codigo}</span>
                            <span className={`rounded-full px-2 py-1 text-[10px] font-bold ${convenioActual.estado === 'ACTIVO' ? 'bg-emerald-100 text-emerald-800' : 'bg-slate-100 text-slate-700'}`}>{convenioActual.estado}</span>
                          </div>
                          <h3 className="mt-2 text-lg font-black text-slate-900">{convenioActual.nombre}</h3>
                          <p className="mt-1 text-xs text-slate-600">{convenioActual.entidad_contratante} · {formatMoney(convenioActual.monto_total)}</p>
                        </div>
                        <div className={`flex items-center gap-1 rounded-xl px-3 py-2 text-xs font-bold ${cadenaValida ? 'bg-emerald-50 text-emerald-800' : 'bg-rose-50 text-rose-800'}`}>
                          <FingerPrintIcon className="h-4 w-4" />
                          {cadenaValida === null ? 'Verificando…' : cadenaValida ? 'Cadena íntegra' : 'Cadena alterada'}
                        </div>
                      </div>
                      <div className="mt-5 grid grid-cols-2 gap-2 md:grid-cols-4">
                        {FASES.map((fase, index) => (
                          <div key={fase.codigo} className={`rounded-xl border p-3 text-center text-[11px] font-bold ${index === faseIndex ? 'border-blue-300 bg-blue-50 text-[#0F3963]' : index < faseIndex ? 'border-emerald-200 bg-emerald-50 text-emerald-800' : 'border-slate-200 bg-slate-50 text-slate-400'}`}>
                            {index < faseIndex ? <CheckCircleIcon className="mx-auto mb-1 h-4 w-4" /> : <span className="mb-1 block">{index + 1}</span>}
                            {fase.nombre.replace(/^\d+\.\s/, '')}
                          </div>
                        ))}
                      </div>
                      <div className="mt-4 flex flex-wrap items-center justify-between gap-2 border-t border-slate-100 pt-4">
                        <p className="text-xs text-slate-500">Siguiente fase: <strong>{faseIndex < 3 ? FASES[faseIndex + 1]?.nombre : 'Proceso finalizado'}</strong></p>
                        <div className="flex flex-wrap gap-2">
                          {convenioActual.estado === 'SUSPENDIDO' ? (
                            <button disabled={guardando} onClick={() => void ejecutar(() => reactivarConvenio(convenioActual.id), 'Convenio reactivado.')} className="rounded-xl border border-emerald-200 px-3 py-2 text-xs font-bold text-emerald-800">Reactivar</button>
                          ) : convenioActual.estado !== 'CERRADO' && (
                            <button disabled={guardando} onClick={() => void ejecutar(() => suspenderConvenio(convenioActual.id), 'Convenio suspendido.')} className="rounded-xl border border-amber-200 px-3 py-2 text-xs font-bold text-amber-800">Suspender</button>
                          )}
                          {convenioActual.estado !== 'CERRADO' && faseIndex < 3 && (
                            <button disabled={guardando} onClick={() => void ejecutar(() => avanzarFase(convenioActual.id), 'Fase avanzada.')} className="rounded-xl bg-[#0F3963] px-3 py-2 text-xs font-bold text-white disabled:opacity-50">
                              Avanzar de fase
                            </button>
                          )}
                        </div>
                      </div>
                    </section>

                    {convenioActual.fase === 'PRECONTRACTUAL' && (
                      <section className="rounded-2xl border border-slate-200 bg-white p-5">
                        <div className="mb-4 flex items-start justify-between gap-3">
                          <div>
                            <h4 className="font-black text-slate-900">Checklist habilitante</h4>
                            <p className="mt-1 text-xs text-slate-500">Selecciona el documento para guardar su SHA-256; el archivo no se carga al backend.</p>
                          </div>
                          <span className="rounded-full bg-slate-100 px-2.5 py-1 text-[10px] font-bold text-slate-600">{requisitos.filter((item) => item.cumplido).length}/{requisitos.length}</span>
                        </div>
                        <div className="space-y-2">
                          {requisitos.map((requisito) => (
                            <div key={requisito.id} className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-slate-100 p-3">
                              <div className="flex min-w-0 items-center gap-2">
                                <DocumentCheckIcon className={`h-5 w-5 shrink-0 ${requisito.cumplido ? 'text-emerald-600' : 'text-slate-300'}`} />
                                <div className="min-w-0">
                                  <p className="text-xs font-bold text-slate-800">{requisito.nombre}</p>
                                  {requisito.cumplido && <p className="truncate font-mono text-[9px] text-slate-500">{requisito.documento_sha256}</p>}
                                </div>
                              </div>
                              {!requisito.cumplido && (
                                <label className="cursor-pointer rounded-lg border border-slate-200 px-3 py-2 text-[10px] font-bold text-slate-700 hover:bg-slate-50">
                                  Adjuntar para verificar
                                  <input type="file" className="sr-only" disabled={guardando} onChange={(event) => { void handleVerifyDocument(requisito, event.target.files?.[0]); event.target.value = ''; }} />
                                </label>
                              )}
                            </div>
                          ))}
                        </div>
                      </section>
                    )}

                    {convenioActual.fase === 'CONTRACTUAL' && (
                      <>
                        <section className="rounded-2xl border border-slate-200 bg-white p-5">
                          <h4 className="font-black text-slate-900">Firmantes y firmas requeridas</h4>
                          <p className="mb-3 mt-1 text-xs text-slate-500">Registra presidente, tesorero y supervisor. Cada firmante genera su par de claves en este navegador; solo la clave pública se envía.</p>
                          <form onSubmit={handleCreateSigner} className="grid gap-2 sm:grid-cols-[1fr_180px_auto]">
                            <input required type="number" min="1" value={firmanteUsuario} onChange={(event) => setFirmanteUsuario(event.target.value)} placeholder="ID del usuario firmante" className="rounded-xl border border-slate-300 px-3 py-2 text-xs" />
                            <select value={firmanteRol} onChange={(event) => setFirmanteRol(event.target.value as Firmante['rol'])} className="rounded-xl border border-slate-300 bg-white px-3 py-2 text-xs">
                              <option value="PRESIDENTE">Presidente</option>
                              <option value="TESORERO">Tesorero</option>
                              <option value="SUPERVISOR">Supervisor</option>
                            </select>
                            <button disabled={guardando} className="rounded-xl bg-slate-800 px-3 py-2 text-xs font-bold text-white">Registrar y guardar clave</button>
                          </form>
                          <ul className="mt-3 flex flex-wrap gap-2">
                            {firmantes.map((firmante) => <li key={firmante.id} className="rounded-lg bg-slate-100 px-2.5 py-1.5 text-[10px] font-bold text-slate-700">Usuario {firmante.usuario} · {firmante.rol}</li>)}
                          </ul>
                          <p className="mt-3 text-[10px] leading-relaxed text-amber-800">La clave privada se descarga una sola vez. Guárdala de forma segura y no la compartas; si se pierde, no podrá reemplazarse en esta versión.</p>
                        </section>
                        <section className="rounded-2xl border border-slate-200 bg-white p-5">
                          <div className="mb-3 flex items-center justify-between gap-2">
                            <div>
                              <h4 className="font-black text-slate-900">Hitos de ejecución</h4>
                              <p className="mt-1 text-xs text-slate-500">Define resultados verificables y su tope de desembolso.</p>
                            </div>
                          </div>
                          <form onSubmit={(event) => { event.preventDefault(); void ejecutar(async () => { await crearHito(convenioActual.id, { secuencia: hitos.length + 1, nombre: hitoNombre, descripcion: '', monto_maximo: hitoMonto, ...(hitoFecha ? { fecha_limite: hitoFecha } : {}) }); setHitoNombre(''); setHitoMonto(''); setHitoFecha(''); }, 'Hito registrado.'); }} className="grid gap-2 sm:grid-cols-[1fr_160px_150px_auto]">
                            <input required value={hitoNombre} onChange={(event) => setHitoNombre(event.target.value)} placeholder="Nombre del hito" className="rounded-xl border border-slate-300 px-3 py-2 text-xs" />
                            <input required type="number" min="0.01" step="0.01" value={hitoMonto} onChange={(event) => setHitoMonto(event.target.value)} placeholder="Tope COP" className="rounded-xl border border-slate-300 px-3 py-2 text-xs" />
                            <input type="date" value={hitoFecha} onChange={(event) => setHitoFecha(event.target.value)} className="rounded-xl border border-slate-300 px-3 py-2 text-xs" />
                            <button disabled={guardando} className="rounded-xl bg-[#0F3963] px-3 py-2 text-xs font-bold text-white">Añadir hito</button>
                          </form>
                          <div className="mt-3 space-y-2">
                            {hitos.map((hito) => (
                              <div key={hito.id} className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-slate-100 p-3">
                                <div><p className="text-xs font-bold text-slate-800">{hito.secuencia}. {hito.nombre}</p><p className="mt-1 text-[10px] text-slate-500">Tope: {formatMoney(hito.monto_maximo)} · {hito.estado}</p></div>
                                {hito.estado === 'PENDIENTE' && <button disabled={guardando} onClick={() => void ejecutar(() => aprobarHito(convenioActual.id, hito.id), 'Hito aprobado por el supervisor.')} className="rounded-lg border border-emerald-200 px-3 py-2 text-[10px] font-bold text-emerald-800">Aprobar hito</button>}
                              </div>
                            ))}
                          </div>
                        </section>
                      </>
                    )}

                    {convenioActual.fase === 'EJECUCION' && (
                      <>
                        <section className="rounded-2xl border border-slate-200 bg-white p-5">
                          <h4 className="font-black text-slate-900">Solicitar desembolso</h4>
                          <p className="mb-3 mt-1 text-xs text-slate-500">El hito debe estar aprobado; los desembolsos quedan pendientes hasta alcanzar las firmas configuradas.</p>
                          <form onSubmit={(event) => { event.preventDefault(); void ejecutar(async () => { await crearDesembolso(convenioActual.id, { hito_id: Number(desembolsoHito), descripcion: desembolsoNombre, monto: desembolsoMonto }); setDesembolsoNombre(''); setDesembolsoMonto(''); }, 'Desembolso creado y pendiente de firmas.'); }} className="grid gap-2 sm:grid-cols-[1fr_1.2fr_160px_auto]">
                            <select required value={desembolsoHito} onChange={(event) => setDesembolsoHito(event.target.value)} className="rounded-xl border border-slate-300 bg-white px-3 py-2 text-xs">
                              <option value="">Selecciona hito aprobado</option>
                              {hitos.filter((hito) => hito.estado === 'APROBADO').map((hito) => <option key={hito.id} value={hito.id}>{hito.secuencia}. {hito.nombre}</option>)}
                            </select>
                            <input required value={desembolsoNombre} onChange={(event) => setDesembolsoNombre(event.target.value)} placeholder="Descripción" className="rounded-xl border border-slate-300 px-3 py-2 text-xs" />
                            <input required type="number" min="0.01" step="0.01" value={desembolsoMonto} onChange={(event) => setDesembolsoMonto(event.target.value)} placeholder="Monto COP" className="rounded-xl border border-slate-300 px-3 py-2 text-xs" />
                            <button disabled={guardando || !hitos.some((hito) => hito.estado === 'APROBADO')} className="rounded-xl bg-[#0F3963] px-3 py-2 text-xs font-bold text-white disabled:opacity-50">Solicitar</button>
                          </form>
                        </section>
                        <section className="rounded-2xl border border-slate-200 bg-white p-5">
                          <h4 className="font-black text-slate-900">Desembolsos y multifirma</h4>
                          <div className="mt-3 space-y-3">
                            {desembolsos.map((desembolso) => {
                              const evento = eventos.find((item) => item.tipo === 'DESEMBOLSO_SOLICITADO' && item.datos.desembolso_id === String(desembolso.id));
                              return (
                                <article key={desembolso.id} className="rounded-xl border border-slate-100 p-3">
                                  <div className="flex flex-wrap items-center justify-between gap-2">
                                    <div><p className="text-xs font-bold text-slate-900">{desembolso.descripcion}</p><p className="mt-1 text-[10px] text-slate-500">{formatMoney(desembolso.monto)} · {desembolso.estado}</p></div>
                                    <div className="flex flex-wrap gap-2">
                                      {desembolso.estado === 'APROBADO' && <button disabled={guardando} onClick={() => void ejecutar(() => marcarDesembolsoPagado(convenioActual.id, desembolso.id), 'Desembolso marcado como pagado.')} className="rounded-lg bg-emerald-700 px-3 py-2 text-[10px] font-bold text-white">Marcar pagado</button>}
                                      {['PENDIENTE_FIRMAS', 'APROBADO'].includes(desembolso.estado) && <button disabled={guardando} onClick={() => void ejecutar(() => anularDesembolso(convenioActual.id, desembolso.id), 'Desembolso anulado.')} className="rounded-lg border border-rose-200 px-3 py-2 text-[10px] font-bold text-rose-700">Anular</button>}
                                    </div>
                                  </div>
                                  {evento && desembolso.estado === 'PENDIENTE_FIRMAS' && (
                                    <div className="mt-3 rounded-lg bg-blue-50 p-3">
                                      <p className="text-[10px] font-bold text-blue-950">Firmas: {evento.firmas.length}/{convenioActual.firmas_requeridas}</p>
                                      <div className="mt-2 flex flex-wrap items-center gap-2">
                                        <label className="cursor-pointer rounded-lg border border-blue-200 bg-white px-3 py-2 text-[10px] font-bold text-blue-900">
                                          Seleccionar mi clave privada y firmar
                                          <input type="file" accept=".pem" className="sr-only" disabled={guardando} onChange={(inputEvent) => { void handleSignEvent(evento, inputEvent.target.files?.[0]); inputEvent.target.value = ''; }} />
                                        </label>
                                        <span className="break-all font-mono text-[9px] text-slate-500">SHA-256: {evento.hash_evento}</span>
                                      </div>
                                    </div>
                                  )}
                                </article>
                              );
                            })}
                            {!desembolsos.length && <p className="rounded-xl bg-slate-50 p-3 text-xs text-slate-500">Aún no se han solicitado desembolsos.</p>}
                          </div>
                        </section>
                      </>
                    )}

                    <section className="rounded-2xl border border-slate-200 bg-white p-5">
                      <div className="mb-3 flex items-center justify-between gap-3">
                        <div>
                          <h4 className="font-black text-slate-900">Libro de eventos</h4>
                          <p className="mt-1 text-xs text-slate-500">Cada cambio conserva su hash y el enlace con el evento anterior.</p>
                        </div>
                        <span className={`rounded-full px-2.5 py-1 text-[10px] font-bold ${cadenaValida ? 'bg-emerald-100 text-emerald-800' : 'bg-rose-100 text-rose-800'}`}>{cadenaValida ? 'Íntegro' : 'Verificar'}</span>
                      </div>
                      <div className="space-y-2">
                        {eventos.map((evento) => (
                          <div key={evento.id} className="rounded-xl border border-slate-100 p-3">
                            <div className="flex flex-wrap justify-between gap-2">
                              <p className="text-xs font-bold text-slate-800">#{evento.secuencia} · {evento.tipo.replace(/_/g, ' ')}</p>
                              <p className="text-[10px] text-slate-500">{new Date(evento.creado_en).toLocaleString('es-CO')}</p>
                            </div>
                            <p className="mt-1 break-all font-mono text-[9px] text-slate-500">Hash: {evento.hash_evento}</p>
                          </div>
                        ))}
                        {!eventos.length && <p className="rounded-xl bg-slate-50 p-3 text-xs text-slate-500">Sin eventos registrados.</p>}
                      </div>
                    </section>
                  </>
                ) : (
                  <div className="flex min-h-64 flex-col items-center justify-center rounded-2xl border border-dashed border-slate-300 bg-white p-6 text-center">
                    <ShieldCheckIcon className="h-10 w-10 text-slate-300" />
                    <h3 className="mt-3 font-black text-slate-800">Elige un convenio o crea uno nuevo</h3>
                    <p className="mt-1 max-w-md text-xs text-slate-500">El acceso está limitado a las organizaciones de tu usuario autenticado y a los convenios donde figure como firmante.</p>
                    {cargando && <p className="mt-3 text-xs text-slate-500">Cargando datos…</p>}
                  </div>
                )}
              </main>
            </div>
          )}
        </div>

        <footer className="flex flex-wrap items-center justify-between gap-3 border-t border-slate-200 bg-white px-5 py-3">
          <p className="text-[10px] text-slate-500">Registro técnico de trazabilidad. No es asesoría legal ni reemplaza la contratación estatal.</p>
          <button type="button" onClick={onClose} className="rounded-xl border border-slate-200 px-4 py-2 text-xs font-bold text-slate-600 hover:bg-slate-50">Cerrar</button>
        </footer>
      </section>
    </div>
  );
};
