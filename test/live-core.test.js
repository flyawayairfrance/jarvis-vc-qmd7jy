const L=require('../live-core.js'),assert=require('assert');let ok=0;const T=(n,f)=>{f();ok++;console.log('✓',n)};
const K=(rows,t0=1791849600,step=300)=>rows.map((r,i)=>({t:t0+i*step,o:r[0],h:r[1],l:r[2],c:r[3],v:r[4]??100}));
T('bullish FVG exact 3-candle rule + status',()=>{const c=K([[10,11,9,10.5],[10.5,14,10.4,13.8],[13.8,15,12,14.5],[14.5,15,11.5,14]]);const g=L.fvgs(c);assert.equal(g.length,1);assert.deepEqual([g[0].dir,g[0].bottom,g[0].top,g[0].i],['bull',11,12,1]);assert.equal(g[0].status,'partial')});
T('FVG not detected when wicks overlap',()=>{assert.equal(L.fvgs(K([[10,11,9,10.5],[10.5,14,10.4,13.8],[13.8,15,11,14.5]])).length,0)});
T('bearish FVG filled',()=>{const g=L.fvgs(K([[20,21,19,19.5],[19.5,19.6,16,16.2],[16.2,18,15,15.5],[15.5,21.5,15,21]]));assert.equal(g[0].dir,'bear');assert.deepEqual([g[0].bottom,g[0].top],[18,19]);assert.equal(g[0].status,'filled')});
T('swings (pivot k=2)',()=>{const s=L.swings(K([[1,2,0.5,1],[1,3,1,2],[2,5,2,4],[4,4,3,3.5],[3,3.5,1,2],[2,2.5,1.2,2],[2,3,1.5,2.5]]),2);assert.deepEqual(s.map(x=>[x.type,x.i,x.p]),[['H',2,5],['L',4,1]])});
const zig=[];let p=100;const legs=[[+1,8],[-1,5],[+1,8],[-1,5],[+1,8],[-1,14],[+1,5],[-1,8]];for(const [d,n] of legs)for(let i=0;i<n;i++){const o=p;p+=d*1;zig.push([o,Math.max(o,p)+0.2,Math.min(o,p)-0.2,p])}
const Z=K(zig);
T('structure: BOS up in uptrend, then CHoCH down',()=>{const st=L.structure(Z,3);const ev=st.events.map(e=>e.type+':'+e.dir);assert.ok(ev.includes('BOS:up'),ev);assert.ok(ev.includes('CHoCH:down'),ev);assert.equal(st.trend,'down')});
T('order block = last opposite candle before break',()=>{const st=L.structure(Z,3),ob=L.orderBlocks(Z,st);const bu=ob.find(o=>o.dir=='bull');assert.ok(bu);assert.ok(Z[bu.i].c<Z[bu.i].o)});
T('equal highs + sweep with close back inside',()=>{const c=K([[10,10.5,9.5,10],[10,11,9.8,10.8],[10.8,12,10.5,11],[11,11.5,10,10.2],[10.2,10.5,9,9.5],[9.5,11,9.2,10.5],[10.5,12.02,10.4,11.5],[11.5,11.6,10.2,10.4],[10.4,10.6,9.5,9.8],[9.8,10.5,9.4,10],[10,10.2,9.6,9.9],[9.9,12.6,9.8,11.7]]);
 const pools=L.liquidity(c,1,2),eqh=pools.find(x=>x.kind=='EQH');assert.ok(eqh&&Math.abs(eqh.p-12.02)<1e-9);const sw=L.sweeps(c,pools,c.length-1);assert.ok(sw.some(s=>s.kind=='EQH'&&s.extreme==12.6))});
T('previous day high/low',()=>{const c=K([[1,5,0,2],[2,3,1,2],[2,2.5,1.5,2]],1791849600-86400,43200);const pools=L.liquidity(c,1);assert.equal(pools.find(x=>x.kind=='PDH').p,5);assert.equal(pools.find(x=>x.kind=='PDL').p,0)});
T('VWAP volume-weighted and equal-weight fallback',()=>{const c=K([[1,2,0,1,1],[3,4,2,3,3]]);assert.equal(L.vwap(c).vwap,(1*1+3*3)/4);const c2=K([[1,2,0,1,0],[3,4,2,3,0]]);assert.equal(L.vwap(c2).vwap,2);assert.equal(L.vwap(c2).weighted,false)});
T('ATR Wilder on constant range',()=>{const a=L.atr(K(Array(30).fill([10,11,9,10])));assert.ok(Math.abs(a[29]-2)<1e-9)});
T('sizing NQ/ES/GC/forex',()=>{assert.deepEqual([L.size('NQ',100,90,500).qty,L.size('NQ',100,90,500).unit],[2,'NQ']);assert.equal(L.size('ES',7000,6990,250).unit,'MES');assert.equal(L.size('ES',7000,6990,250).qty,5);
 assert.equal(L.size('GOLD',4200,4195,500).qty,1);assert.equal(L.size('EURUSD',1.1,1.099,500).qty,5);assert.equal(L.size('USDJPY',150,149.8,500).pipValue,6.67)});
