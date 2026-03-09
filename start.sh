#!/bin/bash
# GTD Manager — Script de inicialização

set -e

echo "🚀 Iniciando GTD Manager..."

# Check Python
if ! command -v python3 &> /dev/null; then
  echo "❌ Python3 não encontrado. Instale o Python 3.11+"
  exit 1
fi

# Setup backend
cd backend

# Create virtual environment if needed
if [ ! -d ".venv" ]; then
  echo "📦 Criando ambiente virtual..."
  python3 -m venv .venv
fi

source .venv/bin/activate

echo "📦 Instalando dependências..."
pip install -q -r requirements.txt

# Check .env
if [ ! -f ".env" ]; then
  if [ -z "$ANTHROPIC_API_KEY" ]; then
    echo ""
    echo "⚠️  Configure sua chave da API Anthropic:"
    echo "   export ANTHROPIC_API_KEY='sua-chave-aqui'"
    echo "   ou crie o arquivo backend/.env com:"
    echo "   ANTHROPIC_API_KEY=sua-chave-aqui"
    echo ""
  fi
  cp .env.example .env
fi

echo ""
echo "✅ GTD Manager iniciando em http://localhost:8000"
echo "   Pressione Ctrl+C para parar."
echo ""

uvicorn app.main:app --host 0.0.0.0 --port 8000 --reload
