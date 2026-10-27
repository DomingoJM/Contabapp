# ContabApp (ComunCont) - Ecosistema Comunidades Inteligentes

Núcleo de contabilidad comunitaria bajo **Normas NIIF** (para microempresas, emprendedores y Juntas de Acción Comunal - JAC) y **Facturación Electrónica DIAN** (UBL 2.1 / Colombia).

Diseñado para sincronizar e intermediar transacciones de las aplicaciones del ecosistema (*HormigApp*, *AICampo*, *MyAdminPH*, etc.).

---

## 🚀 Módulos y Estructura

- **`ARCHITECTURE.md`**: Diagrama de flujo y arquitectura general del ecosistema.
- **`models_comuncont.py`**: Modelos Django ORM bajo NIIF (Multi-tenant, Cuentas Contables, Terceros DIAN, Asientos Contables por Partida Doble, Transacciones Idempotentes y Facturación).
- **`views_api.py`**: Endpoints REST en DRF para ingesta asíncrona de eventos transaccionales y motor automático de reglas contables.
- **`dian_service.py`**: Conector con la DIAN: Cálculo de CUFE SHA-384, generación XML UBL 2.1, firma digital XAdES-BES (`xmlsec`) y cliente SOAP.
- **`ComunContDashboard.tsx`**: PWA en React, Vite, TypeScript y Tailwind CSS con métricas comunitarias, libro diario y emisión de documentos.

---

## 🛠️ Tecnologías
- **Backend**: Python 3.11+, Django, Django REST Framework, xmlsec, lxml.
- **Frontend**: React 18+, TypeScript, Tailwind CSS, Heroicons.
- **Base de Datos**: PostgreSQL / Supabase.
- **Regulación**: NIIF para PYMES / Microempresas & Anexo Técnico 1.9 DIAN (Colombia).
