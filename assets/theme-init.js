(function () {
  try {
    var saved = localStorage.getItem('laohou-theme');
    var systemDark = window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches;
    document.documentElement.dataset.theme = saved === 'light' || saved === 'dark'
      ? saved
      : (systemDark ? 'dark' : 'light');
  } catch (_) {
    document.documentElement.dataset.theme = 'light';
  }
})();
