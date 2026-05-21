import { Injectable, Logger, OnModuleDestroy, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Context, Telegraf } from 'telegraf';
import { AnalyticsService, ExpenseSummary } from '../analytics/analytics.service';
import { CategoriesService } from '../categories/categories.service';
import {
  TransactionClassifierService,
  TransactionClassification,
} from '../transactions/transaction-classifier.service';
import {
  ParsedTransaction,
  TransactionParserService,
} from '../transactions/transaction-parser.service';
import { TransactionsService } from '../transactions/transactions.service';
import { UsersService } from '../users/users.service';

@Injectable()
export class TelegramService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(TelegramService.name);
  private bot: Telegraf<Context> | null = null;
  private launchRetryTimer: ReturnType<typeof setTimeout> | null = null;
  private readonly unauthorizedReply =
    'Access denied. This bot is restricted to approved Telegram users.';

  constructor(
    private readonly configService: ConfigService,
    private readonly usersService: UsersService,
    private readonly parserService: TransactionParserService,
    private readonly classifierService: TransactionClassifierService,
    private readonly categoriesService: CategoriesService,
    private readonly transactionsService: TransactionsService,
    private readonly analyticsService: AnalyticsService,
  ) {}

  async onModuleInit(): Promise<void> {
    const token = this.configService.get<string>('telegram.botToken');
    if (!token || token === 'replace_me') {
      this.logger.warn('TELEGRAM_BOT_TOKEN is empty. Telegram bot is disabled.');
      return;
    }

    this.bot = new Telegraf(token);
    this.registerHandlers(this.bot);
    this.launchBot();
  }

  onModuleDestroy(): void {
    if (this.launchRetryTimer) {
      clearTimeout(this.launchRetryTimer);
    }

    this.bot?.stop('NestJS shutdown');
  }

  private launchBot(): void {
    if (!this.bot) {
      return;
    }

    void this.bot
      .launch()
      .then(() => {
        this.logger.log('Telegram bot started');
      })
      .catch((error: unknown) => {
        const message = error instanceof Error ? error.message : String(error);
        this.logger.error(`Failed to start Telegram bot: ${message}`);
        this.launchRetryTimer = setTimeout(() => this.launchBot(), 15_000);
      });
  }

  private registerHandlers(bot: Telegraf<Context>): void {
    bot.use(async (ctx, next) => {
      if (!this.isAllowedUser(ctx)) {
        const telegramId = ctx.from?.id;
        this.logger.warn(`Rejected Telegram user: ${telegramId ?? 'unknown'}`);

        if (ctx.from) {
          await ctx.reply(this.unauthorizedReply);
        }

        return;
      }

      await next();
    });

    bot.start(async (ctx) => {
      await ctx.reply(
        'Hi! Send me a bank SMS about an expense, and I will detect the amount, merchant, category, and save the transaction.\n\nCommands: /summary, /month YYYY-MM, /last, /help',
      );
    });

    bot.help(async (ctx) => {
      await ctx.reply(
        [
          'Available commands:',
          '/summary - expenses for the current month',
          '/month YYYY-MM - expenses for the selected month',
          '/last - the last 5 transactions',
          '',
          'To record an expense, send the full SMS text.',
        ].join('\n'),
      );
    });

    bot.command('summary', async (ctx) => {
      await this.handleSummaryCommand(ctx);
    });

    bot.command('month', async (ctx) => {
      const [, value] = ctx.message.text.trim().split(/\s+/, 2);
      const parsed = parseYearMonth(value);
      if (!parsed) {
        await ctx.reply('Command format: /month YYYY-MM');
        return;
      }

      await this.handleSummaryCommand(ctx, parsed.year, parsed.month);
    });

    bot.command('last', async (ctx) => {
      await this.handleLastCommand(ctx);
    });

    bot.on('text', async (ctx) => {
      const text = ctx.message.text;
      if (text.startsWith('/')) {
        await ctx.reply('Unknown command. Send /help.');
        return;
      }

      await this.handleTransactionMessage(ctx, text);
    });
  }

  private isAllowedUser(ctx: Context): boolean {
    const allowedUserIds =
      this.configService.get<string[]>('telegram.allowedUserIds') ?? [];

    if (allowedUserIds.length === 0) {
      return true;
    }

    return ctx.from ? allowedUserIds.includes(String(ctx.from.id)) : false;
  }

  private async handleTransactionMessage(
    ctx: Context,
    text: string,
  ): Promise<void> {
    const parsed = this.parserService.parse(text);
    if (!parsed) {
      await ctx.reply(
        'I could not recognize a transaction. Try sending the full SMS text.',
      );
      return;
    }

    if (!ctx.from) {
      await ctx.reply('I could not identify the Telegram user.');
      return;
    }

    const user = await this.usersService.findOrCreateTelegramUser({
      telegramId: String(ctx.from.id),
      username: ctx.from.username ?? null,
      firstName: ctx.from.first_name ?? null,
    });

    const classification = await this.classifierService.classify(parsed);
    const category = await this.categoriesService.findByName(
      classification.categoryName,
    );

    await this.transactionsService.create({
      user,
      amount: parsed.amount,
      currency: parsed.currency,
      merchant: parsed.merchant,
      description: parsed.description,
      rawMessage: parsed.rawMessage,
      transactionDate: parsed.transactionDate,
      category,
      necessityLevel: classification.necessityLevel,
      confidence: classification.confidence,
    });

    await ctx.reply(formatTransactionConfirmation(parsed, classification));
  }

  private async handleSummaryCommand(
    ctx: Context,
    year = new Date().getFullYear(),
    month = new Date().getMonth() + 1,
  ): Promise<void> {
    const user = await this.resolveTelegramUser(ctx);
    if (!user) {
      await ctx.reply('I could not identify the Telegram user.');
      return;
    }

    const summary = await this.analyticsService.getMonthSummary(user, year, month);
    await ctx.reply(formatSummary(summary));
  }

  private async handleLastCommand(ctx: Context): Promise<void> {
    const user = await this.resolveTelegramUser(ctx);
    if (!user) {
      await ctx.reply('I could not identify the Telegram user.');
      return;
    }

    const transactions = await this.analyticsService.getLastTransactions(user, 5);
    if (transactions.length === 0) {
      await ctx.reply('There are no recorded transactions yet.');
      return;
    }

    await ctx.reply(
      transactions
        .map((transaction) => {
          const amount = formatMoney(Number(transaction.amount), transaction.currency);
          const date = transaction.transactionDate.toISOString().slice(0, 10);
          return `${date} | ${amount} | ${
            transaction.merchant ?? 'unknown'
          } | ${transaction.category?.name ?? 'uncategorized'} | ${
            transaction.necessityLevel
          }`;
        })
        .join('\n'),
    );
  }

  private async resolveTelegramUser(ctx: Context) {
    if (!ctx.from) {
      return null;
    }

    return this.usersService.findOrCreateTelegramUser({
      telegramId: String(ctx.from.id),
      username: ctx.from.username ?? null,
      firstName: ctx.from.first_name ?? null,
    });
  }
}

