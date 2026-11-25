let viewedWeek=mondayOf(todayISO());
let selectedBlockId=null;
let selectedSlot=null;
let clipboardBlock=null;
let pasteTarget=null;
let editingBlockId=null;
let modalAction=null;

function save(){
  localStorage.setItem(KEY,JSON.stringify(data));
  render();
}

function minsToText(s){
  return `${Math.floor(s/60)}h ${String(s%60).padStart(2,'0')}m`;
}

function secToText(s){
  return [Math.floor(s/3600),Math.floor(s%3600/60),s%60]
    .map(x=>String(x).padStart(2,'0')).join(':');
}

function weekStart(){
  return mondayOf(todayISO());
}

function sumLogMinutes(logs,start,end){
  return logs
    .filter(log=>log.date>=start&&log.date<=end)
    .reduce((total,log)=>total+(Number(log.minutes)||0),0);
}

function sumLogs(start,end){
  return sumLogMinutes(data.logs,start,end);
}

function toast(t){
  const el=$('toast');
  el.textContent=t;
  el.classList.add('show');
  setTimeout(()=>el.classList.remove('show'),2100);
}

function escapeHTML(s){
  return String(s??'').replace(/[&<>"']/g,c=>({
    '&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'
  }[c]));
}

/* 시간표 표시 범위 설정 */
function buildViewOptions(){
  let options='';

  for(let m=0;m<=1440;m+=30){
    options+=`<option value="${m}">${m===1440?'24:00':timeText(m)}</option>`;
  }

  $('viewStart').innerHTML=options;
  $('viewEnd').innerHTML=options;

  $('viewStart').value=String(data.scheduleView.start);
  $('viewEnd').value=String(data.scheduleView.end);
}

buildViewOptions();

function updateViewRange(){
  const start=Number($('viewStart').value);
  const end=Number($('viewEnd').value);

  if(end<=start){
    toast('종료 시간은 시작 시간보다 늦어야 합니다.');
    $('viewStart').value=String(data.scheduleView.start);
    $('viewEnd').value=String(data.scheduleView.end);
    return;
  }

  data.scheduleView={start,end};
  selectedSlot=null;
  selectedBlockId=null;
  pasteTarget=null;

  save();
}

$('viewStart').addEventListener('change',updateViewRange);
$('viewEnd').addEventListener('change',updateViewRange);

/* 시간표 */
function getWeekDates(){
  return Array.from({length:7},(_,i)=>dateOffset(viewedWeek,i));
}

function blocksForDate(date){
  const day=new Date(date+'T12:00:00').getDay();

  return data.scheduleBlocks.filter(b=>
    b.repeat?Number(b.day)===day:b.date===date
  );
}

function isPhoneSchedule(){
  return window.matchMedia('(max-width: 560px)').matches;
}

let schedulePhoneEditMode=false;

function getScheduleVisibleRange(){
  return isPhoneSchedule() && !schedulePhoneEditMode
    ? {start:360,end:1440}
    : {start:data.scheduleView.start,end:data.scheduleView.end};
}

function updatePhoneScheduleModeUI(){
  const phone=isPhoneSchedule();
  const scroll=$('scheduleScroll');
  const card=scroll?.closest('.card');
  const actions=$('schedulePhoneModeActions');
  if(!scroll||!card||!actions)return;

  actions.style.display=phone?'flex':'none';
  scroll.classList.toggle('phone-overview-mode',phone&&!schedulePhoneEditMode);
  scroll.classList.toggle('phone-edit-mode',phone&&schedulePhoneEditMode);
  card.classList.toggle('phone-schedule-overview',phone&&!schedulePhoneEditMode);
  card.classList.toggle('phone-schedule-edit',phone&&schedulePhoneEditMode);

  $('scheduleEditModeBtn').style.display=phone&&!schedulePhoneEditMode?'':'none';
  $('scheduleFinishEditBtn').style.display=phone&&schedulePhoneEditMode?'':'none';

  HOUR_HEIGHT=phone&&!schedulePhoneEditMode?16:32.4;
}

$('scheduleEditModeBtn').addEventListener('click',()=>{
  if(!isPhoneSchedule())return;
  schedulePhoneEditMode=true;
  selectedSlot=null;
  selectedBlockId=null;
  pasteTarget=null;
  updatePhoneScheduleModeUI();
  renderSchedule();
});

$('scheduleFinishEditBtn').addEventListener('click',()=>{
  if(!isPhoneSchedule())return;
  save();
  schedulePhoneEditMode=false;
  selectedSlot=null;
  selectedBlockId=null;
  pasteTarget=null;
  updatePhoneScheduleModeUI();
  renderSchedule();
  toast('시간표 변경 내용을 저장했어요.');
});

function getBlockVisibleRange(block){
  const {start,end}=getScheduleVisibleRange();

  const visibleStart=Math.max(block.start,start);
  const visibleEnd=Math.min(block.end,end);

  if(visibleEnd<=visibleStart)return null;

  return {
    top:(visibleStart-start)/HOUR*HOUR_HEIGHT,
    height:(visibleEnd-visibleStart)/HOUR*HOUR_HEIGHT
  };
}

/* 주간 시간표 그리기 */
/* 시간표 영역: 가로 스와이프만 시간표를 이동시키고 세로 스와이프는 페이지에 맡김 */
function enableScheduleHorizontalSwipe(){
  const scroll=$('scheduleScroll');
  if(!scroll||scroll.dataset.horizontalSwipeReady)return;
  scroll.dataset.horizontalSwipeReady='1';

  /* iOS/Safari 및 Android 터치 대응: 빈 시간표 영역에서 좌우 스와이프 */
  let touchStartX=0,touchStartY=0,touchStartScroll=0,touchAxis=null,touchTracking=false;
  scroll.addEventListener('touchstart',e=>{
    if(e.touches.length!==1||e.target.closest('.schedule-block')){touchTracking=false;return;}
    const t=e.touches[0];
    touchStartX=t.clientX;
    touchStartY=t.clientY;
    touchStartScroll=scroll.scrollLeft;
    touchAxis=null;
    touchTracking=true;
  },{passive:true});
  scroll.addEventListener('touchmove',e=>{
    if(!touchTracking||e.touches.length!==1)return;
    const t=e.touches[0];
    const dx=t.clientX-touchStartX;
    const dy=t.clientY-touchStartY;
    if(!touchAxis){
      if(Math.max(Math.abs(dx),Math.abs(dy))<6)return;
      touchAxis=Math.abs(dx)>Math.abs(dy)?'x':'y';
    }
    if(touchAxis==='x'){
      scroll.scrollLeft=touchStartScroll-dx;
      if(e.cancelable)e.preventDefault();
    }else{
      touchTracking=false;
    }
  },{passive:false});
  const stopScheduleTouch=()=>{touchTracking=false;touchAxis=null;};
  scroll.addEventListener('touchend',stopScheduleTouch,{passive:true});
  scroll.addEventListener('touchcancel',stopScheduleTouch,{passive:true});

  /* 마우스/펜 입력 및 Pointer Events 지원 브라우저용 보조 처리 */
  scroll.addEventListener('pointerdown',e=>{
    if(e.pointerType!=='touch')return;
    if(e.target.closest('.schedule-block'))return;
    const startX=e.clientX,startY=e.clientY,startScrollLeft=scroll.scrollLeft;
    let axis=null;
    const onMove=ev=>{
      const dx=ev.clientX-startX,dy=ev.clientY-startY;
      if(!axis){if(Math.max(Math.abs(dx),Math.abs(dy))<7)return;axis=Math.abs(dx)>Math.abs(dy)?'x':'y';}
      if(axis==='x'){scroll.scrollLeft=startScrollLeft-dx;if(ev.cancelable)ev.preventDefault();}
      else cleanup();
    };
    const cleanup=()=>{
      window.removeEventListener('pointermove',onMove);
      window.removeEventListener('pointerup',cleanup);
      window.removeEventListener('pointercancel',cleanup);
    };
    window.addEventListener('pointermove',onMove,{passive:false});
    window.addEventListener('pointerup',cleanup,{once:true});
    window.addEventListener('pointercancel',cleanup,{once:true});
  },{passive:true});
}

