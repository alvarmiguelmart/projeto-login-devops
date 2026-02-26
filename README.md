┌─────────────────────────────────────────────────────────────┐
│                    ARQUITETURA DO SISTEMA                    │
├─────────────────────────────────────────────────────────────┤
│                                                              │
│  🌐 FRONTEND                  🔧 BACKEND                    │
│  ┌────────────────┐          ┌────────────────┐            │
│  │  Nginx         │          │  Node.js API   │            │
│  │  React/Vue     │    ┌────▶│  Express       │            │
│  │  Container     │    │     │  JWT Auth      │            │
│  └────────┬───────┘    │     └────────┬───────┘            │
│           │            │              │                     │
│           └────────────┼──────────────┘                     │
│                        │                                     │
│                    ┌───▼────┐          ┌──────────────┐    │
│                    │  Redis │◄─────────┤   MongoDB    │    │
│                    │ Session│          │   Usuários   │    │
│                    │ Cache  │          │              │    │
│                    └────────┘          └──────────────┘    │
│                                                              │
├─────────────────────────────────────────────────────────────┤
│                    INFRAESTRUTURA DEVOPS                     │
├─────────────────────────────────────────────────────────────┤
│                                                              │
│  📦 CONTAINERIZAÇÃO        🔄 CI/CD                         │
│  ┌────────────────┐        ┌────────────────┐              │
│  │ Docker         │        │ GitHub Actions │              │
│  │ Docker Compose │        │ Tests Auto     │              │
│  │ Kubernetes     │        │ Deploy Auto    │              │
│  └────────────────┘        └────────────────┘              │
│                                                              │
│  📊 MONITORAMENTO          🔐 SEGURANÇA                      │
│  ┌────────────────┐        ┌────────────────┐              │
│  │ Prometheus     │        │ SSL/TLS        │              │
│  │ Grafana        │        │ Rate Limiting  │              │
│  │ ELK Stack      │        │ WAF            │              │
│  └────────────────┘        └────────────────┘              │
│                                                              │
│  ☁️ INFRAESTRUTURA          🚀 ORQUESTRAÇÃO                  │
│  ┌────────────────┐        ┌────────────────┐              │
│  │ Terraform      │        │ Kubernetes     │              │
│  │ AWS/Azure/GCP  │        │ Istio          │              │
│  │ Ansible        │        │ Horizontal     │              │
│  │                │        │ Pod Autoscaler │              │
│  └────────────────┘        └────────────────┘              │
│                                                              │
└─────────────────────────────────────────────────────────────┘

# 🔐 Sistema de Autenticação DevOps

Sistema completo de autenticação com arquitetura DevOps, containerização, orquestração, CI/CD e monitoramento.

## 🏗️ Arquitetura

- **Frontend**: React.js com Nginx
- **Backend**: Node.js + Express + JWT
- **Database**: MongoDB (Replica Set)
- **Cache**: Redis
- **Orquestração**: Kubernetes
- **CI/CD**: GitHub Actions
- **Infraestrutura**: Terraform (AWS)
- **Monitoramento**: Prometheus + Grafana + ELK
- **Containerização**: Docker

## 🚀 Quick Start

### Pré-requisitos
- Docker e Docker Compose
- Kubernetes (kubectl)
- Terraform
- AWS CLI (para deploy em cloud)
- Node.js 18+

### Desenvolvimento Local

```bash
# Clone o repositório
git clone https://github.com/alvarmiguelmart/projeto-login-devops.git
cd projeto-login-devops

# Configure as variáveis de ambiente
cp .env.example .env

# Inicie com Docker Compose
docker-compose up -d

# Acesse a aplicação
# Frontend: http://localhost
# Backend API: http://localhost:3000/api
# MongoDB: localhost:27017
# Redis: localhost:6379
# Prometheus: http://localhost:9090
# Grafana: http://localhost:3001 (admin/admin123)
# Kibana: http://localhost:5601
```

### Deploy com Kubernetes

```bash
# Crie o namespace
kubectl apply -f k8s/namespace.yaml

# Aplique as configurações
kubectl apply -f k8s/configmap.yaml
kubectl apply -f k8s/secrets.yaml

# Deploy das aplicações
kubectl apply -f k8s/

# Verifique o status
kubectl get pods -n auth-system
kubectl get svc -n auth-system
```

### Deploy em Cloud (AWS) com Terraform

```bash
cd terraform

# Inicialize o Terraform
terraform init

# Planeje as mudanças
terraform plan -var-file="environments/prod.tfvars"

# Aplique a infraestrutura
terraform apply -var-file="environments/prod.tfvars" -auto-approve
```

## 🔄 CI/CD Pipeline

O pipeline automatizado inclui:

- ✅ Testes unitários e de integração
- ✅ Análise de segurança (Snyk, Trivy)
- ✅ Build e push de imagens Docker
- ✅ Deploy automático para Kubernetes
- ✅ Smoke tests pós-deploy
- ✅ Rollback automático em caso de falha

## 📊 Monitoramento

### Métricas Coletadas
- CPU/Memory usage por pod
- Taxa de requisições HTTP
- Latência de endpoints
- Taxa de erros (4xx, 5xx)
- Conexões com banco de dados
- Cache hit ratio

### Dashboards
- **Grafana**: Métricas de performance
- **Kibana**: Logs centralizados
- **Prometheus**: Alertas e métricas

### Alertas
- Alto uso de recursos
- Pods com falha
- Alta taxa de erros
- Latência acima do threshold
- Conexões excessivas

## 🔐 Segurança

### Medidas Implementadas
- ✅ SSL/TLS com certificados Let's Encrypt
- ✅ Rate limiting por IP
- ✅ Sanitização de inputs
- ✅ Headers de segurança (Helmet)
- ✅ CORS configurado
- ✅ JWT com refresh token
- ✅ Hash de senhas com bcrypt
- ✅ Secrets gerenciados via Kubernetes
- ✅ Network policies
- ✅ Pod security policies

### Backups
- Backup automático do MongoDB a cada 6h
- Backup do Redis a cada 1h
- Retenção de 30 dias
- Backup em S3 com criptografia

## 🧪 Testes

```bash
# Testes unitários
npm run test:unit

# Testes de integração
npm run test:integration

# Testes end-to-end
npm run test:e2e

# Testes de carga (K6)
k6 run tests/load/login-test.js
```

## 📈 Escalabilidade

- Horizontal Pod Autoscaling baseado em CPU/memória
- Cluster AutoScaler para nodes do Kubernetes
- Read replicas do MongoDB para consultas
- Redis Cluster para cache distribuído
- CDN para assets estáticos

## 🐛 Troubleshooting

### Pod não inicia
```bash
kubectl describe pod <pod-name> -n auth-system
kubectl logs <pod-name> -n auth-system
```

### Banco de dados sem conexão
```bash
kubectl exec -it mongodb-0 -n auth-system -- mongo
rs.status()
```

### Alta latência
```bash
# Verifique métricas no Grafana
# Scale up se necessário
kubectl scale deployment backend --replicas=5 -n auth-system
```

## 🤝 Contribuição

1. Fork o projeto
2. Crie sua feature branch (`git checkout -b feature/AmazingFeature`)
3. Commit suas mudanças (`git commit -m 'Add some AmazingFeature'`)
4. Push para a branch (`git push origin feature/AmazingFeature`)
5. Abra um Pull Request

## 📄 Licença

MIT License - veja o arquivo LICENSE para detalhes.

---

Desenvolvido para fins de estudo.
