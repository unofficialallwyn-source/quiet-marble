// Apply before paint so a saved dark preference does not flash the light page.
(function () {
  var saved;
  try { saved = localStorage.getItem('qm-theme'); } catch (_) {}
  var dark = saved === 'dark' || (saved !== 'light' && window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches);
  document.documentElement.dataset.theme = dark ? 'dark' : 'light';
  document.documentElement.style.colorScheme = dark ? 'dark' : 'light';
})();
