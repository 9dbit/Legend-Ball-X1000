/* Keep the published scene concealed until its images are decoded and Play is tapped. */
(() => {
  'use strict';
  const root=document.documentElement, splash=document.getElementById('bootSplash');
  const play=document.getElementById('bootPlay'), retry=document.getElementById('bootRetry');
  const status=document.getElementById('bootStatus'), progress=document.getElementById('bootProgress');
  let state='loading', timer;
  function fail(error){
    if(state==='entered'||state==='error')return;
    clearTimeout(timer);state='error';root.dataset.boot=state;
    status.textContent='Game belum dapat dimuat. Ketuk COBA LAGI atau buka di Safari.';
    play.hidden=true;retry.hidden=false;progress.hidden=true;
    console.error('Skygate loading failed:',error);
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
        console.error('Skygate audio activation failed:',error);
      }
    }
    window.SkygateRefitText?.();
    if(!window.SkygatePreview)document.getElementById('spin').focus({preventScroll:true});
  }
  play.addEventListener('click',enter);
  retry.addEventListener('click',()=>window.location.reload());
  timer=setTimeout(()=>fail(Error('Loading timeout')),30000);
  // Decode optimization: the GAME runtime is already initialized before
  // SkygateBoot.ready is invoked. Safari's HTMLImageElement.decode() can reject
  // for perfectly usable images or remain pending for offscreen/lazy art. It
  // MUST NEVER block ENTER or credit-safe game startup.
  function critical(images){
    return images.filter(image=>{
      if(image.matches?.('.cascade-fx, .firework-flare'))return false;
      if(image.closest?.('.tile[aria-hidden="true"]'))return false;
      const layer=image.closest?.('.published-layer');
      if(layer?.style?.display==='none')return false;
      // Decode decorative reel textures asynchronously after boot.
      if(image.closest?.('.reel-column'))return false;
      return true;
    });
  }
  function withTimeout(promise,delayMs){
    return new Promise(resolve=>{
      const timeout=setTimeout(()=>resolve(false),delayMs);
      Promise.resolve(promise).then(
        ()=>{clearTimeout(timeout);resolve(true);},
        ()=>{clearTimeout(timeout);resolve(false);}
      );
    });
  }
  function safeDecode(image){
    if(image.complete&&image.naturalWidth>0)return Promise.resolve();
    if(typeof image.decode==='function')return Promise.resolve().then(()=>image.decode());
    return new Promise(resolve=>{
      if(image.complete){resolve();return;}
      image.addEventListener('load',resolve,{once:true});
      image.addEventListener('error',resolve,{once:true});
    });
  }
  window.SkygateBoot={fail,critical,async ready(images,sources=[]){
    if(state!=='loading')return;
    // Only a bounded amount of first-paint art is worth waiting for. A slow
    // image is allowed to finish decoding in the background, without failure.
    const art=[...new Set(images)].filter(image=>image?.src);
    const extra=[...new Set(sources)].map(src=>{const image=new Image();image.src=src;return image;});
    void Promise.allSettled(extra.map(safeDecode));
    const settled=await withTimeout(Promise.allSettled(art.map(safeDecode)),5000);
    if(!settled)console.warn('Legend Ball: decorative image decode exceeded 5s; continuing to interactive game.');
    // Safari font loading can hang with network/power saver: timebox it too.
    if(document.fonts?.ready)await withTimeout(document.fonts.ready,1200);
    if(!document.getElementById('gameStyles')?.sheet)throw Error('Game stylesheet unavailable');
    if(document.querySelectorAll('.reel-column').length!==6)throw Error('Reel grid did not initialize');
    if(state!=='loading')return;
    clearTimeout(timer);state='ready';root.dataset.boot=state;
    status.textContent='Siap memasuki LEGEND BALL';progress.hidden=true;play.disabled=false;
    if(window.SkygatePreview)enter();
  }};
})();
