import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as nodemailer from 'nodemailer';
import * as fs from 'fs/promises';
import * as path from 'path';
import * as handlebars from 'handlebars';

export interface EmailTemplate {
  subject: string;
  html: string;
  text: string;
}

export interface EmailData {
  to: string;
  subject: string;
  html: string;
  text?: string;
  from?: string;
}

// Template data interfaces
export interface EmailVerificationData {
  name: string;
  verificationUrl: string;
  appName?: string;
  supportEmail?: string;
}

export interface PasswordResetData {
  name: string;
  resetUrl: string;
  appName?: string;
  supportEmail?: string;
}

export interface TwoFactorCodeData {
  name: string;
  code: string;
  expirationMinutes: number;
  appName?: string;
  supportEmail?: string;
}

export interface SecurityAlertData {
  name: string;
  event: string;
  location: string;
  timestamp: string;
  appName?: string;
  supportEmail?: string;
}

export interface PasswordChangeNotificationData {
  name: string;
  appName?: string;
  supportEmail?: string;
  timestamp: string;
}

// Union type for all template data
export type TemplateData =
  | EmailVerificationData
  | PasswordResetData
  | TwoFactorCodeData
  | SecurityAlertData
  | PasswordChangeNotificationData
  | Record<string, unknown>;

// Nodemailer configuration types
export interface NodemailerConfig {
  host: string;
  port: number;
  secure: boolean;
  ignoreTLS?: boolean;
  auth?: {
    user: string;
    pass: string;
  };
}

export interface NodemailerAuthConfig {
  host: string;
  port: number;
  secure: boolean;
  ignoreTLS?: boolean;
  auth: {
    user: string;
    pass: string;
  };
}

@Injectable()
export class EmailService {
  private transporter!: nodemailer.Transporter;
  private templates: Map<string, handlebars.TemplateDelegate> = new Map();

  constructor(private configService: ConfigService) {
    void this.initializeTransporter();
    void this.loadTemplates();
  }

  private async initializeTransporter() {
    const isDevelopment = this.configService.get('NODE_ENV') === 'development';

    if (isDevelopment) {
      // Use Mailhog for development - no authentication required
      const mailhogConfig: NodemailerConfig = {
        host: this.configService.get('EMAIL_HOST', 'mailhog'),
        port: this.configService.get('EMAIL_PORT', 1025),
        secure: false,
        ignoreTLS: true,
      };
      this.transporter = nodemailer.createTransport(mailhogConfig);
    } else {
      // Use SES for production
      const emailHost = this.configService.get<string>('EMAIL_HOST');
      const sesAccessKeyId =
        this.configService.get<string>('SES_ACCESS_KEY_ID');
      const sesSecretAccessKey = this.configService.get<string>(
        'SES_SECRET_ACCESS_KEY',
      );

      if (!emailHost || !sesAccessKeyId || !sesSecretAccessKey) {
        throw new Error('Missing required email configuration for production');
      }

      const sesConfig: NodemailerAuthConfig = {
        host: emailHost,
        port: this.configService.get<number>('EMAIL_PORT', 587),
        secure: this.configService.get<boolean>('EMAIL_SECURE', false),
        auth: {
          user: sesAccessKeyId,
          pass: sesSecretAccessKey,
        },
      };
      this.transporter = nodemailer.createTransport(sesConfig);
    }

    // Verify connection
    try {
      await this.transporter.verify();
    } catch (error) {
    }
  }

  private async loadTemplates() {
    // Try multiple possible template directories
    const possiblePaths = [
      path.join(__dirname, '../../../templates/emails'),
      path.join(__dirname, '../../templates/emails'),
      path.join(process.cwd(), 'templates/emails'),
      path.join(process.cwd(), 'src/templates/emails'),
    ];

    let templatesLoaded = false;

    for (const templatesDir of possiblePaths) {
      try {
        if (
          await fs
            .access(templatesDir)
            .then(() => true)
            .catch(() => false)
        ) {
          const templateFiles = await fs.readdir(templatesDir);

          for (const file of templateFiles) {
            if (file.endsWith('.hbs')) {
              const templateName = path.basename(file, '.hbs');
              const templatePath = path.join(templatesDir, file);
              const templateContent = await fs.readFile(templatePath, 'utf-8');

              this.templates.set(
                templateName,
                handlebars.compile(templateContent),
              );
            }
          }
          templatesLoaded = true;
          break;
        }
      } catch {
        // Continue to next path
        continue;
      }
    }

    if (!templatesLoaded) {
      // Create fallback templates
      this.createFallbackTemplates();
    }
  }

  private createFallbackTemplates() {
    // Create basic fallback templates
    const emailVerificationTemplate = `
      <h2>Email Verification</h2>
      <p>Hello {{name}},</p>
      <p>Please verify your email address by clicking the link below:</p>
      <a href="{{verificationUrl}}">Verify Email</a>
      <p>If you didn't create an account, please ignore this email.</p>
      <p>Best regards,<br>{{appName}} Team</p>
    `;

    const passwordResetTemplate = `
      <h2>Password Reset</h2>
      <p>Hello {{name}},</p>
      <p>You requested a password reset. Click the link below to reset your password:</p>
      <a href="{{resetUrl}}">Reset Password</a>
      <p>If you didn't request this, please ignore this email.</p>
      <p>Best regards,<br>{{appName}} Team</p>
    `;

    this.templates.set(
      'email-verification',
      handlebars.compile(emailVerificationTemplate),
    );
    this.templates.set(
      'password-reset',
      handlebars.compile(passwordResetTemplate),
    );
  }

