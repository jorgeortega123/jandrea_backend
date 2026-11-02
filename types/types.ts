/**
 * Binding `send_email` de Cloudflare Email Service (forma con objeto).
 * Se declara aquí porque worker-configuration.d.ts es anterior a esta API y
 * solo conoce `send(EmailMessage)` (MIME crudo de Email Routing).
 */
export interface EmailAddress {
  name: string;
  email: string;
}
export interface EmailSendBinding {
  send(message: {
    to: string | EmailAddress | (string | EmailAddress)[];
    from: string | EmailAddress;
    subject: string;
    replyTo?: string | EmailAddress;
    html?: string;
    text?: string;
    headers?: Record<string, string>;
  }): Promise<{ messageId: string } | void>;
}

export type Bindings = {
  MY_KV: KVNamespace;
  MY_BUCKET: R2Bucket;
  RECEIPTS_BUCKET: R2Bucket;
  DB: D1Database;
  BETTER_AUTH_SECRET: string;
  GOOGLE_CLIENT_ID: string;
  GOOGLE_CLIENT_SECRET: string;
  /** Cloudflare Email Service (dominio jandrea.art). */
  EMAIL: EmailSendBinding;
  /** Remitente, p. ej. "cotizaciones@jandrea.art" (var de wrangler). */
  EMAIL_FROM?: string;
  /** Destinatarios del aviso de cotización separados por coma (opcional). */
  LEADS_NOTIFY_TO?: string;
  /** Secreto para el panel /leads (`wrangler secret put LEADS_ADMIN_KEY`). */
  LEADS_ADMIN_KEY?: string;
  /** Zona de jandrea.art: para consultar los eventos de envío (var de wrangler). */
  CF_ZONE_ID?: string;
  /** Token de API con Analytics Read (`wrangler secret put CF_ANALYTICS_TOKEN`). */
  CF_ANALYTICS_TOKEN?: string;
};
