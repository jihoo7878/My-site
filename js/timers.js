// 뽀모도로: 화면/탭이 백그라운드에서 제한되어도 실제 시각 기준으로 복구
const POMO_STORAGE_KEY='studyflow_active_pomodoro_v1';
const pomodoro={mode:'focus',focusMinutes:25,breakMinutes:5,total:1500,remaining:1500,running:false,startedAt:0,remainingAtStart:1500,subject:'국어',interval:null};
const POMO_CIRCUMFERENCE=2*Math.PI*82;

function persistPomodoroState(){
  try{
    localStorage.setItem(POMO_STORAGE_KEY,JSON.stringify({
      mode:pomodoro.mode,focusMinutes:pomodoro.focusMinutes,breakMinutes:pomodoro.breakMinutes,subject:pomodoro.subject,
      total:pomodoro.total,remaining:pomodoro.remaining,running:pomodoro.running,
      startedAt:pomodoro.startedAt,remainingAtStart:pomodoro.remainingAtStart
    }));
  }catch(e){}
}
function clearPersistedPomodoro(){
  try{localStorage.removeItem(POMO_STORAGE_KEY);}catch(e){}
}
function renderPomodoro(){
  const remaining=Math.max(0,Math.ceil(pomodoro.remaining)),mins=Math.floor(remaining/60),secs=remaining%60;
  $('pomodoroTime').textContent=`${String(mins).padStart(2,'0')}:${String(secs).padStart(2,'0')}`;
  $('pomodoroHint').textContent=pomodoro.mode==='focus'?'집중할 시간':'잠깐 쉬어가세요';
  $('pomodoroModeTag').textContent=pomodoro.mode==='focus'?'집중':'휴식';
  $('pomodoroStatus').textContent=pomodoro.running?(pomodoro.mode==='focus'?'집중 중…':'휴식 중…'):(`${pomodoro.focusMinutes}분 집중 · ${pomodoro.breakMinutes}분 휴식`);
  $('pomodoroStart').textContent=pomodoro.running?'일시정지':'시작';
  $('pomodoroFocusMode').classList.toggle('active',pomodoro.mode==='focus');
  $('pomodoroBreakMode').classList.toggle('active',pomodoro.mode==='break');
  const progress=1-Math.max(0,remaining)/pomodoro.total;
  $('pomodoroProgress').style.strokeDasharray=String(POMO_CIRCUMFERENCE);
  $('pomodoroProgress').style.strokeDashoffset=String(POMO_CIRCUMFERENCE*progress);
  $('pomodoroCircle').setAttribute('aria-label',`남은 시간 ${mins}분 ${secs}초`);
}
function setPomodoroMode(mode){
  if(pomodoro.interval)clearInterval(pomodoro.interval);
  pomodoro.interval=null;pomodoro.running=false;
  pomodoro.mode=mode;
  pomodoro.total=(mode==='focus'?pomodoro.focusMinutes:pomodoro.breakMinutes)*60;
  pomodoro.remaining=pomodoro.total;
  pomodoro.startedAt=0;pomodoro.remainingAtStart=pomodoro.total;
  persistPomodoroState();renderPomodoro();
}
function savePomodoroFocusLog(startMs,endMs,showReflection=true,showNotice=true){
  const minutes=Math.max(1,Math.round((endMs-startMs)/60000));
  const startDate=new Date(startMs),endDate=new Date(endMs);
  const startMinute=startDate.getHours()*60+startDate.getMinutes();
  const endMinute=endDate.getHours()*60+endDate.getMinutes()+(endDate.getSeconds()>0?1:0);
  const logId=uid();
  data.logs.push({id:logId,date:todayISO(),subject:pomodoro.subject||$('pomodoroSubject')?.value||$('timerSubject').value||'국어',title:'뽀모도로 집중 학습',minutes,metaPending:true,sessions:[{date:todayISO(),startMinute,endMinute}]});
  save();
  if(showNotice)toast(`${minutes}분 집중 학습을 기록했어요.`);
  if(showReflection)showMetaReflection(logId);
  return logId;
}
function updatePomodoroFromClock(showCompletion=true){
  if(!pomodoro.running)return;
  const now=Date.now();
  const elapsed=Math.max(0,Math.floor((now-pomodoro.startedAt)/1000));
  const remaining=Math.max(0,pomodoro.remainingAtStart-elapsed);
  if(remaining>0){
    pomodoro.remaining=remaining;
    renderPomodoro();
    return;
  }

  // 종료 시각은 화면이 다시 켜진 시각이 아니라 원래 카운트다운의 실제 종료 시각
  const phaseStart=pomodoro.startedAt;
  const phaseEnd=phaseStart+pomodoro.remainingAtStart*1000;
  const completedMode=pomodoro.mode;
  pomodoro.running=false;
  if(pomodoro.interval)clearInterval(pomodoro.interval);
  pomodoro.interval=null;
  pomodoro.remaining=0;

  if(completedMode==='focus'){
    savePomodoroFocusLog(phaseStart,phaseEnd,showCompletion,showCompletion);
    pomodoro.mode='break';
    pomodoro.total=pomodoro.breakMinutes*60;
  }else{
    pomodoro.mode='focus';
    pomodoro.total=pomodoro.focusMinutes*60;
  }
  // 기존 동작을 유지: 한 구간이 끝나면 다음 집중/휴식 구간은 준비 상태로 전환
  pomodoro.remaining=pomodoro.total;
  pomodoro.startedAt=0;
  pomodoro.remainingAtStart=pomodoro.total;
  persistPomodoroState();
  renderPomodoro();
  if(showCompletion)toast(completedMode==='focus'?'집중 시간이 끝났어요. 이제 휴식 시간이에요.':'휴식 시간이 끝났어요. 다시 집중해 볼까요?');
}
function restorePomodoroState(){
  try{
    const saved=JSON.parse(localStorage.getItem(POMO_STORAGE_KEY)||'null');
    if(!saved||typeof saved!=='object')return;
    if(saved.mode==='focus'||saved.mode==='break')pomodoro.mode=saved.mode;
    if(saved.subject)pomodoro.subject=String(saved.subject);
    pomodoro.focusMinutes=Math.min(180,Math.max(1,Number(saved.focusMinutes)||25));
    pomodoro.breakMinutes=Math.min(60,Math.max(1,Number(saved.breakMinutes)||5));
    pomodoro.total=(pomodoro.mode==='focus'?pomodoro.focusMinutes:pomodoro.breakMinutes)*60;
    pomodoro.remaining=Math.max(0,Number(saved.remaining)||pomodoro.total);
    pomodoro.startedAt=Math.max(0,Number(saved.startedAt)||0);
    pomodoro.remainingAtStart=Math.max(0,Number(saved.remainingAtStart)||pomodoro.remaining);
    pomodoro.running=!!saved.running&&pomodoro.startedAt>0;
    if(pomodoro.running){
      // 즉시 실제 시간 기준으로 상태를 복원한 뒤, 표시용 interval만 재시작
      updatePomodoroFromClock(false);
      if(pomodoro.running)pomodoro.interval=setInterval(()=>updatePomodoroFromClock(true),500);
    }
  }catch(e){
    clearPersistedPomodoro();
  }
}

