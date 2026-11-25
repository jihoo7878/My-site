let calendarMonth=new Date(new Date().getFullYear(),new Date().getMonth(),1);
let selectedCalendarDate=todayISO();

// 대한민국 공휴일: 한국천문연구원 월력요항·달력자료 기준 (2026~2027)
const KR_HOLIDAYS={
"2026-01-01":"신정","2026-02-16":"설날 연휴","2026-02-17":"설날","2026-02-18":"설날 연휴",
"2026-03-01":"삼일절","2026-03-02":"삼일절 대체공휴일","2026-05-05":"어린이날",
"2026-05-24":"부처님오신날","2026-05-25":"부처님오신날 대체공휴일","2026-06-06":"현충일",
"2026-08-15":"광복절","2026-08-17":"광복절 대체공휴일","2026-09-24":"추석 연휴",
"2026-09-25":"추석","2026-09-26":"추석 연휴","2026-10-03":"개천절",
"2026-10-05":"개천절 대체공휴일","2026-10-09":"한글날","2026-12-25":"성탄절",
"2027-01-01":"신정","2027-02-06":"설날 연휴","2027-02-07":"설날","2027-02-08":"설날 연휴",
"2027-02-09":"설날 대체공휴일","2027-03-01":"삼일절","2027-05-01":"노동절",
"2027-05-03":"노동절 대체공휴일","2027-05-05":"어린이날","2027-05-13":"부처님오신날",
"2027-06-06":"현충일","2027-07-17":"제헌절","2027-07-19":"제헌절 대체공휴일",
"2027-08-15":"광복절","2027-08-16":"광복절 대체공휴일","2027-09-14":"추석 연휴",
"2027-09-15":"추석","2027-09-16":"추석 연휴","2027-10-03":"개천절",
"2027-10-04":"개천절 대체공휴일","2027-10-09":"한글날","2027-10-11":"한글날 대체공휴일",
"2027-12-25":"성탄절","2027-12-27":"성탄절 대체공휴일"
};

