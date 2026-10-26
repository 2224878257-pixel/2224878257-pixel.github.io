(function () {
  const cfg = window.LAOHOU_CONFIG || {};
  const isEnglish = document.documentElement.lang === 'en';
  const esc = value => String(value ?? '').replace(/[&<>"']/g, char => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[char]));
  document.querySelectorAll('[data-config-link]').forEach(el => { const key = el.dataset.configLink; const value = cfg[key]; if (value) el.href = key === 'email' ? `mailto:${value}` : value; });
  document.querySelectorAll('[data-config-text]').forEach(el => { const value = cfg[el.dataset.configText]; if (value) el.textContent = value; });
  document.querySelectorAll('.nav a').forEach(link => { if (!isEnglish && link.textContent.trim() === '关于二两神仙') link.textContent = '关于我'; });

  const theme = document.querySelector('.theme-toggle');
  if (theme) {
    const updateThemeLabel = () => { const dark = document.documentElement.dataset.theme === 'dark'; theme.setAttribute('aria-label', isEnglish ? (dark ? 'Toggle light mode' : 'Toggle dark mode') : (dark ? '切换浅色模式' : '切换深色模式')); theme.title = theme.getAttribute('aria-label'); };
    theme.addEventListener('click', () => { const next = document.documentElement.dataset.theme === 'dark' ? 'light' : 'dark'; document.documentElement.dataset.theme = next; try { localStorage.setItem('laohou-theme', next); } catch (_) {} updateThemeLabel(); });
    updateThemeLabel();
  }

  const wechatDialog = document.querySelector('[data-wechat-dialog]');
  const wechatOpen = [...document.querySelectorAll('[data-wechat-open]')];
  const wechatClose = document.querySelector('[data-wechat-close]');
  if (wechatDialog && wechatOpen.length) {
    wechatOpen.forEach(trigger => trigger.addEventListener('click', () => { if (!wechatDialog.open) wechatDialog.showModal(); }));
    wechatClose?.addEventListener('click', () => wechatDialog.close());
    wechatDialog.addEventListener('click', event => { if (event.target === wechatDialog) wechatDialog.close(); });
  }

  const emailDialog = document.querySelector('[data-email-dialog]');
  const emailOpen = [...document.querySelectorAll('[data-email-open]')];
  const emailClose = document.querySelector('[data-email-close]');
  const emailCopy = document.querySelector('[data-email-copy]');
  const emailFeedback = document.querySelector('[data-email-feedback]');
  if (emailDialog && emailOpen.length) {
    emailOpen.forEach(trigger => trigger.addEventListener('click', () => { if (!emailDialog.open) emailDialog.showModal(); }));
    emailClose?.addEventListener('click', () => emailDialog.close());
    emailDialog.addEventListener('click', event => { if (event.target === emailDialog) emailDialog.close(); });
  }
  if (emailCopy) {
    emailCopy.addEventListener('click', async () => {
      const address = cfg.email || '2224878257@qq.com';
      let copied = false;
      try { await navigator.clipboard.writeText(address); copied = true; } catch (_) {
        const input = document.createElement('textarea'); input.value = address; input.setAttribute('readonly', ''); input.style.position = 'fixed'; input.style.opacity = '0'; document.body.append(input); input.select(); copied = document.execCommand('copy'); input.remove();
      }
      emailCopy.textContent = copied ? (isEnglish ? 'Copied' : '已复制') : (isEnglish ? 'Copy failed' : '复制失败');
      if (emailFeedback) emailFeedback.textContent = copied ? (isEnglish ? 'Email address copied to clipboard.' : '邮箱地址已复制到剪贴板。') : (isEnglish ? 'Please select and copy the address manually.' : '请手动选择上方邮箱地址复制。');
      setTimeout(() => { emailCopy.textContent = isEnglish ? 'Copy email address' : '一键复制邮箱'; }, 1800);
    });
  }

  const card = article => `<a class="article-card" href="${esc(article.url)}" data-search="${esc([article.title, article.excerpt, article.category, ...(article.tags || [])].join(' '))}" data-category="${esc(article.category)}"><img class="article-cover" src="${esc(article.cover)}" alt="${esc(article.title)}封面" loading="lazy"><div class="article-card-body"><div class="article-card-category">${esc(article.category)}</div><h2>${esc(article.title)}</h2><p>${esc(article.excerpt)}</p><div class="article-card-footer"><time datetime="${esc(article.date)}">${esc(article.date)}</time><span>${esc(article.author)}</span></div></div></a>`;
  const latestEditorial = articles => {
    const [featured, ...rest] = articles;
    if (!featured) return '';
    const arrow = '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M5 12h13M13 7l5 5-5 5"/></svg>';
    const lead = `<a class="latest-feature" href="${esc(featured.url)}"><span class="latest-feature-media"><img src="${esc(featured.cover)}" alt="${esc(featured.title)}封面" loading="lazy"></span><span class="latest-feature-copy"><span class="latest-meta"><b>${esc(featured.category)}</b><time datetime="${esc(featured.date)}">${esc(featured.date)}</time></span><strong>${esc(featured.title)}</strong><span class="latest-excerpt">${esc(featured.excerpt)}</span><span class="latest-read">阅读文章${arrow}</span></span></a>`;
    const list = rest.map((article, index) => `<a class="latest-row" href="${esc(article.url)}"><span class="latest-row-number">0${index + 2}</span><span class="latest-row-copy"><span class="latest-meta"><b>${esc(article.category)}</b><time datetime="${esc(article.date)}">${esc(article.date)}</time></span><strong>${esc(article.title)}</strong><span class="latest-row-excerpt">${esc(article.excerpt)}</span></span><span class="latest-row-arrow">${arrow}</span></a>`).join('');
    return `${lead}<div class="latest-list">${list}</div>`;
  };
  const gardenWriting = articles => articles.map(article => `<a class="garden-writing-item" href="${esc(article.url)}"><span class="garden-writing-copy"><b>${esc(article.title)}</b><small>${esc(article.excerpt)}</small></span><span class="garden-writing-meta"><b>${esc(article.category)}</b><time datetime="${esc(article.date)}">${esc(article.date)}</time></span></a>`).join('');
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
      const latest = document.querySelector('[data-latest-articles]'); if (latest) latest.innerHTML = latest.classList.contains('garden-writing-list') ? gardenWriting(published.slice(0, 3)) : latest.classList.contains('latest-editorial-layout') ? latestEditorial(published.slice(0, 4)) : published.slice(0, 3).map(card).join('');
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

  const interactiveAvatar = document.querySelector('[data-avatar-smile]');
  if (interactiveAvatar) {
    const sticker = interactiveAvatar.querySelector('.creator-sticker');
    const originalSticker = sticker?.textContent || '';
    const reduceMotion = matchMedia('(prefers-reduced-motion: reduce)').matches;
    let smileTimer;
    const resetTilt = () => {
      interactiveAvatar.style.setProperty('--tilt-x', '0deg');
      interactiveAvatar.style.setProperty('--tilt-y', '0deg');
    };
    if (!reduceMotion) {
      interactiveAvatar.addEventListener('pointermove', event => {
        if (event.pointerType && event.pointerType !== 'mouse') return;
        const rect = interactiveAvatar.getBoundingClientRect();
        const x = (event.clientX - rect.left) / rect.width - .5;
        const y = (event.clientY - rect.top) / rect.height - .5;
        interactiveAvatar.style.setProperty('--tilt-x', `${(-y * 8).toFixed(2)}deg`);
        interactiveAvatar.style.setProperty('--tilt-y', `${(x * 10).toFixed(2)}deg`);
      });
      interactiveAvatar.addEventListener('pointerleave', resetTilt);
    }
    interactiveAvatar.addEventListener('click', () => {
      clearTimeout(smileTimer);
      interactiveAvatar.classList.remove('is-smiling');
      void interactiveAvatar.offsetWidth;
      interactiveAvatar.classList.add('is-smiling');
      interactiveAvatar.setAttribute('aria-pressed', 'true');
      if (sticker) sticker.textContent = isEnglish ? 'NICE TO SEE YOU' : '见到你真好';
      smileTimer = setTimeout(() => {
        interactiveAvatar.classList.remove('is-smiling');
        interactiveAvatar.setAttribute('aria-pressed', 'false');
        if (sticker) sticker.textContent = originalSticker;
      }, 1800);
    });
  }
  const top = document.createElement('button'); top.className = 'backtop'; top.setAttribute('aria-label', isEnglish ? 'Back to top' : '返回顶部'); top.textContent = '↑'; document.body.append(top); top.addEventListener('click', () => scrollTo({top:0,behavior:'smooth'})); addEventListener('scroll', () => top.classList.toggle('show', scrollY > 500));
})();
