# WhatsApp Business Cloud API (Meta)

La app envía **mensajes de plantilla** (los únicos que Meta permite iniciar fuera de una conversación de 24 h).
Mientras no estén configurados los datos de abajo, los avisos quedan registrados como **"No enviado"** en `/admin/avisos`
(con el motivo) y se pueden reintentar con un clic. Nada se simula.

## 1. Datos que tenés que obtener en Meta

1. Crear una app en https://developers.facebook.com (tipo *Business*) y agregar el producto **WhatsApp**.
2. Registrar el número del predio (o usar el número de prueba de Meta para empezar).
3. Anotar:
   - **Phone number ID** → `WHATSAPP_PHONE_NUMBER_ID`
   - **WhatsApp Business Account ID** → `WHATSAPP_BUSINESS_ACCOUNT_ID`
   - **Token de acceso permanente** (usuario del sistema, permiso `whatsapp_business_messaging`) → `WHATSAPP_ACCESS_TOKEN`
4. Crear y esperar la aprobación de la plantilla (categoría *Utility*, idioma Español (Argentina) = `es_AR`).

## 2. Plantilla para el predio (`WHATSAPP_TEMPLATE_VENUE`, obligatoria)

Cuerpo sugerido (6 variables, en este orden):

```
Nueva reserva {{1}}: {{2}} ({{3}}) reservó la cancha el {{4}} de {{5}}. Total: {{6}}.
```

Variables: 1 código · 2 nombre · 3 teléfono · 4 fecha · 5 horario · 6 total.

## 3. Plantilla para el cliente (`WHATSAPP_TEMPLATE_CUSTOMER`, opcional)

Si se define, también se avisa al cliente. Cuerpo sugerido (5 variables):

```
Hola {{1}}, tu reserva {{2}} está confirmada para el {{3}} de {{4}}. Total a pagar en el predio: {{5}}.
```

## 4. Variables de entorno (Vercel → Settings → Environment Variables)

| Variable | Obligatoria | Descripción |
|---|---|---|
| `WHATSAPP_ACCESS_TOKEN` | Sí | Token de Meta (secreto, solo servidor) |
| `WHATSAPP_PHONE_NUMBER_ID` | Sí | ID del número emisor |
| `WHATSAPP_TEMPLATE_VENUE` | Sí | Nombre exacto de la plantilla del predio |
| `WHATSAPP_BUSINESS_ACCOUNT_ID` | No | Para referencia |
| `WHATSAPP_TEMPLATE_CUSTOMER` | No | Activa el aviso al cliente |
| `WHATSAPP_TEMPLATE_LANGUAGE` | No | Por defecto `es_AR` |
| `WHATSAPP_API_VERSION` | No | Por defecto `v21.0` |
| `WHATSAPP_VENUE_NUMBER` | No | Número que recibe los avisos si no se cargó en Configuración |

El **número que recibe los avisos** se carga en el panel: Configuración → Avisos por WhatsApp (formato internacional, ej. `5493511234567`).

## 5. Cómo funciona

- Al confirmarse una reserva web, **después de responder al cliente**, se crea un registro en `notification_logs` y se intenta el envío.
- Reintentos automáticos (hasta 3, con espera) solo ante errores transitorios (red, 5xx, límites de velocidad). Los errores de configuración o de plantilla no se reintentan solos.
- Un fallo de WhatsApp **nunca** cancela ni demora la reserva.
- En la agenda aparece un cartel si hay avisos fallidos en los últimos 3 días; en `/admin/avisos` se reintentan.
