import errorHandler from '../../app/helper/errorHandler';
import ResponseTemplate from '../../app/helper/responseTemplate';
import winston from 'winston';

jest.mock('winston');
jest.mock('../../app/helper/responseTemplate');

describe('errorHandler', () => {
  let req: any;
  let res: any;
  let next: any;

  beforeEach(() => {
    req = {};
    res = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn(),
    };
    next = jest.fn();
  });

  describe('internalServerError', () => {
    test('should log the error and respond with 400 for Boom errors', () => {
      const err = {
        isBoom: true,
        output: {
          payload: {
            error: 'Bad Request',
            message: 'Invalid input',
          },
        },
      };

      errorHandler.internalServerError(err, req, res, next);

      expect(winston.log).toHaveBeenCalledWith('info', err);
      expect(res.status).toHaveBeenCalledWith(400);
      expect(ResponseTemplate.BadRequestFromJoi).toHaveBeenCalledWith(
        {
          message: 'Bad Request',
          error: 'Invalid input',
        },
      );
      expect(res.json).toHaveBeenCalledWith(
        ResponseTemplate.BadRequestFromJoi({
          message: 'Bad Request',
          error: 'Invalid input',
        }),
      );
    });

    test('should log the error and respond with 500 for non-Boom errors', () => {
      const err = new Error('Internal Server Error');

      errorHandler.internalServerError(err, req, res, next);

      expect(winston.log).toHaveBeenCalledWith('info', err);
      expect(res.status).toHaveBeenCalledWith(500);
      expect(res.json).toHaveBeenCalledWith({
        success: false,
        message: err.message,
        error: expect.any(String),
      });
    });
  });

  describe('PageNotFound', () => {
    test('should respond with 404 and api not found message', () => {
      errorHandler.PageNotFound(req, res, next);

      expect(res.status).toHaveBeenCalledWith(404);
      expect(res.json).toHaveBeenCalledWith({
        message: 'api not found',
      });
    });
  });
});
