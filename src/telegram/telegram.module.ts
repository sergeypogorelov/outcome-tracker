import { Module } from '@nestjs/common';
import { CategoriesModule } from '../categories/categories.module';
import { TransactionsModule } from '../transactions/transactions.module';
import { UsersModule } from '../users/users.module';
import { TelegramService } from './telegram.service';

@Module({
  imports: [UsersModule, TransactionsModule, CategoriesModule],
  providers: [TelegramService],
})
export class TelegramModule {}
