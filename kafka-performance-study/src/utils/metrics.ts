import { PerformanceMetrics } from './types';

export class MetricsCollector {
    private latencies: number[] = [];
    private messagesProduced = 0;
    private messagesConsumed = 0;
    private bytesProduced = 0;
    private bytesConsumed = 0;
    private errorCount = 0;
    private startTime: Date = new Date();

    public recordMessageProduced(messageSize: number): void {
        this.messagesProduced++;
        this.bytesProduced += messageSize;
    }

    public recordMessageConsumed(messageSize: number): void {
        this.messagesConsumed++;
        this.bytesConsumed += messageSize;
    }

    public recordLatency(latencyMs: number): void {
        this.latencies.push(latencyMs);
    }

    public recordError(): void {
        this.errorCount++;
    }

    public reset(): void {
        this.latencies = [];
        this.messagesProduced = 0;
        this.messagesConsumed = 0;
        this.bytesProduced = 0;
        this.bytesConsumed = 0;
        this.errorCount = 0;
        this.startTime = new Date();
    }

    public getMetrics(): PerformanceMetrics {
        const endTime = new Date();
        const durationMs = endTime.getTime() - this.startTime.getTime();
        const durationSec = durationMs / 1000;

        const sortedLatencies = this.latencies.sort((a, b) => a - b);
        const avgLatency = sortedLatencies.length > 0
            ? sortedLatencies.reduce((sum, lat) => sum + lat, 0) / sortedLatencies.length
            : 0;

        const p95Index = Math.floor(sortedLatencies.length * 0.95);
        const p99Index = Math.floor(sortedLatencies.length * 0.99);

        return {
            messagesProduced: this.messagesProduced,
            messagesConsumed: this.messagesConsumed,
            bytesProduced: this.bytesProduced,
            bytesConsumed: this.bytesConsumed,
            throughputMsgPerSec: (this.messagesProduced + this.messagesConsumed) / durationSec,
            throughputBytesPerSec: (this.bytesProduced + this.bytesConsumed) / durationSec,
            avgLatencyMs: avgLatency,
            minLatencyMs: sortedLatencies.length > 0 ? sortedLatencies[0] : 0,
            maxLatencyMs: sortedLatencies.length > 0 ? sortedLatencies[sortedLatencies.length - 1] : 0,
            p95LatencyMs: sortedLatencies.length > 0 ? sortedLatencies[p95Index] : 0,
            p99LatencyMs: sortedLatencies.length > 0 ? sortedLatencies[p99Index] : 0,
            errorCount: this.errorCount,
            startTime: this.startTime,
            endTime,
            durationMs
        };
    }

    public printMetrics(): void {
        const metrics = this.getMetrics();
        console.log('\n=== MÉTRICAS DE PERFORMANCE ===');
        console.log(`Mensagens Produzidas: ${metrics.messagesProduced.toLocaleString()}`);
        console.log(`Mensagens Consumidas: ${metrics.messagesConsumed.toLocaleString()}`);
        console.log(`Bytes Produzidos: ${(metrics.bytesProduced / 1024 / 1024).toFixed(2)} MB`);
        console.log(`Bytes Consumidos: ${(metrics.bytesConsumed / 1024 / 1024).toFixed(2)} MB`);
        console.log(`Throughput: ${metrics.throughputMsgPerSec.toFixed(2)} msg/s`);
        console.log(`Throughput: ${(metrics.throughputBytesPerSec / 1024 / 1024).toFixed(2)} MB/s`);
        console.log(`Latência Média: ${metrics.avgLatencyMs.toFixed(2)} ms`);
        console.log(`Latência Min: ${metrics.minLatencyMs.toFixed(2)} ms`);
        console.log(`Latência Max: ${metrics.maxLatencyMs.toFixed(2)} ms`);
        console.log(`Latência P95: ${metrics.p95LatencyMs.toFixed(2)} ms`);
        console.log(`Latência P99: ${metrics.p99LatencyMs.toFixed(2)} ms`);
        console.log(`Erros: ${metrics.errorCount}`);
        console.log(`Duração: ${(metrics.durationMs / 1000).toFixed(2)} segundos`);
        console.log('===============================\n');
    }
}
