# NakoPay Discord Bot

Accept crypto payments and manage invoices directly from Discord with slash commands.

## Features

- **/invoice** - Create payable invoices with amount, currency, and description
- **/tip** - Generate shareable tip links
- **/balance** - Check wallet balances (ephemeral, private)
- **/rates** - Live exchange rates
- **/last** - View recent invoices (ephemeral, private)
- **Webhook notifications** - Real-time payment alerts as rich embeds

## Setup

### 1. Create a Discord Application

1. Go to [Discord Developer Portal](https://discord.com/developers/applications)
2. Create a new application
3. Go to **Bot** tab, create a bot, copy the token
4. Go to **OAuth2 > URL Generator**, select `bot` + `applications.commands` scopes
5. Select permissions: Send Messages, Embed Links, Attach Files
6. Use the generated URL to invite the bot to your server

### 2. Environment Variables

```bash
cp .env.example .env
```

| Variable | Required | Description |
|----------|----------|-------------|
| `DISCORD_BOT_TOKEN` | Yes | Bot token from Developer Portal |
| `DISCORD_CLIENT_ID` | Yes | Application ID from Developer Portal |
| `NAKOPAY_API_KEY` | Yes | Your `sk_live_*` or `sk_test_*` key from nakopay.com/dashboard/api-keys |
| `NAKOPAY_API_BASE` | No | API base URL (defaults to Supabase edge functions) |
| `DISCORD_WEBHOOK_URL` | No | Discord webhook URL for payment notifications |
| `NAKOPAY_WEBHOOK_SECRET` | No | HMAC secret for verifying NakoPay webhooks |
| `WEBHOOK_PORT` | No | Port for webhook server (default: 8444) |

### 3. Register Commands

```bash
npm install
npx tsx src/register.ts
```

### 4. Run

```bash
npm start          # production
npm run dev        # development with hot reload
```

### 5. Webhook Notifications (Optional)

Run the webhook server to receive real-time payment notifications:

```bash
npx tsx src/webhook-server.ts
```

Configure your NakoPay webhook URL to point to `https://your-server:8444/webhook`.

## Docker

```dockerfile
FROM node:20-alpine
WORKDIR /app
COPY package*.json ./
RUN npm ci --omit=dev
COPY dist/ ./dist/
CMD ["node", "dist/index.js"]
```

## Links

- [NakoPay Website](https://nakopay.com)
- [Documentation](https://nakopay.com/docs)
- [Integration Guide](https://nakopay.com/integrations/discord)
- [API Reference](https://nakopay.com/docs/api-reference)

## License

MIT
