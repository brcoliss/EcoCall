/* Seleção de dia no mini-calendário da página de agendamentos. */
document.addEventListener('DOMContentLoaded', function () {
  document.querySelectorAll('.cal-day:not(.empty)').forEach(function (day) {
    day.addEventListener('click', function () {
      document.querySelectorAll('.cal-day.selected').forEach(function (x) {
        x.classList.remove('selected');
      });
      day.classList.add('selected');
      window.toast('Dia ' + day.textContent + ' selecionado.');
    });
  });
});
