const ANALYTICS_COLORS=['#8ba8ff','#79d6b0','#f0bd78','#c59cff','#ff8d9a','#72c9df','#c7d17a','#b2b9ca'];
function analyticsDateOffset(date,offset){const d=new Date(date+'T12:00:00');d.setDate(d.getDate()+offset);return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;}
function formatHours(minutes){return `${(minutes/60).toFixed(1)}시간`;}
let metaReflectionLogId=null;
let metaReflectionRating=0;
function showMetaReflection(logId){
  const log=data.logs.find(item=>String(item.id)===String(logId));
  if(!log)return;
  metaReflectionLogId=log.id;
  metaReflectionRating=log.metaReviewed&&log.metaRating!==null&&log.metaRating!==undefined?Number(log.metaRating):null;
  $('metaReflectionContext').textContent=`${log.subject||'기타'} · ${log.title||'학습 기록'} · ${Number(log.minutes)||0}분`;
  $('metaReflectionInput').value=String(log.metaReflection||'');
  const stars=$('metaRatingStars');
  stars.innerHTML=Array.from({length:5},(_,i)=>{
    const n=i+1,half=n-.5;
    return `<span class="meta-star-pair"><span class="meta-star-base">★</span><span class="meta-star-half" data-half-star="${half}">★</span><span class="meta-star-half right" data-half-star="${n}">★</span><button class="meta-star-hit left" type="button" data-meta-rating="${half}" aria-label="${half}점"></button><button class="meta-star-hit right" type="button" data-meta-rating="${n}" aria-label="${n}점"></button></span>`;
  }).join('')+`<button class="meta-rating-zero" type="button" data-meta-rating="0" aria-label="0점">0점</button>`;
  updateMetaRatingDisplay();
  $('metaReflectionBack').style.display='grid';
  setTimeout(()=>$('metaReflectionInput').focus(),60);
}
function updateMetaRatingDisplay(){
  $('metaRatingStars').querySelectorAll('[data-half-star]').forEach(el=>{
    el.style.opacity=Number(el.dataset.halfStar)<=metaReflectionRating?'1':'0';
  });
  $('metaRatingValue').textContent=metaReflectionRating!==null?`${Number(metaReflectionRating).toFixed(1).replace(/\.0$/,'')} / 5점`:'별점을 선택해 주세요 · 0.5점 단위';
}
$('metaRatingStars').addEventListener('click',e=>{
  const button=e.target.closest('[data-meta-rating]');
  if(!button)return;
  metaReflectionRating=Number(button.dataset.metaRating);
  updateMetaRatingDisplay();
});
function closeMetaReflection(){
  $('metaReflectionBack').style.display='none';
  metaReflectionLogId=null;
}
$('metaReflectionList').addEventListener('click',e=>{
  const button=e.target.closest('[data-meta-reflection-edit]');
  if(button)showMetaReflection(button.dataset.metaReflectionEdit);
});
$('metaReflectionLater').onclick=closeMetaReflection;
$('metaReflectionBack').addEventListener('click',e=>{if(e.target===$('metaReflectionBack'))closeMetaReflection();});
$('metaReflectionSave').onclick=()=>{
  const log=data.logs.find(item=>String(item.id)===String(metaReflectionLogId));
  if(!log)return closeMetaReflection();
  log.metaReviewed=true;
  log.metaPending=false;
  log.metaRating=metaReflectionRating===null?null:Number(metaReflectionRating);
  log.metaReflection=$('metaReflectionInput').value.trim();
  closeMetaReflection();
  save();
  toast('학습 메타인지 기록을 저장했어요.');
  if(document.querySelector('[data-page-view="analytics"].active'))renderLearningAnalytics();
};


