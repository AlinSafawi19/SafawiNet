import * as argon2 from 'argon2';
import { randomBytes, createHash } from 'crypto';

export class SecurityUtils {
  /**
   * Hash password using Argon2id
   */
  static async hashPassword(password: string): Promise<string> {
    return argon2.hash(password, {
      type: argon2.argon2id,
      memoryCost: 2 ** 16, // 64MB
      timeCost: 3, // 3 iterations
      parallelism: 1,
    });
  }

  /**
   * Verify password against hash
   */
  static async verifyPassword(hash: string, password: string): Promise<boolean> {
    return argon2.verify(hash, password);
  }

  /**
   * Generate random token (32 bytes = 256 bits)
   */
  static generateRandomToken(): string {
    return randomBytes(32).toString('hex');
  }

  /**
   * Generate SHA-256 hash
   */
  static sha256Hash(data: string): string {
    return createHash('sha256').update(data).digest('hex');
  }

  /**
   * Generate secure random string for tokens
   */
  static generateSecureToken(length: number = 32): string {
    return randomBytes(length).toString('base64url');
  }

  /**
   * Hash token for storage (one-way hash)
   */
  static hashToken(token: string): string {
    return this.sha256Hash(token);
  }
}
