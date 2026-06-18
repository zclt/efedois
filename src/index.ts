import fs from "fs";
import path from "path";
import { consultarFII } from "./scraper";
import { toJSON, toMarkdown } from "./formatter";

async function main() {
  const ticker = process.argv[2] ?? "MXRF11";
  console.log(`\nConsultando FII: ${ticker}\n`);

  const resultado = await consultarFII(ticker);

  if (!resultado.sucesso || !resultado.dados) {
    console.error("Erro:", resultado.erro);
    process.exit(1);
  }

  const json = toJSON(resultado.dados);
  const markdown = toMarkdown(resultado.dados);

  const outputDir = path.join(process.cwd(), "output");
  fs.mkdirSync(outputDir, { recursive: true });

  const base = path.join(outputDir, resultado.dados.ticker);
  fs.writeFileSync(`${base}.json`, json, "utf-8");
  fs.writeFileSync(`${base}.md`, markdown, "utf-8");

  console.log("\n--- JSON ---\n");
  console.log(json);
  console.log("\n--- MARKDOWN ---\n");
  console.log(markdown);
  console.log(`\nArquivos salvos em: ${outputDir}`);
}

main().catch((err) => {
  console.error("Erro fatal:", err);
  process.exit(1);
});
