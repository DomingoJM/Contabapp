import { EmpresaContable } from './types';
import { EmpresaAcceso, PerfilUsuario, RolEmpresa } from './services/authApi';

export type RolDemo = 'GERENTE' | 'CONTADOR' | 'EMPRENDEDOR' | 'ADMIN' | 'SUPERADMIN';

const permisosCompletos: Record<string, string[]> = {
  empresa: ['read', 'write', 'delete'],
  accesos: ['read', 'write', 'delete'],
  cuentas_por_pagar: ['read', 'write', 'delete'],
  nomina: ['read', 'write'],
  nomina_revision: ['read', 'write'],
  fiados: ['read', 'write', 'delete'],
  proyectos: ['read', 'write'],
  reportes: ['read', 'write'],
  facturas_demo: ['read', 'write'],
  ingesta: ['read', 'write'],
};

const permisosPorRol: Record<RolDemo, Record<string, string[]>> = {
  GERENTE: {
    reportes: ['read'],
    fiados: ['read'],
    proyectos: ['read'],
    cuentas_por_pagar: ['read'],
    nomina: ['read'],
  },
  CONTADOR: permisosCompletos,
  EMPRENDEDOR: {
    empresa: ['read'],
    reportes: ['read'],
    facturas_demo: ['read', 'write'],
    ingesta: ['read', 'write'],
    fiados: ['read', 'write'],
    cuentas_por_pagar: ['read'],
  },
  ADMIN: {
    empresa: ['read', 'write'],
    accesos: ['read', 'write'],
    reportes: ['read'],
    cuentas_por_pagar: ['read', 'write'],
    nomina: ['read', 'write'],
    nomina_revision: ['read', 'write'],
    fiados: ['read', 'write'],
    proyectos: ['read', 'write'],
  },
  SUPERADMIN: permisosCompletos,
};

const nombresRol: Record<RolDemo, string> = {
  GERENTE: 'Gerente',
  CONTADOR: 'Contador',
  EMPRENDEDOR: 'Emprendedor',
  ADMIN: 'Administrador',
  SUPERADMIN: 'Superadmin',
};

const rolEmpresa: Record<RolDemo, RolEmpresa> = {
  GERENTE: 'ADMINISTRADOR',
  CONTADOR: 'CONTADOR',
  EMPRENDEDOR: 'EMPRESARIO',
  ADMIN: 'ADMINISTRADOR',
  SUPERADMIN: 'ADMINISTRADOR',
};

export const empresaDemo: EmpresaContable = {
  id: 'demo-organizacion-contabapp',
  nombre_razon_social: 'Cooperativa Comunitaria Guane',
  nombre_comercial: 'Cooperativa Guane',
  tipo_persona: 'JURIDICA',
  nit_o_cedula: '900123456',
  dv: '7',
  departamento: 'Santander',
  ciudad: 'Bucaramanga',
  municipio_dane: '68001',
  direccion: 'Carrera 19 # 35-20',
  telefono: '3000000000',
  email_facturacion: 'demo@contabapp.local',
  esal_sin_animo_lucro: true,
  activo: true,
  config_fiscal: {
    tipo_regimen: 'ESAL_ESPECIAL',
    responsabilidad_fiscal: 'R-99-PN',
    prefijo_facturacion: 'DEMO',
    consecutivo_actual: 18,
    ambiente_habilitacion: true,
  },
};

export function crearPerfilDemo(rol: RolDemo): PerfilUsuario {
  const acceso: EmpresaAcceso = {
    organizacion_id: empresaDemo.id,
    organizacion: empresaDemo.nombre_razon_social,
    nit: empresaDemo.nit_o_cedula,
    rol: rolEmpresa[rol],
    rol_nombre: nombresRol[rol],
    permisos: permisosPorRol[rol],
  };

  return {
    id: 0,
    username: `demo_${rol.toLowerCase()}`,
    email: `${rol.toLowerCase()}@contabapp.local`,
    nombre: nombresRol[rol],
    es_admin_plataforma: rol === 'SUPERADMIN',
    empresas: [acceso],
  };
}

export const datosFicticiosDemo = {
  metricas: {
    totalIngresos: 8450000,
    totalGastos: 3120000,
    totalCostos: 980000,
    excedenteNeto: 4350000,
    saldoCajaBancos: 6240000,
    facturasEmitidasDian: 42,
  },
  transacciones: [
    {
      id: 'demo-tx-001',
      origen: 'AICAMPO' as const,
      concepto: 'Venta de cacao orgánico comunitario',
      monto: 1450000,
      tipo: 'INGRESO' as const,
      fecha: '26/10/2026, 14:30',
      cufe: 'DEMO-CUFE-001',
      estadoDian: 'ACEPTADO' as const,
      comprador: 'Asociación Campesina',
      metodoPago: 'Transferencia',
    },
    {
      id: 'demo-tx-002',
      origen: 'HORMIGAPP' as const,
      concepto: 'Pedido tienda El Porvenir',
      monto: 85000,
      tipo: 'INGRESO' as const,
      fecha: '26/10/2026, 11:15',
      cufe: 'DEMO-CUFE-002',
      estadoDian: 'ACEPTADO' as const,
      comprador: 'Tienda El Porvenir',
      metodoPago: 'Nequi',
    },
    {
      id: 'demo-tx-003',
      origen: 'MANUAL' as const,
      concepto: 'Mantenimiento bomba de agua JAC',
      monto: 320000,
      tipo: 'EGRESO' as const,
      fecha: '25/10/2026, 18:00',
      estadoDian: 'NO_APLICA' as const,
      comprador: 'Proveedor comunitario',
      metodoPago: 'Efectivo',
    },
  ],
};
