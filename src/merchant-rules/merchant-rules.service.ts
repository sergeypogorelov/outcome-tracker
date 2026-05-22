import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { CategoryEntity } from '../categories/category.entity';
import { NecessityLevel } from '../transactions/necessity-level.enum';
import { MerchantRuleEntity } from './merchant-rule.entity';

@Injectable()
export class MerchantRulesService {
  constructor(
    @InjectRepository(MerchantRuleEntity)
    private readonly rulesRepository: Repository<MerchantRuleEntity>,
  ) {}

  findAllOrdered(): Promise<MerchantRuleEntity[]> {
    return this.rulesRepository.find({
      relations: ['category'],
      order: { priority: 'ASC', id: 'ASC' },
    });
  }

  findByPattern(pattern: string): Promise<MerchantRuleEntity | null> {
    return this.rulesRepository.findOne({
      where: { pattern },
      relations: ['category'],
    });
  }

  async createIfMissing(input: {
    pattern: string;
    category: CategoryEntity;
    necessityLevel: NecessityLevel;
    priority: number;
  }): Promise<MerchantRuleEntity> {
    const existing = await this.findByPattern(input.pattern);
    if (existing) {
      return existing;
    }

    return this.rulesRepository.save(
      this.rulesRepository.create({
        pattern: input.pattern,
        categoryId: input.category.id,
        category: input.category,
        necessityLevel: input.necessityLevel,
        priority: input.priority,
      }),
    );
  }
}
