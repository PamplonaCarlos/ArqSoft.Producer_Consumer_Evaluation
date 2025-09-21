import { Kafka, Producer, ProducerBatch, TopicMessages } from 'kafkajs';
import { ProducerConfig, TestMessage } from '../utils/types';
import { MetricsCollector } from '../utils/metrics';
import { MessageGenerator } from '../utils/message-generator';

export class KafkaProducer {
    private kafka: Kafka;
    private producer: Producer;
    private metrics: MetricsCollector;
    private config: ProducerConfig;
    private isConnected = false;

    constructor(config: ProducerConfig) {
        this.config = config;
        this.metrics = new MetricsCollector();

        this.kafka = new Kafka({
            clientId: config.clientId,
            brokers: config.brokers,
            retry: {
                retries: config.retries || 3,
                initialRetryTime: 100,
                maxRetryTime: 30000,
            },
        });

        this.producer = this.kafka.producer({
            maxInFlightRequests: config.maxInFlightRequests || 5,
            idempotent: config.enableIdempotence || false,
            transactionTimeout: config.requestTimeout || 30000,
            allowAutoTopicCreation: true,
        });
    }

    public async connect(): Promise<void> {
        try {
            console.log('🔌 Conectando ao Kafka...');
            await this.producer.connect();
            this.isConnected = true;
            console.log('✅ Producer conectado com sucesso!');
        } catch (error) {
            console.error('❌ Erro ao conectar producer:', error);
            throw error;
        }
    }

    public async disconnect(): Promise<void> {
        try {
            if (this.isConnected) {
                await this.producer.disconnect();
                this.isConnected = false;
                console.log('🔌 Producer desconectado');
            }
        } catch (error) {
            console.error('❌ Erro ao desconectar producer:', error);
            throw error;
        }
    }

    public async sendMessage(message: TestMessage): Promise<void> {
        if (!this.isConnected) {
            throw new Error('Producer não está conectado');
        }

        const startTime = Date.now();
        try {
            await this.producer.send({
                topic: this.config.topic,
                messages: [{
                    key: message.id,
                    value: JSON.stringify(message),
                    timestamp: message.timestamp.toString(),
                }],
                acks: this.config.acks || -1,
                timeout: this.config.requestTimeout || 30000,
            });

            const latency = Date.now() - startTime;
            this.metrics.recordMessageProduced(message.size);
            this.metrics.recordLatency(latency);
        } catch (error) {
            this.metrics.recordError();
            throw error;
        }
    }

    public async sendBatch(messages: TestMessage[]): Promise<void> {
        if (!this.isConnected) {
            throw new Error('Producer não está conectado');
        }

        const startTime = Date.now();
        try {
            const kafkaMessages = messages.map(msg => ({
                key: msg.id,
                value: JSON.stringify(msg),
                timestamp: msg.timestamp.toString(),
            }));

            await this.producer.send({
                topic: this.config.topic,
                messages: kafkaMessages,
                acks: this.config.acks || -1,
                timeout: this.config.requestTimeout || 30000,
            });

            const latency = Date.now() - startTime;
            messages.forEach(msg => {
                this.metrics.recordMessageProduced(msg.size);
                this.metrics.recordLatency(latency / messages.length);
            });
        } catch (error) {
            this.metrics.recordError();
            throw error;
        }
    }

    public async runPerformanceTest(): Promise<void> {
        console.log(`🚀 Iniciando teste de performance...`);
        console.log(`📊 Configuração:`);
        console.log(`   - Mensagens: ${this.config.messageCount.toLocaleString()}`);
        console.log(`   - Tamanho da mensagem: ${this.config.messageSize} bytes`);
        console.log(`   - Batch size: ${this.config.batchSize}`);
        console.log(`   - Compressão: ${this.config.compressionType || 'none'}`);
        console.log(`   - ACKs: ${this.config.acks || -1}`);

        this.metrics.reset();

        const totalBatches = Math.ceil(this.config.messageCount / this.config.batchSize);
        let messagesSent = 0;

        for (let batch = 0; batch < totalBatches; batch++) {
            const remainingMessages = this.config.messageCount - messagesSent;
            const currentBatchSize = Math.min(this.config.batchSize, remainingMessages);

            const messages = MessageGenerator.generateBatch(
                currentBatchSize,
                this.config.messageSize,
                messagesSent
            );

            try {
                await this.sendBatch(messages);
                messagesSent += currentBatchSize;

                // Progress report
                if ((batch + 1) % 100 === 0 || batch === totalBatches - 1) {
                    const progress = ((batch + 1) / totalBatches * 100).toFixed(1);
                    console.log(`📈 Progresso: ${progress}% (${messagesSent}/${this.config.messageCount} mensagens)`);
                }
            } catch (error) {
                console.error(`❌ Erro no batch ${batch + 1}:`, error);
            }
        }

        console.log('✅ Teste de performance concluído!');
        this.metrics.printMetrics();
    }

    public async runStressTest(durationMs: number): Promise<void> {
        console.log(`🔥 Iniciando teste de stress por ${durationMs / 1000} segundos...`);

        this.metrics.reset();
        const endTime = Date.now() + durationMs;
        let messageId = 0;

        while (Date.now() < endTime) {
            try {
                const messages = MessageGenerator.generateBatch(
                    this.config.batchSize,
                    this.config.messageSize,
                    messageId
                );

                await this.sendBatch(messages);
                messageId += this.config.batchSize;

                // Small delay to prevent overwhelming
                await new Promise(resolve => setTimeout(resolve, 1));
            } catch (error) {
                console.error('❌ Erro durante stress test:', error);
            }
        }

        console.log('✅ Teste de stress concluído!');
        this.metrics.printMetrics();
    }

    public async runExhaustionTest(): Promise<void> {
        console.log('💥 Iniciando teste de exaustão do broker...');
        console.log('⚠️  ATENÇÃO: Este teste pode sobrecarregar o sistema!');

        this.metrics.reset();
        let messageId = 0;
        let consecutiveErrors = 0;
        const maxConsecutiveErrors = 10;

        while (consecutiveErrors < maxConsecutiveErrors) {
            try {
                // Generate large batches with large messages
                const largeBatchSize = Math.max(this.config.batchSize * 10, 1000);
                const largeMessageSize = Math.max(this.config.messageSize * 5, 10240);

                const messages = MessageGenerator.generateBatch(
                    largeBatchSize,
                    largeMessageSize,
                    messageId
                );

                await this.sendBatch(messages);
                messageId += largeBatchSize;
                consecutiveErrors = 0; // Reset error counter on success

                if (messageId % 10000 === 0) {
                    console.log(`📊 Mensagens enviadas: ${messageId.toLocaleString()}`);
                    this.metrics.printMetrics();
                }
            } catch (error) {
                consecutiveErrors++;
                console.error(`❌ Erro ${consecutiveErrors}/${maxConsecutiveErrors}:`, error);

                if (consecutiveErrors >= maxConsecutiveErrors) {
                    console.log('🚨 Limite de erros consecutivos atingido - Broker possivelmente exaurido!');
                    break;
                }

                // Wait before retrying
                await new Promise(resolve => setTimeout(resolve, 1000));
            }
        }

        console.log('💥 Teste de exaustão concluído!');
        this.metrics.printMetrics();
    }

    public getMetrics(): MetricsCollector {
        return this.metrics;
    }
}