function blockDateForRender(block, fallbackDate){
  return block.repeat ? fallbackDate : (block.date||fallbackDate);
}

function getBlockProgress(block, date){
  const targetDate=blockDateForRender(block,date);
  const manuallyDone=!!block.doneDates?.[targetDate];
  if(manuallyDone)return {percent:100,minutes:block.end-block.start,planned:block.end-block.start,manual:true};
  if(block.type!=='study')return {percent:0,minutes:0,planned:block.end-block.start,manual:false};

  const intervals=[];
  data.logs.filter(log=>log.date===targetDate).forEach(log=>{
    if(Array.isArray(log.sessions)){
      log.sessions.forEach(seg=>{
        if(Number.isFinite(Number(seg.startMinute))&&Number.isFinite(Number(seg.endMinute))&&Number(seg.endMinute)>Number(seg.startMinute)){
          intervals.push([Number(seg.startMinute),Number(seg.endMinute)]);
        }
      });
    }else if(Number.isFinite(Number(log.startMinute))&&Number.isFinite(Number(log.endMinute))&&Number(log.endMinute)>Number(log.startMinute)){
      intervals.push([Number(log.startMinute),Number(log.endMinute)]);
    }
  });

  // 겹치는 기록 구간은 합쳐 한 번만 계산
  intervals.sort((a,b)=>a[0]-b[0]);
  const merged=[];
  intervals.forEach(([a,b])=>{
    const start=Math.max(a,block.start),end=Math.min(b,block.end);
    if(end<=start)return;
    const last=merged[merged.length-1];
    if(last&&start<=last[1])last[1]=Math.max(last[1],end);
    else merged.push([start,end]);
  });
  const minutes=merged.reduce((sum,[a,b])=>sum+b-a,0);
  const planned=block.end-block.start;
  return {percent:Math.min(100,Math.round(minutes/planned*100)),minutes:Math.min(planned,minutes),planned,manual:false};
}

