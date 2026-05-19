import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { CategoriesModule } from '../categories/categories.module';
import { MerchantRulesModule } from '../merchant-rules/merchant-rules.module';
import { TransactionEntity } from './transaction.entity';
import { TransactionParserService } from './transaction-parser.service';
import { TransactionsService } from './transactions.service';

@Module({
  imports: [
    TypeOrmModule.forFeature([TransactionEntity]),
    CategoriesModule,
    MerchantRulesModule,
  ],
  providers: [TransactionsService, TransactionParserService],
  exports: [TransactionsService, TransactionParserService],
})
export class TransactionsModule {}
