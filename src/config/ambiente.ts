import { z } from "zod";

const esquemaAmbiente = z.object({
  PORT: z.coerce.number().int().positive().default(3000),
  DB_HOST: z.string().min(1),
  DB_PORT: z.coerce.number().int().positive().default(3306),
  DB_USER: z.string().min(1),
  DB_PASSWORD: z.string().min(1),
  DB_NAME: z.string().min(1),
  JWT_SEGREDO: z.string().min(32, "JWT_SEGREDO precisa ter pelo menos 32 caracteres."),
  JWT_EXPIRACAO_SEGUNDOS: z.coerce.number().int().positive().default(7200),
  CORS_ORIGENS: z
    .string()
    .default("http://localhost,http://localhost:5173")
    .transform((lista) => lista.split(",").map((origem) => origem.trim()).filter(Boolean)),
  TENTATIVAS_POR_JANELA: z.coerce.number().int().positive().default(20),
});

export type Ambiente = z.infer<typeof esquemaAmbiente>;

export function lerAmbiente(variaveis: NodeJS.ProcessEnv = process.env): Ambiente {
  const resultado = esquemaAmbiente.safeParse(variaveis);
  if (!resultado.success) {
    const problemas = resultado.error.issues.map((problema) => `- ${problema.path.join(".")}: ${problema.message}`);
    throw new Error(`Variáveis de ambiente inválidas (confira o .env):\n${problemas.join("\n")}`);
  }
  return resultado.data;
}
