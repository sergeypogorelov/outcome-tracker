import { Injectable, Logger, OnModuleDestroy, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Context, Telegraf } from 'telegraf';
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

  constructor(
    private readonly configService: ConfigService,
    private readonly usersService: UsersService,
    private readonly parserService: TransactionParserService,
    private readonly classifierService: TransactionClassifierService,
    private readonly categoriesService: CategoriesService,
    private readonly transactionsService: TransactionsService,
  ) {}

  async onModuleInit(): Promise<void> {
    const token = this.configService.get<string>('telegram.botToken');
    if (!token || token === 'replace_me') {
      this.logger.warn('TELEGRAM_BOT_TOKEN is empty. Telegram bot is disabled.');
      return;
    }

    this.bot = new Telegraf(token);
    this.registerHandlers(this.bot);
    await this.bot.launch();
    this.logger.log('Telegram bot started');
  }

  onModuleDestroy(): void {
    this.bot?.stop('NestJS shutdown');
  }

  private registerHandlers(bot: Telegraf<Context>): void {
    bot.start(async (ctx) => {
      await ctx.reply(
        'Привет! Пришли банковскую SMS о расходе, а я распознаю сумму, магазин, категорию и сохраню транзакцию.\n\nКоманды: /summary, /month YYYY-MM, /last, /help',
      );
    });

    bot.help(async (ctx) => {
      await ctx.reply(
        [
          'Доступные команды:',
          '/summary - расходы за текущий месяц',
          '/month YYYY-MM - расходы за выбранный месяц',
          '/last - последние 5 транзакций',
          '',
          'Для записи расхода просто отправь SMS целиком.',
        ].join('\n'),
      );
    });

    bot.on('text', async (ctx) => {
      const text = ctx.message.text;
      if (text.startsWith('/')) {
        await ctx.reply('Неизвестная команда. Напиши /help.');
        return;
      }

      await this.handleTransactionMessage(ctx, text);
    });
  }

  private async handleTransactionMessage(ctx: Context, text: string): Promise<void> {
    const parsed = this.parserService.parse(text);
    if (!parsed) {
      await ctx.reply(
        'Не смог распознать транзакцию. Попробуй отправить SMS целиком.',
      );
      return;
    }

    if (!ctx.from) {
      await ctx.reply('Не смог определить Telegram пользователя.');
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

  return `Записал расход: ${amount} ${transaction.currency} · ${merchant} · ${classification.categoryName} · ${classification.necessityLevel} · ${date}`;
}
