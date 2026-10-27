import uuid
from decimal import Decimal
from django.db import models
from django.core.exceptions import ValidationError
from django.utils.translation import gettext_lazy as _

# ==========================================
# 1. TENANTS Y ORGANIZACIONES COMUNITARIAS
# ==========================================

class OrganizacionComunitaria(models.Model):
    """
    Representa una Junta de Acción Comunal (JAC), cooperativa,
    asociación campesina o microempresa de economía popular.
    """
    TIPO_PERSONA = [
        ('NATURAL', 'Persona Natural / Emprendedor Popular'),
        ('JURIDICA', 'Persona Jurídica (JAC, Cooperativa, Asociación, SAS)'),
    ]

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    nombre_razon_social = models.CharField(max_length=255)
    nombre_comercial = models.CharField(max_length=255, blank=True, null=True)
    tipo_persona = models.CharField(max_length=15, choices=TIPO_PERSONA, default='JURIDICA')
    nit_o_cedula = models.CharField(max_length=30, unique=True)
    dv = models.CharField(max_length=1, blank=True, null=True, help_text="Dígito de Verificación DIAN")
    municipio_dane = models.CharField(max_length=5, help_text="Código DANE del municipio (ej: 05001 Medellín)")
    direccion = models.CharField(max_length=255)
    telefono = models.CharField(max_length=50)
    email_facturacion = models.EmailField()
    esal_sin_animo_lucro = models.BooleanField(default=False, help_text="Aplica para JAC y fondos solidarios")
    activo = models.BooleanField(default=True)
    creado_en = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        return f"{self.nombre_razon_social} ({self.nit_o_cedula})"


class ConfiguracionFiscal(models.Model):
    """
    Parámetros fiscales y llaves de facturación DIAN para cada organización.
    """
    REGIMEN_CHOICES = [
        ('NO_RESPONSABLE_IVA', 'No Responsable de IVA (Régimen Simplificado / Microempresa)'),
        ('RESPONSABLE_IVA', 'Responsable de IVA (Común)'),
        ('SIMPLE', 'Régimen Simple de Tributación (RST)'),
        ('ESAL_ESPECIAL', 'Régimen Especial ESAL (JAC, Asociaciones)'),
    ]

    organizacion = models.OneToOneField(OrganizacionComunitaria, on_delete=models.CASCADE, related_name='config_fiscal')
    tipo_regimen = models.CharField(max_length=30, choices=REGIMEN_CHOICES, default='NO_RESPONSABLE_IVA')
    responsabilidad_fiscal = models.CharField(
        max_length=50, 
        default='R-99-PN', 
        help_text="Código DIAN: O-47 (No responsable de IVA), O-13 (Gran Contribuyente), R-99-PN (No responsable)"
    )
    
    # Credenciales DIAN
    software_id = models.CharField(max_length=100, blank=True, null=True)
    software_pin = models.CharField(max_length=50, blank=True, null=True)
    clfe_test_set_id = models.CharField(max_length=100, blank=True, null=True, help_text="ID Set de Pruebas DIAN")
    ambiente_habilitacion = models.BooleanField(default=True, help_text="True: Habilitación/Pruebas, False: Producción")
    
    # Certificado Digital PKCS#12 (.p12 / .pfx)
    certificado_p12 = models.FileField(upload_to='certificados_dian/', blank=True, null=True)
    certificado_password = models.CharField(max_length=255, blank=True, null=True)

    # Resolución de Facturación DIAN
    prefijo_facturacion = models.CharField(max_length=5, default='SETP')
    consecutivo_actual = models.PositiveIntegerField(default=1)
    consecutivo_desde = models.PositiveIntegerField(default=1)
    consecutivo_hasta = models.PositiveIntegerField(default=50000)
    numero_resolucion = models.CharField(max_length=50, default='18760000001')
    vigencia_resolucion_hasta = models.DateField(blank=True, null=True)
    clave_tecnica_dian = models.CharField(max_length=255, blank=True, null=True)

    def __str__(self):
        return f"Fiscal: {self.organizacion.nombre_razon_social} [{self.get_tipo_regimen_display()}]"


