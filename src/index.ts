/**
 * NakoPay Discord Bot v1.0.0
 *
 * Slash commands: /invoice, /tip, /balance, /rates, /last, /help
 * Webhook listener for real-time payment notifications.
 */
import {
  Client,
  GatewayIntentBits,
  EmbedBuilder,
  type ChatInputCommandInteraction,
} from 'discord.js';

// ---------------------------------------------------------------------------
// Config
// ---------------------------------------------------------------------------
const DISCORD_TOKEN = process.env.DISCORD_BOT_TOKEN ?? '';
const NAKOPAY_API_KEY = process.env.NAKOPAY_API_KEY ?? '';
const NAKOPAY_API_BASE =
  process.env.NAKOPAY_API_BASE ??
  'https://daslrxpkbkqrbnjwouiq.supabase.co/functions/v1';
const BRAND_COLOR = 0xea6828; // NakoPay orange

if (!DISCORD_TOKEN) throw new Error('DISCORD_BOT_TOKEN is required');
if (!NAKOPAY_API_KEY) throw new Error('NAKOPAY_API_KEY is required');

// ---------------------------------------------------------------------------
// Minimal API client (avoids importing full SDK in bot runtime)
// ---------------------------------------------------------------------------
async function api(
  method: string,
  path: string,
  body?: Record<string, unknown>,
): Promise<any> {
  const headers: Record<string, string> = {
    Authorization: `Bearer ${NAKOPAY_API_KEY}`,
    'Content-Type': 'application/json',
    'User-Agent': 'nakopay-discord/1.0.0',
    'X-NakoPay-Version': '2025-04-20',
  };
  if (method === 'POST') {
    headers['Idempotency-Key'] = `idem_${crypto.randomUUID().replace(/-/g, '')}`;
  }
  const res = await fetch(`${NAKOPAY_API_BASE}${path}`, {
    method,
    headers,
    body: body ? JSON.stringify(body) : undefined,
  });
  if (!res.ok) {
    const text = await res.text();
    throw new Error(`NakoPay API ${res.status}: ${text}`);
  }
  if (res.status === 204) return null;
  return res.json();
}

// ---------------------------------------------------------------------------
// Command handlers
// ---------------------------------------------------------------------------
async function handleInvoice(interaction: ChatInputCommandInteraction) {
  await interaction.deferReply();
  const amount = interaction.options.getNumber('amount', true);
  const currency = interaction.options.getString('currency', true).toUpperCase();
  const description = interaction.options.getString('description');

  const result = await api('POST', '/payment-links', {
    amount,
    currency,
    ...(description ? { description } : {}),
  });

  const url = result.url ?? result.checkout_url ?? result.hosted_url;
  const embed = new EmbedBuilder()
    .setColor(BRAND_COLOR)
    .setTitle('Invoice Created')
    .addFields(
      { name: 'Amount', value: `${amount} ${currency}`, inline: true },
      { name: 'ID', value: `\`${result.id ?? 'N/A'}\``, inline: true },
    )
    .setTimestamp();

  if (description) embed.setDescription(description);
  if (url) embed.setURL(url).addFields({ name: 'Pay', value: url });

  await interaction.editReply({ embeds: [embed] });
}

async function handleTip(interaction: ChatInputCommandInteraction) {
  await interaction.deferReply();
  const amount = interaction.options.getNumber('amount', true);
  const currency = interaction.options.getString('currency', true).toUpperCase();
  const message = interaction.options.getString('message') ?? 'Tip';

  const result = await api('POST', '/payment-links', {
    amount,
    currency,
    description: `[Tip] ${message}`,
  });

  const url = result.url ?? result.checkout_url ?? result.hosted_url;
  const embed = new EmbedBuilder()
    .setColor(BRAND_COLOR)
    .setTitle('Tip Link')
    .setDescription(message)
    .addFields({ name: 'Amount', value: `${amount} ${currency}`, inline: true })
    .setTimestamp();
  if (url) embed.addFields({ name: 'Link', value: url });

  await interaction.editReply({ embeds: [embed] });
}

