# main.py
import sys
from config import MESSAGING_SYSTEM
from producers import get_producer
from consumers import get_consumer

def main():
    if len(sys.argv) < 2:
        print("Uso: python main.py <producer|consumer> [mensagem]")
        sys.exit(1)

    mode = sys.argv[1]

    if mode == "producer":
        if len(sys.argv) < 3:
            print("Uso: python main.py producer <mensagem>")
            sys.exit(1)
        
        message = sys.argv[2]
        producer = get_producer(MESSAGING_SYSTEM)
        producer.send_message(message)

    elif mode == "consumer":
        consumer = get_consumer(MESSAGING_SYSTEM)
        consumer.consume_messages()

    else:
        print(f"Modo desconhecido: {mode}")

if __name__ == "__main__":
    main()
