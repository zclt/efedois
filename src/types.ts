export interface FIIData {
  ticker: string;
  nome: string;
  preco_atual: string | null;
  variacao_dia: string | null;
  dy_12m: string | null;
  pvp: string | null;
  segmento: string | null;
  gestora: string | null;
  fonte: string;
  consultado_em: string;
  dados_adicionais: Record<string, string>;
}

export interface FIIResult {
  sucesso: boolean;
  dados: FIIData | null;
  erro?: string;
}
