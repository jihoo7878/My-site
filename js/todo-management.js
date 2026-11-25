/* TO DO LIST */
let selectedTodoDate=todayISO();

function todoCategoryById(id){
  return data.todoCategories.find(c=>c.id===id)||data.todoCategories[0];
}

function ensureDailyRoutines(date){
  let changed=false;
  data.todoRoutines.filter(r=>r.active!==false&&r.startDate<=date).forEach(r=>{
    const exists=data.todoItems.some(item=>item.routineId===r.id&&(item.routineSourceDate||item.date)===date);
    if(!exists){
      data.todoItems.push({id:uid(),title:r.title,date,categoryId:r.categoryId,done:false,routineId:r.id,routineSourceDate:date,createdAt:new Date().toISOString()});
      changed=true;
    }
  });
  return changed;
}

function todoItemsForDate(date=selectedTodoDate){
  return data.todoItems.filter(item=>item.date===date);
}

function todoProgressForDate(date=selectedTodoDate){
  const items=todoItemsForDate(date);
  const done=items.filter(item=>item.done).length;
  return {items,done,total:items.length,percent:items.length?Math.round(done/items.length*100):0};
}

function renderTodo(){
  const dateInput=$('todoDate');
  if(!dateInput)return;
  dateInput.value=selectedTodoDate;
  const generated=ensureDailyRoutines(selectedTodoDate);
  const stats=todoProgressForDate();
  $('todoPercent').textContent=stats.percent+'%';
  $('todoProgress').style.width=stats.percent+'%';
  $('todoCount').textContent=`${stats.done} / ${stats.total}개`;

  const categories=data.todoCategories;
  const html=categories.map(category=>{
    const items=stats.items.filter(item=>item.categoryId===category.id);
    return `
      <section class="todo-category">
        <div class="todo-category-head">
          <div class="todo-category-title">${escapeHTML(category.name)} <span class="todo-category-type">${category.type==='subject'?'과목':'생활'}</span></div>
          <div style="display:flex;align-items:center;gap:7px">
            <span class="muted" style="font-size:10px">${items.filter(x=>x.done).length}/${items.length}</span>
            <button class="mini" data-add-todo-category="${escapeHTML(category.id)}">＋ 추가</button>
          </div>
        </div>
        ${items.length?items.map(item=>`
          <div class="todo-item ${item.done?'done':''}" data-todo-row="${escapeHTML(item.id)}">
            <input class="todo-check" type="checkbox" data-todo-check="${escapeHTML(item.id)}" ${item.done?'checked':''} aria-label="${escapeHTML(item.title)} 완료">
            <span class="todo-item-title">${escapeHTML(item.title)}</span>
            ${item.routineId?'<span class="todo-item-meta">루틴</span>':''}
            <div class="todo-menu-wrap">
              <button class="todo-menu-btn" type="button" data-todo-menu-toggle="${escapeHTML(item.id)}" aria-label="할 일 설정">⋮</button>
              <div class="todo-menu" id="todoMenu-${escapeHTML(item.id)}">
                <button type="button" data-todo-action="move" data-todo-id="${escapeHTML(item.id)}">이월</button>
                <button type="button" data-todo-action="edit" data-todo-id="${escapeHTML(item.id)}">수정</button>
                <button type="button" data-todo-action="delete" data-todo-id="${escapeHTML(item.id)}">삭제</button>
              </div>
            </div>
          </div>
        `).join(''):'<div class="todo-empty">아직 등록된 할 일이 없어요.</div>'}
      </section>
    `;
  }).join('');
  const unassigned=stats.items.filter(item=>!item.categoryId||!categories.some(c=>c.id===item.categoryId));
  const unassignedHtml=unassigned.length?`<section class="todo-category"><div class="todo-category-head"><div class="todo-category-title">미분류 <span class="todo-category-type">카테고리 미지정</span></div></div>${unassigned.map(item=>`<div class="todo-item ${item.done?'done':''}"><input class="todo-check" type="checkbox" data-todo-check="${escapeHTML(item.id)}" ${item.done?'checked':''}><span class="todo-item-title">${escapeHTML(item.title)}</span><div class="todo-menu-wrap"><button class="todo-menu-btn" type="button" data-todo-menu-toggle="${escapeHTML(item.id)}">⋮</button><div class="todo-menu" id="todoMenu-${escapeHTML(item.id)}"><button type="button" data-todo-action="edit" data-todo-id="${escapeHTML(item.id)}">수정</button><button type="button" data-todo-action="delete" data-todo-id="${escapeHTML(item.id)}">삭제</button></div></div></div>`).join('')}</section>`:'';
  $('todoCategories').innerHTML=(html+unassignedHtml)||'<div class="todo-empty">이 날짜에 등록된 할 일이 없어요. 할 일을 추가해 보세요.</div>';

  const routines=data.todoRoutines;
  $('todoRoutineList').innerHTML=routines.length?routines.map(r=>`
    <div class="todo-routine-item">
      <span>${escapeHTML(r.title)}</span>
      <span class="muted">${escapeHTML(todoCategoryById(r.categoryId)?.name||'기타')} · ${r.active?'반복 중':'중지됨'}</span>
      <div class="todo-routine-actions">
        <button class="mini" data-routine-toggle="${escapeHTML(r.id)}">${r.active?'중지':'재개'}</button>
        <button class="mini" data-routine-delete="${escapeHTML(r.id)}">삭제</button>
      </div>
    </div>
  `).join(''):'<div class="todo-empty">등록된 루틴이 없어요.</div>';

  if(generated){data.todoCelebratedDates=data.todoCelebratedDates.filter(d=>d!==selectedTodoDate);save();}
}

