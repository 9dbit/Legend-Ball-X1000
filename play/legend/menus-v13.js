/* Legend Ball X1000 V13 menu presentation contract: no game-state writes. */
(() => {
  'use strict';
  const $ = id => document.getElementById(id);
  const rangeIds = ['volumeRange', 'autoCount'];
  function renderRange(id) {
    const el = $(id);
    if (!el) return;
    const min=Number(el.min)||0, max=Number(el.max)||100, value=Number(el.value)||0;
    const fill = max>min ? Math.max(0,Math.min(100,((value-min)/(max-min))*100)) : 0;
    el.style.setProperty('--legend-range-fill',fill.toFixed(2)+'%');
  }
  for(const id of rangeIds) {
    const el=$(id);
    if(!el)continue;
    el.addEventListener('input',()=>renderRange(id));
    el.addEventListener('change',()=>renderRange(id));
  }
  const ruleDetails=$('paytableDetails');
  $('payInfo')?.addEventListener('click',()=>{
    if(ruleDetails)ruleDetails.open=true;
  },{capture:true});
  for(const [id,range] of [['menuDialog','volumeRange'],['autoDialog','autoCount']]){
    const dialog=$(id);
    dialog?.addEventListener('close',()=>{dialog.scrollTop=0;});
    dialog?.addEventListener('click',()=>renderRange(range),{passive:true});
    dialog?.addEventListener('toggle',()=>renderRange(range));
  }
  const sync=()=>rangeIds.forEach(renderRange);
  sync();
  window.LegendMenuV13={syncRange:sync,version:'13'};
})();
