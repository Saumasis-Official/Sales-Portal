import { PDPCheck, PDPConfig } from '../../app/helper/pdp';
import { describe, expect, it } from '@jest/globals';

describe('checkOrderAllowed_FN_PDP', () => {
  it('should return allowedToOrder as true when today is within the orderWindow', () => {
    const day = 'WE';
    const referenceDate = '20220506';
    const today = new Date('2022-05-04');
    const pdpFrequency = 2;
    const pdpConfig = new PDPConfig();

    const result = PDPCheck.checkOrderAllowed_FN_PDP(
      day,
      referenceDate,
      today,
      pdpFrequency,
      pdpConfig,
    );

    expect(result?.allowedToOrder).toBe(true);
  });

  it('should return allowedToOrder as false when today is outside the orderWindow', () => {
    const day = 'WE';
    const referenceDate = '20220506';
    const today = new Date('2022-05-07');
    const pdpFrequency = 2;
    const pdpConfig = new PDPConfig();

    const result = PDPCheck.checkOrderAllowed_FN_PDP(
      day,
      referenceDate,
      today,
      pdpFrequency,
      pdpConfig,
    );

    expect(result?.allowedToOrder).toBe(false);
  });
});
describe('checkOrderAllowed_WE_PDP', () => {
  it('should return allowedToOrder as false when today is outside the orderWindow', () => {
    const day = 'WE';
    const today = new Date('2022-05-07');
    const pdpFrequency = 2;
    const pdpConfig = new PDPConfig();

    const result = PDPCheck.checkOrderAllowed_WE_PDP(
      day,
      today,
      pdpFrequency,
      pdpConfig,
    );

    expect(result?.allowedToOrder).toBe(false);
  });
});
describe('pdpFrequencyCounter', () => {
  it('should return 0 when pdp is an empty string', () => {
    const pdp = '';
    const result = PDPCheck.pdpFrequencyCounter(pdp);
    expect(result).toBe(0);
  });

  it('should return 0 when pdp does not contain any valid days', () => {
    const pdp = 'ABC';
    const result = PDPCheck.pdpFrequencyCounter(pdp);
    expect(result).toBe(0);
  });
});
