# Rubrica de Devops - Configuração docker
FROM node:24-alpine AS construcao

WORKDIR /app

COPY package.json package-lock.json ./
RUN npm ci

COPY tsconfig.json tsconfig.build.json ./
COPY src ./src
RUN npm run build

FROM node:24-alpine

WORKDIR /app
ENV NODE_ENV=production

COPY package.json package-lock.json ./
RUN npm ci --omit=dev

COPY --from=construcao /app/dist ./dist

USER node
EXPOSE 3000

CMD ["npm", "start"]