/* 뽀모도로 과목 선택: 일반 타이머의 과목 목록을 공유 */
/* 뽀모도로의 과목 관리 버튼은 기존 과목 관리 창을 재사용 */
$('managePomodoroSubjects')?.addEventListener('click',()=>{
  const existing=$('manageTimerSubjects');
  if(existing)existing.click();
  else toast('일반 타이머의 과목 관리 버튼을 찾을 수 없어요.');
});

function syncPomodoroSubjects(){
  const source=$('timerSubject'),target=$('pomodoroSubject');
  if(!source||!target)return;
  const preferred=target.value||pomodoro.subject||source.value||'국어';
  target.innerHTML=source.innerHTML;
  target.value=[...source.options].some(option=>option.value===preferred)?preferred:source.value;
  pomodoro.subject=target.value||source.value||'국어';
}
syncPomodoroSubjects();
if($('timerSubject')){
  const subjectObserver=new MutationObserver(syncPomodoroSubjects);
  subjectObserver.observe($('timerSubject'),{childList:true});
  $('timerSubject').addEventListener('change',()=>{
    const focusLocked=pomodoro.running&&pomodoro.mode==='focus';
    if($('pomodoroSubject'))$('pomodoroSubject').value=focusLocked?pomodoro.subject:$('timerSubject').value;
    if(!focusLocked)pomodoro.subject=$('timerSubject').value;
  });
}
$('pomodoroSubject')?.addEventListener('change',e=>{
  if(pomodoro.running&&pomodoro.mode==='focus'){
    toast('집중 세션 중에는 과목을 변경할 수 없어요.');
    e.target.value=pomodoro.subject;
    return;
  }
  pomodoro.subject=e.target.value;
  if($('timerSubject'))$('timerSubject').value=e.target.value;
  persistPomodoroState();
});

