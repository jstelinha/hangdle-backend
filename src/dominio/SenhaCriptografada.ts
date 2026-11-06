import bcrypt from "bcryptjs";

export const LIMITE_BYTES_BCRYPT = 72;

// Rubrica de Tech Forge - Modelagem do Domínio e Pilares da POO - Herança com reuso: a senha da conta e a da sala guardam e conferem o hash do mesmo jeito
export abstract class SenhaCriptografada {
  readonly #hash: string;

  protected constructor(hash: string) {
    this.#hash = hash;
  }

  protected static gerarHash(textoPuro: string, custo: number): Promise<string> {
    return bcrypt.hash(textoPuro, custo);
  }

  confere(textoPuro: string): Promise<boolean> {
    return bcrypt.compare(textoPuro, this.#hash);
  }

  get hash(): string {
    return this.#hash;
  }
}
