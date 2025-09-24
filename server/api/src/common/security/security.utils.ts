import * as argon2 from 'argon2';
import {
  randomBytes,
  createHash,
  createCipheriv,
  createDecipheriv,
  scryptSync,
} from 'crypto';

export class SecurityUtils {
  private static readonly ENCRYPTION_KEY =
    process.env.ENCRYPTION_KEY || 'default-encryption-key-32-chars-long';
  private static readonly ALGORITHM = 'aes-256-cbc';

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
  static async verifyPassword(
    hash: string,
    password: string,
  ): Promise<boolean> {
    try {
      // Check if hash is in Argon2 format (starts with $)
      if (!hash.startsWith('$')) {
        return false;
      }
      return await argon2.verify(hash, password);
    } catch (error) {
      console.error('Password verification failed', {
        source: 'api',
        hash,
        password,
        error,
      });
      return false;
    }
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

  /**
   * Verify token against hash
   */
  static verifyToken(token: string, hash: string): boolean {
    return this.sha256Hash(token) === hash;
  }

  /**
   * Encrypt data using AES-256-CBC
   */
  static encryptData(data: string): string {
    const key = scryptSync(this.ENCRYPTION_KEY, 'salt', 32);
    const iv = randomBytes(16);
    const cipher = createCipheriv(this.ALGORITHM, key, iv);

    let encrypted = cipher.update(data, 'utf8', 'hex');
    encrypted += cipher.final('hex');

    return iv.toString('hex') + ':' + encrypted;
  }

  /**
   * Decrypt data using AES-256-CBC
   */
  static decryptData(encryptedData: string): string {
    const key = scryptSync(this.ENCRYPTION_KEY, 'salt', 32);
    const parts = encryptedData.split(':');
    const iv = Buffer.from(parts[0], 'hex');
    const encrypted = parts[1];

    const decipher = createDecipheriv(this.ALGORITHM, key, iv);
    let decrypted = decipher.update(encrypted, 'hex', 'utf8');
    decrypted += decipher.final('utf8');

    return decrypted;
  }
}
