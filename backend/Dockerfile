# Estágio 1: Dependências
FROM node:18-alpine AS deps

WORKDIR /app

# Instalar dependências de build se necessário
RUN apk add --no-cache python3 make g++

COPY package*.json ./
RUN npm ci --only=production

# Estágio 2: Runtime
FROM node:18-alpine

RUN apk add --no-cache tini curl

WORKDIR /app

# Criar usuário não-root
RUN addgroup -g 1001 -S nodejs && \
    adduser -S nodejs -u 1001

# Criar diretório de logs
RUN mkdir -p /app/logs && chown -R nodejs:nodejs /app/logs

# Copiar dependências
COPY --from=deps --chown=nodejs:nodejs /app/node_modules ./node_modules
COPY --chown=nodejs:nodejs . .

# Healthcheck
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
    CMD curl -f http://localhost:3000/health || exit 1

USER nodejs

ENTRYPOINT ["/sbin/tini", "--"]
CMD ["node", "server.js"]

EXPOSE 3000
