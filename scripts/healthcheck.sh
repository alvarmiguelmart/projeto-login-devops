#!/bin/bash
set -e

echo " Verificando endpoints do cluster..."
echo "-----------------------------------"

check_endpoint() {
  URL=$1
  EXPECTED=$2
  NAME=$3
  
  if [ -z "$URL" ]; then
    echo "❌ $NAME: URL não fornecida"
    return 1
  fi
  
  STATUS=$(curl -s -o /dev/null -w "%{http_code}" $URL)
  
  if [ "$STATUS" == "$EXPECTED" ]; then
    echo "✅ $NAME: Online (HTTP $STATUS)"
  else
    echo "❌ $NAME: Falha (HTTP $STATUS, esperado $EXPECTED)"
    if [ "$4" == "critical" ]; then
      exit 1
    fi
  fi
}

# Frontend Checks
check_endpoint "http://localhost/" "200" "Frontend"

# API Checks
check_endpoint "http://localhost/api/health" "200" "Backend API"
check_endpoint "http://localhost/api/auth/me" "401" "Protected Auth Route"

# Services Check
echo -e "\n Serviços do Kubernetes..."
echo "-----------------------------------"
kubectl get pods -n auth-system | grep -v "Running" || echo "✅ Todos os pods estão rodando"

echo -e "\n✨ Verificação concluída!"
