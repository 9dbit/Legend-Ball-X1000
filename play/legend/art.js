/* Visual-only PNG catalog; uploaded assets remain authoritative. */
(() => {
 'use strict';
 const names=['crown','hourglass','ring','chalice','ruby','amethyst','topaz','emerald','sapphire','amber','pearl'];
 const balls=Object.freeze(['PYRA','NERIS','VOLTRA','TERRAK','SOLUNE','AETHER']);
 const resolve=(path,resolver)=>resolver?resolver(path):'/play/assets/'+path;
 const sprite=(kind,column=0,resolver)=>{
  const col=Number.isInteger(column)?Math.max(0,Math.min(5,column)):0;
  const file=kind==='scatter'?'scatter-'+(col+1):kind==='orb'?'multiplier':'symbol-'+({amber:'hourglass',pearl:'chalice'}[kind]||kind);
  return resolve('legend-raster/'+file+'.png',resolver);
 };
 window.LegendBallArt=Object.freeze({version:2,format:'png',balls,sprite,logo:'/play/assets/legend-raster/logo.png',hero:'/play/assets/legend-raster/hero.png',textures:resolver=>[...names.map(n=>sprite(n,0,resolver)),sprite('orb',0,resolver),...balls.map((_,i)=>sprite('scatter',i,resolver))]});
})();
