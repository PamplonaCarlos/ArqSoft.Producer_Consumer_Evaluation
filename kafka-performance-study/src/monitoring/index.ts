#!/usr/bin/env node

import { Command } from 'commander';
import { PrometheusMetrics } from './prometheus-metrics';
import { KafkaMonitor } from './kafka-monitor';

const program = new Command();

program
    .name('kafka-monitoring')
    .description('Ferramentas de monitoramento para Kafka')
    .version('1.0.0');

program
    .command('start')
    .description('Inicia servidor de monitoramento completo')
    .option('-b, --brokers <brokers>', 'Lista de brokers Kafka', 'localhost:9092')
    .option('-p, --port <port>', 'Porta do servidor de métricas', '3003')
    .option('--interval <interval>', 'Intervalo de monitoramento em segundos', '30')
    .action(async (options) => {
        const metrics = new PrometheusMetrics();
        const monitor = new KafkaMonitor(options.brokers.split(','), metrics);

        // Graceful shutdown
        process.on('SIGINT', async () => {
            console.log('\n🛑 Recebido sinal de parada...');
            await monitor.stopMonitoring();
            await monitor.disconnect();
            await metrics.stop();
            process.exit(0);
        });

        try {
            // Start metrics server
            await metrics.start(parseInt(options.port));

            // Connect to Kafka and start monitoring
            await monitor.connect();
            await monitor.printClusterInfo();
            await monitor.startMonitoring(parseInt(options.interval) * 1000);

            console.log('🔄 Monitoramento ativo. Pressione Ctrl+C para parar.');

            // Keep the process alive
            await new Promise(() => { });
        } catch (error) {
            console.error('❌ Erro durante monitoramento:', error);
            process.exit(1);
        }
    });

program
    .command('cluster-info')
    .description('Mostra informações do cluster Kafka')
    .option('-b, --brokers <brokers>', 'Lista de brokers Kafka', 'localhost:9092')
    .action(async (options) => {
        const metrics = new PrometheusMetrics();
        const monitor = new KafkaMonitor(options.brokers.split(','), metrics);

        try {
            await monitor.connect();
            await monitor.printClusterInfo();
        } catch (error) {
            console.error('❌ Erro ao obter informações do cluster:', error);
            process.exit(1);
        } finally {
            await monitor.disconnect();
        }
    });

program
    .command('consumer-lag')
    .description('Mostra lag dos consumer groups')
    .option('-b, --brokers <brokers>', 'Lista de brokers Kafka', 'localhost:9092')
    .option('-g, --group <group>', 'Consumer Group ID específico')
    .action(async (options) => {
        const metrics = new PrometheusMetrics();
        const monitor = new KafkaMonitor(options.brokers.split(','), metrics);

        try {
            await monitor.connect();

            if (options.group) {
                console.log(`\n=== LAG DO CONSUMER GROUP: ${options.group} ===`);
                const lag = await monitor.getConsumerGroupLag(options.group);

                if (lag.length === 0) {
                    console.log('Nenhum lag encontrado ou grupo não existe');
                } else {
                    lag.forEach(info => {
                        console.log(`Tópico: ${info.topic}, Partição: ${info.partition}`);
                        console.log(`  Offset atual: ${info.currentOffset}`);
                        console.log(`  High watermark: ${info.highWatermark}`);
                        console.log(`  Lag: ${info.lag} mensagens`);
                    });
                }
            } else {
                const groups = await monitor.getConsumerGroups();
                console.log('\n=== LAG DE TODOS OS CONSUMER GROUPS ===');

                for (const group of groups) {
                    console.log(`\n👥 Grupo: ${group.groupId} (${group.state})`);
                    const lag = await monitor.getConsumerGroupLag(group.groupId);

                    if (lag.length === 0) {
                        console.log('  Nenhum lag encontrado');
                    } else {
                        lag.forEach(info => {
                            console.log(`  ${info.topic}[${info.partition}]: ${info.lag} mensagens de lag`);
                        });
                    }
                }
            }

        } catch (error) {
            console.error('❌ Erro ao obter lag dos consumers:', error);
            process.exit(1);
        } finally {
            await monitor.disconnect();
        }
    });

program
    .command('create-topic')
    .description('Cria um tópico Kafka')
    .option('-b, --brokers <brokers>', 'Lista de brokers Kafka', 'localhost:9092')
    .option('-t, --topic <topic>', 'Nome do tópico', 'test-topic')
    .option('-p, --partitions <partitions>', 'Número de partições', '3')
    .option('-r, --replication <replication>', 'Fator de replicação', '1')
    .action(async (options) => {
        const metrics = new PrometheusMetrics();
        const monitor = new KafkaMonitor(options.brokers.split(','), metrics);

        try {
            await monitor.connect();
            await monitor.createTopic(
                options.topic,
                parseInt(options.partitions),
                parseInt(options.replication)
            );
        } catch (error) {
            console.error('❌ Erro ao criar tópico:', error);
            process.exit(1);
        } finally {
            await monitor.disconnect();
        }
    });

program
    .command('delete-topic')
    .description('Deleta um tópico Kafka')
    .option('-b, --brokers <brokers>', 'Lista de brokers Kafka', 'localhost:9092')
    .option('-t, --topic <topic>', 'Nome do tópico', 'test-topic')
    .action(async (options) => {
        const metrics = new PrometheusMetrics();
        const monitor = new KafkaMonitor(options.brokers.split(','), metrics);

        try {
            await monitor.connect();
            await monitor.deleteTopic(options.topic);
        } catch (error) {
            console.error('❌ Erro ao deletar tópico:', error);
            process.exit(1);
        } finally {
            await monitor.disconnect();
        }
    });

program
    .command('topic-offsets')
    .description('Mostra offsets de um tópico')
    .option('-b, --brokers <brokers>', 'Lista de brokers Kafka', 'localhost:9092')
    .option('-t, --topic <topic>', 'Nome do tópico', 'test-topic')
    .action(async (options) => {
        const metrics = new PrometheusMetrics();
        const monitor = new KafkaMonitor(options.brokers.split(','), metrics);

        try {
            await monitor.connect();
            const offsets = await monitor.getTopicOffsets(options.topic);

            console.log(`\n=== OFFSETS DO TÓPICO: ${options.topic} ===`);
            offsets.forEach(offset => {
                console.log(`Partição ${offset.partition}:`);
                console.log(`  Low: ${offset.low}`);
                console.log(`  High: ${offset.high}`);
                console.log(`  Total mensagens: ${parseInt(offset.high) - parseInt(offset.low)}`);
            });

        } catch (error) {
            console.error('❌ Erro ao obter offsets do tópico:', error);
            process.exit(1);
        } finally {
            await monitor.disconnect();
        }
    });

if (require.main === module) {
    program.parse();
}
