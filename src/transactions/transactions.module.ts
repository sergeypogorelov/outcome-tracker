import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { CategoriesModule } from '../categories/categories.module';
import { MerchantRulesModule } from '../merchant-rules/merchant-rules.module';
import { TransactionEntity } from './transaction.entity';
import { OpenAiTransactionClassifierService } from './openai-transaction-classifier.service';
import { TransactionClassifierService } from './transaction-classifier.service';
import { TransactionParserService } from './transaction-parser.service';
import { TransactionsService } from './transactions.service';

@Module({
  imports: [
    TypeOrmModule.forFeature([TransactionEntity]),
    CategoriesModule,
    MerchantRulesModule,
  ],
  providers: [
    TransactionsService,
    TransactionParserService,
    OpenAiTransactionClassifierService,
    TransactionClassifierService,
  ],
  exports: [
    TransactionsService,
    TransactionParserService,
    TransactionClassifierService,
  ],
})
export class TransactionsModule {}
