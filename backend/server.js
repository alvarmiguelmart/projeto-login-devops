require('dotenv').config();

const express = require('express');
const mongoose = require('mongoose');
const Redis = require('ioredis');
const morgan = require('morgan');
const compression = require('compression');
const { register, collectDefaultMetrics } = require('prom-client');
const logger = require('./src/utils/logger');
const securityMiddleware = require('./src/middleware/security');
const authRoutes = require('./src/routes/auth');
const userRoutes = require('./src/routes/user');

const app = express();
const PORT = process.env.PORT || 3000;

// Coletar métricas padrão do Prometheus
collectDefaultMetrics({ prefix: 'auth_system_' });

// Body parser
app.use(express.json({ limit: '10kb' }));
app.use(express.urlencoded({ extended: true, limit: '10kb' }));

// Compressão
app.use(compression());

// Logging
app.use(morgan('combined', {
  stream: { write: (message) => logger.info(message.trim()) }
}));

// Segurança
securityMiddleware(app);

// Conexão com MongoDB
const connectDB = async () => {
  try {
    await mongoose.connect(process.env.MONGODB_URI, {
      useNewUrlParser: true,
      useUnifiedTopology: true,
    });
    logger.info('✅ MongoDB conectado com sucesso');
  } catch (error) {
    logger.error('❌ Erro ao conectar com MongoDB:', error.message);
    process.exit(1);
  }
};

// Conexão com Redis
const redis = new Redis({
  host: process.env.REDIS_HOST || 'localhost',
  port: process.env.REDIS_PORT || 6379,
  password: process.env.REDIS_PASSWORD || '',
  retryDelayOnFailover: 100,
  maxRetriesPerRequest: 3,
});

redis.on('connect', () => logger.info('✅ Redis conectado com sucesso'));
redis.on('error', (err) => logger.error('❌ Erro no Redis:', err.message));

// Disponibilizar redis para as rotas
app.set('redis', redis);

// Rotas da API
app.use('/api/auth', authRoutes);
app.use('/api/users', userRoutes);

// Health check
app.get('/health', (req, res) => {
  const healthcheck = {
    status: 'ok',
    uptime: process.uptime(),
    timestamp: new Date().toISOString(),
    checks: {
      mongodb: mongoose.connection.readyState === 1 ? 'connected' : 'disconnected',
      redis: redis.status === 'ready' ? 'connected' : 'disconnected',
    }
  };
  
  const isHealthy = healthcheck.checks.mongodb === 'connected' && healthcheck.checks.redis === 'connected';
  res.status(isHealthy ? 200 : 503).json(healthcheck);
});

// Readiness check
app.get('/ready', (req, res) => {
  if (mongoose.connection.readyState === 1 && redis.status === 'ready') {
    res.status(200).json({ status: 'ready' });
  } else {
    res.status(503).json({ status: 'not ready' });
  }
});

// Métricas do Prometheus
app.get('/metrics', async (req, res) => {
  try {
    res.set('Content-Type', register.contentType);
    res.end(await register.metrics());
  } catch (err) {
    res.status(500).end(err);
  }
});

// Tratamento de erros global
app.use((err, req, res, next) => {
  logger.error('Erro não tratado:', err);
  
  res.status(err.statusCode || 500).json({
    success: false,
    error: process.env.NODE_ENV === 'production' ? 'Erro interno do servidor' : err.message,
  });
});

// Rota 404
app.use('*', (req, res) => {
  res.status(404).json({
    success: false,
    error: 'Rota não encontrada',
  });
});

// Iniciar servidor
const startServer = async () => {
  await connectDB();
  
  app.listen(PORT, '0.0.0.0', () => {
    logger.info(`🚀 Servidor rodando na porta ${PORT}`);
    logger.info(`📊 Métricas disponíveis em http://localhost:${PORT}/metrics`);
    logger.info(`🏥 Health check em http://localhost:${PORT}/health`);
  });
};

// Graceful shutdown
const gracefulShutdown = async (signal) => {
  logger.info(`${signal} recebido. Iniciando graceful shutdown...`);
  
  try {
    await mongoose.connection.close();
    logger.info('MongoDB desconectado');
    
    await redis.quit();
    logger.info('Redis desconectado');
    
    process.exit(0);
  } catch (error) {
    logger.error('Erro durante shutdown:', error);
    process.exit(1);
  }
};

process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
process.on('SIGINT', () => gracefulShutdown('SIGINT'));

startServer();

module.exports = app;
