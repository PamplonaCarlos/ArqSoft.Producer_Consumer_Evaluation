# producers.py
from abc import ABC, abstractmethod
import pika
import kafka
import psycopg2
import psycopg2.extensions
import json
import datetime
from config import KAFKA_CONFIG, RABBITMQ_CONFIG, POSTGRES_CONFIG

class Producer(ABC):
    @abstractmethod
    def send_message(self, message):
        pass

class KafkaProducer(Producer):
    def __init__(self):
        self.producer = kafka.KafkaProducer(
            bootstrap_servers=KAFKA_CONFIG["bootstrap_servers"]
        )
        self.topic = KAFKA_CONFIG["topic"]

    def send_message(self, message):
        # Cria o payload com a mensagem e o timestamp
        send_time = datetime.datetime.now(datetime.timezone.utc).isoformat()
        payload = {
            "message": message,
            "send_time": send_time
        }
        json_payload = json.dumps(payload).encode('utf-8')

        try:
            print(f"Kafka: Enviando payload: {json_payload.decode()}")
            future = self.producer.send(self.topic, json_payload)
            record_metadata = future.get(timeout=10)
            print(f"Kafka: Mensagem gravada com sucesso no tópico '{record_metadata.topic}'")
        except Exception as e:
            print(f"Kafka: Erro REAL ao enviar a mensagem: {e}")
        finally:
            self.producer.flush()

class RabbitMQProducer(Producer):
    def __init__(self):
        credentials = pika.PlainCredentials(RABBITMQ_CONFIG["username"], RABBITMQ_CONFIG["password"])
        self.connection = pika.BlockingConnection(pika.ConnectionParameters(host=RABBITMQ_CONFIG["host"], credentials=credentials))
        self.channel = self.connection.channel()
        self.channel.queue_declare(queue=RABBITMQ_CONFIG["queue"])
        self.queue = RABBITMQ_CONFIG["queue"]

    def send_message(self, message):
        # Cria o payload com a mensagem e o timestamp
        send_time = datetime.datetime.now(datetime.timezone.utc).isoformat()
        payload = {
            "message": message,
            "send_time": send_time
        }
        json_payload = json.dumps(payload)
        
        self.channel.basic_publish(exchange='', routing_key=self.queue, body=json_payload)
        print(f"RabbitMQ: Payload enviado para a fila {self.queue}: {json_payload}")
        self.connection.close()

class PostgresProducer(Producer):
    def __init__(self):
        self.conn = psycopg2.connect(POSTGRES_CONFIG["dsn"])
        self.channel_name = POSTGRES_CONFIG["channel"]

    def send_message(self, message):
        # Cria o payload com a mensagem e o timestamp
        send_time = datetime.datetime.now(datetime.timezone.utc).isoformat()
        payload = {
            "message": message,
            "send_time": send_time
        }
        # Escapa as aspas simples para o SQL
        json_payload = json.dumps(payload).replace("'", "''")

        with self.conn.cursor() as cur:
            cur.execute(f"NOTIFY {self.channel_name}, '{json_payload}';")
        self.conn.commit()
        print(f"PostgreSQL: Payload enviado para o canal {self.channel_name}: {json_payload}")
        self.conn.close()

def get_producer(system: str) -> Producer:
    if system == "kafka":
        return KafkaProducer()
    elif system == "rabbitmq":
        return RabbitMQProducer()
    elif system == "postgres":
        return PostgresProducer()
    else:
        raise ValueError("Sistema de mensageria desconhecido")
