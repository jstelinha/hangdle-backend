import { z } from "zod";
import { identificador } from "./comuns.js";

export const esquemaIdListaPronta = z.object({
  id: identificador("Lista pronta inválida."),
});