function formatTransactionConfirmation(
  transaction: ParsedTransaction,
  classification: TransactionClassification,
): string {
  const amount = new Intl.NumberFormat('en-US', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(transaction.amount);
  const date = transaction.transactionDate.toISOString().slice(0, 10);
  const merchant = transaction.merchant ?? 'unknown';

  return `Expense recorded: ${amount} ${transaction.currency} | ${merchant} | ${classification.categoryName} | ${classification.necessityLevel} | ${date}`;
}

function parseYearMonth(
  value: string | undefined,
): { year: number; month: number } | null {
  const match = value?.match(/^(\d{4})-(\d{2})$/);
  if (!match) {
    return null;
  }

  const year = Number(match[1]);
  const month = Number(match[2]);
  if (month < 1 || month > 12) {
    return null;
  }

  return { year, month };
}

function formatSummary(summary: ExpenseSummary): string {
  const monthName = new Intl.DateTimeFormat('en-US', {
    month: 'long',
    year: 'numeric',
  }).format(new Date(summary.year, summary.month - 1, 1));

  const lines = [`Expenses for ${monthName}:`];
  lines.push(`Total: ${formatMoneyMap(summary.totals)}`);
  lines.push('');
  lines.push(...formatNestedMoneyMap(summary.byNecessity));
  lines.push('');
  lines.push('By category:');
  lines.push(...formatNestedMoneyMap(summary.byCategory));

  return lines
    .filter((line, index, all) => {
      return line !== '' || (all[index - 1] !== '' && all[index + 1] !== '');
    })
    .join('\n');
}

function formatNestedMoneyMap(
  values: Record<string, Record<string, number>>,
): string[] {
  const entries = Object.entries(values);
  if (entries.length === 0) {
    return ['No expenses.'];
  }

  return entries.map(([key, totals]) => `${key}: ${formatMoneyMap(totals)}`);
}

function formatMoneyMap(values: Record<string, number>): string {
  const entries = Object.entries(values);
  if (entries.length === 0) {
    return '0';
  }

  return entries.map(([currency, amount]) => formatMoney(amount, currency)).join(', ');
}

function formatMoney(amount: number, currency: string): string {
  return `${new Intl.NumberFormat('en-US', {
    maximumFractionDigits: 2,
    minimumFractionDigits: 0,
  }).format(amount)} ${currency}`;
}
