import validation from '../../app/middleware/requestValidator';

describe('validatePayload', () => {
let mockReq: any;
let mockRes: any;
  let nextFunction = jest.fn();

  beforeEach(() => {
    mockReq = {};
    mockRes = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn(),
    };
    nextFunction.mockClear();
  });

  test('calls next() for POST with valid body', () => {
    mockReq = {
      method: 'POST',
      body: { some: 'data' },
    };
    validation.validatePayload(mockReq, mockRes, nextFunction);
    expect(nextFunction).toHaveBeenCalled();
  });

  test('calls next() for PUT with valid body', () => {
    mockReq = {
      method: 'PUT',
      body: { some: 'data' },
    };
    validation.validatePayload(mockReq, mockRes, nextFunction);
    expect(nextFunction).toHaveBeenCalled();
  });

  test('returns 403 for methods other than POST or PUT', () => {
    mockReq = {
      method: 'GET',
      body: { some: 'data' },
    };
    validation.validatePayload(mockReq, mockRes, nextFunction);
    expect(mockRes.status).toHaveBeenCalledWith(403);
    expect(mockRes.json).toHaveBeenCalledWith({
      success: false,
      message: 'Payload is required for HTTP Post & Put ',
    });
  });

  test('returns 403 for POST with null body', () => {
    mockReq = {
      method: 'POST',
      body: null,
    };
    validation.validatePayload(mockReq, mockRes, nextFunction);
    expect(mockRes.status).toHaveBeenCalledWith(403);
    expect(mockRes.json).toHaveBeenCalledWith({
      success: false,
      message: 'Payload is required for HTTP Post & Put ',
    });
  });
});
