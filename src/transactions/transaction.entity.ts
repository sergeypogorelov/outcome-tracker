import {
  Column,
  CreateDateColumn,
  Entity,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';
import { CategoryEntity } from '../categories/category.entity';
import { UserEntity } from '../users/user.entity';
import { NecessityLevel } from './necessity-level.enum';

@Entity('transactions')
export class TransactionEntity {
  @PrimaryGeneratedColumn()
  id: number;

  @Column()
  userId: number;

  @ManyToOne(() => UserEntity, (user) => user.transactions, {
    onDelete: 'CASCADE',
  })
  @JoinColumn({ name: 'userId' })
  user: UserEntity;

  @Column({ type: 'decimal', precision: 14, scale: 2 })
  amount: string;

  @Column({ type: 'varchar', length: 10 })
  currency: string;

  @Column({ type: 'varchar', length: 255, nullable: true })
  merchant: string | null;

  @Column({ type: 'varchar', length: 500, nullable: true })
  description: string | null;

  @Column({ type: 'text', nullable: true })
  rawMessage: string | null;

  @Column({ type: 'timestamptz' })
  transactionDate: Date;

  @Column({ nullable: true })
  categoryId: number | null;

  @ManyToOne(() => CategoryEntity, (category) => category.transactions, {
    nullable: true,
    onDelete: 'SET NULL',
  })
  @JoinColumn({ name: 'categoryId' })
  category: CategoryEntity | null;

  @Column({ type: 'enum', enum: NecessityLevel })
  necessityLevel: NecessityLevel;

  @Column({ type: 'decimal', precision: 3, scale: 2, nullable: true })
  confidence: string | null;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
