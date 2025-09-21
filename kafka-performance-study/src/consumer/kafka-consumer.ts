import { Kafka, Consumer, EachMessagePayload } from 'kafkajs';
import { ConsumerConfig, TestMessage } from '../utils/types';
import { MetricsCollector } from '../utils/metrics';

export class KafkaConsumer {
    private kafka: Kafka;
    private consumer: Consumer;
    private metrics: MetricsCollector;
    private config: ConsumerConfig;
    private isConnected = false;
    private isRunning = false;
    private processedMessages = 0;
    private lastMessageTime = 0;

    constructor(config: ConsumerConfig) {
        this.config = config;
        this.metrics = new MetricsCollector();

        this.kafka = new Kafka({
            clientId: config.clientId,
            brokers: config.brokers,
            retry: {
                retries: 3,
                initialRetryTime: 100,
                maxRetryTime: 30000,
            },
        });

        this.consumer = this.kafka.consumer({
            groupId: config.groupId,
            sessionTimeout: config.sessionTimeout || 30000,
            rebalanceTimeout: config.rebalanceTimeout || 60000,
            heartbeatInterval: config.heartbeatInterval || 3000,
            maxWaitTimeInMs: config.maxWaitTime || 5000,
            minBytes: config.minBytes || 1,
            maxBytes: config.maxBytes || 1048576, // 1MB
            maxBytesPerPartition: config.maxBytesPerPartition || 1048576,
            allowAutoTopicCreation: true,
        });
    }

    public async connect(): Promise<void> {
        try {
            console.log('🔌 Conectando consumer ao Kafka...');
            await this.consumer.connect();
            await this.consumer.subscribe({ topic: this.config.topic, fromBeginning: false });
            this.isConnected = true;
            console.log('✅ Consumer conectado com sucesso!');
        } catch (error) {
            console.error('❌ Erro ao conectar consumer:', error);
            throw error;
        }
    }

    public async disconnect(): Promise<void> {
        try {
            if (this.isRunning) {
                await this.stop();
            }
            if (this.isConnected) {
                await this.consumer.disconnect();
                this.isConnected = false;
                console.log('🔌 Consumer desconectado');
            }
        } catch (error) {
            console.error('❌ Erro ao desconectar consumer:', error);
            throw error;
        }
    }

    private async processMessage(payload: EachMessagePayload): Promise<void> {
        const startTime = Date.now();

        try {
            const messageValue = payload.message.value?.toString();
            if (!messageValue) return;

            const testMessage: TestMessage = JSON.parse(messageValue);
            const messageSize = Buffer.byteLength(messageValue, 'utf8');

            // Calculate latency (current time - message timestamp)
            const latency = startTime - testMessage.timestamp;

            this.metrics.recordMessageConsumed(messageSize);
            this.metrics.recordLatency(latency);

            this.processedMessages++;
            this.lastMessageTime = startTime;

            // Auto-commit handling
            if (this.config.autoCommit !== false) {
                // KafkaJS handles auto-commit automatically
            }
        } catch (error) {
            this.metrics.recordError();
            console.error('❌ Erro ao processar mensagem:', error);
        }
    }

    public async start(): Promise<void> {
        if (!this.isConnected) {
            throw new Error('Consumer não está conectado');
        }

        console.log('🚀 Iniciando consumer...');
        this.isRunning = true;
        this.metrics.reset();

        await this.consumer.run({
            eachMessage: async (payload) => {
                await this.processMessage(payload);
            },
        });
    }

    public async stop(): Promise<void> {
        if (this.isRunning) {
            console.log('⏹️ Parando consumer...');
            this.isRunning = false;
            await this.consumer.stop();
            console.log('✅ Consumer parado');
        }
    }

