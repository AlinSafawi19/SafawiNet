import { Injectable, OnModuleInit, OnModuleDestroy } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { NodeSDK } from '@opentelemetry/sdk-node';
// import { SemanticResourceAttributes } from '@opentelemetry/semantic-conventions';
import { getNodeAutoInstrumentations } from '@opentelemetry/auto-instrumentations-node';
import { OTLPTraceExporter } from '@opentelemetry/exporter-otlp-http';
import { trace, SpanAttributes } from '@opentelemetry/api';

@Injectable()
export class TelemetryService implements OnModuleInit, OnModuleDestroy {
  private sdk?: NodeSDK;

  constructor(private configService: ConfigService) {}

  onModuleInit() {
    const otelEndpoint = this.configService.get<string>('OTEL_ENDPOINT');

    if (!otelEndpoint) {
      return;
    }

    try {
      // Create trace exporter only - simpler and more reliable
      const traceExporter = new OTLPTraceExporter({
        url: `${otelEndpoint}/v1/traces`,
      });

      this.sdk = new NodeSDK({
        traceExporter: traceExporter as any,
        instrumentations: [
          getNodeAutoInstrumentations({
            // Disable problematic instrumentations
            '@opentelemetry/instrumentation-fs': { enabled: false },
            '@opentelemetry/instrumentation-dns': { enabled: false },
            '@opentelemetry/instrumentation-net': { enabled: false },
          }),
        ],
      });

      this.sdk.start();
    } catch (error) {
      console.warn('Failed to initialize telemetry SDK', error, {
        source: 'telemetry',
        otelEndpoint,
      });
      // Continue without telemetry - don't crash the app
    }
  }

  async onModuleDestroy() {
    if (this.sdk) {
      try {
        await this.sdk.shutdown();
      } catch (error) {
        console.warn('Failed to shutdown telemetry SDK', error, {
          source: 'telemetry',
        });
      }
    }
  }

  // Helper methods for manual instrumentation
  getTracer(name: string) {
    return trace.getTracer(name);
  }

  // Metrics functionality removed - using traces only
  // getMeter(name: string) {
  //   return metrics.getMeter(name);
  // }

  // Create a span for manual tracing
  createSpan(name: string, attributes?: SpanAttributes) {
    const tracer = this.getTracer('safawinet-api');
    return tracer.startSpan(name, { attributes });
  }
}