function renderSchedule(){
  const grid=$('scheduleGrid');
  const dates=getWeekDates();
  const today=todayISO();

  updatePhoneScheduleModeUI();
  const {start:viewStart,end:viewEnd}=getScheduleVisibleRange();
  const totalHeight=(viewEnd-viewStart)/HOUR*HOUR_HEIGHT;

  const scroll=$('scheduleScroll');
  const previousLeft=scroll.scrollLeft;
  const previousTop=scroll.scrollTop;

  $('weekLabel').textContent=
    `${viewedWeek.replaceAll('-','.')} ~ ${dates[6].replaceAll('-','.')}`;

  grid.innerHTML='';

  const corner=document.createElement('div');
  corner.className='schedule-corner';
  grid.appendChild(corner);

  dates.forEach(date=>{
    const d=new Date(date+'T12:00:00');
    const head=document.createElement('div');

    head.className='schedule-day-head'+(date===today?' today':'');
    head.innerHTML=`
      <span>${DAY_NAMES[d.getDay()]}요일</span>
      <strong>${d.getMonth()+1}/${d.getDate()}</strong>
    `;

    grid.appendChild(head);
  });

  const timeCol=document.createElement('div');
  timeCol.className='time-column';
  timeCol.style.height=totalHeight+'px';

  for(let m=viewStart;m<viewEnd;m+=HOUR){
    const label=document.createElement('div');
    label.className='time-label';
    label.style.height=HOUR_HEIGHT+'px';
    label.innerHTML=`<span>${timeText(m)}</span>`;
    timeCol.appendChild(label);
  }

  grid.appendChild(timeCol);

  dates.forEach(date=>{
    const col=document.createElement('div');
    col.className='day-column'+(date===today?' today':'');
    col.dataset.date=date;
    col.style.height=totalHeight+'px';

    col.addEventListener('click',e=>{
      if(isPhoneSchedule()&&!schedulePhoneEditMode)return;
      if(e.target.closest('.schedule-block'))return;

      const rect=col.getBoundingClientRect();
      const y=clamp(e.clientY-rect.top,0,totalHeight);

      const row=Math.floor(y/HOUR_HEIGHT);
      const start=viewStart+row*HOUR;

      if(start>=viewEnd)return;

      selectedBlockId=null;
      selectedSlot={date,start};
      pasteTarget={date,start};

      renderSchedule();
    });

    if(selectedSlot&&selectedSlot.date===date){
      const selection=document.createElement('div');
      selection.className='slot-selection';

      const selectionHeight=Math.min(
        HOUR_HEIGHT,
        (viewEnd-selectedSlot.start)/HOUR*HOUR_HEIGHT
      );

      selection.style.top=
        ((selectedSlot.start-viewStart)/HOUR*HOUR_HEIGHT)+'px';

      selection.style.height=Math.max(0,selectionHeight)+'px';

      if(selectedSlot.start>=viewStart&&selectedSlot.start<viewEnd){
        col.appendChild(selection);
      }
    }

    blocksForDate(date).forEach(block=>{
      const visible=getBlockVisibleRange(block);
      if(!visible)return;

      const el=document.createElement('div');

      el.className=`schedule-block ${block.type||'study'}`+
        (selectedBlockId===block.id?' selected':'');

      el.dataset.id=block.id;
      el.style.top=visible.top+'px';
      el.style.height=visible.height+'px';
      if(/^#[0-9a-fA-F]{6}$/.test(block.color||'')){
        el.style.backgroundColor=block.color;
        el.style.borderColor=block.color+'99';
      }

      const progress=getBlockProgress(block,date);
      const categoryLabel=block.type==='class'?'수업':block.type==='study'?'인강·자습':block.type==='personal'?'개인 일정':'기타';
      const occurrenceDone=!!block.doneDates?.[date];
      const statusMarkup=block.type==='study'
        ? `<div class="block-status"><input class="block-check" type="checkbox" data-block-check="${escapeHTML(block.id)}" data-occurrence-date="${date}" aria-label="${escapeHTML(block.title)} 완료 체크" ${occurrenceDone?'checked':''} ${isPhoneSchedule()&&!schedulePhoneEditMode?'disabled':''}><span class="block-progress">${progress.percent}%</span><span class="block-progress-track"><span class="block-progress-fill" style="display:block;width:${progress.percent}%"></span></span></div>`
        : `<div class="block-status"><input class="block-check" type="checkbox" data-block-check="${escapeHTML(block.id)}" data-occurrence-date="${date}" aria-label="${escapeHTML(block.title)} 완료 체크" ${occurrenceDone?'checked':''} ${isPhoneSchedule()&&!schedulePhoneEditMode?'disabled':''}><span class="block-progress">${occurrenceDone?'완료':categoryLabel}</span></div>`;
      el.innerHTML=`
        <div class="block-title">${escapeHTML(block.title)}</div>
        <div class="block-time">${timeText(block.start)}–${timeText(block.end)}</div>
        ${block.repeat?'<div class="block-repeat">↻ 매주 반복</div>':''}
        ${statusMarkup}
      `;
      const blockCheck=el.querySelector('[data-block-check]');
      blockCheck.addEventListener('pointerdown',e=>e.stopPropagation());
      blockCheck.addEventListener('click',e=>{
        e.stopPropagation();
        const target=data.scheduleBlocks.find(b=>b.id===block.id);
        if(!target)return;
        const occurrenceDate=blockCheck.dataset.occurrenceDate;
        target.doneDates=target.doneDates&&typeof target.doneDates==='object'?target.doneDates:{};
        if(blockCheck.checked)target.doneDates[occurrenceDate]=true;
        else delete target.doneDates[occurrenceDate];
        save();
        toast(blockCheck.checked?'이 날짜의 일정을 완료로 표시했어요.':'이 날짜의 완료 표시를 해제했어요.');
      });

      /* 일정 선택 */
      el.addEventListener('click',e=>{
        if(isPhoneSchedule()&&!schedulePhoneEditMode)return;
        e.stopPropagation();

        selectedBlockId=block.id;
        selectedSlot=null;
        pasteTarget={date,start:block.start};

        document.querySelectorAll('.schedule-block')
          .forEach(x=>x.classList.remove('selected'));

        document.querySelectorAll('.slot-selection')
          .forEach(x=>x.remove());

        el.classList.add('selected');
        renderSelection();
      });

      /* 첫 터치/클릭은 선택만. 흰색 테두리가 활성화된 뒤의 드래그만 조정 */
      el.addEventListener('pointerdown',e=>{
        if(isPhoneSchedule()&&!schedulePhoneEditMode)return;
        if(e.button!==undefined&&e.button!==0)return;

        const alreadySelected=selectedBlockId===block.id && el.classList.contains('selected');
        selectedBlockId=block.id;
        selectedSlot=null;
        pasteTarget={date,start:block.start};
        document.querySelectorAll('.schedule-block').forEach(x=>x.classList.toggle('selected',x===el));
        document.querySelectorAll('.slot-selection').forEach(x=>x.remove());
        renderSelection();

        /* 아직 선택되지 않은 블록은 이번 동작에서 절대 움직이지 않음 */
        if(!alreadySelected)return;

        /* 선택된 블록: 상단 65% 이동 / 하단 35% 길이 조절 */
        const rect=el.getBoundingClientRect();
        const relativeY=e.clientY-rect.top;
        const mode=relativeY>=rect.height*0.65?'resize':'move';
        beginBlockGesture(e,block,mode,el);
      });

      col.appendChild(el);
    });

    grid.appendChild(col);
  });

  scroll.scrollLeft=previousLeft;
  scroll.scrollTop=previousTop;

  renderSelection();
}

/* 선택 일정 및 선택 위치 표시 */
function renderSelection(){
  const area=$('scheduleSelected');
  const block=data.scheduleBlocks.find(b=>b.id===selectedBlockId);
  const info=block
    ? `${escapeHTML(block.title)} · ${timeText(block.start)}–${timeText(block.end)}${block.repeat?' · 매주 반복':''}`
    : selectedSlot
      ? `선택 위치: ${escapeHTML(selectedSlot.date)} · ${timeText(selectedSlot.start)}~${timeText(selectedSlot.start+60)}`
      : '일정을 선택하면 편집·복사·삭제할 수 있습니다.';

  area.innerHTML=`
    <span class="schedule-selected-info">${info}</span>
    <button class="mini" id="editSelectedBlock" ${block?'':'disabled'}>편집</button>
    <button class="mini" id="copyEventBtn" ${block?'':'disabled'}>복사</button>
    <button class="mini" id="pasteEventBtn" ${clipboardBlock?'':'disabled'}>붙여넣기</button>
    <button class="mini" id="deleteSelectedBlock" ${block?'':'disabled'}>삭제</button>
  `;

  if(block){
    $('editSelectedBlock').onclick=()=>openScheduleModal(block.id,{
      date:pasteTarget?.date||block.date||todayISO()
    });
    $('copyEventBtn').onclick=()=>copyScheduleBlock(block);
    $('deleteSelectedBlock').onclick=()=>{
      const message=block.repeat
        ?'매주 반복되는 이 일정을 전체 삭제할까요?'
        :'이 일정을 삭제할까요?';
      if(!confirm(message))return;
      data.scheduleBlocks=data.scheduleBlocks.filter(b=>b.id!==block.id);
      selectedBlockId=null;
      selectedSlot=null;
      pasteTarget=null;
      save();
      toast('일정을 삭제했어요.');
    };
  }
  $('pasteEventBtn').onclick=pasteScheduleBlock;
}

/* 복사 */
function copyScheduleBlock(block){
  clipboardBlock={
    title:block.title,
    start:block.start,
    end:block.end,
    type:block.type,
    color:block.color,
    repeat:block.repeat
  };

  $('pasteEventBtn').disabled=false;
  toast('일정을 복사했어요. 빈 시간대를 선택한 뒤 붙여넣으세요.');
}

/* 붙여넣기 */
function pasteScheduleBlock(){
  if(!clipboardBlock)return;

  const source=clipboardBlock;

  if(!pasteTarget&&!selectedSlot){
    toast('먼저 붙여넣을 시간대를 선택해 주세요.');
    return;
  }

  const date=selectedSlot?.date||pasteTarget?.date;
  const start=selectedSlot?.start??pasteTarget?.start??source.start;
  const duration=source.end-source.start;
  const end=start+duration;

  if(start<0||end>1440){
    toast('붙여넣을 수 있는 시간 범위를 벗어났어요.');
    return;
  }

  const day=new Date(date+'T12:00:00').getDay();

  const copy={
    id:uid(),
    title:source.title,
    date,
    day,
    start,
    end,
    repeat:false,
    type:source.type||'study',
    color:source.color||''
  };

  data.scheduleBlocks.push(copy);

  selectedBlockId=copy.id;
  selectedSlot=null;
  pasteTarget={date,start};

  save();
  toast('일정을 붙여넣었어요.');
}

