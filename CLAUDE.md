# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

```bash
# Consultar um FII (ticker como argumento, padrão: MXRF11)
npx tsx src/index.ts MXRF11
npx tsx src/index.ts HGLG11

# Via npm scripts
npm start              # consulta MXRF11
npm run fii -- XPLG11  # consulta ticker específico

# Instalar dependências (primeira vez)
npm install
npx playwright install chromium
```

Não há build step — `tsx` executa TypeScript diretamente. Não há testes automatizados.

## Arquitetura

POC de scraping headless de FIIs (Fundos de Investimento Imobiliário) usando Playwright + TypeScript.

**Fluxo:** `index.ts` recebe o ticker via CLI → `scraper.ts` abre Chromium headless e extrai dados do Status Invest → `formatter.ts` serializa para JSON e Markdown → arquivos salvos em `output/<TICKER>.{json,md}`.

**Fonte de dados:** `statusinvest.com.br/fundos-imobiliarios/<ticker>`. O scraper usa `waitUntil: "domcontentloaded"` seguido de `waitForTimeout(2000)` — o site carrega os dados via SSR, não há XHR para aguardar.

**Extração de indicadores (`scraper.ts`):** A página usa blocos `.info` para todos os indicadores. O scraper faz um único `$$eval(".info", ...)` que varre todos os blocos e retorna `{ titulo, valor, subTitulo }`. Indicadores específicos (DY, P/VP, Segmento) são localizados por `find()` que busca por substring no título. O texto `help_outline` (ícone Material Icons inline no DOM) é removido dos títulos antes de salvar.

**Normalização do ticker:** `consultarFII` normaliza qualquer entrada para o formato `XYZW11` (remove o sufixo `11` se presente e re-adiciona), tornando `MXRF` e `MXRF11` equivalentes.

**`FIIData` (types.ts):** Campos estruturados (`preco_atual`, `dy_12m`, `pvp`, `segmento`, `gestora`) + `dados_adicionais: Record<string, string>` que captura tudo mais que aparecer na página. Todos os valores são `string | null` — sem parsing numérico, mantendo o formato brasileiro (`9,68`, `12,33%`).
