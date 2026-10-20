export interface Notification {
  title: string;
  message: string;
  tags?: string[];
  priority?: 1 | 2 | 3 | 4 | 5;
  click?: string;
}

const NTFY_SERVER = (process.env.NTFY_SERVER ?? "https://ntfy.sh").replace(/\/+$/, "");
const NTFY_TOPIC = process.env.NTFY_TOPIC ?? "";
const NTFY_TOKEN = process.env.NTFY_TOKEN;

export const ntfyEnabled = () => NTFY_TOPIC !== "";

// Publica via JSON no root do servidor — headers HTTP não aceitam emoji/acentos
// de forma confiável, o corpo JSON aceita.
export async function notify(n: Notification): Promise<void> {
  if (!ntfyEnabled()) return;

  const headers: Record<string, string> = { "Content-Type": "application/json" };
  if (NTFY_TOKEN) headers.Authorization = `Bearer ${NTFY_TOKEN}`;

  const res = await fetch(NTFY_SERVER, {
    method: "POST",
    headers,
    body: JSON.stringify({ topic: NTFY_TOPIC, ...n }),
  });

  if (!res.ok) {
    throw new Error(`ntfy HTTP ${res.status}: ${await res.text()}`);
  }
}
