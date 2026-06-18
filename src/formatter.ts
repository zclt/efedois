import { FIIData } from "./types";

export function toMarkdown(dados: FIIData): string {
  const linhas: string[] = [
    `# ${dados.ticker} — ${dados.nome}`,
    "",
    `> Consultado em: ${new Date(dados.consultado_em).toLocaleString("pt-BR")}`,
    `> Fonte: ${dados.fonte}`,
    "",
    "## Indicadores Principais",
    "",
    "| Indicador | Valor |",
    "|-----------|-------|",
    `| Preço Atual | ${dados.preco_atual ?? "—"} |`,
    `| Variação do Dia | ${dados.variacao_dia ?? "—"} |`,
    `| DY 12M | ${dados.dy_12m ?? "—"} |`,
    `| P/VP | ${dados.pvp ?? "—"} |`,
    `| Segmento | ${dados.segmento ?? "—"} |`,
    `| Gestora | ${dados.gestora ?? "—"} |`,
  ];

  const extras = Object.entries(dados.dados_adicionais).filter(
    ([k]) => !["Segmento", "Gestora", "DY (12M)", "DY 12M", "P/VP"].includes(k)
  );

  if (extras.length > 0) {
    linhas.push("", "## Dados Adicionais", "", "| Campo | Valor |", "|-------|-------|");
    for (const [k, v] of extras) {
      linhas.push(`| ${k} | ${v} |`);
    }
  }

  return linhas.join("\n");
}

export function toJSON(dados: FIIData): string {
  return JSON.stringify(dados, null, 2);
}
