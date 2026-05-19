import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
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
}
