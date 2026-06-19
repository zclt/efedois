# FII Monitor

POC para consulta automatizada de Fundos de Investimento Imobiliário (FIIs) com scraping headless via Playwright + TypeScript.

Inclui servidor REST, dashboard web com atualização automática e histórico persistido no navegador.

## Funcionalidades

- Scraping headless do [Status Invest](https://statusinvest.com.br) via Playwright/Chromium
- Retorno de dados em JSON e Markdown
- Servidor REST com `GET /fii/:ticker`
- Dashboard web com atualização automática configurável
- Histórico das últimas consultas por FII (localStorage)
- Indicador de momento de compra baseado em P/VP, DY e tendência de preço

## Pré-requisitos

- Node.js 18+
- npm

## Instalação

```bash
npm install
npx playwright install chromium
```

## Uso

### Dashboard (recomendado)

```bash
npm run server
```

Acesse `http://localhost:3000` — configure os tickers e o intervalo de atualização pelo próprio dashboard.

### REST API

```bash
# Inicia o servidor
npm run server

# Consulta um FII
curl http://localhost:3000/fii/MXRF11
```

**Resposta (`200 OK`):**

```json
{
  "ticker": "MXRF11",
  "nome": "Maxi Renda",
  "preco_atual": "9,68",
  "variacao_dia": "0,21%",
  "dy_12m": "12,33",
  "pvp": "1,03",
  "segmento": "Papéis",
  "gestora": null,
  "fonte": "https://statusinvest.com.br/fundos-imobiliarios/mxrf11",
  "consultado_em": "2026-06-18T19:37:44.303Z",
  "dados_adicionais": { ... }
}
```

**Erro (`404`):**

```json
{ "erro": "FII não encontrado", "ticker": "XXXXXX" }
```

### CLI

```bash
# Consulta e salva em output/<TICKER>.json e output/<TICKER>.md
npm start              # usa MXRF11
npm run fii -- HGLG11
```

### Porta customizada

```bash
PORT=8080 npm run server
```

## Docker

```bash
# Build e sobe na porta 3000
docker compose up --build

# Porta customizada no host
PORT=8080 docker compose up

# Sem compose
docker build -t fii-monitor .
docker run -p 3000:3000 fii-monitor
```

## Dashboard

| Funcionalidade | Detalhe |
|---|---|
| Tickers monitorados | Campo separado por vírgula, salvo no localStorage |
| Intervalo de atualização | 30s, 1min, 2min, 5min, 10min — salvo no localStorage |
| Histórico por card | Últimas 3 consultas exibidas, até 10 mantidas no localStorage |
| Indicador de compra | Baseado em P/VP + DY 12M + tendência de preço |

### Lógica do indicador de compra

| Sinal | Critério |
|---|---|
| 🟢 Excelente | Score ≥ 4 |
| 🟡 Bom | Score ≥ 2 |
| ⚪ Neutro | Score ≥ 0 |
| 🔴 Avaliar com cuidado | Score < 0 |

Pontuação: P/VP abaixo do VPA (+1 a +3), DY acima de 9% (+1 a +2), preço em queda no histórico (+1). Valores acima do VPA ou DY baixo penalizam.

> **Aviso:** este indicador é meramente informativo e não constitui recomendação de investimento.

## Estrutura

```
src/
  scraper.ts    # Playwright → Status Invest
  formatter.ts  # FIIData → JSON / Markdown
  types.ts      # Interfaces TypeScript
  index.ts      # CLI
  server.ts     # Servidor Fastify (REST + dashboard)
public/
  index.html    # Dashboard (HTML/CSS/JS vanilla)
output/         # Arquivos gerados pelo CLI
```
