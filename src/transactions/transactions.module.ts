import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { CategoriesModule } from '../categories/categories.module';
import { MerchantRulesModule } from '../merchant-rules/merchant-rules.module';
import { TransactionEntity } from './transaction.entity';
import { TransactionsService } from './transactions.service';

@Module({
  imports: [
    TypeOrmModule.forFeature([TransactionEntity]),
    CategoriesModule,
    MerchantRulesModule,
  ],
  providers: [TransactionsService],
  exports: [TransactionsService],
})
export class TransactionsModule {}