function todoCategoryOptions(selected=''){
  return data.todoCategories.map(c=>`<option value="${escapeHTML(c.id)}" ${c.id===selected?'selected':''}>${escapeHTML(c.name)} · ${c.type==='subject'?'과목':'생활'}</option>`).join('');
}

function openAddTodoModal(){
  openModal('할 일 추가',`
    <label class="muted">카테고리 <span style="color:var(--muted);font-weight:400">(선택 사항)</span></label>
    <select class="field" id="todoFormCategory">
      <option value="">카테고리 없이 추가</option>
      ${todoCategoryOptions()}
    </select>
    <label class="muted" style="display:block;margin-top:12px">할 일</label>
    <input class="field" id="todoFormTitle" maxlength="100" placeholder="예: 수학 미적분 문제 20개 풀기">
    <label class="muted" style="display:block;margin-top:12px">날짜</label>
    <input class="field" id="todoFormDate" type="date" value="${selectedTodoDate}">
  `,()=>{
    const title=$('todoFormTitle').value.trim();
    const date=$('todoFormDate').value;
    if(!title)return toast('할 일 내용을 입력해 주세요.');
    if(!date)return toast('날짜를 선택해 주세요.');
    data.todoItems.push({id:uid(),title,date,categoryId:$('todoFormCategory').value||'',done:false,routineId:null,routineSourceDate:null,createdAt:new Date().toISOString()});
    data.todoCelebratedDates=data.todoCelebratedDates.filter(d=>d!==date);
    selectedTodoDate=date;closeModal();save();toast('할 일을 추가했어요.');
  });
}

function openAddRoutineModal(){
  if(!data.todoCategories.length)return toast('먼저 카테고리를 추가해 주세요.');
  openModal('매일 반복하는 루틴 등록',`
    <label class="muted">카테고리</label>
    <select class="field" id="routineFormCategory">${todoCategoryOptions()}</select>
    <label class="muted" style="display:block;margin-top:12px">루틴 이름</label>
    <input class="field" id="routineFormTitle" maxlength="100" placeholder="예: 영어 단어 30개 암기">
    <label class="muted" style="display:block;margin-top:12px">시작 날짜</label>
    <input class="field" id="routineFormDate" type="date" value="${selectedTodoDate}">
    <p class="muted" style="font-size:10px;margin:8px 0 0">시작 날짜부터 해당 날짜를 열 때마다 새로운 할 일이 생성됩니다. 전날 완료 여부와 관계없이 매일 독립적으로 관리됩니다.</p>
  `,()=>{
    const title=$('routineFormTitle').value.trim();
    const startDate=$('routineFormDate').value;
    if(!title)return toast('루틴 이름을 입력해 주세요.');
    if(!startDate)return toast('시작 날짜를 선택해 주세요.');
    data.todoRoutines.push({id:uid(),title,categoryId:$('routineFormCategory').value,startDate,active:true,createdAt:new Date().toISOString()});
    closeModal();renderTodo();save();toast('매일 루틴을 등록했어요.');
  });
}

