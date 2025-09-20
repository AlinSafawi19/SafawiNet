import { Injectable, OnModuleInit, OnModuleDestroy } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Queue, Worker, Job, JobsOptions } from 'bullmq';
import { RedisService } from './redis.service';

export interface EmailJobData {
  to: string;
  subject: string;
  template: string;
  context: Record<string, string | number | boolean | null | undefined>;
}

export interface SecurityJobData {
  type: 'token_cleanup' | 'session_cleanup' | 'notification_cleanup';
  userId?: string;
  data?: Record<string, string | number | boolean | null | undefined>;
}

export interface MaintenanceJobData {
  type: 'db_cleanup' | 'log_rotation' | 'health_check';
  data?: Record<string, string | number | boolean | null | undefined>;
}

export interface QueueStatus {
  waiting: Job[];
  active: Job[];
  completed: Job[];
  failed: Job[];
}

export interface AllQueuesStatus {
  email: QueueStatus;
  security: QueueStatus;
  maintenance: QueueStatus;
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
  ) {}

  onModuleInit() {
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
    // Queue events are handled by workers, not queues directly
    // This method is kept for future queue-specific events if needed
  }

  private setupWorkerEvents() {
    [this.emailWorker, this.securityWorker, this.maintenanceWorker].forEach(
      (worker) => {
        worker.on('completed', () => {});

        worker.on('failed', () => {});
      },
    );
  }

  // Queue methods
  async addEmailJob(data: EmailJobData, options?: JobsOptions) {
    return this.emailQueue.add('send-email', data, options);
  }

  async addSecurityJob(data: SecurityJobData, options?: JobsOptions) {
    return this.securityQueue.add('security-task', data, options);
  }

  async addMaintenanceJob(data: MaintenanceJobData, options?: JobsOptions) {
    return this.maintenanceQueue.add('maintenance-task', data, options);
  }

  // Job processing methods
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  private async processEmailJob(_job: Job<EmailJobData>) {
    // TODO: Implement actual email sending logic
    // This would integrate with your existing EmailService

    await new Promise((resolve) => setTimeout(resolve, 100)); // Simulate processing
  }

  private async processSecurityJob(job: Job<SecurityJobData>) {
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
  }

  private async processMaintenanceJob(job: Job<MaintenanceJobData>) {
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
  }

  // Queue status methods
  async getQueueStatus(): Promise<AllQueuesStatus> {
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
