#!/usr/bin/env node

import { Command } from 'commander';
import { KafkaConsumer } from './kafka-consumer';
import { ConsumerConfig } from '../utils/types';

const program = new Command();

program
    .name('kafka-consumer')
    .description('Kafka Consumer para testes de performance')
    .version('1.0.0');

program
    .command('performance')
    .description('Executa teste de performance básico do consumer')
    .option('-b, --brokers <brokers>', 'Lista de brokers Kafka', 'localhost:9092')
    .option('-t, --topic <topic>', 'Tópico Kafka', 'performance-test')
    .option('-g, --group <group>', 'Consumer Group ID', 'performance-consumer-group')
    .option('-d, --duration <duration>', 'Duração em segundos', '60')
    .option('--session-timeout <timeout>', 'Session timeout em ms', '30000')
    .option('--max-wait <wait>', 'Max wait time em ms', '5000')
    .action(async (options) => {
        const config: ConsumerConfig = {
            clientId: 'performance-consumer',
            groupId: options.group,
            brokers: options.brokers.split(','),
            topic: options.topic,
            sessionTimeout: parseInt(options.sessionTimeout),
            maxWaitTime: parseInt(options.maxWait),
        };

        const consumer = new KafkaConsumer(config);

        try {
            await consumer.connect();
            await consumer.runPerformanceTest(parseInt(options.duration) * 1000);
        } catch (error) {
            console.error('❌ Erro durante teste de performance:', error);
            process.exit(1);
        } finally {
            await consumer.disconnect();
        }
    });

program
    .command('continuous')
    .description('Executa consumer contínuo (Ctrl+C para parar)')
    .option('-b, --brokers <brokers>', 'Lista de brokers Kafka', 'localhost:9092')
    .option('-t, --topic <topic>', 'Tópico Kafka', 'performance-test')
    .option('-g, --group <group>', 'Consumer Group ID', 'continuous-consumer-group')
    .option('--from-beginning', 'Consumir desde o início do tópico', false)
    .option('--report-interval <interval>', 'Intervalo de relatório em segundos', '10')
    .action(async (options) => {
        const config: ConsumerConfig = {
            clientId: 'continuous-consumer',
            groupId: options.group,
            brokers: options.brokers.split(','),
            topic: options.topic,
        };

        const consumer = new KafkaConsumer(config);

        try {
            await consumer.connect();

            if (options.fromBeginning) {
                await consumer.seekToBeginning();
            }

            await consumer.runContinuousConsumer(parseInt(options.reportInterval) * 1000);
        } catch (error) {
            console.error('❌ Erro durante consumo contínuo:', error);
            process.exit(1);
        } finally {
            await consumer.disconnect();
        }
    });

program
    .command('stress')
    .description('Executa teste de stress do consumer')
    .option('-b, --brokers <brokers>', 'Lista de brokers Kafka', 'localhost:9092')
    .option('-t, --topic <topic>', 'Tópico Kafka', 'stress-test')
    .option('-g, --group <group>', 'Consumer Group ID', 'stress-consumer-group')
    .option('-d, --duration <duration>', 'Duração em segundos', '60')
    .action(async (options) => {
        const config: ConsumerConfig = {
            clientId: 'stress-consumer',
            groupId: options.group,
            brokers: options.brokers.split(','),
            topic: options.topic,
            maxWaitTime: 1000, // Reduced wait time for stress testing
            minBytes: 1,
            maxBytes: 10485760, // 10MB for large batches
        };

        const consumer = new KafkaConsumer(config);

        try {
            await consumer.connect();
            await consumer.runStressTest(parseInt(options.duration) * 1000);
        } catch (error) {
            console.error('❌ Erro durante teste de stress:', error);
            process.exit(1);
        } finally {
            await consumer.disconnect();
        }
    });

program
    .command('lag-test')
    .description('Testa consumer lag com diferentes configurações')
    .option('-b, --brokers <brokers>', 'Lista de brokers Kafka', 'localhost:9092')
    .option('-t, --topic <topic>', 'Tópico Kafka', 'lag-test')
    .option('-g, --group <group>', 'Consumer Group ID', 'lag-test-group')
    .option('-d, --duration <duration>', 'Duração em segundos', '300')
    .option('--slow-processing', 'Simular processamento lento', false)
    .action(async (options) => {
        const config: ConsumerConfig = {
            clientId: 'lag-test-consumer',
            groupId: options.group,
            brokers: options.brokers.split(','),
            topic: options.topic,
            maxWaitTime: 1000,
        };

        const consumer = new KafkaConsumer(config);

        try {
            await consumer.connect();

            if (options.slowProcessing) {
                console.log('🐌 Simulando processamento lento...');
                // Override the message processing to add delays
                const originalStart = consumer.start.bind(consumer);
                consumer.start = async function () {
                    await originalStart();
                    // Add artificial delay to simulate slow processing
                    setTimeout(() => { }, 100); // 100ms delay per message
                };
            }

            await consumer.runPerformanceTest(parseInt(options.duration) * 1000);
        } catch (error) {
            console.error('❌ Erro durante teste de lag:', error);
            process.exit(1);
        } finally {
            await consumer.disconnect();
        }
    });

program
    .command('seek')
    .description('Controla posição do consumer no tópico')
    .option('-b, --brokers <brokers>', 'Lista de brokers Kafka', 'localhost:9092')
    .option('-t, --topic <topic>', 'Tópico Kafka', 'performance-test')
    .option('-g, --group <group>', 'Consumer Group ID', 'seek-consumer-group')
    .option('--to-beginning', 'Voltar para o início', false)
    .option('--to-end', 'Pular para o final', false)
    .action(async (options) => {
        if (!options.toBeginning && !options.toEnd) {
            console.error('❌ Especifique --to-beginning ou --to-end');
            process.exit(1);
        }

        const config: ConsumerConfig = {
            clientId: 'seek-consumer',
            groupId: options.group,
            brokers: options.brokers.split(','),
            topic: options.topic,
        };

        const consumer = new KafkaConsumer(config);

        try {
            await consumer.connect();

            if (options.toBeginning) {
                await consumer.seekToBeginning();
            } else if (options.toEnd) {
                await consumer.seekToEnd();
            }

            console.log('✅ Posição do consumer atualizada');
        } catch (error) {
            console.error('❌ Erro ao atualizar posição:', error);
            process.exit(1);
        } finally {
            await consumer.disconnect();
        }
    });

if (require.main === module) {
    program.parse();
}
