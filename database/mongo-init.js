// MongoDB Initialization Script
// Executado automaticamente na primeira inicialização do container

db = db.getSiblingDB('auth_db');

// Criar coleção de usuários com validação
db.createCollection('users', {
    validator: {
        $jsonSchema: {
            bsonType: 'object',
            required: ['name', 'email', 'password'],
            properties: {
                name: {
                    bsonType: 'string',
                    description: 'Nome do usuário - obrigatório'
                },
                email: {
                    bsonType: 'string',
                    pattern: '^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\\.[a-zA-Z]{2,}$',
                    description: 'Email válido - obrigatório'
                },
                password: {
                    bsonType: 'string',
                    description: 'Senha hash - obrigatório'
                },
                role: {
                    enum: ['user', 'admin'],
                    description: 'Função do usuário'
                },
                isActive: {
                    bsonType: 'bool',
                    description: 'Status da conta'
                }
            }
        }
    }
});

// Criar índices
db.users.createIndex({ email: 1 }, { unique: true });
db.users.createIndex({ createdAt: -1 });
db.users.createIndex({ role: 1 });
db.users.createIndex({ isActive: 1 });

// Criar coleção de sessões
db.createCollection('sessions');
db.sessions.createIndex({ createdAt: 1 }, { expireAfterSeconds: 86400 });

// Criar coleção de logs de auditoria
db.createCollection('audit_logs');
db.audit_logs.createIndex({ userId: 1, createdAt: -1 });
db.audit_logs.createIndex({ action: 1 });
db.audit_logs.createIndex({ createdAt: 1 }, { expireAfterSeconds: 7776000 }); // 90 dias

print('✅ Banco de dados auth_db inicializado com sucesso!');
print('📊 Índices criados para as coleções users, sessions e audit_logs');
