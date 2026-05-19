import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AnalyticsModule } from './analytics/analytics.module';
import { CategoryEntity } from './categories/category.entity';
import { CategoriesModule } from './categories/categories.module';
import configuration from './config/configuration';
import { MerchantRuleEntity } from './merchant-rules/merchant-rule.entity';
import { MerchantRulesModule } from './merchant-rules/merchant-rules.module';
import { TelegramModule } from './telegram/telegram.module';
import { TransactionEntity } from './transactions/transaction.entity';
import { TransactionsModule } from './transactions/transactions.module';
import { UserEntity } from './users/user.entity';
import { UsersModule } from './users/users.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      load: [configuration],
    }),
    TypeOrmModule.forRootAsync({
      useFactory: () => {
        const config = configuration();
        return {
          type: 'postgres',
          host: config.database.host,
          port: config.database.port,
          username: config.database.user,
          password: config.database.password,
          database: config.database.name,
          entities: [
            UserEntity,
            CategoryEntity,
            MerchantRuleEntity,
            TransactionEntity,
          ],
          synchronize: false,
          autoLoadEntities: true,
        };
      },
    }),
    UsersModule,
    CategoriesModule,
    MerchantRulesModule,
    TransactionsModule,
    AnalyticsModule,
    TelegramModule,
  ],
})
export class AppModule {}
