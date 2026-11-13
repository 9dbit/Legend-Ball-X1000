/* Keep the published scene concealed until the game is initialized and Play is tapped. */
(() => {
  'use strict';
  const root=document.documentElement, splash=document.getElementById('bootSplash');
  const play=document.getElementById('bootPlay'), retry=document.getElementById('bootRetry');
  const status=document.getElementById('bootStatus'), progress=document.getElementById('bootProgress');
  let state='loading', timer;
  function fail(error){
    if(state==='entered'||state==='error')return;
    clearTimeout(timer);state='error';root.dataset.boot=state;
    status.textContent='Game belum dapat dimuat. Periksa koneksi lalu coba lagi.';
    play.hidden=true;retry.hidden=false;progress.hidden=true;
    console.error('Legend Ball loading failed:',error);
  }
  function enter(event){
    if(state!=='ready')return;
    state='entered';root.dataset.boot=state;splash.hidden=true;
    document.querySelector('.game').inert=false;
    // A real splash tap starts the existing game audio path synchronously.
    // Its handler unlocks Web Audio before fetching/decoding the Studio BGM.
    // Reuse that one mixer and its published track settings, not a second player.
    // Studio previews enter without a gesture and must remain silent.
    if(event?.isTrusted&&!window.SkygatePreview){
      try{
        const sound=document.getElementById('sound');
        if(sound&&!sound.disabled&&sound.getAttribute('aria-pressed')!=='true')sound.click();
      }catch(error){
        // An audio problem must never block gameplay or the manual retry control.
        console.error('Legend Ball audio activation failed:',error);
      }
    }
    window.SkygateRefitText?.();
    if(!window.SkygatePreview)document.getElementById('spin').focus({preventScroll:true});
  }
  play.addEventListener('click',enter);
  retry.addEventListener('click',()=>window.location.reload());
  // This watchdog protects release/game initialization failures, not slow artwork.
  timer=setTimeout(()=>fail(Error('Loading timeout')),30000);

  // Only visible splash art and the main scene backdrop/brand are first-paint
  // candidates. Never decode the reel tile bank or auxiliary artwork to unlock PLAY.
  function critical(images){
    return [...new Set(images)].filter(image=>{
      if(image.matches?.('.cascade-fx, .firework-flare')||image.closest?.('.tile'))return false;
      const layer=image.closest?.('.published-layer');
      if(layer?.style?.display==='none')return false;
      return !!(image.closest?.('#bootSplash, .hero, .published-layer[data-layer="sky"], .published-layer[data-layer="logo"]')||
        image.matches?.('.pwa-stage-background, .splash-background'));
    });
  }

  // Safari can leave HTMLImageElement.decode() pending indefinitely, even when
  // the image is already downloaded. A decode failure is not a game-init failure.
  // The browser keeps decoding art progressively after this bounded wait.
  function waitForFirstPaint(images){
    const unique=[...new Set(images)];
    if(!unique.length)return Promise.resolve();
    return new Promise(resolve=>{
      let done=false;
      const finish=()=>{
        if(done)return;
        done=true;clearTimeout(limit);resolve();
      };
      const limit=setTimeout(finish,1800);
      const decodes=unique.map(image=>Promise.resolve().then(()=>image.decode?.()));
      void Promise.allSettled(decodes).then(finish);
    });
  }

  window.SkygateBoot={fail,critical,async ready(images,sources=[]){
    // The sheet and initialized game are essential. Extra images and web fonts
    // are visual enhancements, never conditions for entering the game.
    if(!document.getElementById('gameStyles')?.sheet)throw Error('Game stylesheet unavailable');
    const extra=[...new Set(sources)].map(src=>{const image=new Image();image.src=src;return image;});
    void Promise.allSettled(extra.map(image=>Promise.resolve().then(()=>image.decode?.())));
    await waitForFirstPaint(images||[]);
    if(document.fonts?.ready){
      void Promise.resolve(document.fonts.ready).then(()=>window.SkygateRefitText?.()).catch(()=>{});
    }
    if(state!=='loading')throw Error('Loading expired');
    clearTimeout(timer);state='ready';root.dataset.boot=state;
    status.textContent='Siap memasuki LEGEND BALL';progress.hidden=true;play.disabled=false;
    if(window.SkygatePreview)enter();
  }};
})();
