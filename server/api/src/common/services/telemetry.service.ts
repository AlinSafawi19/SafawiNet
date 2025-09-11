import { Injectable, OnModuleInit, OnModuleDestroy } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { NodeSDK } from '@opentelemetry/sdk-node';
import { SemanticResourceAttributes } from '@opentelemetry/semantic-conventions';
import { getNodeAutoInstrumentations } from '@opentelemetry/auto-instrumentations-node';
import { OTLPTraceExporter } from '@opentelemetry/exporter-otlp-http';
import { OTLPMetricExporter } from '@opentelemetry/exporter-otlp-http';
import { PeriodicExportingMetricReader } from '@opentelemetry/sdk-metrics';
import { trace, metrics } from '@opentelemetry/api';

@Injectable()
export class TelemetryService implements OnModuleInit, OnModuleDestroy {
  private sdk?: NodeSDK;

  constructor(private configService: ConfigService) {}

  async onModuleInit() {
    const environment = this.configService.get<string>(
      'NODE_ENV',
      'development',
    );
    const serviceName = this.configService.get<string>(
      'OTEL_SERVICE_NAME',
      'safawinet-api',
    );
    const otelEndpoint = this.configService.get<string>('OTEL_ENDPOINT');

    if (!otelEndpoint) {
      console.warn(
        'OTEL_ENDPOINT not configured, skipping OpenTelemetry setup',
      );
      return;
    }

    // Create metric exporter with forceFlush method
    const metricExporter = new OTLPMetricExporter({
      url: `${otelEndpoint}/v1/metrics`,
    });

    // Add forceFlush method to satisfy the interface
    const metricExporterWithForceFlush = {
      ...metricExporter,
      forceFlush: async () => {
        // OTLPMetricExporter doesn't have forceFlush, so we'll implement a no-op
        return Promise.resolve();
      },
      export: metricExporter.export.bind(metricExporter),
      shutdown: metricExporter.shutdown.bind(metricExporter),
    };

    this.sdk = new NodeSDK({
      traceExporter: new OTLPTraceExporter({
        url: `${otelEndpoint}/v1/traces`,
      }) as any, // Type assertion to resolve compatibility issues
      metricReader: new PeriodicExportingMetricReader({
        exporter: metricExporterWithForceFlush,
        exportIntervalMillis: 1000,
      }),
      instrumentations: [
        getNodeAutoInstrumentations({
          // The auto-instrumentations will handle HTTP and Express automatically
        }),
      ],
    });

    try {
      await this.sdk.start();
      console.log('OpenTelemetry SDK started successfully');
    } catch (error) {
      console.error('Failed to start OpenTelemetry SDK:', error);
    }
  }

  async onModuleDestroy() {
    if (this.sdk) {
      try {
        await this.sdk.shutdown();
        console.log('OpenTelemetry SDK shutdown successfully');
      } catch (error) {
        console.error('Failed to shutdown OpenTelemetry SDK:', error);
      }
    }
  }

  // Helper methods for manual instrumentation
  getTracer(name: string) {
    return trace.getTracer(name);
  }

  getMeter(name: string) {
    return metrics.getMeter(name);
  }

  // Create a span for manual tracing
  createSpan(name: string, attributes?: Record<string, any>) {
    const tracer = this.getTracer('safawinet-api');
    return tracer.startSpan(name, { attributes });
  }
}
