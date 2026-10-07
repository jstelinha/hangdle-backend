class SorteadorView {
  constructor() {
    // Abas
    this.tabNumbers = document.getElementById('tabNumbers');
    this.tabNames = document.getElementById('tabNames');
    this.sectionNumbers = document.getElementById('sectionNumbers');
    this.sectionNames = document.getElementById('sectionNames');

    // Inputs Números
    this.inputMin = document.getElementById('inputMin');
    this.inputMax = document.getElementById('inputMax');
    this.inputNumCount = document.getElementById('inputNumCount');
    this.checkDuplicates = document.getElementById('checkDuplicates');

    // Inputs Nomes
    this.inputNames = document.getElementById('inputNames');
    this.inputNameCount = document.getElementById('inputNameCount');
    this.nameCounter = document.getElementById('nameCounter');

    // Botões e Display
    this.btnSortear = document.getElementById('btnSortear');
    this.resultPlaceholder = document.getElementById('resultPlaceholder');
    this.resultDisplay = document.getElementById('resultDisplay');
    this.historyList = document.getElementById('historyList');
    this.btnClearHistory = document.getElementById('btnClearHistory');

    this._audioCtx = null;
    this.initLucideIcons();
  }

  initLucideIcons() {
    if (window.lucide) {
      window.lucide.createIcons();
    }
  }

  switchTab(mode) {
    if (mode === 'numbers') {
      this.tabNumbers.className = "py-2.5 rounded-lg text-sm font-semibold transition-all duration-200 bg-indigo-600 text-white shadow-md";
      this.tabNames.className = "py-2.5 rounded-lg text-sm font-semibold transition-all duration-200 text-slate-400 hover:text-white";
      this.sectionNumbers.classList.remove('hidden');
      this.sectionNames.classList.add('hidden');
    } else {
      this.tabNames.className = "py-2.5 rounded-lg text-sm font-semibold transition-all duration-200 bg-indigo-600 text-white shadow-md";
      this.tabNumbers.className = "py-2.5 rounded-lg text-sm font-semibold transition-all duration-200 text-slate-400 hover:text-white";
      this.sectionNames.classList.remove('hidden');
      this.sectionNumbers.classList.add('hidden');
    }
  }

  updateNameCounter(count) {
    this.nameCounter.textContent = `${count} ${count === 1 ? 'nome identificado' : 'nomes identificados'}`;
  }

  renderResults(results) {
    this.resultPlaceholder.classList.add('hidden');
    this.resultDisplay.classList.remove('hidden');
  
  // Limpa os resultados anteriores com segurança
    this.resultDisplay.textContent = ''; 

  // Cria cada elemento de forma segura
    results.forEach(res => {
      const div = document.createElement('div');
      div.className = 'px-4 py-2.5 bg-gradient-to-tr from-indigo-600 to-purple-600 text-white font-extrabold text-xl md:text-2xl rounded-xl shadow-lg border border-indigo-400/30 transform hover:scale-105 transition';
    
    // O textContent garante que o valor inserido seja tratado estritamente como TEXTO
      div.textContent = res; 
    
      this.resultDisplay.appendChild(div);
    });
  }

  renderHistory(history) {
    if (history.length === 0) {
      this.historyList.innerHTML = `<li class="text-slate-600 italic text-xs">Nenhum sorteio realizado nesta sessão.</li>`;
      this.btnClearHistory.classList.add('hidden');
      return;
   }

    this.btnClearHistory.classList.remove('hidden');
    this.historyList.textContent = ''; // Limpa a lista com segurança

    history.forEach(item => {
      const li = document.createElement('li');
      li.className = 'flex justify-between items-center bg-slate-950/60 border border-slate-800/80 px-3 py-1.5 rounded-lg';

    // Cria o span com o horário e o rótulo
      const spanInfo = document.createElement('span');
      spanInfo.className = 'text-xs text-slate-400 font-mono';
    
      const strongLabel = document.createElement('strong');
      strongLabel.className = 'text-slate-200';
      strongLabel.textContent = `${item.typeLabel}:`; // Seguro

      spanInfo.appendChild(document.createTextNode(`[${item.time}] `)); // Seguro
      spanInfo.appendChild(strongLabel);

    // Cria o span com a lista de itens sorteados
      const spanItems = document.createElement('span');
      spanItems.className = 'font-bold text-indigo-400 text-sm truncate max-w-[180px]';
      spanItems.textContent = item.items.join(', '); // Seguro: O textContent não executa HTML

    // Junta as peças
      li.appendChild(spanInfo);
      li.appendChild(spanItems);

      this.historyList.appendChild(li);
    });
  }

  playSuspenseAnimation(finalCallback) {
    this.btnSortear.disabled = true;
    this.btnSortear.classList.add('opacity-50', 'cursor-not-allowed');
    this.resultPlaceholder.classList.remove('hidden');
    this.resultDisplay.classList.add('hidden');
    
    let counter = 0;
    const interval = setInterval(() => {
      this.resultPlaceholder.textContent = `Sorteando... ${Math.floor(Math.random() * 99) + 1}`;
      this.resultPlaceholder.className = "text-indigo-400 font-bold text-lg anim-pulse";
      this.playSound(440, 0.05);
      counter++;

      if (counter >= 15) {
        clearInterval(interval);
        this.resultPlaceholder.className = "text-slate-500 text-sm";
        this.btnSortear.disabled = false;
        this.btnSortear.classList.remove('opacity-50', 'cursor-not-allowed');
        this.playSound(880, 0.2);
        this.triggerConfetti();
        finalCallback();
      }
    }, 80);
  }

  playSound(freq, duration) {
    try {
      if (!this._audioCtx) {
        this._audioCtx = new (window.AudioContext || window.webkitAudioContext)();
      }
      if (this._audioCtx.state === 'suspended') {
        this._audioCtx.resume();
      }
      const osc = this._audioCtx.createOscillator();
      const gain = this._audioCtx.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(freq, this._audioCtx.currentTime);
      gain.gain.setValueAtTime(0.05, this._audioCtx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, this._audioCtx.currentTime + duration);
      osc.connect(gain);
      gain.connect(this._audioCtx.destination);
      osc.start();
      osc.stop(this._audioCtx.currentTime + duration);
    } catch (e) {
      // Audio fallback silencioso
    }
  }

  triggerConfetti() {
    if (window.confetti) {
      window.confetti({
        particleCount: 80,
        spread: 70,
        origin: { y: 0.6 }
      });
    }
  }

  showError(message) {
    alert(message);
  }
}