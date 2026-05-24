import { describe, expect, it } from 'vitest';
import { ToonParserError, convertJsonToToon } from '../utils/toonParser';

describe('convertJsonToToon', () => {
  it('compresses flat objects and keeps missing values aligned', () => {
    const result = convertJsonToToon([
      { id: 1, status: 200, endpoint: '/auth' },
      { id: 2, endpoint: '/payout' },
    ]);

    expect(result.schemaHeader).toBe('Format: [id | status | endpoint]');
    expect(result.rows).toEqual(['1|200|/auth', '2||/payout']);
  });

  it('flattens nested objects using dot notation', () => {
    const result = convertJsonToToon([
      { user: { id: 10, profile: { role: 'admin' } }, tags: ['a', 'b'] },
    ]);

    expect(result.keys).toEqual(['user.id', 'user.profile.role', 'tags']);
    expect(result.rows[0]).toBe('10|admin|a,b');
  });

  it('flattens arrays of objects using index notation', () => {
    const result = convertJsonToToon([
      { id: 1, addresses: [{ city: 'Ahmedabad' }, { city: 'Austin' }] },
    ]);

    expect(result.keys).toEqual(['id', 'addresses[0].city', 'addresses[1].city']);
    expect(result.rows[0]).toBe('1|Ahmedabad|Austin');
  });

  it('escapes delimiters inside cell values', () => {
    const result = convertJsonToToon([{ id: 1, message: 'hello|world\nnext' }]);
    expect(result.rows[0]).toBe('1|hello\\|world\\nnext');
  });

  it('rejects deep payloads', () => {
    expect(() =>
      convertJsonToToon([{ a: { b: { c: { d: { e: { f: 1 } } } } } }], { maxDepth: 3 }),
    ).toThrow(ToonParserError);
  });
});
