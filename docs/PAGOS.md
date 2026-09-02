# Pagos

El backend expone `POST /api/payments/intents` para crear un intento asociado a una reserva, pedido o suscripción. Los proveedores soportados son `manual`, `mercadopago` y `stripe`. Con `MERCADOPAGO_ACCESS_TOKEN` o `STRIPE_SECRET_KEY` configurados, se solicita un checkout al proveedor y se devuelve su URL; sin credenciales el intento queda explícitamente en modo `provider_unavailable`.

Los cambios de estado llegan por `POST /api/payments/webhooks/:provider` y son idempotentes por `provider + externalId`. Si se configura `WEBHOOK_SECRET_MERCADOPAGO` o `WEBHOOK_SECRET_STRIPE`, el backend exige `x-webhook-signature` con HMAC-SHA256 del cuerpo crudo; la configuración de URLs de webhook sigue siendo operativa.