/* 드래그 이동 및 길이 조절 */
function beginBlockGesture(e,block,mode,element){
  if(e.button!==undefined&&e.button!==0)return;

  e.preventDefault();
  e.stopPropagation();

  const initialY=e.clientY;
  const initialStart=block.start;
  const initialEnd=block.end;
  const initialDate=element.parentElement.dataset.date;

  let currentStart=initialStart;
  let currentEnd=initialEnd;
  let currentDate=initialDate;
  let moved=false;

  element.classList.add('dragging');

  function onMove(ev){
    const dy=ev.clientY-initialY;

    if(Math.abs(dy)>4)moved=true;

    if(mode==='resize'){
      const delta=Math.round(
        (dy/HOUR_HEIGHT*HOUR)/5
      )*5;

      currentEnd=clamp(
        initialEnd+delta,
        initialStart+5,
        1440
      );

      element.style.height=
        ((currentEnd-currentStart)/HOUR*HOUR_HEIGHT)+'px';

    }else{
      const delta=Math.round(dy/HOUR_HEIGHT)*HOUR;
      const duration=initialEnd-initialStart;

      currentStart=clamp(
        initialStart+delta,
        0,
        1440-duration
      );

      currentEnd=currentStart+duration;

      const columns=[...document.querySelectorAll('.day-column')];

      const target=columns.find(col=>{
        const r=col.getBoundingClientRect();
        return ev.clientX>=r.left&&ev.clientX<=r.right;
      });

      if(target){
        currentDate=target.dataset.date;

        if(element.parentElement!==target){
          target.appendChild(element);
        }
      }

      const visibleStart=Math.max(
        currentStart,data.scheduleView.start
      );

      element.style.top=
        ((visibleStart-data.scheduleView.start)/HOUR*HOUR_HEIGHT)+'px';

      const visibleEnd=Math.min(
        currentEnd,data.scheduleView.end
      );

      element.style.height=Math.max(
        5,(visibleEnd-visibleStart)/HOUR*HOUR_HEIGHT
      )+'px';
    }

    const time=element.querySelector('.block-time');

    if(time){
      time.textContent=
        `${timeText(currentStart)}–${timeText(currentEnd)}`;
    }
  }

  function onUp(){
    window.removeEventListener('pointermove',onMove);
    window.removeEventListener('pointerup',onUp);
    window.removeEventListener('pointercancel',onUp);

    element.classList.remove('dragging');

    if(moved){
      const index=data.scheduleBlocks.findIndex(b=>b.id===block.id);

      if(index!==-1){
        const updated={
          ...data.scheduleBlocks[index],
          start:currentStart,
          end:currentEnd
        };

        if(mode==='move'){
          const newDay=new Date(currentDate+'T12:00:00').getDay();

          if(updated.repeat){
            updated.day=newDay;
          }else{
            updated.date=currentDate;
            updated.day=newDay;
          }
        }

        data.scheduleBlocks[index]=updated;
        selectedBlockId=updated.id;
        selectedSlot=null;
        pasteTarget={date:currentDate,start:currentStart};

        save();
      }
    }else{
      selectedBlockId=block.id;
      selectedSlot=null;
      pasteTarget={date:initialDate,start:block.start};
      renderSelection();
    }
  }

  window.addEventListener('pointermove',onMove);
  window.addEventListener('pointerup',onUp);
  window.addEventListener('pointercancel',onUp);
}

/* 일정 모달 */
function openScheduleModal(id=null,defaults={}){
  editingBlockId=id;

  const block=id?data.scheduleBlocks.find(b=>b.id===id):null;

  $('scheduleModalTitle').textContent=block?'일정 편집':'일정 추가';

  const date=defaults.date||block?.date||todayISO();
  const day=block?.day??new Date(date+'T12:00:00').getDay();

  $('scheduleTitle').value=block?.title||'';
  $('scheduleDay').value=String(day);

  $('scheduleStart').value=timeText(
    block?.start??defaults.start??960
  );

  $('scheduleEnd').value=timeText(
    block?.end??defaults.end??1020
  );

  $('scheduleType').value=block?.type||'study';
  const defaultColors={class:'#354b7c',study:'#354b7c',personal:'#604777',other:'#356458'};
  $('scheduleColor').value=/^#[0-9a-fA-F]{6}$/.test(block?.color||'')
    ?block.color:(defaultColors[block?.type||'study']||'#354b7c');

  const defaultRepeat=defaults.date?false:true;

  $('scheduleRepeat').value=String(
    block?.repeat??defaultRepeat
  );

  $('scheduleDate').value=date;

  $('scheduleDateWrap').style.display=
    $('scheduleRepeat').value==='true'?'none':'block';

  $('scheduleModalBack').style.display='grid';
}

function closeScheduleModal(){
  $('scheduleModalBack').style.display='none';
  editingBlockId=null;
}

$('scheduleRepeat').addEventListener('change',()=>{
  $('scheduleDateWrap').style.display=
    $('scheduleRepeat').value==='true'?'none':'block';
});

$('cancelSchedule').onclick=closeScheduleModal;

$('saveSchedule').onclick=()=>{
  const title=$('scheduleTitle').value.trim();
  const start=timeToMinutes($('scheduleStart').value);
  const end=timeToMinutes($('scheduleEnd').value);
  const repeat=$('scheduleRepeat').value==='true';
  const day=Number($('scheduleDay').value);
  const date=$('scheduleDate').value;

  if(!title)return toast('일정 이름을 입력해 주세요.');
  if(!Number.isFinite(start)||!Number.isFinite(end)){
    return toast('시작 시간과 종료 시간을 입력해 주세요.');
  }
  if(end<=start)return toast('종료 시간은 시작 시간보다 늦어야 합니다.');
  if(!repeat&&!date)return toast('날짜를 선택해 주세요.');

  const block={
    id:editingBlockId||uid(),
    title,
    start,
    end,
    day,
    date:repeat?null:date,
    repeat,
    type:$('scheduleType').value,
    doneDates:editingBlockId?(data.scheduleBlocks.find(b=>b.id===editingBlockId)?.doneDates||{}):{},
    color:$('scheduleColor').value
  };

  if(editingBlockId){
    const index=data.scheduleBlocks.findIndex(b=>b.id===editingBlockId);
    if(index!==-1)data.scheduleBlocks[index]=block;
  }else{
    data.scheduleBlocks.push(block);
  }

  selectedBlockId=block.id;
  selectedSlot=null;

  const targetDate=repeat
    ?getWeekDates().find(d=>new Date(d+'T12:00:00').getDay()===day)||date
    :date;

  pasteTarget={date:targetDate,start};

  closeScheduleModal();
  save();
  toast('일정을 저장했어요.');
};

