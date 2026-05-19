import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
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

@Injectable()
export class TransactionsService {
  constructor(
    @InjectRepository(TransactionEntity)
    private readonly transactionsRepository: Repository<TransactionEntity>,
  ) {}

  async create(input: CreateTransactionInput): Promise<TransactionEntity> {
    const transaction = this.transactionsRepository.create({
      userId: input.user.id,
      amount: input.amount.toFixed(2),
      currency: input.currency.toUpperCase(),
      merchant: input.merchant,
      description: input.description,
      rawMessage: input.rawMessage,
      transactionDate: input.transactionDate,
      categoryId: input.category?.id ?? null,
      category: input.category,
      necessityLevel: input.necessityLevel,
      confidence: input.confidence.toFixed(2),
    });

    return this.transactionsRepository.save(transaction);
  }
}
