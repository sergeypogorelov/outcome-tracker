import { MerchantRulesService } from '../merchant-rules/merchant-rules.service';
import { CategoriesService } from '../categories/categories.service';
import { NecessityLevel } from './necessity-level.enum';
import { OpenAiTransactionClassifierService } from './openai-transaction-classifier.service';
import { TransactionClassifierService } from './transaction-classifier.service';

describe('TransactionClassifierService', () => {
  const merchantRulesService = {
    findAllOrdered: jest.fn().mockResolvedValue([]),
    createIfMissing: jest.fn(),
  } as unknown as MerchantRulesService;
  const categoriesService = {
    findAll: jest.fn().mockResolvedValue([]),
  } as unknown as CategoriesService;
  const openAiClassifier = {
    classify: jest.fn().mockResolvedValue(null),
    getMinConfidence: jest.fn().mockReturnValue(0.75),
  } as unknown as OpenAiTransactionClassifierService;
  const service = new TransactionClassifierService(
    merchantRulesService,
    categoriesService,
    openAiClassifier,
  );

  it.each([
    ['MAXI', 'groceries', NecessityLevel.MUST],
    ['Yettel mobile', 'utilities', NecessityLevel.MUST],
    ['Apoteka Beograd', 'health', NecessityLevel.MUST],
    ['DM', 'household', NecessityLevel.SEMI],
    ['Fitness club', 'fitness', NecessityLevel.SEMI],
    ['Wolt Serbia', 'food_delivery', NecessityLevel.SEMI],
    ['Steam', 'entertainment', NecessityLevel.LUXURY],
    ['Zoo shop', 'cat', NecessityLevel.MUST],
  ])('classifies %s as %s', async (merchant, categoryName, necessityLevel) => {
    await expect(
      service.classify({
        amount: 100,
        currency: 'RSD',
        merchant,
        description: merchant,
      }),
    ).resolves.toMatchObject({
      categoryName,
      necessityLevel,
    });
  });

  it('falls back to uncategorized semi for unknown merchant', async () => {
    await expect(
      service.classify({
        amount: 100,
        currency: 'RSD',
        merchant: 'Somewhere',
        description: null,
      }),
    ).resolves.toMatchObject({
      categoryName: 'uncategorized',
      necessityLevel: NecessityLevel.SEMI,
      confidence: 0.3,
      matchedPattern: null,
    });
  });

  it('uses OpenAI only after database and fallback rules miss', async () => {
    const categories = [
      {
        id: 1,
        name: 'entertainment',
        defaultNecessityLevel: NecessityLevel.LUXURY,
      },
    ];
    jest.mocked(categoriesService.findAll).mockResolvedValueOnce(categories as any);
    jest.mocked(openAiClassifier.classify).mockResolvedValueOnce({
      categoryName: 'entertainment',
      necessityLevel: NecessityLevel.LUXURY,
      confidence: 0.91,
    });

    await expect(
      service.classify({
        amount: 100,
        currency: 'RSD',
        merchant: 'Mystery Store',
        description: null,
      }),
    ).resolves.toMatchObject({
      categoryName: 'entertainment',
      necessityLevel: NecessityLevel.LUXURY,
      confidence: 0.91,
      source: 'openai',
    });

    expect(merchantRulesService.createIfMissing).toHaveBeenCalledWith({
      pattern: 'MYSTERY STORE',
      category: categories[0],
      necessityLevel: NecessityLevel.LUXURY,
      priority: 5,
    });
  });

  it('does not call OpenAI when a fallback rule matches', async () => {
    await service.classify({
      amount: 100,
      currency: 'RSD',
      merchant: 'MAXI',
      description: null,
    });

    expect(openAiClassifier.classify).not.toHaveBeenCalledWith(
      expect.objectContaining({ merchant: 'MAXI' }),
      expect.anything(),
    );
  });
});