function renderDailyRatingChart(range,end){
  const target=$('dailyRatingLine');
  if(!target)return;

  const days=Math.max(1,Number(range)||14);
  const start=analyticsDateOffset(end,-(days-1));
  const ratingByDate=new Map();

  (data.logs||[]).forEach(log=>{
    const date=String(log.date||'');
    const raw=log.metaRating;
    const rating=Number(raw);
    if(date<start||date>end||log.metaReviewed!==true||
      raw===null||raw===undefined||raw===''||
      !Number.isFinite(rating)||rating<0||rating>5)return;

    const bucket=ratingByDate.get(date)||{sum:0,count:0};
    bucket.sum+=rating;
    bucket.count++;
    ratingByDate.set(date,bucket);
  });

  const daily=Array.from({length:days},(_,i)=>{
    const date=analyticsDateOffset(start,i);
    const bucket=ratingByDate.get(date);
    return bucket?{date,average:bucket.sum/bucket.count,count:bucket.count}:null;
  });
  const ratedDays=daily.filter(Boolean);
  if(!ratedDays.length){
    target.innerHTML='<div class="chart-empty">선택한 기간에 등록된 별점이 없습니다.</div>';
    return;
  }

  const width=760,height=270;
  const left=48,right=18,top=20,bottom=38;
  const plotWidth=width-left-right;
  const plotHeight=height-top-bottom;
  const xAt=i=>left+(days===1?plotWidth/2:i*plotWidth/(days-1));
  const yAt=value=>top+(5-value)*plotHeight/5;

  const grid=Array.from({length:6},(_,score)=>{
    const y=yAt(score);
    return `<line x1="${left}" y1="${y}" x2="${width-right}" y2="${y}" class="daily-rating-grid"/>
      <text x="${left-10}" y="${y+4}" text-anchor="end">${score}</text>`;
  }).join('');

  const tickStep=Math.max(1,Math.ceil(days/6));
  const tickIndices=[];
  for(let i=0;i<days;i+=tickStep)tickIndices.push(i);
  if(tickIndices[tickIndices.length-1]!==days-1)tickIndices.push(days-1);
  const xLabels=tickIndices.map(i=>{
    const date=analyticsDateOffset(start,i);
    return `<text x="${xAt(i)}" y="${height-10}" text-anchor="middle">${Number(date.slice(5,7))}/${Number(date.slice(8,10))}</text>`;
  }).join('');

  const points=ratedDays.map(item=>{
    const index=Math.round((new Date(item.date+'T12:00:00')-new Date(start+'T12:00:00'))/86400000);
    return {...item,index,x:xAt(index),y:yAt(item.average)};
  });
  const path=points.length>1
    ?`<polyline points="${points.map(p=>`${p.x},${p.y}`).join(' ')}" class="daily-rating-line"/>`
    :'';
  const circles=points.map(p=>{
    const avg=p.average.toFixed(2).replace(/\.?0+$/,'');
    return `<circle cx="${p.x}" cy="${p.y}" r="4.5" class="daily-rating-point">
      <title>${p.date} · 평균 ${avg}점 · ${p.count}건</title>
    </circle>`;
  }).join('');

  const mean=ratedDays.reduce((sum,item)=>sum+item.average,0)/ratedDays.length;
  const periodText=`기록된 날짜 ${ratedDays.length}일 · 일별 평균의 기간 평균 ${mean.toFixed(1)} / 5.0`;
  target.innerHTML=`<div class="daily-rating-chart-summary">${periodText}</div>
    <svg viewBox="0 0 ${width} ${height}" role="img" aria-label="최근 ${days}일 일별 공부 평점 평균 꺾은선 그래프, 0점부터 5점까지">
      ${grid}
      ${path}
      ${circles}
      ${xLabels}
    </svg>`;
}

