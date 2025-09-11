import { Injectable, OnModuleInit, OnModuleDestroy } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Queue, Worker, Job } from 'bullmq';
import { RedisService } from './redis.service';
import { PinoLoggerService } from './logger.service';

export interface EmailJobData {
  to: string;
  subject: string;
  template: string;
  context: Record<string, any>;
}

export interface SecurityJobData {
  type: 'token_cleanup' | 'session_cleanup' | 'notification_cleanup';
  userId?: string;
  data?: Record<string, any>;
}

export interface MaintenanceJobData {
  type: 'db_cleanup' | 'log_rotation' | 'health_check';
  data?: Record<string, any>;
}

@Injectable()
export class QueueService implements OnModuleInit, OnModuleDestroy {
  private emailQueue!: Queue<EmailJobData>;
  private securityQueue!: Queue<SecurityJobData>;
  private maintenanceQueue!: Queue<MaintenanceJobData>;

  private emailWorker!: Worker<EmailJobData>;
  private securityWorker!: Worker<SecurityJobData>;
  private maintenanceWorker!: Worker<MaintenanceJobData>;

  constructor(
    private configService: ConfigService,
    private redisService: RedisService,
    private logger: PinoLoggerService,
  ) {}

  async onModuleInit() {
    const prefix = this.configService.get<string>('BULLMQ_PREFIX', 'safawinet');
    const connection = this.redisService.getClient();

    // Initialize queues
    this.emailQueue = new Queue<EmailJobData>('email', {
      connection,
      prefix,
      defaultJobOptions: {
        attempts: 3,
        backoff: {
          type: 'exponential',
          delay: 2000,
        },
        removeOnComplete: 100,
        removeOnFail: 50,
      },
    });

    this.securityQueue = new Queue<SecurityJobData>('security', {
      connection,
      prefix,
      defaultJobOptions: {
        attempts: 2,
        backoff: {
          type: 'exponential',
          delay: 5000,
        },
        removeOnComplete: 1000,
        removeOnFail: 100,
      },
    });

    this.maintenanceQueue = new Queue<MaintenanceJobData>('maintenance', {
      connection,
      prefix,
      defaultJobOptions: {
        attempts: 1,
        removeOnComplete: 100,
        removeOnFail: 50,
      },
    });

    // Initialize workers
    this.emailWorker = new Worker<EmailJobData>(
      'email',
      async (job) => {
        await this.processEmailJob(job);
      },
      {
        connection,
        prefix,
        concurrency: 5,
      },
    );

    this.securityWorker = new Worker<SecurityJobData>(
      'security',
      async (job) => {
        await this.processSecurityJob(job);
      },
      {
        connection,
        prefix,
        concurrency: 3,
      },
    );

    this.maintenanceWorker = new Worker<MaintenanceJobData>(
      'maintenance',
      async (job) => {
        await this.processMaintenanceJob(job);
      },
      {
        connection,
        prefix,
        concurrency: 2,
      },
    );

    // Set up event handlers
    this.setupQueueEvents();
    this.setupWorkerEvents();

    this.logger.log('Queue service initialized successfully');
  }

  async onModuleDestroy() {
    await this.emailQueue.close();
    await this.securityQueue.close();
    await this.maintenanceQueue.close();
    await this.emailWorker.close();
    await this.securityWorker.close();
    await this.maintenanceWorker.close();
  }

  private setupQueueEvents() {
    [this.emailQueue, this.securityQueue, this.maintenanceQueue].forEach(
      (queue) => {
        (queue as any).on('completed', (job: any) => {
          this.logger.log(
            `Job ${job.id} completed successfully`,
            'QueueService',
          );
        });

        (queue as any).on('failed', (job: any, err: any) => {
          this.logger.error(
            `Job ${job?.id} failed: ${err.message}`,
            err.stack,
            'QueueService',
          );
        });
      },
    );
  }

  private setupWorkerEvents() {
    [this.emailWorker, this.securityWorker, this.maintenanceWorker].forEach(
      (worker) => {
        worker.on('completed', (job) => {
          this.logger.log(`Worker completed job ${job.id}`, 'QueueService');
        });

        worker.on('failed', (job, err) => {
          this.logger.error(
            `Worker failed job ${job?.id}: ${err.message}`,
            err.stack,
            'QueueService',
          );
        });
      },
    );
  }

  // Queue methods
  async addEmailJob(data: EmailJobData, options?: any) {
    return this.emailQueue.add('send-email', data, options);
  }

  async addSecurityJob(data: SecurityJobData, options?: any) {
    return this.securityQueue.add('security-task', data, options);
  }

  async addMaintenanceJob(data: MaintenanceJobData, options?: any) {
    return this.maintenanceQueue.add('maintenance-task', data, options);
  }

  // Job processing methods
  private async processEmailJob(job: Job<EmailJobData>) {
    this.logger.log(
      `Processing email job ${job.id} to ${job.data.to}`,
      'QueueService',
    );

    // TODO: Implement actual email sending logic
    // This would integrate with your existing EmailService

    await new Promise((resolve) => setTimeout(resolve, 100)); // Simulate processing
    this.logger.log(`Email job ${job.id} completed`, 'QueueService');
  }

  private async processSecurityJob(job: Job<SecurityJobData>) {
    this.logger.log(
      `Processing security job ${job.id} of type ${job.data.type}`,
      'QueueService',
    );

    switch (job.data.type) {
      case 'token_cleanup':
        // TODO: Implement token cleanup logic
        break;
      case 'session_cleanup':
        // TODO: Implement session cleanup logic
        break;
      case 'notification_cleanup':
        // TODO: Implement notification cleanup logic
        break;
    }

    await new Promise((resolve) => setTimeout(resolve, 200)); // Simulate processing
    this.logger.log(`Security job ${job.id} completed`, 'QueueService');
  }

  private async processMaintenanceJob(job: Job<MaintenanceJobData>) {
    this.logger.log(
      `Processing maintenance job ${job.id} of type ${job.data.type}`,
      'QueueService',
    );

    switch (job.data.type) {
      case 'db_cleanup':
        // TODO: Implement database cleanup logic
        break;
      case 'log_rotation':
        // TODO: Implement log rotation logic
        break;
      case 'health_check':
        // TODO: Implement health check logic
        break;
    }

    await new Promise((resolve) => setTimeout(resolve, 500)); // Simulate processing
    this.logger.log(`Maintenance job ${job.id} completed`, 'QueueService');
  }

  // Queue status methods
  async getQueueStatus() {
    return {
      email: {
        waiting: await this.emailQueue.getWaiting(),
        active: await this.emailQueue.getActive(),
        completed: await this.emailQueue.getCompleted(),
        failed: await this.emailQueue.getFailed(),
      },
      security: {
        waiting: await this.securityQueue.getWaiting(),
        active: await this.securityQueue.getActive(),
        completed: await this.securityQueue.getCompleted(),
        failed: await this.securityQueue.getFailed(),
      },
      maintenance: {
        waiting: await this.maintenanceQueue.getWaiting(),
        active: await this.maintenanceQueue.getActive(),
        completed: await this.maintenanceQueue.getCompleted(),
        failed: await this.maintenanceQueue.getFailed(),
      },
    };
  }
}
