// Uma lista pronta é um modelo: todo mundo vê as mesmas, e ninguém edita. Quem quer usar faz uma cópia, que vira uma
// Lista comum da pessoa (ServicoListasProntas.copiar).
export type ListaPronta = {
  id: number;
  nome: string;
  totalDePalavras: number;
};

export type PalavraPronta = {
  palavra: string;
  dica: string | null;
};

export type ListaProntaComPalavras = ListaPronta & {
  palavras: PalavraPronta[];
};