$('pomodoroStart').onclick=()=>{
  if(pomodoro.running){
    updatePomodoroFromClock(false);
    if(!pomodoro.running)return;
    pomodoro.remaining=Math.max(0,pomodoro.remainingAtStart-Math.floor((Date.now()-pomodoro.startedAt)/1000));
    pomodoro.running=false;
    clearInterval(pomodoro.interval);pomodoro.interval=null;
    pomodoro.startedAt=0;pomodoro.remainingAtStart=pomodoro.remaining;
    persistPomodoroState();renderPomodoro();return;
  }
  if(pomodoro.remaining<=0)pomodoro.remaining=pomodoro.total;
  if(pomodoro.mode==='focus')pomodoro.subject=$('pomodoroSubject')?.value||$('timerSubject').value||'국어';
  pomodoro.startedAt=Date.now();
  pomodoro.remainingAtStart=pomodoro.remaining;
  pomodoro.running=true;
  persistPomodoroState();
  pomodoro.interval=setInterval(()=>updatePomodoroFromClock(true),500);
  renderPomodoro();
};
$('pomodoroReset').onclick=()=>{
  if(pomodoro.interval)clearInterval(pomodoro.interval);
  pomodoro.interval=null;pomodoro.running=false;
  pomodoro.remaining=pomodoro.total;pomodoro.startedAt=0;pomodoro.remainingAtStart=pomodoro.total;
  persistPomodoroState();renderPomodoro();
};
$('pomodoroFocusMode').onclick=()=>setPomodoroMode('focus');
$('pomodoroBreakMode').onclick=()=>setPomodoroMode('break');

let timerDisplayMode='normal';
function applyTimerDisplayMode(mode){
  timerDisplayMode=mode==='pomodoro'?'pomodoro':'normal';
  const normalPanel=$('originalTimerPanel');
  const pomodoroPanelEl=$('pomodoroPanel');
  // hidden 속성 외에 inline !important display도 직접 제어해 모바일 CSS 간섭을 차단
  normalPanel.hidden=timerDisplayMode!=='normal';
  pomodoroPanelEl.hidden=timerDisplayMode!=='pomodoro';
  normalPanel.style.setProperty('display',timerDisplayMode==='normal'?'block':'none','important');
  pomodoroPanelEl.style.setProperty('display',timerDisplayMode==='pomodoro'?'block':'none','important');
  $('timerModeCaption').textContent=timerDisplayMode==='normal'?'일반 학습 타이머':'원형 뽀모도로 타이머';
  $('timerModeToggle').textContent=timerDisplayMode==='normal'?'뽀모도로':'일반타이머';
}
$('timerModeToggle').onclick=()=>{
  applyTimerDisplayMode(timerDisplayMode==='normal'?'pomodoro':'normal');
};
// 최초 로딩 시에도 현재 모드를 명시적으로 하나만 표시
applyTimerDisplayMode('normal');

$('pomodoroApplySettings').onclick=()=>{
  const focus=Number($('pomodoroFocusMinutes').value);
  const rest=Number($('pomodoroBreakMinutes').value);
  if(!Number.isInteger(focus)||focus<1||focus>180){
    toast('집중 시간은 1~180분으로 설정해 주세요.');return;
  }
  if(!Number.isInteger(rest)||rest<1||rest>60){
    toast('휴식 시간은 1~60분으로 설정해 주세요.');return;
  }
  pomodoro.focusMinutes=focus;
  pomodoro.breakMinutes=rest;
  setPomodoroMode(pomodoro.mode);
  toast('뽀모도로 시간을 적용했어요.');
};
// 목표/D-day 버튼은 하나의 DOM 노드만 사용해 모바일 카드와 데스크톱 헤더 사이에서 이동
function placeHomeGoalDday(){
  const mobile=window.matchMedia('(max-width:600px)').matches;
  const goal=document.getElementById('homeGoalButton');
  const dday=document.getElementById('ddayButton');
  const mobileGoal=document.getElementById('mobileGoalSlot');
  const mobileDday=document.getElementById('mobileDdaySlot');
  const desktopActions=document.querySelector('#pageIntro .intro-actions');
  if(!goal||!dday||!mobileGoal||!mobileDday||!desktopActions)return;
  if(mobile){
    if(goal.parentElement!==mobileGoal)mobileGoal.appendChild(goal);
    if(dday.parentElement!==mobileDday)mobileDday.appendChild(dday);
  }else{
    if(goal.parentElement!==desktopActions)desktopActions.insertBefore(goal,dday);
    if(dday.parentElement!==desktopActions)desktopActions.appendChild(dday);
  }
}
placeHomeGoalDday();
window.addEventListener('resize',placeHomeGoalDday);

restoreActiveTimer();
restorePomodoroState();
updateTimer();
timerButtons();
renderPomodoro();

// iPad Safari/브라우저가 백그라운드 타이머 실행을 늦춰도, 복귀 순간 실제 시각으로 다시 계산
function refreshTimersAfterResume(){
  updateTimer();
  timerButtons();
  updatePomodoroFromClock(true);
}
document.addEventListener('visibilitychange',()=>{
  if(document.visibilityState==='visible')refreshTimersAfterResume();
});
window.addEventListener('pageshow',refreshTimersAfterResume);
window.addEventListener('focus',refreshTimersAfterResume);
