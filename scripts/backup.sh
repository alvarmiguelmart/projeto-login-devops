#!/bin/bash
set -e

# Configurações
NAMESPACE="auth-system"
DB_CONTAINER="mongodb-0"
BACKUP_DIR="/tmp/mongodb-backups"
S3_BUCKET="s3://auth-system-backups-prod/mongodb"
DATE=$(date +%Y%m%d_%H%M%S)
BACKUP_NAME="backup_$DATE"

echo "Iniciando backup do MongoDB ($DATE)..."

# Criar diretório local no pod
kubectl exec -n $NAMESPACE $DB_CONTAINER -- mkdir -p $BACKUP_DIR

# Executar mongodump
kubectl exec -n $NAMESPACE $DB_CONTAINER -- sh -c \
  "mongodump -u \$MONGO_INITDB_ROOT_USERNAME -p \$MONGO_INITDB_ROOT_PASSWORD \
  --authenticationDatabase admin --db \$MONGO_INITDB_DATABASE \
  --out $BACKUP_DIR/$BACKUP_NAME"

# Compactar backup
kubectl exec -n $NAMESPACE $DB_CONTAINER -- sh -c \
  "cd $BACKUP_DIR && tar -czf $BACKUP_NAME.tar.gz $BACKUP_NAME"

# Copiar para máquina local
kubectl cp $NAMESPACE/$DB_CONTAINER:$BACKUP_DIR/$BACKUP_NAME.tar.gz ./$BACKUP_NAME.tar.gz

# Limpar arquivos temporários no pod
kubectl exec -n $NAMESPACE $DB_CONTAINER -- rm -rf $BACKUP_DIR/$BACKUP_NAME
kubectl exec -n $NAMESPACE $DB_CONTAINER -- rm $BACKUP_DIR/$BACKUP_NAME.tar.gz

# Upload para S3 (se AWS CLI estiver configurado)
if command -v aws &> /dev/null; then
  echo "Enviando backup para S3..."
  aws s3 cp ./$BACKUP_NAME.tar.gz $S3_BUCKET/$BACKUP_NAME.tar.gz
  echo "Backup enviado com sucesso para $S3_BUCKET/$BACKUP_NAME.tar.gz"
else
  echo "AWS CLI não encontrado. Backup salvo localmente em ./$BACKUP_NAME.tar.gz"
fi

echo "✅ Backup concluído!"
