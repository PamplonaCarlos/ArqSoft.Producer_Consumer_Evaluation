import express from 'express';
import { register, Counter, Histogram, Gauge } from 'prom-client';

export class PrometheusMetrics {
    private app: express.Application;
    private server: any;

    // Producer metrics
    public readonly messagesProduced = new Counter({
        name: 'kafka_messages_produced_total',
        help: 'Total number of messages produced to Kafka',
        labelNames: ['topic', 'client_id']
    });

    public readonly bytesProduced = new Counter({
        name: 'kafka_bytes_produced_total',
        help: 'Total bytes produced to Kafka',
        labelNames: ['topic', 'client_id']
    });

    public readonly producerLatency = new Histogram({
        name: 'kafka_producer_latency_ms',
        help: 'Producer latency in milliseconds',
        labelNames: ['topic', 'client_id'],
        buckets: [1, 5, 10, 25, 50, 100, 250, 500, 1000, 2500, 5000, 10000]
    });

    public readonly producerErrors = new Counter({
        name: 'kafka_producer_errors_total',
        help: 'Total number of producer errors',
        labelNames: ['topic', 'client_id', 'error_type']
    });

    // Consumer metrics
    public readonly messagesConsumed = new Counter({
        name: 'kafka_messages_consumed_total',
        help: 'Total number of messages consumed from Kafka',
        labelNames: ['topic', 'group_id', 'client_id']
    });

    public readonly bytesConsumed = new Counter({
        name: 'kafka_bytes_consumed_total',
        help: 'Total bytes consumed from Kafka',
        labelNames: ['topic', 'group_id', 'client_id']
    });

    public readonly consumerLatency = new Histogram({
        name: 'kafka_consumer_latency_ms',
        help: 'Consumer processing latency in milliseconds',
        labelNames: ['topic', 'group_id', 'client_id'],
        buckets: [1, 5, 10, 25, 50, 100, 250, 500, 1000, 2500, 5000, 10000]
    });

    public readonly consumerLag = new Gauge({
        name: 'kafka_consumer_lag',
        help: 'Consumer lag in messages',
        labelNames: ['topic', 'group_id', 'partition']
    });

    public readonly consumerErrors = new Counter({
        name: 'kafka_consumer_errors_total',
        help: 'Total number of consumer errors',
        labelNames: ['topic', 'group_id', 'client_id', 'error_type']
    });

    // System metrics
    public readonly memoryUsage = new Gauge({
        name: 'nodejs_memory_usage_bytes',
        help: 'Node.js memory usage in bytes',
        labelNames: ['type']
    });

    public readonly cpuUsage = new Gauge({
        name: 'nodejs_cpu_usage_percent',
        help: 'Node.js CPU usage percentage',
        labelNames: ['type']
    });

    constructor(port: number = 3003) {
        this.app = express();
        this.setupRoutes();
        this.startMetricsCollection();
    }

    private setupRoutes(): void {
        this.app.get('/metrics', async (req, res) => {
            res.set('Content-Type', register.contentType);
            const metrics = await register.metrics();
            res.end(metrics);
        });

        this.app.get('/health', (req, res) => {
            res.json({ status: 'healthy', timestamp: new Date().toISOString() });
        });
    }

    private startMetricsCollection(): void {
        // Collect system metrics every 5 seconds
        setInterval(() => {
            const memUsage = process.memoryUsage();
            this.memoryUsage.set({ type: 'heap_used' }, memUsage.heapUsed);
            this.memoryUsage.set({ type: 'heap_total' }, memUsage.heapTotal);
            this.memoryUsage.set({ type: 'external' }, memUsage.external);
            this.memoryUsage.set({ type: 'rss' }, memUsage.rss);

            const cpuUsage = process.cpuUsage();
            this.cpuUsage.set({ type: 'user' }, cpuUsage.user / 1000);
            this.cpuUsage.set({ type: 'system' }, cpuUsage.system / 1000);
        }, 5000);
    }

    public async start(port: number = 3003): Promise<void> {
        return new Promise((resolve) => {
            this.server = this.app.listen(port, () => {
                console.log(`📊 Prometheus metrics server started on port ${port}`);
                console.log(`   Metrics endpoint: http://localhost:${port}/metrics`);
                console.log(`   Health endpoint: http://localhost:${port}/health`);
                resolve();
            });
        });
    }

    public async stop(): Promise<void> {
        if (this.server) {
            return new Promise((resolve) => {
                this.server.close(() => {
                    console.log('📊 Prometheus metrics server stopped');
                    resolve();
                });
            });
        }
    }

    // Helper methods for recording metrics
    public recordProducedMessage(topic: string, clientId: string, messageSize: number, latencyMs: number): void {
        this.messagesProduced.inc({ topic, client_id: clientId });
        this.bytesProduced.inc({ topic, client_id: clientId }, messageSize);
        this.producerLatency.observe({ topic, client_id: clientId }, latencyMs);
    }

    public recordProducerError(topic: string, clientId: string, errorType: string): void {
        this.producerErrors.inc({ topic, client_id: clientId, error_type: errorType });
    }

    public recordConsumedMessage(topic: string, groupId: string, clientId: string, messageSize: number, latencyMs: number): void {
        this.messagesConsumed.inc({ topic, group_id: groupId, client_id: clientId });
        this.bytesConsumed.inc({ topic, group_id: groupId, client_id: clientId }, messageSize);
        this.consumerLatency.observe({ topic, group_id: groupId, client_id: clientId }, latencyMs);
    }

    public recordConsumerError(topic: string, groupId: string, clientId: string, errorType: string): void {
        this.consumerErrors.inc({ topic, group_id: groupId, client_id: clientId, error_type: errorType });
    }

    public updateConsumerLag(topic: string, groupId: string, partition: number, lag: number): void {
        this.consumerLag.set({ topic, group_id: groupId, partition: partition.toString() }, lag);
    }
}
