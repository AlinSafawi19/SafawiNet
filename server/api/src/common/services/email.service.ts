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
