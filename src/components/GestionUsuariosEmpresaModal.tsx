import React, { useCallback, useEffect, useState } from 'react';
import { actualizarMembresia, crearUsuarioEmpresa, MembresiaUsuario, PerfilUsuario, RolEmpresa, obtenerMembresiasEmpresa } from '../services/authApi';
import { EmpresaContable } from '../types';

interface Props {
  isOpen: boolean;
  onClose: () => void;
  empresa: EmpresaContable;
  perfil: PerfilUsuario;
}

const ROLES: Array<{ value: RolEmpresa; label: string }> = [
  { value: 'CONTADOR', label: 'Contador' },
  { value: 'AUXILIAR_CONTABLE', label: 'Auxiliar contable' },
  { value: 'ADMINISTRADOR', label: 'Administrador' },
  { value: 'EMPRESARIO', label: 'Empresario' },
];

const FORMULARIO_INICIAL = {
  username: '',
  email: '',
  password: '',
  first_name: '',
  last_name: '',
  rol: 'AUXILIAR_CONTABLE' as RolEmpresa,
};

function mensajeDeError(error: unknown): string {
  return error instanceof Error ? error.message : 'No fue posible completar la operación.';
}

export const GestionUsuariosEmpresaModal: React.FC<Props> = ({
  isOpen,
  onClose,
  empresa,
  perfil,
}) => {
  const [membresias, setMembresias] = useState<MembresiaUsuario[]>([]);
  const [formulario, setFormulario] = useState(FORMULARIO_INICIAL);
  const [cargando, setCargando] = useState(false);
  const [guardando, setGuardando] = useState(false);
  const [membresiaEnCambio, setMembresiaEnCambio] = useState<number | null>(null);
  const [error, setError] = useState('');

  const cargarMembresias = useCallback(async () => {
    setCargando(true);
    setError('');
    try {
      setMembresias(await obtenerMembresiasEmpresa(empresa.id));
    } catch (err) {
      setError(mensajeDeError(err));
    } finally {
      setCargando(false);
    }
  }, [empresa.id]);

  useEffect(() => {
    if (isOpen) void cargarMembresias();
  }, [isOpen, cargarMembresias]);

  const crearUsuario = async (event: React.FormEvent) => {
    event.preventDefault();
    setGuardando(true);
    setError('');
    try {
      await crearUsuarioEmpresa({
        ...formulario,
        organizacion: empresa.id,
      });
      setFormulario(FORMULARIO_INICIAL);
      await cargarMembresias();
    } catch (err) {
      setError(mensajeDeError(err));
    } finally {
      setGuardando(false);
    }
  };

  const guardarCambio = async (
    membresia: MembresiaUsuario,
    cambios: Partial<Pick<MembresiaUsuario, 'rol' | 'activo'>>
  ) => {
    setMembresiaEnCambio(membresia.id);
    setError('');
    try {
      await actualizarMembresia(membresia.id, cambios);
      await cargarMembresias();
    } catch (err) {
      setError(mensajeDeError(err));
    } finally {
      setMembresiaEnCambio(null);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
      <section
        role="dialog"
        aria-modal="true"
        aria-labelledby="gestion-usuarios-titulo"
        className="flex max-h-[92vh] w-full max-w-4xl flex-col overflow-hidden rounded-3xl bg-white shadow-2xl"
      >
        <header className="flex items-start justify-between gap-4 bg-[#0F3963] p-5 text-white">
          <div>
            <h2 id="gestion-usuarios-titulo" className="text-lg font-bold">Usuarios y roles</h2>
            <p className="mt-1 text-xs text-blue-100">{empresa.nombre_razon_social}</p>
          </div>
          <button onClick={onClose} className="rounded-lg px-3 py-1 text-sm hover:bg-white/10">
            Cerrar
          </button>
        </header>

        <div className="grid gap-6 overflow-y-auto p-5 md:grid-cols-[minmax(0,1fr)_minmax(0,1.3fr)]">
          <form onSubmit={crearUsuario} className="space-y-3 rounded-2xl border border-slate-200 p-4">
            <div>
              <h3 className="text-sm font-bold text-slate-900">Crear acceso</h3>
              <p className="mt-1 text-xs text-slate-500">La persona recibirá acceso únicamente a esta empresa.</p>
            </div>
            <label className="block text-xs font-semibold text-slate-700">
              Usuario
              <input
                required
                autoComplete="off"
                value={formulario.username}
                onChange={(event) => setFormulario({ ...formulario, username: event.target.value })}
                className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 font-normal"
              />
            </label>
            <label className="block text-xs font-semibold text-slate-700">
              Correo
              <input
                required
                type="email"
                value={formulario.email}
                onChange={(event) => setFormulario({ ...formulario, email: event.target.value })}
                className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 font-normal"
              />
            </label>
            <div className="grid grid-cols-2 gap-2">
              <label className="block text-xs font-semibold text-slate-700">
                Nombre
                <input
                  value={formulario.first_name}
                  onChange={(event) => setFormulario({ ...formulario, first_name: event.target.value })}
                  className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 font-normal"
                />
              </label>
              <label className="block text-xs font-semibold text-slate-700">
                Apellido
                <input
                  value={formulario.last_name}
                  onChange={(event) => setFormulario({ ...formulario, last_name: event.target.value })}
                  className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 font-normal"
                />
              </label>
            </div>
            <label className="block text-xs font-semibold text-slate-700">
              Contraseña inicial
              <input
                required
                type="password"
                minLength={8}
                autoComplete="new-password"
                value={formulario.password}
                onChange={(event) => setFormulario({ ...formulario, password: event.target.value })}
                className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 font-normal"
              />
            </label>
            <label className="block text-xs font-semibold text-slate-700">
              Rol
              <select
                value={formulario.rol}
                onChange={(event) => setFormulario({ ...formulario, rol: event.target.value as RolEmpresa })}
                className="mt-1 w-full rounded-lg border border-slate-300 bg-white px-3 py-2 font-normal"
              >
                {ROLES.map((rol) => <option key={rol.value} value={rol.value}>{rol.label}</option>)}
              </select>
            </label>
            <button
              disabled={guardando}
              className="w-full rounded-xl bg-[#0F3963] px-4 py-2.5 text-sm font-bold text-white disabled:opacity-60"
            >
              {guardando ? 'Creando…' : 'Crear usuario'}
            </button>
          </form>

          <div className="space-y-3">
            <div className="flex items-center justify-between gap-3">
              <div>
                <h3 className="text-sm font-bold text-slate-900">Accesos de la empresa</h3>
                <p className="text-xs text-slate-500">Cambie roles o revoque y reactive accesos.</p>
              </div>
              <button
                onClick={() => void cargarMembresias()}
                disabled={cargando}
                className="rounded-lg border border-slate-300 px-3 py-1.5 text-xs font-bold text-slate-700 disabled:opacity-60"
              >
                Actualizar
              </button>
            </div>
            {cargando ? (
              <p className="rounded-xl bg-slate-50 p-4 text-sm text-slate-500">Cargando usuarios…</p>
            ) : membresias.length === 0 ? (
              <p className="rounded-xl bg-slate-50 p-4 text-sm text-slate-500">No hay accesos registrados para esta empresa.</p>
            ) : (
              <ul className="divide-y divide-slate-100 rounded-xl border border-slate-200">
                {membresias.map((membresia) => {
                  const propia = !perfil.es_admin_plataforma && membresia.usuario === perfil.id;
                  const cambiando = membresiaEnCambio === membresia.id;
                  return (
                    <li key={membresia.id} className="space-y-2 p-3">
                      <div className="flex flex-wrap items-start justify-between gap-2">
                        <div>
                          <p className="text-sm font-bold text-slate-800">{membresia.usuario_username}</p>
                          <p className="text-xs text-slate-500">{membresia.usuario_email}</p>
                        </div>
                        <span className={`rounded-full px-2 py-1 text-[10px] font-bold ${membresia.activo ? 'bg-emerald-50 text-emerald-800' : 'bg-slate-100 text-slate-600'}`}>
                          {membresia.activo ? 'Activo' : 'Revocado'}
                        </span>
                      </div>
                      <div className="flex flex-wrap items-center justify-between gap-2">
                        <select
                          aria-label={`Rol de ${membresia.usuario_username}`}
                          disabled={propia || cambiando}
                          value={membresia.rol}
                          onChange={(event) => void guardarCambio(membresia, { rol: event.target.value as RolEmpresa })}
                          className="rounded-lg border border-slate-300 bg-white px-2 py-1.5 text-xs disabled:bg-slate-100"
                        >
                          {ROLES.map((rol) => <option key={rol.value} value={rol.value}>{rol.label}</option>)}
                        </select>
                        {propia ? (
                          <span className="text-[11px] text-slate-400">No puede modificar su propio acceso.</span>
                        ) : (
                          <button
                            disabled={cambiando}
                            onClick={() => void guardarCambio(membresia, { activo: !membresia.activo })}
                            className={`rounded-lg px-3 py-1.5 text-xs font-bold disabled:opacity-60 ${membresia.activo ? 'bg-rose-50 text-rose-700 hover:bg-rose-100' : 'bg-emerald-50 text-emerald-700 hover:bg-emerald-100'}`}
                          >
                            {cambiando ? 'Guardando…' : membresia.activo ? 'Revocar acceso' : 'Reactivar acceso'}
                          </button>
                        )}
                      </div>
                    </li>
                  );
                })}
              </ul>
            )}
          </div>
        </div>

        {error && <p role="alert" className="mx-5 mb-5 rounded-xl border border-rose-200 bg-rose-50 p-3 text-sm text-rose-800">{error}</p>}
      </section>
    </div>
  );
};
