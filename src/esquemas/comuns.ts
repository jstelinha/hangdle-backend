import { z } from "zod";

export function texto(obrigatorio: string) {
  return z.string({
    error: (problema) => (problema.input === undefined || problema.input === null ? obrigatorio : "Envie este campo como texto."),
  });
}

export function identificador(mensagem: string) {
  return z.coerce.number({ error: mensagem }).int(mensagem).positive(mensagem);
}
