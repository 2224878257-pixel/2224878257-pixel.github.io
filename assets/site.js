(function(){
 const cfg=window.LAOHOU_CONFIG||{};
 document.querySelectorAll('[data-config-link]').forEach(el=>{const key=el.dataset.configLink;const value=cfg[key];if(value)el.href=key==='email'?`mailto:${value}`:value;});
 document.querySelectorAll('[data-config-text]').forEach(el=>{const value=cfg[el.dataset.configText];if(value)el.textContent=value;});
 const q=document.querySelector('#search'); const items=[...document.querySelectorAll('[data-search]')];
 const filters=[...document.querySelectorAll('[data-filter]')]; const selected={category:'all',industry:'all',platform:'all'};
 function run(){const term=(q?.value||'').trim().toLowerCase();items.forEach(el=>{const text=(el.dataset.search||'').toLowerCase();const cats=(el.dataset.category||'').split(',');const okTerm=!term||text.includes(term);const okCategory=selected.category==='all'||cats.includes(selected.category);const okIndustry=selected.industry==='all'||el.dataset.industry===selected.industry;const okPlatform=selected.platform==='all'||el.dataset.platform===selected.platform;el.hidden=!(okTerm&&okCategory&&okIndustry&&okPlatform);});}
 q?.addEventListener('input',run);filters.forEach(b=>b.addEventListener('click',()=>{const group=b.dataset.group||'category';filters.filter(x=>(x.dataset.group||'category')===group).forEach(x=>x.classList.remove('active'));b.classList.add('active');selected[group]=b.dataset.filter;run();}));
 const top=document.createElement('button');top.className='backtop';top.setAttribute('aria-label','返回顶部');top.textContent='↑';document.body.append(top);top.addEventListener('click',()=>scrollTo({top:0,behavior:'smooth'}));addEventListener('scroll',()=>top.classList.toggle('show',scrollY>500));
})();
