import { load } from "cheerio";
import { FIIData, FIIResult } from "./types";

const HEADERS = {
  "User-Agent":
    "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36",
  Accept:
    "text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,*/*;q=0.8",
  "Accept-Language": "pt-BR,pt;q=0.9,en;q=0.8",
};

export async function consultarFII(ticker: string): Promise<FIIResult> {
  const tickerUpper = ticker.toUpperCase().replace(/11$/, "") + "11";
  const url = `https://statusinvest.com.br/fundos-imobiliarios/${tickerUpper.toLowerCase()}`;

  try {
    console.log(`Acessando: ${url}`);
    const res = await fetch(url, { headers: HEADERS });

    if (!res.ok) {
      return { sucesso: false, dados: null, erro: `HTTP ${res.status}` };
    }

    const html = await res.text();
    const $ = load(html);

    const nomeRaw = $("h1.lh-4").first().text().trim();
    const nome = nomeRaw.replace(tickerUpper, "").replace("-", "").trim() || tickerUpper;

    const preco_atual =
      $(".top-info .info.special strong.value").first().text().trim() || null;

    const variacao_dia =
      $(".top-info .info.special .sub-value b").first().text().trim() || null;

    const blocos = $(".info")
      .toArray()
      .map((el) => {
        const tituloRaw =
          $(el).find("h3.title, span.title, .title").first().text() ?? "";
        const titulo = tituloRaw
          .replace(/help_outline/gi, "")
          .replace(/\s+/g, " ")
          .trim();
        const valor = $(el).find("strong.value").first().text().trim() ?? "";
        const subTitulo =
          $(el).find("span.sub-value").first().text().trim() ?? "";
        return { titulo, valor, subTitulo };
      });

    const find = (labels: string[]) =>
      blocos.find((b) => labels.some((l) => b.titulo.includes(l)))?.valor ??
      null;

    const findBySub = (labels: string[]) =>
      blocos.find((b) => labels.some((l) => b.subTitulo.includes(l)))?.valor ??
      null;

    const dy_12m = find(["Dividend Yield"]);
    const pvp = find(["P/VP"]);
    const segmento = findBySub(["Segmento"]) ?? find(["Segmento ANBIMA"]);

    // Título fica fora do .info neste bloco — seletor direto pelo ID
    const ultimo_dividendo =
      $("#dy-info strong.value").first().text().trim() || null;

    const dados_adicionais: Record<string, string> = {};
    for (const b of blocos) {
      if (b.titulo && b.valor) dados_adicionais[b.titulo] = b.valor;
    }

    const dados: FIIData = {
      ticker: tickerUpper,
      nome,
      preco_atual,
      variacao_dia,
      dy_12m,
      pvp,
      ultimo_dividendo,
      segmento,
      gestora: dados_adicionais["Administrador"] ?? null,
      fonte: url,
      consultado_em: new Date().toISOString(),
      dados_adicionais,
    };

    return { sucesso: true, dados };
  } catch (err) {
    return {
      sucesso: false,
      dados: null,
      erro: `Erro ao extrair dados: ${(err as Error).message}`,
    };
  }
}
