import 'reflect-metadata';
import dataSource from '../data-source';
import { CategoryEntity } from '../../categories/category.entity';
import { MerchantRuleEntity } from '../../merchant-rules/merchant-rule.entity';
import { NecessityLevel } from '../../transactions/necessity-level.enum';

const categories: Array<{
  name: string;
  defaultNecessityLevel: NecessityLevel;
}> = [
  { name: 'groceries', defaultNecessityLevel: NecessityLevel.MUST },
  { name: 'utilities', defaultNecessityLevel: NecessityLevel.MUST },
  { name: 'health', defaultNecessityLevel: NecessityLevel.MUST },
  { name: 'household', defaultNecessityLevel: NecessityLevel.SEMI },
  { name: 'fitness', defaultNecessityLevel: NecessityLevel.SEMI },
  { name: 'food_delivery', defaultNecessityLevel: NecessityLevel.SEMI },
  { name: 'entertainment', defaultNecessityLevel: NecessityLevel.LUXURY },
  { name: 'cat', defaultNecessityLevel: NecessityLevel.MUST },
  { name: 'uncategorized', defaultNecessityLevel: NecessityLevel.SEMI },
];

const rules: Array<{
  patterns: string[];
  category: string;
  necessityLevel: NecessityLevel;
  priority: number;
}> = [
  {
    patterns: ['MAXI', 'IDEA', 'LIDL', 'RODA'],
    category: 'groceries',
    necessityLevel: NecessityLevel.MUST,
    priority: 10,
  },
  {
    patterns: ['A1', 'YETTEL', 'SBB', 'MTS'],
    category: 'utilities',
    necessityLevel: NecessityLevel.MUST,
    priority: 20,
  },
  {
    patterns: ['APOTEKA', 'PHARMACY'],
    category: 'health',
    necessityLevel: NecessityLevel.MUST,
    priority: 30,
  },
  {
    patterns: ['DM'],
    category: 'household',
    necessityLevel: NecessityLevel.SEMI,
    priority: 40,
  },
  {
    patterns: ['GYM', 'FITNESS'],
    category: 'fitness',
    necessityLevel: NecessityLevel.SEMI,
    priority: 50,
  },
  {
    patterns: ['WOLT', 'GLOVO'],
    category: 'food_delivery',
    necessityLevel: NecessityLevel.SEMI,
    priority: 60,
  },
  {
    patterns: ['STEAM', 'PLAYSTATION', 'NETFLIX', 'SPOTIFY'],
    category: 'entertainment',
    necessityLevel: NecessityLevel.LUXURY,
    priority: 70,
  },
  {
    patterns: ['PET', 'VET', 'ZOO'],
    category: 'cat',
    necessityLevel: NecessityLevel.MUST,
    priority: 80,
  },
];

async function run(): Promise<void> {
  await dataSource.initialize();
  const categoryRepository = dataSource.getRepository(CategoryEntity);
  const ruleRepository = dataSource.getRepository(MerchantRuleEntity);

  const categoryByName = new Map<string, CategoryEntity>();
  for (const category of categories) {
    const existing = await categoryRepository.findOne({
      where: { name: category.name },
    });
    const entity = await categoryRepository.save(
      existing
        ? { ...existing, defaultNecessityLevel: category.defaultNecessityLevel }
        : categoryRepository.create(category),
      { reload: true },
    );
    categoryByName.set(entity.name, entity);
  }

  for (const ruleGroup of rules) {
    const category = categoryByName.get(ruleGroup.category);
    if (!category) {
      throw new Error(`Missing category ${ruleGroup.category}`);
    }

    for (const pattern of ruleGroup.patterns) {
      const existing = await ruleRepository.findOne({ where: { pattern } });
      if (existing) {
        existing.categoryId = category.id;
        existing.necessityLevel = ruleGroup.necessityLevel;
        existing.priority = ruleGroup.priority;
        await ruleRepository.save(existing);
        continue;
      }

      await ruleRepository.save(
        ruleRepository.create({
          pattern,
          categoryId: category.id,
          necessityLevel: ruleGroup.necessityLevel,
          priority: ruleGroup.priority,
        }),
      );
    }
  }

  await dataSource.destroy();
}

run().catch(async (error: unknown) => {
  console.error(error);
  if (dataSource.isInitialized) {
    await dataSource.destroy();
  }
  process.exitCode = 1;
});
