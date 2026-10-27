export interface EmpresaContable {
  id: string;
  nombre_razon_social: string;
  nombre_comercial?: string;
  tipo_persona: 'NATURAL' | 'JURIDICA';
  nit_o_cedula: string;
  dv?: string;
  departamento: string;
  ciudad: string;
  municipio_dane: string;
  direccion: string;
  telefono: string;
  email_facturacion: string;
  esal_sin_animo_lucro: boolean;
  activo: boolean;
  config_fiscal?: {
    tipo_regimen: string;
    responsabilidad_fiscal: string;
    prefijo_facturacion: string;
    consecutivo_actual: number;
    ambiente_habilitacion: boolean;
  };
}

export interface TransaccionReciente {
  id: string;
  origen: 'HORMIGAPP' | 'AICAMPO' | 'MYPSICO' | 'DONACIONES' | 'SUSCRIPCIONES' | 'MANUAL';
  concepto: string;
  monto: number;
  tipo: 'INGRESO' | 'EGRESO';
  fecha: string;
  cufe?: string;
  estadoDian: 'ACEPTADO' | 'NO_APLICA' | 'PENDIENTE' | 'BORRADOR';
  comprador: string;
  metodoPago: string;
}

export interface MetricasFinancieras {
  totalIngresos: number;
  totalGastos: number;
  totalCostos: number;
  excedenteNeto: number;
  saldoCajaBancos: number;
  facturasEmitidasDian: number;
}

// ------------------------------------
// MODELOS ADMINISTRATIVOS COMPLEMENTARIOS
// ------------------------------------

export interface CuentaFiado {
  id: string;
  clienteNombre: string;
  clienteTelefono: string;
  concepto: string;
  montoTotal: number;
  montoAbonado: number;
  saldoPendiente: number;
  fechaCredito: string;
  fechaLimitePago: string;
  estado: 'PENDIENTE' | 'ABONADO_PARCIAL' | 'CANCELADO' | 'VENCIDO';
}

export interface ProyectoONG {
  id: string;
  codigoProyecto: string;
  nombreProyecto: string;
  donanteFinanciador: string;
  presupuestoTotal: number;
  totalEjecutado: number;
  fechaInicio: string;
  fechaFinalizacion: string;
  poblacionBeneficiaria: string;
  estado: 'FORMULACION' | 'EN_EJECUCION' | 'FINALIZADO';
}

export interface JornalTrabajo {
  id: string;
  trabajadorNombre: string;
  laborRealizada: string;
  diasTrabajados: number;
  tarifaJornal: number;
  totalNeto: number;
  fechaFin: string;
  pagado: boolean;
}

export interface ArqueoCaja {
  id: string;
  fechaArqueo: string;
  cajeroResponsable: string;
  saldoEsperadoEfectivo: number;
  saldoRealEfectivo: number;
  saldoEsperadoDigital: number;
  saldoRealDigital: number;
  diferencia: number;
}
