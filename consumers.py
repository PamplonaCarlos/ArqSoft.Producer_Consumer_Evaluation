# consumers.py
from abc import ABC, abstractmethod
import pika
import kafka
import psycopg2
import psycopg2.extensions
import select
import json
import datetime
import csv
import os
from config import KAFKA_CONFIG, RABBITMQ_CONFIG, POSTGRES_CONFIG

# --- Nova Função para Logar em CSV ---
def log_to_csv(system, latency_ms, message, send_time, receive_time):
    """Salva os resultados da mensagem em um arquivo CSV."""
    file_exists = os.path.isfile('results.csv')
    with open('results.csv', 'a', newline='') as csvfile:
        fieldnames = ['system', 'latency_ms', 'message', 'send_time_utc', 'receive_time_utc']
        writer = csv.DictWriter(csvfile, fieldnames=fieldnames)

        if not file_exists:
            writer.writeheader()
        
        writer.writerow({
            'system': system,
            'latency_ms': latency_ms,
            'message': message,
            'send_time_utc': send_time,
            'receive_time_utc': receive_time
        })
    print(f"[{system}] Latência: {latency_ms:.2f} ms | Mensagem: '{message}' | Log salvo em results.csv")

class Consumer(ABC):
    @abstractmethod
    def consume_messages(self):
        pass

class KafkaConsumer(Consumer):
    def __init__(self):
        self.consumer = kafka.KafkaConsumer(
            KAFKA_CONFIG["topic"],
            bootstrap_servers=KAFKA_CONFIG["bootstrap_servers"],
            auto_offset_reset='earliest'
        )

    def consume_messages(self):
        print("Kafka Consumer esperando por mensagens...")
        for msg in self.consumer:
            receive_time_dt = datetime.datetime.now(datetime.timezone.utc)
            
            try:
                data = json.loads(msg.value.decode('utf-8'))
                message = data['message']
                send_time_dt = datetime.datetime.fromisoformat(data['send_time'])
                
                latency = receive_time_dt - send_time_dt
                latency_ms = latency.total_seconds() * 1000
                
                log_to_csv("kafka", latency_ms, message, send_time_dt.isoformat(), receive_time_dt.isoformat())
                
            except (json.JSONDecodeError, KeyError) as e:
                print(f"Kafka: Erro ao processar mensagem - {e}: {msg.value.decode('utf-8')}")

class RabbitMQConsumer(Consumer):
    def __init__(self):
        credentials = pika.PlainCredentials(RABBITMQ_CONFIG["username"], RABBITMQ_CONFIG["password"])
        self.connection = pika.BlockingConnection(pika.ConnectionParameters(host=RABBITMQ_CONFIG["host"], credentials=credentials))
        self.channel = self.connection.channel()
        self.channel.queue_declare(queue=RABBITMQ_CONFIG["queue"])
        self.queue = RABBITMQ_CONFIG["queue"]

    def consume_messages(self):
        def callback(ch, method, properties, body):
            receive_time_dt = datetime.datetime.now(datetime.timezone.utc)
            
            try:
                data = json.loads(body.decode('utf-8'))
                message = data['message']
                send_time_dt = datetime.datetime.fromisoformat(data['send_time'])
                
                latency = receive_time_dt - send_time_dt
                latency_ms = latency.total_seconds() * 1000
                
                log_to_csv("rabbitmq", latency_ms, message, send_time_dt.isoformat(), receive_time_dt.isoformat())

            except (json.JSONDecodeError, KeyError) as e:
                print(f"RabbitMQ: Erro ao processar mensagem - {e}: {body.decode('utf-8')}")

        self.channel.basic_consume(queue=self.queue, on_message_callback=callback, auto_ack=True)
        print('RabbitMQ Consumer esperando por mensagens...')
        self.channel.start_consuming()

class PostgresConsumer(Consumer):
    def __init__(self):
        self.conn = psycopg2.connect(POSTGRES_CONFIG["dsn"])
        self.conn.set_isolation_level(psycopg2.extensions.ISOLATION_LEVEL_AUTOCOMMIT)
        self.channel_name = POSTGRES_CONFIG["channel"]

    def consume_messages(self):
        with self.conn.cursor() as cur:
            cur.execute(f"LISTEN {self.channel_name};")
            print(f"PostgreSQL Consumer esperando por mensagens no canal {self.channel_name}...")
            while True:
                if select.select([self.conn], [], [], 5) == ([], [], []):
                    pass
                else:
                    self.conn.poll()
                    while self.conn.notifies:
                        notify = self.conn.notifies.pop(0)
                        receive_time_dt = datetime.datetime.now(datetime.timezone.utc)
                        
                        try:
                            data = json.loads(notify.payload)
                            message = data['message']
                            send_time_dt = datetime.datetime.fromisoformat(data['send_time'])
                            
                            latency = receive_time_dt - send_time_dt
                            latency_ms = latency.total_seconds() * 1000
                            
                            log_to_csv("postgres", latency_ms, message, send_time_dt.isoformat(), receive_time_dt.isoformat())

                        except (json.JSONDecodeError, KeyError) as e:
                            print(f"PostgreSQL: Erro ao processar mensagem - {e}: {notify.payload}")

def get_consumer(system: str) -> Consumer:
    if system == "kafka":
        return KafkaConsumer()
    elif system == "rabbitmq":
        return RabbitMQConsumer()
    elif system == "postgres":
        return PostgresConsumer()
    else:
        raise ValueError("Sistema de mensageria desconhecido")