function renderCalendar(){
  const year=calendarMonth.getFullYear();
  const month=calendarMonth.getMonth();
  $('calendarMonth').textContent=`${year}년 ${month+1}월`;
  const first=new Date(year,month,1);
  const start=new Date(year,month,1-first.getDay());
  const cells=[];
  for(let i=0;i<42;i++){
    const d=new Date(start);d.setDate(start.getDate()+i);
    const iso=`${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;
    const minutes=sumLogs(iso,iso);
    const dayEvents=data.calendarEvents.filter(ev=>ev.date===iso).sort((a,b)=>(a.start||'').localeCompare(b.start||''));
    const holiday=KR_HOLIDAYS[iso]||'';
    const classes=['calendar-day',d.getMonth()!==month?'muted-day':'',iso===todayISO()?'today':'',iso===selectedCalendarDate?'selected':'',holiday?'holiday-day':''].filter(Boolean).join(' ');
    const timeLabel=minutes?`${Math.floor(minutes/60)?Math.floor(minutes/60)+'h ':''}${minutes%60?minutes%60+'m':''}`:'&nbsp;';
    const holidayLabel=holiday?`<span class="calendar-holiday-chip" title="${escapeHTML(holiday)}">${escapeHTML(holiday)}</span>`:'';
    const eventLabels=dayEvents.slice(0,2).map(ev=>`<span class="calendar-event-chip" title="${escapeHTML(ev.title)}">${escapeHTML(ev.title)}</span>`).join('');
    const moreLabel=dayEvents.length>2?`<span class="calendar-event-more">+${dayEvents.length-2}개</span>`:'';
    const eventAria=dayEvents.length?`, 일정 ${dayEvents.map(ev=>ev.title).join(', ')}`:'';
    const holidayAria=holiday?`, 공휴일 ${holiday}`:'';
    cells.push(`<button type="button" class="${classes}" data-calendar-date="${iso}" aria-label="${iso}, 공부 ${minutes}분${escapeHTML(holidayAria+eventAria)}"><span class="day-num">${d.getDate()}</span>${holidayLabel}<span class="study-minutes">${timeLabel}</span>${eventLabels}${moreLabel}</button>`);
  }
  $('miniCalendar').innerHTML=cells.join('');
  const selected=new Date(selectedCalendarDate+'T12:00:00');
  const label=`${selected.getMonth()+1}월 ${selected.getDate()}일 (${DAY_NAMES[selected.getDay()]})`;
  const events=data.calendarEvents.filter(ev=>ev.date===selectedCalendarDate).sort((a,b)=>(a.start||'').localeCompare(b.start||''));
  const selectedHoliday=KR_HOLIDAYS[selectedCalendarDate]||'';
  $('calendarDetail').innerHTML=`<div class="calendar-detail-head"><strong>${label} ${selectedHoliday?`<span class="calendar-holiday-name">· ${escapeHTML(selectedHoliday)}</span>`:''} 일정</strong><button class="mini" id="addCalendarEvent">＋ 일정 등록</button></div>`+
    (events.length?`<div class="calendar-event-list">${events.map(ev=>`<div class="calendar-event"><span class="calendar-event-time">${escapeHTML(ev.start||'')} ${ev.end?'– '+escapeHTML(ev.end):''}</span><span class="calendar-event-title">${escapeHTML(ev.title)}</span><button class="calendar-event-delete" data-calendar-delete="${escapeHTML(ev.id)}" aria-label="일정 삭제">×</button></div>`).join('')}</div>`:'<div class="calendar-empty">등록된 일정이 없어요. 날짜를 선택하고 일정을 추가해 보세요.</div>');
}


/* 학교 시간표: NEIS Open API. 개인 주간 플래너와 완전히 분리된 데이터 */

document.addEventListener('click',function handleCalendarDocumentClick(e){
  const dateButton=e.target.closest('[data-calendar-date]');
  if(dateButton){
    selectedCalendarDate=dateButton.dataset.calendarDate;
    const d=new Date(selectedCalendarDate+'T12:00:00');
    calendarMonth=new Date(d.getFullYear(),d.getMonth(),1);
    renderCalendar();
    return;
  }
  if(e.target.closest('#calendarPrev')){calendarMonth=new Date(calendarMonth.getFullYear(),calendarMonth.getMonth()-1,1);renderCalendar();return;}
  if(e.target.closest('#calendarNext')){calendarMonth=new Date(calendarMonth.getFullYear(),calendarMonth.getMonth()+1,1);renderCalendar();return;}
  if(e.target.closest('#addCalendarEvent')){
    openModal('일정 등록',`
      <label class="muted">일정 이름</label>
      <input class="field" id="calendarEventTitle" placeholder="예: 수학 문제 풀이">
      <label class="muted" style="display:block;margin-top:12px">시작 시간</label>
      <input class="field" id="calendarEventStart" type="time" value="16:00">
      <label class="muted" style="display:block;margin-top:12px">종료 시간</label>
      <input class="field" id="calendarEventEnd" type="time" value="17:00">
      <p class="muted" style="font-size:10px;margin:8px 0 0">${selectedCalendarDate} 일정으로 등록됩니다. 공부 시간은 학습 기록에서 자동 합산됩니다.</p>
    `,()=>{
      const title=$('calendarEventTitle').value.trim();
      const start=$('calendarEventStart').value;
      const end=$('calendarEventEnd').value;
      if(!title)return toast('일정 이름을 입력해 주세요.');
      if(start&&end&&end<=start)return toast('종료 시간은 시작 시간보다 늦어야 해요.');
      data.calendarEvents.push({id:uid(),date:selectedCalendarDate,title,start,end});
      closeModal();save();toast('캘린더에 일정을 등록했어요.');
    });
    return;
  }
  const del=e.target.closest('[data-calendar-delete]');
  if(del){
    const id=del.dataset.calendarDelete;
    data.calendarEvents=data.calendarEvents.filter(ev=>String(ev.id)!==id);
    save();toast('일정을 삭제했어요.');
  }
});


