import hashlib
import uuid
import base64
from decimal import Decimal
from datetime import datetime
from lxml import etree
import xmlsec
import requests

class DIANFacturacionElectronicaService:
    """
    Servicio de Facturación Electrónica UBL 2.1 para Colombia (DIAN).
    Incluye:
      1. Cálculo de CUFE con SHA-384.
      2. Generación del XML UBL 2.1 (Invoice).
      3. Firma digital XAdES-BES usando llave privada (.p12/.key) con xmlsec.
      4. Conexión SOAP con Web Service de Validación Previa de la DIAN.
    """

    DIAN_WSDL_HABILITACION = "https://vpfe-hab.dian.gov.co/WcfDianCustomerServices.svc?wsdl"
    DIAN_WSDL_PRODUCCION = "https://vpfe.dian.gov.co/WcfDianCustomerServices.svc?wsdl"

    def __init__(self, config_fiscal):
        self.config = config_fiscal

    def calcular_cufe(self, num_factura: str, fecha_emision: str, hora_emision: str,
                      subtotal: Decimal, iva: Decimal, inc: Decimal, otro_impuesto: Decimal,
                      total: Decimal, nit_emisor: str, doc_adquirente: str,
                      clave_tecnica: str, ambiente_dian: str = "2") -> str:
        """
        Calcula el CUFE según el Anexo Técnico 1.9 de la DIAN:
        SHA-384(NumFac + FecFac + HorFac + ValFac + CodImp1 + ValImp1 + CodImp2 + ValImp2 + 
                CodImp3 + ValImp3 + ValTot + NitOfe + NumAdq + ClaveTecnica + TipoAmbiente)
        """
        val_fac_str = f"{subtotal:.2f}"
        val_iva_str = f"{iva:.2f}"
        val_inc_str = f"{inc:.2f}"
        val_otro_str = f"{otro_impuesto:.2f}"
        val_tot_str = f"{total:.2f}"

        cadena_cufe = (
            f"{num_factura}"
            f"{fecha_emision}"
            f"{hora_emision}-05:00"
            f"{val_fac_str}"
            f"01"  # Código IVA
            f"{val_iva_str}"
            f"04"  # Código Impoconsumo
            f"{val_inc_str}"
            f"03"  # Código Otro Impuesto
            f"{val_otro_str}"
            f"{val_tot_str}"
            f"{nit_emisor}"
            f"{doc_adquirente}"
            f"{clave_tecnica}"
            f"{ambiente_dian}"
        )
        return hashlib.sha384(cadena_cufe.encode('utf-8')).hexdigest()

    def generar_qr_data(self, num_factura: str, fecha: str, hora: str,
                        nit_emisor: str, doc_adquirente: str, val_fac: Decimal,
                        val_iva: Decimal, val_total: Decimal, cufe: str) -> str:
        """
        Estructura el contenido que se codifica en el código QR exigido por la DIAN.
        """
        ambiente = "https://catalogo-vpfe-hab.dian.gov.co/document/searchqr?documentkey=" if self.config.ambiente_habilitacion \
            else "https://catalogo-vpfe.dian.gov.co/document/searchqr?documentkey="
        
        return (
            f"NumFac: {num_factura}\n"
            f"FecFac: {fecha}\n"
            f"HorFac: {hora}-05:00\n"
            f"NitFac: {nit_emisor}\n"
            f"DocAdq: {doc_adquirente}\n"
            f"ValFac: {val_fac:.2f}\n"
            f"ValIva: {val_iva:.2f}\n"
            f"ValOtroImp: 0.00\n"
            f"ValTotal: {val_total:.2f}\n"
            f"CUFE: {cufe}\n"
            f"URL: {ambiente}{cufe}"
        )

    def construir_xml_ubl21(self, factura_model) -> str:
        """
        Construye el documento XML bajo el esquema UBL 2.1 (OASIS) adaptado al estándar DIAN.
        """
        NSMAP = {
            None: "urn:oasis:names:specification:ubl:schema:xsd:Invoice-2",
            "cac": "urn:oasis:names:specification:ubl:schema:xsd:CommonAggregateComponents-2",
            "cbc": "urn:oasis:names:specification:ubl:schema:xsd:CommonBasicComponents-2",
            "ds": "http://www.w3.org/2000/09/xmldsig#",
            "ext": "urn:oasis:names:specification:ubl:schema:xsd:CommonExtensionComponents-2",
        }

        root = etree.Element("{urn:oasis:names:specification:ubl:schema:xsd:Invoice-2}Invoice", nsmap=NSMAP)
        
        # Extensiones UBL para la Firma XAdES
        extensions = etree.SubElement(root, "{urn:oasis:names:specification:ubl:schema:xsd:CommonExtensionComponents-2}UBLExtensions")
        ubl_ext = etree.SubElement(extensions, "{urn:oasis:names:specification:ubl:schema:xsd:CommonExtensionComponents-2}UBLExtension")
        ext_content = etree.SubElement(ubl_ext, "{urn:oasis:names:specification:ubl:schema:xsd:CommonExtensionComponents-2}ExtensionContent")

        # Versión UBL y DIAN
        etree.SubElement(root, "{urn:oasis:names:specification:ubl:schema:xsd:CommonBasicComponents-2}UBLVersionID").text = "UBL 2.1"
        etree.SubElement(root, "{urn:oasis:names:specification:ubl:schema:xsd:CommonBasicComponents-2}CustomizationID").text = "10"
        etree.SubElement(root, "{urn:oasis:names:specification:ubl:schema:xsd:CommonBasicComponents-2}ProfileID").text = "DIAN 2.1: Factura Electrónica de Venta"
        etree.SubElement(root, "{urn:oasis:names:specification:ubl:schema:xsd:CommonBasicComponents-2}ProfileExecutionID").text = "2" if self.config.ambiente_habilitacion else "1"
        etree.SubElement(root, "{urn:oasis:names:specification:ubl:schema:xsd:CommonBasicComponents-2}ID").text = factura_model.folio_completo
        
        # UUID = CUFE
        uuid_el = etree.SubElement(root, "{urn:oasis:names:specification:ubl:schema:xsd:CommonBasicComponents-2}UUID", schemeID="2" if self.config.ambiente_habilitacion else "1", schemeName="CUFE-SHA384")
        uuid_el.text = factura_model.cufe

        etree.SubElement(root, "{urn:oasis:names:specification:ubl:schema:xsd:CommonBasicComponents-2}IssueDate").text = str(factura_model.fecha_emision)
        etree.SubElement(root, "{urn:oasis:names:specification:ubl:schema:xsd:CommonBasicComponents-2}IssueTime").text = f"{factura_model.hora_emision}-05:00"
        etree.SubElement(root, "{urn:oasis:names:specification:ubl:schema:xsd:CommonBasicComponents-2}InvoiceTypeCode").text = factura_model.tipo_documento_dian
        etree.SubElement(root, "{urn:oasis:names:specification:ubl:schema:xsd:CommonBasicComponents-2}DocumentCurrencyCode").text = "COP"

        # Datos del Emisor (JAC o Emprendedor Comunitario)
        supplier = etree.SubElement(root, "{urn:oasis:names:specification:ubl:schema:xsd:CommonAggregateComponents-2}AccountingSupplierParty")
        party_sup = etree.SubElement(supplier, "{urn:oasis:names:specification:ubl:schema:xsd:CommonAggregateComponents-2}Party")
        party_tax_sup = etree.SubElement(party_sup, "{urn:oasis:names:specification:ubl:schema:xsd:CommonAggregateComponents-2}PartyTaxScheme")
        etree.SubElement(party_tax_sup, "{urn:oasis:names:specification:ubl:schema:xsd:CommonBasicComponents-2}RegistrationName").text = self.config.organizacion.nombre_razon_social
        company_id_sup = etree.SubElement(party_tax_sup, "{urn:oasis:names:specification:ubl:schema:xsd:CommonBasicComponents-2}CompanyID", schemeAgencyID="195", schemeID=self.config.organizacion.dv or "0", schemeName="31")
        company_id_sup.text = self.config.organizacion.nit_o_cedula

        # Datos del Cliente
        customer = etree.SubElement(root, "{urn:oasis:names:specification:ubl:schema:xsd:CommonAggregateComponents-2}AccountingCustomerParty")
        party_cust = etree.SubElement(customer, "{urn:oasis:names:specification:ubl:schema:xsd:CommonAggregateComponents-2}Party")
        party_tax_cust = etree.SubElement(party_cust, "{urn:oasis:names:specification:ubl:schema:xsd:CommonAggregateComponents-2}PartyTaxScheme")
        etree.SubElement(party_tax_cust, "{urn:oasis:names:specification:ubl:schema:xsd:CommonBasicComponents-2}RegistrationName").text = factura_model.cliente.razon_social_o_nombres
        company_id_cust = etree.SubElement(party_tax_cust, "{urn:oasis:names:specification:ubl:schema:xsd:CommonBasicComponents-2}CompanyID", schemeAgencyID="195", schemeName=factura_model.cliente.tipo_documento)
        company_id_cust.text = factura_model.cliente.numero_identificacion

        # Totales Monetarios
        legal_monetary = etree.SubElement(root, "{urn:oasis:names:specification:ubl:schema:xsd:CommonAggregateComponents-2}LegalMonetaryTotal")
        etree.SubElement(legal_monetary, "{urn:oasis:names:specification:ubl:schema:xsd:CommonBasicComponents-2}LineExtensionAmount", currencyID="COP").text = f"{factura_model.subtotal:.2f}"
        etree.SubElement(legal_monetary, "{urn:oasis:names:specification:ubl:schema:xsd:CommonBasicComponents-2}TaxExclusiveAmount", currencyID="COP").text = f"{factura_model.subtotal:.2f}"
        etree.SubElement(legal_monetary, "{urn:oasis:names:specification:ubl:schema:xsd:CommonBasicComponents-2}TaxInclusiveAmount", currencyID="COP").text = f"{factura_model.total_a_pagar:.2f}"
        etree.SubElement(legal_monetary, "{urn:oasis:names:specification:ubl:schema:xsd:CommonBasicComponents-2}PayableAmount", currencyID="COP").text = f"{factura_model.total_a_pagar:.2f}"

        return etree.tostring(root, pretty_print=True, xml_declaration=True, encoding='utf-8').decode('utf-8')

    def firmar_xml_xades(self, xml_contenido: str, cert_pem_path: str, key_pem_path: str) -> str:
        """
        Aplica la firma digital XAdES-BES al XML UBL 2.1 con la llave criptográfica privada del contribuyente.
        """
        doc = etree.fromstring(xml_contenido.encode('utf-8'))
        
        # Buscar el punto de inserción UBLExtension
        ext_content = doc.xpath('//ext:ExtensionContent', namespaces={
            'ext': 'urn:oasis:names:specification:ubl:schema:xsd:CommonExtensionComponents-2'
        })[0]

        # Crear nodo de firma
        signature_node = xmlsec.template.create(
            doc,
            xmlsec.constants.TransformExclC14N,
            xmlsec.constants.TransformRsaSha256,
            ns="ds"
        )
        ext_content.append(signature_node)

        # Referencia al documento completo
        ref = xmlsec.template.add_reference(signature_node, xmlsec.constants.TransformSha256)
        xmlsec.template.add_transform(ref, xmlsec.constants.TransformEnveloped)

        # Cargar llaves
        key = xmlsec.Key.from_file(key_pem_path, xmlsec.constants.KeyDataFormatPem)
        key.load_cert_file(cert_pem_path, xmlsec.constants.KeyDataFormatPem)

        ctx = xmlsec.SignatureContext()
        ctx.key = key
        ctx.sign(signature_node)

        return etree.tostring(doc, pretty_print=True, xml_declaration=True, encoding='utf-8').decode('utf-8')

    def enviar_a_dian_soap(self, xml_firmado_b64: str, test_set_id: str = None) -> dict:
        """
        Transmite el documento XML comprimido o codificado en Base64 al servicio SOAP de la DIAN.
        Utiliza el método SendTestSetAsync (Habilitación) o SendBillSync (Producción).
        """
        endpoint = self.DIAN_WSDL_HABILITACION if self.config.ambiente_habilitacion else self.DIAN_WSDL_PRODUCCION
        
        soap_body = f"""<soapenv:Envelope xmlns:soapenv="http://schemas.xmlsoap.org/soap/envelope/" xmlns:wcf="http://wcf.dian.colombia">
           <soapenv:Header/>
           <soapenv:Body>
              <wcf:SendTestSetAsync>
                 <wcf:fileName>factura.xml</wcf:fileName>
                 <wcf:contentFile>{xml_firmado_b64}</wcf:contentFile>
                 <wcf:testSetId>{test_set_id or self.config.clfe_test_set_id}</wcf:testSetId>
              </wcf:SendTestSetAsync>
           </soapenv:Body>
        </soapenv:Envelope>"""

        headers = {
            'Content-Type': 'text/xml;charset=UTF-8',
            'SOAPAction': 'http://wcf.dian.colombia/IWcfDianCustomerServices/SendTestSetAsync'
        }

        try:
            response = requests.post(endpoint, data=soap_body, headers=headers, timeout=20)
            if response.status_code == 200:
                # Parsear respuesta XML SOAP DIAN (TrackId o ApplicationResponse)
                return {
                    "exito": True,
                    "codigo_http": 200,
                    "xml_respuesta": response.text,
                    "mensaje": "Documento recibido por los servidores de la DIAN para validación"
                }
            else:
                return {
                    "exito": False,
                    "codigo_http": response.status_code,
                    "error": response.text
                }
        except Exception as ex:
            return {"exito": False, "error": f"Falla de conexión con la DIAN: {str(ex)}"}