    public async runPerformanceTest(durationMs: number): Promise<void> {
        console.log(`🚀 Iniciando teste de performance do consumer por ${durationMs / 1000} segundos...`);
        console.log(`📊 Configuração:`);
        console.log(`   - Tópico: ${this.config.topic}`);
        console.log(`   - Grupo: ${this.config.groupId}`);
        console.log(`   - Session timeout: ${this.config.sessionTimeout || 30000} ms`);
        console.log(`   - Max wait time: ${this.config.maxWaitTime || 5000} ms`);

        this.metrics.reset();
        this.processedMessages = 0;

        // Start consuming
        const consumePromise = this.start();

        // Wait for specified duration
        await new Promise(resolve => setTimeout(resolve, durationMs));

        // Stop consuming
        await this.stop();

        console.log('✅ Teste de performance do consumer concluído!');
        console.log(`📈 Mensagens processadas: ${this.processedMessages.toLocaleString()}`);
        this.metrics.printMetrics();
    }

    public async runContinuousConsumer(reportIntervalMs = 10000): Promise<void> {
        console.log('🔄 Iniciando consumer contínuo...');
        console.log('   Pressione Ctrl+C para parar');

        this.metrics.reset();
        this.processedMessages = 0;

        // Setup graceful shutdown
        process.on('SIGINT', async () => {
            console.log('\n🛑 Recebido sinal de parada...');
            await this.stop();
            this.metrics.printMetrics();
            process.exit(0);
        });

        // Start consuming
        const consumePromise = this.start();

        // Periodic reporting
        const reportInterval = setInterval(() => {
            console.log(`📊 Mensagens processadas: ${this.processedMessages.toLocaleString()}`);
            if (this.processedMessages > 0) {
                const currentMetrics = this.metrics.getMetrics();
                console.log(`   Throughput: ${currentMetrics.throughputMsgPerSec.toFixed(2)} msg/s`);
                console.log(`   Latência média: ${currentMetrics.avgLatencyMs.toFixed(2)} ms`);
            }
        }, reportIntervalMs);

        try {
            await consumePromise;
        } finally {
            clearInterval(reportInterval);
        }
    }

    public async runStressTest(durationMs: number): Promise<void> {
        console.log(`🔥 Iniciando teste de stress do consumer por ${durationMs / 1000} segundos...`);

        this.metrics.reset();
        this.processedMessages = 0;

        // Start consuming with minimal delays
        const consumePromise = this.consumer.run({
            eachMessage: async (payload) => {
                await this.processMessage(payload);
                // No artificial delays - consume as fast as possible
            },
        });

        // Progress reporting during stress test
        const progressInterval = setInterval(() => {
            console.log(`📈 Mensagens processadas: ${this.processedMessages.toLocaleString()}`);
            const currentMetrics = this.metrics.getMetrics();
            if (currentMetrics.messagesConsumed > 0) {
                console.log(`   Throughput atual: ${currentMetrics.throughputMsgPerSec.toFixed(2)} msg/s`);
            }
        }, 5000);

        // Wait for specified duration
        await new Promise(resolve => setTimeout(resolve, durationMs));

        // Stop consuming
        clearInterval(progressInterval);
        await this.stop();

        console.log('✅ Teste de stress do consumer concluído!');
        this.metrics.printMetrics();
    }

    public async seekToBeginning(): Promise<void> {
        if (!this.isConnected) {
            throw new Error('Consumer não está conectado');
        }

        console.log('⏪ Voltando para o início do tópico...');
        await this.consumer.seek({ topic: this.config.topic, partition: 0, offset: '0' });
        console.log('✅ Posição resetada para o início');
    }

    public async seekToEnd(): Promise<void> {
        if (!this.isConnected) {
            throw new Error('Consumer não está conectado');
        }

        console.log('⏩ Pulando para o final do tópico...');
        // Get latest offset and seek to it
        const admin = this.kafka.admin();
        await admin.connect();

        try {
            const offsets = await admin.fetchTopicOffsets(this.config.topic);
            for (const offset of offsets) {
                await this.consumer.seek({
                    topic: this.config.topic,
                    partition: offset.partition,
                    offset: offset.high
                });
            }
            console.log('✅ Posição definida para o final');
        } finally {
            await admin.disconnect();
        }
    }

    public getMetrics(): MetricsCollector {
        return this.metrics;
    }

    public getProcessedMessages(): number {
        return this.processedMessages;
    }

    public getLastMessageTime(): number {
        return this.lastMessageTime;
    }
}
