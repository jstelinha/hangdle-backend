// Inicialização da Aplicação MVC
document.addEventListener('DOMContentLoaded', () => {
  const model = new SorteadorModel();
  const view = new SorteadorView();
  const controller = new SorteadorController(model, view);

  controller.init();
});