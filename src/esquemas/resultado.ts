import { z } from "zod";

const dia = z.iso.date({ error: "Envie o dia no formato AAAA-MM-DD." });

export const esquemaResultado = z.object({
  dia,
  letras: z
    .array(z.string().regex(/^[A-Za-z]$/, "Envie uma letra por vez, de A a Z."), { error: "Envie as letras chutadas." })
    .min(1, "Envie as letras chutadas.")
    .max(26, "Envie no máximo 26 letras.")
    .transform((letras) => letras.map((letra) => letra.toUpperCase())),
});

export const esquemaFiltroDia = z.object({
  dia: dia.optional(),
});

export type DadosResultado = z.infer<typeof esquemaResultado>;
