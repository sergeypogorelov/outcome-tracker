import { Injectable } from '@nestjs/common';
import { MerchantRulesService } from '../merchant-rules/merchant-rules.service';
import { NecessityLevel } from './necessity-level.enum';
import { ParsedTransaction } from './transaction-parser.service';

export interface TransactionClassification {
  categoryName: string;
  necessityLevel: NecessityLevel;
  confidence: number;
  matchedPattern: string | null;
}

interface RuleDefinition {
  patterns: string[];
  categoryName: string;
  necessityLevel: NecessityLevel;
  confidence: number;
  priority: number;
}

@Injectable()
export class TransactionClassifierService {
  private readonly fallbackRules: RuleDefinition[] = [
    {
      patterns: ['MAXI', 'IDEA', 'LIDL', 'RODA'],
      categoryName: 'groceries',
      necessityLevel: NecessityLevel.MUST,
      confidence: 0.95,
      priority: 10,
    },
    {
      patterns: ['A1', 'YETTEL', 'SBB', 'MTS'],
      categoryName: 'utilities',
      necessityLevel: NecessityLevel.MUST,
      confidence: 0.95,
      priority: 20,
    },
    {
      patterns: ['APOTEKA', 'PHARMACY'],
      categoryName: 'health',
      necessityLevel: NecessityLevel.MUST,
      confidence: 0.95,
      priority: 30,
    },
    {
      patterns: ['DM'],
      categoryName: 'household',
      necessityLevel: NecessityLevel.SEMI,
      confidence: 0.9,
      priority: 40,
    },
    {
      patterns: ['GYM', 'FITNESS'],
      categoryName: 'fitness',
      necessityLevel: NecessityLevel.SEMI,
      confidence: 0.9,
      priority: 50,
    },
    {
      patterns: ['WOLT', 'GLOVO'],
      categoryName: 'food_delivery',
      necessityLevel: NecessityLevel.SEMI,
      confidence: 0.9,
      priority: 60,
    },
    {
      patterns: ['STEAM', 'PLAYSTATION', 'NETFLIX', 'SPOTIFY'],
      categoryName: 'entertainment',
      necessityLevel: NecessityLevel.LUXURY,
      confidence: 0.95,
      priority: 70,
    },
    {
      patterns: ['PET', 'VET', 'ZOO'],
      categoryName: 'cat',
      necessityLevel: NecessityLevel.MUST,
      confidence: 0.85,
      priority: 80,
    },
  ];

  constructor(private readonly merchantRulesService: MerchantRulesService) {}

  async classify(
    transaction: Pick<ParsedTransaction, 'merchant' | 'description'>,
  ): Promise<TransactionClassification> {
    const merchant = `${transaction.merchant ?? ''} ${
      transaction.description ?? ''
    }`.toUpperCase();

    const databaseMatch = await this.findDatabaseRuleMatch(merchant);
    if (databaseMatch) {
      return databaseMatch;
    }

    return this.findFallbackRuleMatch(merchant) ?? this.uncategorized();
  }

  private async findDatabaseRuleMatch(
    merchant: string,
  ): Promise<TransactionClassification | null> {
    const rules = await this.merchantRulesService.findAllOrdered();

    for (const rule of rules) {
      if (matchesPattern(merchant, rule.pattern)) {
        return {
          categoryName: rule.category.name,
          necessityLevel: rule.necessityLevel,
          confidence: 0.95,
          matchedPattern: rule.pattern,
        };
      }
    }

    return null;
  }

  private findFallbackRuleMatch(
    merchant: string,
  ): TransactionClassification | null {
    const rules = [...this.fallbackRules].sort((a, b) => a.priority - b.priority);

    for (const rule of rules) {
      const matchedPattern = rule.patterns.find((pattern) =>
        matchesPattern(merchant, pattern),
      );
      if (matchedPattern) {
        return {
          categoryName: rule.categoryName,
          necessityLevel: rule.necessityLevel,
          confidence: rule.confidence,
          matchedPattern,
        };
      }
    }

    return null;
  }

  private uncategorized(): TransactionClassification {
    return {
      categoryName: 'uncategorized',
      necessityLevel: NecessityLevel.SEMI,
      confidence: 0.3,
      matchedPattern: null,
    };
  }
}

function matchesPattern(value: string, pattern: string): boolean {
  const normalizedPattern = pattern.trim().toUpperCase();
  if (!normalizedPattern) {
    return false;
  }

  return value.includes(normalizedPattern);
}