function renderMetaAverage(){
  const target=$('metaAverageContent');
  const rangeSelect=$('metaAverageRange');
  if(!target||!rangeSelect)return;

  const mode=rangeSelect.value||'yesterday';
  const today=todayISO();
  const start=mode==='week'?analyticsDateOffset(today,-6):analyticsDateOffset(today,-1);
  const end=mode==='week'?today:start;
  const rated=(data.logs||[]).filter(log=>{
    const date=String(log.date||'');
    const rating=Number(log.metaRating);
    return date>=start&&date<=end&&log.metaReviewed===true&&
      log.metaRating!==null&&log.metaRating!==undefined&&
      Number.isFinite(rating)&&rating>=0&&rating<=5;
  });
  const rangeLabel=mode==='week'?'최근 7일':'어제';

  if(!rated.length){
    target.innerHTML=`
      <div class="meta-average-empty">
        <span class="meta-average-empty-icon">☆</span>
        <strong>아직 별점 기록이 없어요</strong>
        <p>${rangeLabel} 학습 기록에 별점을 남기면 평균과 변화 흐름을 확인할 수 있어요.</p>
      </div>`;
    return;
  }

  const average=rated.reduce((sum,log)=>sum+Number(log.metaRating),0)/rated.length;
  const rounded=Math.round(average*10)/10;
  const trend=average>=4.2?'좋은 학습 흐름!':
    average>=3.5?'꾸준한 성장 중':
    average>=2.8?'개선할 점 발견':
    average>=2.0?'잠시 재정비':'다시 시작하는 시간';
  const trendTone=average>=3.5?'positive':average>=2.0?'caution':'negative';
  const message=average>=4.2
    ?'오늘의 학습이 좋은 흐름으로 이어지고 있어요. 지금의 집중과 성취를 다음 공부에도 이어가 봐요!'
    :average>=3.5
    ?'꾸준히 좋은 학습을 이어가고 있어요. 작은 성취들이 쌓여 더 큰 발전을 만들고 있어요.'
    :average>=2.8
    ?'만족스럽지 않은 순간도 있었지만, 그만큼 개선할 부분을 발견할 수 있어요. 럭키비키. 다음 공부에서 하나씩 바꿔 봐요.'
    :average>=2.0
    ?'오늘 공부가 기대만큼 잘되지 않았을 수 있어요. 괜찮아요. 원인을 하나만 찾아 다음 공부에서 다시 시도해 봐요.'
    :'힘든 학습이었을 수도 있어요. 점수보다 중요한 건 다시 시작하는 거예요. 잠시 쉬고, 부담 없는 목표부터 시작해 봐요.';

  const stars=Array.from({length:5},(_,i)=>{
    const fill=Math.max(0,Math.min(100,(average-i)*100));
    return `<span class="meta-average-star" style="--star-fill:${fill}%">★</span>`;
  }).join('');

  target.innerHTML=`
    <div class="meta-average-main">
      <div class="meta-average-stars" aria-label="5점 만점 평균 ${rounded}점">${stars}</div>
      <div class="meta-average-score">${rounded.toFixed(1)}<span>/ 5.0</span></div>
    </div>
    <div class="meta-average-details">
      <div class="meta-average-feedback">
        <span class="meta-average-trend ${trendTone}">${trend}</span>
        <p class="meta-average-message">${message}</p>
      </div>
    </div>`;
}

function renderMetaReflections(logs){
  const target=$('metaReflectionList');
  const entries=logs.filter(log=>log.metaReviewed||log.metaPending||Number(log.metaRating)>0||String(log.metaReflection||'').trim())
    .map((log,index)=>({log,index}))
    .sort((a,b)=>{
      const dateOrder=String(b.log.date||'').localeCompare(String(a.log.date||''));
      if(dateOrder)return dateOrder;
      const getEndMinute=log=>{
        const sessions=Array.isArray(log.sessions)?log.sessions:[];
        const sessionEnd=sessions.reduce((latest,session)=>Math.max(latest,Number(session.endMinute)||-1),-1);
        return sessionEnd>=0?sessionEnd:Number(log.endMinute??log.startMinute??-1);
      };
      const timeOrder=getEndMinute(b.log)-getEndMinute(a.log);
      return timeOrder||a.index-b.index;
    })
    .map(entry=>entry.log);
  if(!entries.length){target.innerHTML='<div class="chart-empty">아직 학습 성찰이 없습니다. 타이머 완료 또는 공부 기록 추가 후 성찰을 남겨보세요.</div>';return;}
  target.innerHTML=entries.map(log=>{
    const hasRating=log.metaReviewed&&log.metaRating!==null&&log.metaRating!==undefined&&Number.isFinite(Number(log.metaRating));
    const rating=hasRating?Math.max(0,Math.min(5,Number(log.metaRating))):null;
    const score=hasRating
      ?`<span class="meta-reflection-stars" role="img" aria-label="별점 ${rating}점 / 5점">${Array.from({length:5},(_,i)=>`<span class="meta-reflection-star" style="--star-fill:${Math.max(0,Math.min(100,(rating-i)*100))}%">★</span>`).join('')}</span>`
      :log.metaReviewed?'별점 미입력':'성찰 미작성';
    const feedback=String(log.metaReflection||'').trim();
    const editLabel=log.metaReviewed?'수정':'성찰 작성';
    return `<article class="meta-reflection-item"><div class="meta-reflection-top"><div><div class="meta-reflection-name">${escapeHTML(log.subject||'기타')} · ${escapeHTML(log.title||'학습 기록')}</div><div class="meta-reflection-meta">${escapeHTML(log.date||'')} · ${Number(log.minutes)||0}분</div></div><div class="meta-reflection-score">${score}</div></div>${feedback?`<p class="meta-reflection-text">${escapeHTML(feedback)}</p>`:'<p class="meta-reflection-text muted">아직 평가와 피드백을 작성하지 않았어요.</p>'}<button class="btn" type="button" data-meta-reflection-edit="${escapeHTML(log.id)}" style="margin-top:10px">${editLabel}</button></article>`;
  }).join('');
}


