FROM node:20-alpine

# Diretório da aplicação
WORKDIR /app

# Variável de ambiente padrão
ENV NODE_ENV=production

# Copiar manifests de dependências
COPY package*.json ./

# Instalar dependências de produção
RUN npm ci --omit=dev

# Copiar código fonte
COPY . .

# Coolify / Docker health monitoring
HEALTHCHECK --interval=30s --timeout=5s --start-period=10s --retries=3 \
  CMD node -e "process.exit(0)"

# Iniciar agente em loop contínuo
CMD ["node", "index.js"]

