FROM node:22-alpine

RUN apk add --no-cache python3 make g++

WORKDIR /app

COPY package*.json ./
RUN npm ci --omit=dev

COPY tsconfig.json .
COPY src ./src
COPY public ./public

EXPOSE 3000

CMD ["npx", "tsx", "src/server.ts"]
