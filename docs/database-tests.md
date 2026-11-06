# Pruebas de base de datos

Se ejecutaron en el SQL Editor de Supabase dentro de un bloque `DO` que termina con `RAISE EXCEPTION`,
para que **toda la transacción se revierta** y no queden datos de prueba.

Cubre (resultado esperado entre paréntesis):

- **anon:** no lee `bookings`, `payments`, `audit_log`, `notification_logs`, `profiles`, `blocked_slots` (42501); no lee `notification_whatsapp_number` (42501); sí lee precios, canchas y horarios; no ejecuta `create_public_booking` ni `get_day_availability` (42501); no escribe nada.
- **Reservas:** grupal ok; segunda grupal en el mismo turno (DC001); individual sobre grupal (DC001); 6+4 individuales ok, 5ª plaza excedida (DC003); grupal sobre individuales (DC001); horario no alineado (DC006); turno pasado (DC008); teléfono (DC007), nombre (DC005), jugadores (DC010) inválidos; fuera de ventana (DC009); turno bloqueado (DC002); escritura directa de staff también validada por trigger.
- **Pagos:** 20.000 + 10.000 = parcial (saldo 10.000); pago que excede saldo (DC011); pago final = pagado; DELETE bloqueado (42501 / DC012); anular pago recalcula saldo y registra fecha/usuario.
- **Cancelación:** libera el turno, conserva los pagos cobrados.
- **RLS:** usuario sin perfil no ve nada; staff no modifica precios, horarios ni canchas; staff no se promueve a admin ni crea perfiles; admin sí; solo admin lee `audit_log`.
- **Auditoría:** registra el usuario que ejecutó cada cambio.

La prueba de reservas **simultáneas reales** (dos conexiones a la vez) queda para la Fase 8.
