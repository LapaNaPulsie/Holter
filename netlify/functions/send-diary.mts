import { getStore } from '@netlify/blobs';
import type { Context } from '@netlify/functions';
import { handleSend, type KV } from '../lib/send-core';
import { mailerFromEnv } from '../lib/mailers';
import { LOGO_RATIO, type PdfAssets } from '../../src/core/pdf';

/**
 * POST /.netlify/functions/send-diary   body: {"diary": {...}, "website": ""}
 * Wysyła dzienniczek na stały adres kardiologia@lapanapulsie.pl z PDF w załączniku.
 */

let assetsCache: Promise<PdfAssets> | null = null;

async function fetchBase64(base: string, path: string): Promise<string> {
  const res = await fetch(new URL(path, base));
  if (!res.ok) throw new Error(`asset_${res.status}`);
  return Buffer.from(await res.arrayBuffer()).toString('base64');
}

/** Czcionki i logo pobierane z opublikowanej strony (te same pliki, z których korzysta przeglądarka). */
function loadAssets(base: string): Promise<PdfAssets> {
  if (!assetsCache) {
    assetsCache = Promise.all([
      fetchBase64(base, '/fonts/Montserrat-Regular.ttf'),
      fetchBase64(base, '/fonts/Montserrat-Bold.ttf'),
      fetchBase64(base, '/fonts/Montserrat-ExtraBold.ttf'),
      fetchBase64(base, '/assets/01_brand/logo_lapa_poziome_granat_transparent.png'),
    ])
      .then(([regular, bold, extraBold, logo]) => ({ regular, bold, extraBold, logo: `data:image/png;base64,${logo}`, logoRatio: LOGO_RATIO }))
      .catch((e) => {
        assetsCache = null;
        throw e;
      });
  }
  return assetsCache;
}

function blobStore(): KV {
  const store = getStore({ name: 'holter-wysylki', consistency: 'strong' });
  return {
    get: (key) => store.get(key, { type: 'text' }),
    set: async (key, value, opts) => {
      const r = await store.set(key, value, opts?.onlyIfNew ? { onlyIfNew: true } : undefined);
      return { modified: r?.modified ?? true };
    },
    delete: (key) => store.delete(key),
  };
}

export default async (req: Request, context: Context): Promise<Response> => {
  const env = process.env;
  const origin = new URL(req.url).origin;
  return handleSend(req, {
    store: blobStore(),
    mailer: await mailerFromEnv(env),
    loadAssets: () => loadAssets(origin).catch(() => loadAssets(env.URL ?? origin)),
    clientIp: context.ip ?? req.headers.get('x-nf-client-connection-ip') ?? 'unknown',
    secret: env.RATE_LIMIT_SECRET || env.SITE_ID || 'lnp-holter',
    allowedOrigins: [env.URL, env.DEPLOY_PRIME_URL, ...(env.ALLOWED_ORIGINS ?? '').split(',')].map((s) => (s ?? '').trim().replace(/\/$/, '')).filter(Boolean),
    // Tylko kody zdarzeń – bez treści dzienniczka
    log: (code) => console.log(`[send-diary] ${code}`),
  });
};