# ==========================================
# 2. PLAN DE CUENTAS NIIF SIMPLIFICADO
# ==========================================

class CuentaContable(models.Model):
    """
    Catálogo de Cuentas NIIF adaptado a Microempresas y JAC / Sector Solidario.
    1: Activo, 2: Pasivo, 3: Patrimonio/Fondos Comunitarios, 4: Ingresos, 5: Gastos, 6: Costos.
    """
    NATURALEZA_CHOICES = [
        ('D', 'Débito'),
        ('C', 'Crédito'),
    ]

    organizacion = models.ForeignKey(OrganizacionComunitaria, on_delete=models.CASCADE, related_name='cuentas')
    codigo = models.CharField(max_length=20, help_text="Ej: 110505 (Caja General), 4135 (Ingresos Comercio)")
    nombre = models.CharField(max_length=150)
    padre = models.ForeignKey('self', on_delete=models.SET_NULL, null=True, blank=True, related_name='subcuentas')
    nivel = models.PositiveSmallIntegerField(default=1, help_text="1: Clase, 2: Grupo, 3: Cuenta, 4: Subcuenta, 5: Auxiliar")
    naturaleza = models.CharField(max_length=1, choices=NATURALEZA_CHOICES)
    permite_movimiento = models.BooleanField(default=True, help_text="Solo cuentas auxiliares permiten movimiento directo")
    activo = models.BooleanField(default=True)

    class Meta:
        unique_together = ('organizacion', 'codigo')
        ordering = ['codigo']

    def __str__(self):
        return f"{self.codigo} - {self.nombre}"


# ==========================================
# 3. TERCEROS Y CLIENTES DIAN
# ==========================================

class TerceroDIAN(models.Model):
    """
    Clientes, proveedores, comuneros, campesinos o compradores del ecosistema.
    """
    TIPO_DOC = [
        ('13', 'Cédula de Ciudadanía'),
        ('31', 'NIT'),
        ('22', 'Cédula de Extranjería'),
        ('41', 'Pasaporte'),
        ('91', 'Documento de Identificación Extranjero (DIE)'),
    ]

    organizacion = models.ForeignKey(OrganizacionComunitaria, on_delete=models.CASCADE, related_name='terceros')
    tipo_documento = models.CharField(max_length=2, choices=TIPO_DOC, default='13')
    numero_identificacion = models.CharField(max_length=30)
    dv = models.CharField(max_length=1, blank=True, null=True)
    razon_social_o_nombres = models.CharField(max_length=255)
    apellidos = models.CharField(max_length=255, blank=True, null=True)
    correo_electronico = models.EmailField()
    telefono = models.CharField(max_length=50, blank=True, null=True)
    direccion = models.CharField(max_length=255, default='Urbano / Rural')
    municipio_dane = models.CharField(max_length=5, default='05001')
    responsabilidad_fiscal = models.CharField(max_length=20, default='R-99-PN')

    class Meta:
        unique_together = ('organizacion', 'numero_identificacion')

    def __str__(self):
        return f"{self.razon_social_o_nombres} ({self.numero_identificacion})"


# ==========================================
# 4. LIBRO DIARIO Y ASIENTOS CONTABLES NIIF
# ==========================================

