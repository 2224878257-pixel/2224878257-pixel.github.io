(function () {
  const cfg = window.LAOHOU_CONFIG || {};
  const isEnglish = document.documentElement.lang === 'en';
  const esc = value => String(value ?? '').replace(/[&<>"']/g, char => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[char]));
  document.querySelectorAll('[data-config-link]').forEach(el => { const key = el.dataset.configLink; const value = cfg[key]; if (value) el.href = key === 'email' ? `mailto:${value}` : value; });
  document.querySelectorAll('[data-config-text]').forEach(el => { const value = cfg[el.dataset.configText]; if (value) el.textContent = value; });
  document.querySelectorAll('.nav a').forEach(link => { if (!isEnglish && link.textContent.trim() === '关于老侯') link.textContent = '关于我'; });

  const localizedPath = () => {
    const path = location.pathname;
    if (isEnglish) return path.replace(/^\/en(?=\/|$)/, '') || '/';
    const map = {'/':'/en/','/about/':'/en/about/','/articles/':'/en/articles/','/cases/':'/en/cases/','/tools/':'/en/tools/','/services/':'/en/services/','/contact/':'/en/contact/'};
    if (map[path]) return map[path];
    if (path.startsWith('/tools/') || path.startsWith('/resources/')) return '/en/tools/';
    if (path.startsWith('/cases/')) return '/en/cases/';
    return '/en/articles/';
  };
  const actions = document.querySelector('.head-actions');
  if (actions) {
    const language = document.createElement('a');
    language.className = 'header-icon language-switch'; language.href = localizedPath(); language.textContent = '中 / EN';
    language.setAttribute('aria-label', isEnglish ? '切换到中文' : 'Switch to English');
    const theme = document.createElement('button');
    theme.className = 'header-icon theme-toggle'; theme.type = 'button';
    theme.innerHTML = '<svg class="sun-icon" viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="12" r="4"/><path d="M12 2v2M12 20v2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M2 12h2M20 12h2M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4"/></svg><svg class="moon-icon" viewBox="0 0 24 24" aria-hidden="true"><path d="M20 15.2A8.5 8.5 0 0 1 8.8 4 8.5 8.5 0 1 0 20 15.2Z"/></svg>';
    const updateThemeLabel = () => { const dark = document.documentElement.dataset.theme === 'dark'; theme.setAttribute('aria-label', isEnglish ? (dark ? 'Toggle light mode' : 'Toggle dark mode') : (dark ? '切换浅色模式' : '切换深色模式')); theme.title = theme.getAttribute('aria-label'); };
    theme.addEventListener('click', () => { const next = document.documentElement.dataset.theme === 'dark' ? 'light' : 'dark'; document.documentElement.dataset.theme = next; try { localStorage.setItem('laohou-theme', next); } catch (_) {} updateThemeLabel(); });
    updateThemeLabel(); actions.prepend(language, theme);
  }

  const card = article => `<a class="article-card" href="${esc(article.url)}" data-search="${esc([article.title, article.excerpt, article.category, ...(article.tags || [])].join(' '))}" data-category="${esc(article.category)}"><img class="article-cover" src="${esc(article.cover)}" alt="${esc(article.title)}封面" loading="lazy"><div class="article-card-body"><div class="article-card-meta"><span>${esc(article.category)}</span><time datetime="${esc(article.date)}">${esc(article.date)}</time></div><h2>${esc(article.title)}</h2><p>${esc(article.excerpt)}</p><div class="article-card-author">${isEnglish ? 'By ' : '作者：'}${esc(article.author)}</div></div></a>`;
  function bindFilters(scope) {
    const q = document.querySelector('#search'); const filters = [...document.querySelectorAll('[data-filter]')]; const selected = {category:'all',industry:'all',platform:'all'};
    const run = () => { const term = (q?.value || '').trim().toLowerCase(); let visible = 0; [...scope.querySelectorAll('[data-search]')].forEach(el => { const cats = (el.dataset.category || '').split(','); const ok = (!term || (el.dataset.search || '').toLowerCase().includes(term)) && (selected.category === 'all' || cats.includes(selected.category)) && (selected.industry === 'all' || el.dataset.industry === selected.industry) && (selected.platform === 'all' || el.dataset.platform === selected.platform); el.hidden = !ok; if (ok) visible++; }); const empty = document.querySelector('[data-article-empty]'); if (empty) empty.hidden = visible !== 0; };
    q?.addEventListener('input', run);
    filters.forEach(button => button.addEventListener('click', () => { const group = button.dataset.group || 'category'; filters.filter(item => (item.dataset.group || 'category') === group).forEach(item => item.classList.remove('active')); button.classList.add('active'); selected[group] = button.dataset.filter; run(); }));
    run();
  }
  function relatedArticles(current, articles) {
    return articles.filter(item => item.slug !== current.slug).map(item => { const overlap = (item.tags || []).filter(tag => (current.tags || []).includes(tag)).length; const score = (item.category === current.category ? 100 : 0) + overlap * 10 + (item.industry && item.industry === current.industry ? 5 : 0) + (item.platform && item.platform === current.platform ? 3 : 0); return {item, score}; }).sort((a, b) => b.score - a.score || b.item.date.localeCompare(a.item.date)).slice(0, 3).map(entry => entry.item);
  }
  async function loadArticles() {
    if (!document.querySelector('[data-article-list], [data-latest-articles], [data-article-slug]')) return;
    try {
      const response = await fetch('/assets/articles.json', {cache:'no-cache'}); if (!response.ok) throw new Error(`HTTP ${response.status}`);
      const all = await response.json(); const published = all.filter(item => item.status === 'published' && item.lang === (isEnglish ? 'en' : 'zh')).sort((a, b) => b.date.localeCompare(a.date));
      const list = document.querySelector('[data-article-list]'); if (list) { list.innerHTML = published.map(card).join(''); bindFilters(list); }
      const latest = document.querySelector('[data-latest-articles]'); if (latest) latest.innerHTML = published.slice(0, 3).map(card).join('');
      const detail = document.querySelector('[data-article-slug]');
      if (detail) {
        const current = published.find(item => item.slug === detail.dataset.articleSlug); if (!current) return;
        const meta = detail.querySelector('[data-article-meta]'); if (meta) meta.textContent = `${current.category} · ${current.date} · ${isEnglish ? `${current.readingTime} min read` : `预计阅读 ${current.readingTime} 分钟`}`;
        const cover = detail.querySelector('[data-article-cover]'); if (cover) { cover.src = current.cover; cover.alt = `${current.title}封面`; }
        const source = detail.querySelector('[data-wechat-source]'); if (source && current.wechatUrl) { source.hidden = false; source.querySelector('a').href = current.wechatUrl; }
        const index = published.findIndex(item => item.slug === current.slug); const nav = detail.querySelector('[data-article-nav]');
        if (nav) { const previous = published[index - 1]; const next = published[index + 1]; nav.innerHTML = `${previous ? `<a href="${esc(previous.url)}"><span>上一篇</span><b>${esc(previous.title)}</b></a>` : '<span></span>'}${next ? `<a href="${esc(next.url)}"><span>下一篇</span><b>${esc(next.title)}</b></a>` : ''}`; }
        const related = detail.querySelector('[data-related-articles]'); if (related) related.innerHTML = relatedArticles(current, published).map(item => `<a href="${esc(item.url)}">${esc(item.title)}</a>`).join('');
      }
    } catch (error) { console.error('文章数据加载失败：', error); document.querySelectorAll('[data-article-loading]').forEach(el => { el.textContent = isEnglish ? 'Articles could not be loaded.' : '文章暂时无法加载，请稍后重试。'; }); }
  }
  loadArticles();
  const top = document.createElement('button'); top.className = 'backtop'; top.setAttribute('aria-label', isEnglish ? 'Back to top' : '返回顶部'); top.textContent = '↑'; document.body.append(top); top.addEventListener('click', () => scrollTo({top:0,behavior:'smooth'})); addEventListener('scroll', () => top.classList.toggle('show', scrollY > 500));
})();
