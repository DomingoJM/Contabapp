# Arquitectura del Módulo Contable "ComunCont"
## Ecosistema Comunidades Inteligentes (Colombia)

ComunCont actúa como el núcleo transaccional, contable bajo NIIF para microempresas / Entidades Sin Ánimo de Lucro (ESAL/JAC) y motor de facturación electrónica y documento equivalente ante la DIAN (Anexo Técnico 1.9 / UBL 2.1).

### Arquitectura General

```mermaid
flowchart TD
    subgraph Ecosistema ["Ecosistema de Apps"]
        A[HormigApp - Comercio Popular] -->|Webhook / Evento JWT| GW[API Gateway / Event Ingestion]
        B[AICampo - AgroTech] -->|Webhook / Evento JWT| GW
        C[MyAdminPH / ComunPlan] -->|Webhook / Evento JWT| GW
    end

    subgraph ComunCont ["ComunCont Core (Django REST + Celery + PostgreSQL)"]
        GW --> Ingestion[Ingestion API / Validaciones de Idempotencia]
        Ingestion --> RulesEngine[Motor de Mapeo de Asientos Contables]
        RulesEngine --> DoubleEntry[Motor de Partida Doble NIIF]
        DoubleEntry --> Ledger[(Libro Mayor / Asientos Contables)]
        
        DoubleEntry --> DIANEngine[Motor de Facturación Electrónica DIAN]
        DIANEngine --> UBLGen[Generador UBL 2.1 XML]
        UBLGen --> Signer[Firmador XAdES-BES / xmlsec]
        Signer --> CUFEGen[Generador CUFE / QR Code]
        Signer --> DIANSOAP[Cliente SOAP DIAN / Validador Previo]
    end

    subgraph DIAN ["DIAN Colombia"]
        DIANSOAP -->|SOAP WSDL / mTLS| DIANServer[Web Services DIAN / PAT]
    end

    subgraph Frontend ["Frontend PWA (React + Vite + Tailwind)"]
        UI[Dashboard Comunitario / Facturación PWA] <-->|REST API + Offline Cache| ComunCont
    end
```
