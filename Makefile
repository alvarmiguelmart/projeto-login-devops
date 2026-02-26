.PHONY: help build push deploy logs clean test lint

DOCKER_REGISTRY ?= ghcr.io/username
VERSION ?= latest
K8S_NAMESPACE ?= auth-system

help:
	@echo "Comandos disponíveis:"
	@echo "  make build          - Build todas as imagens Docker"
	@echo "  make push           - Push imagens para o registry"
	@echo "  make deploy-dev     - Deploy para ambiente de desenvolvimento"
	@echo "  make deploy-prod    - Deploy para produção"
	@echo "  make logs           - Ver logs dos pods"
	@echo "  make clean          - Limpar recursos"
	@echo "  make test           - Rodar testes"
	@echo "  make lint           - Rodar linter"

build:
	@echo "Building backend..."
	docker build -t $(DOCKER_REGISTRY)/auth-backend:$(VERSION) ./backend
	@echo "Building frontend..."
	docker build -t $(DOCKER_REGISTRY)/auth-frontend:$(VERSION) ./frontend

push:
	docker push $(DOCKER_REGISTRY)/auth-backend:$(VERSION)
	docker push $(DOCKER_REGISTRY)/auth-frontend:$(VERSION)

deploy-dev:
	kubectl apply -f k8s/namespace.yaml
	kubectl apply -f k8s/configmap.yaml
	kubectl apply -f k8s/secrets.yaml
	kubectl apply -f k8s/
	kubectl rollout status deployment/backend -n $(K8S_NAMESPACE)
	kubectl rollout status deployment/frontend -n $(K8S_NAMESPACE)

deploy-prod:
	helm upgrade --install auth-system ./helm \
		--namespace $(K8S_NAMESPACE) \
		--values ./helm/values-prod.yaml \
		--set image.tag=$(VERSION)

logs:
	kubectl logs -n $(K8S_NAMESPACE) -l app=backend --tail=100
	kubectl logs -n $(K8S_NAMESPACE) -l app=frontend --tail=100

clean:
	kubectl delete all --all -n $(K8S_NAMESPACE)
	kubectl delete namespace $(K8S_NAMESPACE)

test:
	cd backend && npm test
	cd frontend && npm test

lint:
	cd backend && npm run lint
	cd frontend && npm run lint

backup-db:
	./scripts/backup.sh

restore-db:
	./scripts/restore.sh $(FILE)

status:
	kubectl get all -n $(K8S_NAMESPACE)
	kubectl get hpa -n $(K8S_NAMESPACE)

port-forward-backend:
	kubectl port-forward -n $(K8S_NAMESPACE) deployment/backend 3000:3000

port-forward-mongo:
	kubectl port-forward -n $(K8S_NAMESPACE) statefulset/mongodb 27017:27017

shell-backend:
	kubectl exec -n $(K8S_NAMESPACE) -it deployment/backend -- /bin/sh

shell-mongo:
	kubectl exec -n $(K8S_NAMESPACE) -it statefulset/mongodb-0 -- mongo