function openTodoCategoryManager(){
  const rows=data.todoCategories.map(c=>`
    <div class="todo-category-manage-row">
      <span>${escapeHTML(c.name)}</span><small>${c.type==='subject'?'과목':'생활'}</small>
      <div class="todo-inline-actions">
        <button class="mini" data-category-edit="${escapeHTML(c.id)}">수정</button>
        <button class="mini" data-category-delete="${escapeHTML(c.id)}">삭제</button>
      </div>
    </div>
  `).join('');
  openModal('카테고리 관리',`
    <div>${rows||'<div class="todo-empty">카테고리가 없습니다.</div>'}</div>
    <button class="btn primary" type="button" id="todoAddCategoryInManager" style="width:100%;margin-top:14px">＋ 카테고리 추가</button>
  `,()=>closeModal());
  $('todoAddCategoryInManager').onclick=()=>openAddCategoryModal();
}

function openAddCategoryModal(category=null){
  openModal(category?'카테고리 수정':'카테고리 추가',`
    <label class="muted">카테고리 이름</label>
    <input class="field" id="todoCategoryName" maxlength="30" value="${escapeHTML(category?.name||'')}" placeholder="예: 독서, 코딩, 개인 프로젝트">
    <label class="muted" style="display:block;margin-top:12px">분류</label>
    <select class="field" id="todoCategoryType">
      <option value="subject" ${category?.type==='subject'?'selected':''}>과목</option>
      <option value="life" ${!category||category.type==='life'?'selected':''}>생활</option>
    </select>
  `,()=>{
    const name=$('todoCategoryName').value.trim();
    if(!name)return toast('카테고리 이름을 입력해 주세요.');
    if(data.todoCategories.some(c=>c.name.toLowerCase()===name.toLowerCase()&&c.id!==category?.id))return toast('같은 이름의 카테고리가 이미 있어요.');
    if(category){category.name=name;category.type=$('todoCategoryType').value;}
    else data.todoCategories.push({id:uid(),name,type:$('todoCategoryType').value,builtin:false});
    closeModal();save();renderTodo();toast(category?'카테고리를 수정했어요.':'카테고리를 추가했어요.');
  });
}

function moveTodoItem(id){
  const item=data.todoItems.find(x=>x.id===id);if(!item)return;
  const target=prompt('이 할 일을 옮길 날짜를 입력해 주세요. (YYYY-MM-DD)',dateOffset(item.date,1));
  if(target===null)return;
  if(!/^\d{4}-\d{2}-\d{2}$/.test(target)||!Number.isFinite(new Date(target+'T12:00:00').getTime())||iso(new Date(target+'T12:00:00'))!==target)return toast('올바른 날짜를 입력해 주세요.');
  item.date=target;item.done=false;selectedTodoDate=target;save();toast('할 일을 선택한 날짜로 옮겼어요.');
}

function checkTodoCompletion(date){
  const stats=todoProgressForDate(date);
  if(!stats.total||stats.done!==stats.total||data.todoCelebratedDates.includes(date))return;
  data.todoCelebratedDates.push(date);
  save();
  $('celebrateTitle').textContent='오늘의 할 일을 모두 완료했어요!';
  $('celebrateMessage').textContent=`${date} · ${stats.total}개의 할 일을 모두 달성했어요. 정말 수고했어요!`;
  $('celebrateBack').style.display='grid';
}

$('todoDate').value=selectedTodoDate;
$('todoDate').addEventListener('change',e=>{if(!e.target.value)return;selectedTodoDate=e.target.value;renderTodo();});
$('todoPrevDay').onclick=()=>{selectedTodoDate=dateOffset(selectedTodoDate,-1);renderTodo();};
$('todoNextDay').onclick=()=>{selectedTodoDate=dateOffset(selectedTodoDate,1);renderTodo();};
$('todoToday').onclick=()=>{selectedTodoDate=todayISO();renderTodo();};
$('addTodoBtn').onclick=openAddTodoModal;
$('addRoutineBtn').onclick=openAddRoutineModal;
$('manageTodoCategoriesBtn').onclick=openTodoCategoryManager;

$('todoCategories').addEventListener('change',e=>{
  const check=e.target.closest('[data-todo-check]');if(!check)return;
  const item=data.todoItems.find(x=>x.id===check.dataset.todoCheck);if(!item)return;
  item.done=check.checked;save();
  if(item.done)checkTodoCompletion(item.date);
});

