import uuid
from decimal import Decimal
from django.db import transaction
from django.utils import timezone
from rest_framework import status, serializers
from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated
from rest_framework.authentication import TokenAuthentication

from .models_comuncont import (
    OrganizacionComunitaria,
    ConfiguracionFiscal,
    CuentaContable,
    TerceroDIAN,
    AsientoContable,
    DetalleAsientoContable,
    TransaccionMarketplace,
    FacturaElectronicaDIAN,
)

# ========================================================
# SERIALIZADORES DE INGESTA DE EVENTOS TRANSACCIONALES
# ========================================================

class ItemVentaSerializer(serializers.Serializer):
    codigo = serializers.CharField(max_length=50)
    descripcion = serializers.CharField(max_length=255)
    cantidad = serializers.DecimalField(max_digits=10, decimal_places=2)
    precio_unitario = serializers.DecimalField(max_digits=12, decimal_places=2)
    porcentaje_iva = serializers.DecimalField(max_digits=5, decimal_places=2, default=Decimal('0.00'))
    total_linea = serializers.DecimalField(max_digits=12, decimal_places=2)


class CompradorSerializer(serializers.Serializer):
    tipo_documento = serializers.CharField(max_length=2, default='13')
    numero_identificacion = serializers.CharField(max_length=30)
    dv = serializers.CharField(max_length=1, required=False, allow_blank=True, allow_null=True)
    nombre_completo = serializers.CharField(max_length=255)
    correo_electronico = serializers.EmailField()
    telefono = serializers.CharField(max_length=50, required=False, allow_blank=True)
    direccion = serializers.CharField(max_length=255, default='Sector Comunitario')
    municipio_dane = serializers.CharField(max_length=5, default='05001')


class EventoVentaMarketplaceSerializer(serializers.Serializer):
    """
    Payload que envían HormigApp o AICampo al registrar una venta.
    """
    idempotency_key = serializers.CharField(max_length=120)
    origen_app = serializers.ChoiceField(choices=['HORMIGAPP', 'AICAMPO'])
    id_orden_origen = serializers.CharField(max_length=100)
    organizacion_id = serializers.UUIDField()
    comprador = CompradorSerializer()
    items = ItemVentaSerializer(many=True)
    subtotal = serializers.DecimalField(max_digits=14, decimal_places=2)
    impuesto_iva = serializers.DecimalField(max_digits=14, decimal_places=2, default=Decimal('0.00'))
    impuesto_inc = serializers.DecimalField(max_digits=14, decimal_places=2, default=Decimal('0.00'))
    total = serializers.DecimalField(max_digits=14, decimal_places=2)
    metodo_pago = serializers.CharField(max_length=50, default='EFECTIVO')
    requiere_facturacion_dian = serializers.BooleanField(default=False)


# ========================================================
# MOTOR DE REGLAS CONTABLES NIIF (PARTIDA DOBLE AUTOMÁTICA)
# ========================================================

