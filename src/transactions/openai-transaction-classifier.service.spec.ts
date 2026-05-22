import { ConfigService } from '@nestjs/config';
import { CategoryEntity } from '../categories/category.entity';
import { NecessityLevel } from './necessity-level.enum';
import { OpenAiTransactionClassifierService } from './openai-transaction-classifier.service';

describe('OpenAiTransactionClassifierService', () => {
  const categories = [
    {
      name: 'groceries',
      defaultNecessityLevel: NecessityLevel.MUST,
    },
    {
      name: 'uncategorized',
      defaultNecessityLevel: NecessityLevel.SEMI,
    },
  ] as CategoryEntity[];

  const configService = {
    get: jest.fn((key: string, defaultValue?: unknown) => {
      const values: Record<string, unknown> = {
        'openai.classifierEnabled': true,
        'openai.apiKey': 'test-key',
        'openai.classifierModel': 'gpt-4o-mini-2024-07-18',
        'openai.classifierMinConfidence': 0.75,
      };
      return values[key] ?? defaultValue;
    }),
  } as unknown as ConfigService;

  let service: OpenAiTransactionClassifierService;

  beforeEach(() => {
    service = new OpenAiTransactionClassifierService(configService);
    global.fetch = jest.fn();
  });

  it('requests strict structured output and returns a valid classification', async () => {
    jest.mocked(fetch).mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        output_text: JSON.stringify({
          categoryName: 'groceries',
          necessityLevel: NecessityLevel.MUST,
          confidence: 0.9,
          reason: 'Merchant looks like a grocery store.',
        }),
      }),
    } as Response);

    await expect(
      service.classify(
        {
          amount: 100,
          currency: 'RSD',
          merchant: 'Maxi',
          description: 'Maxi',
        },
        categories,
      ),
    ).resolves.toMatchObject({
      categoryName: 'groceries',
      necessityLevel: NecessityLevel.MUST,
      confidence: 0.9,
    });

    expect(fetch).toHaveBeenCalledWith(
      'https://api.openai.com/v1/responses',
      expect.objectContaining({
        body: expect.stringContaining('"type":"json_schema"'),
      }),
    );
  });

  it('rejects categories outside the provided category list', async () => {
    jest.mocked(fetch).mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        output_text: JSON.stringify({
          categoryName: 'travel',
          necessityLevel: NecessityLevel.SEMI,
          confidence: 0.9,
          reason: 'Invalid category.',
        }),
      }),
    } as Response);

    await expect(
      service.classify(
        {
          amount: 100,
          currency: 'RSD',
          merchant: 'Airport',
          description: null,
        },
        categories,
      ),
    ).resolves.toBeNull();
  });
});
