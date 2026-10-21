#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import {fileURLToPath} from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const dataFile = path.join(root, 'assets', 'articles.json');
const allowedCategories = ['获客实战', '广告投放', '增长方法', '行业观察', 'AI提效'];
const categoryRules = {
  '获客实战': ['线索','获客','到店','成交','客户开发','表单','咨询','销售承接','本地获客','线索转化'],
  '广告投放': ['腾讯广告','巨量引擎','快手','百度','小红书聚光','账户','计划','素材','成本','投放优化','投放排查','冷启动','放量'],
  '增长方法': ['增长模型','业务增长','复盘','策略','商业模式','转化漏斗','团队协作'],
  '行业观察': ['行业趋势','平台政策','规则变化','市场变化','行业现状'],
  'AI提效': ['AI','ChatGPT','Codex','自动化','工作流','Skill','智能体','知识库','Notion']
};
const tagRules = {
  '教育':['教育'],'家装':['家装','装修'],'医美口腔':['医美','口腔'],'B2B':['B2B'],'本地生活':['本地生活','本地获客'],'招商加盟':['招商','加盟'],'图书出版':['出版','图书'],
  '腾讯广告':['腾讯广告'],'巨量引擎':['巨量引擎'],'快手':['快手'],'百度':['百度'],'小红书聚光':['小红书聚光'],'视频号':['视频号'],
  '获客':['获客','客户开发'],'线索质量':['线索质量','有效线索'],'线索转化':['线索','转化'],'销售承接':['销售承接','邀约','跟进'],'到店转化':['到店'],'成交':['成交'],'素材':['素材'],'表单':['表单'],'账户优化':['账户','计划'],'投放排查':['排查','不消耗','异常'],'ROI':['ROI','ROAS'],'冷启动':['冷启动'],'内容获客':['内容获客'],'AI工作流':['AI工作流','内容工作流','自动化'],'知识库':['知识库'],'ChatGPT':['ChatGPT'],'Notion':['Notion'],'Codex':['Codex']
};
const contentTypeRules = {
  case: ['真实项目','客户问题','诊断过程','执行策略','验证结果','案例复盘'],
  tool: ['计算器','模板','清单','工具'],
  resource: ['下载资源','资料包'],
  service: ['付费服务','咨询服务','代运营','顾问服务']
};

