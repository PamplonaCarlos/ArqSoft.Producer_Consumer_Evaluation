#!/usr/bin/env node

const { spawn } = require('child_process');
const path = require('path');

// Stress test configurations
const stressConfigs = [
    {
        name: 'Light Stress',
        description: 'Stress leve - 30 segundos de carga moderada',
        duration: 30,
        producers: 2,
        consumers: 2,
        messageSize: 1024,
        batchSize: 500,
    },
    {
        name: 'Medium Stress',
        description: 'Stress médio - 60 segundos com múltiplos producers/consumers',
        duration: 60,
        producers: 4,
        consumers: 4,
        messageSize: 2048,
        batchSize: 1000,
    },
    {
        name: 'Heavy Stress',
        description: 'Stress pesado - 120 segundos com alta carga',
        duration: 120,
        producers: 8,
        consumers: 6,
        messageSize: 4096,
        batchSize: 1500,
    },
    {
        name: 'Extreme Stress',
        description: 'Stress extremo - 180 segundos com carga máxima',
        duration: 180,
        producers: 16,
        consumers: 12,
        messageSize: 8192,
        batchSize: 2000,
    },
];

function runCommand(command, args, name) {
    return new Promise((resolve, reject) => {
        console.log(`🚀 [${name}] Iniciando: ${command} ${args.join(' ')}`);

        const child = spawn(command, args, {
            stdio: ['ignore', 'pipe', 'pipe'],
            cwd: path.join(__dirname, '..'),
        });

        let output = '';
        let errorOutput = '';

        child.stdout.on('data', (data) => {
            const text = data.toString();
            output += text;
            // Only log important lines to avoid spam
            if (text.includes('Throughput') || text.includes('Latência') || text.includes('concluído')) {
                console.log(`📊 [${name}] ${text.trim()}`);
            }
        });

        child.stderr.on('data', (data) => {
            const text = data.toString();
            errorOutput += text;
            if (text.includes('ERROR') || text.includes('❌')) {
                console.error(`❌ [${name}] ${text.trim()}`);
            }
        });

        child.on('close', (code) => {
            if (code === 0) {
                console.log(`✅ [${name}] Concluído com sucesso`);
                resolve({ output, errorOutput });
            } else {
                console.error(`❌ [${name}] Falhou com código ${code}`);
                reject(new Error(`[${name}] Comando falhou com código ${code}`));
            }
        });

        child.on('error', (error) => {
            console.error(`❌ [${name}] Erro:`, error.message);
            reject(error);
        });
    });
}

async function runStressProducer(config, index) {
    const args = [
        'src/producer/index.ts',
        'stress',
        '--topic', 'stress-test',
        '--duration', config.duration.toString(),
        '--size', config.messageSize.toString(),
        '--batch-size', config.batchSize.toString(),
    ];

    return runCommand('npx', ['ts-node', ...args], `Producer-${index + 1}`);
}

async function runStressConsumer(config, index) {
    const args = [
        'src/consumer/index.ts',
        'stress',
        '--topic', 'stress-test',
        '--group', `stress-consumer-group-${index + 1}`,
        '--duration', (config.duration + 30).toString(), // Run a bit longer than producers
    ];

    return runCommand('npx', ['ts-node', ...args], `Consumer-${index + 1}`);
}

async function monitorSystem(duration) {
    console.log('📊 Iniciando monitoramento do sistema...');

    const monitorArgs = [
        'src/monitoring/index.ts',
        'start',
        '--interval', '10',
    ];

    const monitorPromise = runCommand('npx', ['ts-node', ...monitorArgs], 'Monitor');

    // Stop monitoring after duration + buffer
    setTimeout(() => {
        console.log('⏹️ Parando monitoramento...');
        // The monitoring will be stopped by the process cleanup
    }, (duration + 60) * 1000);

    return monitorPromise;
}

