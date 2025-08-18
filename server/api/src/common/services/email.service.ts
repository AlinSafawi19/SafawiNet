import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as nodemailer from 'nodemailer';

export interface EmailOptions {
  to: string;
  subject: string;
  html?: string;
  text?: string;
  from?: string;
}

export interface EmailProvider {
  sendEmail(options: EmailOptions): Promise<void>;
}

@Injectable()
export class EmailService {
  private readonly logger = new Logger(EmailService.name);
  private readonly provider: EmailProvider;

  constructor(private readonly configService: ConfigService) {
    const nodeEnv = this.configService.get('NODE_ENV', 'development');
    
    if (nodeEnv === 'production') {
      // TODO: Implement SES provider
      this.provider = new ConsoleEmailProvider();
      this.logger.warn('SES provider not implemented, using console fallback');
    } else {
      this.provider = new MailhogEmailProvider(
        this.configService.get('MAIL_HOST', 'localhost'),
        parseInt(this.configService.get('MAIL_PORT', '1025'))
      );
    }
  }

  async sendEmail(options: EmailOptions): Promise<void> {
    try {
      await this.provider.sendEmail(options);
      this.logger.log(`Email sent successfully to ${options.to}`);
    } catch (error) {
      this.logger.error(`Failed to send email to ${options.to}:`, error);
      throw error;
    }
  }

  async sendVerificationEmail(email: string, token: string): Promise<void> {
    const verificationUrl = `${this.configService.get('FRONTEND_URL', 'http://localhost:3000')}/verify-email?token=${token}`;
    
    await this.sendEmail({
      to: email,
      subject: 'Verify Your Email',
      html: `
        <h1>Welcome to SafawiNet!</h1>
        <p>Please verify your email address by clicking the link below:</p>
        <a href="${verificationUrl}">Verify Email</a>
        <p>This link will expire in 24 hours.</p>
      `,
      text: `Welcome to SafawiNet! Please verify your email: ${verificationUrl}`,
    });
  }

  async sendPasswordResetEmail(email: string, token: string): Promise<void> {
    const resetUrl = `${this.configService.get('FRONTEND_URL', 'http://localhost:3000')}/reset-password?token=${token}`;
    
    await this.sendEmail({
      to: email,
      subject: 'Reset Your Password',
      html: `
        <h1>Password Reset Request</h1>
        <p>Click the link below to reset your password:</p>
        <a href="${resetUrl}">Reset Password</a>
        <p>This link will expire in 1 hour.</p>
        <p>If you didn't request this, please ignore this email.</p>
      `,
      text: `Password reset link: ${resetUrl}`,
    });
  }

  async sendRecoveryEmail(recoveryEmail: string, token: string, currentEmail: string): Promise<void> {
    const recoveryUrl = `${this.configService.get('FRONTEND_URL', 'http://localhost:3000')}/recover/confirm?token=${token}`;
    
    await this.sendEmail({
      to: recoveryEmail,
      subject: 'Account Recovery Request',
      html: `
        <h1>Account Recovery Request</h1>
        <p>We received a request to recover your account associated with: <strong>${currentEmail}</strong></p>
        <p>Click the link below to confirm the recovery and set a new email address:</p>
        <a href="${recoveryUrl}">Confirm Account Recovery</a>
        <p>This link will expire in 30 minutes.</p>
        <p>If you didn't request this recovery, please ignore this email and ensure your account is secure.</p>
        <p><strong>Security Note:</strong> This recovery process will invalidate all your current sessions for security.</p>
      `,
      text: `Account recovery link: ${recoveryUrl} - Expires in 30 minutes`,
    });
  }

  async sendEmailChangeConfirmationEmail(newEmail: string, token: string): Promise<void> {
    const confirmationUrl = `${this.configService.get('FRONTEND_URL', 'http://localhost:3000')}/confirm-email-change?token=${token}`;
    
    await this.sendEmail({
      to: newEmail,
      subject: 'Confirm Email Change',
      html: `
        <h1>Confirm Email Change</h1>
        <p>You have requested to change your email address to: <strong>${newEmail}</strong></p>
        <p>Click the link below to confirm this change:</p>
        <a href="${confirmationUrl}">Confirm Email Change</a>
        <p>This link will expire in 1 hour.</p>
        <p>If you didn't request this change, please ignore this email and ensure your account is secure.</p>
        <p><strong>Security Note:</strong> After confirming, you will need to sign in with your new email address.</p>
      `,
      text: `Email change confirmation link: ${confirmationUrl} - Expires in 1 hour`,
    });
  }

  async sendPasswordChangeNotificationEmail(email: string): Promise<void> {
    await this.sendEmail({
      to: email,
      subject: 'Password Changed Successfully',
      html: `
        <h1>Password Changed Successfully</h1>
        <p>Your password has been changed successfully.</p>
        <p><strong>Security Note:</strong> All your active sessions have been revoked for security. You will need to sign in again.</p>
        <p>If you didn't make this change, please contact support immediately.</p>
        <p>Time: ${new Date().toLocaleString()}</p>
      `,
      text: `Your password has been changed successfully. All active sessions have been revoked.`,
    });
  }
}

// Mailhog provider for development
class MailhogEmailProvider implements EmailProvider {
  private transporter: nodemailer.Transporter;

  constructor(
    private readonly host: string,
    private readonly port: number
  ) {
    this.transporter = nodemailer.createTransport({
      host: this.host,
      port: this.port,
      secure: false, // Mailhog doesn't use SSL
      ignoreTLS: true, // Ignore TLS for local development
    });
  }

  async sendEmail(options: EmailOptions): Promise<void> {
    try {
      await this.transporter.sendMail({
        from: options.from || 'noreply@safawinet.com',
        to: options.to,
        subject: options.subject,
        html: options.html,
        text: options.text,
      });
      
      console.log(`📧 [MAILHOG] Email sent successfully to ${options.to}`);
      console.log(`   Mailhog UI: http://localhost:8025`);
    } catch (error) {
      console.error('📧 [MAILHOG] Failed to send email:', error);
      throw error;
    }
  }
}

// Console provider as fallback
class ConsoleEmailProvider implements EmailProvider {
  async sendEmail(options: EmailOptions): Promise<void> {
    console.log('📧 [CONSOLE] Email would be sent:');
    console.log(`   To: ${options.to}`);
    console.log(`   Subject: ${options.subject}`);
    console.log(`   Content: ${options.html || options.text}`);
  }
}