/* 일정 추가 버튼 */
$('addEventBtn').onclick=()=>{
  const date=selectedSlot?.date||todayISO();
  const start=selectedSlot?.start??960;

  openScheduleModal(null,{
    date,
    start,
    end:Math.min(1440,start+60)
  });
};

/* 주간 이동 */
function changeWeek(offset){
  viewedWeek=dateOffset(viewedWeek,offset);
  selectedSlot=null;
  selectedBlockId=null;
  pasteTarget=null;
  renderSchedule();
}

$('prevWeek').onclick=()=>changeWeek(-7);
$('nextWeek').onclick=()=>changeWeek(7);

$('thisWeek').onclick=()=>{
  viewedWeek=mondayOf(todayISO());
  selectedSlot=null;
  selectedBlockId=null;
  pasteTarget=null;
  renderSchedule();
};

// 복사·붙여넣기 버튼은 renderSelection()에서 선택 영역에 함께 표시합니다.

function setActivePage(page){
  const valid=['home','weekly','learning','analytics','settings'];
  if(!valid.includes(page))page='home';
  document.querySelectorAll('[data-page]').forEach(btn=>btn.classList.toggle('active',btn.dataset.page===page));
  document.querySelectorAll('[data-page-view]').forEach(view=>view.classList.toggle('active',view.dataset.pageView===page));
  if(page==='weekly')requestAnimationFrame(()=>{if(typeof renderSchedule==='function')renderSchedule();});
  if(page==='analytics')requestAnimationFrame(()=>{if(typeof renderLearningAnalytics==='function')renderLearningAnalytics();});
  if(page==='settings'&&typeof renderMyPage==='function')renderMyPage();
  try{sessionStorage.setItem('study-flow-active-page',page);}catch(e){}
}
document.addEventListener('click',function handlePageNavigationClick(e){
  const nav=e.target.closest('[data-page]');
  if(nav)setActivePage(nav.dataset.page);
});

function renderMyPage(){
  const email=window.studyFlowAccountEmail||'로그인 계정';
  $('myPageEmail').textContent=email;
  $('myPageAvatar').textContent=(email[0]||'S').toUpperCase();
  $('myPageUserId').textContent=window.studyFlowAccountId?`계정 ID · ${window.studyFlowAccountId.slice(0,8)}…`:'계정 정보';
  const s=data.schoolTimetable||{};
  $('myPageSchoolSummary').textContent=s.schoolCode?`${s.schoolName} · ${s.grade}학년 ${s.className}반 · ${s.year}학년도 ${s.semester}학기`:'학교 정보를 등록해 주세요.';
  // 학습 환경 카드는 제거되었으므로 관련 DOM 업데이트도 수행하지 않음.
  $('myPageSyncStatus').textContent=$('syncStatus')?.textContent||'확인 중';
}

/* 홈 화면 목표 표시 */
function renderHomeGoal(){
  const text=String(data.homeGoal||'').trim();
  const el=$('homeGoalText');
  const button=$('homeGoalButton');
  if(!el||!button)return;
  el.textContent=text||'목표를 입력하세요 +';
  button.setAttribute('aria-label',text?`목표: ${text}, 목표 수정`:'목표 설정');
}

/* 홈 화면 D-day 표시 */
function renderDday(){
  const item=data.dday&&typeof data.dday==='object'?data.dday:null;
  const button=$('ddayButton');
  if(!button)return;
  if(!item||!String(item.name||'').trim()||! /^\d{4}-\d{2}-\d{2}$/.test(item.date||'')){
    $('ddayCount').textContent='D-day';
    $('ddayName').textContent='D-day 설정 +';
    $('ddayDateLabel').textContent='날짜를 등록하세요';
    button.setAttribute('aria-label','D-day 설정');
    return;
  }
  const [y,m,d]=item.date.split('-').map(Number);
  const target=Date.UTC(y,m-1,d);
  const now=new Date();
  const today=Date.UTC(now.getFullYear(),now.getMonth(),now.getDate());
  const diff=Math.round((target-today)/86400000);
  $('ddayCount').textContent=diff>0?`D-${String(diff).padStart(2,'0')}`:diff<0?`D+${String(Math.abs(diff)).padStart(2,'0')}`:'D-day';
  $('ddayName').textContent=String(item.name).trim();
  $('ddayDateLabel').textContent=item.date.replaceAll('-','.');
  button.setAttribute('aria-label',`${item.name}, ${$('ddayCount').textContent}, 날짜 수정`);
}

