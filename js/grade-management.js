/* 성적 관리: 내신(학점 가중 평균) 및 모의고사 */
const MOCK_SUBJECTS=['국어','수학','영어','한국사','통합사회','통합과학'];
let activeGradeTab='school';
let editingSchoolRecordId=null;
function renderGrades(){
  const host=$('gradeContent');if(!host)return;
  document.querySelectorAll('[data-grade-tab]').forEach(b=>b.classList.toggle('active',b.dataset.gradeTab===activeGradeTab));
  if(activeGradeTab==='school'){
    const records=data.gradeRecords.school;
    host.innerHTML=`<div class="grade-toolbar"><span class="muted" style="font-size:11px">과목과 학점을 직접 등록하고 5등급제 평균을 확인하세요.</span><button class="mini" id="addSchoolRecord">＋ 내신 학기 추가</button></div>`+
      (records.length?records.map(r=>{
        const total=r.subjects.reduce((a,x)=>a+x.credit,0);
        const avg=total?r.subjects.reduce((a,x)=>a+x.grade*x.credit,0)/total:null;
        return `<div class="grade-record"><div class="grade-record-head"><div><strong>${escapeHTML(r.name)}</strong><div class="grade-average">${avg===null?'과목을 추가해 주세요':`학점 가중 평균 ${avg.toFixed(2)}등급`}</div></div><div><button class="mini" data-school-add-subject="${escapeHTML(r.id)}">＋ 과목</button> <button class="mini" data-school-delete="${escapeHTML(r.id)}">삭제</button></div></div>`+
          (r.subjects.length?`<div class="table-wrap"><table class="grade-table"><thead><tr><th>과목</th><th>학점</th><th>등급</th><th></th></tr></thead><tbody>${r.subjects.map(v=>`<tr><td class="subject-name">${escapeHTML(v.name)}</td><td>${v.credit}</td><td>${v.grade}등급</td><td><button class="mini" data-school-edit="${escapeHTML(r.id)}" data-subject-id="${escapeHTML(v.id)}">수정</button> <button class="mini" data-school-sub-delete="${escapeHTML(r.id)}" data-subject-id="${escapeHTML(v.id)}">삭제</button></td></tr>`).join('')}</tbody></table></div>`:'<div class="grade-empty">아직 등록한 과목이 없어요.</div>')+
        `</div>`;
      }).join(''):'<div class="grade-empty">등록된 내신 성적이 없어요.<br>학기 또는 시험을 추가해 성적을 입력해 보세요.</div>');
  }else{
    const records=data.gradeRecords.mock;
    host.innerHTML=`<div class="grade-toolbar"><span class="muted" style="font-size:11px">과목별 9등급과 해당 과목의 백분위를 입력하세요.</span><button class="mini" id="addMockRecord">＋ 모의고사 추가</button></div><p class="grade-help">백분위 입력 가능: 국어·수학·통합사회·통합과학 / 영어·한국사는 등급만 입력</p>`+
      (records.length?records.map(r=>`<div class="grade-record"><div class="grade-record-head"><div><strong>${escapeHTML(r.name)}</strong><div class="muted" style="font-size:10px">${escapeHTML(r.date||'시행일 미입력')}</div></div><button class="mini" data-mock-delete="${escapeHTML(r.id)}">삭제</button></div><div class="table-wrap"><table class="grade-table"><thead><tr><th>과목</th><th>등급 (1~9)</th><th>백분위</th></tr></thead><tbody>${MOCK_SUBJECTS.map(subject=>{const v=r.subjects[subject]||{};const hasPct=['국어','수학','통합사회','통합과학'].includes(subject);return `<tr><td class="subject-name">${subject}</td><td><select class="field" data-mock-grade="${escapeHTML(r.id)}" data-subject="${subject}"><option value="">미입력</option>${Array.from({length:9},(_,i)=>`<option value="${i+1}" ${String(v.grade)===String(i+1)?'selected':''}>${i+1}등급</option>`).join('')}</select></td><td>${hasPct?`<input class="field" type="number" min="0" max="100" placeholder="0~100" value="${v.percentile??''}" data-mock-percentile="${escapeHTML(r.id)}" data-subject="${subject}">`:'<span class="muted">해당 없음</span>'}</td></tr>`}).join('')}</tbody></table></div></div>`).join(''):'<div class="grade-empty">등록된 모의고사 성적이 없어요.<br>시험을 추가해 과목별 성적을 입력해 보세요.</div>');
  }
}
function openSchoolSubjectModal(recordId,subjectId=null){
  const record=data.gradeRecords.school.find(x=>x.id===recordId);if(!record)return;
  const subject=subjectId?record.subjects.find(x=>x.id===subjectId):null;
  openModal(subject?'내신 과목 수정':'내신 과목 추가',`
    <label class="muted">과목명</label><input class="field" id="schoolSubjectName" maxlength="30" placeholder="예: 국어" value="${subject?escapeHTML(subject.name):''}">
    <div class="form-row"><div style="flex:1"><label class="muted">학점</label><input class="field" id="schoolSubjectCredit" type="number" min="0.5" max="10" step="0.5" value="${subject?subject.credit:3}"></div><div style="flex:1"><label class="muted">5등급제 등급</label><select class="field" id="schoolSubjectGrade">${[1,2,3,4,5].map(n=>`<option value="${n}" ${subject?.grade===n?'selected':''}>${n}등급</option>`).join('')}</select></div></div>
  `,()=>{
    const name=$('schoolSubjectName').value.trim(),credit=Number($('schoolSubjectCredit').value),grade=Number($('schoolSubjectGrade').value);
    if(!name)return toast('과목명을 입력해 주세요.');if(!Number.isFinite(credit)||credit<=0||credit>10)return toast('학점을 0 초과 10 이하로 입력해 주세요.');
    if(subject){Object.assign(subject,{name,credit,grade});}else record.subjects.push({id:uid(),name,credit,grade});
    closeModal();save();toast('내신 성적을 저장했어요.');
  });
}
document.addEventListener('click',function handleGradeDocumentClick(e){
  const tab=e.target.closest('[data-grade-tab]');if(tab){activeGradeTab=tab.dataset.gradeTab;renderGrades();return;}
  if(e.target.closest('#addSchoolRecord')){openModal('내신 학기 추가',`<label class="muted">학기 또는 시험 이름</label><input class="field" id="schoolRecordName" placeholder="예: 1학년 1학기 중간고사">`,()=>{const name=$('schoolRecordName').value.trim();if(!name)return toast('이름을 입력해 주세요.');data.gradeRecords.school.push({id:uid(),name,subjects:[]});closeModal();save();});return;}
  if(e.target.closest('#addMockRecord')){openModal('모의고사 추가',`<label class="muted">시험 이름</label><input class="field" id="mockRecordName" placeholder="예: 2026년 3월 학력평가"><label class="muted" style="display:block;margin-top:12px">시행일</label><input class="field" id="mockRecordDate" type="date">`,()=>{const name=$('mockRecordName').value.trim();if(!name)return toast('시험 이름을 입력해 주세요.');const subjects=Object.fromEntries(MOCK_SUBJECTS.map(x=>[x,{grade:'',percentile:''}]));data.gradeRecords.mock.push({id:uid(),name,date:$('mockRecordDate').value,subjects});closeModal();save();});return;}
  const add=e.target.closest('[data-school-add-subject]');if(add){openSchoolSubjectModal(add.dataset.schoolAddSubject);return;}
  const edit=e.target.closest('[data-school-edit]');if(edit){openSchoolSubjectModal(edit.dataset.schoolEdit,edit.dataset.subjectId);return;}
  const del=e.target.closest('[data-school-delete]');if(del){data.gradeRecords.school=data.gradeRecords.school.filter(x=>x.id!==del.dataset.schoolDelete);save();return;}
  const subDel=e.target.closest('[data-school-sub-delete]');if(subDel){const r=data.gradeRecords.school.find(x=>x.id===subDel.dataset.schoolSubDelete);if(r)r.subjects=r.subjects.filter(x=>x.id!==subDel.dataset.subjectId);save();return;}
  const mockDel=e.target.closest('[data-mock-delete]');if(mockDel){data.gradeRecords.mock=data.gradeRecords.mock.filter(x=>x.id!==mockDel.dataset.mockDelete);save();return;}
});
document.addEventListener('change',function handleGradeDocumentChange(e){
  const grade=e.target.closest('[data-mock-grade]');
  if(grade){const r=data.gradeRecords.mock.find(x=>x.id===grade.dataset.mockGrade);if(r){r.subjects[grade.dataset.subject].grade=grade.value===''?'':Number(grade.value);save();}return;}
  const pct=e.target.closest('[data-mock-percentile]');
  if(pct){const r=data.gradeRecords.mock.find(x=>x.id===pct.dataset.mockPercentile);const n=pct.value===''?'':Number(pct.value);if(n!==''&&(!Number.isFinite(n)||n<0||n>100)){toast('백분위는 0~100 사이로 입력해 주세요.');renderGrades();return;}if(r){r.subjects[pct.dataset.subject].percentile=n;save();}}
});


