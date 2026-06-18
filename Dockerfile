FROM mcr.microsoft.com/playwright:v1.61.0-noble

WORKDIR /app

COPY package*.json ./
RUN PLAYWRIGHT_SKIP_BROWSER_DOWNLOAD=1 npm ci

COPY tsconfig.json .
COPY src ./src

EXPOSE 3000

CMD ["npx", "tsx", "src/server.ts"]
