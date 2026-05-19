import { TransactionParserService } from './transaction-parser.service';

describe('TransactionParserService', () => {
  const service = new TransactionParserService();

  it.each([
    [
      'Card transaction: 1250.00 RSD at MAXI on 19.05.2026 14:32',
      { amount: 1250, currency: 'RSD', merchant: 'MAXI' },
    ],
    [
      'Potrosnja karticom 1,250.00 RSD, trgovac MAXI, datum 19.05.2026 14:32',
      { amount: 1250, currency: 'RSD', merchant: 'MAXI' },
    ],
    [
      'EUR 12.50 spent at Steam on 2026-05-19',
      { amount: 12.5, currency: 'EUR', merchant: 'Steam' },
    ],
    [
      'Kupovina: 899 RSD; Mesto: DM; Datum: 19/05/2026 18:10',
      { amount: 899, currency: 'RSD', merchant: 'DM' },
    ],
  ])('parses %s', (message, expected) => {
    const result = service.parse(message);

    expect(result).toMatchObject(expected);
    expect(result?.rawMessage).toBe(message);
    expect(result?.transactionDate).toBeInstanceOf(Date);
  });

  it('returns null for non-transaction text', () => {
    expect(service.parse('hello there')).toBeNull();
  });
});