const stripMarkdown = text => text.replace(/!\[[^\]]*\]\([^)]*\)/g,'').replace(/\[([^\]]+)\]\([^)]*\)/g,'$1').replace(/[*_`>#-]/g,' ').replace(/\s+/g,' ').trim();
const scoreRules = (text, rules) => Object.entries(rules).map(([name, words]) => ({name, score: words.reduce((sum, word) => sum + (text.toLowerCase().includes(word.toLowerCase()) ? 1 : 0), 0)})).sort((a,b) => b.score - a.score);
export function classify(input) {
  const text = `${input.title || ''}\n${input.excerpt || ''}\n${input.body || ''}`;
  const ranked = scoreRules(text, categoryRules);
  return {category: ranked[0].score ? ranked[0].name : '增长方法', uncertain: ranked[0].score === 0 || ranked[0].score === ranked[1].score};
}
export function generateTags(input) {
  const text = `${input.title || ''}\n${input.excerpt || ''}\n${input.body || ''}`;
  return Object.entries(tagRules).filter(([, words]) => words.some(word => text.toLowerCase().includes(word.toLowerCase()))).map(([tag]) => tag).slice(0, 6);
}
export function detectContentType(input) {
  const text = `${input.title || ''}\n${input.excerpt || ''}\n${input.body || ''}`;
  const ranked = scoreRules(text, contentTypeRules);
  return ranked[0].score ? {contentType: ranked[0].name, uncertain:false} : {contentType:'article', uncertain:true};
}
function excerptFrom(body) {
  const clean = stripMarkdown(body).replace(/^本文主要(介绍|讲述|讨论)/, '');
  const target = clean.slice(0, 96);
  return target.length < clean.length ? `${target.replace(/[，。；：、]$/,'')}。` : target;
}
function readingTime(body) { return Math.max(1, Math.ceil(stripMarkdown(body).replace(/\s/g,'').length / 350)); }
function makeSlug(title, date) {
  const latin = title.toLowerCase().replace(/[^a-z0-9]+/g,'-').replace(/^-|-$/g,'');
  if (latin) return latin;
  return `article-${date.replaceAll('-','')}-${crypto.createHash('sha1').update(title).digest('hex').slice(0,6)}`;
}
function parseInput(file) {
  const raw = fs.readFileSync(file, 'utf8');
  if (path.extname(file).toLowerCase() === '.json') return JSON.parse(raw);
  const match = raw.match(/^---\r?\n([\s\S]*?)\r?\n---\r?\n([\s\S]*)$/);
  if (!match) return {title:path.basename(file,path.extname(file)),body:raw};
  const meta = {};
  match[1].split(/\r?\n/).forEach(line => { const index=line.indexOf(':'); if(index<0)return; const key=line.slice(0,index).trim(); let value=line.slice(index+1).trim().replace(/^['"]|['"]$/g,''); if(value==='true'||value==='false') value=value==='true'; meta[key]=value; });
  return {...meta, body:match[2]};
}
function inlineMarkdown(text) {
  return text.replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/\*\*([^*]+)\*\*/g,'<strong>$1</strong>').replace(/\[([^\]]+)\]\((https?:\/\/[^)]+)\)/g,'<a href="$2" target="_blank" rel="noopener">$1</a>');
}
function markdownToHtml(markdown) {
  const lines = markdown.replace(/\r/g,'').split('\n'); const out=[]; let list=false;
  const closeList=()=>{if(list){out.push('</ul>');list=false;}};
  for(const line of lines){
    if(/^###\s+/.test(line)){closeList();out.push(`<h3>${inlineMarkdown(line.replace(/^###\s+/,''))}</h3>`);}
    else if(/^##\s+/.test(line)){closeList();out.push(`<h2>${inlineMarkdown(line.replace(/^##\s+/,''))}</h2>`);}
    else if(/^>\s?/.test(line)){closeList();out.push(`<blockquote>${inlineMarkdown(line.replace(/^>\s?/,''))}</blockquote>`);}
    else if(/^[-*]\s+/.test(line)){if(!list){out.push('<ul>');list=true;}out.push(`<li>${inlineMarkdown(line.replace(/^[-*]\s+/,''))}</li>`);}
    else if(/^!\[([^\]]*)\]\(([^)]+)\)/.test(line)){closeList();const m=line.match(/^!\[([^\]]*)\]\(([^)]+)\)/);out.push(`<img src="${m[2]}" alt="${m[1]}" loading="lazy">`);}
    else if(line.trim()){closeList();out.push(`<p>${inlineMarkdown(line.trim())}</p>`);} else closeList();
  }
  closeList(); return out.join('\n');
}
function articleHtml(article, bodyHtml) {
  const description = article.excerpt.replace(/"/g,'&quot;');
  return `<!doctype html><html lang="zh-CN"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>${article.title}｜老侯聊获客</title><meta name="description" content="${description}"><link rel="canonical" href="https://2224878257-pixel.github.io${article.url}"><meta property="og:title" content="${article.title}｜老侯聊获客"><meta property="og:description" content="${description}"><meta property="og:type" content="article"><meta property="og:url" content="https://2224878257-pixel.github.io${article.url}"><meta property="og:image" content="https://2224878257-pixel.github.io${article.cover}"><meta name="twitter:card" content="summary_large_image"><script src="/assets/theme-init.js"></script><link rel="stylesheet" href="/assets/style.css"></head><body><header class="site-header"><div class="wrap header-inner"><a class="logo" href="/">老侯聊获客</a><nav class="nav"><a href="/">首页</a><a href="/about/">关于我</a><a href="/cases/">实战案例</a><a class="active" href="/articles/">文章</a><a href="/tools/">工具</a><a href="/services/">专业服务</a></nav><div class="head-actions"><a class="contact-link" href="/contact/">联系我</a><a href="/about/"><img class="avatar" src="https://avatars.githubusercontent.com/u/267829894?v=4" alt="老侯头像"></a></div></div></header><main><div class="wrap"><article class="article" data-article-slug="${article.slug}"><div class="meta" data-article-meta>${article.category} · ${article.date} · 预计阅读 ${article.readingTime} 分钟</div><h1>${article.title}</h1><img class="article-hero-cover" data-article-cover src="${article.cover}" alt="${article.title}封面"><p class="lead">${article.excerpt}</p>${bodyHtml}<div class="article-footer"><nav class="article-nav" aria-label="文章前后篇" data-article-nav></nav><h2 class="related-title">相关阅读</h2><div class="related-grid" data-related-articles></div><div class="wechat-source" data-wechat-source hidden>本文首发于微信公众号「老侯聊增长」 · <a target="_blank" rel="noopener">公众号阅读原文 →</a></div><a class="back" href="/articles/">← 返回文章</a></div></article></div></main><footer class="footer"><div class="wrap footer-inner"><div>© 2026 老侯聊获客</div><div>聊获客、聊投放、聊增长。</div></div></footer><script src="/assets/config.js"></script><script src="/assets/site.js"></script></body></html>`;
}
function updateSitemap(articles) {
  const file = path.join(root,'sitemap.xml'); let xml=fs.readFileSync(file,'utf8');
  const published = articles.filter(item => item.status==='published').map(item => `https://2224878257-pixel.github.io${item.url}`);
  for(const url of published) if(!xml.includes(`<loc>${url}</loc>`)) xml=xml.replace('</urlset>',`<url><loc>${url}</loc></url>\n</urlset>`);
  fs.writeFileSync(file,xml,'utf8');
}
function runTests() {
  const samples=[
    {title:'装修公司投广告有线索，却没成交，问题到底出在哪里？',body:'家装业务需要检查线索转化和销售承接。'},
    {title:'腾讯广告计划突然不消耗，应该怎么排查？',body:'从账户优化和投放排查开始。'},
    {title:'我如何用 ChatGPT 和 Notion 搭建内容工作流',body:'这套 AI工作流用于内容生产。'}
  ];
  for(const sample of samples) console.log(JSON.stringify({title:sample.title,category:classify(sample).category,tags:generateTags(sample)},null,2));
}
if (process.argv.includes('--classify-test')) runTests();
else {
  const source=process.argv[2]; if(!source){console.error('用法：node scripts/add-article.js path/to/article.md|article.json');process.exit(1);}
  const input=parseInput(path.resolve(source)); if(!input.title||!input.body){console.error('缺少 title 或完整 body，未生成文章。');process.exit(1);}
  const date=input.date||new Date().toISOString().slice(0,10); const categoryResult=classify(input); const typeResult=detectContentType(input);
  const article={slug:input.slug||makeSlug(input.title,date),title:input.title,category:allowedCategories.includes(input.category)?input.category:categoryResult.category,tags:Array.isArray(input.tags)?input.tags.slice(0,6):generateTags(input),date,author:input.author||'老侯',excerpt:input.excerpt||excerptFrom(input.body),cover:input.cover||'/assets/articles/default-cover.svg',url:'',wechatUrl:input.wechatUrl||'',featured:input.featured===true,lang:input.lang||'zh',status:input.status||((categoryResult.uncertain||typeResult.uncertain)?'draft':'published'),contentType:input.contentType||typeResult.contentType,readingTime:readingTime(input.body)};
  article.url=`/articles/${article.slug}.html`;
  const needs=[]; if(categoryResult.uncertain&&!input.category)needs.push('主分类'); if(typeResult.uncertain&&!input.contentType)needs.push('contentType'); if(!article.tags.length)needs.push('标签');
  if(needs.length) console.warn(`需要人工确认的字段：${needs.join('、')}。文章已按 draft 保存，不会出现在公开入口。`);
  if(article.contentType!=='article'){console.error(`识别为 ${article.contentType}，本脚本不会错误发布到文章区。请人工确认后处理。`);process.exit(2);}
  const articles=JSON.parse(fs.readFileSync(dataFile,'utf8')); const index=articles.findIndex(item=>item.slug===article.slug); if(index>=0)articles[index]=article;else articles.push(article); articles.sort((a,b)=>b.date.localeCompare(a.date));
  fs.writeFileSync(dataFile,`${JSON.stringify(articles,null,2)}\n`,'utf8'); fs.writeFileSync(path.join(root,'articles',`${article.slug}.html`),articleHtml(article,markdownToHtml(input.body)),'utf8'); updateSitemap(articles);
  console.log(`已生成 ${article.url}`); console.log(JSON.stringify(article,null,2));
}
