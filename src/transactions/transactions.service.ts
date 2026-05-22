import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Between, Repository } from 'typeorm';
import { CategoryEntity } from '../categories/category.entity';
import { UserEntity } from '../users/user.entity';
import { NecessityLevel } from './necessity-level.enum';
import { TransactionEntity } from './transaction.entity';

export interface CreateTransactionInput {
  user: UserEntity;
  amount: number;
  currency: string;
  merchant: string | null;
  description: string | null;
  rawMessage: string;
  transactionDate: Date;
  category: CategoryEntity | null;
  necessityLevel: NecessityLevel;
  confidence: number;
}

export interface UpdateTransactionInput {
  category?: CategoryEntity | null;
  necessityLevel?: NecessityLevel;
  merchant?: string | null;
  amount?: number;
  transactionDate?: Date;
}

@Injectable()
export class TransactionsService {
  constructor(
    @InjectRepository(TransactionEntity)
    private readonly transactionsRepository: Repository<TransactionEntity>,
  ) {}

  async create(input: CreateTransactionInput): Promise<TransactionEntity> {
    const duplicateFingerprint = createDuplicateFingerprint(input);
    const transaction = this.transactionsRepository.create({
      userId: input.user.id,
      amount: input.amount.toFixed(2),
      currency: input.currency.toUpperCase(),
      merchant: input.merchant,
      description: input.description,
      rawMessage: input.rawMessage,
      duplicateFingerprint,
      transactionDate: input.transactionDate,
      categoryId: input.category?.id ?? null,
      category: input.category,
      necessityLevel: input.necessityLevel,
      confidence: input.confidence.toFixed(2),
    });

    return this.transactionsRepository.save(transaction);
  }

  async findLikelyDuplicate(
    input: CreateTransactionInput,
  ): Promise<TransactionEntity | null> {
    const duplicateFingerprint = createDuplicateFingerprint(input);
    const fingerprintMatch = await this.transactionsRepository.findOne({
      where: {
        userId: input.user.id,
        duplicateFingerprint,
      },
      relations: ['category'],
    });
    if (fingerprintMatch) {
      return fingerprintMatch;
    }

    const windowMs = 2 * 60 * 1000;
    const start = new Date(input.transactionDate.getTime() - windowMs);
    const end = new Date(input.transactionDate.getTime() + windowMs);
    const candidates = await this.transactionsRepository.find({
      where: {
        userId: input.user.id,
        amount: input.amount.toFixed(2),
        currency: input.currency.toUpperCase(),
        transactionDate: Between(start, end),
      },
      relations: ['category'],
    });

    const normalizedMerchant = normalizeMerchant(input.merchant);
    return (
      candidates.find(
        (transaction) =>
          normalizeMerchant(transaction.merchant) === normalizedMerchant,
      ) ?? null
    );
  }

  async findUserTransaction(
    user: UserEntity,
    id: number,
  ): Promise<TransactionEntity | null> {
    return this.transactionsRepository.findOne({
      where: { id, userId: user.id },
      relations: ['category'],
    });
  }

  async update(
    transaction: TransactionEntity,
    input: UpdateTransactionInput,
  ): Promise<TransactionEntity> {
    if (input.category !== undefined) {
      transaction.category = input.category;
      transaction.categoryId = input.category?.id ?? null;
    }
    if (input.necessityLevel !== undefined) {
      transaction.necessityLevel = input.necessityLevel;
    }
    if (input.merchant !== undefined) {
      transaction.merchant = input.merchant;
    }
    if (input.amount !== undefined) {
      transaction.amount = input.amount.toFixed(2);
    }
    if (input.transactionDate !== undefined) {
      transaction.transactionDate = input.transactionDate;
    }

    transaction.duplicateFingerprint = createDuplicateFingerprint({
      user: { id: transaction.userId } as UserEntity,
      amount: Number(transaction.amount),
      currency: transaction.currency,
      merchant: transaction.merchant,
      description: transaction.description,
      rawMessage: transaction.rawMessage ?? '',
      transactionDate: transaction.transactionDate,
      category: transaction.category,
      necessityLevel: transaction.necessityLevel,
      confidence: Number(transaction.confidence ?? 0),
    });

    return this.transactionsRepository.save(transaction);
  }
}

function createDuplicateFingerprint(input: CreateTransactionInput): string {
  const roundedTimeMs =
    Math.floor(input.transactionDate.getTime() / (2 * 60 * 1000)) *
    2 *
    60 *
    1000;
  return [
    input.user.id,
    input.amount.toFixed(2),
    input.currency.toUpperCase(),
    normalizeMerchant(input.merchant),
    new Date(roundedTimeMs).toISOString(),
  ].join('|');
}

function normalizeMerchant(value: string | null): string {
  return (value ?? 'unknown').trim().replace(/\s+/g, ' ').toUpperCase();
}
