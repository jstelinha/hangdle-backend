class SorteadorModel {
  constructor() {
    this.mode = 'numbers'; // 'numbers' | 'names'
    this.numberConfig = {
      min: 1,
      max: 100,
      count: 1,
      allowDuplicates: false
    };
    this.nameConfig = {
      rawText: '',
      count: 1
    };
    this.history = [];
  }

  setMode(mode) {
    this.mode = mode;
  }

  setNumberConfig(config) {
    this.numberConfig = { ...this.numberConfig, ...config };
  }

  setNameConfig(config) {
    this.nameConfig = { ...this.nameConfig, ...config };
  }

  getParsedNames() {
    return this.nameConfig.rawText
      .split(/[\n,]+/)
      .map(name => name.trim())
      .filter(name => name.length > 0);
  }

  draw() {
    if (this.mode === 'numbers') {
      return this._drawNumbers();
    } else {
      return this._drawNames();
    }
  }

  _drawNumbers() {
    const { min, max, count, allowDuplicates } = this.numberConfig;
    if (min >= max) throw new Error("O valor mínimo deve ser menor que o máximo!");
    
    const range = max - min + 1;
    if (!allowDuplicates && count > range) {
      throw new Error(`Impossível sortear ${count} números distintos em um intervalo de ${range}!`);
    }

    const results = [];
    if (allowDuplicates) {
      for (let i = 0; i < count; i++) {
        results.push(Math.floor(Math.random() * range) + min);
      }
    } else {
      const pool = Array.from({ length: range }, (_, i) => min + i);
      for (let i = 0; i < count; i++) {
        const idx = Math.floor(Math.random() * pool.length);
        results.push(pool.splice(idx, 1)[0]);
      }
    }

    this._addHistory(`Números (${min} - ${max})`, results);
    return results;
  }

  _drawNames() {
    const names = this.getParsedNames();
    const { count } = this.nameConfig;

    if (names.length === 0) throw new Error("Insira pelo menos um nome na lista!");
    if (count > names.length) {
      throw new Error(`A quantidade solicitada (${count}) é maior do que o total de nomes fornecidos (${names.length})!`);
    }

    const pool = [...names];
    const results = [];
    for (let i = 0; i < count; i++) {
      const idx = Math.floor(Math.random() * pool.length);
      results.push(pool.splice(idx, 1)[0]);
    }

    this._addHistory(`Nomes (${names.length} participantes)`, results);
    return results;
  }

  _addHistory(typeLabel, items) {
    const time = new Date().toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit', second: '2-digit' });
    this.history.unshift({ time, typeLabel, items });
    if (this.history.length > 10) this.history.pop();
  }

  clearHistory() {
    this.history = [];
  }
}