class AsientoContable(models.Model):
    """
    Comprobante contable de partida doble.
    """
    ORIGEN_CHOICES = [
        ('HORMIGAPP', 'Marketplace HormigApp (Comercio Local)'),
        ('AICAMPO', 'AICampo (Venta Agrícola / Insumos)'),
        ('MYADMINPH', 'MyAdminPH / Cuota JAC'),
        ('MANUAL', 'Ingreso / Egreso Manual PWA'),
        ('FACTURA_DIAN', 'Emisión Factura Electrónica'),
    ]

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    organizacion = models.ForeignKey(OrganizacionComunitaria, on_delete=models.CASCADE, related_name='asientos')
    numero_comprobante = models.CharField(max_length=50)
    fecha = models.DateField()
    concepto = models.CharField(max_length=255)
    origen = models.CharField(max_length=20, choices=ORIGEN_CHOICES, default='MANUAL')
    referencia_externa_id = models.CharField(max_length=100, blank=True, null=True, help_text="ID del pedido en HormigApp o AICampo")
    anulado = models.BooleanField(default=False)
    creado_en = models.DateTimeField(auto_now_add=True)

    def total_debito(self) -> Decimal:
        return sum(linea.debito for linea in self.lineas.all())

    def total_credito(self) -> Decimal:
        return sum(linea.credito for linea in self.lineas.all())

    def esta_balanceado(self) -> bool:
        return abs(self.total_debito() - self.total_credito()) < Decimal('0.01')

    def clean(self):
        super().clean()
        if self.pk and not self.esta_balanceado():
            raise ValidationError(_(f"Asiento desbalanceado: Débito={self.total_debito()} vs Crédito={self.total_credito()}"))

    def __str__(self):
        return f"Asiento #{self.numero_comprobante} - {self.fecha} ({self.concepto})"


class DetalleAsientoContable(models.Model):
    """
    Renglón o movimiento individual en el asiento (Partida Doble).
    """
    asiento = models.ForeignKey(AsientoContable, on_delete=models.CASCADE, related_name='lineas')
    cuenta = models.ForeignKey(CuentaContable, on_delete=models.PROTECT)
    tercero = models.ForeignKey(TerceroDIAN, on_delete=models.SET_NULL, null=True, blank=True)
    descripcion = models.CharField(max_length=255, blank=True, null=True)
    debito = models.DecimalField(max_digits=16, decimal_places=2, default=Decimal('0.00'))
    credito = models.DecimalField(max_digits=16, decimal_places=2, default=Decimal('0.00'))

    def clean(self):
        if not self.cuenta.permite_movimiento:
            raise ValidationError(_(f"La cuenta {self.cuenta.codigo} es de nivel superior y no permite movimientos directos."))
        if self.debito > 0 and self.credito > 0:
            raise ValidationError(_("Una línea no puede tener Débito y Crédito simultáneamente."))
        if self.debito == 0 and self.credito == 0:
            raise ValidationError(_("Debe registrar un valor mayor a cero en Débito o Crédito."))


# ==========================================
# 5. TRANSACCIONES DEL ECOSISTEMA
# ==========================================

class TransaccionMarketplace(models.Model):
    """
    Eventos transaccionales recibidos asíncronamente desde HormigApp o AICampo.
    Garantiza idempotencia y trazabilidad.
    """
    ESTADO_PROCESO = [
        ('RECIBIDO', 'Recibido en cola'),
        ('CONTABILIZADO', 'Asiento Contable Generado'),
        ('FACTURADO_DIAN', 'Factura Electrónica Emitida y Aceptada'),
        ('ERROR', 'Error de Procesamiento'),
    ]

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    organizacion = models.ForeignKey(OrganizacionComunitaria, on_delete=models.CASCADE, related_name='transacciones_marketplace')
    idempotency_key = models.CharField(max_length=120, unique=True, help_text="UUID único enviado por la app de origen")
    origen_app = models.CharField(max_length=30, choices=[('HORMIGAPP', 'HormigApp'), ('AICAMPO', 'AICampo')])
    
    id_orden_origen = models.CharField(max_length=100)
    comprador_datos = models.JSONField(help_text="Metadata del cliente: nombre, cédula, correo, dirección")
    items_vendidos = models.JSONField(help_text="Lista de productos/servicios, valor unitario, IVA, código")
    
    subtotal = models.DecimalField(max_digits=14, decimal_places=2)
    impuesto_iva = models.DecimalField(max_digits=14, decimal_places=2, default=Decimal('0.00'))
    impuesto_inc = models.DecimalField(max_digits=14, decimal_places=2, default=Decimal('0.00'), help_text="Impuesto Nacional al Consumo")
    total = models.DecimalField(max_digits=14, decimal_places=2)
    metodo_pago = models.CharField(max_length=50, default='EFECTIVO', help_text="EFECTIVO, PSE, NEQUI, CREDITO_COMUNITARIO")
    
    estado = models.CharField(max_length=20, choices=ESTADO_PROCESO, default='RECIBIDO')
    asiento_generado = models.OneToOneField(AsientoContable, on_delete=models.SET_NULL, null=True, blank=True)
    mensaje_error = models.TextField(blank=True, null=True)
    recibido_en = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        return f"{self.origen_app} #{self.id_orden_origen} - ${self.total} [{self.estado}]"


