import fs from "fs";
import path from "path";
import { consultarFII } from "./scraper";
import { toJSON, toMarkdown } from "./formatter";

function resolveDefaultTickers(): string[] {
  const env = process.env.DEFAULT_FIIS;
  if (env) return env.split(",").map((t) => t.trim()).filter(Boolean);
  return ["MXRF11"];
}

async function main() {
  const tickers = process.argv[2]
    ? [process.argv[2]]
    : resolveDefaultTickers();

  const outputDir = path.join(process.cwd(), "output");
  fs.mkdirSync(outputDir, { recursive: true });

  for (const ticker of tickers) {
    console.log(`\nConsultando FII: ${ticker}\n`);

    const resultado = await consultarFII(ticker);

    if (!resultado.sucesso || !resultado.dados) {
      console.error(`Erro (${ticker}):`, resultado.erro);
      continue;
    }

    const json = toJSON(resultado.dados);
    const markdown = toMarkdown(resultado.dados);

    const base = path.join(outputDir, resultado.dados.ticker);
    fs.writeFileSync(`${base}.json`, json, "utf-8");
    fs.writeFileSync(`${base}.md`, markdown, "utf-8");

    console.log("\n--- JSON ---\n");
    console.log(json);
    console.log("\n--- MARKDOWN ---\n");
    console.log(markdown);
  }

  console.log(`\nArquivos salvos em: ${outputDir}`);
}

main().catch((err) => {
  console.error("Erro fatal:", err);
  process.exit(1);
});
