import { Injectable } from '@nestjs/common';

export interface ParsedTransaction {
  amount: number;
  currency: string;
  merchant: string | null;
  description: string | null;
  transactionDate: Date;
  rawMessage: string;
}

interface ParserStrategy {
  parse(message: string): ParsedTransaction | null;
}

@Injectable()
export class TransactionParserService {
  private readonly strategies: ParserStrategy[] = [
    new CardTransactionStrategy(),
    new SerbianCardTransactionStrategy(),
    new CurrencyFirstSpentStrategy(),
    new SerbianPurchaseStrategy(),
  ];

  parse(message: string): ParsedTransaction | null {
    const normalized = message.trim();
    if (!normalized) {
      return null;
    }

    for (const strategy of this.strategies) {
      const result = strategy.parse(normalized);
      if (result) {
        return result;
      }
    }

    return null;
  }
}

class CardTransactionStrategy implements ParserStrategy {
  parse(message: string): ParsedTransaction | null {
    const match = message.match(
      /card transaction:\s*(?<amount>[\d.,]+)\s*(?<currency>[A-Z]{3})\s+at\s+(?<merchant>.+?)\s+on\s+(?<date>\d{2}\.\d{2}\.\d{4})(?:\s+(?<time>\d{2}:\d{2}))?/i,
    );
    if (!match?.groups) {
      return null;
    }

    return buildParsed(message, match.groups);
  }
}

class SerbianCardTransactionStrategy implements ParserStrategy {
  parse(message: string): ParsedTransaction | null {
    const match = message.match(
      /potrosnja karticom\s+(?<amount>[\d.,]+)\s*(?<currency>[A-Z]{3}),?\s+trgovac\s+(?<merchant>.+?),\s+datum\s+(?<date>\d{2}\.\d{2}\.\d{4})(?:\s+(?<time>\d{2}:\d{2}))?/i,
    );
    if (!match?.groups) {
      return null;
    }

    return buildParsed(message, match.groups);
  }
}

class CurrencyFirstSpentStrategy implements ParserStrategy {
  parse(message: string): ParsedTransaction | null {
    const match = message.match(
      /(?<currency>[A-Z]{3})\s+(?<amount>[\d.,]+)\s+spent\s+at\s+(?<merchant>.+?)\s+on\s+(?<date>\d{4}-\d{2}-\d{2})(?:\s+(?<time>\d{2}:\d{2}))?/i,
    );
    if (!match?.groups) {
      return null;
    }

    return buildParsed(message, match.groups);
  }
}

class SerbianPurchaseStrategy implements ParserStrategy {
  parse(message: string): ParsedTransaction | null {
    const match = message.match(
      /kupovina:\s*(?<amount>[\d.,]+)\s*(?<currency>[A-Z]{3});\s*mesto:\s*(?<merchant>.+?);\s*datum:\s*(?<date>\d{2}\/\d{2}\/\d{4})(?:\s+(?<time>\d{2}:\d{2}))?/i,
    );
    if (!match?.groups) {
      return null;
    }

    return buildParsed(message, match.groups);
  }
}

function buildParsed(
  rawMessage: string,
  groups: Record<string, string | undefined>,
): ParsedTransaction | null {
  const amount = parseAmount(groups.amount ?? '');
  const currency = groups.currency?.toUpperCase();
  const date = parseDate(groups.date ?? '', groups.time);
  const merchant = cleanMerchant(groups.merchant ?? '');

  if (!amount || !currency || !date) {
    return null;
  }

  return {
    amount,
    currency,
    merchant,
    description: merchant,
    transactionDate: date,
    rawMessage,
  };
}

function parseAmount(value: string): number | null {
  const normalized = value.includes(',') && value.includes('.')
    ? value.replace(/,/g, '')
    : value.replace(',', '.');
  const amount = Number(normalized);
  return Number.isFinite(amount) && amount > 0 ? amount : null;
}

function parseDate(date: string, time = '00:00'): Date | null {
  const isoMatch = date.match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (isoMatch) {
    return buildDate(isoMatch[1], isoMatch[2], isoMatch[3], time);
  }

  const dottedMatch = date.match(/^(\d{2})\.(\d{2})\.(\d{4})$/);
  if (dottedMatch) {
    return buildDate(dottedMatch[3], dottedMatch[2], dottedMatch[1], time);
  }

  const slashMatch = date.match(/^(\d{2})\/(\d{2})\/(\d{4})$/);
  if (slashMatch) {
    return buildDate(slashMatch[3], slashMatch[2], slashMatch[1], time);
  }

  return null;
}

function buildDate(
  year: string,
  month: string,
  day: string,
  time: string,
): Date | null {
  const [hour = '00', minute = '00'] = time.split(':');
  const value = new Date(
    Number(year),
    Number(month) - 1,
    Number(day),
    Number(hour),
    Number(minute),
  );
  return Number.isNaN(value.getTime()) ? null : value;
}

function cleanMerchant(value: string): string | null {
  const merchant = value.trim().replace(/\s+/g, ' ');
  return merchant.length > 0 ? merchant : null;
}
