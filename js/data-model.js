const SUBJECTS=['국어','수학','영어','사회','과학','한국사','기타'];
const PROFILE_GRADES=['고등학교 1학년','고등학교 2학년','고등학교 3학년','N수'];
const PROFILE_LEGACY_GRADES=['중학교 1학년','중학교 2학년','중학교 3학년'];
const normalizeLectureSubject=subject=>({'통합사회':'사회','통합과학':'과학'}[String(subject||'')]||String(subject||''));
const KEY='study-flow-v1';

const DEFAULT_VIEW_START=360;
const DEFAULT_VIEW_END=1440;

const HOUR=60;
let HOUR_HEIGHT=32.4;

const DAY_NAMES=['일','월','화','수','목','금','토'];
const $=id=>document.getElementById(id);

const todayISO=()=>{
  const d=new Date();
  return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;
};

const dateOffset=(date,n)=>{
  const d=new Date(date+'T12:00:00');
  d.setDate(d.getDate()+n);
  return iso(d);
};

const iso=d=>`${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;

const mondayOf=date=>{
  const d=new Date(date+'T12:00:00');
  d.setDate(d.getDate()-((d.getDay()+6)%7));
  return iso(d);
};

const uid=()=>crypto.randomUUID?crypto.randomUUID():String(Date.now())+Math.random().toString(16).slice(2);

const timeText=m=>{
  const h=Math.floor(m/60);
  const r=m%60;
  return `${String(h).padStart(2,'0')}:${String(r).padStart(2,'0')}`;
};

const timeToMinutes=t=>{
  if(typeof t==='number')return t;
  const [h,m]=String(t||'06:00').split(':').map(Number);
  return h*60+m;
};

const clamp=(v,min,max)=>Math.max(min,Math.min(max,v));

function defaultTodoCategories(){
  return [
    {id:'todo-subject-korean',name:'국어',type:'subject',builtin:true},
    {id:'todo-subject-math',name:'수학',type:'subject',builtin:true},
    {id:'todo-subject-english',name:'영어',type:'subject',builtin:true}
  ];
}

function defaultData(){
  return {
    goal:40,
    profile:{name:'',nickname:'',grade:''},
    timerSubjects:['국어','수학','영어','사회','과학'],
    events:[],
    scheduleBlocks:[],
    scheduleView:{
      start:DEFAULT_VIEW_START,
      end:DEFAULT_VIEW_END
    },
    tasks:SUBJECTS.map(s=>({id:uid(),subject:s,title:'',done:false})),
    courses:[],
    logs:[],
    calendarEvents:[],
    gradeRecords:{school:[],mock:[]},
    todoCategories:defaultTodoCategories(),
    todoItems:[],
    todoRoutines:[],
    todoCelebratedDates:[],
    schoolTimetable:{
      schoolName:'',
      officeCode:'',
      schoolCode:'',
      grade:'2',
      className:'1',
      year:new Date().getFullYear(),
      semester:'1',
      selectedSchool:null,
      weekRows:[],
      manualEdits:{},
      fetchedWeek:'',
      lastError:''
    }
  };
}

function normalizeData(raw){
  const base=defaultData();
  const d=raw&&typeof raw==='object'?raw:{};

  const result={
    ...base,
    ...d,
    goal:Number(d.goal)||40,
    profile:{
      name:String(d.profile?.name||'').trim().slice(0,40),
      nickname:String(d.profile?.nickname||'').trim().slice(0,30),
      grade:(PROFILE_GRADES.includes(String(d.profile?.grade||'').trim())||PROFILE_LEGACY_GRADES.includes(String(d.profile?.grade||'').trim()))?String(d.profile.grade).trim():''
    },
    timerSubjects:(Array.isArray(d.timerSubjects)?d.timerSubjects:base.timerSubjects).map(v=>String(v||'').trim()).filter((v,i,a)=>v&&a.indexOf(v)===i).map(v=>({'통합사회':'사회','통합과학':'과학'}[v]||v)),
    events:Array.isArray(d.events)?d.events:[],
    tasks:Array.isArray(d.tasks)?d.tasks:base.tasks,
    courses:Array.isArray(d.courses)?d.courses:
      (Array.isArray(d.tasks)?d.tasks.filter(t=>t&&String(t.title||'').trim()).map(t=>({
        id:t.id||uid(),
        subject:SUBJECTS.includes(normalizeLectureSubject(t.subject))?normalizeLectureSubject(t.subject):SUBJECTS[0],
        title:String(t.title||'기존 학습 항목'),
        total:1,
        completed:t.done?1:0
      })):[]),
    logs:Array.isArray(d.logs)?d.logs:[],
    calendarEvents:Array.isArray(d.calendarEvents)?d.calendarEvents:[],
    gradeRecords:{
      school:Array.isArray(d.gradeRecords?.school)?d.gradeRecords.school:[],
      mock:Array.isArray(d.gradeRecords?.mock)?d.gradeRecords.mock:[]
    },
    todoCategories:Array.isArray(d.todoCategories)?d.todoCategories:defaultTodoCategories(),
    todoItems:Array.isArray(d.todoItems)?d.todoItems:[],
    todoRoutines:Array.isArray(d.todoRoutines)?d.todoRoutines:[],
    todoCelebratedDates:Array.isArray(d.todoCelebratedDates)?d.todoCelebratedDates:[],
    schoolTimetable:{
      ...base.schoolTimetable,
      ...(d.schoolTimetable&&typeof d.schoolTimetable==='object'?d.schoolTimetable:{}),
      grade:String(d.schoolTimetable?.grade||'2'),
      className:String(d.schoolTimetable?.className||'1'),
      year:Number(d.schoolTimetable?.year)||new Date().getFullYear(),
      semester:String(d.schoolTimetable?.semester||'1'),
      weekRows:Array.isArray(d.schoolTimetable?.weekRows)?d.schoolTimetable.weekRows:[],
      manualEdits:d.schoolTimetable?.manualEdits&&typeof d.schoolTimetable.manualEdits==='object'?d.schoolTimetable.manualEdits:{}
    },
    scheduleView:{
      start:Number(d.scheduleView?.start??DEFAULT_VIEW_START),
      end:Number(d.scheduleView?.end??DEFAULT_VIEW_END)
    }
  };

  // 과거 버전에 브라우저/클라우드로 저장된 NEIS 인증키가 있으면 로드 즉시 제거
  if(result.schoolTimetable && Object.prototype.hasOwnProperty.call(result.schoolTimetable,'apiKey')){
    delete result.schoolTimetable.apiKey;
  }

  result.calendarEvents=result.calendarEvents.filter(ev=>ev&&/^\d{4}-\d{2}-\d{2}$/.test(ev.date||'')&&String(ev.title||'').trim()).map(ev=>({
    id:String(ev.id||uid()),date:ev.date,title:String(ev.title).trim(),start:String(ev.start||''),end:String(ev.end||'')
  }));

  result.courses=result.courses
    .filter(c=>c&&String(c.title||'').trim())
    .map(c=>{
      const total=Math.max(1,Math.floor(Number(c.total)||1));
      return {
        id:c.id||uid(),
        subject:SUBJECTS.includes(normalizeLectureSubject(c.subject))?normalizeLectureSubject(c.subject):SUBJECTS[0],
        title:String(c.title||'강의'),
        total,
        completed:clamp(Math.floor(Number(c.completed)||0),0,total)
      };
    });

  result.scheduleView.start=clamp(result.scheduleView.start,0,1380);
  result.scheduleView.end=clamp(result.scheduleView.end,60,1440);

  if(result.scheduleView.end<=result.scheduleView.start){
    result.scheduleView={start:DEFAULT_VIEW_START,end:DEFAULT_VIEW_END};
  }

  if(Array.isArray(d.scheduleBlocks)){
    result.scheduleBlocks=d.scheduleBlocks;
  }else{
    result.scheduleBlocks=result.events.map(e=>{
      const date=e.date||todayISO();
      let start=timeToMinutes(e.time||'16:00');
      start=clamp(start,0,1435);

      return {
        id:e.id||uid(),
        title:e.title||'기존 일정',
        date,
        day:new Date(date+'T12:00:00').getDay(),
        start,
        end:Math.min(1440,start+60),
        repeat:false,
        type:'study'
      };
    });
  }

  result.scheduleBlocks=result.scheduleBlocks
    .filter(b=>
      b&&Number.isFinite(Number(b.start))&&
      Number.isFinite(Number(b.end))
    )
    .map(b=>{
      const start=clamp(Number(b.start),0,1435);
      const end=clamp(Number(b.end),start+5,1440);

      return {
        ...b,
        id:b.id||uid(),
        title:b.title||'일정',
        start,
        end,
        day:Number.isInteger(Number(b.day))?Number(b.day):1,
        repeat:b.repeat===true||b.repeat==='true',
        type:['class','study','personal','other'].includes(b.type)?b.type:(b.type==='lecture'?'study':'study'),
        doneDates:b.doneDates&&typeof b.doneDates==='object'&&!Array.isArray(b.doneDates)?b.doneDates:{}
      };
    })
    .filter(b=>b.end>b.start);

  const defaultCategories=defaultTodoCategories();
  const savedCategories=Array.isArray(d.todoCategories)?d.todoCategories:[];
  const categoryMap=new Map();
  [...defaultCategories,...savedCategories].forEach(c=>{
    if(!c||!String(c.name||'').trim())return;
    const name=String(c.name).trim();
    if([...categoryMap.values()].some(x=>x.name.toLowerCase()===name.toLowerCase()))return;
    const id=String(c.id||uid());
    categoryMap.set(id,{id,name,type:['subject','life'].includes(c.type)?c.type:'life',builtin:!!c.builtin});
  });
  result.todoCategories=[...categoryMap.values()];
  const validCategoryIds=new Set(result.todoCategories.map(c=>c.id));
  result.todoItems=result.todoItems.filter(x=>x&&String(x.title||'').trim()&&/^\d{4}-\d{2}-\d{2}$/.test(x.date||'')).map(x=>({
    id:String(x.id||uid()),title:String(x.title).trim(),date:x.date,
    categoryId:validCategoryIds.has(String(x.categoryId))?String(x.categoryId):'',
    done:!!x.done,routineId:x.routineId?String(x.routineId):null,routineSourceDate:/^\d{4}-\d{2}-\d{2}$/.test(x.routineSourceDate||'')?x.routineSourceDate:null,createdAt:x.createdAt||new Date().toISOString()
  }));
  result.todoRoutines=result.todoRoutines.filter(x=>x&&String(x.title||'').trim()).map(x=>({
    id:String(x.id||uid()),title:String(x.title).trim(),categoryId:validCategoryIds.has(String(x.categoryId))?String(x.categoryId):'',
    startDate:/^\d{4}-\d{2}-\d{2}$/.test(x.startDate||'')?x.startDate:todayISO(),active:x.active!==false,createdAt:x.createdAt||new Date().toISOString()
  }));
  result.todoCelebratedDates=[...new Set(result.todoCelebratedDates.filter(x=>/^\d{4}-\d{2}-\d{2}$/.test(x)))];
  result.gradeRecords.school=result.gradeRecords.school.filter(x=>x&&String(x.name||'').trim()).map(x=>({
    id:String(x.id||uid()),name:String(x.name).trim(),subjects:Array.isArray(x.subjects)?x.subjects.filter(v=>v&&String(v.name||'').trim()).map(v=>({id:String(v.id||uid()),name:String(v.name).trim(),credit:Math.max(0.5,Number(v.credit)||1),grade:clamp(Math.round(Number(v.grade)||1),1,5)})):[]
  }));
  const mockSubjects=['국어','수학','영어','한국사','통합사회','통합과학'];
  result.gradeRecords.mock=result.gradeRecords.mock.filter(x=>x&&String(x.name||'').trim()).map(x=>({
    id:String(x.id||uid()),name:String(x.name).trim(),date:String(x.date||''),subjects:Object.fromEntries(mockSubjects.map(subject=>{const v=x.subjects?.[subject]||{};return [subject,{grade:v.grade===''||v.grade==null?'':clamp(Math.round(Number(v.grade)||1),1,9),percentile:['국어','수학','통합사회','통합과학'].includes(subject)?(v.percentile===''||v.percentile==null?'':clamp(Number(v.percentile)||0,0,100)):''}]}))
  }));

  return result;
}

let data;
try{
  data=normalizeData(JSON.parse(localStorage.getItem(KEY))||defaultData());
}catch{
  data=defaultData();
}
// 기존 버전에 저장된 NEIS 인증키가 있다면 LocalStorage에서도 즉시 제거
try{localStorage.setItem(KEY,JSON.stringify(data));}catch{}

