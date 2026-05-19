import {
  Column,
  CreateDateColumn,
  Entity,
  OneToMany,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';
import { NecessityLevel } from '../transactions/necessity-level.enum';
import { TransactionEntity } from '../transactions/transaction.entity';
import { MerchantRuleEntity } from '../merchant-rules/merchant-rule.entity';

@Entity('categories')
export class CategoryEntity {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ type: 'varchar', length: 100, unique: true })
  name: string;

  @Column({ type: 'enum', enum: NecessityLevel })
  defaultNecessityLevel: NecessityLevel;

  @OneToMany(() => TransactionEntity, (transaction) => transaction.category)
  transactions: TransactionEntity[];

  @OneToMany(() => MerchantRuleEntity, (rule) => rule.category)
  merchantRules: MerchantRuleEntity[];

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
