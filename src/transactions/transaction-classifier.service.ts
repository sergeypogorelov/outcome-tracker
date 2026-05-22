import { Injectable } from '@nestjs/common';
import { CategoriesService } from '../categories/categories.service';
import { MerchantRulesService } from '../merchant-rules/merchant-rules.service';
import { NecessityLevel } from './necessity-level.enum';
import { OpenAiTransactionClassifierService } from './openai-transaction-classifier.service';
import { ParsedTransaction } from './transaction-parser.service';

export interface TransactionClassification {
  categoryName: string;
  necessityLevel: NecessityLevel;
  confidence: number;
  matchedPattern: string | null;
  source?: 'database_rule' | 'fallback_rule' | 'openai' | 'manual';
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

  constructor(
    private readonly merchantRulesService: MerchantRulesService,
    private readonly categoriesService: CategoriesService,
    private readonly openAiClassifier: OpenAiTransactionClassifierService,
  ) {}

  async classify(
    transaction: Pick<
      ParsedTransaction,
      'amount' | 'currency' | 'merchant' | 'description'
    >,
  ): Promise<TransactionClassification> {
    const merchant = `${transaction.merchant ?? ''} ${
      transaction.description ?? ''
    }`.toUpperCase();

    const databaseMatch = await this.findDatabaseRuleMatch(merchant);
    if (databaseMatch) {
      return databaseMatch;
    }

    const fallbackMatch = this.findFallbackRuleMatch(merchant);
    if (fallbackMatch) {
      return fallbackMatch;
    }

    const openAiMatch = await this.findOpenAiMatch(transaction);
    if (openAiMatch) {
      return openAiMatch;
    }

    return this.uncategorized();
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
          source: 'database_rule',
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
          source: 'fallback_rule',
        };
      }
    }

    return null;
  }

  private async findOpenAiMatch(
    transaction: Pick<
      ParsedTransaction,
      'amount' | 'currency' | 'merchant' | 'description'
    >,
  ): Promise<TransactionClassification | null> {
    const categories = await this.categoriesService.findAll();
    const classification = await this.openAiClassifier.classify(
      transaction,
      categories,
    );

    if (
      !classification ||
      classification.confidence < this.openAiClassifier.getMinConfidence()
    ) {
      return null;
    }

    const category = categories.find(
      (item) => item.name === classification.categoryName,
    );
    if (category && transaction.merchant) {
      await this.merchantRulesService.createIfMissing({
        pattern: normalizeLearnedPattern(transaction.merchant),
        category,
        necessityLevel: classification.necessityLevel,
        priority: 5,
      });
    }

    return {
      categoryName: classification.categoryName,
      necessityLevel: classification.necessityLevel,
      confidence: classification.confidence,
      matchedPattern: null,
      source: 'openai',
    };
  }

  private uncategorized(): TransactionClassification {
    return {
      categoryName: 'uncategorized',
      necessityLevel: NecessityLevel.SEMI,
      confidence: 0.3,
      matchedPattern: null,
      source: 'manual',
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

function normalizeLearnedPattern(value: string): string {
  return value.trim().replace(/\s+/g, ' ').toUpperCase();
}
