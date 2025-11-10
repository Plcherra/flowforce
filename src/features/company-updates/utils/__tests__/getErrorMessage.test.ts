import { describe, expect, it } from 'vitest';
import { getErrorMessage } from '../getErrorMessage';

describe('getErrorMessage', () => {
  it('returns string when error is Error instance', () => {
    const error = new Error('Boom');
    expect(getErrorMessage(error, 'fallback')).toBe('Boom');
  });

  it('returns string when error is plain string', () => {
    expect(getErrorMessage('Something bad', 'fallback')).toBe('Something bad');
  });

  it('reads message property from object', () => {
    expect(getErrorMessage({ message: 'Nested' }, 'fallback')).toBe('Nested');
  });

  it('falls back when message missing', () => {
    expect(getErrorMessage(123, 'fallback')).toBe('fallback');
  });
});
