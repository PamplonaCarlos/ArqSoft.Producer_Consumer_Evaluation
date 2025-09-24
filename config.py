# config.py
import os

MESSAGING_SYSTEM = os.getenv("MESSAGING_SYSTEM", "kafka") # kafka, rabbitmq, ou postgres

KAFKA_CONFIG = {
    "bootstrap_servers": "kafka.carlospamplona.dev:9092",
    "topic": "meu-topico-kafka"
}

RABBITMQ_CONFIG = {
    "host": "rabbitmq.carlospamplona.dev", # O Ingress direciona para o serviço certo
    "port": 5672, # Porta padrão AMQP
    "username": "carlospimpolho",
    "password": "carlospimpao123",
    "queue": "minha-fila-rabbitmq"
}

POSTGRES_CONFIG = {
    "dsn": "postgresql://postgres:carlospimpao123@postgress.carlospamplona.dev:5432/postgres",
    "channel": "meu_canal_pg"
}
