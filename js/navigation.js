/* 문서 전체에서 감지하는 좌우 스와이프 메뉴 전환 (iPad Safari 안정화) */
(()=>{
  const pages=['home','weekly','learning','analytics','settings'];
  const ignoreSelector='button,a,input,textarea,select,[contenteditable="true"],.schedule-scroll,.week-grid,.school-week-table,.table-wrap,.calendar-nav,.modal,.modal-backdrop';
  let touchX=0,touchY=0,touchActive=false,touchAllowed=false;
  let mouseX=0,mouseY=0,mouseActive=false,mouseAllowed=false;

  function switchPage(dx,dy,allowed){
    if(!allowed||Math.abs(dx)<60||Math.abs(dx)<Math.abs(dy)*1.25)return;
    const active=document.querySelector('.nav-item.active');
    const current=active?.dataset.page||'home';
    const idx=pages.indexOf(current);
    if(idx<0)return;
    const next=dx<0?Math.min(idx+1,pages.length-1):Math.max(idx-1,0);
    if(next===idx)return;
    const shell=document.querySelector('.app-layout')||document.querySelector('.app');
    shell?.classList.remove('menu-swipe-forward','menu-swipe-backward');
    shell?.classList.add('menu-swipe-changing',dx<0?'menu-swipe-forward':'menu-swipe-backward');
    setActivePage(pages[next]);
    window.setTimeout(()=>{
      shell?.classList.remove('menu-swipe-changing','menu-swipe-forward','menu-swipe-backward');
    },290);
  }

  /* Capture at document level: also works when a swipe begins outside main-content */
  document.addEventListener('touchstart',e=>{
    if(e.touches.length!==1){touchActive=false;return;}
    const target=e.target instanceof Element?e.target:null;
    touchAllowed=!!target&&!target.closest(ignoreSelector);
    touchX=e.touches[0].clientX;touchY=e.touches[0].clientY;
    touchActive=true;
  },{capture:true,passive:true});
  document.addEventListener('touchend',e=>{
    if(!touchActive)return;
    touchActive=false;
    const t=e.changedTouches&&e.changedTouches[0];
    if(t)switchPage(t.clientX-touchX,t.clientY-touchY,touchAllowed);
    touchAllowed=false;
  },{capture:true,passive:true});
  document.addEventListener('touchcancel',()=>{touchActive=false;touchAllowed=false;},{capture:true,passive:true});

  /* Desktop mouse drag */
  document.addEventListener('pointerdown',e=>{
    if(e.pointerType==='touch'||e.button!==0)return;
    const target=e.target instanceof Element?e.target:null;
    mouseAllowed=!!target&&!target.closest(ignoreSelector);
    mouseX=e.clientX;mouseY=e.clientY;mouseActive=true;
  },{capture:true,passive:true});
  document.addEventListener('pointerup',e=>{
    if(!mouseActive)return;
    mouseActive=false;
    switchPage(e.clientX-mouseX,e.clientY-mouseY,mouseAllowed);
    mouseAllowed=false;
  },{capture:true,passive:true});
  document.addEventListener('pointercancel',()=>{mouseActive=false;mouseAllowed=false;},{capture:true,passive:true});
})();
