# 📊 Guia de Performance do Kafka

Este guia fornece informações detalhadas sobre como interpretar e otimizar a performance do Kafka usando este projeto.

## 🎯 Métricas Principais

### Throughput (Taxa de Transferência)
- **Definição**: Número de mensagens processadas por unidade de tempo
- **Unidades**: mensagens/segundo (msg/s) ou megabytes/segundo (MB/s)
- **Meta**: Maximizar throughput mantendo latência aceitável

### Latência
- **Definição**: Tempo entre envio e confirmação de uma mensagem
- **Métricas importantes**:
  - **Média**: Latência típica do sistema
  - **P95**: 95% das mensagens têm latência menor que este valor
  - **P99**: 99% das mensagens têm latência menor que este valor

## 🔧 Fatores que Afetam Performance

### 1. Configurações do Producer

#### Batch Size
```typescript
// Impacto no throughput
batchSize: 1     // Baixo throughput, baixa latência
batchSize: 100   // Equilíbrio
batchSize: 1000  // Alto throughput, maior latência
```

#### Compressão
```typescript
compression: 'none'   // Sem overhead de CPU, mais rede
compression: 'snappy' // Melhor equilíbrio
compression: 'gzip'   // Menor uso de rede, mais CPU
compression: 'lz4'    // Rápida compressão/descompressão
```

#### ACKs (Acknowledgments)
```typescript
acks: 0   // Fire-and-forget (risco de perda)
acks: 1   // Líder confirma (equilíbrio)
acks: -1  // Todos réplicas confirmam (durabilidade máxima)
```

### 2. Configurações do Consumer

#### Fetch Settings
```typescript
minBytes: 1        // Buscar imediatamente
maxWaitTime: 5000  // Timeout para busca
maxBytes: 1048576  // Tamanho máximo do batch
```

#### Consumer Groups
- **Paralelismo**: Número de consumers = número de partições
- **Rebalancing**: Impacta performance temporariamente

### 3. Configurações do Tópico

#### Partições
- **Mais partições** = Mais paralelismo
- **Muitas partições** = Overhead de gerenciamento
- **Regra geral**: 2-4 partições por consumer

#### Replicação
- **Fator 1**: Sem redundância, máxima performance
- **Fator 3**: Equilíbrio entre durabilidade e performance

## 📈 Cenários de Performance

### Cenário 1: Alto Throughput
**Objetivo**: Máximo número de mensagens/segundo

**Configuração Recomendada**:
```bash
npx ts-node src/producer/index.ts performance \
  --count 100000 \
  --size 1024 \
  --batch-size 1000 \
  --compression snappy \
  --acks 1
```

**Características**:
- ✅ Throughput: 50.000+ msg/s
- ⚠️ Latência: 50-200ms
- ⚠️ Uso de memória: Alto

### Cenário 2: Baixa Latência
**Objetivo**: Mínimo tempo de resposta

**Configuração Recomendada**:
```bash
npx ts-node src/producer/index.ts performance \
  --count 20000 \
  --size 512 \
  --batch-size 1 \
  --compression none \
  --acks 1
```

**Características**:
- ✅ Latência: <10ms
- ⚠️ Throughput: 5.000-15.000 msg/s
- ✅ Uso de CPU: Baixo

### Cenário 3: Durabilidade Máxima
**Objetivo**: Zero perda de dados

**Configuração Recomendada**:
```bash
npx ts-node src/producer/index.ts performance \
  --count 10000 \
  --size 1024 \
  --batch-size 100 \
  --compression gzip \
  --acks -1 \
  --idempotent
```

**Características**:
- ✅ Durabilidade: Máxima
- ⚠️ Throughput: 5.000-20.000 msg/s
- ⚠️ Latência: 100-500ms

## 🎛️ Tuning de Performance

### Para Maximizar Throughput

1. **Aumentar Batch Size**
   ```bash
   --batch-size 1000  # ou maior
   ```

2. **Usar Compressão Eficiente**
   ```bash
   --compression snappy
   ```

3. **Reduzir Durabilidade**
   ```bash
   --acks 1
   ```

4. **Múltiplos Producers**
   ```bash
   # Executar múltiplas instâncias
   ```

### Para Minimizar Latência

1. **Reduzir Batch Size**
   ```bash
   --batch-size 1
   ```

2. **Evitar Compressão**
   ```bash
   --compression none
   ```

3. **Configurar Timeouts**
   ```bash
   --timeout 5000
   ```