/* 대시보드 렌더링 */
function render(){
  const today=todayISO();
  const start=weekStart();

  const todayM=sumLogs(today,today);
  const weekM=sumLogs(start,today);

  $('todayLabel').textContent=new Date().toLocaleDateString(
    'ko-KR',
    {year:'numeric',month:'long',day:'numeric',weekday:'long'}
  );
  renderHomeGoal();
  renderDday();

  if(typeof renderSchoolSummary==='function')renderSchoolSummary();
  // 홈 화면을 다시 표시하거나 계정 데이터를 불러온 뒤에도 저장된 학교 시간표를 복원
  if(typeof renderSchoolWeek==='function')renderSchoolWeek();
  if(typeof renderMyPage==='function'&&document.querySelector('[data-page-view="settings"].active'))renderMyPage();
  if(typeof renderLearningAnalytics==='function'&&document.querySelector('[data-page-view="analytics"].active'))renderLearningAnalytics();
  $('todayHours').textContent=minsToText(todayM);
  $('weekHours').textContent=minsToText(weekM);
  $('goalPercent').textContent=
    Math.round(weekM/(data.goal*60)*100)+'%';

  $('goalFoot').textContent=`목표 ${data.goal}시간`;
  const completedLectureCount=data.courses.reduce((sum,c)=>sum+c.completed,0);
  $('doneCount').textContent=completedLectureCount+'강';

  $('subjectsProgress').innerHTML=SUBJECTS.map(subject=>{
    const list=data.courses.filter(c=>c.subject===subject);
    const completed=list.reduce((sum,c)=>sum+c.completed,0);
    const total=list.reduce((sum,c)=>sum+c.total,0);
    const percent=total?Math.round(completed/total*100):0;

    return `
      <div class="subject">
        <div class="subject-top">
          <strong>${subject}</strong>
          <span>${completed}/${total}강 · ${percent}%</span>
        </div>
        <div class="progress-track">
          <div class="progress-fill" style="width:${percent}%"></div>
        </div>

        ${list.length?list.map(course=>{
          const p=Math.round(course.completed/course.total*100);
          const finished=course.completed>=course.total;
          return `
            <div class="course-item">
              <div class="course-head">
                <div class="course-name">${escapeHTML(course.title)}</div>
                <div class="course-count">${course.completed}/${course.total}강</div>
              </div>
              <div class="course-progress">
                <div class="course-progress-fill" style="width:${p}%"></div>
              </div>
              <div class="course-bottom">
                <span class="course-percent">${finished?'완강 완료':`진도율 ${p}%`}</span>
                <div class="course-actions">
                  <button class="course-btn" data-course-minus="${escapeHTML(course.id)}"
                    ${course.completed===0?'disabled':''}>−1</button>
                  <button class="course-btn plus" data-course-plus="${escapeHTML(course.id)}"
                    ${finished?'disabled':''}>+1강 수강 완료</button>
                  <button class="course-btn" data-course-delete="${escapeHTML(course.id)}">삭제</button>
                </div>
              </div>
            </div>
          `;
        }).join(''):'<div class="course-empty">등록된 인강이 없습니다.</div>'}
      </div>
    `;
  }).join('');

  const chartDays=Array.from(
    {length:7},
    (_,i)=>dateOffset(today,i-6)
  );

  const vals=chartDays.map(d=>sumLogs(d,d));
  const max=Math.max(60,...vals);

  $('weeklyChart').innerHTML=chartDays.map((d,i)=>`
    <div class="bar-col">
      <div class="bar-number">${(vals[i]/60).toFixed(vals[i]%60?1:0)}</div>
      <div class="bar" style="height:${Math.max(2,vals[i]/max*100)}%"></div>
      <div class="bar-label">
        ${DAY_NAMES[new Date(d+'T12:00:00').getDay()]}
      </div>
    </div>
  `).join('');

  const recent=[...data.logs]
    .sort((a,b)=>(b.date+String(b.id)).localeCompare(a.date+String(a.id)))
    .slice(0,8);

  $('logTable').innerHTML=recent.length?recent.map(l=>`
    <tr>
      <td>${escapeHTML(l.date)}</td>
      <td><span class="tag">${escapeHTML(l.subject)}</span></td>
      <td>${escapeHTML(l.title||'자율 학습')}</td>
      <td>${Number(l.minutes)||0}분</td>
      <td><button class="mini" data-delete-log="${escapeHTML(l.id)}">삭제</button></td>
    </tr>
  `).join(''):`
    <tr>
      <td colspan="5" class="empty-state">
        아직 학습 기록이 없어요. 타이머를 시작하거나 직접 기록해 보세요.
      </td>
    </tr>
  `;

  renderCalendar();
  renderSchedule();
  renderTodo();
  renderGrades();
}

/* 학습 캘린더 날짜 선택 및 일정 등록 */
/* 일반 모달 */
function openModal(title,fields,action){
  $('modalTitle').textContent=title;
  $('modalBody').innerHTML=fields;
  modalAction=action;
  $('modalBack').style.display='grid';
}

function closeModal(){
  $('modalBack').style.display='none';
  modalAction=null;
}

$('cancelModal').onclick=closeModal;
$('saveModal').onclick=()=>{
  if(modalAction)modalAction();
};

/* 홈 화면 목표 등록 및 수정 */
$('homeGoalButton')?.addEventListener('click',()=>{
  const current=String(data.homeGoal||'');
  openModal('나의 목표 설정',`
    <label class="muted" for="homeGoalInput">홈 화면에 표시할 목표</label>
    <input class="field" id="homeGoalInput" type="text" maxlength="100" placeholder="예: 서울대 의예과, 수학 1등급, 순공 10시간 등" value="${escapeHTML(current)}">
    <p class="muted" style="font-size:11px;margin:9px 0 0">목표는 D-day 왼쪽에 표시되며, 언제든 수정할 수 있습니다.</p>
    ${current.trim()?'<button class="mini" type="button" id="homeGoalClearBtn" style="margin-top:12px">목표 지우기</button>':''}
  `,()=>{
    data.homeGoal=String($('homeGoalInput')?.value||'').trim();
    closeModal();save();toast(data.homeGoal?'목표를 저장했어요.':'목표를 지웠어요.');
  });
  const clear=$('homeGoalClearBtn');
  if(clear)clear.addEventListener('click',()=>{
    data.homeGoal='';closeModal();save();toast('목표를 지웠어요.');
  });
});

/* 홈 화면 D-day 등록 및 수정 */
$('ddayButton')?.addEventListener('click',()=>{
  const current=data.dday&&typeof data.dday==='object'?data.dday:{};
  const today=todayISO();
  openModal('D-day 설정',`
    <label class="muted" for="ddayNameInput">D-day 이름</label>
    <input class="field" id="ddayNameInput" type="text" maxlength="40" placeholder="예: 수능, 기말고사" value="${escapeHTML(String(current.name||''))}" required>
    <div style="margin-top:12px"><label class="muted" for="ddayDateInput">목표 날짜</label>
    <input class="field" id="ddayDateInput" type="date" value="${/^\d{4}-\d{2}-\d{2}$/.test(current.date||'')?current.date:today}" required></div>
    <p class="muted" style="font-size:11px;margin:9px 0 0">날짜를 저장하면 홈 화면에 남은 날짜가 표시됩니다.</p>
    ${current.name?'<button class="mini" type="button" id="ddayClearBtn" style="margin-top:12px">D-day 삭제</button>':''}
  `,()=>{
    const name=$('ddayNameInput')?.value.trim();
    const date=$('ddayDateInput')?.value;
    if(!name||!/^\d{4}-\d{2}-\d{2}$/.test(date||'')){toast('이름과 날짜를 입력해 주세요.');return;}
    data.dday={name,date};
    closeModal();save();toast('D-day를 저장했어요.');
  });
  const clear=$('ddayClearBtn');
  if(clear)clear.addEventListener('click',()=>{delete data.dday;closeModal();save();toast('D-day를 삭제했어요.');});
});

/* 이번 주 학습 목표 수정 */
$('editWeeklyGoal').addEventListener('click',()=>{
  openModal('이번 주 목표 시간 수정',`
    <label class="muted" for="weeklyGoalInput">일주일 목표 공부 시간</label>
    <div class="form-row" style="align-items:center">
      <input class="field" id="weeklyGoalInput" type="number" min="1" max="168" step="0.5" value="${Number(data.goal)||40}" inputmode="decimal" required>
      <span class="muted" style="white-space:nowrap">시간 / 주</span>
    </div>
    <div class="muted" style="font-size:11px">1~168시간 범위에서 0.5시간 단위로 설정할 수 있어요.</div>
  `,()=>{
    const input=$('weeklyGoalInput');
    const goal=Number(input.value);
    if(!Number.isFinite(goal)||goal<1||goal>168){
      toast('목표는 1~168시간 사이로 입력해 주세요.');
      input.focus();
      return;
    }
    data.goal=goal;
    closeModal();
    save();
    render();
    toast('이번 주 목표 시간을 변경했어요.');
  });
  setTimeout(()=>{$('weeklyGoalInput')?.focus();$('weeklyGoalInput')?.select();},0);
});

