import { normalizarNome } from "./Nome.js";

export const TAMANHO_MINIMO_APELIDO = 2;
export const TAMANHO_MAXIMO_APELIDO = 20;

export type Participante = {
  id: number;
  salaId: number;
  usuarioId: number;
  apelido: string;
  pontos: number;
  dono: boolean;
};

export type NovoParticipante = Pick<Participante, "usuarioId" | "apelido">;
export type EdicaoParticipante = Pick<Participante, "apelido">;

// Quem cria a sala entra nela com o primeiro nome da conta.
export function apelidoDoNome(nome: string): string {
  const completo = normalizarNome(nome);
  const [primeiro = ""] = completo.split(" ");
  const apelido = primeiro.length >= TAMANHO_MINIMO_APELIDO ? primeiro : completo;
  return apelido.slice(0, TAMANHO_MAXIMO_APELIDO).trim();
}
