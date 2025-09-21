# 🚀 Kafka Performance Study

Uma aplicação completa para estudo de performance do Apache Kafka com Producer e Consumer em TypeScript, incluindo ferramentas de monitoramento, testes de stress e análise de exaustão do broker.

## 📋 Índice

- [Visão Geral](#visão-geral)
- [Funcionalidades](#funcionalidades)
- [Pré-requisitos](#pré-requisitos)
- [Instalação Rápida](#instalação-rápida)
- [Estrutura do Projeto](#estrutura-do-projeto)
- [Guia de Uso](#guia-de-uso)
- [Testes de Performance](#testes-de-performance)
- [Testes de Stress](#testes-de-stress)
- [Testes de Exaustão](#testes-de-exaustão)
- [Monitoramento](#monitoramento)
- [Análise de Resultados](#análise-de-resultados)
- [Casos de Uso e Cenários](#casos-de-uso-e-cenários)
- [Troubleshooting](#troubleshooting)
- [Contribuição](#contribuição)

## 🎯 Visão Geral

Este projeto foi desenvolvido para permitir um estudo completo de performance do Apache Kafka, fornecendo:

- **Producer e Consumer** implementados em TypeScript
- **Testes automatizados** de performance, stress e exaustão
- **Monitoramento em tempo real** com Prometheus e Grafana
- **Análise detalhada** de métricas e relatórios
- **Cenários realistas** para diferentes casos de uso

## ✨ Funcionalidades

### 🔧 Core Features
- Producer Kafka com configurações customizáveis
- Consumer Kafka com diferentes estratégias de consumo
- Geração de mensagens sintéticas e realísticas
- Coleta de métricas de performance em tempo real

### 📊 Testes e Análises
- **Testes de Performance**: Throughput, latência, diferentes configurações
- **Testes de Stress**: Múltiplos producers/consumers simultâneos
- **Testes de Exaustão**: Identificação dos limites do broker
- **Análise Comparativa**: Diferentes compressões, batch sizes, ACK configs

### 🔍 Monitoramento
- Dashboard Kafka UI para visualização de tópicos
- Métricas Prometheus para coleta de dados
- Dashboards Grafana para visualização avançada
- Monitoramento de recursos do sistema

## 🛠️ Pré-requisitos

- **Node.js** 16+
- **Docker** e **Docker Compose**
- **npm** ou **yarn**
- **8GB RAM** recomendado para testes de stress
- **Sistema operacional**: Linux, macOS, ou Windows com WSL2

## ⚡ Instalação Rápida

```bash
# Clone o repositório
git clone <repository-url>
cd kafka-performance-study

# Execute o setup automático
./scripts/setup.sh
```

O script de setup irá:
1. ✅ Verificar pré-requisitos
2. 📦 Instalar dependências Node.js
3. 🐳 Iniciar infraestrutura Kafka (Docker)
4. 📝 Criar tópicos necessários
5. 🧪 Executar testes básicos de conectividade

### Instalação Manual

Se preferir instalar manualmente:

```bash
# Instalar dependências
npm install

# Iniciar Kafka
npm run kafka:up

# Aguardar inicialização (30-60 segundos)
sleep 30

# Criar tópicos
npm run kafka:create-topic

# Verificar se está funcionando
npm run kafka:list-topics
```

## 📁 Estrutura do Projeto

```
kafka-performance-study/
├── src/
│   ├── producer/           # Producer Kafka
│   │   ├── kafka-producer.ts
│   │   └── index.ts
│   ├── consumer/           # Consumer Kafka
│   │   ├── kafka-consumer.ts
│   │   └── index.ts
│   ├── monitoring/         # Ferramentas de monitoramento
│   │   ├── prometheus-metrics.ts
│   │   ├── kafka-monitor.ts
│   │   └── index.ts
│   └── utils/              # Utilitários
│       ├── types.ts
│       ├── metrics.ts
│       └── message-generator.ts
├── scripts/                # Scripts de automação
│   ├── setup.sh           # Setup completo
│   ├── cleanup.sh         # Limpeza do ambiente
│   ├── performance-test.js # Testes de performance
│   ├── stress-test.js     # Testes de stress
│   ├── exhaustion-test.js # Testes de exaustão
│   ├── run-analysis.js    # Análise automatizada
│   └── create-topics.js   # Criação de tópicos
├── config/                 # Configurações
│   ├── prometheus.yml
│   └── grafana/
└── docker-compose.yml      # Infraestrutura Kafka
```

## 🚀 Guia de Uso

### Comandos Principais

```bash
# Gerenciamento do Kafka
npm run kafka:up              # Iniciar Kafka
npm run kafka:down            # Parar Kafka
npm run kafka:logs            # Ver logs
npm run kafka:list-topics     # Listar tópicos

# Testes básicos
npm run start:producer        # Iniciar producer
npm run start:consumer        # Iniciar consumer
npm run start:monitoring      # Iniciar monitoramento

# Testes automatizados
npm run test:performance      # Testes de performance
npm run test:stress          # Testes de stress
npm run test:exhaustion      # Testes de exaustão
```

### Producer Manual

```bash
# Teste básico
npx ts-node src/producer/index.ts performance \
  --count 10000 \
  --size 1024 \
  --batch-size 100

# Teste com compressão
npx ts-node src/producer/index.ts performance \
  --count 50000 \
  --size 2048 \
  --batch-size 500 \
  --compression snappy \
  --acks 1

# Teste de stress
npx ts-node src/producer/index.ts stress \
  --duration 60 \
  --size 4096 \
  --batch-size 1000
```

### Consumer Manual

```bash
# Consumer básico
npx ts-node src/consumer/index.ts performance \
  --duration 60 \
  --group test-group

# Consumer contínuo
npx ts-node src/consumer/index.ts continuous \
  --group continuous-group \
  --from-beginning

# Consumer de stress
npx ts-node src/consumer/index.ts stress \
  --duration 120 \
  --group stress-group
```

## 📈 Testes de Performance

### Testes Básicos Automatizados

```bash
# Executar todos os testes de performance
npm run test:performance

# Executar teste específico
node scripts/performance-test.js "baseline"
```

### Cenários Incluídos

1. **Baseline Test**: Configurações padrão
   - 10.000 mensagens, 1KB cada
   - Batch size: 100
   - Sem compressão, ACK = -1

2. **High Throughput Test**: Otimizado para throughput
   - 50.000 mensagens, 512B cada
   - Batch size: 1000
   - Compressão Snappy, ACK = 1

3. **Large Messages Test**: Mensagens grandes
   - 5.000 mensagens, 10KB cada
   - Batch size: 50
   - Compressão GZIP, ACK = -1

4. **Low Latency Test**: Otimizado para latência
   - 20.000 mensagens, 256B cada
   - Batch size: 1
   - Sem compressão, ACK = 1

### Métricas Coletadas

- **Throughput**: mensagens/segundo e MB/segundo
- **Latência**: média, mínima, máxima, P95, P99
- **Taxa de erro**: contagem de falhas
- **Uso de recursos**: CPU, memória

## 🔥 Testes de Stress

### Executar Testes de Stress

```bash
# Todos os testes de stress
npm run test:stress

# Teste específico
node scripts/stress-test.js "medium"
```

### Níveis de Stress

1. **Light Stress**: 2 producers + 2 consumers, 30s
2. **Medium Stress**: 4 producers + 4 consumers, 60s
3. **Heavy Stress**: 8 producers + 6 consumers, 120s
4. **Extreme Stress**: 16 producers + 12 consumers, 180s

### Objetivo dos Testes de Stress

- Identificar limites de throughput
- Avaliar comportamento sob carga
- Detectar memory leaks
- Testar estabilidade do sistema

## 💥 Testes de Exaustão

⚠️ **ATENÇÃO**: Estes testes podem sobrecarregar significativamente o sistema!

### Executar Testes de Exaustão

```bash
# Todos os testes de exaustão
npm run test:exhaustion

# Teste específico
node scripts/exhaustion-test.js "memory"
```

### Tipos de Exaustão

1. **Memory Exhaustion**: Mensagens de 1MB para esgotar memória
2. **Connection Exhaustion**: 50 producers + 30 consumers
3. **Disk Exhaustion**: Alto volume de mensagens grandes
4. **Network Exhaustion**: Throughput extremo

### Como Analisar Exaustão

1. **Monitore recursos**: CPU, RAM, disco, rede
2. **Observe logs**: Erros de timeout, conexão
3. **Verifique métricas**: Queda de throughput, aumento de latência
4. **Identifique limites**: Ponto onde o sistema falha

## 📊 Monitoramento

### Interfaces Web Disponíveis

- **Kafka UI**: http://localhost:8080
  - Visualização de tópicos, partições, mensagens
  - Gerenciamento de consumer groups
  - Monitoramento de brokers

- **Prometheus**: http://localhost:9090
  - Métricas de sistema e aplicação
  - Queries e alertas
  - Dados históricos

- **Grafana**: http://localhost:3000 (admin/admin)
  - Dashboards visuais
  - Gráficos de performance
  - Alertas customizados

### Monitoramento via CLI

```bash
# Informações do cluster
npx ts-node src/monitoring/index.ts cluster-info

# Lag dos consumers
npx ts-node src/monitoring/index.ts consumer-lag

# Offsets dos tópicos
npx ts-node src/monitoring/index.ts topic-offsets --topic performance-test

# Monitoramento contínuo
npx ts-node src/monitoring/index.ts start --interval 30
```

## 📋 Análise de Resultados

### Análise Automatizada

```bash
# Análise completa com todos os cenários
node scripts/run-analysis.js

# Análise específica
node scripts/run-analysis.js "throughput"
```

### Cenários de Análise

1. **Throughput Analysis**: Diferentes tamanhos de mensagem
2. **Latency Analysis**: Diferentes configurações de ACK
3. **Compression Analysis**: Impacto de compressão
4. **Batch Size Analysis**: Otimização de batching

### Relatórios Gerados

- **JSON Report**: `analysis-results/analysis-report.json`
- **HTML Report**: `analysis-results/analysis-report.html`
- **Scenario Reports**: Arquivos individuais por cenário

### Interpretando Resultados

#### Throughput
- **Alto throughput**: > 10.000 msg/s
- **Médio throughput**: 1.000 - 10.000 msg/s
- **Baixo throughput**: < 1.000 msg/s

#### Latência
- **Baixa latência**: < 10ms
- **Média latência**: 10-100ms
- **Alta latência**: > 100ms

#### Quando o Kafka Funciona Bem

✅ **Cenários Ideais:**
- Mensagens de tamanho médio (1-10KB)
- Batch sizes entre 100-1000
- Compressão Snappy para throughput
- ACK = 1 para equilíbrio throughput/durabilidade
- Múltiplas partições
- Consumers com paralelismo adequado

❌ **Cenários Problemáticos:**
- Mensagens muito grandes (>1MB)
- Batch size = 1 (sem batching)
- ACK = -1 com alta frequência
- Poucas partições com muitos consumers
- Processamento lento no consumer

## 🔧 Casos de Uso e Cenários

### 1. Sistema de Logs
```bash
# Configuração otimizada para logs
npx ts-node src/producer/index.ts performance \
  --count 100000 \
  --size 512 \
  --batch-size 1000 \
  --compression lz4 \
  --acks 0
```

### 2. Eventos de Usuário
```bash
# Configuração para eventos críticos
npx ts-node src/producer/index.ts performance \
  --count 50000 \
  --size 1024 \
  --batch-size 100 \
  --compression snappy \
  --acks 1
```

### 3. Transações Financeiras
```bash
# Configuração para máxima durabilidade
npx ts-node src/producer/index.ts performance \
  --count 10000 \
  --size 2048 \
  --batch-size 10 \
  --compression none \
  --acks -1 \
  --idempotent
```

### 4. Streaming de Dados
```bash
# Configuração para streaming contínuo
npx ts-node src/consumer/index.ts continuous \
  --group streaming-group \
  --max-wait 1000 \
  --min-bytes 1024
```

## 🚨 Troubleshooting

### Problemas Comuns

#### Kafka não inicia
```bash
# Verificar logs
docker-compose logs kafka

# Limpar volumes e reiniciar
docker-compose down -v
docker-compose up -d
```

#### Producer com timeout
```bash
# Verificar conectividade
docker-compose ps

# Aumentar timeout
npx ts-node src/producer/index.ts performance \
  --count 1000 \
  --timeout 60000
```

#### Consumer não recebe mensagens
```bash
# Verificar tópicos
npm run kafka:list-topics

# Verificar consumer groups
npm run kafka:consumer-groups

# Reset consumer offset
npx ts-node src/consumer/index.ts seek --to-beginning
```

#### Alto uso de memória
```bash
# Monitorar recursos
top
docker stats

# Reduzir batch size
npx ts-node src/producer/index.ts performance \
  --batch-size 50
```

### Logs e Debugging

```bash
# Logs do Kafka
docker-compose logs -f kafka

# Logs do Zookeeper
docker-compose logs -f zookeeper

# Logs da aplicação
DEBUG=kafka* npx ts-node src/producer/index.ts performance
```

### Performance Issues

1. **Baixo Throughput**
   - Aumentar batch size
   - Usar compressão adequada
   - Verificar número de partições
   - Otimizar configurações de rede

2. **Alta Latência**
   - Reduzir batch size
   - Usar ACK = 1 ao invés de -1
   - Verificar processamento do consumer
   - Otimizar configurações de JVM

3. **Memory Issues**
   - Reduzir tamanho das mensagens
   - Limitar batch size
   - Configurar limites de memória
   - Monitorar garbage collection

## 🧹 Limpeza

### Limpeza Básica
```bash
./scripts/cleanup.sh
```

### Limpeza Completa
```bash
# Remove volumes (dados serão perdidos!)
./scripts/cleanup.sh --all
```

### Limpeza Manual
```bash
# Parar containers
npm run kafka:down

# Remover volumes
docker-compose down -v

# Limpar Node.js
rm -rf node_modules dist
```

## 📚 Scripts Úteis

```bash
# Setup completo
./scripts/setup.sh

# Limpeza
./scripts/cleanup.sh

# Criar tópicos customizados
node scripts/create-topics.js

# Testes automatizados
node scripts/performance-test.js
node scripts/stress-test.js
node scripts/exhaustion-test.js

# Análise comparativa
node scripts/run-analysis.js
```

## 🤝 Contribuição

1. Fork o projeto
2. Crie uma branch para sua feature (`git checkout -b feature/AmazingFeature`)
3. Commit suas mudanças (`git commit -m 'Add some AmazingFeature'`)
4. Push para a branch (`git push origin feature/AmazingFeature`)
5. Abra um Pull Request

### Áreas para Contribuição

- 🐛 **Bug fixes**: Correção de problemas
- ✨ **Features**: Novas funcionalidades
- 📊 **Dashboards**: Novos dashboards Grafana
- 🧪 **Testes**: Novos cenários de teste
- 📖 **Documentação**: Melhorias na documentação
- 🔧 **Performance**: Otimizações

## 📄 Licença

Este projeto está licenciado sob a Licença MIT - veja o arquivo [LICENSE](LICENSE) para detalhes.

## 🙏 Agradecimentos

- Apache Kafka community
- KafkaJS library
- Prometheus & Grafana teams
- Docker community

---

**🚀 Happy Kafka Testing!**

Para dúvidas ou sugestões, abra uma issue no repositório.
