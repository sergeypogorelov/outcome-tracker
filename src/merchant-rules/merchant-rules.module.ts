import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { MerchantRuleEntity } from './merchant-rule.entity';
import { MerchantRulesService } from './merchant-rules.service';

@Module({
  imports: [TypeOrmModule.forFeature([MerchantRuleEntity])],
  providers: [MerchantRulesService],
  exports: [MerchantRulesService, TypeOrmModule],
})
export class MerchantRulesModule {}
