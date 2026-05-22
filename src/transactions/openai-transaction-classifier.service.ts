import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { CategoryEntity } from '../categories/category.entity';
import { NecessityLevel } from './necessity-level.enum';
import { ParsedTransaction } from './transaction-parser.service';

export interface OpenAiClassification {
  categoryName: string;
  necessityLevel: NecessityLevel;
  confidence: number;
  reason?: string;
}

interface OpenAiResponse {
  output_text?: string;
  output?: Array<{
    content?: Array<{
      type?: string;
      text?: string;
    }>;
  }>;
}

@Injectable()
export class OpenAiTransactionClassifierService {
  private readonly logger = new Logger(OpenAiTransactionClassifierService.name);

  constructor(private readonly configService: ConfigService) {}

  isEnabled(): boolean {
    return (
      this.configService.get<boolean>('openai.classifierEnabled', false) &&
      Boolean(this.configService.get<string>('openai.apiKey'))
    );
  }

  getMinConfidence(): number {
    return this.configService.get<number>('openai.classifierMinConfidence', 0.75);
  }

  async classify(
    transaction: Pick<
      ParsedTransaction,
      'amount' | 'currency' | 'merchant' | 'description'
    >,
    categories: CategoryEntity[],
  ): Promise<OpenAiClassification | null> {
    if (!this.isEnabled() || categories.length === 0) {
      return null;
    }

    try {
      const response = await fetch('https://api.openai.com/v1/responses', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${this.configService.get<string>(
            'openai.apiKey',
          )}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          model: this.configService.get<string>(
            'openai.classifierModel',
            'gpt-4o-mini-2024-07-18',
          ),
          input: [
            {
              role: 'system',
              content:
                'Classify a card transaction. Choose only the provided category and necessity enum values. Return structured JSON only.',
            },
            {
              role: 'user',
              content: JSON.stringify({
                transaction: {
                  amount: transaction.amount,
                  currency: transaction.currency,
                  merchant: transaction.merchant,
                  description: transaction.description,
                },
                categories: categories.map((category) => ({
                  name: category.name,
                  defaultNecessityLevel: category.defaultNecessityLevel,
                })),
                necessityLevels: Object.values(NecessityLevel),
              }),
            },
          ],
          text: {
            format: {
              type: 'json_schema',
              name: 'transaction_classification',
              strict: true,
              schema: {
                type: 'object',
                additionalProperties: false,
                required: [
                  'categoryName',
                  'necessityLevel',
                  'confidence',
                  'reason',
                ],
                properties: {
                  categoryName: {
                    type: 'string',
                    enum: categories.map((category) => category.name),
                  },
                  necessityLevel: {
                    type: 'string',
                    enum: Object.values(NecessityLevel),
                  },
                  confidence: {
                    type: 'number',
                    minimum: 0,
                    maximum: 1,
                  },
                  reason: {
                    type: 'string',
                  },
                },
              },
            },
          },
          store: false,
        }),
      });

      if (!response.ok) {
        this.logger.warn(`OpenAI classifier failed: ${response.status}`);
        return null;
      }

      const body = (await response.json()) as OpenAiResponse;
      const parsed = JSON.parse(extractOutputText(body));
      return this.validateClassification(parsed, categories);
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      this.logger.warn(`OpenAI classifier failed: ${message}`);
      return null;
    }
  }

  private validateClassification(
    value: unknown,
    categories: CategoryEntity[],
  ): OpenAiClassification | null {
    if (!value || typeof value !== 'object') {
      return null;
    }

    const candidate = value as Partial<OpenAiClassification>;
    const categoryNames = new Set(categories.map((category) => category.name));
    if (
      !candidate.categoryName ||
      !categoryNames.has(candidate.categoryName) ||
      !candidate.necessityLevel ||
      !Object.values(NecessityLevel).includes(candidate.necessityLevel) ||
      typeof candidate.confidence !== 'number'
    ) {
      return null;
    }

    return {
      categoryName: candidate.categoryName,
      necessityLevel: candidate.necessityLevel,
      confidence: candidate.confidence,
      reason: candidate.reason,
    };
  }
}

function extractOutputText(response: OpenAiResponse): string {
  if (response.output_text) {
    return response.output_text;
  }

  for (const item of response.output ?? []) {
    for (const content of item.content ?? []) {
      if (content.type === 'output_text' && content.text) {
        return content.text;
      }
    }
  }

  throw new Error('OpenAI response did not include output text');
}
