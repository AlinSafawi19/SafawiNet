import { SecurityUtils } from './security.utils';
import * as argon2 from 'argon2';

describe('SecurityUtils', () => {
  describe('hashPassword', () => {
    it('should hash password using Argon2id', async () => {
      const password = 'testPassword123';
      const hash = await SecurityUtils.hashPassword(password);

      expect(hash).toBeDefined();
      expect(typeof hash).toBe('string');
      expect(hash.length).toBeGreaterThan(0);
      expect(hash).not.toBe(password);
    });

    it('should generate different hashes for the same password', async () => {
      const password = 'testPassword123';
      const hash1 = await SecurityUtils.hashPassword(password);
      const hash2 = await SecurityUtils.hashPassword(password);

      expect(hash1).not.toBe(hash2);
    });
  });

  describe('verifyPassword', () => {
    it('should verify correct password against hash', async () => {
      const password = 'testPassword123';
      const hash = await SecurityUtils.hashPassword(password);

      const isValid = await SecurityUtils.verifyPassword(hash, password);
      expect(isValid).toBe(true);
    });

    it('should reject incorrect password', async () => {
      const password = 'testPassword123';
      const wrongPassword = 'wrongPassword123';
      const hash = await SecurityUtils.hashPassword(password);

      const isValid = await SecurityUtils.verifyPassword(hash, wrongPassword);
      expect(isValid).toBe(false);
    });
  });

  describe('generateRandomToken', () => {
    it('should generate 32-byte hex token', () => {
      const token = SecurityUtils.generateRandomToken();

      expect(token).toBeDefined();
      expect(typeof token).toBe('string');
      expect(token.length).toBe(64); // 32 bytes = 64 hex characters
    });

    it('should generate different tokens on each call', () => {
      const token1 = SecurityUtils.generateRandomToken();
      const token2 = SecurityUtils.generateRandomToken();

      expect(token1).not.toBe(token2);
    });
  });

  describe('sha256Hash', () => {
    it('should generate SHA-256 hash', () => {
      const data = 'testData';
      const hash = SecurityUtils.sha256Hash(data);

      expect(hash).toBeDefined();
      expect(typeof hash).toBe('string');
      expect(hash.length).toBe(64); // SHA-256 produces 64 hex characters
    });

    it('should generate consistent hash for same input', () => {
      const data = 'testData';
      const hash1 = SecurityUtils.sha256Hash(data);
      const hash2 = SecurityUtils.sha256Hash(data);

      expect(hash1).toBe(hash2);
    });

    it('should generate different hashes for different inputs', () => {
      const data1 = 'testData1';
      const data2 = 'testData2';
      const hash1 = SecurityUtils.sha256Hash(data1);
      const hash2 = SecurityUtils.sha256Hash(data2);

      expect(hash1).not.toBe(hash2);
    });
  });

  describe('generateSecureToken', () => {
    it('should generate token with default length', () => {
      const token = SecurityUtils.generateSecureToken();

      expect(token).toBeDefined();
      expect(typeof token).toBe('string');
      expect(token.length).toBeGreaterThan(0);
    });

    it('should generate token with custom length', () => {
      const length = 16;
      const token = SecurityUtils.generateSecureToken(length);

      expect(token).toBeDefined();
      expect(typeof token).toBe('string');
      expect(token.length).toBeGreaterThan(0);
    });

    it('should generate different tokens on each call', () => {
      const token1 = SecurityUtils.generateSecureToken();
      const token2 = SecurityUtils.generateSecureToken();

      expect(token1).not.toBe(token2);
    });
  });

  describe('hashToken', () => {
    it('should hash token using SHA-256', () => {
      const token = 'testToken123';
      const hash = SecurityUtils.hashToken(token);

      expect(hash).toBeDefined();
      expect(typeof hash).toBe('string');
      expect(hash.length).toBe(64); // SHA-256 produces 64 hex characters
    });

    it('should generate consistent hash for same token', () => {
      const token = 'testToken123';
      const hash1 = SecurityUtils.hashToken(token);
      const hash2 = SecurityUtils.hashToken(token);

      expect(hash1).toBe(hash2);
    });

    it('should generate different hashes for different tokens', () => {
      const token1 = 'testToken1';
      const token2 = 'testToken2';
      const hash1 = SecurityUtils.hashToken(token1);
      const hash2 = SecurityUtils.hashToken(token2);

      expect(hash1).not.toBe(hash2);
    });
  });
});
