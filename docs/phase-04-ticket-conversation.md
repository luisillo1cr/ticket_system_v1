# Fase 04: Conversación operativa del ticket

## Objetivo

Convertir el ticket en una entidad operativa con historial conversacional real.

## Alcance implementado

- Mensaje inicial automático al crear el ticket
- Lectura en tiempo real del ticket
- Lectura en tiempo real de la conversación
- Respuesta administrativa desde la interfaz
- Actualización automática de `updatedAt` y `lastMessageAt`

## Estructura de mensaje

- `ticketId`
- `senderId`
- `senderName`
- `senderRole`
- `message`
- `attachments`
- `createdAt`

## Estado actual

El ticket ya funciona como encabezado + conversación asociada.

## Próxima fase

- cambio de estado desde la UI
- respuesta de cliente
- adjuntos e imágenes