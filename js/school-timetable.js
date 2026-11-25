/* 학교 시간표와 NEIS 조회 UI */
const schoolWeekDays=['월','화','수','목','금'];
const schoolDateISO=d=>`${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;
function schoolWeekDates(){
  const now=new Date();
  const monday=new Date(now.getFullYear(),now.getMonth(),now.getDate());
  monday.setDate(monday.getDate()-((monday.getDay()+6)%7));
  return schoolWeekDays.map((_,i)=>{const d=new Date(monday);d.setDate(monday.getDate()+i);return schoolDateISO(d);});
}
async function schoolApiRows(action,params,rowKey){
  if(typeof window.studyFlowCallSchoolApi!=='function'){
    throw new Error('학교 API 연결이 아직 준비되지 않았습니다. 로그인 상태를 확인하고 다시 시도해 주세요.');
  }
  const body=action==='search'
    ? {action:'search',schoolName:params.SCHUL_NM}
    : {
        action:'timetable',
        officeCode:params.ATPT_OFCDC_SC_CODE,
        schoolCode:params.SD_SCHUL_CODE,
        year:params.AY,
        semester:params.SEM,
        grade:params.GRADE,
        classNum:params.CLASS_NM,
        date:params.ALL_TI_YMD
      };
  const json=await window.studyFlowCallSchoolApi(body);
  if(json?.error)throw new Error(json.error);
  const block=json?.[rowKey];
  if(!Array.isArray(block))throw new Error('NEIS 응답 형식이 예상과 다릅니다.');
  const head=block.find(part=>Array.isArray(part.head))?.head||[];
  const result=head.find(item=>item.RESULT)?.RESULT;
  if(result&&result.CODE!=='INFO-000')throw new Error(`${result.CODE}: ${result.MESSAGE}`);
  const rowPart=block.find(part=>Array.isArray(part.row));
  return rowPart?.row||[];
}
function renderSchoolSummary(){
  const s=data.schoolTimetable||{};
  const configured=!!(s.schoolCode&&s.officeCode&&s.schoolName);
  $('schoolSettingSummary').textContent=configured
    ? `${s.schoolName} · ${s.grade}학년 ${s.className}반 · ${s.year}학년도 ${s.semester}학기`
    : '학교 정보를 등록해 주세요.';
  $('schoolTodayLabel').textContent=configured?`${s.schoolName} · ${s.grade}학년 ${s.className}반`:'학교 미설정';
  if($('schoolNameInput')){
    $('schoolNameInput').value=s.schoolName||'';
    $('schoolGradeInput').value=s.grade||'2';
    $('schoolClassInput').value=s.className||'1';
    $('schoolYearInput').value=s.year||new Date().getFullYear();
    $('schoolSemesterInput').value=s.semester||'1';
  }
}
function schoolCellKey(date,period){return `${date}|${period}`;}
function renderSchoolWeek(){
  const box=$('schoolWeekView');
  const s=data.schoolTimetable||{};
  if(!s.schoolCode){box.innerHTML='<div class="school-preview-empty">학교를 설정하면 주간 시간표가 여기에 표시됩니다.</div>';return;}
  const dates=schoolWeekDates();
  const rows=s.weekRows||[];
  const periods=[...new Set(rows.map(r=>Number(r.PERIO)).filter(Number.isFinite))].sort((a,b)=>a-b);
  if(!periods.length){box.innerHTML='<div class="school-preview-empty">아직 조회된 시간표가 없습니다. 학교·학기 설정을 확인해 주세요.</div>';return;}
  const edits=s.manualEdits||{};
  let table='<div class="school-edit-hint">수업 칸을 누르면 과목과 교실을 직접 수정할 수 있어요. 수정 내용은 자동 저장됩니다.</div><table class="school-week-table"><thead><tr><th>교시</th>'+dates.map((d,i)=>`<th>${schoolWeekDays[i]}</th>`).join('')+'</tr></thead><tbody>';
  periods.forEach(p=>{
    table+=`<tr><th>${p}교시</th>`;
    dates.forEach(date=>{
      const key=schoolCellKey(date,p);
      const original=rows.find(x=>x.ALL_TI_YMD===date&&Number(x.PERIO)===p)||null;
      const edited=Object.prototype.hasOwnProperty.call(edits,key);
      const r=edited?edits[key]:original;
      const subject=r&&!r._empty?(r.ITRT_CNTNT||''): '';
      const room=r&&!r._empty?(r.CLAS_NM||''):'';
      const shown=subject||'—';
      table+=`<td class="school-week-cell ${edited?'is-edited':''}"><button type="button" class="school-cell-edit" data-school-date="${date}" data-school-period="${p}" aria-label="${date} ${p}교시 수정"><strong>${escapeHTML(shown)}</strong>${room?`<span>${escapeHTML(room)}</span>`:''}</button></td>`;
    });
    table+='</tr>';
  });
  box.innerHTML=table+'</tbody></table>';
  const status=$('schoolTimetableStatus');
  if(status&&!s.lastError){
    const editCount=Object.keys(edits).length;
    status.textContent=(s.fetchedWeek?`저장된 시간표 표시 중 · ${s.year}학년도 ${s.semester}학기`:'시간표가 표시되고 있습니다.')+(editCount?` · 직접 수정 ${editCount}건`: '');
  }
}
function editSchoolTimetableCell(date,period){
  const s=data.schoolTimetable;
  const key=schoolCellKey(date,period);
  const edits=s.manualEdits||(s.manualEdits={});
  const original=(s.weekRows||[]).find(x=>x.ALL_TI_YMD===date&&Number(x.PERIO)===Number(period))||null;
  const current=Object.prototype.hasOwnProperty.call(edits,key)?edits[key]:original;
  const currentSubject=current&&!current._empty?(current.ITRT_CNTNT||''):'';
  const currentRoom=current&&!current._empty?(current.CLAS_NM||''):'';
  const subject=prompt(`${date} ${period}교시 과목을 입력하세요.\n비워두면 해당 교시를 비웁니다.`,currentSubject);
  if(subject===null)return;
  if(!subject.trim()){
    edits[key]={_empty:true,ITRT_CNTNT:'',CLAS_NM:''};
  }else{
    const room=prompt('교실 또는 수업 장소를 입력하세요. (선택)',currentRoom);
    if(room===null)return;
    edits[key]={ITRT_CNTNT:subject.trim(),CLAS_NM:room.trim()};
  }
  s.manualEdits=edits;
  save();
  renderSchoolWeek();
  toast('시간표 수정 내용을 저장했어요.');
}
async function searchNeisSchools(){
  const name=$('schoolNameInput').value.trim();
  const resultBox=$('schoolSearchResults');
  if(!name){toast('학교명을 입력해 주세요.');$('schoolNameInput').focus();return;}
  resultBox.innerHTML='<div class="school-status">학교를 검색하고 있어요…</div>';
  try{
    const rows=await schoolApiRows('search',{SCHUL_NM:name},'schoolInfo');
    if(!rows.length){resultBox.innerHTML='<div class="school-status">검색 결과가 없습니다. 학교명을 확인해 주세요.</div>';return;}
    resultBox.innerHTML=rows.map((r,i)=>`<button type="button" class="school-search-result" data-school-index="${i}">${escapeHTML(r.SCHUL_NM||'학교명 없음')}<small>${escapeHTML(r.ORG_RDNMA||r.ORG_RDNDA||'주소 정보 없음')} · ${escapeHTML(r.ATPT_OFCDC_SC_NM||'')}</small></button>`).join('');
    resultBox._schoolRows=rows;
  }catch(err){
    resultBox.innerHTML=`<div class="school-status">${escapeHTML(err.message||'학교 검색에 실패했습니다.')}</div>`;
  }
}
function saveSchoolSettings(){
  const s=data.schoolTimetable;
  s.schoolName=$('schoolNameInput').value.trim();
  s.grade=$('schoolGradeInput').value;
  s.className=$('schoolClassInput').value.trim();
  s.year=Number($('schoolYearInput').value)||new Date().getFullYear();
  s.semester=$('schoolSemesterInput').value;
  if(!s.schoolCode||!s.officeCode){toast('학교 검색 결과에서 학교를 먼저 선택해 주세요.');return false;}
  if(!/^\d+$/.test(s.className)||Number(s.className)<1){toast('반은 1 이상의 숫자로 입력해 주세요.');return false;}
  save();renderSchoolSummary();toast('학교 시간표 설정을 저장했어요.');
  return true;
}
async function fetchSchoolWeek(){
  const s=data.schoolTimetable;
  if(!s.schoolCode||!s.officeCode){toast('먼저 학교를 검색해 선택해 주세요.');return;}
  const dates=schoolWeekDates();
  $('schoolTimetableStatus').textContent='시간표를 불러오는 중…';
  try{
    const all=[];
    for(const date of dates){
      const ymd=date.replaceAll('-','');
      const rows=await schoolApiRows('hisTimetable',{
        ATPT_OFCDC_SC_CODE:s.officeCode,SD_SCHUL_CODE:s.schoolCode,
        AY:s.year,SEM:s.semester,ALL_TI_YMD:ymd,GRADE:s.grade,CLASS_NM:s.className
      },'hisTimetable');
      all.push(...rows.map(r=>({...r,ALL_TI_YMD:String(r.ALL_TI_YMD||ymd).replace(/^(\d{4})(\d{2})(\d{2})$/,'$1-$2-$3')})));
    }
    s.weekRows=all;
    s.fetchedWeek=dates[0];
    s.lastError='';
    save();
    renderSchoolWeek();
    $('schoolTimetableStatus').textContent=all.length?`이번 주 시간표 ${all.length}개 교시를 불러왔습니다.`:'조회 요청은 성공했지만 해당 학기·학급의 시간표가 없습니다.';
    if(all.length)toast(`이번 주 시간표 ${all.length}개 교시를 불러왔어요.`);
    else toast('조회된 시간표가 없습니다. 설정 정보를 확인해 주세요.');
  }catch(err){
    s.lastError=err.message||'시간표 조회 실패';
    save();
    $('schoolTimetableStatus').textContent=s.lastError;
    renderSchoolWeek();
  }
}
function initSchoolTimetable(){
  const yearInput=$('schoolYearInput');
  if(yearInput&&!yearInput.value)yearInput.value=new Date().getFullYear();
  renderSchoolSummary();
  renderSchoolWeek();
  $('schoolWeekView')?.addEventListener('click',e=>{
    const cell=e.target.closest('[data-school-date][data-school-period]');
    if(!cell)return;
    editSchoolTimetableCell(cell.dataset.schoolDate,Number(cell.dataset.schoolPeriod));
  });

  const modal=$('schoolSettingsModal');
  const openModal=()=>{renderSchoolSummary();modal.style.display='grid';};
  const closeModal=()=>{modal.style.display='none';};
  $('myPageSchoolBtn')?.addEventListener('click',openModal);
  $('closeSchoolSettingsBtn')?.addEventListener('click',closeModal);
  modal?.addEventListener('click',e=>{if(e.target===modal)closeModal();});

  $('schoolSearchBtn')?.addEventListener('click',searchNeisSchools);
  $('schoolNameInput')?.addEventListener('keydown',e=>{if(e.key==='Enter'){e.preventDefault();searchNeisSchools();}});
  $('schoolSearchResults')?.addEventListener('click',e=>{
    const btn=e.target.closest('[data-school-index]');
    if(!btn)return;
    const row=$('schoolSearchResults')._schoolRows?.[Number(btn.dataset.schoolIndex)];
    if(!row)return;
    const s=data.schoolTimetable;
    s.schoolName=row.SCHUL_NM||'';
    s.officeCode=row.ATPT_OFCDC_SC_CODE||'';
    s.schoolCode=row.SD_SCHUL_CODE||'';
    s.selectedSchool={name:s.schoolName,officeCode:s.officeCode,schoolCode:s.schoolCode,address:row.ORG_RDNMA||row.ORG_RDNDA||''};
    $('schoolNameInput').value=s.schoolName;
    $('schoolSearchResults').innerHTML=`<div class="school-status">선택됨: ${escapeHTML(s.schoolName)} · ${escapeHTML(s.selectedSchool.address)}</div>`;
    renderSchoolSummary();
  });
  $('schoolSaveBtn')?.addEventListener('click',async()=>{
    if(!saveSchoolSettings())return;
    closeModal();
    await fetchSchoolWeek();
  });
  $('schoolClearBtn')?.addEventListener('click',()=>{
    if(!confirm('학교 시간표 설정을 초기화할까요? 개인 주간 플래너 일정은 변경되지 않습니다.'))return;
    data.schoolTimetable={schoolName:'',officeCode:'',schoolCode:'',grade:'2',className:'1',year:new Date().getFullYear(),semester:'1',apiKey:'',selectedSchool:null,weekRows:[],fetchedWeek:'',lastError:''};
    save();renderSchoolSummary();renderSchoolWeek();$('schoolSearchResults').innerHTML='';
    $('schoolTimetableStatus').textContent='';
    toast('학교 시간표 설정을 초기화했어요.');
  });
}

/* 학습 분석 및 마이페이지 */

