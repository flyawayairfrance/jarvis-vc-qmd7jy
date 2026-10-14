/* Visual only: retrigger the 250ms section transition whenever any .tab gains .on (tab clicks or Davos navigation). */
(function(){var rm=matchMedia('(prefers-reduced-motion: reduce)');
 function play(s){if(rm.matches)return;s.classList.add('mono-enter');void s.offsetWidth;s.classList.remove('mono-enter')}
 document.querySelectorAll('section.tab').forEach(function(s){var was=s.classList.contains('on');
  new MutationObserver(function(){var on=s.classList.contains('on');if(on&&!was){play(s);document.body.dataset.tab=s.id}was=on}).observe(s,{attributes:true,attributeFilter:['class']})});
 var a=document.querySelector('section.tab.on');if(a)document.body.dataset.tab=a.id;
})();
