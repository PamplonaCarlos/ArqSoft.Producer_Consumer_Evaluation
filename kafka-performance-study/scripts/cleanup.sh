#!/bin/bash

# Kafka Performance Study - Cleanup Script
# Este script limpa o ambiente e recursos utilizados

set -e

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

# Stop all containers
stop_containers() {
    print_status "Parando containers Docker..."

    if [ -f "docker-compose.yml" ]; then
        docker-compose down
        print_success "Containers parados"
    else
        print_warning "docker-compose.yml não encontrado, pulando parada de containers"
    fi
}

# Remove volumes (optional)
remove_volumes() {
    if [ "$1" = "--volumes" ]; then
        print_status "Removendo volumes Docker..."
        docker-compose down -v 2>/dev/null || true

        # Remove named volumes
        docker volume rm kafka-performance-study_kafka-data 2>/dev/null || true
        docker volume rm kafka-performance-study_zookeeper-data 2>/dev/null || true
        docker volume rm kafka-performance-study_zookeeper-logs 2>/dev/null || true
        docker volume rm kafka-performance-study_prometheus-data 2>/dev/null || true
        docker volume rm kafka-performance-study_grafana-data 2>/dev/null || true

        print_success "Volumes removidos"
    fi
}

# Clean Node.js artifacts
clean_node() {
    if [ "$1" = "--full" ]; then
        print_status "Removendo node_modules..."
        rm -rf node_modules
        print_success "node_modules removido"
    fi

    print_status "Limpando arquivos compilados..."
    rm -rf dist
    rm -rf build
    rm -f *.log
    print_success "Arquivos compilados limpos"
}

# Kill any remaining processes
kill_processes() {
    print_status "Verificando processos Node.js relacionados..."

    # Kill any ts-node processes
    pkill -f "ts-node" 2>/dev/null || true
    pkill -f "kafka-producer" 2>/dev/null || true
    pkill -f "kafka-consumer" 2>/dev/null || true
    pkill -f "kafka-monitoring" 2>/dev/null || true

    print_success "Processos limpos"
}

# Clean Docker images (optional)
clean_images() {
    if [ "$1" = "--images" ]; then
        print_status "Removendo imagens Docker não utilizadas..."
        docker image prune -f
        print_success "Imagens limpas"
    fi
}

# Show cleanup options
show_help() {
    echo "🧹 Kafka Performance Study - Script de Limpeza"
    echo "=============================================="
    echo ""
    echo "Uso: $0 [opções]"
    echo ""
    echo "Opções:"
    echo "  --volumes    Remove volumes Docker (dados serão perdidos!)"
    echo "  --full       Remove node_modules também"
    echo "  --images     Remove imagens Docker não utilizadas"
    echo "  --all        Executa limpeza completa (volumes + node_modules + images)"
    echo "  --help       Mostra esta ajuda"
    echo ""
    echo "Exemplos:"
    echo "  $0                    # Limpeza básica"
    echo "  $0 --volumes          # Limpeza + remove volumes"
    echo "  $0 --full             # Limpeza + remove node_modules"
    echo "  $0 --all              # Limpeza completa"
}

# Main cleanup function
main_cleanup() {
    local remove_volumes=false
    local full_clean=false
    local clean_images_flag=false

    # Parse arguments
    for arg in "$@"; do
        case $arg in
            --volumes)
                remove_volumes=true
                ;;
            --full)
                full_clean=true
                ;;
            --images)
                clean_images_flag=true
                ;;
            --all)
                remove_volumes=true
                full_clean=true
                clean_images_flag=true
                ;;
            --help)
                show_help
                exit 0
                ;;
        esac
    done

    echo "🧹 Iniciando limpeza do ambiente..."

    kill_processes
    stop_containers

    if [ "$remove_volumes" = true ]; then
        print_warning "⚠️  ATENÇÃO: Volumes serão removidos. Todos os dados do Kafka serão perdidos!"
        read -p "Continuar? (y/N): " -n 1 -r
        echo
        if [[ $REPLY =~ ^[Yy]$ ]]; then
            remove_volumes --volumes
        else
            print_status "Remoção de volumes cancelada"
        fi
    fi

    if [ "$full_clean" = true ]; then
        clean_node --full
    else
        clean_node
    fi

    if [ "$clean_images_flag" = true ]; then
        clean_images --images
    fi

    print_success "🎉 Limpeza concluída!"
    echo ""
    echo "📋 O que foi limpo:"
    echo "   ✅ Containers Docker parados"
    if [ "$remove_volumes" = true ]; then
        echo "   ✅ Volumes Docker removidos"
    fi
    if [ "$full_clean" = true ]; then
        echo "   ✅ node_modules removido"
    fi
    echo "   ✅ Arquivos compilados removidos"
    echo "   ✅ Processos Node.js finalizados"
    if [ "$clean_images_flag" = true ]; then
        echo "   ✅ Imagens Docker não utilizadas removidas"
    fi
    echo ""
    echo "🚀 Para reiniciar o ambiente, execute: ./scripts/setup.sh"
}

# Handle interruption
trap 'print_error "Limpeza interrompida pelo usuário"; exit 1' INT

# Main execution
if [ $# -eq 0 ]; then
    main_cleanup
else
    main_cleanup "$@"
fi
