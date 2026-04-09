# Fase 02: Módulo inicial de tickets para administración

## Objetivo

Extender la base de autenticación y navegación con una primera implementación real del módulo de tickets para administración.

## Alcance implementado

- Mejora visual general del layout
- Ajuste del fondo global a `#F9FAFB`
- Reubicación del cierre de sesión al sidebar mediante icon button
- Navegación administrativa real para:
  - dashboard
  - tickets
- Servicio base para leer tickets desde Firestore
- Listado administrativo de tickets
- Vista de detalle de ticket
- Componentes visuales reutilizables para estado y prioridad

## Estructura incorporada

- `src/constants/tickets.js`
- `src/components/tickets/TicketStatusBadge.jsx`
- `src/components/tickets/TicketPriorityBadge.jsx`
- `src/services/ticketService.js`
- `src/pages/AdminTicketsPage.jsx`
- `src/pages/AdminTicketDetailPage.jsx`

## Alcance funcional actual

El sistema ya puede:

- autenticarse
- resolver roles
- navegar entre dashboard y tickets
- leer la colección `tickets`
- abrir el detalle de un ticket específico

## Próxima fase

La siguiente fase implementará:

- creación de tickets desde interfaz
- mensajes del ticket
- adjuntos
- actualización de estados
- filtros administrativos reales