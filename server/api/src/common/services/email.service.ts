import { Injectable, Logger } from '@nestjs/common';
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

@Injectable()
export class EmailService {
  private readonly logger = new Logger(EmailService.name);
  private transporter: nodemailer.Transporter;
  private templates: Map<string, handlebars.TemplateDelegate> = new Map();

  constructor(private configService: ConfigService) {
    this.initializeTransporter();
    this.loadTemplates();
  }

  private async initializeTransporter() {
    const isDevelopment = this.configService.get('NODE_ENV') === 'development';
    
    if (isDevelopment) {
      // Use Mailhog for development
      this.transporter = nodemailer.createTransport({
        host: this.configService.get('EMAIL_HOST', 'localhost'),
        port: this.configService.get('EMAIL_PORT', 1025),
        secure: false,
        auth: {
          user: this.configService.get('EMAIL_USER'),
          pass: this.configService.get('EMAIL_PASS'),
        },
      });
    } else {
      // Use SES for production
      this.transporter = nodemailer.createTransport({
        host: this.configService.get('EMAIL_HOST'),
        port: this.configService.get('EMAIL_PORT', 587),
        secure: this.configService.get('EMAIL_SECURE', false),
        auth: {
          user: this.configService.get('SES_ACCESS_KEY_ID'),
          pass: this.configService.get('SES_SECRET_ACCESS_KEY'),
        },
      });
    }

    // Verify connection
    try {
      await this.transporter.verify();
      this.logger.log('Email transporter initialized successfully');
    } catch (error) {
      this.logger.error('Failed to initialize email transporter:', error);
    }
  }

  private async loadTemplates() {
    const templatesDir = path.join(__dirname, '../../../templates/emails');
    
    try {
      const templateFiles = await fs.readdir(templatesDir);
      
      for (const file of templateFiles) {
        if (file.endsWith('.hbs')) {
          const templateName = path.basename(file, '.hbs');
          const templatePath = path.join(templatesDir, file);
          const templateContent = await fs.readFile(templatePath, 'utf-8');
          
          this.templates.set(templateName, handlebars.compile(templateContent));
          this.logger.log(`Loaded email template: ${templateName}`);
        }
      }
    } catch (error) {
      this.logger.warn('No email templates found or error loading templates:', error);
    }
  }

  async sendEmail(emailData: EmailData): Promise<void> {
    try {
      const mailOptions = {
        from: emailData.from || this.configService.get('EMAIL_FROM', 'noreply@safawinet.com'),
        to: emailData.to,
        subject: emailData.subject,
        html: emailData.html,
        text: emailData.text || this.htmlToText(emailData.html),
      };

      const result = await this.transporter.sendMail(mailOptions);
      this.logger.log(`Email sent successfully to ${emailData.to}: ${result.messageId}`);
    } catch (error) {
      this.logger.error(`Failed to send email to ${emailData.to}:`, error);
      throw error;
    }
  }

  async sendTemplateEmail(
    templateName: string,
    to: string,
    data: Record<string, any>,
    subject?: string
  ): Promise<void> {
    const template = this.templates.get(templateName);
    
    if (!template) {
      throw new Error(`Email template '${templateName}' not found`);
    }

    const html = template(data);
    const emailSubject = subject || this.getDefaultSubject(templateName, data);

    await this.sendEmail({
      to,
      subject: emailSubject,
      html,
    });
  }

  // Predefined email methods
  async sendEmailVerification(to: string, data: { name: string; verificationUrl: string }): Promise<void> {
    await this.sendTemplateEmail('email-verification', to, {
      ...data,
      appName: 'Safawinet',
      supportEmail: 'support@safawinet.com',
    });
  }

  async sendPasswordReset(to: string, data: { name: string; resetUrl: string }): Promise<void> {
    await this.sendTemplateEmail('password-reset', to, {
      ...data,
      appName: 'Safawinet',
      supportEmail: 'support@safawinet.com',
    });
  }

  async sendWelcomeEmail(to: string, data: { name: string }): Promise<void> {
    await this.sendTemplateEmail('welcome', to, {
      ...data,
      appName: 'Safawinet',
      loginUrl: `${this.configService.get('API_DOMAIN')}/login`,
    });
  }

  async sendTwoFactorSetup(to: string, data: { name: string; qrCode: string; backupCodes: string[] }): Promise<void> {
    await this.sendTemplateEmail('two-factor-setup', to, {
      ...data,
      appName: 'Safawinet',
    });
  }

  async sendSecurityAlert(to: string, data: { name: string; event: string; location: string; timestamp: string }): Promise<void> {
    await this.sendTemplateEmail('security-alert', to, {
      ...data,
      appName: 'Safawinet',
      supportEmail: 'security@safawinet.com',
    });
  }

  // Development preview methods
  async previewTemplate(templateName: string, data: Record<string, any>): Promise<EmailTemplate> {
    const template = this.templates.get(templateName);
    
    if (!template) {
      throw new Error(`Email template '${templateName}' not found`);
    }

    const html = template(data);
    const subject = this.getDefaultSubject(templateName, data);

    return {
      subject,
      html,
      text: this.htmlToText(html),
    };
  }

  async previewAllTemplates(): Promise<Record<string, EmailTemplate>> {
    const previews: Record<string, EmailTemplate> = {};
    
    for (const [templateName] of this.templates) {
      const sampleData = this.getSampleData(templateName);
      previews[templateName] = await this.previewTemplate(templateName, sampleData);
    }

    return previews;
  }

  private getDefaultSubject(templateName: string, data: Record<string, any>): string {
    const subjects: Record<string, string> = {
      'email-verification': 'Verify your email address',
      'password-reset': 'Reset your password',
      'welcome': 'Welcome to Safawinet!',
      'two-factor-setup': 'Set up two-factor authentication',
      'security-alert': 'Security alert - New login detected',
    };

    return subjects[templateName] || 'Message from Safawinet';
  }

  private getSampleData(templateName: string): Record<string, any> {
    const sampleData: Record<string, any> = {
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
      'welcome': {
        name: 'John Doe',
        appName: 'Safawinet',
        loginUrl: 'https://safawinet.com/login',
      },
      'two-factor-setup': {
        name: 'John Doe',
        qrCode: 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkYPhfDwAChwGA60e6kgAAAABJRU5ErkJggg==',
        backupCodes: ['12345678', '87654321', '11111111', '22222222', '33333333'],
        appName: 'Safawinet',
      },
      'security-alert': {
        name: 'John Doe',
        event: 'New login',
        location: 'New York, NY, USA',
        timestamp: new Date().toLocaleString(),
        appName: 'Safawinet',
        supportEmail: 'security@safawinet.com',
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
      this.logger.error('Email service health check failed:', error);
      return false;
    }
  }
}
