#!/usr/bin/env node

const { spawn } = require('child_process');
const path = require('path');
const os = require('os');

// Exhaustion test configurations
const exhaustionConfigs = [
    {
        name: 'Memory Exhaustion',
        description: 'Testa exaustão de memória com mensagens muito grandes',
        producers: 4,
        consumers: 2,
        messageSize: 1048576, // 1MB
        batchSize: 100,
        maxDuration: 300, // 5 minutes max
    },
    {
        name: 'Connection Exhaustion',
        description: 'Testa exaustão de conexões com muitos producers/consumers',
        producers: 50,
        consumers: 30,
        messageSize: 1024,
        batchSize: 1000,
        maxDuration: 180, // 3 minutes max
    },
    {
        name: 'Disk Exhaustion',
        description: 'Testa exaustão de disco com alto volume de mensagens',
        producers: 8,
        consumers: 4,
        messageSize: 10240, // 10KB
        batchSize: 2000,
        maxDuration: 600, // 10 minutes max
    },
    {
        name: 'Network Exhaustion',
        description: 'Testa exaustão de rede com throughput extremo',
        producers: 16,
        consumers: 8,
        messageSize: 4096,
        batchSize: 5000,
        maxDuration: 240, // 4 minutes max
    },
];

function runCommand(command, args, name) {
    return new Promise((resolve, reject) => {
        console.log(`🚀 [${name}] Iniciando processo de exaustão...`);

        const child = spawn(command, args, {
            stdio: ['ignore', 'pipe', 'pipe'],
            cwd: path.join(__dirname, '..'),
        });

        let output = '';
        let errorOutput = '';
        let messageCount = 0;

        child.stdout.on('data', (data) => {
            const text = data.toString();
            output += text;

            // Count messages and log progress
            const lines = text.split('\n');
            lines.forEach(line => {
                if (line.includes('mensagens enviadas') || line.includes('Mensagens processadas')) {
                    const match = line.match(/(\d{1,3}(?:,\d{3})*)/);
                    if (match) {
                        messageCount = parseInt(match[1].replace(/,/g, ''));
                    }
                }

                if (line.includes('Throughput') || line.includes('Latência') ||
                    line.includes('concluído') || line.includes('exaurido')) {
                    console.log(`📊 [${name}] ${line.trim()}`);
                }
            });
        });

        child.stderr.on('data', (data) => {
            const text = data.toString();
            errorOutput += text;

            if (text.includes('ERROR') || text.includes('❌') ||
                text.includes('ECONNREFUSED') || text.includes('timeout')) {
                console.error(`❌ [${name}] ${text.trim()}`);
            }
        });

        child.on('close', (code) => {
            console.log(`🏁 [${name}] Processo finalizado (código: ${code}, mensagens: ${messageCount.toLocaleString()})`);
            resolve({ output, errorOutput, messageCount, exitCode: code });
        });

        child.on('error', (error) => {
            console.error(`❌ [${name}] Erro no processo:`, error.message);
            reject(error);
        });

        return child;
    });
}

async function runExhaustionProducer(config, index) {
    const args = [
        'src/producer/index.ts',
        'exhaustion',
        '--topic', 'exhaustion-test',
        '--size', config.messageSize.toString(),
        '--batch-size', config.batchSize.toString(),
    ];

    return runCommand('npx', ['ts-node', ...args], `ExhProd-${index + 1}`);
}

async function runExhaustionConsumer(config, index) {
    const args = [
        'src/consumer/index.ts',
        'continuous',
        '--topic', 'exhaustion-test',
        '--group', `exhaustion-consumer-group-${index + 1}`,
        '--report-interval', '15',
    ];

    return runCommand('npx', ['ts-node', ...args], `ExhCons-${index + 1}`);
}

async function monitorSystemResources() {
    console.log('📊 Iniciando monitoramento de recursos do sistema...');

    const interval = setInterval(() => {
        const memUsage = process.memoryUsage();
        const cpuUsage = process.cpuUsage();
        const loadAvg = os.loadavg();
        const freeMemory = os.freemem();
        const totalMemory = os.totalmem();

        console.log(`🖥️ Sistema - CPU Load: [${loadAvg.map(l => l.toFixed(2)).join(', ')}], ` +
            `RAM: ${((totalMemory - freeMemory) / 1024 / 1024 / 1024).toFixed(2)}GB/${(totalMemory / 1024 / 1024 / 1024).toFixed(2)}GB`);

        console.log(`📱 Node.js - Heap: ${(memUsage.heapUsed / 1024 / 1024).toFixed(2)}MB/${(memUsage.heapTotal / 1024 / 1024).toFixed(2)}MB, ` +
            `RSS: ${(memUsage.rss / 1024 / 1024).toFixed(2)}MB`);
    }, 10000);

    return () => clearInterval(interval);
}