/* 인강 추가 */
$('addTaskBtn').textContent='＋ 인강 추가';
$('addTaskBtn').onclick=()=>openModal('인강 추가',`
  <label class="muted">과목</label>
  <select class="field" id="fSubject">
    ${SUBJECTS.map(subject=>`<option>${subject}</option>`).join('')}
  </select>

  <label class="muted" style="display:block;margin-top:12px">강의 제목</label>
  <input class="field" id="fTitle" placeholder="예: 미적분 개념 완성">

  <label class="muted" style="display:block;margin-top:12px">전체 강의 수</label>
  <input class="field" id="fTotal" type="number" min="1" max="1000" step="1" placeholder="예: 30">
  <p class="muted" style="font-size:10px;margin:7px 0 0">전체 강의 수를 입력하면 수강할 때마다 진도율이 자동으로 올라갑니다.</p>
`,()=>{
  const title=$('fTitle').value.trim();
  const total=Math.floor(Number($('fTotal').value));

  if(!title)return toast('강의 제목을 입력해 주세요.');
  if(!Number.isInteger(total)||total<1||total>1000){
    return toast('전체 강의 수를 1~1000 사이로 입력해 주세요.');
  }

  data.courses.push({
    id:uid(),
    subject:$('fSubject').value,
    title,
    total,
    completed:0
  });

  closeModal();
  save();
  toast('인강을 등록했어요.');
});

/* 학습 시간 직접 기록 */
$('manualLogBtn').onclick=()=>openModal('학습 시간 직접 기록',`
  <label class="muted">날짜</label>
  <input class="field" id="fDate" type="date" value="${todayISO()}">

  <label class="muted">과목</label>
  <select class="field" id="fSubject">
    ${SUBJECTS.map(s=>`<option>${s}</option>`).join('')}
  </select>

  <label class="muted">학습 내용</label>
  <input class="field" id="fTitle" placeholder="예: 수학 문제 풀이">

  <label class="muted">공부 시간 (분)</label>
  <input class="field" id="fMinutes" type="number" min="1" max="1440" placeholder="예: 50">
  <div class="form-row">
    <div style="flex:1"><label class="muted">시작 시간 (선택)</label><input class="field" id="fStartTime" type="time"></div>
    <div style="flex:1"><label class="muted">종료 시간 (선택)</label><input class="field" id="fEndTime" type="time"></div>
  </div>
  <div class="muted" style="font-size:11px">시간대를 입력하면 해당 시간표의 인강·자습 일정 완료율에 반영돼요.</div>
`,()=>{
  const m=Number($('fMinutes').value);

  if(!Number.isFinite(m)||m<1||m>1440){
    return toast('1~1440분 사이로 입력해 주세요.');
  }

  if(!$('fDate').value){
    return toast('날짜를 선택해 주세요.');
  }

  const logStart=$('fStartTime').value;
  const logEnd=$('fEndTime').value;
  if((logStart&&!logEnd)||(!logStart&&logEnd))return toast('시작 시간과 종료 시간을 모두 입력해 주세요.');
  if(logStart&&timeToMinutes(logEnd)<=timeToMinutes(logStart))return toast('종료 시간은 시작 시간보다 늦어야 해요.');
  const newLogId=uid();
  data.logs.push({
    id:newLogId,
    date:$('fDate').value,
    subject:$('fSubject').value,
    title:$('fTitle').value.trim(),
    minutes:m,
    metaPending:true,
    ...(logStart&&logEnd?{startMinute:timeToMinutes(logStart),endMinute:timeToMinutes(logEnd)}:{})
  });

  closeModal();
  save();
  showMetaReflection(newLogId);
});

/* 학습 항목 및 기록 삭제 */
document.addEventListener('click',function handleCourseAndLogDocumentClick(e){
  const plusId=e.target.dataset.coursePlus;
  const minusId=e.target.dataset.courseMinus;
  const deleteCourseId=e.target.dataset.courseDelete;

  if(plusId){
    const course=data.courses.find(c=>c.id===plusId);
    if(course&&course.completed<course.total){
      course.completed++;
      const justFinished=course.completed===course.total;
      save();
      if(justFinished){
        $('celebrateTitle').textContent='완강을 축하합니다!';
        $('celebrateMessage').textContent=`${course.title} · ${course.total}강을 모두 수강했어요!`;
        $('celebrateBack').style.display='grid';
      }else{
        toast(`${course.title} ${course.completed}강 수강 완료!`);
      }
    }
  }

  if(minusId){
    const course=data.courses.find(c=>c.id===minusId);
    if(course&&course.completed>0){
      course.completed--;
      save();
      toast('수강 진도를 1강 되돌렸어요.');
    }
  }

  if(deleteCourseId){
    const course=data.courses.find(c=>c.id===deleteCourseId);
    if(course&&confirm(`"${course.title}" 인강을 삭제할까요?`)){
      data.courses=data.courses.filter(c=>c.id!==deleteCourseId);
      save();
      toast('인강을 삭제했어요.');
    }
  }

  if(e.target.dataset.deleteTask){
    data.tasks=data.tasks.filter(t=>t.id!==e.target.dataset.deleteTask);
    save();
  }

  if(e.target.dataset.deleteLog){
    data.logs=data.logs.filter(l=>String(l.id)!==e.target.dataset.deleteLog);
    save();
  }
});

$('closeCelebrate').onclick=()=>{$('celebrateBack').style.display='none';};
$('celebrateBack').addEventListener('click',e=>{
  if(e.target===$('celebrateBack'))$('celebrateBack').style.display='none';
});

