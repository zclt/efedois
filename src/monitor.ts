import { consultarFII } from "./scraper";
import { calcSignal, parseBR } from "./signal";
import { notify, ntfyEnabled } from "./notifier";
import { getConfig, getTickerHistory, getNotifyState, setNotifyState } from "./db";
import { FIIData } from "./types";

const INTERVAL_SEC = Number(process.env.NTFY_INTERVAL_SEC ?? 300);
const PRICE_THRESHOLD = Number(process.env.NTFY_PRICE_THRESHOLD ?? 2); // %

// Último estado notificado por ticker. preco_base só avança quando uma
// variação de preço é notificada, então movimentos lentos também disparam.
interface NotifyState {
  preco_base: string | null;
  ultimo_dividendo: string | null;
  signal: string;
}

type Log = { info: (msg: string) => void; error: (msg: string) => void };

function detectChanges(dados: FIIData, prev: NotifyState, next: NotifyState) {
  const changes: string[] = [];
  const tags: string[] = [];

  const base = parseBR(prev.preco_base);
  const atual = parseBR(dados.preco_atual);
  if (base > 0 && atual > 0) {
    const delta = ((atual - base) / base) * 100;
    if (Math.abs(delta) >= PRICE_THRESHOLD) {
      const sinal = delta > 0 ? "+" : "";
      changes.push(`Preço: R$ ${prev.preco_base} → R$ ${dados.preco_atual} (${sinal}${delta.toFixed(2).replace(".", ",")}%)`);
      tags.push(delta > 0 ? "chart_with_upwards_trend" : "chart_with_downwards_trend");
    } else {
      next.preco_base = prev.preco_base;
    }
  }

  if (dados.ultimo_dividendo && prev.ultimo_dividendo !== dados.ultimo_dividendo) {
    changes.push(`Novo dividendo: R$ ${dados.ultimo_dividendo} (anterior R$ ${prev.ultimo_dividendo ?? "—"})`);
    tags.push("moneybag");
  }

  if (prev.signal !== next.signal) {
    changes.push(`Sinal: ${prev.signal} → ${next.signal}`);
  }

  return { changes, tags };
}

async function checkTicker(ticker: string, log: Log) {
  const resultado = await consultarFII(ticker);
  if (!resultado.sucesso || !resultado.dados) {
    log.error(`[monitor] ${ticker}: ${resultado.erro}`);
    return;
  }

  const dados = resultado.dados;
  const hist = getTickerHistory(dados.ticker, 3) as FIIData[];
  const signal = calcSignal(dados, [dados, ...hist]);

  const next: NotifyState = {
    preco_base: dados.preco_atual,
    ultimo_dividendo: dados.ultimo_dividendo,
    signal: `${signal.icon} ${signal.label}`,
  };

  const prev = getNotifyState<NotifyState>(dados.ticker);
  if (!prev) {
    setNotifyState(dados.ticker, next); // primeira consulta: só registra a linha de base
    return;
  }

  const { changes, tags } = detectChanges(dados, prev, next);
  if (changes.length > 0) {
    await notify({
      title: `${dados.ticker} — ${dados.nome}`,
      message: changes.join("\n"),
      tags,
      click: dados.fonte,
    });
    log.info(`[monitor] ${dados.ticker}: notificado (${changes.length} alteração(ões))`);
  }

  // Só persiste após notificar com sucesso — se o ntfy falhar, tenta de novo no próximo ciclo
  setNotifyState(dados.ticker, next);
}

async function runCycle(log: Log) {
  // Lê a config a cada ciclo para refletir os tickers salvos pelo dashboard
  for (const ticker of getConfig().fiis) {
    try {
      await checkTicker(ticker, log);
    } catch (err) {
      log.error(`[monitor] ${ticker}: ${(err as Error).message}`);
    }
  }
}

export function startMonitor(log: Log) {
  if (!ntfyEnabled()) {
    log.info("[monitor] NTFY_TOPIC não definido — notificações desativadas");
    return;
  }

  log.info(`[monitor] notificações ntfy ativas — intervalo ${INTERVAL_SEC}s, limiar de preço ${PRICE_THRESHOLD}%`);

  const loop = async () => {
    await runCycle(log);
    setTimeout(loop, INTERVAL_SEC * 1000);
  };
  loop();
}
