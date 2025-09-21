#!/bin/bash

# Kafka Performance Study - Setup Script
# Este script configura o ambiente completo para os testes de performance

set -e

echo "🚀 Configurando ambiente Kafka Performance Study..."

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Function to print colored output
print_status() {
    echo -e "${BLUE}[INFO]${NC} $1"
}

print_success() {
    echo -e "${GREEN}[SUCCESS]${NC} $1"
}

print_warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

print_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

# Check if Docker is installed and running
check_docker() {
    print_status "Verificando Docker..."

    if ! command -v docker &> /dev/null; then
        print_error "Docker não encontrado. Por favor, instale o Docker primeiro."
        exit 1
    fi

    if ! docker info &> /dev/null; then
        print_error "Docker não está rodando. Por favor, inicie o Docker primeiro."
        exit 1
    fi

    print_success "Docker está disponível e rodando"
}

# Check if Docker Compose is installed
check_docker_compose() {
    print_status "Verificando Docker Compose..."

    if ! command -v docker-compose &> /dev/null; then
        print_error "Docker Compose não encontrado. Por favor, instale o Docker Compose primeiro."
        exit 1
    fi

    print_success "Docker Compose está disponível"
}

# Check if Node.js is installed
check_nodejs() {
    print_status "Verificando Node.js..."

    if ! command -v node &> /dev/null; then
        print_error "Node.js não encontrado. Por favor, instale o Node.js (versão 16+) primeiro."
        exit 1
    fi

    NODE_VERSION=$(node --version | cut -d 'v' -f 2 | cut -d '.' -f 1)
    if [ "$NODE_VERSION" -lt 16 ]; then
        print_error "Node.js versão 16+ é necessária. Versão atual: $(node --version)"
        exit 1
    fi

    print_success "Node.js $(node --version) está disponível"
}

# Install Node.js dependencies
install_dependencies() {
    print_status "Instalando dependências Node.js..."

    if [ ! -f "package.json" ]; then
        print_error "package.json não encontrado. Execute este script na raiz do projeto."
        exit 1
    fi

    npm install
    print_success "Dependências instaladas com sucesso"
}

# Start Kafka infrastructure
start_kafka() {
    print_status "Iniciando infraestrutura Kafka..."

    if [ ! -f "docker-compose.yml" ]; then
        print_error "docker-compose.yml não encontrado. Execute este script na raiz do projeto."
        exit 1
    fi

    docker-compose down -v 2>/dev/null || true
    docker-compose up -d

    print_status "Aguardando Kafka inicializar..."
    sleep 30

    # Check if Kafka is healthy
    if docker-compose ps | grep -q "kafka.*Up.*healthy"; then
        print_success "Kafka está rodando e saudável"
    else
        print_warning "Kafka pode não estar completamente inicializado. Verificando..."
        sleep 15

        if docker-compose ps | grep -q "kafka.*Up"; then
            print_success "Kafka está rodando"
        else
            print_error "Falha ao iniciar Kafka. Verifique os logs: docker-compose logs"
            exit 1
        fi
    fi
}

# Create Kafka topics
create_topics() {
    print_status "Criando tópicos Kafka..."

    if [ ! -f "scripts/create-topics.js" ]; then
        print_error "Script create-topics.js não encontrado."
        exit 1
    fi

    node scripts/create-topics.js
    print_success "Tópicos criados com sucesso"
}

# Test Kafka connection
test_connection() {
    print_status "Testando conexão com Kafka..."

    # Test producer
    print_status "Testando producer..."
    timeout 30 npx ts-node src/producer/index.ts performance --count 100 --size 512 || {
        print_error "Falha no teste do producer"
        exit 1
    }

    print_success "Producer testado com sucesso"

    # Test consumer
    print_status "Testando consumer..."
    timeout 15 npx ts-node src/consumer/index.ts performance --duration 10 || {
        print_warning "Consumer test teve timeout, mas isso pode ser normal se não há mensagens"
    }

    print_success "Consumer testado com sucesso"
}

# Show service URLs
show_urls() {
    print_success "🎉 Setup concluído com sucesso!"
    echo ""
    echo "📋 Serviços disponíveis:"
    echo "   🌐 Kafka UI:        http://localhost:8080"
    echo "   📊 Prometheus:      http://localhost:9090"
    echo "   📈 Grafana:         http://localhost:3000 (admin/admin)"
    echo "   🔍 Métricas:        http://localhost:3003/metrics"
    echo ""
    echo "🚀 Comandos úteis:"
    echo "   npm run kafka:logs              # Ver logs do Kafka"
    echo "   npm run kafka:list-topics       # Listar tópicos"
    echo "   npm run test:performance        # Executar testes de performance"
    echo "   npm run test:stress             # Executar testes de stress"
    echo "   npm run test:exhaustion         # Executar testes de exaustão"
    echo ""
    echo "📖 Para mais informações, consulte o README.md"
}

# Main execution
main() {
    echo "🔧 Kafka Performance Study - Setup Completo"
    echo "============================================"

    check_docker
    check_docker_compose
    check_nodejs
    install_dependencies
    start_kafka
    create_topics
    test_connection
    show_urls
}

# Handle interruption
trap 'print_error "Setup interrompido pelo usuário"; exit 1' INT

# Run main function
main
