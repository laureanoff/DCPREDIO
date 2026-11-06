# DC Predio — Sistema de reservas y gestión

Aplicación web para gestionar las reservas de **DC Predio** (fútbol 5): página pública para clientes y panel privado para el administrador.

**Stack:** Next.js (App Router) · TypeScript · Tailwind CSS · Supabase (Auth + PostgreSQL) · Vercel · WhatsApp Business Cloud API (Meta).

> Estado: **Fase 1 — Preparación** completa. Ver [Roadmap](#roadmap).

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

## Variables de entorno

Ver `.env.example`. Las que **no** llevan `NEXT_PUBLIC_` son solo de servidor y nunca se exponen al navegador.

## Roadmap

1. ✅ Preparación
2. Base de datos, RLS y autenticación
3. Página pública y reservas
4. Panel de administración
5. Pagos
6. Ingresos y estadísticas
7. WhatsApp (Meta Cloud API)
8. Pruebas y producción
