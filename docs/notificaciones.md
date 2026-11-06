# Avisos de reservas: opciones gratis y con costo

La app avisa de cada reserva nueva por los canales que configures (todos opcionales, se pueden combinar).
Ningún fallo de un canal afecta a la reserva. Todo queda registrado en `/admin/avisos`.

## Opción 1 — Telegram (GRATIS, automático) · recomendada

Costo: $0 (la Bot API de Telegram es gratuita, sin plantillas ni aprobaciones).

1. En Telegram, hablá con **@BotFather** → `/newbot` → elegí nombre y usuario. Te da un **token**.
2. Abrí el chat con tu bot nuevo y enviale cualquier mensaje (ej. "hola").
3. Entrá a `https://api.telegram.org/bot<TOKEN>/getUpdates` en el navegador y copiá el número de `"chat":{"id": ...}`.
   (Para recibir en un grupo: agregá el bot al grupo, escribí algo y usá el `id` del grupo, que empieza con `-`.)
4. En Vercel → Settings → Environment Variables cargá:
   - `TELEGRAM_BOT_TOKEN` = el token (secreto)
   - `TELEGRAM_CHAT_ID` = el id del chat
5. Redeployá. En `/admin/avisos` el canal figura como activo.

## Opción 2 — Botones de WhatsApp normal (GRATIS, manual)

- En la confirmación de la reserva, el cliente tiene el botón **"Avisar al predio por WhatsApp"** (abre su WhatsApp con el mensaje armado; usa el número de "WhatsApp de contacto" de Configuración).
- En el detalle de cada reserva, el botón **"Escribirle por WhatsApp"** abre el chat con el cliente.
- Funcionan con el WhatsApp común o Business app del predio, sin API y sin costo.

## Opción 3 — WhatsApp Business Cloud API (automático, CON costo por mensaje)

Meta cobra por cada plantilla entregada (categoría *Utility*). Ver `docs/whatsapp.md`.
