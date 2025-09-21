#!/usr/bin/env node

import { Command } from 'commander';
import { KafkaProducer } from './kafka-producer';
import { ProducerConfig } from '../utils/types';

const program = new Command();

program
    .name('kafka-producer')
    .description('Kafka Producer para testes de performance')
    .version('1.0.0');

program
    .command('performance')
    .description('Executa teste de performance básico')
    .option('-b, --brokers <brokers>', 'Lista de brokers Kafka', 'localhost:9092')
    .option('-t, --topic <topic>', 'Tópico Kafka', 'performance-test')
    .option('-c, --count <count>', 'Número de mensagens', '10000')
    .option('-s, --size <size>', 'Tamanho da mensagem em bytes', '1024')
    .option('--batch-size <batchSize>', 'Tamanho do batch', '100')
    .option('--compression <compression>', 'Tipo de compressão', 'none')
    .option('--acks <acks>', 'Configuração de ACKs', '-1')
    .action(async (options) => {
        const config: ProducerConfig = {
            clientId: 'performance-producer',
            brokers: options.brokers.split(','),
            topic: options.topic,
            messageCount: parseInt(options.count),
            messageSize: parseInt(options.size),
            batchSize: parseInt(options.batchSize),
            compressionType: options.compression as any,
            acks: parseInt(options.acks),
        };

        const producer = new KafkaProducer(config);

        try {
            await producer.connect();
            await producer.runPerformanceTest();
        } catch (error) {
            console.error('❌ Erro durante teste de performance:', error);
            process.exit(1);
        } finally {
            await producer.disconnect();
        }
    });

program
    .command('stress')
    .description('Executa teste de stress')
    .option('-b, --brokers <brokers>', 'Lista de brokers Kafka', 'localhost:9092')
    .option('-t, --topic <topic>', 'Tópico Kafka', 'stress-test')
    .option('-d, --duration <duration>', 'Duração em segundos', '60')
    .option('-s, --size <size>', 'Tamanho da mensagem em bytes', '1024')
    .option('--batch-size <batchSize>', 'Tamanho do batch', '500')
    .action(async (options) => {
        const config: ProducerConfig = {
            clientId: 'stress-producer',
            brokers: options.brokers.split(','),
            topic: options.topic,
            messageCount: 0, // Not used in stress test
            messageSize: parseInt(options.size),
            batchSize: parseInt(options.batchSize),
            acks: 1, // Faster for stress testing
        };

        const producer = new KafkaProducer(config);

        try {
            await producer.connect();
            await producer.runStressTest(parseInt(options.duration) * 1000);
        } catch (error) {
            console.error('❌ Erro durante teste de stress:', error);
            process.exit(1);
        } finally {
            await producer.disconnect();
        }
    });

program
    .command('exhaustion')
    .description('Executa teste de exaustão do broker')
    .option('-b, --brokers <brokers>', 'Lista de brokers Kafka', 'localhost:9092')
    .option('-t, --topic <topic>', 'Tópico Kafka', 'exhaustion-test')
    .option('-s, --size <size>', 'Tamanho da mensagem em bytes', '10240')
    .option('--batch-size <batchSize>', 'Tamanho do batch', '1000')
    .action(async (options) => {
        const config: ProducerConfig = {
            clientId: 'exhaustion-producer',
            brokers: options.brokers.split(','),
            topic: options.topic,
            messageCount: 0, // Not used in exhaustion test
            messageSize: parseInt(options.size),
            batchSize: parseInt(options.batchSize),
            acks: 0, // Fire and forget for maximum throughput
        };

        const producer = new KafkaProducer(config);

        try {
            await producer.connect();
            await producer.runExhaustionTest();
        } catch (error) {
            console.error('❌ Erro durante teste de exaustão:', error);
            process.exit(1);
        } finally {
            await producer.disconnect();
        }
    });

program
    .command('custom')
    .description('Executa teste personalizado')
    .option('-b, --brokers <brokers>', 'Lista de brokers Kafka', 'localhost:9092')
    .option('-t, --topic <topic>', 'Tópico Kafka', 'custom-test')
    .option('-c, --count <count>', 'Número de mensagens', '1000')
    .option('-s, --size <size>', 'Tamanho da mensagem em bytes', '1024')
    .option('--batch-size <batchSize>', 'Tamanho do batch', '100')
    .option('--compression <compression>', 'Tipo de compressão', 'none')
    .option('--acks <acks>', 'Configuração de ACKs', '-1')
    .option('--idempotent', 'Habilitar idempotência', false)
    .option('--max-in-flight <maxInFlight>', 'Máximo de requests em paralelo', '5')
    .action(async (options) => {
        const config: ProducerConfig = {
            clientId: 'custom-producer',
            brokers: options.brokers.split(','),
            topic: options.topic,
            messageCount: parseInt(options.count),
            messageSize: parseInt(options.size),
            batchSize: parseInt(options.batchSize),
            compressionType: options.compression as any,
            acks: parseInt(options.acks),
            enableIdempotence: options.idempotent,
            maxInFlightRequests: parseInt(options.maxInFlight),
        };

        const producer = new KafkaProducer(config);

        try {
            await producer.connect();
            await producer.runPerformanceTest();
        } catch (error) {
            console.error('❌ Erro durante teste personalizado:', error);
            process.exit(1);
        } finally {
            await producer.disconnect();
        }
    });

if (require.main === module) {
    program.parse();
}
