import type { Pagina, PedidoDePagina } from "../dominio/Pagina.js";
import type { RegistroSala, Sala } from "../dominio/Sala.js";
import type { SenhaDaSala } from "../dominio/SenhaDaSala.js";
import type { RepositorioDeRecursos } from "./RepositorioDeRecursos.js";

// listar(usuarioId) traz as salas em que a pessoa está; listarAbertas, as públicas que ainda não acabaram.
export interface RepositorioSalas extends RepositorioDeRecursos<Sala, RegistroSala> {
  listarAbertas(pedido: PedidoDePagina): Promise<Pagina<Sala>>;
  buscarSenha(id: number): Promise<SenhaDaSala | null>;
}