T('setup: no trade without MTF agreement, trade with R:R>=2 when sweep+agreement',()=>{const c=[];let q=100;for(let i=0;i<70;i++){const o=q;q+=Math.sin(i/4)*0.6+0.05;c.push([o,Math.max(o,q)+0.3,Math.min(o,q)-0.3,q])}
 const C=K(c);const a=L.analyse(C,{'1m':'up','5m':'up','15m':'up','1h':'up'});const A=a.atr,lo=Math.min(...C.slice(-20,-2).map(x=>x.l)),hi=Math.max(...C.slice(-30).map(x=>x.h));
 C[C.length-2]={...C[C.length-2],l:lo-0.4*A,c:lo+0.6*A,o:lo+0.3*A,h:lo+0.7*A};C[C.length-1]={...C[C.length-1],o:lo+0.6*A,c:lo+0.7*A,h:lo+0.8*A,l:lo+0.5*A};
 const pools=[{kind:'EQL',side:'sell',p:lo,i:C.length-5,swept:false},{kind:'PDH',side:'buy',p:lo+0.7*A+6*A,i:5,swept:false}];
 const a2={...L.analyse(C,{'1m':'up','5m':'up','15m':'up','1h':'up'}),pools,sweep:L.sweeps(C,pools,C.length-2),vwap:null};const s=L.setup(C,a2,'NQ',500);assert.ok(s,'expected setup');assert.equal(s.dir,'BUY');assert.ok(s.rr>=2);assert.ok(s.stop<lo-0.4*A);
 assert.equal(L.setup(C,{...a2,mtf:{'1m':'up','5m':'up','15m':'down','1h':'up'}},'NQ',500),null);
 assert.equal(L.setup(C,{...a2,pools:[pools[0],{...pools[1],p:lo+0.7*A+1*A}]},'NQ',500),null,'R:R<2 must not fire')});

T('RSI bounds and direction',()=>{const up=L.rsi(K(Array.from({length:40},(_,i)=>[i,i+1.2,i-.2,i+1]))),dn=L.rsi(K(Array.from({length:40},(_,i)=>[100-i,100-i+.2,100-i-1.2,100-i-1])));assert.ok(up[39]>90&&up[39]<=100);assert.ok(dn[39]<10&&dn[39]>=0)});
T('agg 5m -> 1h buckets',()=>{const h=L.agg(K(Array.from({length:24},(_,i)=>[i,i+1,i-1,i+.5]),1791849600,300),3600);assert.equal(h.length,2);assert.equal(h[0].o,0);assert.equal(h[0].h,12);assert.equal(h[0].c,11.5)});
T('simulate: stop checked first when both hit in one bar',()=>{const c=K([[10,10,10,10],[10,13,7,10]]);assert.equal(L.simulate(c,0,{dir:'BUY',entry:10,stop:8,target:12}).r,-1);assert.equal(L.simulate(K([[10,10,10,10],[10,12.5,9,12]]),0,{dir:'BUY',entry:10,stop:8,target:12}).r,1)});
T('confluence: none on flat data; gates cap score <80',()=>{const flat=K(Array.from({length:200},()=>[10,10.1,9.9,10]));assert.equal(L.confluence(flat,{}),null);
 const c=[];let q=100;for(let i=0;i<260;i++){const o=q;q+=Math.sin(i/6)*0.8+(i%17==0?-2:0.02);c.push([o,Math.max(o,q)+0.3,Math.min(o,q)-0.3,q,100+(i%23==0?400:0)])}const C=K(c);
 let fired=0,capped=true;for(let n=150;n<C.length;n++){const s=L.confluence(C.slice(0,n),{newsSoon:true});if(s){fired++;if(s.score>=80)capped=false;assert.ok(s.score>=0&&s.score<=100);assert.ok(s.checks.length==10)}}assert.ok(capped,'news gate must cap score')});
T('confluence weights sum to 100',()=>assert.equal(Object.values(L.W0).reduce((a,b)=>a+b,0),100));
console.log(ok+' tests passed');
