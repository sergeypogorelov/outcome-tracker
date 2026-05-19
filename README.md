# Telegram Expense Tracker MVP

Минимальное NestJS-приложение для учета расходов через Telegram-бота. Пользователь отправляет текст банковской SMS, бот парсит расход, классифицирует merchant rule-based правилами, сохраняет транзакцию в PostgreSQL и отвечает подтверждением.

## Возможности

- Прием обычных текстовых сообщений Telegram.
- Парсинг нескольких SMS-форматов без привязки к одному банку.
- Rule-based классификация категорий и необходимости: `MUST`, `SEMI`, `LUXURY`.
- PostgreSQL + TypeORM entities, миграция и seed начальных правил.
- Команды `/summary`, `/month YYYY-MM`, `/last`, `/start`, `/help`.
- Unit-тесты парсинга и классификации.

## Быстрый запуск

1. Установить зависимости:

```bash
npm install
```

2. Запустить PostgreSQL:

```bash
docker compose up -d
```

3. Создать `.env` на базе `.env.example`:

```bash
cp .env.example .env
```

4. Создать Telegram-бота через BotFather и вставить токен в `TELEGRAM_BOT_TOKEN`.

5. Применить миграции:

```bash
npm run migration:run
```

6. Добавить начальные категории и merchant rules:

```bash
npm run seed
```

7. Запустить приложение:

```bash
npm run start:dev
```

## Примеры SMS

```text
Card transaction: 1250.00 RSD at MAXI on 19.05.2026 14:32
Potrosnja karticom 1,250.00 RSD, trgovac MAXI, datum 19.05.2026 14:32
EUR 12.50 spent at Steam on 2026-05-19
Kupovina: 899 RSD; Mesto: DM; Datum: 19/05/2026 18:10
```

## Команды бота

- `/summary` - расходы за текущий месяц.
- `/month YYYY-MM` - расходы за выбранный месяц.
- `/last` - последние 5 транзакций.
- `/help` - справка.

## Скрипты

- `npm run start:dev` - dev-server NestJS.
- `npm run build` - сборка TypeScript.
- `npm test` - unit-тесты Jest.
- `npm run lint` - ESLint.
- `npm run migration:generate` - генерация миграции TypeORM.
- `npm run migration:run` - применение миграций.
- `npm run migration:revert` - откат последней миграции.
- `npm run seed` - seed категорий и правил.

## Ограничения MVP

- Нет Angular frontend.
- Нет OpenAI integration.
- Нет авторизации вне Telegram.
- Нет редактирования транзакций.
- Нет inline buttons.
- Нет multi-currency conversion, статистика группирует суммы по валютам.
- Нет production deployment.

## Расширяемость

Парсер разбит на стратегии в `TransactionParserService`, классификатор возвращает стабильный контракт `TransactionClassification`, а Telegram-слой только оркестрирует сервисы. Это оставляет место для inline confirmation, ручной правки категорий, обучения merchant rules, OpenAI structured output classifier, Angular dashboard и CSV export.
