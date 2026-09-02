# Notificaciones

Las notificaciones se persisten como una cola por tenant. `NotificationsService` intenta enviarlas mediante Resend (`RESEND_API_KEY`) o WhatsApp Cloud API (`WHATSAPP_TOKEN` y `WHATSAPP_PHONE_NUMBER_ID`); si faltan credenciales quedan en estado `failed` con el motivo y pueden reintentarse desde `POST /api/notifications/:id/retry`.
