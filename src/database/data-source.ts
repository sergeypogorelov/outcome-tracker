import 'reflect-metadata';
import { DataSource } from 'typeorm';
import configuration from '../config/configuration';
import { CategoryEntity } from '../categories/category.entity';
import { MerchantRuleEntity } from '../merchant-rules/merchant-rule.entity';
import { TransactionEntity } from '../transactions/transaction.entity';
import { UserEntity } from '../users/user.entity';

const config = configuration();

export default new DataSource({
  type: 'postgres',
  host: config.database.host,
  port: config.database.port,
  username: config.database.user,
  password: config.database.password,
  database: config.database.name,
  entities: [UserEntity, CategoryEntity, MerchantRuleEntity, TransactionEntity],
  migrations: ['src/database/migrations/*.ts'],
  synchronize: false,
});