class MotorReglasContables:
    """
    Traduce eventos comerciales de economía popular a asientos contables de partida doble.
    Mapeo básico:
      - Débito: Caja General (110505) o Cuentas por Cobrar Comunitarias (130505)
      - Crédito: Ingresos Operacionales (413505 Comercio / 410505 Agro)
      - Crédito: IVA Generado (240801) - Si aplica
      - Crédito: Impoconsumo (249501) - Si aplica
    """

    @classmethod
    def generar_asiento_para_venta(cls, transaccion: TransaccionMarketplace, tercero: TerceroDIAN) -> AsientoContable:
        org = transaccion.organizacion
        
        # 1. Obtener o resolver cuentas contables del catálogo
        cuenta_caja = CuentaContable.objects.filter(organizacion=org, codigo='110505').first()
        if not cuenta_caja:
            cuenta_caja = CuentaContable.objects.create(
                organizacion=org, codigo='110505', nombre='Caja General Común', 
                naturaleza='D', permite_movimiento=True, nivel=5
            )

        codigo_ingreso = '410505' if transaccion.origen_app == 'AICAMPO' else '413505'
        nombre_ingreso = 'Venta de Productos Agrícolas' if transaccion.origen_app == 'AICAMPO' else 'Comercio Local y Popular'
        
        cuenta_ingreso = CuentaContable.objects.filter(organizacion=org, codigo=codigo_ingreso).first()
        if not cuenta_ingreso:
            cuenta_ingreso = CuentaContable.objects.create(
                organizacion=org, codigo=codigo_ingreso, nombre=nombre_ingreso,
                naturaleza='C', permite_movimiento=True, nivel=5
            )

        cuenta_iva = None
        if transaccion.impuesto_iva > Decimal('0.00'):
            cuenta_iva = CuentaContable.objects.filter(organizacion=org, codigo='240801').first()
            if not cuenta_iva:
                cuenta_iva = CuentaContable.objects.create(
                    organizacion=org, codigo='240801', nombre='IVA Generado en Ventas',
                    naturaleza='C', permite_movimiento=True, nivel=5
                )

        cuenta_inc = None
        if transaccion.impuesto_inc > Decimal('0.00'):
            cuenta_inc = CuentaContable.objects.filter(organizacion=org, codigo='249501').first()
            if not cuenta_inc:
                cuenta_inc = CuentaContable.objects.create(
                    organizacion=org, codigo='249501', nombre='Impuesto Nacional al Consumo por Pagar',
                    naturaleza='C', permite_movimiento=True, nivel=5
                )

        # 2. Crear cabecera del Asiento
        numero_comp = f"COM-{timezone.now().strftime('%Y%m%d')}-{transaccion.id_orden_origen[:8]}"
        asiento = AsientoContable.objects.create(
            organizacion=org,
            numero_comprobante=numero_comp,
            fecha=timezone.now().date(),
            concepto=f"Venta desde {transaccion.origen_app} #{transaccion.id_orden_origen}",
            origen=transaccion.origen_app,
            referencia_externa_id=transaccion.id_orden_origen
        )

        # 3. Línea Débito: Ingreso de Dinero a Caja o Pasarela Comunitaria
        DetalleAsientoContable.objects.create(
            asiento=asiento,
            cuenta=cuenta_caja,
            tercero=tercero,
            descripcion=f"Recaudo venta #{transaccion.id_orden_origen} vía {transaccion.metodo_pago}",
            debito=transaccion.total,
            credito=Decimal('0.00')
        )

        # 4. Línea Crédito: Reconocimiento del Ingreso (Subtotal)
        DetalleAsientoContable.objects.create(
            asiento=asiento,
            cuenta=cuenta_ingreso,
            tercero=tercero,
            descripcion=f"Ingreso por venta {transaccion.origen_app}",
            debito=Decimal('0.00'),
            credito=transaccion.subtotal
        )

        # 5. Línea Crédito: IVA (si aplica)
        if transaccion.impuesto_iva > Decimal('0.00') and cuenta_iva:
            DetalleAsientoContable.objects.create(
                asiento=asiento,
                cuenta=cuenta_iva,
                tercero=tercero,
                descripcion="IVA generado 19%",
                debito=Decimal('0.00'),
                credito=transaccion.impuesto_iva
            )

        # 6. Línea Crédito: Impuesto al Consumo (si aplica)
        if transaccion.impuesto_inc > Decimal('0.00') and cuenta_inc:
            DetalleAsientoContable.objects.create(
                asiento=asiento,
                cuenta=cuenta_inc,
                tercero=tercero,
                descripcion="Impuesto Nacional al Consumo 8%",
                debito=Decimal('0.00'),
                credito=transaccion.impuesto_inc
            )

        # Validar partida doble
        asiento.clean()
        return asiento


# ========================================================
# ENDPOINTS REST API
# ========================================================