function buildLearningAnalyticsModel(allLogs,range,end){
  const start=analyticsDateOffset(end,-(range-1));
  const logs=(allLogs||[]).filter(l=>l.date>=start&&l.date<=end);
  const total=sumLogMinutes(logs,start,end);
  const activeDays=new Set(logs.filter(l=>Number(l.minutes)>0).map(l=>l.date)).size;
  const avg=total/range;
  const subjectTotals={};
  logs.forEach(l=>{const subject=String(l.subject||'기타');subjectTotals[subject]=(subjectTotals[subject]||0)+(Number(l.minutes)||0);});
  const subjects=Object.entries(subjectTotals).filter(([,v])=>v>0).sort((a,b)=>b[1]-a[1]);
  const weekdayTotals=Array(7).fill(0),weekdayCounts=Array(7).fill(0);
  for(let i=0;i<range;i++){const date=analyticsDateOffset(end,i-(range-1));const day=new Date(date+'T12:00:00').getDay();weekdayCounts[day]++;}
  logs.forEach(l=>{const day=new Date(l.date+'T12:00:00').getDay();weekdayTotals[day]+=Number(l.minutes)||0;});
  const weekdayAvg=weekdayTotals.map((v,i)=>weekdayCounts[i]?v/weekdayCounts[i]:0);
  const maxWeek=Math.max(60,...weekdayAvg);
  const daily=Array.from({length:range},(_,i)=>{const date=analyticsDateOffset(end,i-(range-1));return {date,minutes:sumLogMinutes(logs,date,date)};});
  const maxDaily=Math.max(60,...daily.map(x=>x.minutes));
  const weeks={};
  logs.forEach(l=>{const monday=mondayOf(l.date);weeks[monday]=(weeks[monday]||0)+(Number(l.minutes)||0);});
  const weekEntries=Object.entries(weeks).sort(([a],[b])=>a.localeCompare(b)).slice(-6);
  const maxW=Math.max(60,...weekEntries.map(([,v])=>v));
  return {logs,total,activeDays,avg,subjects,weekdayAvg,maxWeek,daily,maxDaily,weekEntries,maxW};
}
function renderLearningAnalytics(){
  const range=Number($('analyticsRange')?.value)||14;
  const end=todayISO();
  const {logs,total,activeDays,avg,subjects,weekdayAvg,maxWeek,daily,maxDaily,weekEntries,maxW}=buildLearningAnalyticsModel(data.logs||[],range,end);
  renderDailyRatingChart(range,end);
  renderMetaAverage();
  renderMetaReflections(logs);
  $('analyticsKpis').innerHTML=[
    ['총 공부 시간',formatHours(total)],['하루 평균',formatHours(avg)],['공부한 날',`${activeDays}일`],['기록 수',`${logs.length}건`]
  ].map(([label,value])=>`<div class="card analytics-kpi"><span>${label}</span><strong>${value}</strong></div>`).join('');

  const pie=$('subjectPie');
  if(!subjects.length){pie.innerHTML='<div class="chart-empty">분석할 학습 기록이 아직 없습니다.</div>';}
  else{
    let cursor=0;
    const stops=subjects.map(([name,value],i)=>{const from=cursor;cursor+=value/total*100;return `${ANALYTICS_COLORS[i%ANALYTICS_COLORS.length]} ${from}% ${cursor}%`;}).join(',');
    pie.innerHTML=`<div class="pie-layout"><div class="pie-chart" style="background:conic-gradient(${stops})"><div class="pie-hole"><strong>${formatHours(total)}</strong><span>전체 공부 시간</span></div></div><div class="chart-legend">${subjects.map(([name,value],i)=>`<div><i style="background:${ANALYTICS_COLORS[i%ANALYTICS_COLORS.length]}"></i><span>${escapeHTML(name)}</span><b>${Math.round(value/total*100)}%</b></div>`).join('')}</div></div>`;
  }

  const weekdayNames=['일','월','화','수','목','금','토'];

  $('weekdayBars').innerHTML=`<div class="vertical-bars">${weekdayNames.map((day,i)=>`<div class="vbar-col"><div class="vbar-value">${weekdayAvg[i]?Math.round(weekdayAvg[i]/60*10)/10+'h':'-'}</div><div class="vbar-track"><i style="height:${Math.max(2,weekdayAvg[i]/maxWeek*100)}%"></i></div><span>${day}</span></div>`).join('')}</div>`;


  const w=720,h=230,pad=34;
  const pts=daily.map((d,i)=>`${pad+(range===1?0:i*(w-2*pad)/(range-1))},${h-pad-(d.minutes/maxDaily)*(h-2*pad)}`).join(' ');
  const labels=daily.map((d,i)=>i===0||i===range-1||i%(range>20?7:Math.max(1,Math.floor(range/5)))===0?`<text x="${pad+(range===1?0:i*(w-2*pad)/(range-1))}" y="${h-7}" text-anchor="middle">${Number(d.date.slice(5,7))}/${Number(d.date.slice(8,10))}</text>`:'').join('');
  $('dailyLine').innerHTML=`<svg viewBox="0 0 ${w} ${h}" role="img" aria-label="일별 공부 시간 꺾은선 그래프"><line x1="${pad}" y1="${h-pad}" x2="${w-pad}" y2="${h-pad}" class="chart-axis"/><line x1="${pad}" y1="${pad}" x2="${pad}" y2="${h-pad}" class="chart-axis"/><polyline points="${pts}" class="chart-line"/>${daily.map((d,i)=>{const x=pad+(range===1?0:i*(w-2*pad)/(range-1)),y=h-pad-(d.minutes/maxDaily)*(h-2*pad);return `<circle cx="${x}" cy="${y}" r="3.5" class="chart-point"><title>${d.date}: ${formatHours(d.minutes)}</title></circle>`;}).join('')}${labels}</svg>`;
  $('subjectBars').innerHTML=subjects.length?`<div class="horizontal-bars">${subjects.map(([name,value],i)=>`<div class="hbar-row"><span>${escapeHTML(name)}</span><div><i style="width:${value/subjects[0][1]*100}%;background:${ANALYTICS_COLORS[i%ANALYTICS_COLORS.length]}"></i></div><b>${formatHours(value)}</b></div>`).join('')}</div>`:'<div class="chart-empty">과목별 기록이 없습니다.</div>';


  $('weeklyBars').innerHTML=weekEntries.length?`<div class="vertical-bars">${weekEntries.map(([date,value])=>`<div class="vbar-col"><div class="vbar-value">${(value/60).toFixed(1)}h</div><div class="vbar-track"><i style="height:${Math.max(2,value/maxW*100)}%"></i></div><span>${Number(date.slice(5,7))}/${Number(date.slice(8,10))}</span></div>`).join('')}</div>`:'<div class="chart-empty">주간 기록이 아직 없습니다.</div>';
}


$('metaAverageRange')?.addEventListener('change',renderMetaAverage);
