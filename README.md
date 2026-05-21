# Telegram Expense Tracker MVP

A minimal NestJS application for tracking expenses through a Telegram bot. The
user sends the text of a bank SMS, the bot parses the expense, classifies it with
merchant rules, stores the transaction in PostgreSQL, and replies with a
confirmation.

## Language Policy

- Code, code comments, documentation, commit messages, and project configuration
  text must be written in English.
- Conversation with contributors may happen in any language.
- External examples may preserve the source language when they represent real
  incoming data, such as bank SMS text used by parser fixtures.

## Features

- Receives plain text Telegram messages.
- Parses several SMS formats without being tied to one bank.
- Classifies categories and necessity levels with rules: `MUST`, `SEMI`,
  `LUXURY`.
- Uses PostgreSQL, TypeORM entities, a migration, and seed data for initial
  merchant rules.
- Supports `/summary`, `/month YYYY-MM`, `/last`, `/start`, and `/help`.
- Includes unit tests for parsing and classification.

## Quick Start

1. Install dependencies:

```bash
npm install
```

2. Start PostgreSQL:

```bash
docker compose up -d
```

3. Create `.env` from `.env.example`:

```bash
cp .env.example .env
```

4. Create a Telegram bot with BotFather and set the token in
   `TELEGRAM_BOT_TOKEN`.

5. Run migrations:

```bash
npm run migration:run
```

6. Seed initial categories and merchant rules:

```bash
npm run seed
```

7. Start the application:

```bash
npm run start:dev
```

## SMS Examples

```text
Card transaction: 1250.00 RSD at MAXI on 19.05.2026 14:32
Potrosnja karticom 1,250.00 RSD, trgovac MAXI, datum 19.05.2026 14:32
EUR 12.50 spent at Steam on 2026-05-19
Kupovina: 899 RSD; Mesto: DM; Datum: 19/05/2026 18:10
```

## Bot Commands

- `/summary` - expenses for the current month.
- `/month YYYY-MM` - expenses for the selected month.
- `/last` - the last 5 transactions.
- `/help` - command help.

## Scripts

- `npm run start:dev` - NestJS development server.
- `npm run build` - TypeScript build.
- `npm test` - Jest unit tests.
- `npm run lint` - ESLint.
- `npm run migration:generate` - generate a TypeORM migration.
- `npm run migration:run` - apply migrations.
- `npm run migration:revert` - revert the last migration.
- `npm run seed` - seed categories and merchant rules.

## MVP Limitations

- No Angular frontend.
- No OpenAI integration.
- No authentication outside Telegram.
- No transaction editing.
- No inline buttons.
- No multi-currency conversion; statistics group totals by currency.
- No production deployment.

## Extensibility

The parser is split into strategies in `TransactionParserService`, the classifier
returns a stable `TransactionClassification` contract, and the Telegram layer
only orchestrates services. This leaves room for inline confirmation, manual
category edits, merchant rule learning, an OpenAI structured-output classifier,
an Angular dashboard, and CSV export.