  async sendEmail(emailData: EmailData): Promise<void> {
    try {
      const mailOptions = {
        from:
          emailData.from ||
          this.configService.get('EMAIL_FROM', 'noreply@safawinet.com'),
        to: emailData.to,
        subject: emailData.subject,
        html: emailData.html,
        text: emailData.text || this.htmlToText(emailData.html),
      };

      const result = (await this.transporter.sendMail(mailOptions)) as {
        messageId?: string;
      };
    } catch (error) {
      throw error;
    }
  }

  async sendTemplateEmail(
    templateName: string,
    to: string,
    data: TemplateData,
    subject?: string,
  ): Promise<void> {
    const template = this.templates.get(templateName);

    if (!template) {
      throw new Error(`Email template '${templateName}' not found`);
    }

    const html = template(data);
    const emailSubject = subject || this.getDefaultSubject(templateName);

    await this.sendEmail({
      to,
      subject: emailSubject,
      html,
    });
  }

  // Predefined email methods
  async sendEmailVerification(
    to: string,
    data: EmailVerificationData,
  ): Promise<void> {
    await this.sendTemplateEmail('email-verification', to, {
      ...data,
      appName: 'Safawinet',
      supportEmail: 'support@safawinet.com',
    });
  }

  // Alias methods for backward compatibility
  async sendVerificationEmail(
    to: string,
    verificationToken: string,
  ): Promise<void> {
    const frontendDomain = this.configService.get<string>(
      'FRONTEND_DOMAIN',
      'localhost:3001',
    );
    const verificationUrl = `http://${frontendDomain}/verify-email?token=${verificationToken}`;
    await this.sendEmailVerification(to, {
      name: 'User',
      verificationUrl,
    });
  }

  async sendPasswordReset(to: string, data: PasswordResetData): Promise<void> {
    await this.sendTemplateEmail('password-reset', to, {
      ...data,
      appName: 'Safawinet',
      supportEmail: 'support@safawinet.com',
    });
  }

  // Alias method for backward compatibility
  async sendPasswordResetEmail(to: string, resetToken: string): Promise<void> {
    const frontendDomain = this.configService.get<string>(
      'FRONTEND_DOMAIN',
      'localhost:3001',
    );
    const resetUrl = `http://${frontendDomain}/reset-password?token=${resetToken}`;
    await this.sendPasswordReset(to, {
      name: 'User',
      resetUrl,
    });
  }

  async sendPasswordChangeNotificationEmail(to: string): Promise<void> {
    await this.sendTemplateEmail('password-change-notification', to, {
      name: 'User',
      appName: 'Safawinet',
      supportEmail: 'support@safawinet.com',
      timestamp: new Date().toLocaleString(),
    });
  }

  async sendSecurityAlert(to: string, data: SecurityAlertData): Promise<void> {
    await this.sendTemplateEmail('security-alert', to, {
      ...data,
      appName: 'Safawinet',
      supportEmail: 'security@safawinet.com',
    });
  }

  // Development preview methods
  previewTemplate(templateName: string, data: TemplateData): EmailTemplate {
    const template = this.templates.get(templateName);

    if (!template) {
      throw new Error(`Email template '${templateName}' not found`);
    }

    const html = template(data);
    const subject = this.getDefaultSubject(templateName);

    return {
      subject,
      html,
      text: this.htmlToText(html),
    };
  }

  previewAllTemplates(): Record<string, EmailTemplate> {
    const previews: Record<string, EmailTemplate> = {};

    for (const [templateName] of this.templates) {
      const sampleData = this.getSampleData(templateName);
      previews[templateName] = this.previewTemplate(templateName, sampleData);
    }

    return previews;
  }

  private getDefaultSubject(templateName: string): string {
    const subjects: Record<string, string> = {
      'email-verification': 'Verify your email address',
      'password-reset': 'Reset your password',
      'two-factor-code': 'Your two-factor authentication code',
      'security-alert': 'Security Alert',
    };

    return subjects[templateName] || 'Message from Safawinet';
  }

  private getSampleData(templateName: string): TemplateData {
    const sampleData: Record<string, TemplateData> = {
      'email-verification': {
        name: 'John Doe',
        verificationUrl: 'https://safawinet.com/verify?token=sample-token',
        appName: 'Safawinet',
        supportEmail: 'support@safawinet.com',
      },
      'password-reset': {
        name: 'John Doe',
        resetUrl: 'https://safawinet.com/reset?token=sample-token',
        appName: 'Safawinet',
        supportEmail: 'support@safawinet.com',
      },
      'two-factor-code': {
        name: 'John Doe',
        code: '123456',
        expirationMinutes: 10,
        appName: 'Safawinet',
        supportEmail: 'support@safawinet.com',
      },
      'security-alert': {
        name: 'John Doe',
        event: 'Password Changed',
        message:
          'Your password has been successfully changed. If you did not make this change, please contact support immediately.',
        timestamp: new Date().toLocaleString(),
        appName: 'Safawinet',
        supportEmail: 'support@safawinet.com',
      },
    };

    return sampleData[templateName] || {};
  }

  private htmlToText(html: string): string {
    // Simple HTML to text conversion
    return html
      .replace(/<[^>]*>/g, '') // Remove HTML tags
      .replace(/&nbsp;/g, ' ') // Replace &nbsp; with space
      .replace(/&amp;/g, '&') // Replace &amp; with &
      .replace(/&lt;/g, '<') // Replace &lt; with <
      .replace(/&gt;/g, '>') // Replace &gt; with >
      .replace(/&quot;/g, '"') // Replace &quot; with "
      .replace(/\s+/g, ' ') // Replace multiple spaces with single space
      .trim();
  }

  // Health check method
  async checkHealth(): Promise<boolean> {
    try {
      await this.transporter.verify();
      return true;
    } catch (error) {
      return false;
    }
  }
}
