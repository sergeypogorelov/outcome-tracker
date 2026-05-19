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
import { NecessityLevel } from '../transactions/necessity-level.enum';

@Entity('merchant_rules')
export class MerchantRuleEntity {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ type: 'varchar', length: 255 })
  pattern: string;

  @Column()
  categoryId: number;

  @ManyToOne(() => CategoryEntity, (category) => category.merchantRules, {
    onDelete: 'CASCADE',
  })
  @JoinColumn({ name: 'categoryId' })
  category: CategoryEntity;

  @Column({ type: 'enum', enum: NecessityLevel })
  necessityLevel: NecessityLevel;

  @Column({ type: 'int', default: 100 })
  priority: number;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
