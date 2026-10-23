import { FIIData } from "./types";

// Espelha calcSignal() de public/index.html — manter os dois em sincronia.

const HIST_SHOW = 3;

export const parseBR = (v: string | null | undefined) =>
  parseFloat((v || "0").replace(",", ".")) || 0;

export interface Signal {
  label: string;
  icon: string;
  reasons: string[];
}

export function calcSignal(data: FIIData, hist: Pick<FIIData, "preco_atual">[]): Signal {
  const pvp = parseBR(data.pvp);
  const dy = parseBR(data.dy_12m);
  const preco = parseBR(data.preco_atual);

  let score = 0;
  const reasons: string[] = [];

  // P/VP
  if (pvp > 0) {
    if      (pvp < 0.85)  { score += 3; reasons.push(`P/VP ${data.pvp} — muito abaixo do VPA`); }
    else if (pvp < 0.95)  { score += 2; reasons.push(`P/VP ${data.pvp} — abaixo do VPA`); }
    else if (pvp <= 1.05) { score += 1; reasons.push(`P/VP ${data.pvp} — próximo ao VPA`); }
    else if (pvp >  1.15) { score -= 1; reasons.push(`P/VP ${data.pvp} — acima do VPA`); }
  }

  // DY
  if (dy > 0) {
    if      (dy >= 12) { score += 2; reasons.push(`DY ${data.dy_12m}% — rendimento excelente`); }
    else if (dy >=  9) { score += 1; reasons.push(`DY ${data.dy_12m}% — rendimento bom`); }
    else if (dy <   6) { score -= 1; reasons.push(`DY ${data.dy_12m}% — rendimento abaixo da média`); }
  }

  // Trend dos últimos snapshots
  const prices = hist.slice(0, HIST_SHOW)
    .map((h) => parseBR(h.preco_atual))
    .filter((p) => p > 0);

  if (prices.length >= 2 && preco > 0) {
    const oldest = prices[prices.length - 1];
    const trend = (preco - oldest) / oldest;
    if      (trend < -0.02) { score += 1; reasons.push("Preço em queda recente — possível oportunidade"); }
    else if (trend >  0.03) {             reasons.push("Preço em alta recente"); }
  }

  if (score >= 4) return { label: "Excelente para comprar", icon: "🟢", reasons };
  if (score >= 2) return { label: "Bom para comprar",       icon: "🟡", reasons };
  if (score >= 0) return { label: "Neutro — aguardar",      icon: "⚪", reasons };
  return               { label: "Avaliar com cuidado",      icon: "🔴", reasons };
}
