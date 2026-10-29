# Rubrica de Devops - Configuração docker
FROM node:24-alpine

WORKDIR /app

COPY package.json package-lock.json ./

RUN npm ci

COPY . .

RUN npm run build

ENV NODE_ENV=production
USER node

EXPOSE 3000

CMD ["npm", "start"]
