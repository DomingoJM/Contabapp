import React, { useState } from 'react';
import { iniciarSesionContab, PerfilUsuario } from '../services/authApi';
import { crearPerfilDemo, RolDemo } from '../demoData';

interface Props {
  onLogin: (perfil: PerfilUsuario) => void;
  onDemoLogin: (perfil: PerfilUsuario, rol: RolDemo) => void;
  aviso?: string;
}

const rolesDemo: Array<{ value: RolDemo; label: string; description: string }> = [
  { value: 'GERENTE', label: 'Gerente', description: 'Supervisión y decisiones' },
  { value: 'CONTADOR', label: 'Contador', description: 'Operación contable completa' },
  { value: 'EMPRENDEDOR', label: 'Emprendedor', description: 'Ventas y caja diaria' },
  { value: 'ADMIN', label: 'Admin', description: 'Usuarios y configuración' },
  { value: 'SUPERADMIN', label: 'Superadmin', description: 'Plataforma completa' },
];

export const LoginScreen: React.FC<Props> = ({ onLogin, onDemoLogin, aviso }) => {
  const [identificador, setIdentificador] = useState('');
  const [password, setPassword] = useState('');
  const [rolDemo, setRolDemo] = useState<RolDemo>('EMPRENDEDOR');
  const [error, setError] = useState('');
  const [cargando, setCargando] = useState(false);

  const enviar = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setCargando(true);
    try {
      onLogin(await iniciarSesionContab(identificador.trim(), password));
    } catch (err) {
      setError(err instanceof Error ? err.message : 'No fue posible iniciar sesión.');
    } finally {
      setCargando(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4">
      <div className="w-full max-w-md bg-white rounded-3xl border border-slate-200 shadow-sm p-6 space-y-5">
        <div className="text-center">
          <img src="/logo.png" alt="ContabApp" className="h-14 w-14 mx-auto object-contain" />
          <h1 className="text-2xl font-black text-slate-900 mt-2">ContabApp</h1>
          <p className="text-xs text-slate-500">Entorno de demostración con datos ficticios</p>
        </div>
        {aviso && <p className="text-xs bg-amber-50 text-amber-800 border border-amber-200 rounded-xl p-2">{aviso}</p>}

        <section className="rounded-2xl border border-emerald-200 bg-emerald-50/70 p-4 space-y-3">
          <div>
            <h2 className="text-sm font-black text-emerald-950">Entrar sin contraseña</h2>
            <p className="text-xs text-emerald-800 mt-1">Elige el perfil que quieres explorar.</p>
          </div>
          <label className="block text-xs font-bold text-slate-700">
            Ver la app como
            <select
              value={rolDemo}
              onChange={(e) => setRolDemo(e.target.value as RolDemo)}
              className="mt-1 w-full rounded-xl border border-emerald-300 bg-white px-3 py-2.5 text-sm font-normal"
            >
              {rolesDemo.map((rol) => (
                <option key={rol.value} value={rol.value}>{rol.label} — {rol.description}</option>
              ))}
            </select>
          </label>
          <button
            type="button"
            onClick={() => onDemoLogin(crearPerfilDemo(rolDemo), rolDemo)}
            className="w-full bg-emerald-700 hover:bg-emerald-800 text-white rounded-xl py-2.5 text-sm font-bold"
          >
            Explorar ContabApp
          </button>
        </section>

        <details className="border-t border-slate-200 pt-4">
          <summary className="cursor-pointer text-xs font-bold text-slate-500">Ingresar con credenciales reales</summary>
          <form onSubmit={enviar} className="mt-4 space-y-4">
            <label className="block text-xs font-bold text-slate-700">
              Usuario o correo
              <input
                required
                autoComplete="username"
                value={identificador}
                onChange={(e) => setIdentificador(e.target.value)}
                className="mt-1 w-full rounded-xl border border-slate-300 px-3 py-2.5 text-sm font-normal"
              />
            </label>
            <label className="block text-xs font-bold text-slate-700">
              Contraseña
              <input
                required
                type="password"
                autoComplete="current-password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="mt-1 w-full rounded-xl border border-slate-300 px-3 py-2.5 text-sm font-normal"
              />
            </label>
            {error && <p role="alert" className="text-xs text-red-700 bg-red-50 border border-red-200 rounded-xl p-2">{error}</p>}
            <button
              disabled={cargando}
              className="w-full bg-[#0F3963] hover:bg-[#0b2b4b] disabled:opacity-60 text-white rounded-xl py-2.5 text-sm font-bold"
            >
              {cargando ? 'Ingresando…' : 'Ingresar con credenciales'}
            </button>
          </form>
        </details>
      </div>
    </div>
  );
};
