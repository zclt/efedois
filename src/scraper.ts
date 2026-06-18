import { chromium, Page } from "playwright";
import { FIIData, FIIResult } from "./types";

async function extractStatusInvest(page: Page, ticker: string): Promise<Partial<FIIData>> {
  await page.waitForSelector("h1.lh-4", { timeout: 15000 });

  const nomeRaw = await page.$eval("h1.lh-4", (el) => el.textContent?.trim() ?? null).catch(() => null);
  const nome = nomeRaw?.replace(ticker, "").replace("-", "").trim() ?? ticker;

  // Preço atual: primeiro bloco .info.special dentro de .top-info
  const preco_atual = await page.$eval(
    ".top-info .info.special strong.value",
    (el) => el.textContent?.trim() ?? null
  ).catch(() => null);

  // Variação do dia: tag <b> dentro do sub-value do bloco especial
  const variacao_dia = await page.$eval(
    ".top-info .info.special .sub-value b",
    (el) => el.textContent?.trim() ?? null
  ).catch(() => null);

  // Extrai todos os blocos .info por título para capturar DY, P/VP etc.
  const blocos = await page.$$eval(".info", (els) =>
    els.map((el) => {
      const tituloRaw =
        el.querySelector("h3.title, span.title, .title")?.textContent ?? "";
      const titulo = tituloRaw
        .replace(/help_outline/gi, "")
        .replace(/\s+/g, " ")
        .trim();
      const valor =
        el.querySelector("strong.value")?.textContent?.trim() ?? "";
      const subTitulo =
        el.querySelector("span.sub-value")?.textContent?.trim() ?? "";
      return { titulo, valor, subTitulo };
    })
  ).catch(() => [] as { titulo: string; valor: string; subTitulo: string }[]);

  const find = (labels: string[]) =>
    blocos.find((b) => labels.some((l) => b.titulo.includes(l)))?.valor ?? null;

  const findBySub = (labels: string[]) =>
    blocos.find((b) => labels.some((l) => b.subTitulo.includes(l)))?.valor ?? null;

  const dy_12m = find(["Dividend Yield"]);
  const pvp = find(["P/VP"]);
  const segmento = findBySub(["Segmento"]) ?? find(["Segmento ANBIMA"]);

  const dados_adicionais: Record<string, string> = {};
  for (const b of blocos) {
    if (b.titulo && b.valor) dados_adicionais[b.titulo] = b.valor;
  }

  return { nome, preco_atual, variacao_dia, dy_12m, pvp, segmento, dados_adicionais };
}

export async function consultarFII(ticker: string): Promise<FIIResult> {
  const tickerUpper = ticker.toUpperCase().replace(/11$/, "") + "11";
  const url = `https://statusinvest.com.br/fundos-imobiliarios/${tickerUpper.toLowerCase()}`;

  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({
    userAgent:
      "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36",
    locale: "pt-BR",
    timezoneId: "America/Sao_Paulo",
  });

  try {
    const page = await context.newPage();
    console.log(`Acessando: ${url}`);
    await page.goto(url, { waitUntil: "domcontentloaded", timeout: 25000 });
    await page.waitForTimeout(2000);

    const extraido = await extractStatusInvest(page, tickerUpper);

    const dados: FIIData = {
      ticker: tickerUpper,
      nome: extraido.nome ?? tickerUpper,
      preco_atual: extraido.preco_atual ?? null,
      variacao_dia: extraido.variacao_dia ?? null,
      dy_12m: extraido.dy_12m ?? null,
      pvp: extraido.pvp ?? null,
      segmento: extraido.segmento ?? null,
      gestora: extraido.dados_adicionais?.["Administrador"] ?? null,
      fonte: url,
      consultado_em: new Date().toISOString(),
      dados_adicionais: extraido.dados_adicionais ?? {},
    };

    return { sucesso: true, dados };
  } catch (err) {
    return {
      sucesso: false,
      dados: null,
      erro: `Erro ao extrair dados: ${(err as Error).message}`,
    };
  } finally {
    await browser.close();
  }
}
