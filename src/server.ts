import fs from "fs";
import path from "path";
import Fastify from "fastify";
import { consultarFII } from "./scraper";
import { getConfig, setConfig, getHistory, pushHistory, getPortfolio, setPortfolioEntry } from "./db";

const server = Fastify({ logger: true });

server.get("/", async (_, reply) => {
  const html = fs.readFileSync(
    path.join(process.cwd(), "public", "index.html"),
    "utf-8"
  );
  return reply.type("text/html").send(html);
});

server.get<{ Params: { ticker: string } }>(
  "/fii/:ticker",
  {
    schema: {
      params: {
        type: "object",
        properties: { ticker: { type: "string" } },
        required: ["ticker"],
      },
      response: {
        200: { type: "object", additionalProperties: true },
        404: {
          type: "object",
          properties: {
            erro: { type: "string" },
            ticker: { type: "string" },
          },
        },
        500: {
          type: "object",
          properties: { erro: { type: "string" } },
        },
      },
    },
  },
  async (request, reply) => {
    const { ticker } = request.params;

    const resultado = await consultarFII(ticker);

    if (!resultado.sucesso || !resultado.dados) {
      return reply.status(404).send({
        erro: "FII não encontrado",
        ticker: ticker.toUpperCase(),
      });
    }

    return reply.send(resultado.dados);
  }
);

// ── Config API ────────────────────────────────────────────────────────────
server.get('/api/config', async () => getConfig());

server.put('/api/config', async (request, reply) => {
  const { fiis, intervalSec } = request.body as { fiis: string[]; intervalSec: number };
  if (!Array.isArray(fiis) || typeof intervalSec !== 'number') {
    return reply.status(400).send({ erro: 'payload inválido' });
  }
  setConfig(fiis, intervalSec);
  return { ok: true };
});

// ── History API ───────────────────────────────────────────────────────────
server.get('/api/history', async () => getHistory());

server.post<{ Params: { ticker: string } }>('/api/history/:ticker', async (request) => {
  const { ticker } = request.params;
  return pushHistory(ticker.toUpperCase(), request.body as object);
});

// ── Portfolio API ─────────────────────────────────────────────────────────
server.get('/api/portfolio', async () => getPortfolio());

server.put<{ Params: { ticker: string } }>('/api/portfolio/:ticker', async (request, reply) => {
  const { ticker } = request.params;
  const { cotas } = request.body as { cotas: number };
  if (typeof cotas !== 'number' || cotas < 0 || cotas > 9999) {
    return reply.status(400).send({ erro: 'cotas inválido' });
  }
  setPortfolioEntry(ticker.toUpperCase(), Math.floor(cotas));
  return { ok: true };
});

function resolveDefaultTickers(): string[] {
  const env = process.env.DEFAULT_FIIS;
  if (env) return env.split(",").map((t) => t.trim()).filter(Boolean);
  return ["MXRF11"];
}

server.get("/fiis", async (_, reply) => {
  const tickers = resolveDefaultTickers();
  const results = await Promise.all(tickers.map((t) => consultarFII(t)));
  const dados = results
    .filter((r) => r.sucesso && r.dados)
    .map((r) => r.dados);
  return reply.send(dados);
});

const PORT = Number(process.env.PORT ?? 3000);
const HOST = process.env.HOST ?? "0.0.0.0";

server.listen({ port: PORT, host: HOST }, (err) => {
  if (err) {
    server.log.error(err);
    process.exit(1);
  }
});
