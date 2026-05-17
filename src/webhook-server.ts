/**
 * Express-based webhook receiver for NakoPay event notifications.
 *
 * Forwards payment events to a Discord channel as rich embeds.
 * Run standalone: `npx tsx src/webhook-server.ts`
 *
 * Env: NAKOPAY_WEBHOOK_SECRET, DISCORD_BOT_TOKEN, DISCORD_NOTIFY_CHANNEL_ID
 */
import { createHmac, timingSafeEqual } from 'crypto';
import { createServer, type IncomingMessage, type ServerResponse } from 'http';
import { EmbedBuilder, WebhookClient } from 'discord.js';

const PORT = parseInt(process.env.WEBHOOK_PORT ?? '8444', 10);
const SECRET = process.env.NAKOPAY_WEBHOOK_SECRET ?? '';
const DISCORD_WEBHOOK_URL = process.env.DISCORD_WEBHOOK_URL ?? '';
const BRAND_COLOR = 0xea6828;

const STATUS_EMOJI: Record<string, string> = {
  'invoice.paid': '✅',
  'invoice.expired': '⏰',
  'invoice.canceled': '❌',
  'invoice.underpaid': '⚠️',
  'invoice.overpaid': '💰',
  'invoice.confirmed': '🔒',
};

function verifySignature(payload: Buffer, signature: string): boolean {
  if (!SECRET) return true; // no secret = skip verification (dev mode)
  const expected = createHmac('sha256', SECRET).update(payload).digest('hex');
  try {
    return timingSafeEqual(Buffer.from(expected), Buffer.from(signature));
  } catch {
    return false;
  }
}

let webhookClient: WebhookClient | null = null;
if (DISCORD_WEBHOOK_URL) {
  webhookClient = new WebhookClient({ url: DISCORD_WEBHOOK_URL });
}

async function handleWebhook(req: IncomingMessage, res: ServerResponse) {
  if (req.method !== 'POST') {
    res.writeHead(405);
    res.end('Method Not Allowed');
    return;
  }

  const chunks: Buffer[] = [];
  for await (const chunk of req) chunks.push(chunk as Buffer);
  const body = Buffer.concat(chunks);

  const sig = (req.headers['x-nakopay-signature'] as string) ?? '';
  if (!verifySignature(body, sig)) {
    res.writeHead(401);
    res.end(JSON.stringify({ error: 'invalid signature' }));
    return;
  }

  let payload: any;
  try {
    payload = JSON.parse(body.toString());
  } catch {
    res.writeHead(400);
    res.end(JSON.stringify({ error: 'invalid json' }));
    return;
  }

  const event = payload.event ?? payload.type ?? 'unknown';
  const data = payload.data ?? payload;
  const emoji = STATUS_EMOJI[event] ?? '📋';

  const embed = new EmbedBuilder()
    .setColor(BRAND_COLOR)
    .setTitle(`${emoji} ${event}`)
    .addFields(
      { name: 'Invoice', value: `\`${data.id ?? data.invoice_id ?? '?'}\``, inline: true },
      { name: 'Amount', value: `${data.amount ?? '?'} ${data.currency ?? ''}`, inline: true },
    )
    .setTimestamp();

  if (webhookClient) {
    await webhookClient.send({ embeds: [embed] });
  }

  res.writeHead(200, { 'Content-Type': 'application/json' });
  res.end(JSON.stringify({ ok: true }));
}

const server = createServer(async (req, res) => {
  if (req.url === '/health') {
    res.writeHead(200);
    res.end(JSON.stringify({ status: 'ok', service: 'nakopay-discord-webhook' }));
    return;
  }
  if (req.url === '/webhook') {
    await handleWebhook(req, res);
    return;
  }
  res.writeHead(404);
  res.end('Not Found');
});

server.listen(PORT, () => {
  console.log(`NakoPay Discord webhook server listening on :${PORT}`);
});

export { server };
