#!/usr/bin/env node

const { spawn } = require('child_process');
const fs = require('fs');
const path = require('path');

// Analysis scenarios
const analysisScenarios = [
    {
        name: 'Throughput Analysis',
        description: 'Análise de throughput com diferentes configurações',
        tests: [
            {
                name: 'Small Messages High Volume',
                producer: { count: 100000, size: 256, batchSize: 1000, compression: 'none' },
                consumer: { duration: 180 }
            },
            {
                name: 'Medium Messages Balanced',
                producer: { count: 50000, size: 1024, batchSize: 500, compression: 'snappy' },
                consumer: { duration: 180 }
            },
            {
                name: 'Large Messages Low Volume',
                producer: { count: 10000, size: 8192, batchSize: 100, compression: 'gzip' },
                consumer: { duration: 180 }
            }
        ]
    },
    {
        name: 'Latency Analysis',
        description: 'Análise de latência com diferentes ACK configs',
        tests: [
            {
                name: 'Fire and Forget (acks=0)',
                producer: { count: 20000, size: 1024, batchSize: 1, acks: 0 },
                consumer: { duration: 120 }
            },
            {
                name: 'Leader ACK (acks=1)',
                producer: { count: 20000, size: 1024, batchSize: 1, acks: 1 },
                consumer: { duration: 120 }
            },
            {
                name: 'All Replicas ACK (acks=-1)',
                producer: { count: 20000, size: 1024, batchSize: 1, acks: -1 },
                consumer: { duration: 120 }
            }
        ]
    },
    {
        name: 'Compression Analysis',
        description: 'Análise de impacto de diferentes tipos de compressão',
        tests: [
            {
                name: 'No Compression',
                producer: { count: 30000, size: 2048, batchSize: 500, compression: 'none' },
                consumer: { duration: 150 }
            },
            {
                name: 'GZIP Compression',
                producer: { count: 30000, size: 2048, batchSize: 500, compression: 'gzip' },
                consumer: { duration: 150 }
            },
            {
                name: 'Snappy Compression',
                producer: { count: 30000, size: 2048, batchSize: 500, compression: 'snappy' },
                consumer: { duration: 150 }
            },
            {
                name: 'LZ4 Compression',
                producer: { count: 30000, size: 2048, batchSize: 500, compression: 'lz4' },
                consumer: { duration: 150 }
            }
        ]
    },
    {
        name: 'Batch Size Analysis',
        description: 'Análise de impacto do tamanho do batch',
        tests: [
            {
                name: 'Batch Size 1 (No Batching)',
                producer: { count: 10000, size: 1024, batchSize: 1 },
                consumer: { duration: 120 }
            },
            {
                name: 'Batch Size 100',
                producer: { count: 10000, size: 1024, batchSize: 100 },
                consumer: { duration: 120 }
            },
            {
                name: 'Batch Size 500',
                producer: { count: 10000, size: 1024, batchSize: 500 },
                consumer: { duration: 120 }
            },
            {
                name: 'Batch Size 1000',
                producer: { count: 10000, size: 1024, batchSize: 1000 },
                consumer: { duration: 120 }
            },
            {
                name: 'Batch Size 2000',
                producer: { count: 10000, size: 1024, batchSize: 2000 },
                consumer: { duration: 120 }
            }
        ]
    }
];

class AnalysisRunner {
    constructor() {
        this.results = [];
        this.outputDir = path.join(__dirname, '..', 'analysis-results');
        this.ensureOutputDir();
    }

    ensureOutputDir() {
        if (!fs.existsSync(this.outputDir)) {
            fs.mkdirSync(this.outputDir, { recursive: true });
        }
    }