# ==========================================
# 6. FACTURACIÓN ELECTRÓNICA DIAN (UBL 2.1)
# ==========================================

class FacturaElectronicaDIAN(models.Model):
    """
    Documento fiscal UBL 2.1 emitido a la DIAN (Factura o Documento Equivalente).
    """
    ESTADO_DIAN = [
        ('BORRADOR', 'Borrador / Preparado'),
        ('FIRMADO', 'Firmado Digitalmente (XML generado)'),
        ('ENVIADO_DIAN', 'Transmitido a DIAN'),
        ('ACEPTADO', 'Aceptado por DIAN con Validación Previa'),
        ('RECHAZADO', 'Rechazado por DIAN'),
    ]

    TIPO_DOC_DIAN = [
        ('01', 'Factura Electrónica de Venta Nacional'),
        ('02', 'Factura de Exportación'),
        ('03', 'Documento Electrónico de Transmisión - Tipo Contingencia'),
        ('20', 'Documento Soporte en Adquisiciones Efectuadas a No Obligados a Facturar'),
        ('91', 'Nota Crédito'),
        ('92', 'Nota Débito'),
    ]

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    organizacion = models.ForeignKey(OrganizacionComunitaria, on_delete=models.CASCADE, related_name='facturas_dian')
    transaccion = models.OneToOneField(TransaccionMarketplace, on_delete=models.SET_NULL, null=True, blank=True)
    cliente = models.ForeignKey(TerceroDIAN, on_delete=models.PROTECT)
    
    tipo_documento_dian = models.CharField(max_length=2, choices=TIPO_DOC_DIAN, default='01')
    prefijo = models.CharField(max_length=5)
    numero_consecutivo = models.PositiveIntegerField()
    folio_completo = models.CharField(max_length=30, unique=True, help_text="Ej: SETP1204")
    
    fecha_emision = models.DateField()
    hora_emision = models.TimeField()
    
    # Cufe y Hash
    cufe = models.CharField(max_length=150, unique=True, blank=True, null=True, help_text="Código Único de Factura Electrónica SHA-384")
    qr_data = models.TextField(blank=True, null=True, help_text="Cadena URL oficial para renderizar QR DIAN")
    
    # Archivos
    xml_sin_firmar = models.TextField(blank=True, null=True)
    xml_firmado = models.TextField(blank=True, null=True)
    xml_attached_document = models.TextField(blank=True, null=True, help_text="XML con contenedor DIAN ApplicationResponse")
    pdf_representacion_grafica = models.FileField(upload_to='facturas_pdf/', blank=True, null=True)

    # Valores
    subtotal = models.DecimalField(max_digits=14, decimal_places=2)
    total_iva = models.DecimalField(max_digits=14, decimal_places=2, default=Decimal('0.00'))
    total_inc = models.DecimalField(max_digits=14, decimal_places=2, default=Decimal('0.00'))
    total_a_pagar = models.DecimalField(max_digits=14, decimal_places=2)
    
    estado_dian = models.CharField(max_length=20, choices=ESTADO_DIAN, default='BORRADOR')
    dian_track_id = models.CharField(max_length=150, blank=True, null=True)
    dian_mensaje_respuesta = models.TextField(blank=True, null=True)
    creado_en = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        return f"{self.folio_completo} - {self.cliente.razon_social_o_nombres} - [{self.estado_dian}]"
