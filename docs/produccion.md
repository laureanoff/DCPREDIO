# Producción, respaldos y credenciales — DC Predio

## Variables de entorno (Vercel → Settings → Environment Variables)
| Variable | Obligatoria | Dónde se obtiene |
|---|---|---|
| NEXT_PUBLIC_SUPABASE_URL | Sí | Supabase → Project Settings → API |
| NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY | Sí | Supabase → API Keys (publishable / anon) |
| SUPABASE_SERVICE_ROLE_KEY | Sí | Supabase → API Keys (secret). **Nunca** en el código ni con prefijo NEXT_PUBLIC |
| NEXT_PUBLIC_SITE_URL | Sí | URL pública (https://dcpredio.vercel.app o tu dominio) |

Tras cambiar variables hay que **redeployar** (Deployments → ⋯ → Redeploy).

## Rotar claves expuestas
Si una clave se pegó en un chat o se subió a Git: Supabase → Project Settings → API → regenerar (JWT secret / secret key), actualizar `SUPABASE_SERVICE_ROLE_KEY` y las públicas en Vercel y redeployar.

## Respaldos
1. **Propios (recomendado):** Panel → *Respaldos* → "Descargar JSON completo" (reservas, pagos, avisos, configuración, horarios). También CSV por tabla para Excel. Solo administradores. Contienen datos personales: guardalos en un lugar privado. Sugerencia: una vez por semana.
2. **De Supabase:** el plan gratuito no ofrece restauración automática a un punto en el tiempo; los planes pagos incluyen copias diarias (Dashboard → Database → Backups). Consultá tu plan.
3. **Estructura:** todas las migraciones están en `supabase/migrations/` y reconstruyen la base desde cero.

## Seguridad aplicada
- RLS en todas las tablas; el personal solo opera con su sesión; la clave de servicio solo se usa en el servidor para crear reservas públicas.
- Cabeceras: X-Frame-Options DENY, nosniff, HSTS, Referrer-Policy, Permissions-Policy.
- Export de respaldos: requiere sesión de administrador (401/403 en otro caso), sin caché; los CSV neutralizan fórmulas.
- Pendiente de tu lado: activar "Leaked password protection" en Supabase → Authentication → Providers → Email (puede requerir plan Pro).
- `get_day_availability` y `get_month_availability` son públicas a propósito (solo devuelven disponibilidad, sin datos personales).

## Pruebas realizadas en producción
- 6 navegadores confirmando el mismo turno a la vez → 1 reserva creada, 5 rechazadas con "Ese turno acaba de ser reservado". El control está en la base (bloqueo + chequeo de solapamiento), no en la pantalla.
- Pruebas de reglas de pagos y estadísticas: ver docs/database-tests.md.
- Móvil (390×844) verificado en reserva pública y panel.

## Empleados, buffet, bloqueos, canchas y avisos push

- **Empleados** (`/admin/usuarios`, solo administrador): se crean con usuario y contraseña (se entra solo con el usuario, no con email); el rol «staff» opera reservas, cobros, bloqueos y buffet, pero no ve configuración, estadísticas, galería, respaldos ni usuarios. Desactivar un empleado cierra su acceso al instante.
- **Reservas manuales** (`/admin/reservas/nueva`) usan la misma regla anti-doble-reserva que la web.
- **Bloqueos** (`/admin/bloqueos`): lluvia, mantenimiento, torneo (todo el personal) y feriados/días especiales (solo administrador). No permite bloquear sobre reservas activas.
- **Mi reserva** (`/mi-reserva`): el cliente consulta/cancela con código + teléfono. Se configura en Configuración (permitir cancelar y horas de anticipación). No se puede cancelar online si hay pagos registrados.
- **Canchas** (Configuración → Canchas): agregar, renombrar, activar/desactivar. Con más de una activa, la web pide elegir cancha.
- **Buffet** (`/admin/buffet`): productos (admin), ventas rápidas, anulaciones y totales; resumen en Estadísticas.
- **Avisos push con el celular bloqueado**: variables `NEXT_PUBLIC_VAPID_PUBLIC_KEY`, `VAPID_PRIVATE_KEY` (sensible) y `VAPID_SUBJECT` en Vercel. Cada persona activa los avisos desde Avisos → «Activar avisos». En iPhone hay que instalar antes la web en la pantalla de inicio.
- **Lista de espera**: en la web, tocar un turno «Ocupado» deja anotarse con nombre y WhatsApp. En el panel (Espera) aparecen marcados los turnos que se liberaron y un botón «Avisar» por WhatsApp; si se cancela un turno con gente esperando llega un aviso push.
- **Stock del buffet**: por producto se activa «Controlar stock» (cantidad y umbral de aviso). Cada venta descuenta de forma atómica, anular o borrar devuelve el stock, y «Stock bajo» permite reponer desde la misma pantalla.
