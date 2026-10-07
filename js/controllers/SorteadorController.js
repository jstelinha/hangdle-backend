class SorteadorController {
  constructor(model, view) {
    this.model = model;
    this.view = view;
  }

  init() {
    this.bindEvents();
    this.syncInputsToModel();
    this.view.renderHistory(this.model.history);
  }

  bindEvents() {
    // Alternância de Abas
    this.view.tabNumbers.addEventListener('click', () => {
      this.model.setMode('numbers');
      this.view.switchTab('numbers');
    });

    this.view.tabNames.addEventListener('click', () => {
      this.model.setMode('names');
      this.view.switchTab('names');
    });

    // Inputs de Números
    const updateNumConfig = () => {
      this.model.setNumberConfig({
        min: parseInt(this.view.inputMin.value) || 0,
        max: parseInt(this.view.inputMax.value) || 0,
        count: parseInt(this.view.inputNumCount.value) || 1,
        allowDuplicates: this.view.checkDuplicates.checked
      });
    };

    this.view.inputMin.addEventListener('input', updateNumConfig);
    this.view.inputMax.addEventListener('input', updateNumConfig);
    this.view.inputNumCount.addEventListener('input', updateNumConfig);
    this.view.checkDuplicates.addEventListener('change', updateNumConfig);

    // Inputs de Nomes
    const updateNameConfig = () => {
      this.model.setNameConfig({
        rawText: this.view.inputNames.value,
        count: parseInt(this.view.inputNameCount.value) || 1
      });
      this.view.updateNameCounter(this.model.getParsedNames().length);
    };

    this.view.inputNames.addEventListener('input', updateNameConfig);
    this.view.inputNameCount.addEventListener('input', updateNameConfig);

    // Ação do Botão Sortear
    this.view.btnSortear.addEventListener('click', () => this.handleDraw());

    // Limpar Histórico
    this.view.btnClearHistory.addEventListener('click', () => {
      this.model.clearHistory();
      this.view.renderHistory(this.model.history);
    });
  }

  syncInputsToModel() {
    this.model.setNumberConfig({
      min: parseInt(this.view.inputMin.value) || 1,
      max: parseInt(this.view.inputMax.value) || 100,
      count: parseInt(this.view.inputNumCount.value) || 1,
      allowDuplicates: this.view.checkDuplicates.checked
    });

    this.model.setNameConfig({
      rawText: this.view.inputNames.value,
      count: parseInt(this.view.inputNameCount.value) || 1
    });

    this.view.updateNameCounter(this.model.getParsedNames().length);
  }

  handleDraw() {
    try {
      if (this.model.mode === 'numbers') {
        const { min, max, count, allowDuplicates } = this.model.numberConfig;
        if (min >= max) throw new Error("O valor mínimo deve ser menor que o máximo!");
        if (!allowDuplicates && count > (max - min + 1)) {
          throw new Error(`Impossível sortear ${count} números sem repetição no intervalo informado.`);
        }
      } else {
        const names = this.model.getParsedNames();
        if (names.length === 0) throw new Error("Por favor, digite ao menos um nome para sortear!");
        if (this.model.nameConfig.count > names.length) {
          throw new Error(`Quantidade solicitada (${this.model.nameConfig.count}) é maior do que o total de nomes (${names.length}).`);
        }
      }

      this.view.playSuspenseAnimation(() => {
        const results = this.model.draw();
        this.view.renderResults(results);
        this.view.renderHistory(this.model.history);
      });
    } catch (err) {
      this.view.showError(err.message);
    }
  }
}