document.addEventListener('click',function handleTodoDocumentClick(e){
  const addInCategory=e.target.closest('[data-add-todo-category]');
  if(addInCategory){
    const categoryId=addInCategory.dataset.addTodoCategory;
    openModal('할 일 추가',`<label class=\"muted\">할 일</label><input class=\"field\" id=\"todoQuickTitle\" maxlength=\"100\" placeholder=\"할 일을 입력하세요\"><label class=\"muted\" style=\"display:block;margin-top:12px\">날짜</label><input class=\"field\" id=\"todoQuickDate\" type=\"date\" value=\"${selectedTodoDate}\">`,()=>{const title=$('todoQuickTitle').value.trim(),date=$('todoQuickDate').value;if(!title)return toast('할 일 내용을 입력해 주세요.');if(!date)return toast('날짜를 선택해 주세요.');data.todoItems.push({id:uid(),title,date,categoryId,done:false,routineId:null,routineSourceDate:null,createdAt:new Date().toISOString()});data.todoCelebratedDates=data.todoCelebratedDates.filter(d=>d!==date);selectedTodoDate=date;closeModal();save();toast('할 일을 추가했어요.');});
    return;
  }
  const menuToggle=e.target.closest('[data-todo-menu-toggle]');
  if(menuToggle){
    const id=menuToggle.dataset.todoMenuToggle;
    document.querySelectorAll('.todo-menu.open').forEach(m=>{if(m.id!=='todoMenu-'+id)m.classList.remove('open');});
    $('todoMenu-'+id)?.classList.toggle('open');return;
  }
  const todoAction=e.target.closest('[data-todo-action]');
  if(todoAction){
    const id=todoAction.dataset.todoId;const action=todoAction.dataset.todoAction;
    $('todoMenu-'+id)?.classList.remove('open');
    const item=data.todoItems.find(x=>x.id===id);if(!item)return;
    if(action==='move')moveTodoItem(id);
    if(action==='delete'&&confirm(`"${item.title}" 할 일을 삭제할까요?`)){data.todoItems=data.todoItems.filter(x=>x.id!==id);save();toast('할 일을 삭제했어요.');}
    if(action==='edit'){
      if(!data.todoCategories.length)return toast('먼저 카테고리를 추가해 주세요.');
      openModal('할 일 수정',`
        <label class="muted">카테고리</label><select class="field" id="todoEditCategory">${todoCategoryOptions(item.categoryId)}</select>
        <label class="muted" style="display:block;margin-top:12px">할 일</label><input class="field" id="todoEditTitle" maxlength="100" value="${escapeHTML(item.title)}">
        <label class="muted" style="display:block;margin-top:12px">날짜</label><input class="field" id="todoEditDate" type="date" value="${item.date}">
      `,()=>{
        const title=$('todoEditTitle').value.trim(),date=$('todoEditDate').value;
        if(!title)return toast('할 일 내용을 입력해 주세요.');if(!date)return toast('날짜를 선택해 주세요.');
        item.title=title;item.date=date;item.categoryId=$('todoEditCategory').value;selectedTodoDate=date;closeModal();save();toast('할 일을 수정했어요.');
      });
    }
    return;
  }
  const editCategory=e.target.closest('[data-category-edit]');
  if(editCategory){const c=data.todoCategories.find(x=>x.id===editCategory.dataset.categoryEdit);if(c)openAddCategoryModal(c);return;}
  const deleteCategory=e.target.closest('[data-category-delete]');
  if(deleteCategory){
    const c=data.todoCategories.find(x=>x.id===deleteCategory.dataset.categoryDelete);if(!c)return;
    if(!confirm(`"${c.name}" 카테고리를 삭제할까요? 기존 할 일과 루틴은 미분류 상태로 유지됩니다.`))return;
    data.todoItems.forEach(x=>{if(x.categoryId===c.id)x.categoryId='';});
    data.todoRoutines.forEach(x=>{if(x.categoryId===c.id)x.categoryId='';});
    data.todoCategories=data.todoCategories.filter(x=>x.id!==c.id);openTodoCategoryManager();save();toast('카테고리를 삭제했어요.');return;
  }
  const routineToggle=e.target.closest('[data-routine-toggle]');
  if(routineToggle){const r=data.todoRoutines.find(x=>x.id===routineToggle.dataset.routineToggle);if(r){r.active=!r.active;save();}return;}
  const routineDelete=e.target.closest('[data-routine-delete]');
  if(routineDelete){const r=data.todoRoutines.find(x=>x.id===routineDelete.dataset.routineDelete);if(r&&confirm(`"${r.title}" 루틴을 삭제할까요? 이미 생성된 날짜별 할 일은 유지됩니다.`)){data.todoRoutines=data.todoRoutines.filter(x=>x.id!==r.id);save();}return;}
  if(!e.target.closest('.todo-menu-wrap'))document.querySelectorAll('.todo-menu.open').forEach(m=>m.classList.remove('open'));
});


/* 메뉴 전환: 페이지 이동 시 기존 학습 데이터와 타이머 상태는 유지됩니다. */