async function runExhaustionTest(config) {
    console.log('\n' + '='.repeat(100));
    console.log(`💥 EXECUTANDO TESTE DE EXAUSTÃO: ${config.name}`);
    console.log(`📋 ${config.description}`);
    console.log(`⚠️  ATENÇÃO: Este teste pode sobrecarregar significativamente o sistema!`);
    console.log(`⚙️ Configuração:`);
    console.log(`   - Producers: ${config.producers}`);
    console.log(`   - Consumers: ${config.consumers}`);
    console.log(`   - Tamanho da mensagem: ${(config.messageSize / 1024).toFixed(2)} KB`);
    console.log(`   - Batch size: ${config.batchSize.toLocaleString()}`);
    console.log(`   - Duração máxima: ${config.maxDuration} segundos`);
    console.log('='.repeat(100));

    const startTime = Date.now();
    const processes = [];
    const childProcesses = [];

    // Start system monitoring
    const stopMonitoring = await monitorSystemResources();

    try {
        // Start consumers first
        console.log(`📥 Iniciando ${config.consumers} consumers de exaustão...`);
        for (let i = 0; i < config.consumers; i++) {
            const consumerPromise = runExhaustionConsumer(config, i);
            processes.push(consumerPromise);
        }

        // Wait for consumers to start
        await new Promise(resolve => setTimeout(resolve, 10000));

        // Start producers
        console.log(`📤 Iniciando ${config.producers} producers de exaustão...`);
        for (let i = 0; i < config.producers; i++) {
            const producerPromise = runExhaustionProducer(config, i);
            processes.push(producerPromise);
        }

        // Set up timeout
        const timeoutPromise = new Promise((resolve) => {
            setTimeout(() => {
                console.log(`⏰ Tempo limite de ${config.maxDuration} segundos atingido`);
                resolve({ timedOut: true });
            }, config.maxDuration * 1000);
        });

        // Wait for either all processes to complete or timeout
        console.log('⏳ Aguardando exaustão do sistema ou timeout...');
        const result = await Promise.race([
            Promise.allSettled(processes),
            timeoutPromise
        ]);

        const endTime = Date.now();
        const totalTime = (endTime - startTime) / 1000;

        console.log('\n' + '='.repeat(60));
        console.log(`🏁 ${config.name} finalizado!`);
        console.log(`⏱️ Tempo de execução: ${totalTime.toFixed(2)} segundos`);

        if (result.timedOut) {
            console.log('⏰ Teste interrompido por timeout');
        } else {
            console.log('💥 Sistema possivelmente exaurido ou processos finalizados');

            // Analyze results
            let totalMessages = 0;
            let errorCount = 0;

            result.forEach((res, index) => {
                if (res.status === 'fulfilled' && res.value.messageCount) {
                    totalMessages += res.value.messageCount;
                }
                if (res.status === 'rejected' || (res.value && res.value.exitCode !== 0)) {
                    errorCount++;
                }
            });

            console.log(`📊 Estatísticas finais:`);
            console.log(`   - Total de mensagens processadas: ${totalMessages.toLocaleString()}`);
            console.log(`   - Processos com erro: ${errorCount}/${processes.length}`);
            console.log(`   - Taxa de throughput média: ${(totalMessages / totalTime).toFixed(2)} msg/s`);
        }

        console.log('='.repeat(60));

    } catch (error) {
        console.error(`❌ Erro durante teste de exaustão ${config.name}:`, error.message);
    } finally {
        stopMonitoring();

        // Force cleanup
        console.log('🧹 Forçando limpeza de processos...');
        childProcesses.forEach(child => {
            try {
                if (child && !child.killed) {
                    child.kill('SIGTERM');
                }
            } catch (e) {
                // Ignore cleanup errors
            }
        });

        // Wait for cleanup
        await new Promise(resolve => setTimeout(resolve, 5000));
    }
}

async function runAllExhaustionTests() {
    console.log('💥 INICIANDO BATERIA DE TESTES DE EXAUSTÃO');
    console.log(`⚠️  ATENÇÃO: Estes testes podem sobrecarregar significativamente o sistema!`);
    console.log(`📊 Total de testes: ${exhaustionConfigs.length}`);

    // Warn user and ask for confirmation
    console.log('\n🚨 AVISO IMPORTANTE:');
    console.log('   - Estes testes podem causar instabilidade no sistema');
    console.log('   - Monitore recursos do sistema (CPU, memória, disco)');
    console.log('   - Tenha um plano de recuperação caso o sistema trave');
    console.log('   - Considere executar em ambiente isolado/containerizado');

    const startTime = Date.now();

    for (let i = 0; i < exhaustionConfigs.length; i++) {
        const config = exhaustionConfigs[i];
        console.log(`\n[${i + 1}/${exhaustionConfigs.length}] Executando: ${config.name}`);

        await runExhaustionTest(config);

        // Longer wait between exhaustion tests for system recovery
        if (i < exhaustionConfigs.length - 1) {
            console.log('\n⏸️ Aguardando 60 segundos para recuperação completa do sistema...');
            await new Promise(resolve => setTimeout(resolve, 60000));
        }
    }

    const totalTime = (Date.now() - startTime) / 1000;
    console.log('\n' + '='.repeat(100));
    console.log('🏁 TODOS OS TESTES DE EXAUSTÃO CONCLUÍDOS!');
    console.log(`⏱️ Tempo total: ${(totalTime / 60).toFixed(2)} minutos`);
    console.log('🎯 Recomendação: Analise os logs e métricas para identificar pontos de exaustão');
    console.log('='.repeat(100));
}

async function runSingleExhaustionTest(testName) {
    const config = exhaustionConfigs.find(c => c.name.toLowerCase().includes(testName.toLowerCase()));

    if (!config) {
        console.error(`❌ Teste de exaustão '${testName}' não encontrado.`);
        console.log('📋 Testes disponíveis:');
        exhaustionConfigs.forEach((c, i) => {
            console.log(`   ${i + 1}. ${c.name}`);
        });
        process.exit(1);
    }

    await runExhaustionTest(config);
}

// Graceful shutdown
process.on('SIGINT', () => {
    console.log('\n🛑 Recebido sinal de parada. Finalizando testes de exaustão...');
    process.exit(0);
});

// Main execution
if (require.main === module) {
    const args = process.argv.slice(2);

    if (args.length === 0) {
        runAllExhaustionTests().catch(error => {
            console.error('❌ Erro durante execução dos testes de exaustão:', error);
            process.exit(1);
        });
    } else {
        const testName = args[0];
        runSingleExhaustionTest(testName).catch(error => {
            console.error('❌ Erro durante execução do teste de exaustão:', error);
            process.exit(1);
        });
    }
}
