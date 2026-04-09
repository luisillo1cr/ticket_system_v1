# Fase 01: Enrutamiento y autenticación base

## Objetivo

Establecer una base profesional para el portal de soporte antes de construir módulos funcionales como tickets, mensajes, adjuntos y paneles de gestión.

## Alcance implementado

- Estructura de rutas centralizada
- Layout público para autenticación
- Layout privado para panel autenticado
- Provider global de autenticación
- Guards de acceso para invitados y usuarios autenticados
- Restricción opcional por rol
- Pantalla de login conectada a Firebase Auth
- Dashboards base para `admin` y `client`
- Pantalla de acceso restringido para perfiles sin rol válido
- Pantalla 404

## Flujo de autenticación

1. El usuario inicia sesión con correo y contraseña.
2. Firebase Auth autentica la cuenta.
3. El sistema consulta `users/{uid}` en Firestore.
4. El documento define el perfil operativo:
   - `role`
   - `clientId`
   - `active`
5. Según el rol, el sistema redirige al dashboard correspondiente.

## Dependencias funcionales

La autenticación operativa depende de dos capas:

- **Firebase Auth**: valida la cuenta
- **Firestore / users/{uid}**: define el rol y alcance del usuario

## Requisito crítico

Un usuario autenticado sin documento en `users/{uid}` o sin campo `role` válido no podrá acceder correctamente al panel privado.

## Roles actuales

- `admin`
- `client`

## Próxima fase

La siguiente fase implementará:

- listado real de tickets
- creación de ticket
- detalle del ticket
- mensajes y adjuntos
- filtros iniciales para administración