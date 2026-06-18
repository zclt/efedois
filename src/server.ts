import fs from "fs";
import path from "path";
import Fastify from "fastify";
import { consultarFII } from "./scraper";

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

const PORT = Number(process.env.PORT ?? 3000);
const HOST = process.env.HOST ?? "0.0.0.0";

server.listen({ port: PORT, host: HOST }, (err) => {
  if (err) {
    server.log.error(err);
    process.exit(1);
  }
});
