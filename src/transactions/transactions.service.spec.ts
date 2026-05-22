import { Between, Repository } from 'typeorm';
import { CategoryEntity } from '../categories/category.entity';
import { UserEntity } from '../users/user.entity';
import { NecessityLevel } from './necessity-level.enum';
import { TransactionEntity } from './transaction.entity';
import { TransactionsService } from './transactions.service';

describe('TransactionsService', () => {
  let repository: {
    create: jest.Mock;
    save: jest.Mock;
    findOne: jest.Mock;
    find: jest.Mock;
  };
  let service: TransactionsService;

  const user = { id: 42 } as UserEntity;
  const category = { id: 1, name: 'groceries' } as CategoryEntity;
  const baseInput = {
    user,
    amount: 1200,
    currency: 'rsd',
    merchant: 'Maxi',
    description: 'Maxi',
    rawMessage: 'sms',
    transactionDate: new Date('2026-05-21T10:00:00.000Z'),
    category,
    necessityLevel: NecessityLevel.MUST,
    confidence: 0.95,
  };

  beforeEach(() => {
    repository = {
      create: jest.fn((value) => value as TransactionEntity),
      save: jest.fn(async (value) => value as TransactionEntity),
      findOne: jest.fn(),
      find: jest.fn(),
    };
    service = new TransactionsService(
      repository as unknown as Repository<TransactionEntity>,
    );
  });

  it('stores a normalized duplicate fingerprint when creating a transaction', async () => {
    await service.create(baseInput);

    expect(repository.create).toHaveBeenCalledWith(
      expect.objectContaining({
        amount: '1200.00',
        currency: 'RSD',
        duplicateFingerprint: expect.stringContaining('42|1200.00|RSD|MAXI|'),
      }),
    );
  });

  it('finds a duplicate by fingerprint before scanning a time window', async () => {
    const duplicate = { id: 7 } as TransactionEntity;
    repository.findOne.mockResolvedValueOnce(duplicate);

    await expect(service.findLikelyDuplicate(baseInput)).resolves.toBe(duplicate);
    expect(repository.find).not.toHaveBeenCalled();
  });

  it('finds a duplicate in a nearby timestamp window', async () => {
    const duplicate = {
      id: 7,
      merchant: ' maxi ',
      amount: '1200.00',
      currency: 'RSD',
      transactionDate: new Date('2026-05-21T10:01:00.000Z'),
    } as TransactionEntity;
    repository.findOne.mockResolvedValueOnce(null);
    repository.find.mockResolvedValueOnce([duplicate]);

    await expect(service.findLikelyDuplicate(baseInput)).resolves.toBe(duplicate);
    expect(repository.find).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          transactionDate: expect.any(Object) as ReturnType<typeof Between>,
        }),
      }),
    );
  });

  it('updates editable fields and refreshes the duplicate fingerprint', async () => {
    const transaction = {
      id: 7,
      userId: user.id,
      amount: '1200.00',
      currency: 'RSD',
      merchant: 'Maxi',
      description: 'Maxi',
      rawMessage: 'sms',
      transactionDate: new Date('2026-05-21T10:00:00.000Z'),
      category,
      categoryId: category.id,
      necessityLevel: NecessityLevel.MUST,
      confidence: '0.95',
      duplicateFingerprint: null,
    } as TransactionEntity;

    await service.update(transaction, {
      amount: 999.5,
      merchant: 'Idea',
      necessityLevel: NecessityLevel.SEMI,
    });

    expect(repository.save).toHaveBeenCalledWith(
      expect.objectContaining({
        amount: '999.50',
        merchant: 'Idea',
        necessityLevel: NecessityLevel.SEMI,
        duplicateFingerprint: expect.stringContaining('42|999.50|RSD|IDEA|'),
      }),
    );
  });
});
