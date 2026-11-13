/* Shared PNG scene renderer. Existing DOM controls, unchanged game mathematics. */
(() => {
  'use strict';
  const binding={reels:'reels',spinbutton:'spin',winamount:'win',credits:'credits',betlabel:'betText',autobtn:'auto',turbobtn:'turbo',menubtn:'menu',soundbtn:'sound',infobtn:'help',minusbtn:'minus',plusbtn:'plus',buybtn:'buyFeature',antebtn:'anteFeature',betmenu:'betMenu',hint:'playHint'};
  const circular=new Set(['spinbutton','autobtn','turbobtn','menubtn','soundbtn','infobtn','minusbtn','plusbtn','betmenu']);
  window.LegendBallApplyLayout=(project,asset)=>{
    const game=document.querySelector('.game');
    if(game.querySelector('.legend-scene'))return;
    const scene=document.createElement('div');scene.className='published-scene legend-scene';scene.dataset.artVersion='raster-v2';
    const nodes=Object.fromEntries(Object.entries(binding).map(([k,v])=>[k,document.getElementById(v)]));
    for(const layer of project.layers){
      const wrap=document.createElement('div');wrap.className='published-layer legend-layer';wrap.dataset.layer=layer.id;
      Object.assign(wrap.style,{left:layer.x/1080*100+'%',top:layer.y/1920*100+'%',width:layer.w/1080*100+'%',height:layer.h/1920*100+'%',zIndex:layer.z,opacity:layer.opacity/100,transform:`rotate(${layer.rotate||0}deg)`,display:layer.visible===false?'none':'',color:layer.color||'#fff0bd',fontSize:(layer.font||40)/1080*100+'cqw'});
      if(circular.has(layer.id)){
        wrap.classList.add(layer.id==='spinbutton'?'published-spin-circle':'published-mode-circle');
        wrap.style.height=layer.w/1080*100+'cqw';wrap.style.top=`calc(${(layer.y+layer.h/2)/1920*100}% - ${layer.w/1080*50}cqw)`;
      }
      // Locked master UI: preserve native clickable control while the approved
      // artwork supplies its visual surface. No screenshot replaces live DOM.
      if(circular.has(layer.id) && layer.id!=='spinbutton' && layer.asset) {
        const artImage=document.createElement('img');
        artImage.className='legend-master-control-image';
        artImage.src=asset(layer.asset);artImage.alt='';artImage.draggable=false;
        artImage.setAttribute('aria-hidden','true');
        wrap.classList.add('legend-master-control');
        wrap.append(artImage);
      }
      const node=nodes[layer.id];
      if(node){
        wrap.classList.add('legend-binding','legend-'+layer.id);wrap.append(node);
        if(layer.id==='reels'){wrap.classList.add('live-grid');const ribbon=document.getElementById('bonusRibbon');if(ribbon)wrap.append(ribbon);}
        if(layer.id==='spinbutton'){const frame=node.querySelector('.spin-frame');if(frame)frame.src=asset(layer.asset);node.querySelector('.spin-rotor')?.remove();}
        if(['credits','betlabel','winamount'].includes(layer.id)){
          const caption=document.createElement('span');caption.className='legend-value-caption';caption.textContent=layer.id==='credits'?'KREDIT VIRTUAL':layer.id==='betlabel'?'TOTAL BET':'WIN';wrap.prepend(caption);
        }
        if(['buybtn','antebtn'].includes(layer.id)&&layer.asset)node.style.setProperty('--legend-panel',`url(${JSON.stringify(asset(layer.asset))})`);
      }else if(layer.asset){
        wrap.classList.add('legend-art');const image=document.createElement('img');image.src=asset(layer.asset);image.alt=layer.name||'';image.draggable=false;image.decoding='async';
        if(layer.crop){const c=layer.crop;Object.assign(image.style,{position:'absolute',left:-c.x/c.w*100+'%',top:-c.y/c.h*100+'%',width:100/c.w+'%',height:100/c.h+'%',objectFit:'fill'});wrap.style.overflow='hidden';}
        wrap.append(image);
      }else if(layer.kind==='text'){wrap.classList.add('legend-copy');wrap.textContent=layer.text||'';}
      scene.append(wrap);
    }
    game.append(scene);game.classList.add('has-published-scene','legend-raster');
    const promo=document.getElementById('promoBadge');if(promo)promo.hidden=true;
    window.SkygateRefitText=()=>window.SkygateTextFit?.request(scene);window.addEventListener('resize',window.SkygateRefitText);window.SkygateRefitText();
  };
  window.LegendBallSyncChrome=(project,asset)=>{
    for(const host of document.querySelectorAll('[data-game-brand]')){
      const img=host.querySelector('img');if(img){img.src=asset(project.layers.find(l=>l.id==='logo')?.asset||'legend-raster/logo.png');img.alt='LEGEND BALL X1000';}host.querySelector('.brand-number')?.remove();
    }
    document.documentElement.style.setProperty('--sg-action-image',`url(${JSON.stringify(asset('legend-raster/panel.png'))})`);
  };
})();
