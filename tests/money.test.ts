import { describe, it, expect } from 'vitest';
import { round2, multiplyMoney, usdToPhp, sumMoney } from '../src/lib/money.js';

describe('money', () => {
  it('rounds to 2 decimals without float drift', () => {
    expect(round2(0.1 + 0.2)).toBe(0.3);
    expect(round2(1.005)).toBe(1.0); // 1.005 is actually 1.00499... in float
    expect(round2(2.675)).toBe(2.68);
    expect(round2(-1.005)).toBe(-1.0);
  });

  it('multiplies money by quantity', () => {
    expect(multiplyMoney(19.99, 3)).toBe(59.97);
    expect(multiplyMoney(0.1, 3)).toBe(0.3);
  });

  it('converts USD to PHP with an explicit FX rate', () => {
    expect(usdToPhp(10, 56.25)).toBe(562.5);
    expect(usdToPhp(1.5, 58)).toBe(87);
  });

  it('rejects non-positive FX rates', () => {
    expect(() => usdToPhp(10, 0)).toThrow();
    expect(() => usdToPhp(10, -1)).toThrow();
  });

  it('sums money safely', () => {
    expect(sumMoney([0.1, 0.2, 0.3])).toBe(0.6);
    expect(sumMoney([])).toBe(0);
  });
});
