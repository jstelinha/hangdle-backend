export type ErrosPorCampo = Record<string, string>;

export abstract class ErroAplicacao extends Error {
  abstract readonly status: number;
  readonly campos: ErrosPorCampo;

  constructor(mensagem: string, campos: ErrosPorCampo = {}) {
    super(mensagem);
    this.name = new.target.name;
    this.campos = campos;
  }
}

export class ErroValidacao extends ErroAplicacao {
  readonly status = 400;
}

export class ErroCredenciais extends ErroAplicacao {
  readonly status = 401;
}

export class ErroConflito extends ErroAplicacao {
  readonly status = 409;
}

export class ErroIndisponivel extends ErroAplicacao {
  readonly status = 503;
}