### Para Maximizar Durabilidade

1. **ACK de Todas Réplicas**
   ```bash
   --acks -1
   ```

2. **Habilitar Idempotência**
   ```bash
   --idempotent
   ```

3. **Usar Transações**
   ```typescript
   // Em desenvolvimento
   ```

## 📊 Interpretando Resultados

### Resultados Típicos por Cenário

#### Mensagens Pequenas (< 1KB)
```
Throughput: 30.000-100.000 msg/s
Latência P95: 10-50ms
Uso de CPU: Médio
Uso de Rede: Alto
```

#### Mensagens Médias (1-10KB)
```
Throughput: 10.000-50.000 msg/s
Latência P95: 20-100ms
Uso de CPU: Médio
Uso de Rede: Médio
```

#### Mensagens Grandes (> 10KB)
```
Throughput: 1.000-10.000 msg/s
Latência P95: 50-500ms
Uso de CPU: Baixo
Uso de Rede: Baixo
```

### Sinais de Problemas

#### Throughput Degradado
- **Sintomas**: < 1.000 msg/s em cenários normais
- **Possíveis causas**:
  - Batch size muito pequeno
  - Muitas partições com poucos dados
  - Problemas de rede
  - Consumer lento

#### Alta Latência
- **Sintomas**: P95 > 1000ms
- **Possíveis causas**:
  - Batch size muito grande
  - ACKs de todas réplicas
  - Problemas no broker
  - GC do JVM

#### Memory Leaks
- **Sintomas**: Uso de memória crescente
- **Possíveis causas**:
  - Batch size muito grande
  - Mensagens muito grandes
  - Acúmulo de mensagens não processadas

## 🔍 Monitoramento Contínuo

### Métricas Críticas

1. **Producer Metrics**
   - `kafka_messages_produced_total`
   - `kafka_producer_latency_ms`
   - `kafka_producer_errors_total`

2. **Consumer Metrics**
   - `kafka_messages_consumed_total`
   - `kafka_consumer_lag`
   - `kafka_consumer_latency_ms`

3. **System Metrics**
   - `nodejs_memory_usage_bytes`
   - `nodejs_cpu_usage_percent`

### Alertas Recomendados

```yaml
# Prometheus alerting rules
- alert: HighProducerLatency
  expr: kafka_producer_latency_ms > 1000
  for: 5m

- alert: ConsumerLag
  expr: kafka_consumer_lag > 10000
  for: 2m

- alert: HighErrorRate
  expr: rate(kafka_producer_errors_total[5m]) > 0.01
  for: 1m
```

## 🚀 Benchmarks de Referência

### Hardware de Referência
- **CPU**: 8 cores, 2.4GHz
- **RAM**: 16GB
- **Disco**: SSD
- **Rede**: 1Gbps

### Resultados Esperados

| Cenário         | Throughput | Latência P95 | CPU | Memória |
| --------------- | ---------- | ------------ | --- | ------- |
| Baseline        | 15k msg/s  | 50ms         | 30% | 512MB   |
| High Throughput | 80k msg/s  | 200ms        | 60% | 2GB     |
| Low Latency     | 8k msg/s   | 5ms          | 20% | 256MB   |
| Large Messages  | 2k msg/s   | 300ms        | 40% | 1GB     |

## 🎯 Melhores Práticas

### Configuração de Produção

1. **Producer**:
   - `batchSize`: 500-1000
   - `compression`: snappy
   - `acks`: 1
   - `retries`: 3

2. **Consumer**:
   - `maxWaitTime`: 5000
   - `minBytes`: 1024
   - `maxBytes`: 1MB
   - `autoCommit`: true

3. **Tópico**:
   - Partições: 2x número de consumers
   - Replicação: 3
   - `min.insync.replicas`: 2

### Monitoramento

1. **Dashboards**: Grafana com métricas chave
2. **Alertas**: Latência, lag, erros
3. **Logs**: Centralizados e estruturados
4. **Testes**: Regulares de performance

### Troubleshooting

1. **Performance degradada**:
   - Verificar consumer lag
   - Analisar métricas de latência
   - Revisar configurações

2. **Erros frequentes**:
   - Verificar conectividade
   - Analisar logs de erro
   - Revisar timeouts

3. **Uso excessivo de recursos**:
   - Otimizar batch sizes
   - Revisar compressão
   - Monitorar GC

---

Este guia deve ser usado em conjunto com os testes automatizados para otimizar a performance do Kafka em seu ambiente específico.