/* 타이머 */
function renderTimerSubjects(selected){
  const select=$('timerSubject'); if(!select)return;
  const subjects=Array.isArray(data.timerSubjects)&&data.timerSubjects.length?data.timerSubjects:['국어','수학','영어','사회','과학'];
  select.innerHTML=subjects.map(v=>`<option value="${escapeHTML(v)}">${escapeHTML(v)}</option>`).join('');
  select.value=subjects.includes(selected)?selected:(subjects.includes(select.value)?select.value:subjects[0]);
}
function editTimerSubject(index=null){
  const current=index===null?'':data.timerSubjects[index];
  openModal(index===null?'타이머 과목 추가':'타이머 과목 수정',`<label class="muted">과목 이름</label><input class="field" id="timerSubjectName" maxlength="20" value="${escapeHTML(current)}" placeholder="예: 한국사, 물리학">`,()=>{
    const name=$('timerSubjectName').value.trim(); if(!name)return toast('과목 이름을 입력해 주세요.');
    if(data.timerSubjects.some((v,i)=>v.toLowerCase()===name.toLowerCase()&&i!==index))return toast('이미 등록된 과목이에요.');
    if(index===null)data.timerSubjects.push(name); else {const old=data.timerSubjects[index];data.timerSubjects[index]=name;if(timer.subject===old)timer.subject=name;}
    save();openTimerSubjectManager();
  });
}
function openTimerSubjectManager(){
  const show=()=>{
    const rows=data.timerSubjects.map((v,i)=>`<div class="todo-category-manage-row"><span>${escapeHTML(v)}</span><div class="todo-inline-actions"><button class="mini" type="button" data-ts-edit="${i}">수정</button><button class="mini" type="button" data-ts-delete="${i}">삭제</button></div></div>`).join('');
    openModal('타이머 과목 관리',`<div>${rows||'<div class="todo-empty">등록된 과목이 없습니다.</div>'}</div><button class="btn primary" type="button" id="addTimerSubject" style="width:100%;margin-top:14px">＋ 과목 추가</button>`,()=>{closeModal();renderTimerSubjects(timer.subject);});
    $('addTimerSubject').onclick=()=>editTimerSubject();
    document.querySelectorAll('[data-ts-edit]').forEach(b=>b.onclick=()=>editTimerSubject(Number(b.dataset.tsEdit)));
    document.querySelectorAll('[data-ts-delete]').forEach(b=>b.onclick=()=>{const i=Number(b.dataset.tsDelete),v=data.timerSubjects[i];if(data.timerSubjects.length<=1)return toast('과목은 최소 1개 이상 필요해요.');if(timer.running&&timer.subject===v)return toast('타이머를 멈춘 뒤 삭제해 주세요.');if(!confirm(`'${v}' 과목을 삭제할까요? 기존 학습 기록은 유지됩니다.`))return;data.timerSubjects.splice(i,1);if(timer.subject===v)timer.subject=data.timerSubjects[0];save();show();renderTimerSubjects(timer.subject);});
  }; show();
}
let timer={
  running:false,
  started:0,
  elapsed:0,
  subject:'국어',
  interval:null,
  sessions:[]
};

const ACTIVE_TIMER_STORAGE_KEY='studyflow_active_timer_v1';
function persistActiveTimer(){
  try{
    localStorage.setItem(ACTIVE_TIMER_STORAGE_KEY,JSON.stringify({
      running:timer.running,started:timer.started,elapsed:timer.elapsed,
      subject:timer.subject,sessions:timer.sessions
    }));
  }catch(e){}
}
function clearPersistedActiveTimer(){
  try{localStorage.removeItem(ACTIVE_TIMER_STORAGE_KEY);}catch(e){}
}
function restoreActiveTimer(){
  try{
    const saved=JSON.parse(localStorage.getItem(ACTIVE_TIMER_STORAGE_KEY)||'null');
    if(!saved||typeof saved!=='object')return;
    timer.elapsed=Math.max(0,Number(saved.elapsed)||0);
    timer.started=Math.max(0,Number(saved.started)||0);
    timer.subject=String(saved.subject||timer.subject);
    timer.sessions=Array.isArray(saved.sessions)?saved.sessions.filter(s=>s&&Number(s.start)&&Number(s.end)): [];
    timer.running=!!saved.running&&timer.started>0;
    if(timer.running)timer.interval=setInterval(updateTimer,500);
  }catch(e){
    clearPersistedActiveTimer();
  }
}

function updateTimer(){
  const s=timer.elapsed+
    (timer.running?Math.max(0,Math.floor((Date.now()-timer.started)/1000)):0);
  $('timerDisplay').textContent=secToText(s);
}

function timerButtons(){
  $('timerStart').disabled=timer.running;
  $('timerPause').disabled=!timer.running;
  $('timerFinish').disabled=timer.elapsed===0&&!timer.running;

  $('timerStatus').textContent=
    timer.running?'측정 중':timer.elapsed?'일시정지':'대기 중';
}

$('timerStart').onclick=()=>{
  if(timer.running)return;

  timer.subject=$('timerSubject').value;
  timer.started=Date.now();
  timer.running=true;
  timer.interval=setInterval(updateTimer,500);
  persistActiveTimer();

  timerButtons();
};

$('timerPause').onclick=()=>{
  const segmentEnd=Date.now();
  timer.elapsed+=Math.floor((segmentEnd-timer.started)/1000);
  timer.sessions.push({start:timer.started,end:segmentEnd});
  timer.running=false;

  clearInterval(timer.interval);
  timer.interval=null;
  persistActiveTimer();
  updateTimer();
  timerButtons();
};

$('timerFinish').onclick=()=>{
  if(timer.running){
    const segmentEnd=Date.now();
    timer.elapsed+=Math.floor((segmentEnd-timer.started)/1000);
    timer.sessions.push({start:timer.started,end:segmentEnd});
    timer.running=false;
    clearInterval(timer.interval);
    timer.interval=null;
  }

  const m=Math.floor(timer.elapsed/60);

  let completedLogId=null;
  if(m>0){
    completedLogId=uid();
    data.logs.push({
      id:completedLogId,
      date:todayISO(),
      subject:timer.subject,
      title:'타이머 학습',
      minutes:m,
      metaPending:true,
      sessions:timer.sessions.map(seg=>{
        const startDate=new Date(seg.start),endDate=new Date(seg.end);
        return {date:todayISO(),startMinute:startDate.getHours()*60+startDate.getMinutes(),endMinute:endDate.getHours()*60+endDate.getMinutes()+(endDate.getSeconds()>0?1:0)};
      }).filter(seg=>seg.endMinute>seg.startMinute)
    });

    save();
    toast(`${m}분 학습 기록을 저장했어요.`);
  }else{
    toast('1분 미만의 기록은 저장하지 않았어요.');
  }

  timer.elapsed=0;
  timer.sessions=[];
  clearPersistedActiveTimer();
  updateTimer();
  timerButtons();
  if(completedLogId)showMetaReflection(completedLogId);
};

$('manageTimerSubjects').onclick=openTimerSubjectManager;
renderTimerSubjects(timer.subject);

$('timerSubject').onchange=e=>{
  if(timer.running){
    toast('과목 변경은 타이머를 멈춘 뒤 해주세요.');
    e.target.value=timer.subject;
  }
};

/* 키보드 복사·붙여넣기 */
document.addEventListener('keydown',e=>{
  const tag=document.activeElement?.tagName;

  if(tag==='INPUT'||tag==='TEXTAREA'||tag==='SELECT')return;

  if((e.ctrlKey||e.metaKey)&&e.key.toLowerCase()==='c'){
    const block=data.scheduleBlocks.find(b=>b.id===selectedBlockId);

    if(block){
      e.preventDefault();
      copyScheduleBlock(block);
    }
  }

  if((e.ctrlKey||e.metaKey)&&e.key.toLowerCase()==='v'){
    if(clipboardBlock){
      e.preventDefault();
      pasteScheduleBlock();
    }
  }

  if(e.key==='Escape'){
    if($('metaReflectionBack').style.display==='grid')closeMetaReflection();
    closeModal();
    closeScheduleModal();
  }
});

/* 초기 실행 */
render();
timerButtons();
