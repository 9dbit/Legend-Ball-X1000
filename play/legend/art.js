/* Legend Ball presentation catalog. No math changes, no outcome manipulation.
 * Six Scatter orbs vary by column only; all remain the same 'scatter' symbol kind.
 * Multiple Scatter tiles may still occur within one column under Skygate RNG. */
(() => {
  'use strict';
  const prefix='/play/legend/';
  const normal=['crown','hourglass','ring','chalice','ruby','amethyst','topaz','emerald','sapphire','orb','amber','pearl'];
  const aliases={amber:'ring',pearl:'chalice'};
  const balls=Object.freeze(['PYRA','NERIS','VOLTRA','TERRAK','SOLUNE','AETHER']);
  const sprite=(kind,column=0)=>{
    if(kind==='scatter')return prefix+'ball-'+(Math.max(0,Math.min(5,column))+1)+'.svg';
    return prefix+'symbol-'+(aliases[kind]||kind)+'.svg';
  };
  window.LegendBallArt=Object.freeze({
    version:1,
    logo:prefix+'logo.svg',
    hero:prefix+'scene.svg',
    balls,
    sprite,
    textures:()=>[...new Set(normal.map(n=>sprite(n))) ,...balls.map((_,i)=>sprite('scatter',i))]
  });
})();