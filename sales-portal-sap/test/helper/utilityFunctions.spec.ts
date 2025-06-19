import UtilityFunctions from '../../app/helper/utilityFunctions';
import axios from 'axios';
import moment from 'moment';
import logger from '../../app/lib/logger';

jest.mock('axios');
jest.mock('moment');
jest.mock('../../app/lib/logger');

describe('UtilityFunctions', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('getCurrentDate', () => {
    it('should return the current date in DD.MM.YYYY format', () => {
      (moment as jest.MockedFunction<typeof moment>).mockReturnValue({
        format: jest.fn().mockReturnValue('01.01.2023'),
      } as any);

      const result = UtilityFunctions.getCurrentDate();
      expect(result).toBe('01.01.2023');
    });
  });

  describe('getCurrentMMYY', () => {
    it('should return the current date in MMYY format', () => {
      (moment as jest.MockedFunction<typeof moment>).mockReturnValue({
        format: jest.fn().mockReturnValue('0123'),
      } as any);

      const result = UtilityFunctions.getCurrentMMYY();
      expect(result).toBe('0123');
    });


  });
});
