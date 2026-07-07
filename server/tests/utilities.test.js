import { describe, expect, it } from '@jest/globals';
import { ApiError } from '../src/utils/ApiError.js';
import { ApiResponse } from '../src/utils/ApiResponse.js';

describe('Utilities', () => {
  it('builds API responses with success flags', () => {
    const response = new ApiResponse(200, { ok: true }, 'Success');
    expect(response.success).toBe(true);
    expect(response.data.ok).toBe(true);
  });

  it('captures operational errors', () => {
    const error = new ApiError(404, 'Not found');
    expect(error.isOperational).toBe(true);
    expect(error.statusCode).toBe(404);
  });
});
