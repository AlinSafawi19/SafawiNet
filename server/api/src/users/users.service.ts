import { Injectable, Logger, ConflictException, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../common/services/prisma.service';
import { SecurityUtils } from '../common/security/security.utils';
import { EmailService } from '../common/services/email.service';
import { CreateUserDto } from './dto/create-user.dto';
import { User } from '@prisma/client';

@Injectable()
export class UsersService {
  private readonly logger = new Logger(UsersService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly emailService: EmailService,
  ) {}

  async createUser(createUserDto: CreateUserDto): Promise<Omit<User, 'password'>> {
    const { email, password, name } = createUserDto;

    // Check if user already exists
    const existingUser = await this.prisma.user.findUnique({
      where: { email: email.toLowerCase() },
    });

    if (existingUser) {
      throw new ConflictException('User with this email already exists');
    }

    // Hash password
    const hashedPassword = await SecurityUtils.hashPassword(password);

    // Create user
    const user = await this.prisma.user.create({
      data: {
        email: email.toLowerCase(),
        password: hashedPassword,
        name,
      },
    });

    // Generate verification token
    const verificationToken = SecurityUtils.generateSecureToken();
    const tokenHash = SecurityUtils.hashToken(verificationToken);

    // Store verification token
    await this.prisma.oneTimeToken.create({
      data: {
        purpose: 'email_verification',
        hash: tokenHash,
        userId: user.id,
        expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000), // 24 hours
      },
    });

    // Send verification email
    try {
      await this.emailService.sendVerificationEmail(user.email, verificationToken);
    } catch (error) {
      this.logger.error(`Failed to send verification email to ${user.email}:`, error);
      // Don't fail user creation if email fails
    }

    // Return user without password
    const { password: _, ...userWithoutPassword } = user;
    return userWithoutPassword;
  }

  async findUserById(id: string): Promise<Omit<User, 'password'> | null> {
    const user = await this.prisma.user.findUnique({
      where: { id },
    });

    if (!user) {
      return null;
    }

    const { password: _, ...userWithoutPassword } = user;
    return userWithoutPassword;
  }

  async findUserByEmail(email: string): Promise<User | null> {
    return this.prisma.user.findUnique({
      where: { email: email.toLowerCase() },
    });
  }

  async findAllUsers(): Promise<Omit<User, 'password'>[]> {
    const users = await this.prisma.user.findMany({
      orderBy: { createdAt: 'desc' },
    });

    return users.map(({ password: _, ...userWithoutPassword }) => userWithoutPassword);
  }

  async verifyEmail(token: string): Promise<boolean> {
    const tokenHash = SecurityUtils.hashToken(token);

    const oneTimeToken = await this.prisma.oneTimeToken.findFirst({
      where: {
        hash: tokenHash,
        purpose: 'email_verification',
        expiresAt: { gt: new Date() },
        usedAt: null,
      },
    });

    if (!oneTimeToken) {
      return false;
    }

    // Mark token as used
    await this.prisma.oneTimeToken.update({
      where: { id: oneTimeToken.id },
      data: { usedAt: new Date() },
    });

    return true;
  }

  async requestPasswordReset(email: string): Promise<void> {
    const user = await this.findUserByEmail(email);
    if (!user) {
      // Don't reveal if user exists or not
      return;
    }

    // Generate reset token
    const resetToken = SecurityUtils.generateSecureToken();
    const tokenHash = SecurityUtils.hashToken(resetToken);

    // Store reset token
    await this.prisma.oneTimeToken.create({
      data: {
        purpose: 'password_reset',
        hash: tokenHash,
        userId: user.id,
        expiresAt: new Date(Date.now() + 60 * 60 * 1000), // 1 hour
      },
    });

    // Send reset email
    await this.emailService.sendPasswordResetEmail(user.email, resetToken);
  }

  async resetPassword(token: string, newPassword: string): Promise<boolean> {
    const tokenHash = SecurityUtils.hashToken(token);

    const oneTimeToken = await this.prisma.oneTimeToken.findFirst({
      where: {
        hash: tokenHash,
        purpose: 'password_reset',
        expiresAt: { gt: new Date() },
        usedAt: null,
      },
    });

    if (!oneTimeToken) {
      return false;
    }

    // Hash new password
    const hashedPassword = await SecurityUtils.hashPassword(newPassword);

    // Update password and mark token as used
    await this.prisma.$transaction([
      this.prisma.user.update({
        where: { id: oneTimeToken.userId },
        data: { password: hashedPassword },
      }),
      this.prisma.oneTimeToken.update({
        where: { id: oneTimeToken.id },
        data: { usedAt: new Date() },
      }),
    ]);

    return true;
  }
}
