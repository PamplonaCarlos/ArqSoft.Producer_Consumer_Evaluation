#!/usr/bin/env node

const { spawn } = require('child_process');
const path = require('path');

// Test configurations
const testConfigs = [
    {
        name: 'Baseline Test',
        description: 'Teste básico com configurações padrão',
        producer: {
            topic: 'performance-test',
            count: 10000,
            size: 1024,
            batchSize: 100,
            compression: 'none',
            acks: -1,
        },
        consumer: {
            topic: 'performance-test',
            group: 'perf-test-group',
            duration: 60,
        },
    },
    {
        name: 'High Throughput Test',
        description: 'Teste otimizado para alto throughput',
        producer: {
            topic: 'performance-test',
            count: 50000,
            size: 512,
            batchSize: 1000,
            compression: 'snappy',
            acks: 1,
        },
        consumer: {
            topic: 'performance-test',
            group: 'high-throughput-group',
            duration: 120,
        },
    },
    {
        name: 'Large Messages Test',
        description: 'Teste com mensagens grandes',
        producer: {
            topic: 'performance-test',
            count: 5000,
            size: 10240, // 10KB
            batchSize: 50,
            compression: 'gzip',
            acks: -1,
        },
        consumer: {
            topic: 'performance-test',
            group: 'large-msg-group',
            duration: 120,
        },
    },
    {
        name: 'Low Latency Test',
        description: 'Teste otimizado para baixa latência',
        producer: {
            topic: 'performance-test',
            count: 20000,
            size: 256,
            batchSize: 1,
            compression: 'none',
            acks: 1,
        },
        consumer: {
            topic: 'performance-test',
            group: 'low-latency-group',
            duration: 90,
        },
    },
];

function runCommand(command, args) {
    return new Promise((resolve, reject) => {
        console.log(`🚀 Executando: ${command} ${args.join(' ')}`);

        const child = spawn(command, args, {
            stdio: 'inherit',
            cwd: path.join(__dirname, '..'),
        });

        child.on('close', (code) => {
            if (code === 0) {
                resolve();
            } else {
                reject(new Error(`Comando falhou com código ${code}`));
            }
        });

        child.on('error', (error) => {
            reject(error);
        });
    });
}

async function runProducerTest(config) {
    const args = [
        'src/producer/index.ts',
        'performance',
        '--topic', config.producer.topic,
        '--count', config.producer.count.toString(),
        '--size', config.producer.size.toString(),
        '--batch-size', config.producer.batchSize.toString(),
        '--compression', config.producer.compression,
        '--acks', config.producer.acks.toString(),
    ];

    await runCommand('npx', ['ts-node', ...args]);
}

async function runConsumerTest(config) {
    const args = [
        'src/consumer/index.ts',
        'performance',
        '--topic', config.consumer.topic,
        '--group', config.consumer.group,
        '--duration', config.consumer.duration.toString(),
    ];

    return runCommand('npx', ['ts-node', ...args]);
}

async function runFullTest(config) {
    console.log('\n' + '='.repeat(60));
    console.log(`🧪 EXECUTANDO: ${config.name}`);
    console.log(`📋 ${config.description}`);
    console.log('='.repeat(60));

    try {
        // Start consumer first
        console.log('\n📥 Iniciando consumer...');
        const consumerPromise = runConsumerTest(config);

        // Wait a bit for consumer to start
        await new Promise(resolve => setTimeout(resolve, 5000));

        // Start producer
        console.log('\n📤 Iniciando producer...');
        await runProducerTest(config);

        // Wait for consumer to finish
        console.log('\n⏳ Aguardando consumer finalizar...');
        await consumerPromise;

        console.log(`✅ ${config.name} concluído com sucesso!`);

    } catch (error) {
        console.error(`❌ Erro no teste ${config.name}:`, error.message);
    }
}

async function runAllTests() {
    console.log('🚀 INICIANDO BATERIA DE TESTES DE PERFORMANCE');
    console.log(`📊 Total de testes: ${testConfigs.length}`);

    const startTime = Date.now();

    for (let i = 0; i < testConfigs.length; i++) {
        const config = testConfigs[i];
        console.log(`\n[${i + 1}/${testConfigs.length}] Executando: ${config.name}`);

        await runFullTest(config);

        // Wait between tests
        if (i < testConfigs.length - 1) {
            console.log('\n⏸️ Aguardando 10 segundos antes do próximo teste...');
            await new Promise(resolve => setTimeout(resolve, 10000));
        }
    }

    const totalTime = (Date.now() - startTime) / 1000;
    console.log('\n' + '='.repeat(60));
    console.log('🏁 TODOS OS TESTES CONCLUÍDOS!');
    console.log(`⏱️ Tempo total: ${totalTime.toFixed(2)} segundos`);
    console.log('='.repeat(60));
}

async function runSingleTest(testName) {
    const config = testConfigs.find(c => c.name.toLowerCase().includes(testName.toLowerCase()));

    if (!config) {
        console.error(`❌ Teste '${testName}' não encontrado.`);
        console.log('📋 Testes disponíveis:');
        testConfigs.forEach((c, i) => {
            console.log(`   ${i + 1}. ${c.name}`);
        });
        process.exit(1);
    }

    await runFullTest(config);
}

// Main execution
if (require.main === module) {
    const args = process.argv.slice(2);

    if (args.length === 0) {
        runAllTests().catch(error => {
            console.error('❌ Erro durante execução dos testes:', error);
            process.exit(1);
        });
    } else {
        const testName = args[0];
        runSingleTest(testName).catch(error => {
            console.error('❌ Erro durante execução do teste:', error);
            process.exit(1);
        });
    }
}
