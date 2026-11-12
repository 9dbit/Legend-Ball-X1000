/* LEGEND BALL X1000: presentation-only cinematic events.
 * Skygate's RNG, payouts, bonus and credit settlement MUST NOT depend on this file.
 * User-supplied scene references are staging-only until rights/IP clearance. */
(() => {
  'use strict';
  const assets=[
    {id:'ember-warrior',url:'/play/assets/legend-cinematics/scene-ember-warrior.webp'},
    {id:'crimson-dragon',url:'/play/assets/legend-cinematics/scene-crimson-dragon.webp'},
    {id:'celestial-temple',url:'/play/assets/legend-cinematics/scene-celestial-temple.webp'}
  ];
  let scene=null,stack=null,flash=null,active=0,spins=0,ready=false,transitioning=false;
  const timers=new Set();
  const reduce=()=>document.hidden||window.matchMedia('(prefers-reduced-motion: reduce)').matches||document.getElementById('batterySetting')?.checked;
  function schedule(fn,delay){
    const t=setTimeout(()=>{timers.delete(t);fn();},delay);
    timers.add(t);
    return t;
  }
  function loadScene(){
    if(scene?.isConnected)return scene;
    scene=document.querySelector('.legend-scene');
    return scene;
  }
  function mount(){
    const host=loadScene();
    if(!host || host.querySelector('.legend-world-stack'))return;
    stack=document.createElement('div');
    stack.className='legend-world-stack';
    stack.setAttribute('aria-hidden','true');
    assets.forEach((item,i)=>{
      const img=document.createElement('img');
      img.className='legend-world-image'+(i===0?' active':'');
      img.dataset.world=item.id;
      img.src=item.url;
      img.alt='';
      img.decoding='async';
      img.loading=i===0?'eager':'lazy';
      img.addEventListener('load',()=>{
        if(i===0){host.classList.add('legend-world-ready');ready=true;}
      });
      img.addEventListener('error',()=>{
        if(i===0){ready=false;host.classList.remove('legend-world-ready');}
      });
      stack.append(img);
    });
    host.prepend(stack);
    flash=document.createElement('div');
    flash.className='legend-lightning-flash';
    flash.setAttribute('aria-hidden','true');
    flash.innerHTML='<svg viewBox="0 0 1000 1920" preserveAspectRatio="none" aria-hidden="true"><path class="legend-bolt-core" d="M818 -50 690 230 770 370 561 620 651 773 410 1112 458 1224 320 1570 440 1764 312 1960"/><path class="legend-bolt-branch" d="M561 620 360 550 252 670M410 1112 208 1078 89 1250M651 773 820 879 903 1031M320 1570 140 1634 80 1710"/></svg>';
    host.append(flash);
    window.dispatchEvent(new CustomEvent('legend:cinematics-ready',{detail:{scenes:assets.map(x=>x.id)}}));
  }
  function swapScene(next){
    if(!scene||!stack||!ready)return;
    const images=stack.querySelectorAll('img');
    const proposed=((next%images.length)+images.length)%images.length;
    const target=images[proposed];
    if(!target?.complete||!target.naturalWidth)return;
    images.forEach((img,i)=>img.classList.toggle('active',i===proposed));
    active=proposed;
    scene.dataset.world=assets[proposed].id;
  }
  function lightning(next=active+1){
    mount();
    if(!scene||!ready||transitioning)return false;
    if(reduce()){swapScene(next);return true;}
    transitioning=true;
    scene.classList.remove('legend-striking');
    void scene.offsetWidth;
    scene.classList.add('legend-striking');
    // The scene changes behind the blinding white strike peak.
    schedule(()=>swapScene(next),154);
    schedule(()=>{scene?.classList.remove('legend-striking');transitioning=false;},630);
    return true;
  }
  function awaken(duration=1300){
    mount();
    if(!scene||reduce())return;
    scene.classList.remove('legend-awakened');
    void scene.offsetWidth;
    scene.classList.add('legend-awakened');
    schedule(()=>scene?.classList.remove('legend-awakened'),duration);
  }
  function spinStart(){
    mount();
    if(!scene)return;
    spins++;
    scene.classList.add('legend-velocity');
    if(spins>1&&spins%4===0)lightning(active+1);
  }
  function spinStop(){scene?.classList.remove('legend-velocity');}
  function multiplier(value){
    mount();
    if(!scene)return;
    scene.dataset.multiplier=String(value||'');
    awaken(1450);
    lightning(active+1);
  }
  function bonus(){
    mount();
    awaken(1800);
    lightning(active+1);
  }
  function bigWin(){
    mount();
    awaken(1700);
    lightning(active+1);
  }
  function energyBlast(positions,grid){
    if(reduce()||!grid?.isConnected||!positions?.length)return;
    const layer=document.createElement('div');
    layer.className='legend-blast-overlay';
    layer.setAttribute('aria-hidden','true');
    // Cap additional DOM/VFX work; the source reel cascade animation owns the result.
    const cw=grid.clientWidth/6,ch=grid.clientHeight/5;
    positions.slice(0,8).forEach((cell,i)=>{
      if(!Number.isInteger(cell)||cell<0||cell>=30)return;
      const ring=document.createElement('span');
      ring.className='legend-blast-ring';
      ring.style.left=((cell%6+.5)*cw)+'px';
      ring.style.top=((Math.floor(cell/6)+.5)*ch)+'px';
      ring.style.setProperty('--burst-delay',(i%3*38)+'ms');
      layer.append(ring);
    });
    grid.append(layer);
    schedule(()=>layer.remove(),850);
  }
  function destroy(){
    for(const t of timers)clearTimeout(t);
    timers.clear();scene?.classList.remove('legend-velocity','legend-striking','legend-awakened');
    stack?.remove();flash?.remove();stack=null;flash=null;scene=null;ready=false;transitioning=false;
  }
  document.addEventListener('visibilitychange',()=>{
    if(document.hidden){scene?.classList.remove('legend-velocity','legend-striking','legend-awakened');transitioning=false;}
  });
  window.LegendCinematics=Object.freeze({
    mount,lightning,spinStart,spinStop,multiplier,bonus,bigWin,energyBlast,destroy,
    getStatus:()=>({ready,active,scene:assets[active].id,spins,transitioning,worldCount:assets.length})
  });
})();
