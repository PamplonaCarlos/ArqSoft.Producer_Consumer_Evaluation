export interface ProducerConfig {
    clientId: string;
    brokers: string[];
    topic: string;
    messageCount: number;
    batchSize: number;
    messageSize: number;
    compressionType?: 'none' | 'gzip' | 'snappy' | 'lz4' | 'zstd';
    acks?: number;
    requestTimeout?: number;
    retries?: number;
    enableIdempotence?: boolean;
    maxInFlightRequests?: number;
    lingerMs?: number;
    batchSizeBytes?: number;
}

export interface ConsumerConfig {
    clientId: string;
    groupId: string;
    brokers: string[];
    topic: string;
    sessionTimeout?: number;
    rebalanceTimeout?: number;
    heartbeatInterval?: number;
    maxWaitTime?: number;
    minBytes?: number;
    maxBytes?: number;
    maxBytesPerPartition?: number;
    autoCommit?: boolean;
    autoCommitInterval?: number;
}

export interface PerformanceMetrics {
    messagesProduced: number;
    messagesConsumed: number;
    bytesProduced: number;
    bytesConsumed: number;
    throughputMsgPerSec: number;
    throughputBytesPerSec: number;
    avgLatencyMs: number;
    minLatencyMs: number;
    maxLatencyMs: number;
    p95LatencyMs: number;
    p99LatencyMs: number;
    errorCount: number;
    startTime: Date;
    endTime: Date;
    durationMs: number;
}

export interface TestMessage {
    id: string;
    timestamp: number;
    payload: string;
    size: number;
}

export interface TestResult {
    testName: string;
    config: ProducerConfig | ConsumerConfig;
    metrics: PerformanceMetrics;
    errors: string[];
    memoryUsage: {
        heapUsed: number;
        heapTotal: number;
        external: number;
        rss: number;
    };
}