async function handleBalance(interaction: ChatInputCommandInteraction) {
  await interaction.deferReply({ ephemeral: true });
  const data = await api('GET', '/balance');
  const items = Array.isArray(data)
    ? data
    : data?.data ?? data?.balances ?? [data];

  const lines = items.map(
    (b: any) =>
      `**${b.currency ?? b.coin ?? '?'}**: ${b.available ?? b.balance ?? b.amount ?? 0}`,
  );

  const embed = new EmbedBuilder()
    .setColor(BRAND_COLOR)
    .setTitle('Wallet Balances')
    .setDescription(lines.join('\n') || 'No balances')
    .setTimestamp();

  await interaction.editReply({ embeds: [embed] });
}

async function handleRates(interaction: ChatInputCommandInteraction) {
  await interaction.deferReply();
  const currency = (
    interaction.options.getString('currency') ?? 'USD'
  ).toUpperCase();
  const data = await api('GET', `/rates?currency=${currency}`);
  const items = Array.isArray(data) ? data : data?.data ?? [data];

  const lines = items.slice(0, 10).map(
    (r: any) =>
      `**${r.coin ?? r.currency ?? '?'}**: ${r.rate ?? r.price ?? '?'} ${currency}`,
  );

  const embed = new EmbedBuilder()
    .setColor(BRAND_COLOR)
    .setTitle(`Exchange Rates (${currency})`)
    .setDescription(lines.join('\n') || 'No data')
    .setTimestamp();

  await interaction.editReply({ embeds: [embed] });
}

async function handleLast(interaction: ChatInputCommandInteraction) {
  await interaction.deferReply({ ephemeral: true });
  const count = interaction.options.getInteger('count') ?? 5;
  const data = await api('GET', `/invoices-list?limit=${count}`);
  const invoices = Array.isArray(data) ? data : data?.data ?? [];

  const statusEmoji: Record<string, string> = {
    paid: '✅',
    expired: '⏰',
    pending: '⏳',
    canceled: '❌',
  };

  const lines = invoices.map(
    (inv: any) =>
      `${statusEmoji[inv.status] ?? '❓'} \`${inv.id}\` ${inv.amount} ${inv.currency ?? ''} - ${inv.status}`,
  );

  const embed = new EmbedBuilder()
    .setColor(BRAND_COLOR)
    .setTitle(`Last ${invoices.length} Invoices`)
    .setDescription(lines.join('\n') || 'No invoices')
    .setTimestamp();

  await interaction.editReply({ embeds: [embed] });
}

async function handleHelp(interaction: ChatInputCommandInteraction) {
  const embed = new EmbedBuilder()
    .setColor(BRAND_COLOR)
    .setTitle('NakoPay Bot')
    .setDescription(
      'Accept crypto payments directly in Discord.\n\n' +
        '**/invoice** - Create a payable invoice\n' +
        '**/tip** - Create a tip link\n' +
        '**/balance** - Show wallet balances\n' +
        '**/rates** - Live exchange rates\n' +
        '**/last** - Recent invoices\n' +
        '**/help** - This message',
    )
    .setFooter({ text: 'nakopay.com' });

  await interaction.reply({ embeds: [embed], ephemeral: true });
}

// ---------------------------------------------------------------------------
// Bot setup
// ---------------------------------------------------------------------------
const client = new Client({ intents: [GatewayIntentBits.Guilds] });

client.once('ready', () => {
  console.log(`NakoPay Discord bot online as ${client.user?.tag}`);
});

client.on('interactionCreate', async (interaction) => {
  if (!interaction.isChatInputCommand()) return;

  try {
    switch (interaction.commandName) {
      case 'invoice':
        await handleInvoice(interaction);
        break;
      case 'tip':
        await handleTip(interaction);
        break;
      case 'balance':
        await handleBalance(interaction);
        break;
      case 'rates':
        await handleRates(interaction);
        break;
      case 'last':
        await handleLast(interaction);
        break;
      case 'help':
        await handleHelp(interaction);
        break;
    }
  } catch (err: any) {
    const msg = `Error: ${err.message ?? err}`;
    if (interaction.deferred || interaction.replied) {
      await interaction.editReply(msg);
    } else {
      await interaction.reply({ content: msg, ephemeral: true });
    }
  }
});

client.login(DISCORD_TOKEN);

export { client };
