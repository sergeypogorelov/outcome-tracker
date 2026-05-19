import { MerchantRulesService } from '../merchant-rules/merchant-rules.service';
import { NecessityLevel } from './necessity-level.enum';
import { TransactionClassifierService } from './transaction-classifier.service';

describe('TransactionClassifierService', () => {
  const merchantRulesService = {
    findAllOrdered: jest.fn().mockResolvedValue([]),
  } as unknown as MerchantRulesService;
  const service = new TransactionClassifierService(merchantRulesService);

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
      service.classify({ merchant, description: merchant }),
    ).resolves.toMatchObject({
      categoryName,
      necessityLevel,
    });
  });

  it('falls back to uncategorized semi for unknown merchant', async () => {
    await expect(
      service.classify({ merchant: 'Somewhere', description: null }),
    ).resolves.toEqual({
      categoryName: 'uncategorized',
      necessityLevel: NecessityLevel.SEMI,
      confidence: 0.3,
      matchedPattern: null,
    });
  });
});
