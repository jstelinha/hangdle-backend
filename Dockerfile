# Rubrica de Devops - Configuração docker
# Etapa 1: instala tudo (TypeScript incluso) e compila o src/ para o dist/.
FROM node:24-alpine AS build

WORKDIR /app

COPY package.json package-lock.json ./
RUN npm ci

COPY tsconfig.json tsconfig.build.json ./
COPY src ./src
RUN npm run build

# Etapa 2: só o que a API precisa para rodar: as dependências de produção e o dist/.
# TypeScript, vitest, tsx e supertest ficam na etapa 1.
FROM node:24-alpine

WORKDIR /app
ENV NODE_ENV=production

COPY package.json package-lock.json ./
# O cache do npm não serve para nada dentro da imagem.
RUN npm ci --omit=dev && npm cache clean --force

COPY --from=build /app/dist ./dist

USER node

EXPOSE 3000

# O node direto, e não o npm start: assim o SIGTERM do docker stop chega na API (src/server.ts), que fecha o servidor
# e o pool do MySQL. O init: true do docker-compose.yml põe um init na frente, que repassa o sinal.
CMD ["node", "dist/server.js"]
