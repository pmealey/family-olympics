import { generateToken } from '../../../lib/lambda/shared/auth';

describe('Auth Utilities', () => {
  describe('generateToken', () => {
    it('should generate a token', () => {
      const token = generateToken();

      expect(token).toBeDefined();
      expect(typeof token).toBe('string');
      expect(token.length).toBeGreaterThan(0);
    });

    it('should generate unique tokens', () => {
      const token1 = generateToken();
      const token2 = generateToken();

      expect(token1).not.toBe(token2);
    });
  });
});