async function runStressTest(config) {
    console.log('\n' + '='.repeat(80));
    console.log(`🔥 EXECUTANDO STRESS TEST: ${config.name}`);
    console.log(`📋 ${config.description}`);
    console.log(`⚙️ Configuração:`);
    console.log(`   - Duração: ${config.duration} segundos`);
    console.log(`   - Producers: ${config.producers}`);
    console.log(`   - Consumers: ${config.consumers}`);
    console.log(`   - Tamanho da mensagem: ${config.messageSize} bytes`);
    console.log(`   - Batch size: ${config.batchSize}`);
    console.log('='.repeat(80));

    const startTime = Date.now();
    const processes = [];

    try {
        // Start monitoring
        const monitorPromise = monitorSystem(config.duration);
        processes.push(monitorPromise);

        // Wait for monitoring to start
        await new Promise(resolve => setTimeout(resolve, 3000));

        // Start consumers first
        console.log(`📥 Iniciando ${config.consumers} consumers...`);
        for (let i = 0; i < config.consumers; i++) {
            const consumerPromise = runStressConsumer(config, i);
            processes.push(consumerPromise);
        }

        // Wait for consumers to start
        await new Promise(resolve => setTimeout(resolve, 5000));

        // Start producers
        console.log(`📤 Iniciando ${config.producers} producers...`);
        for (let i = 0; i < config.producers; i++) {
            const producerPromise = runStressProducer(config, i);
            processes.push(producerPromise);
        }

        // Wait for all producers to complete
        console.log('⏳ Aguardando producers completarem...');
        const producerPromises = processes.slice(-config.producers);
        await Promise.all(producerPromises);

        console.log('📤 Todos os producers concluídos!');

        // Wait a bit more for consumers to catch up
        console.log('⏳ Aguardando consumers processarem mensagens restantes...');
        await new Promise(resolve => setTimeout(resolve, 30000));

        const endTime = Date.now();
        const totalTime = (endTime - startTime) / 1000;

        console.log(`✅ ${config.name} concluído!`);
        console.log(`⏱️ Tempo total: ${totalTime.toFixed(2)} segundos`);

    } catch (error) {
        console.error(`❌ Erro durante stress test ${config.name}:`, error.message);
    } finally {
        // Clean up any remaining processes
        console.log('🧹 Limpando processos...');
        // Note: In a real scenario, you'd want to properly terminate child processes
    }
}

async function runAllStressTests() {
    console.log('🔥 INICIANDO BATERIA DE STRESS TESTS');
    console.log(`📊 Total de testes: ${stressConfigs.length}`);

    const startTime = Date.now();

    for (let i = 0; i < stressConfigs.length; i++) {
        const config = stressConfigs[i];
        console.log(`\n[${i + 1}/${stressConfigs.length}] Executando: ${config.name}`);

        await runStressTest(config);

        // Wait between tests to let system recover
        if (i < stressConfigs.length - 1) {
            console.log('\n⏸️ Aguardando 30 segundos para recuperação do sistema...');
            await new Promise(resolve => setTimeout(resolve, 30000));
        }
    }

    const totalTime = (Date.now() - startTime) / 1000;
    console.log('\n' + '='.repeat(80));
    console.log('🏁 TODOS OS STRESS TESTS CONCLUÍDOS!');
    console.log(`⏱️ Tempo total: ${(totalTime / 60).toFixed(2)} minutos`);
    console.log('='.repeat(80));
}

async function runSingleStressTest(testName) {
    const config = stressConfigs.find(c => c.name.toLowerCase().includes(testName.toLowerCase()));

    if (!config) {
        console.error(`❌ Stress test '${testName}' não encontrado.`);
        console.log('📋 Testes disponíveis:');
        stressConfigs.forEach((c, i) => {
            console.log(`   ${i + 1}. ${c.name}`);
        });
        process.exit(1);
    }

    await runStressTest(config);
}

// Graceful shutdown
process.on('SIGINT', () => {
    console.log('\n🛑 Recebido sinal de parada. Finalizando stress tests...');
    process.exit(0);
});

// Main execution
if (require.main === module) {
    const args = process.argv.slice(2);

    if (args.length === 0) {
        runAllStressTests().catch(error => {
            console.error('❌ Erro durante execução dos stress tests:', error);
            process.exit(1);
        });
    } else {
        const testName = args[0];
        runSingleStressTest(testName).catch(error => {
            console.error('❌ Erro durante execução do stress test:', error);
            process.exit(1);
        });
    }
}
