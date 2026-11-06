# DC Predio — Sistema de reservas y gestión

Aplicación web para gestionar las reservas de **DC Predio** (fútbol 5): página pública para clientes y panel privado para el administrador.

**Stack:** Next.js (App Router) · TypeScript · Tailwind CSS · Supabase (Auth + PostgreSQL) · Vercel · WhatsApp Business Cloud API (Meta).

> Estado: **Fase 3 — Página pública y reservas** completa. Ver [Roadmap](#roadmap).

## Identidad

- Nombre oficial: **DC Predio** (`src/config/brand.ts`). Solo se sobrescribe desde la configuración explícita del panel (`venue_settings`).
- Logo vectorial: `public/brand/dc-predio-logo.svg` · componente `src/components/brand/Logo.tsx`.
- Favicon: `src/app/icon.svg` y `src/app/apple-icon.png`.
- Colores: negro `#0A0A0A`, verde lima `#B6D61A`, blanco.
- Zona horaria `America/Argentina/Cordoba` · moneda ARS.

## Estructura

```
src/
  app/                 Rutas (páginas públicas y /admin)
  components/          brand · public · admin · ui
  config/              Marca y constantes
  lib/                 env, supabase (browser/server/admin), utils
  services/            Lógica de servidor (casos de uso)
  queries/             Consultas a Supabase
  business/            Reglas de negocio (disponibilidad, precios, pagos)
  validations/         Esquemas zod
  integrations/whatsapp/  Cliente de WhatsApp Cloud API
  types/               Tipos TypeScript
supabase/migrations/   Migraciones SQL versionadas
docs/                  Documentación adicional
```

## Instalación local

```bash
npm install
cp .env.example .env.local   # completar valores reales
npm run dev
```

Abrir http://localhost:3000.

## Servicios que hay que crear (una sola vez)

### 1. GitHub
1. https://github.com/new → nombre sugerido `dc-predio`, **privado**, sin README/.gitignore/licencia.
2. Subir este código (`git remote add origin ... && git push -u origin main`).

### 2. Supabase
1. https://supabase.com/dashboard → **New project** (nombre `dc-predio`, región `South America (São Paulo)`, contraseña de base de datos fuerte guardada en un gestor de contraseñas).
2. **Project Settings → API**: copiar `Project URL`, la clave *publishable* y la *service_role* (esta última es secreta).
3. **Authentication → Providers**: dejar habilitado solo Email. **Desactivar "Allow new users to sign up"** (no hay registro público de administradores).

### 3. Vercel
1. https://vercel.com/new → **Import** el repositorio `dc-predio` de GitHub.
2. Framework: Next.js (autodetectado).
3. Cargar las variables de `.env.example` en **Settings → Environment Variables** (Production y Preview).
4. Cada `git push` a `main` despliega automáticamente.


## Base de datos (Supabase)

Migraciones versionadas en `supabase/migrations/` (ya aplicadas al proyecto `dc-predio`). Tablas: `profiles`, `venue_settings`, `courts`, `operating_hours`, `special_days`, `blocked_slots`, `bookings`, `payments`, `notification_logs`, `audit_log` y la vista `booking_financials`.

Reglas clave (aplicadas en la base, no solo en la app):
- **Sin doble reserva:** un trigger serializa por cancha y rechaza turnos ocupados, bloqueados o sin cupo. El turno *grupal* ocupa la cancha completa; los *individuales* suman plazas hasta `max_players`. Hay además una restricción de exclusión para turnos grupales superpuestos.
- **Alta atómica pública:** `create_public_booking(...)` valida horario, ventana de reserva, teléfono y calcula el precio desde `venue_settings`. Solo la puede ejecutar `service_role` (Server Actions).
- **Pagos:** cada pago es un registro independiente; no se borran, se **anulan** (`is_voided`). Un pago no puede superar el saldo. Los ingresos se calculan por `paid_at` de pagos no anulados.
- **Auditoría:** `audit_log` registra altas/cambios/bajas con el usuario (solo lectura para admin).
- **RLS:** el público (`anon`) solo lee columnas públicas de la configuración, canchas y horarios. Reservas, pagos, clientes y auditoría son solo para personal con perfil activo.

Códigos de error de la base (`error.code`): `DC001` turno no disponible · `DC002` bloqueado · `DC003` sin cupo · `DC004` cancha inexistente · `DC005` nombre inválido · `DC006` horario inválido · `DC007` teléfono inválido · `DC008` turno pasado · `DC009` fuera de ventana · `DC010` jugadores inválidos · `DC011` pago supera saldo · `DC012` pagos no se borran · `DC013` el pago no puede cambiar de reserva.

> Valores iniciales **provisorios** (editables desde el panel): horario 16:00–00:00 todos los días, precio individual $5.000, grupal $40.000, 10 jugadores, turnos de 60 min.


## Página pública y flujo de reserva

- `/` — hero, precios, horarios y widget de reservas (calendario → horarios → datos → resumen → confirmación con código `DC-XXXXXX`).
- La disponibilidad se lee en vivo desde la base (`get_month_availability` / `get_day_availability`, públicas y sin datos personales).
- La reserva se crea en una **Server Action** (`src/app/reservar/actions.ts`) que valida con zod y llama a `create_public_booking` usando `SUPABASE_SERVICE_ROLE_KEY` (solo servidor). Si esa variable no está configurada, el cliente ve un error claro y **no se guarda nada**.
- Anti-abuso: campo trampa (honeypot) y tope configurable de reservas activas por teléfono (`venue_settings.max_active_bookings_per_phone`, por defecto 3).
- El precio total siempre lo recalcula el servidor desde `venue_settings`.
- La configuración pública se cachea unos minutos (`src/queries/venue.ts`): los cambios del panel se reflejan sin volver a desplegar.

## Autenticación y administradores

No hay registro público. Un usuario de Auth **sin fila en `profiles` no accede a nada** (aunque exista).

Para dar de alta al administrador:
1. Supabase → **Authentication → Users → Add user → Create new user** (email + contraseña, marcar *Auto Confirm User*).
2. Supabase → **SQL Editor**:
```sql
insert into public.profiles (id, full_name, role)
select id, 'Diego', 'admin' from auth.users where email = 'EMAIL_DE_DIEGO';
```
3. Supabase → **Authentication → Sign In / Providers**: desactivar **"Allow new users to sign up"**.

Ingreso: `/admin/login`. El panel está en `/admin` (protegido por `src/proxy.ts`, `requireStaff()` y RLS).

## Pruebas de base de datos

La batería de permisos y conflictos (anon / staff / admin, doble reserva, cupos, pagos, auditoría) se ejecutó contra el proyecto y pasó completa. Para repetirla, ver `docs/database-tests.md`.

## Variables de entorno

Ver `.env.example`. Las que **no** llevan `NEXT_PUBLIC_` son solo de servidor y nunca se exponen al navegador.

## Roadmap

1. ✅ Preparación
2. ✅ Base de datos, RLS y autenticación
3. ✅ Página pública y reservas
4. Panel de administración
5. Pagos
6. Ingresos y estadísticas
7. WhatsApp (Meta Cloud API)
8. Pruebas y producción
