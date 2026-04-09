# Fase 03: Creación real de tickets desde interfaz

## Objetivo

Implementar el primer flujo operativo real del módulo de tickets mediante una interfaz administrativa conectada a Firestore.

## Alcance implementado

- Ruta administrativa para creación de tickets
- Formulario profesional de registro
- Generación segura de `ticketNumber`
- Persistencia real en Firestore
- Asignación automática del creador y responsable inicial
- Uso de `createdByUid`, `createdByName`, `assignedToUid`, `assignedToName`
- Contador seguro mediante `system_counters/tickets`

## Decisión de arquitectura

La numeración del ticket no se genera por conteo visual ni por consulta del último documento.  
Se utiliza una transacción de Firestore sobre `system_counters/tickets` para reducir colisiones y mantener una secuencia consistente.

## Estructura relevante

- `src/pages/AdminCreateTicketPage.jsx`
- `src/services/ticketService.js`
- `firestore.rules`

## Formato actual de numeración

`TCK-YYYY-0001`

Ejemplo:

`TCK-2026-0001`

## Campos base del ticket

- `ticketNumber`
- `clientId`
- `systemId`
- `subject`
- `category`
- `priority`
- `status`
- `description`
- `createdByUid`
- `createdByName`
- `assignedToUid`
- `assignedToName`
- `createdAt`
- `updatedAt`
- `lastMessageAt`

## Próxima fase

La siguiente fase implementará:

- conversación del ticket
- colección `ticket_messages`
- respuesta administrativa
- respuesta de cliente
- base de adjuntos e imágenes