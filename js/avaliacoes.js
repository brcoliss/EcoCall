/* Filtro de avaliações por nota (chamado via onclick nas chips). */
function filterReviews(filter) {
  document.querySelectorAll('.review-item').forEach(function (item) {
    var rating = parseInt(item.dataset.rating, 10);
    var show = true;
    if (filter === 'all') show = true;
    else if (filter === 'low') show = rating <= 2;
    else show = rating === parseInt(filter, 10);
    item.style.display = show ? '' : 'none';
  });
}
window.filterReviews = filterReviews;
