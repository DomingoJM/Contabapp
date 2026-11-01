import React, { useCallback, useEffect, useState } from 'react';
import ComunContDashboard from './ComunContDashboard';
import { LoginScreen } from './components/LoginScreen';
import { WizardCrearEmpresaModal } from './components/WizardCrearEmpresaModal';
import { ModuloFinanzasPersonalesModal } from './components/ModuloFinanzasPersonalesModal';
import { cerrarSesion, obtenerEmpresas, obtenerPerfil, PerfilUsuario } from './services/authApi';
import { EmpresaContable } from './types';

export default function App() {
  const [perfil, setPerfil] = useState<PerfilUsuario | null>(null);
  const [empresas, setEmpresas] = useState<EmpresaContable[]>([]);
  const [cargando, setCargando] = useState(true);
  const [aviso, setAviso] = useState('');
  const [wizard, setWizard] = useState(false);
  const [finanzasPersonalesAbiertas, setFinanzasPersonalesAbiertas] = useState(false);

  const cargarSesion = useCallback(async (usuario: PerfilUsuario | null) => {
    setPerfil(usuario);
    if (!usuario) {
      setEmpresas([]);
      return;
    }
    try {
      setEmpresas(await obtenerEmpresas<EmpresaContable>());
      setAviso('');
    } catch (error) {
      setEmpresas([]);
      setAviso(error instanceof Error ? error.message : 'No fue posible cargar las empresas.');
    }
  }, []);

  useEffect(() => {
    obtenerPerfil().then(cargarSesion).finally(() => setCargando(false));
    const vencida = () => {
      setPerfil(null);
      setEmpresas([]);
      setAviso('Su sesión venció. Ingrese de nuevo.');
    };
    window.addEventListener('contab:sesion-vencida', vencida);
    return () => window.removeEventListener('contab:sesion-vencida', vencida);
  }, [cargarSesion]);

  const salir = () => {
    cerrarSesion();
    setPerfil(null);
    setEmpresas([]);
    setAviso('');
  };

  if (cargando) return null;
  if (!perfil) {
    return <LoginScreen aviso={aviso} onLogin={(p) => { setAviso(''); void cargarSesion(p); }} />;
  }

  if (empresas.length === 0) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4">
        <div className="bg-white rounded-3xl border border-slate-200 p-6 max-w-sm text-center space-y-3">
          <p className="text-sm text-slate-700">
            {aviso || (perfil.es_admin_plataforma
              ? 'Aún no hay empresas registradas. Cree la primera.'
              : 'Tu perfil personal está listo. Puedes organizar tus ingresos y gastos sin crear una empresa.')}
          </p>
          {aviso && (
            <button onClick={() => void cargarSesion(perfil)} className="text-xs font-bold text-[#0F3963] underline">
              Reintentar
            </button>
          )}
          {perfil.es_admin_plataforma && (
            <button onClick={() => setWizard(true)} className="bg-[#0F3963] text-white rounded-xl px-4 py-2 text-sm font-bold">
              Nueva empresa
            </button>
          )}
          <button
            onClick={() => setFinanzasPersonalesAbiertas(true)}
            className="bg-violet-700 text-white rounded-xl px-4 py-2 text-sm font-bold"
          >
            Finanzas personales
          </button>
          <button onClick={salir} className="block mx-auto text-xs text-slate-500 underline">Cerrar sesión</button>
        </div>
        <WizardCrearEmpresaModal
          isOpen={wizard}
          onClose={() => setWizard(false)}
          onEmpresaCreada={(e) => setEmpresas((prev) => [...prev, e])}
        />
        <ModuloFinanzasPersonalesModal
          isOpen={finanzasPersonalesAbiertas}
          onClose={() => setFinanzasPersonalesAbiertas(false)}
        />
      </div>
    );
  }

  return <ComunContDashboard perfil={perfil} empresasIniciales={empresas} onSalir={salir} />;
}
