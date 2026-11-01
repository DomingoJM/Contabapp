import React, { useState } from 'react';
import { iniciarSesionContab, PerfilUsuario } from '../services/authApi';

interface Props {
  onLogin: (perfil: PerfilUsuario) => void;
  aviso?: string;
}

export const LoginScreen: React.FC<Props> = ({ onLogin, aviso }) => {
  const [identificador, setIdentificador] = useState('');
  const [password, setPassword] = useState('');
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
      <form onSubmit={enviar} className="w-full max-w-sm bg-white rounded-3xl border border-slate-200 shadow-sm p-6 space-y-4">
        <div className="text-center">
          <img src="/logo.png" alt="ContabApp" className="h-14 w-14 mx-auto object-contain" />
          <h1 className="text-2xl font-black text-slate-900 mt-2">ContabApp</h1>
          <p className="text-xs text-slate-500">Ingreso exclusivo con credenciales de su empresa</p>
        </div>
        {aviso && <p className="text-xs bg-amber-50 text-amber-800 border border-amber-200 rounded-xl p-2">{aviso}</p>}
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
          {cargando ? 'Ingresando…' : 'Ingresar'}
        </button>
      </form>
    </div>
  );
};
