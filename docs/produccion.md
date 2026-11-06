# Producción, respaldos y credenciales — DC Predio

## Variables de entorno (Vercel → Settings → Environment Variables)
| Variable | Obligatoria | Dónde se obtiene |
|---|---|---|
| NEXT_PUBLIC_SUPABASE_URL | Sí | Supabase → Project Settings → API |
| NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY | Sí | Supabase → API Keys (publishable / anon) |
| SUPABASE_SERVICE_ROLE_KEY | Sí | Supabase → API Keys (secret). **Nunca** en el código ni con prefijo NEXT_PUBLIC |
| NEXT_PUBLIC_SITE_URL | Sí | URL pública (https://dcpredio.vercel.app o tu dominio) |
| TELEGRAM_BOT_TOKEN / TELEGRAM_CHAT_ID | Opcional (gratis) | Ver docs/notificaciones.md |
| WHATSAPP_* | Opcional (de pago) | Ver docs/whatsapp.md |

Tras cambiar variables hay que **redeployar** (Deployments → ⋯ → Redeploy).

## Rotar claves expuestas
Si una clave se pegó en un chat o se subió a Git: Supabase → Project Settings → API → regenerar (JWT secret / secret key), actualizar `SUPABASE_SERVICE_ROLE_KEY` y las públicas en Vercel y redeployar.

## Respaldos
1. **Propios (recomendado):** Panel → *Respaldos* → "Descargar JSON completo" (reservas, pagos, avisos, configuración, horarios). También CSV por tabla para Excel. Solo administradores. Contienen datos personales: guardalos en un lugar privado. Sugerencia: una vez por semana.
2. **De Supabase:** el plan gratuito no ofrece restauración automática a un punto en el tiempo; los planes pagos incluyen copias diarias (Dashboard → Database → Backups). Consultá tu plan.
3. **Estructura:** todas las migraciones están en `supabase/migrations/` y reconstruyen la base desde cero.

## Seguridad aplicada
- RLS en todas las tablas; el personal solo opera con su sesión; la clave de servicio solo se usa en el servidor para reservas públicas y registro de avisos.
- Cabeceras: X-Frame-Options DENY, nosniff, HSTS, Referrer-Policy, Permissions-Policy.
- Export de respaldos: requiere sesión de administrador (401/403 en otro caso), sin caché; los CSV neutralizan fórmulas.
- Pendiente de tu lado: activar "Leaked password protection" en Supabase → Authentication → Providers → Email (puede requerir plan Pro).
- `get_day_availability` y `get_month_availability` son públicas a propósito (solo devuelven disponibilidad, sin datos personales).

## Pruebas realizadas en producción
- 6 navegadores confirmando el mismo turno a la vez → 1 reserva creada, 5 rechazadas con "Ese turno acaba de ser reservado". El control está en la base (bloqueo + chequeo de solapamiento), no en la pantalla.
- Pruebas de reglas de pagos y estadísticas: ver docs/database-tests.md.
- Móvil (390×844) verificado en reserva pública y panel.
