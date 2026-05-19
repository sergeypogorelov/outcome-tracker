import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Between, Repository } from 'typeorm';
import { TransactionEntity } from '../transactions/transaction.entity';
import { UserEntity } from '../users/user.entity';

export interface ExpenseSummary {
  year: number;
  month: number;
  totals: Record<string, number>;
  byNecessity: Record<string, Record<string, number>>;
  byCategory: Record<string, Record<string, number>>;
}

@Injectable()
export class AnalyticsService {
  constructor(
    @InjectRepository(TransactionEntity)
    private readonly transactionsRepository: Repository<TransactionEntity>,
  ) {}

  async getMonthSummary(
    user: UserEntity,
    year: number,
    month: number,
  ): Promise<ExpenseSummary> {
    const start = new Date(year, month - 1, 1);
    const end = new Date(year, month, 1);
    const transactions = await this.transactionsRepository.find({
      where: {
        userId: user.id,
        transactionDate: Between(start, end),
      },
      relations: ['category'],
      order: { transactionDate: 'ASC' },
    });

    const summary: ExpenseSummary = {
      year,
      month,
      totals: {},
      byNecessity: {},
      byCategory: {},
    };

    for (const transaction of transactions) {
      const amount = Number(transaction.amount);
      const currency = transaction.currency;
      const categoryName = transaction.category?.name ?? 'uncategorized';

      addAmount(summary.totals, currency, amount);
      addNestedAmount(summary.byNecessity, transaction.necessityLevel, currency, amount);
      addNestedAmount(summary.byCategory, categoryName, currency, amount);
    }

    return summary;
  }

  async getLastTransactions(
    user: UserEntity,
    limit = 5,
  ): Promise<TransactionEntity[]> {
    return this.transactionsRepository.find({
      where: { userId: user.id },
      relations: ['category'],
      order: { transactionDate: 'DESC', id: 'DESC' },
      take: limit,
    });
  }
}

function addAmount(target: Record<string, number>, currency: string, amount: number): void {
  target[currency] = (target[currency] ?? 0) + amount;
}

function addNestedAmount(
  target: Record<string, Record<string, number>>,
  key: string,
  currency: string,
  amount: number,
): void {
  target[key] ??= {};
  addAmount(target[key], currency, amount);
}
