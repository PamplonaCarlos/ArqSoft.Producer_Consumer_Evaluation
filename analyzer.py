# analyzer.py
import csv
import datetime
from collections import defaultdict
import os

def analyze_throughput(filename="results.csv"):
    """
    Lê o arquivo de resultados CSV e calcula a vazão média (mensagens/segundo)
    para cada sistema de mensageria.
    """
    if not os.path.exists(filename):
        print(f"Erro: O arquivo '{filename}' não foi encontrado.")
        print("Por favor, execute o consumidor primeiro para gerar o arquivo de logs.")
        return

    # Usamos um defaultdict para agrupar os timestamps por sistema
    # Ex: {'kafka': [timestamp1, timestamp2, ...], 'rabbitmq': [...]}
    data = defaultdict(list)

    # Lê o arquivo CSV e popula nosso dicionário de dados
    with open(filename, 'r', newline='') as csvfile:
        reader = csv.DictReader(csvfile)
        for row in reader:
            try:
                system = row['system']
                # Converte a string de tempo de volta para um objeto datetime
                receive_time = datetime.datetime.fromisoformat(row['receive_time_utc'])
                data[system].append(receive_time)
            except (KeyError, ValueError) as e:
                print(f"Aviso: Ignorando linha mal formatada ou com cabeçalho ausente: {row} - Erro: {e}")
                continue
    
    if not data:
        print("Nenhum dado válido encontrado no arquivo CSV.")
        return

    print("\n--- Análise de Vazão (Throughput) ---")

    # Calcula e imprime os resultados para cada sistema
    for system, timestamps in data.items():
        total_messages = len(timestamps)
        
        # Para calcular a vazão, precisamos de pelo menos 2 mensagens para ter um intervalo de tempo
        if total_messages < 2:
            print(f"\nSistema: {system.upper()}")
            print(f"  - Mensagens recebidas: {total_messages}")
            print("  - Vazão: Insuficientes dados para calcular (necessário no mínimo 2 mensagens).")
            continue

        # Encontra o primeiro e o último timestamp
        first_message_time = min(timestamps)
        last_message_time = max(timestamps)

        # Calcula a duração em segundos
        duration_seconds = (last_message_time - first_message_time).total_seconds()

        # Evita divisão por zero se todas as mensagens chegarem no mesmo segundo
        if duration_seconds == 0:
            throughput = float('inf') # Vazão teoricamente infinita
        else:
            throughput = total_messages / duration_seconds

        print(f"\nSistema: {system.upper()}")
        print(f"  - Total de Mensagens Recebidas: {total_messages}")
        print(f"  - Tempo Total de Coleta: {duration_seconds:.2f} segundos")
        print(f"  - Vazão Média: {throughput:.2f} mensagens/segundo")

if __name__ == "__main__":
    analyze_throughput()
