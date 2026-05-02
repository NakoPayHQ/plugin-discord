/**
 * Register slash commands for the NakoPay Discord bot.
 *
 * Run once: `npx tsx src/register.ts`
 * Requires DISCORD_BOT_TOKEN and DISCORD_CLIENT_ID env vars.
 */
import { REST, Routes, SlashCommandBuilder } from 'discord.js';

const TOKEN = process.env.DISCORD_BOT_TOKEN ?? '';
const CLIENT_ID = process.env.DISCORD_CLIENT_ID ?? '';

if (!TOKEN || !CLIENT_ID) {
  console.error('Set DISCORD_BOT_TOKEN and DISCORD_CLIENT_ID');
  process.exit(1);
}

const commands = [
  new SlashCommandBuilder()
    .setName('invoice')
    .setDescription('Create a payable NakoPay invoice')
    .addNumberOption((o) =>
      o.setName('amount').setDescription('Payment amount').setRequired(true),
    )
    .addStringOption((o) =>
      o.setName('currency').setDescription('Currency code (USD, BTC, etc.)').setRequired(true),
    )
    .addStringOption((o) =>
      o.setName('description').setDescription('Invoice description'),
    ),

  new SlashCommandBuilder()
    .setName('tip')
    .setDescription('Create a shareable tip link')
    .addNumberOption((o) =>
      o.setName('amount').setDescription('Tip amount').setRequired(true),
    )
    .addStringOption((o) =>
      o.setName('currency').setDescription('Currency code').setRequired(true),
    )
    .addStringOption((o) =>
      o.setName('message').setDescription('Tip message'),
    ),

  new SlashCommandBuilder()
    .setName('balance')
    .setDescription('Show your wallet balances'),

  new SlashCommandBuilder()
    .setName('rates')
    .setDescription('Live exchange rates')
    .addStringOption((o) =>
      o.setName('currency').setDescription('Base currency (default: USD)'),
    ),

  new SlashCommandBuilder()
    .setName('last')
    .setDescription('Show recent invoices')
    .addIntegerOption((o) =>
      o
        .setName('count')
        .setDescription('Number of invoices (1-20)')
        .setMinValue(1)
        .setMaxValue(20),
    ),

  new SlashCommandBuilder()
    .setName('help')
    .setDescription('Show NakoPay bot commands'),
].map((c) => c.toJSON());

const rest = new REST().setToken(TOKEN);

(async () => {
  console.log('Registering slash commands...');
  await rest.put(Routes.applicationCommands(CLIENT_ID), { body: commands });
  console.log('Done - commands registered globally.');
})();