    async runCommand(command, args, name) {
        return new Promise((resolve, reject) => {
            console.log(`🚀 [${name}] Executando: ${command} ${args.join(' ')}`);

            const child = spawn(command, args, {
                stdio: ['ignore', 'pipe', 'pipe'],
                cwd: path.join(__dirname, '..'),
            });

            let output = '';
            let errorOutput = '';

            child.stdout.on('data', (data) => {
                const text = data.toString();
                output += text;

                // Log important metrics
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
                    console.log(`✅ [${name}] Concluído`);
                    resolve({ output, errorOutput, exitCode: code });
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

    async runProducerTest(testConfig, testName) {
        const args = [
            'src/producer/index.ts',
            'custom',
            '--topic', 'analysis-test',
            '--count', testConfig.producer.count.toString(),
            '--size', testConfig.producer.size.toString(),
            '--batch-size', testConfig.producer.batchSize.toString(),
        ];

        if (testConfig.producer.compression) {
            args.push('--compression', testConfig.producer.compression);
        }
        if (testConfig.producer.acks !== undefined) {
            args.push('--acks', testConfig.producer.acks.toString());
        }

        return this.runCommand('npx', ['ts-node', ...args], `Producer-${testName}`);
    }

    async runConsumerTest(testConfig, testName) {
        const args = [
            'src/consumer/index.ts',
            'performance',
            '--topic', 'analysis-test',
            '--group', `analysis-group-${Date.now()}`,
            '--duration', testConfig.consumer.duration.toString(),
        ];

        return this.runCommand('npx', ['ts-node', ...args], `Consumer-${testName}`);
    }

    parseMetrics(output) {
        const metrics = {};

        const lines = output.split('\n');
        for (const line of lines) {
            if (line.includes('Throughput:') && line.includes('msg/s')) {
                const match = line.match(/([\d,]+\.?\d*)\s*msg\/s/);
                if (match) metrics.throughputMsgPerSec = parseFloat(match[1].replace(/,/g, ''));
            }

            if (line.includes('Throughput:') && line.includes('MB/s')) {
                const match = line.match(/([\d,]+\.?\d*)\s*MB\/s/);
                if (match) metrics.throughputMBPerSec = parseFloat(match[1].replace(/,/g, ''));
            }

            if (line.includes('Latência Média:')) {
                const match = line.match(/([\d,]+\.?\d*)\s*ms/);
                if (match) metrics.avgLatencyMs = parseFloat(match[1].replace(/,/g, ''));
            }

            if (line.includes('Latência P95:')) {
                const match = line.match(/([\d,]+\.?\d*)\s*ms/);
                if (match) metrics.p95LatencyMs = parseFloat(match[1].replace(/,/g, ''));
            }

            if (line.includes('Latência P99:')) {
                const match = line.match(/([\d,]+\.?\d*)\s*ms/);
                if (match) metrics.p99LatencyMs = parseFloat(match[1].replace(/,/g, ''));
            }

            if (line.includes('Mensagens Produzidas:')) {
                const match = line.match(/([\d,]+)/);
                if (match) metrics.messagesProduced = parseInt(match[1].replace(/,/g, ''));
            }

            if (line.includes('Mensagens Consumidas:')) {
                const match = line.match(/([\d,]+)/);
                if (match) metrics.messagesConsumed = parseInt(match[1].replace(/,/g, ''));
            }
        }

        return metrics;
    }

    async runSingleTest(testConfig, testName) {
        console.log(`\n📋 Executando teste: ${testName}`);
        console.log(`   Configuração: ${JSON.stringify(testConfig, null, 2)}`);

        const startTime = Date.now();

        try {
            // Start consumer first
            const consumerPromise = this.runConsumerTest(testConfig, testName);

            // Wait for consumer to start
            await new Promise(resolve => setTimeout(resolve, 5000));

            // Start producer
            const producerResult = await this.runProducerTest(testConfig, testName);

            // Wait for consumer to finish
            const consumerResult = await consumerPromise;

            const endTime = Date.now();
            const duration = (endTime - startTime) / 1000;

            // Parse metrics
            const producerMetrics = this.parseMetrics(producerResult.output);
            const consumerMetrics = this.parseMetrics(consumerResult.output);

            const result = {
                testName,
                config: testConfig,
                duration,
                producerMetrics,
                consumerMetrics,
                timestamp: new Date().toISOString()
            };

            this.results.push(result);

            console.log(`✅ Teste ${testName} concluído em ${duration.toFixed(2)}s`);
            return result;

        } catch (error) {
            console.error(`❌ Erro no teste ${testName}:`, error.message);
            return null;
        }
    }

    async runScenario(scenario) {
        console.log('\n' + '='.repeat(80));
        console.log(`🧪 EXECUTANDO CENÁRIO: ${scenario.name}`);
        console.log(`📋 ${scenario.description}`);
        console.log(`📊 Total de testes: ${scenario.tests.length}`);
        console.log('='.repeat(80));

        const scenarioResults = [];

        for (let i = 0; i < scenario.tests.length; i++) {
            const test = scenario.tests[i];
            console.log(`\n[${i + 1}/${scenario.tests.length}] ${test.name}`);

            const result = await this.runSingleTest(test, test.name);
            if (result) {
                scenarioResults.push(result);
            }

            // Wait between tests
            if (i < scenario.tests.length - 1) {
                console.log('\n⏸️ Aguardando 10 segundos antes do próximo teste...');
                await new Promise(resolve => setTimeout(resolve, 10000));
            }
        }

        // Save scenario results
        const scenarioFile = path.join(this.outputDir, `${scenario.name.replace(/\s+/g, '-').toLowerCase()}.json`);
        fs.writeFileSync(scenarioFile, JSON.stringify({
            scenario: scenario.name,
            description: scenario.description,
            results: scenarioResults,
            timestamp: new Date().toISOString()
        }, null, 2));

        console.log(`✅ Cenário ${scenario.name} concluído! Resultados salvos em: ${scenarioFile}`);
        return scenarioResults;
    }

    generateReport() {
        console.log('\n' + '='.repeat(100));
        console.log('📊 GERANDO RELATÓRIO DE ANÁLISE');
        console.log('='.repeat(100));

        const reportFile = path.join(this.outputDir, 'analysis-report.json');
        const htmlReportFile = path.join(this.outputDir, 'analysis-report.html');

        const report = {
            timestamp: new Date().toISOString(),
            totalTests: this.results.length,
            results: this.results
        };

        // Save JSON report
        fs.writeFileSync(reportFile, JSON.stringify(report, null, 2));

        // Generate HTML report
        const htmlContent = this.generateHTMLReport(report);
        fs.writeFileSync(htmlReportFile, htmlContent);

        console.log(`📄 Relatório JSON salvo em: ${reportFile}`);
        console.log(`🌐 Relatório HTML salvo em: ${htmlReportFile}`);

        // Print summary
        this.printSummary();
    }

    generateHTMLReport(report) {
        return `
<!DOCTYPE html>
<html lang="pt-BR">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Kafka Performance Analysis Report</title>
    <style>
        body { font-family: Arial, sans-serif; margin: 20px; }
        .header { background: #f4f4f4; padding: 20px; border-radius: 8px; }
        .test-result { margin: 20px 0; padding: 15px; border: 1px solid #ddd; border-radius: 8px; }
        .metrics { display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 10px; }
        .metric { background: #f9f9f9; padding: 10px; border-radius: 4px; }
        .metric-value { font-weight: bold; color: #2196F3; }
        table { width: 100%; border-collapse: collapse; margin: 20px 0; }
        th, td { border: 1px solid #ddd; padding: 8px; text-align: left; }
        th { background-color: #f2f2f2; }
    </style>
</head>
<body>
    <div class="header">
        <h1>🚀 Kafka Performance Analysis Report</h1>
        <p><strong>Gerado em:</strong> ${report.timestamp}</p>
        <p><strong>Total de testes:</strong> ${report.totalTests}</p>
    </div>

    <h2>📊 Resumo dos Resultados</h2>
    <table>
        <tr>
            <th>Teste</th>
            <th>Throughput (msg/s)</th>
            <th>Throughput (MB/s)</th>
            <th>Latência Média (ms)</th>
            <th>Latência P95 (ms)</th>
            <th>Mensagens</th>
        </tr>
        ${report.results.map(result => `
        <tr>
            <td>${result.testName}</td>
            <td>${result.producerMetrics.throughputMsgPerSec || 'N/A'}</td>
            <td>${result.producerMetrics.throughputMBPerSec || 'N/A'}</td>
            <td>${result.producerMetrics.avgLatencyMs || 'N/A'}</td>
            <td>${result.producerMetrics.p95LatencyMs || 'N/A'}</td>
            <td>${result.producerMetrics.messagesProduced || 'N/A'}</td>
        </tr>
        `).join('')}
    </table>

    <h2>📋 Detalhes dos Testes</h2>
    ${report.results.map(result => `
    <div class="test-result">
        <h3>${result.testName}</h3>
        <p><strong>Configuração:</strong> ${JSON.stringify(result.config, null, 2)}</p>
        <div class="metrics">
            <div class="metric">
                <div>Throughput (msg/s)</div>
                <div class="metric-value">${result.producerMetrics.throughputMsgPerSec || 'N/A'}</div>
            </div>
            <div class="metric">
                <div>Latência Média (ms)</div>
                <div class="metric-value">${result.producerMetrics.avgLatencyMs || 'N/A'}</div>
            </div>
            <div class="metric">
                <div>Latência P95 (ms)</div>
                <div class="metric-value">${result.producerMetrics.p95LatencyMs || 'N/A'}</div>
            </div>
            <div class="metric">
                <div>Mensagens Produzidas</div>
                <div class="metric-value">${result.producerMetrics.messagesProduced || 'N/A'}</div>
            </div>
        </div>
    </div>
    `).join('')}
</body>
</html>`;
    }

    printSummary() {
        console.log('\n📊 RESUMO DA ANÁLISE:');
        console.log('='.repeat(60));

        if (this.results.length === 0) {
            console.log('❌ Nenhum resultado válido encontrado');
            return;
        }

        // Find best and worst performers
        const validResults = this.results.filter(r => r.producerMetrics.throughputMsgPerSec);

        if (validResults.length > 0) {
            const bestThroughput = validResults.reduce((max, r) =>
                r.producerMetrics.throughputMsgPerSec > max.producerMetrics.throughputMsgPerSec ? r : max
            );

            const bestLatency = validResults.reduce((min, r) =>
                r.producerMetrics.avgLatencyMs < min.producerMetrics.avgLatencyMs ? r : min
            );

            console.log(`🏆 Melhor Throughput: ${bestThroughput.testName}`);
            console.log(`   ${bestThroughput.producerMetrics.throughputMsgPerSec.toFixed(2)} msg/s`);

            console.log(`⚡ Menor Latência: ${bestLatency.testName}`);
            console.log(`   ${bestLatency.producerMetrics.avgLatencyMs.toFixed(2)} ms`);
        }

        console.log(`\n📈 Total de testes executados: ${this.results.length}`);
        console.log('='.repeat(60));
    }

    async runAllAnalysis() {
        console.log('🚀 INICIANDO ANÁLISE COMPLETA DE PERFORMANCE');
        console.log(`📊 Total de cenários: ${analysisScenarios.length}`);

        const startTime = Date.now();

        for (let i = 0; i < analysisScenarios.length; i++) {
            const scenario = analysisScenarios[i];
            console.log(`\n[${i + 1}/${analysisScenarios.length}] Executando cenário: ${scenario.name}`);

            await this.runScenario(scenario);

            // Wait between scenarios
            if (i < analysisScenarios.length - 1) {
                console.log('\n⏸️ Aguardando 30 segundos antes do próximo cenário...');
                await new Promise(resolve => setTimeout(resolve, 30000));
            }
        }

        const totalTime = (Date.now() - startTime) / 1000;
        console.log(`\n🏁 Análise completa concluída em ${(totalTime / 60).toFixed(2)} minutos`);

        this.generateReport();
    }
}

// Main execution
if (require.main === module) {
    const args = process.argv.slice(2);
    const runner = new AnalysisRunner();

    if (args.length === 0) {
        runner.runAllAnalysis().catch(error => {
            console.error('❌ Erro durante análise:', error);
            process.exit(1);
        });
    } else {
        const scenarioName = args[0];
        const scenario = analysisScenarios.find(s => s.name.toLowerCase().includes(scenarioName.toLowerCase()));

        if (!scenario) {
            console.error(`❌ Cenário '${scenarioName}' não encontrado.`);
            console.log('📋 Cenários disponíveis:');
            analysisScenarios.forEach((s, i) => {
                console.log(`   ${i + 1}. ${s.name}`);
            });
            process.exit(1);
        }

        runner.runScenario(scenario).then(() => {
            runner.generateReport();
        }).catch(error => {
            console.error('❌ Erro durante análise:', error);
            process.exit(1);
        });
    }
}