class IngestaTransaccionMarketplaceView(APIView):
    """
    POST /api/v1/eventos/transaccion/
    Recibe transacciones desde HormigApp o AICampo de forma asíncrona e idempotente.
    """
    # authentication_classes = [TokenAuthentication]
    # permission_classes = [IsAuthenticated]

    def post(self, request, *args, **kwargs):
        serializer = EventoVentaMarketplaceSerializer(data=request.data)
        if not serializer.is_valid():
            return Response({"errores": serializer.errors}, status=status.HTTP_400_BAD_REQUEST)

        datos = serializer.validated_data
        idempotency_key = datos['idempotency_key']

        # 1. Comprobación de idempotencia: Si ya fue procesado, responder OK inmediatamente
        transaccion_existente = TransaccionMarketplace.objects.filter(idempotency_key=idempotency_key).first()
        if transaccion_existente:
            return Response({
                "mensaje": "Transacción ya procesada previamente (Idempotente)",
                "transaccion_id": str(transaccion_existente.id),
                "estado": transaccion_existente.estado,
                "asiento_id": str(transaccion_existente.asiento_generado.id) if transaccion_existente.asiento_generado else None
            }, status=status.HTTP_200_OK)

        # 2. Procesamiento transaccional atómico
        try:
            with transaction.atomic():
                org = OrganizacionComunitaria.objects.get(id=datos['organizacion_id'])

                # Registrar o actualizar Tercero DIAN
                comprador_data = datos['comprador']
                tercero, _ = TerceroDIAN.objects.update_or_create(
                    organizacion=org,
                    numero_identificacion=comprador_data['numero_identificacion'],
                    defaults={
                        'tipo_documento': comprador_data['tipo_documento'],
                        'dv': comprador_data.get('dv', ''),
                        'razon_social_o_nombres': comprador_data['nombre_completo'],
                        'correo_electronico': comprador_data['correo_electronico'],
                        'telefono': comprador_data.get('telefono', ''),
                        'direccion': comprador_data.get('direccion', 'Comunidad'),
                        'municipio_dane': comprador_data.get('municipio_dane', '05001')
                    }
                )

                # Guardar Transacción en Bitácora
                transaccion_registro = TransaccionMarketplace.objects.create(
                    organizacion=org,
                    idempotency_key=idempotency_key,
                    origen_app=datos['origen_app'],
                    id_orden_origen=datos['id_orden_origen'],
                    comprador_datos=comprador_data,
                    items_vendidos=datos['items'],
                    subtotal=datos['subtotal'],
                    impuesto_iva=datos['impuesto_iva'],
                    impuesto_inc=datos['impuesto_inc'],
                    total=datos['total'],
                    metodo_pago=datos['metodo_pago'],
                    estado='RECIBIDO'
                )

                # Generar Asiento Contable Automático NIIF
                asiento = MotorReglasContables.generar_asiento_para_venta(transaccion_registro, tercero)
                transaccion_registro.asiento_generado = asiento
                transaccion_registro.estado = 'CONTABILIZADO'
                transaccion_registro.save(update_fields=['asiento_generado', 'estado'])

                return Response({
                    "status": "EXITO",
                    "mensaje": "Transacción contabilizada exitosamente en ComunCont",
                    "transaccion_id": str(transaccion_registro.id),
                    "asiento_comprobante": asiento.numero_comprobante,
                    "total_debito": str(asiento.total_debito()),
                    "total_credito": str(asiento.total_credito()),
                    "balanceado": asiento.esta_balanceado()
                }, status=status.HTTP_201_CREATED)

        except OrganizacionComunitaria.DoesNotExist:
            return Response({"error": "Organización comunitaria no encontrada"}, status=status.HTTP_404_NOT_FOUND)
        except Exception as e:
            return Response({"error": f"Error procesando la transacción: {str(e)}"}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)


class DashboardMetricasView(APIView):
    """
    GET /api/v1/contabilidad/dashboard/?org_id=<uuid>
    Entrega métricas financieras en tiempo real para el frontend de autogestión.
    """
    def get(self, request, *args, **kwargs):
        org_id = request.query_params.get('org_id')
        if not org_id:
            return Response({"error": "Parámetro org_id requerido"}, status=status.HTTP_400_BAD_REQUEST)

        # Consulta resumida de ingresos, egresos y saldos de caja
        movimientos = DetalleAsientoContable.objects.filter(asiento__organizacion_id=org_id, asiento__anulado=False)
        
        # Clase 4: Ingresos (Naturaleza Crédito)
        total_ingresos = movimientos.filter(cuenta__codigo__startswith='4').aggregate(
            credito=models.Sum('credito'), debito=models.Sum('debito')
        )
        ingresos_netos = (total_ingresos['credito'] or Decimal('0.00')) - (total_ingresos['debito'] or Decimal('0.00'))

        # Clase 5 y 6: Gastos y Costos (Naturaleza Débito)
        total_gastos = movimientos.filter(cuenta__codigo__regex=r'^(5|6)').aggregate(
            debito=models.Sum('debito'), credito=models.Sum('credito')
        )
        gastos_netos = (total_gastos['debito'] or Decimal('0.00')) - (total_gastos['credito'] or Decimal('0.00'))

        # Caja y Bancos (11)
        caja_bancos = movimientos.filter(cuenta__codigo__startswith='11').aggregate(
            debito=models.Sum('debito'), credito=models.Sum('credito')
        )
        saldo_disponible = (caja_bancos['debito'] or Decimal('0.00')) - (caja_bancos['credito'] or Decimal('0.00'))

        return Response({
            "ingresos_totales": float(ingresos_netos),
            "gastos_totales": float(gastos_netos),
            "excedente_neto": float(ingresos_netos - gastos_netos),
            "saldo_caja_disponible": float(saldo_disponible),
            "fecha_corte": timezone.now().strftime('%Y-%m-%d %H:%M:%S')
        })
