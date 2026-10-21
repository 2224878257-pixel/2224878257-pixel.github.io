(function(){
  const n=v=>Number(v);
  const blank=v=>String(v).trim()==='';
  const finite=v=>Number.isFinite(v);
  const trimNumber=(v,digits=1)=>Number(v.toFixed(digits)).toString();
  const pct=v=>`${trimNumber(v*100)}%`;
  const money=v=>`¥${Number.isInteger(v)?v.toFixed(0):v.toFixed(2)}`;
  const safeDiv=(a,b)=>b>0?a/b:null;
  window.LaohouCalc={
    acquisition(x){
      const keys=['spend','leads','valid','visit','deals','revenue'];
      if(keys.some(k=>blank(x[k]))) return {error:'请完整填写所有数据。'};
      for(const k of keys){if(!finite(n(x[k]))||n(x[k])<0) return {error:'所有数据必须大于或等于 0。'};}
      const spend=n(x.spend),leads=n(x.leads),valid=n(x.valid),visit=n(x.visit),deals=n(x.deals),revenue=n(x.revenue);
      if(leads<=0) return {error:'线索数量必须大于 0。'};
      if(valid>leads||visit>valid||deals>visit) return {error:'漏斗阶段数量应满足：线索 ≥ 有效线索 ≥ 到店 ≥ 成交。'};
      return {metrics:{cpl:spend>0?safeDiv(spend,leads):null,cpValid:spend>0?safeDiv(spend,valid):null,validRate:safeDiv(valid,leads),visitRate:safeDiv(visit,valid),dealRate:safeDiv(deals,visit),cac:spend>0?safeDiv(spend,deals):null,roas:safeDiv(revenue,spend)}};
    },
    budget(x){
      if([x.targetLeads,x.cpl,x.validRate,x.dealRate].some(blank)) return {error:'请完整填写所有数据。'};
      const leads=n(x.targetLeads),cpl=n(x.cpl),validRate=n(x.validRate)/100,dealRate=n(x.dealRate)/100;
      if(!finite(leads)||leads<=0) return {error:'目标线索量必须大于 0。'};
      if(!finite(cpl)||cpl<0) return {error:'预计线索成本必须大于或等于 0。'};
      if(!finite(validRate)||!finite(dealRate)||validRate<0||dealRate<0||validRate>1||dealRate>1) return {error:'转化率请输入 0–100 之间的百分比。'};
      const budget=leads*cpl,valid=leads*validRate,deals=valid*dealRate;
      return {metrics:{budget,valid,deals,cac:safeDiv(budget,deals)}};
    },
    funnel(x){
      if([x.leads,x.valid,x.booked,x.visit,x.deals].some(blank)) return {error:'请完整填写所有数据。'};
      const stages=[['线索',n(x.leads)],['有效线索',n(x.valid)],['预约',n(x.booked)],['到店',n(x.visit)],['成交',n(x.deals)]];
      if(stages.some(([,v])=>!finite(v)||v<0)) return {error:'各阶段人数必须大于或等于 0。'};
      if(stages[0][1]<=0) return {error:'线索量必须大于 0。'};
      for(let i=1;i<stages.length;i++){if(stages[i][1]>stages[i-1][1]) return {error:'后一个阶段人数不能大于前一个阶段。'};}
      return {stages:stages.map((s,i)=>({name:s[0],value:s[1],rate:i===0?null:safeDiv(s[1],stages[i-1][1]),loss:i===0?null:(stages[i-1][1]?1-s[1]/stages[i-1][1]:null)}))};
    },fmt:{pct,money}
  };
})();
