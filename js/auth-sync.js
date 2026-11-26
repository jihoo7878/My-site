/* ================= Supabase 인증 및 사용자별 동기화 =================
   공개 Publishable Key만 브라우저에서 사용합니다. Secret/service_role 키는 넣지 마세요.
===================================================================== */
(function(){
  const SUPABASE_URL='https://ravpqvaosmulgddearso.supabase.co';
  const SUPABASE_PUBLISHABLE_KEY='sb_publishable_daj6HmlmXnXV6q8L2SPDdQ_LbAIKj6y';
  const LEGACY_MIGRATED_KEY='study-flow-legacy-migrated-v1';
  const lobbySlides=[...document.querySelectorAll('.lobby-slide')];
  const lobbyDots=[...document.querySelectorAll('.lobby-slide-dots button')];
  let lobbySlideIndex=0, lobbySlideTimer=null;
  function showLobbySlide(index){
    if(!lobbySlides.length)return;
    lobbySlideIndex=(index+lobbySlides.length)%lobbySlides.length;
    lobbySlides.forEach((slide,i)=>slide.classList.toggle('active',i===lobbySlideIndex));
    lobbyDots.forEach((dot,i)=>dot.classList.toggle('active',i===lobbySlideIndex));
  }
  function startLobbySlideTimer(){
    clearInterval(lobbySlideTimer);
    lobbySlideTimer=setInterval(()=>showLobbySlide(lobbySlideIndex+1),4500);
  }
  document.querySelector('.lobby-slide-arrow.prev')?.addEventListener('click',()=>{showLobbySlide(lobbySlideIndex-1);startLobbySlideTimer();});
  document.querySelector('.lobby-slide-arrow.next')?.addEventListener('click',()=>{showLobbySlide(lobbySlideIndex+1);startLobbySlideTimer();});
  lobbyDots.forEach((dot,i)=>dot.addEventListener('click',()=>{showLobbySlide(i);startLobbySlideTimer();}));
  if(lobbySlides.length)startLobbySlideTimer();

  const authGate=document.getElementById('authGate');
  const lobbyGate=document.getElementById('lobbyGate');
const authForm=document.getElementById('authForm');
  const authHeading=document.getElementById('authHeading');
  const authSubmit=document.getElementById('authSubmit');
  const authSwitch=document.getElementById('authSwitch');
  const authMessage=document.getElementById('authMessage');
  const authPassword=document.getElementById('authPassword');
  const forgotPassword=document.getElementById('forgotPassword');
  const recoveryForm=document.getElementById('recoveryForm');
  let recoveryMode=false;
  const accountControls=document.getElementById('accountControls');
  const accountEmail=document.getElementById('accountEmail');
  const syncStatus=document.getElementById('syncStatus');
  let isSignUp=false;
  let currentUser=null;
  let saveTimer=null;
  let loadingUser=false;
  let supabaseClient=null;

  function message(text,isError=false){
    authMessage.textContent=text||'';
    authMessage.classList.toggle('error',!!isError);
  }
  function setBusy(busy){
    authSubmit.disabled=busy;
    authSubmit.textContent=busy?'처리 중…':(isSignUp?'회원가입':'로그인');
  }
  function showRecoveryForm(){
    recoveryMode=true;
    authHeading.textContent='새 비밀번호 설정';
    document.querySelector('.auth-sub').textContent='새롭게 사용할 비밀번호를 입력해 주세요.';
    authForm.style.display='none';
    recoveryForm.style.display='block';
    authSwitch.style.display='none';
    forgotPassword.style.display='none';
    message('');
  }
  function showNormalAuth(){
    recoveryMode=false;
    authHeading.textContent=isSignUp?'회원가입':'로그인';
    document.querySelector('.auth-sub').textContent='학습 데이터를 안전하게 저장하고 여러 기기에서 이어서 사용하세요.';
    authForm.style.display='block';
    recoveryForm.style.display='none';
    authSwitch.style.display='block';
    forgotPassword.style.display=isSignUp?'none':'block';
  }
  function showLobby(){
    lobbyGate.style.display='block';
    authGate.style.display='none';
    accountControls.style.display='none';
  }
  function showGate(){
    lobbyGate.style.display='none';
    authGate.style.display='grid';
    accountControls.style.display='none';
  }
  function showApp(user){
    lobbyGate.style.display='none';
    authGate.style.display='none';
    accountControls.style.display='flex';
    accountEmail.textContent=user.email||'로그인됨';
    accountEmail.title=user.email||'';
    syncStatus.textContent='동기화됨';
  }
  function userStorageKey(userId){return `${KEY}:user:${userId}`;}

  // 기존 회원용 프로필 등록/수정 UI. user_data의 학습 데이터는 변경하지 않고 profile 객체만 갱신합니다.
  let loadedProfile=null;
  let profilePrompt=null;
  let profileModal=null;
  function profileValue(value){return typeof value==='string'?value.trim():'';}
  function profileIsComplete(profile){
    return !!(profileValue(profile?.name)&&profileValue(profile?.nickname)&&profileValue(profile?.grade));
  }
  function ensureProfileUI(){
    if(!profilePrompt){
      profilePrompt=document.createElement('div');
      profilePrompt.id='studyFlowProfilePrompt';
      profilePrompt.className='sf-profile-prompt';
      profilePrompt.innerHTML='<div><strong>프로필을 등록해 주세요.</strong><p>이름과 닉네임, 학년을 등록하면 계정 프로필 기능을 이용할 수 있습니다.</p></div><button type="button" class="mini primary" id="sfProfilePromptOpen">프로필 등록</button>';
      const summary=document.querySelector('.profile-summary');
      if(summary)summary.insertAdjacentElement('afterend',profilePrompt);
      profilePrompt.querySelector('#sfProfilePromptOpen')?.addEventListener('click',()=>openProfileEditor());
    }
    if(!profileModal){
      const style=document.createElement('style');
      style.textContent='.sf-profile-prompt{display:none;align-items:center;justify-content:space-between;gap:14px;margin:14px 0;padding:14px 16px;border:1px solid var(--line,#293246);border-radius:14px;background:var(--panel2,#1b2231)}.sf-profile-prompt p{margin:5px 0 0;color:var(--muted,#9aa5ba);font-size:12px;line-height:1.5}.sf-profile-overlay{position:fixed;inset:0;z-index:10000;display:none;align-items:center;justify-content:center;padding:18px;background:rgba(5,8,14,.76);backdrop-filter:blur(6px)}.sf-profile-dialog{width:min(100%,440px);padding:22px;border:1px solid var(--line,#293246);border-radius:18px;background:var(--panel,#151a26);color:var(--text,#f3f5fa);box-shadow:0 24px 80px #0008}.sf-profile-dialog h3{margin:0 0 8px}.sf-profile-dialog p{font-size:12px;color:var(--muted,#9aa5ba);line-height:1.6}.sf-profile-dialog label{display:block;margin:13px 0 6px;font-size:12px}.sf-profile-dialog input,.sf-profile-dialog select{width:100%;box-sizing:border-box;padding:12px;border:1px solid var(--line,#293246);border-radius:10px;background:var(--bg,#0d1018);color:inherit;font:inherit}.sf-profile-actions{display:flex;gap:8px;margin-top:18px}.sf-profile-actions button{flex:1}.sf-profile-status{min-height:18px;margin-top:10px;font-size:12px;color:var(--muted,#9aa5ba)}@media(max-width:560px){.sf-profile-prompt{align-items:flex-start;flex-direction:column}.sf-profile-prompt button{width:100%}}';
      document.head.appendChild(style);
      profileModal=document.createElement('div');
      profileModal.className='sf-profile-overlay';
      profileModal.id='sfProfileOverlay';
      profileModal.innerHTML='<section class="sf-profile-dialog" role="dialog" aria-modal="true" aria-labelledby="sfProfileTitle"><h3 id="sfProfileTitle">프로필 등록</h3><p>프로필 정보만 저장합니다. 기존 학습 기록과 계정 데이터는 그대로 유지됩니다.</p><form id="sfProfileForm"><label for="sfProfileName">이름</label><input id="sfProfileName" maxlength="40" autocomplete="name" required><label for="sfProfileNickname">닉네임</label><input id="sfProfileNickname" maxlength="24" autocomplete="nickname" required><label for="sfProfileGrade">학년</label><select id="sfProfileGrade" required><option value="">학년 선택</option><option>중학교 1학년</option><option>중학교 2학년</option><option>중학교 3학년</option><option>고등학교 1학년</option><option>고등학교 2학년</option><option>고등학교 3학년</option><option>N수생</option><option>대학생</option><option>직장인</option><option>기타</option></select><div class="sf-profile-status" id="sfProfileStatus" aria-live="polite"></div><div class="sf-profile-actions"><button type="button" class="mini" id="sfProfileCancel">취소</button><button type="submit" class="mini primary" id="sfProfileSave">저장</button></div></form></section>';
      document.body.appendChild(profileModal);
      profileModal.addEventListener('click',e=>{if(e.target===profileModal)closeProfileEditor();});
      profileModal.querySelector('#sfProfileCancel').addEventListener('click',closeProfileEditor);
      profileModal.querySelector('#sfProfileForm').addEventListener('submit',saveProfileForm);
    }
    const editButton=document.getElementById('myPageProfileEditBtn');
    if(editButton&&!editButton.dataset.sfProfileBound){
      editButton.dataset.sfProfileBound='1';
      editButton.addEventListener('click',()=>openProfileEditor());
    }
  }
  async function refreshProfile(){
    if(!currentUser||!supabaseClient)return;
    ensureProfileUI();
    const {data:row,error}=await supabaseClient.from('profiles').select('id,name,nickname,nickname_lower,grade').eq('id',currentUser.id).maybeSingle();
    if(error){console.warn('STUDY FLOW profile fetch:',error);loadedProfile=null;}
    else loadedProfile=row||null;
    const prompt=document.getElementById('studyFlowProfilePrompt');
    if(prompt)prompt.style.display=profileIsComplete(loadedProfile)?'none':'flex';
    if(typeof renderMyPage==='function')renderMyPage();
  }
  function openProfileEditor(){
    if(!currentUser){toast('프로필을 등록하려면 먼저 로그인해 주세요.');return;}
    ensureProfileUI();
    const legacy=data?.profile||{};
    const profile=loadedProfile||{};
    const metadata=currentUser.user_metadata||{};
    document.getElementById('sfProfileName').value=profileValue(profile.name)||profileValue(legacy.name)||profileValue(metadata.name);
    document.getElementById('sfProfileNickname').value=profileValue(profile.nickname)||profileValue(legacy.nickname)||profileValue(metadata.nickname);
    document.getElementById('sfProfileGrade').value=profileValue(profile.grade)||profileValue(legacy.grade)||profileValue(metadata.grade);
    document.getElementById('sfProfileStatus').textContent='';
    document.getElementById('sfProfileTitle').textContent=profileIsComplete(profile)?'프로필 수정':'프로필 등록';
    profileModal.style.display='flex';
    document.getElementById('sfProfileName').focus();
  }
  function closeProfileEditor(){if(profileModal)profileModal.style.display='none';}
  async function saveProfileForm(event){
    event.preventDefault();
    if(!currentUser||!supabaseClient)return;
    const name=profileValue(document.getElementById('sfProfileName').value);
    const nickname=profileValue(document.getElementById('sfProfileNickname').value);
    const grade=profileValue(document.getElementById('sfProfileGrade').value);
    const status=document.getElementById('sfProfileStatus');
    const saveButton=document.getElementById('sfProfileSave');
    if(!name||!nickname||!grade){status.textContent='이름, 닉네임, 학년을 모두 입력해 주세요.';return;}
    if(nickname.length<2||nickname.length>24){status.textContent='닉네임은 2~24자로 입력해 주세요.';return;}
    saveButton.disabled=true;saveButton.textContent='저장 중…';status.textContent='닉네임을 확인하고 프로필을 저장합니다.';
    try{
      const nicknameLower=nickname.toLowerCase();
      const currentNickname=profileValue(loadedProfile?.nickname).toLowerCase();
      if(nicknameLower!==currentNickname){
        const {data:available,error:checkError}=await supabaseClient.rpc('is_nickname_available',{candidate_nickname:nickname});
        if(checkError)throw new Error('닉네임 중복 확인에 실패했습니다. SQL 함수 설정을 확인해 주세요.');
        if(available!==true){status.textContent='이미 사용 중인 닉네임입니다. 다른 닉네임을 입력해 주세요.';return;}
      }
      const profileRecord={id:currentUser.id,name,nickname,nickname_lower:nicknameLower,grade};
      const {error}=await supabaseClient.from('profiles').upsert(profileRecord,{onConflict:'id'});
      if(error){
        if(error.code==='23505')throw new Error('이미 사용 중인 닉네임입니다. 다른 닉네임을 입력해 주세요.');
        throw error;
      }
      loadedProfile=profileRecord;
      // user_data.data.profile은 화면/기존 앱 호환을 위한 캐시. 다른 학습 데이터는 보존.
      data.profile={...(data.profile||{}),name,nickname,grade};
      await saveToCloud();
      localStorage.setItem(userStorageKey(currentUser.id),JSON.stringify(data));
      const prompt=document.getElementById('studyFlowProfilePrompt');
      if(prompt)prompt.style.display='none';
      closeProfileEditor();
      if(typeof renderMyPage==='function')renderMyPage();
      toast('프로필을 저장했어요.');
    }catch(err){
      console.error('STUDY FLOW profile save:',err);
      status.textContent=err.message||'프로필 저장에 실패했습니다. 잠시 후 다시 시도해 주세요.';
    }finally{saveButton.disabled=false;saveButton.textContent='저장';}
  }

  async function loadUserData(user){
    if(!user||loadingUser)return;
    if(currentUser&&currentUser.id===user.id){showApp(user);return;}
    loadingUser=true;
    message('');
    try{
      const {data:row,error}=await supabaseClient
        .from('user_data').select('data').eq('user_id',user.id).maybeSingle();
      if(error)throw error;

      if(row&&row.data&&typeof row.data==='object'){
        data=normalizeData(row.data);
      }else{
        const alreadyMigrated=localStorage.getItem(LEGACY_MIGRATED_KEY)==='1';
        const legacyRaw=alreadyMigrated?null:localStorage.getItem(KEY);
        if(legacyRaw){
          try{data=normalizeData(JSON.parse(legacyRaw));}
          catch{data=defaultData();}
        }else{
          data=defaultData();
        }
        const {error:insertError}=await supabaseClient.from('user_data').upsert({
          user_id:user.id,data,updated_at:new Date().toISOString()
        },{onConflict:'user_id'});
        if(insertError)throw insertError;
        if(legacyRaw)localStorage.setItem(LEGACY_MIGRATED_KEY,'1');
      }

      currentUser=user;
      window.studyFlowAccountEmail=user.email||'로그인 계정';
      window.studyFlowAccountId=user.id||'';
      // 기존 클라우드 데이터에 남아 있던 인증키를 정리한 안전한 데이터로 즉시 덮어씀
      await saveToCloud();
      localStorage.setItem(userStorageKey(user.id),JSON.stringify(data));
      selectedBlockId=null;selectedSlot=null;clipboardBlock=null;pasteTarget=null;
      buildViewOptions();
      render();
      showApp(user);
      renderMyPage();
      await refreshProfile();
      toast('계정 데이터를 불러왔어요.');
    }catch(err){
      console.error('ROUTEN data load error:',err);
      currentUser=null;
      showGate();
      message('데이터를 불러오지 못했어요. 네트워크와 Supabase RLS 설정을 확인해 주세요.',true);
    }finally{loadingUser=false;}
  }

  async function saveToCloud(){
    if(!currentUser)return;
    const user=currentUser;
    syncStatus.textContent='저장 중…';
    const snapshot=JSON.parse(JSON.stringify(data));
    if(snapshot.schoolTimetable)delete snapshot.schoolTimetable.apiKey;
    const {error}=await supabaseClient.from('user_data').upsert({
      user_id:user.id,data:snapshot,updated_at:new Date().toISOString()
    },{onConflict:'user_id'});
    if(error){
      console.error('ROUTEN cloud save error:',error);
      if(currentUser&&currentUser.id===user.id)syncStatus.textContent='저장 오류';
      toast('클라우드 저장에 실패했어요. 인터넷 연결을 확인해 주세요.');
    }else if(currentUser&&currentUser.id===user.id){
      syncStatus.textContent='동기화됨';
    }
  }

  function queueCloudSave(){
    if(!currentUser)return;
    localStorage.setItem(userStorageKey(currentUser.id),JSON.stringify(data));
    syncStatus.textContent='변경됨';
    clearTimeout(saveTimer);
    saveTimer=setTimeout(saveToCloud,700);
  }

  // 기존 save()를 확장해 기존 렌더링 동작을 유지하면서 계정별 저장을 추가합니다.
  save=function(){
    if(currentUser){
      localStorage.setItem(userStorageKey(currentUser.id),JSON.stringify(data));
      queueCloudSave();
    }else{
      // 인증 전에는 기존 로컬 데이터에 접근하거나 덮어쓰지 않습니다.
    }
    render();
  };

  document.querySelectorAll('[data-open-auth]').forEach(button=>{
    button.addEventListener('click',()=>{
      isSignUp=button.dataset.openAuth==='signup';
      authHeading.textContent=isSignUp?'회원가입':'로그인';
      authSubmit.textContent=isSignUp?'회원가입':'로그인';
      authSwitch.textContent=isSignUp?'이미 계정이 있으신가요? 로그인':'계정이 없으신가요? 회원가입';
      authPassword.autocomplete=isSignUp?'new-password':'current-password';
      showNormalAuth();
      message('');
      showGate();
    });
  });
  document.getElementById('authBackToLobby').addEventListener('click',showLobby);

  authSwitch.addEventListener('click',()=>{
    isSignUp=!isSignUp;
    authHeading.textContent=isSignUp?'회원가입':'로그인';
    authSubmit.textContent=isSignUp?'회원가입':'로그인';
    authSwitch.textContent=isSignUp?'이미 계정이 있으신가요? 로그인':'계정이 없으신가요? 회원가입';
    authPassword.autocomplete=isSignUp?'new-password':'current-password';
    showNormalAuth();
    message('');
  });

  forgotPassword.addEventListener('click',async()=>{
    const email=document.getElementById('authEmail').value.trim();
    if(!email){message('먼저 가입한 이메일 주소를 입력해 주세요.',true);document.getElementById('authEmail').focus();return;}
    if(!supabaseClient){message('인증 서비스를 불러오는 중이에요. 잠시 후 다시 시도해 주세요.',true);return;}
    forgotPassword.disabled=true;
    try{
      const redirectTo=window.location.origin+window.location.pathname;
      const {error}=await supabaseClient.auth.resetPasswordForEmail(email,{redirectTo});
      if(error)throw error;
      message('비밀번호 재설정 링크를 이메일로 보냈어요. 받은 편지함과 스팸함을 확인해 주세요.');
    }catch(err){
      console.error('ROUTEN password reset request error:',err);
      message(err.message||'재설정 이메일을 보내지 못했어요.',true);
    }finally{forgotPassword.disabled=false;}
  });

  recoveryForm.addEventListener('submit',async e=>{
    e.preventDefault();
    const password=document.getElementById('newPassword').value;
    const confirmation=document.getElementById('confirmNewPassword').value;
    if(password.length<8){message('비밀번호는 8자 이상 입력해 주세요.',true);return;}
    if(password!==confirmation){message('새 비밀번호가 서로 일치하지 않아요.',true);return;}
    const submit=document.getElementById('recoverySubmit');
    submit.disabled=true;submit.textContent='변경 중…';
    try{
      const {data:result,error}=await supabaseClient.auth.updateUser({password});
      if(error)throw error;
      document.getElementById('newPassword').value='';
      document.getElementById('confirmNewPassword').value='';
      isSignUp=false;
      authPassword.value='';
      // 비밀번호 변경 직후 복구 세션을 종료하고 로그인 화면으로 이동
      const {error:signOutError}=await supabaseClient.auth.signOut({scope:'local'});
      if(signOutError)throw signOutError;
      showNormalAuth();
      showGate();
      message('비밀번호가 변경됐어요. 새 비밀번호로 로그인해 주세요.');
    }catch(err){
      console.error('ROUTEN password update error:',err);
      message(err.message||'비밀번호 변경에 실패했어요. 재설정 링크가 만료됐는지 확인해 주세요.',true);
    }finally{submit.disabled=false;submit.textContent='비밀번호 변경';}
  });

  authForm.addEventListener('submit',async e=>{
    e.preventDefault();
    if(!supabaseClient)return message('인증 서비스를 불러오는 중이에요. 잠시 후 다시 시도해 주세요.',true);
    const email=document.getElementById('authEmail').value.trim();
    const password=authPassword.value;
    if(password.length<8)return message('비밀번호는 8자 이상 입력해 주세요.',true);
    setBusy(true);message('');
    try{
      if(isSignUp){
        const {data:result,error}=await supabaseClient.auth.signUp({
          email,password,options:{emailRedirectTo:SUPABASE_URL.replace('https://ravpqvaosmulgddearso.supabase.co','https://my-site-2vt.pages.dev')}
        });
        if(error)throw error;
        if(result.session){
          await loadUserData(result.user);
        }else{
          message('가입 요청이 완료됐어요. 이메일 인증 링크를 확인한 뒤 로그인해 주세요.');
          isSignUp=false;
          authHeading.textContent='로그인';
          authSubmit.textContent='로그인';
          authSwitch.textContent='계정이 없으신가요? 회원가입';
          authPassword.value='';
        }
      }else{
        const {data:result,error}=await supabaseClient.auth.signInWithPassword({email,password});
        if(error)throw error;
        await loadUserData(result.user);
      }
    }catch(err){
      console.error('ROUTEN auth error:',err);
      message(err.message||'인증 중 문제가 발생했어요.',true);
    }finally{setBusy(false);}
  });

  document.getElementById('logoutBtn').addEventListener('click',async()=>{
    if(!confirm('로그아웃할까요? 저장되지 않은 변경 사항이 있다면 잠시 기다려 주세요.'))return;
    if(saveTimer){clearTimeout(saveTimer);await saveToCloud();}
    const {error}=await supabaseClient.auth.signOut();
    if(error){toast('로그아웃에 실패했어요.');return;}
    currentUser=null;
    window.studyFlowAccountEmail='';
    window.studyFlowAccountId='';
    data=defaultData();
    render();
    showLobby();
  });

  async function initAuth(){
    try{
      if(!window.supabase||!window.supabase.createClient)throw new Error('Supabase 라이브러리를 불러오지 못했어요.');
      supabaseClient=window.supabase.createClient(SUPABASE_URL,SUPABASE_PUBLISHABLE_KEY);
      window.studyFlowUpdatePassword=async function(password){
        const {error}=await supabaseClient.auth.updateUser({password});
        return {error:error?error.message:null};
      };
      // NEIS 호출은 브라우저에서 직접 하지 않고 school-api Edge Function으로 전달
      window.studyFlowCallSchoolApi=async function(payload){
        const {data:sessionResult,error:sessionError}=await supabaseClient.auth.getSession();
        if(sessionError)throw new Error('로그인 세션을 확인하지 못했습니다.');
        const accessToken=sessionResult?.session?.access_token;
        if(!accessToken)throw new Error('로그인이 필요합니다. 다시 로그인해 주세요.');
        const response=await fetch(`${SUPABASE_URL}/functions/v1/school-api`,{
          method:'POST',
          headers:{
            'Content-Type':'application/json',
            'apikey':SUPABASE_PUBLISHABLE_KEY,
            'Authorization':`Bearer ${accessToken}`
          },
          body:JSON.stringify(payload)
        });
        const raw=await response.text();
        let result;
        try{result=JSON.parse(raw);}catch(e){throw new Error(`학교 서버 응답을 읽지 못했습니다. HTTP ${response.status}`);}
        if(!response.ok)throw new Error(result?.error||`학교 서버 요청 실패 (HTTP ${response.status})`);
        return result;
      };
      const recoveryRedirect=window.location.hash.includes('type=recovery')||new URLSearchParams(window.location.search).get('type')==='recovery';
      // 세션 조회 전에 인증 이벤트를 구독해야 이메일 복구 링크 이벤트를 놓치지 않음
      supabaseClient.auth.onAuthStateChange((event,session)=>{
        if(event==='PASSWORD_RECOVERY'){
          setTimeout(()=>{showRecoveryForm();showGate();},0);
        }else if(event==='SIGNED_IN'&&session?.user&&!recoveryMode&&!recoveryRedirect){
          setTimeout(()=>loadUserData(session.user),0);
        }else if(event==='SIGNED_OUT'){
          currentUser=null;
          window.studyFlowAccountEmail='';
          window.studyFlowAccountId='';
          if(!recoveryMode)showLobby();
        }
      });
      const {data:sessionData,error}=await supabaseClient.auth.getSession();
      if(error)throw error;
      if(recoveryRedirect){
        showRecoveryForm();
        showGate();
      }else if(sessionData.session?.user){
        await loadUserData(sessionData.session.user);
      }else{
        showLobby();
      }
    }catch(err){
      console.error('ROUTEN Supabase init error:',err);
      showLobby();
      message('Supabase 연결에 실패했어요. 로그인 시 연결 상태를 확인해 주세요.',true);
    }
  }

  // 기존 앱은 먼저 렌더링되지만 인증 오버레이가 데이터를 가립니다.
  setActivePage((()=>{try{return sessionStorage.getItem("study-flow-active-page")||"home";}catch(e){return "home";}})());
  schedulePhoneEditMode=false;
  updatePhoneScheduleModeUI();
  window.addEventListener('resize',()=>{
    if(!isPhoneSchedule())schedulePhoneEditMode=false;
    updatePhoneScheduleModeUI();
    renderSchedule();
  });
  initSchoolTimetable();
  showLobby();
  initAuth();
})();
