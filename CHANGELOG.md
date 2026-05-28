# Changelog
## 1.1.0 - 2026-05-17

### Changed
- Default NAKOPAY_API_BASE env fallback is now https://api.nakopay.com/v1 (branded). Override via env var as before.

## [1.0.0] - 2026-05-01

### Added
- Slash commands: /invoice, /tip, /balance, /rates, /last, /help
- Rich embed responses with NakoPay brand orange
- Webhook server for real-time payment notifications
- HMAC-SHA256 webhook signature verification
- Command registration script
- Docker support
