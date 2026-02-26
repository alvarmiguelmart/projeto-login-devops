#!/bin/bash
set -e

if [ -z "$1" ]; then
  echo "Uso: $0 <arquivo_backup.tar.gz>"
  exit 1
fi

BACKUP_FILE=$1
NAMESPACE="auth-system"
DB_CONTAINER="mongodb-0"
LOCAL_DIR="/tmp/mongodb-restore"

if [ ! -f "$BACKUP_FILE" ]; then
  echo "Arquivo de backup não encontrado: $BACKUP_FILE"
  exit 1
fi

echo "Iniciando restauração do MongoDB..."

# Preparar arquivo de backup no pod
kubectl exec -n $NAMESPACE $DB_CONTAINER -- mkdir -p $LOCAL_DIR
kubectl cp ./$BACKUP_FILE $NAMESPACE/$DB_CONTAINER:$LOCAL_DIR/backup.tar.gz

# Extrair e restaurar
kubectl exec -n $NAMESPACE $DB_CONTAINER -- sh -c \
  "cd $LOCAL_DIR && tar -xzf backup.tar.gz && \
  mongorestore -u \$MONGO_INITDB_ROOT_USERNAME -p \$MONGO_INITDB_ROOT_PASSWORD \
  --authenticationDatabase admin --drop \
  backup_*/auth_db"

# Limpar arquivos temporários
kubectl exec -n $NAMESPACE $DB_CONTAINER -- rm -rf $LOCAL_DIR

echo "✅ Restauração concluída com sucesso!"
