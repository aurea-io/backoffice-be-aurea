# Pagos

El backend expone `POST /api/payments/intents` para crear un intento asociado a una reserva, pedido o suscripción. Los proveedores soportados son `manual`, `mercadopago` y `stripe`. Con `MERCADOPAGO_ACCESS_TOKEN` o `STRIPE_SECRET_KEY` configurados, se solicita un checkout al proveedor y se devuelve su URL; sin credenciales el intento queda explícitamente en modo `provider_unavailable`.

Los cambios de estado llegan por `POST /api/payments/webhooks/:provider` y son idempotentes por `provider + externalId`. Antes de producción se debe agregar la verificación de firma específica del proveedor y configurar las URLs de webhook.
