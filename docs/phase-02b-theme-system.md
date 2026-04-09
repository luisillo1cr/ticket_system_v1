# Fase 02B: Sistema de tema claro y oscuro

## Objetivo

Incorporar un sistema de tema visual profesional antes de iniciar la Fase 3 funcional del módulo de tickets.

## Alcance implementado

- Activación de `darkMode: "class"` en Tailwind
- Provider global para manejo del tema
- Persistencia en `localStorage`
- Resolución inicial por preferencia del sistema
- Botón profesional de cambio de tema con transición de icono
- Adaptación visual de layouts, páginas base y módulo administrativo de tickets

## Paleta base utilizada

### Tema claro
- Fondo general: `#F9FAFB`
- Superficie principal: `#FFFFFF`
- Bordes suaves: `#E5E7EB`
- Texto principal: `#0F172A`
- Texto secundario: `#64748B`

### Tema oscuro
- Fondo general: `#121212`
- Superficie principal: `#1A1A1A`
- Borde principal: `#444444`
- Texto principal: `#E0E0E0`
- Texto secundario: `#B0B0B0`
- Texto de apoyo: `#888888`

## Estructura incorporada

- `src/app/providers/ThemeProvider.jsx`
- `src/hooks/useTheme.js`
- `src/components/shared/ThemeToggleButton.jsx`

## Decisión de arquitectura

El tema se controla mediante la clase `dark` sobre el elemento `html`. Esta decisión es compatible con Tailwind v3 y permite mantener un sistema visual escalable y consistente.

## Próxima fase

La siguiente fase será:

- creación real de tickets desde interfaz
- persistencia estructurada en Firestore
- generación de número de ticket
- inicio del flujo de mensajes y adjuntos