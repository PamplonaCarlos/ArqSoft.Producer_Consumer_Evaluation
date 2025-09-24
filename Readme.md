# Avaliação de sistemas de mensageria

## Seleção de Tópicos: 
O tópico padrão está em texto bruto no arquivo config.py

## Instalando as dependências
```sh
sudo apt-get update
sudo apt-get upgrade
sudo apt-get install python3
sudo apt-get install python3-pika
sudo apt-get install python3-kafka
```

## Post de mensagens
### Para configurar o sistema de mensageria:

#### Kafka
``export MESSAGING_SYSTEM=kafka``
#### Postgres
``export MESSAGING_SYSTEM=postgres``
#### RabbitMQ
``export MESSAGING_SYSTEM=rabbitmq``

### Para enviar a mensagem:
```sh
while true; do counter=$(($counter+1)); python3 main.py producer "teste de carga ${counter}"; done
```

## Para consumir a mensagem
```sh
python3 main.py consumer
```


Se for de preferência customizar a mensagem, só editar o arquivo acima!


## Para raeproduzir a arquitetura:

### Substitua <nome-do-no-de-borda> pelo nome do seu nó
```sh
kubectl label node <nome-do-no-de-borda> kubernetes.io/role=edge
```
### Instale o NGINX Ingress Controller
````sh
helm install ingress-nginx ingress-nginx \
  --repo https://kubernetes.github.io/ingress-nginx \
  --namespace ingress-nginx \
  --create-namespace \
  --set controller.kind=DaemonSet \
  --set controller.hostNetwork=true \
  --set controller.service.enabled=false \
  --set controller.nodeSelector."kubernetes\.io/role"=edge \
  --set controller.tolerations[0].key=edge-node \
  --set controller.tolerations[0].operator=Exists \
  --set tcp."5432"="default/postgres-postgresql:5432" \
  --set tcp."9092"="default/kafka:9092" \
  --set tcp."5672"="default/rabbitmq:5672"
````


## Instalação dos Serviços de Mensageria
### PostgreSQL
````sh
# Substitua YOUR_STRONG_POSTGRES_PASSWORD por uma senha forte
helm install postgres bitnami/postgresql \
  --set auth.postgresPassword=YOUR_STRONG_POSTGRES_PASSWORD \
  --set metrics.enabled=true
````

### RabbitMQ
```sh
# Substitua YOUR_STRONG_RABBITMQ_PASSWORD por uma senha forte
helm install rabbitmq bitnami/rabbitmq \
  --set auth.username=user \
  --set auth.password=YOUR_STRONG_RABBITMQ_PASSWORD \
  --set metrics.enabled=true
```

### Kafka
Crie o arquivo kafka-values.yaml:
```sh
kraft:
  enabled: false
zookeeper:
  enabled: true
auth:
  enabled: false
replicaCount: 1
metrics:
  jmx:
    enabled: true
external:
  enabled: true
  service:
    type: NodePort
  advertisedListeners:
    - kafka.carlospamplona.dev:9092
```
aplique com helm:
```sh
helm install kafka bitnami/kafka --values kafka-values.yaml
```


### Instalando Prometheus + grafana caso queira visualizar através dessa UI
(não utilizamos para produzir o resultado final, mas é útil armazenar a informação para projetos futuros)
```sh
# Adicionar o repositório
helm repo add prometheus-community https://prometheus-community.github.io/helm-charts
helm repo update

# Instalar a stack no namespace 'monitoring'
helm install monitor prometheus-community/kube-prometheus-stack \
  --namespace monitoring --create-namespace
```

#### ServiceMonitors
Para que o Prometheus descubra os exporters dos nossos serviços, criaremos ServiceMonitors personalizados.
```sh
# custom-servicemonitors.yaml
apiVersion: monitoring.coreos.com/v1
kind: ServiceMonitor
metadata:
  name: kafka-servicemonitor
  namespace: monitoring
  labels:
    release: monitor
spec:
  selector:
    matchLabels:
      app.kubernetes.io/instance: kafka
      app.kubernetes.io/component: metrics
  namespaceSelector:
    matchNames:
    - default
  endpoints:
  - port: http-metrics-jmx
    interval: 15s
---
apiVersion: monitoring.coreos.com/v1
kind: ServiceMonitor
metadata:
  name: rabbitmq-servicemonitor
  namespace: monitoring
  labels:
    release: monitor
spec:
  selector:
    matchLabels:
      app.kubernetes.io/instance: rabbitmq
      app.kubernetes.io/name: rabbitmq
  namespaceSelector:
    matchNames:
    - default
  endpoints:
  - port: metrics
    interval: 15s
---
apiVersion: monitoring.coreos.com/v1
kind: ServiceMonitor
metadata:
  name: postgresql-servicemonitor
  namespace: monitoring
  labels:
    release: monitor
spec:
  selector:
    matchLabels:
      app.kubernetes.io/instance: postgres
      app.kubernetes.io/component: metrics
  namespaceSelector:
    matchNames:
    - default
  endpoints:
  - port: http-metrics
    interval: 15s
```

```sh
kubectl apply -f custom-servicemonitors.yaml
```

Configuração do Acesso Externo ao Grafana:

```
import os

# Substitua pelo IP público do seu nó de borda
PUBLIC_IP = "150.165.85.56"

# Substitua pelas senhas que você definiu na instalação
RABBITMQ_PASS = "YOUR_STRONG_RABBITMQ_PASSWORD"
POSTGRES_PASS = "YOUR_STRONG_POSTGRES_PASSWORD"

KAFKA_CONFIG = {
    "bootstrap_servers": f"{PUBLIC_IP}:9092",
    "topic": "meu-topico-kafka"
}

RABBITMQ_CONFIG = {
    "host": PUBLIC_IP,
    "username": "user",
    "password": RABBITMQ_PASS,
    "queue": "minha-fila-rabbitmq"
}

POSTGRES_CONFIG = {
    "dsn": f"postgresql://postgres:{POSTGRES_PASS}@{PUBLIC_IP}:5432/postgres",
    "channel": "meu_canal_postgres"
}
```
