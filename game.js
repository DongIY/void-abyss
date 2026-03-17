'use strict';
// ===== Audio Manager =====
const Audio=(()=>{let c,m,muted=false;const init=()=>{if(c)return;c=new(window.AudioContext||window.webkitAudioContext)();m=c.createGain();m.connect(c.destination)};const p=(fn)=>{if(muted||!c)return;try{fn(c,m)}catch(e){}};const sfx={hit:()=>p((c,m)=>{const o=c.createOscillator(),g=c.createGain();o.type='sawtooth';o.frequency.setValueAtTime(200,c.currentTime);o.frequency.exponentialRampToValueAtTime(80,c.currentTime+.1);g.gain.setValueAtTime(.3,c.currentTime);g.gain.exponentialRampToValueAtTime(.001,c.currentTime+.15);o.connect(g);g.connect(m);o.start();o.stop(c.currentTime+.15)}),playerHit:()=>p((c,m)=>{const o=c.createOscillator(),g=c.createGain();o.type='square';o.frequency.setValueAtTime(150,c.currentTime);o.frequency.exponentialRampToValueAtTime(50,c.currentTime+.2);g.gain.setValueAtTime(.25,c.currentTime);g.gain.exponentialRampToValueAtTime(.001,c.currentTime+.2);o.connect(g);g.connect(m);o.start();o.stop(c.currentTime+.2)}),dash:()=>p((c,m)=>{const o=c.createOscillator(),g=c.createGain();o.type='sine';o.frequency.setValueAtTime(800,c.currentTime);o.frequency.exponentialRampToValueAtTime(400,c.currentTime+.15);g.gain.setValueAtTime(.15,c.currentTime);g.gain.exponentialRampToValueAtTime(.001,c.currentTime+.15);o.connect(g);g.connect(m);o.start();o.stop(c.currentTime+.15)}),shoot:()=>p((c,m)=>{const o=c.createOscillator(),g=c.createGain();o.type='triangle';o.frequency.setValueAtTime(600,c.currentTime);o.frequency.exponentialRampToValueAtTime(200,c.currentTime+.1);g.gain.setValueAtTime(.12,c.currentTime);g.gain.exponentialRampToValueAtTime(.001,c.currentTime+.1);o.connect(g);g.connect(m);o.start();o.stop(c.currentTime+.1)}),skill:()=>p((c,m)=>{const o=c.createOscillator(),g=c.createGain();o.type='sine';o.frequency.setValueAtTime(400,c.currentTime);o.frequency.exponentialRampToValueAtTime(800,c.currentTime+.3);g.gain.setValueAtTime(.15,c.currentTime);g.gain.exponentialRampToValueAtTime(.001,c.currentTime+.4);o.connect(g);g.connect(m);o.start();o.stop(c.currentTime+.4)}),pickup:()=>p((c,m)=>{const o=c.createOscillator(),g=c.createGain();o.type='sine';o.frequency.setValueAtTime(500,c.currentTime);o.frequency.setValueAtTime(700,c.currentTime+.05);o.frequency.setValueAtTime(900,c.currentTime+.1);g.gain.setValueAtTime(.15,c.currentTime);g.gain.exponentialRampToValueAtTime(.001,c.currentTime+.2);o.connect(g);g.connect(m);o.start();o.stop(c.currentTime+.2)}),coin:()=>p((c,m)=>{const o=c.createOscillator(),g=c.createGain();o.type='sine';o.frequency.setValueAtTime(1200,c.currentTime);o.frequency.setValueAtTime(1600,c.currentTime+.06);g.gain.setValueAtTime(.1,c.currentTime);g.gain.exponentialRampToValueAtTime(.001,c.currentTime+.12);o.connect(g);g.connect(m);o.start();o.stop(c.currentTime+.12)}),door:()=>p((c,m)=>{const o=c.createOscillator(),g=c.createGain();o.type='sine';o.frequency.setValueAtTime(300,c.currentTime);o.frequency.exponentialRampToValueAtTime(600,c.currentTime+.2);g.gain.setValueAtTime(.12,c.currentTime);g.gain.exponentialRampToValueAtTime(.001,c.currentTime+.3);o.connect(g);g.connect(m);o.start();o.stop(c.currentTime+.3)}),death:()=>p((c,m)=>{const o=c.createOscillator(),g=c.createGain();o.type='sawtooth';o.frequency.setValueAtTime(300,c.currentTime);o.frequency.exponentialRampToValueAtTime(30,c.currentTime+1);g.gain.setValueAtTime(.2,c.currentTime);g.gain.exponentialRampToValueAtTime(.001,c.currentTime+1);o.connect(g);g.connect(m);o.start();o.stop(c.currentTime+1)}),victory:()=>p((c,m)=>{[523,659,784,1047].forEach((f,i)=>{const o=c.createOscillator(),g=c.createGain();o.type='sine';o.frequency.value=f;g.gain.setValueAtTime(.12,c.currentTime+i*.15);g.gain.exponentialRampToValueAtTime(.001,c.currentTime+i*.15+.3);o.connect(g);g.connect(m);o.start(c.currentTime+i*.15);o.stop(c.currentTime+i*.15+.3)})}),boss:()=>p((c,m)=>{const o=c.createOscillator(),g=c.createGain();o.type='sawtooth';o.frequency.setValueAtTime(80,c.currentTime);o.frequency.setValueAtTime(60,c.currentTime+.3);g.gain.setValueAtTime(.2,c.currentTime);g.gain.exponentialRampToValueAtTime(.001,c.currentTime+1);o.connect(g);g.connect(m);o.start();o.stop(c.currentTime+1)}),menu:()=>p((c,m)=>{const o=c.createOscillator(),g=c.createGain();o.type='sine';o.frequency.value=600;g.gain.setValueAtTime(.08,c.currentTime);g.gain.exponentialRampToValueAtTime(.001,c.currentTime+.1);o.connect(g);g.connect(m);o.start();o.stop(c.currentTime+.1)}),levelUp:()=>p((c,m)=>{[400,500,600,800].forEach((f,i)=>{const o=c.createOscillator(),g=c.createGain();o.type='triangle';o.frequency.value=f;g.gain.setValueAtTime(.12,c.currentTime+i*.1);g.gain.exponentialRampToValueAtTime(.001,c.currentTime+i*.1+.2);o.connect(g);g.connect(m);o.start(c.currentTime+i*.1);o.stop(c.currentTime+i*.1+.2)})}),elem:(t)=>p((c,m)=>{const o=c.createOscillator(),g=c.createGain();o.type=t==='thunder'?'square':'sine';o.frequency.setValueAtTime({fire:200,ice:800,thunder:100,dark:120}[t]||300,c.currentTime);g.gain.setValueAtTime(.1,c.currentTime);g.gain.exponentialRampToValueAtTime(.001,c.currentTime+.2);o.connect(g);g.connect(m);o.start();o.stop(c.currentTime+.2)})};return{init,sfx,toggleMute:()=>{muted=!muted;return muted},isMuted:()=>muted}})();

// ===== FX Manager =====
const FX=(()=>{const ps=[],ft=[];let sk={x:0,y:0,d:0,i:0};const spawn=(x,y,n,col,sp=2,li=30,sz=3)=>{for(let i=0;i<n&&ps.length<200;i++){const a=Math.random()*Math.PI*2,s=sp*(.5+Math.random());ps.push({x,y,vx:Math.cos(a)*s,vy:Math.sin(a)*s,life:li,ml:li,color:col,size:sz*(.5+Math.random())})}};const trail=(x,y,col,sz=2)=>{if(ps.length<200)ps.push({x:x+Math.random()*4-2,y:y+Math.random()*4-2,vx:0,vy:0,life:15,ml:15,color:col,size:sz})};const floatText=(x,y,t,col='#fff',sz=16)=>{ft.push({x,y,text:t,color:col,size:sz,life:40,ml:40})};const shake=(i=5,d=10)=>{sk.d=d;sk.i=i};const update=()=>{for(let i=ps.length-1;i>=0;i--){const p=ps[i];p.x+=p.vx;p.y+=p.vy;p.vx*=.95;p.vy*=.95;p.life--;if(p.life<=0)ps.splice(i,1)}for(let i=ft.length-1;i>=0;i--){ft[i].y-=.8;ft[i].life--;if(ft[i].life<=0)ft.splice(i,1)}if(sk.d>0){sk.x=(Math.random()-.5)*sk.i;sk.y=(Math.random()-.5)*sk.i;sk.d--}else{sk.x=0;sk.y=0}};const render=(ctx,cam)=>{for(const p of ps){const a=p.life/p.ml;ctx.globalAlpha=a;ctx.fillStyle=p.color;ctx.beginPath();ctx.arc(p.x-cam.x,p.y-cam.y,p.size*a,0,Math.PI*2);ctx.fill()}ctx.globalAlpha=1;for(const f of ft){ctx.globalAlpha=f.life/f.ml;ctx.font=`bold ${f.size}px sans-serif`;ctx.fillStyle=f.color;ctx.textAlign='center';ctx.fillText(f.text,f.x-cam.x,f.y-cam.y)}ctx.globalAlpha=1};const getShake=()=>sk;const clear=()=>{ps.length=0;ft.length=0};return{spawn,trail,floatText,shake,update,render,getShake,clear}})();

// ===== DATA =====
const DATA={chars:{warrior:{name:'虚空斩者',en:'Void Slayer',icon:'🗡️',hp:120,atk:15,spd:3.2,range:45,as:.35,ps:0,skills:[{n:'旋风斩',k:'Q',cd:180,mul:2.5,t:'aoe',r:65,el:'dark'},{n:'冲锋',k:'E',cd:300,mul:1.8,t:'dash',dist:120},{n:'狂暴',k:'R',cd:720,mul:0,t:'buff',dur:480,ba:.5}]},ranger:{name:'星骸猎手',en:'Star Hunter',icon:'🏹',hp:80,atk:10,spd:4.5,range:220,as:.18,ps:8,skills:[{n:'散射',k:'Q',cd:180,mul:.8,t:'multi',cnt:5,el:'thunder'},{n:'陷阱',k:'E',cd:360,mul:3,t:'trap',r:45,dur:180,el:'ice'},{n:'暗影箭',k:'R',cd:600,mul:5,t:'pierce',el:'dark'}]},mage:{name:'深渊法师',en:'Abyss Mage',icon:'🔮',hp:90,atk:12,spd:3.8,range:180,as:.28,ps:6,skills:[{n:'火球术',k:'Q',cd:150,mul:3,t:'aoe_proj',r:55,el:'fire'},{n:'冰霜新星',k:'E',cd:300,mul:2,t:'aoe',r:85,el:'ice'},{n:'雷暴',k:'R',cd:480,mul:4,t:'zone',r:75,dur:180,el:'thunder'}]}},
floors:[{name:'星尘走廊',en:'Stardust Corridor',rooms:4,col:'#3b82f6',foes:['drifter','shard'],elite:'sentinel',boss:'nebula_guardian'},{name:'暗物质矿脉',en:'Dark Matter Veins',rooms:5,col:'#8b5cf6',foes:['drifter','shard','wraith'],elite:'corruptor',boss:'matter_devourer'},{name:'虚空裂缝',en:'Void Rift',rooms:5,col:'#06b6d4',foes:['wraith','stalker','riftborn'],elite:'void_knight',boss:'rift_weaver'},{name:'时空扭曲',en:'Temporal Distortion',rooms:6,col:'#f59e0b',foes:['stalker','riftborn','chrono'],elite:'time_lord',boss:'entropy_king'},{name:'深渊之心',en:'Heart of the Abyss',rooms:6,col:'#ef4444',foes:['chrono','abyssal','void_spawn'],elite:'abyss_herald',boss:'void_sovereign'}],
enemies:{drifter:{name:'星尘漂流者',hp:30,atk:5,spd:1.2,sz:12,col:'#64748b',ai:'wander',xp:5},shard:{name:'暗晶碎片',hp:20,atk:8,spd:2,sz:8,col:'#38bdf8',ai:'charge',xp:8},wraith:{name:'虚空幽灵',hp:50,atk:10,spd:1.5,sz:14,col:'#a78bfa',ai:'flank',xp:12},stalker:{name:'裂隙潜行者',hp:80,atk:15,spd:1.8,sz:16,col:'#f97316',ai:'stealth',xp:18},riftborn:{name:'裂缝之子',hp:60,atk:12,spd:1.3,sz:14,col:'#06b6d4',ai:'ranged',xp:15},chrono:{name:'时空扭曲体',hp:100,atk:18,spd:1,sz:18,col:'#facc15',ai:'teleport',xp:25},abyssal:{name:'深渊侍从',hp:120,atk:22,spd:1.5,sz:16,col:'#ef4444',ai:'flank',xp:30},void_spawn:{name:'虚空卵',hp:40,atk:5,spd:.5,sz:20,col:'#7c3aed',ai:'wander',xp:20},sentinel:{name:'星尘哨兵',hp:150,atk:12,spd:1,sz:22,col:'#3b82f6',ai:'patrol',xp:40,elite:1},corruptor:{name:'暗物质侵蚀者',hp:200,atk:18,spd:1.2,sz:24,col:'#8b5cf6',ai:'ranged',xp:60,elite:1},void_knight:{name:'虚空骑士',hp:280,atk:25,spd:1.5,sz:26,col:'#06b6d4',ai:'charge',xp:80,elite:1},time_lord:{name:'时间领主',hp:350,atk:30,spd:1,sz:28,col:'#f59e0b',ai:'teleport',xp:100,elite:1},abyss_herald:{name:'深渊先驱',hp:450,atk:35,spd:1.3,sz:30,col:'#ef4444',ai:'flank',xp:120,elite:1},nebula_guardian:{name:'星云守卫',en:'Nebula Guardian',hp:200,atk:15,spd:.8,sz:36,col:'#3b82f6',ai:'boss_circle',xp:100,boss:1},matter_devourer:{name:'物质吞噬者',en:'Matter Devourer',hp:350,atk:22,spd:1,sz:40,col:'#8b5cf6',ai:'boss_charge',xp:160,boss:1},rift_weaver:{name:'裂隙编织者',en:'Rift Weaver',hp:550,atk:30,spd:.7,sz:44,col:'#06b6d4',ai:'boss_summon',xp:220,boss:1},entropy_king:{name:'熵之王',en:'Entropy King',hp:800,atk:40,spd:1.2,sz:48,col:'#f59e0b',ai:'boss_teleport',xp:300,boss:1},void_sovereign:{name:'虚空至尊',en:'Void Sovereign',hp:1200,atk:55,spd:1,sz:56,col:'#ef4444',ai:'boss_final',xp:500,boss:1}},
items:[{id:'heal',name:'治疗球',icon:'💚',r:'common',desc:'+30HP',fx:{heal:30}},{id:'atk_s',name:'攻击碎片',icon:'⚔️',r:'common',desc:'ATK+3',fx:{atk:3}},{id:'spd_s',name:'疾风靴',icon:'👟',r:'common',desc:'SPD+0.5',fx:{spd:.5}},{id:'shield',name:'护盾碎片',icon:'🛡️',r:'common',desc:'DEF+2',fx:{def:2}},{id:'fire_h',name:'灼烧之心',icon:'🔥',r:'rare',desc:'30%灼烧',fx:{elem:{fire:.3}},syn:'fire'},{id:'ice_c',name:'冰晶护盾',icon:'❄️',r:'rare',desc:'25%冰冻',fx:{elem:{ice:.25}},syn:'ice'},{id:'thun_c',name:'雷霆之怒',icon:'⚡',r:'rare',desc:'20%连锁',fx:{elem:{thunder:.2}},syn:'thunder'},{id:'dark_l',name:'暗物质透镜',icon:'🌑',r:'rare',desc:'15%削弱',fx:{elem:{dark:.15}},syn:'dark'},{id:'vamp',name:'虹吸之牙',icon:'🧛',r:'rare',desc:'击杀+10HP',fx:{onKill:10}},{id:'crit_g',name:'暴击宝石',icon:'💎',r:'rare',desc:'暴击+15%',fx:{crit:.15}},{id:'fire_a',name:'火焰增幅',icon:'🌋',r:'epic',desc:'火伤×2',fx:{fireDmg:1},syn:'fire'},{id:'frost_n',name:'霜爆核心',icon:'🧊',r:'epic',desc:'冰触发爆炸',fx:{iceExplode:1},syn:'ice'},{id:'chain',name:'链式闪电',icon:'🔗',r:'epic',desc:'弹射+3',fx:{chainEx:3},syn:'thunder'},{id:'cloak',name:'虚空斗篷',icon:'🌌',r:'epic',desc:'闪避后隐身2s',fx:{dashInv:120}},{id:'berserk',name:'狂战士护符',icon:'😈',r:'epic',desc:'HP<30%时ATK×2',fx:{berserk:1}},{id:'mirror',name:'镜像护盾',icon:'🪞',r:'epic',desc:'30%反弹伤害',fx:{reflect:.3}},{id:'singular',name:'奇点之心',icon:'🕳️',r:'legend',desc:'元素概率×2',fx:{elemX2:1}},{id:'phoenix',name:'凤凰之翼',icon:'🔱',r:'legend',desc:'死亡复活1次',fx:{revive:1}},{id:'infinity',name:'无限棱镜',icon:'♾️',r:'legend',desc:'技能CD-40%',fx:{cdRed:.4}}],
talents:{str:[{n:'力量涌动',i:'💪',d:'ATK+5',fx:{atk:5}},{n:'重击',i:'🔨',d:'暴击伤害+30%',fx:{critD:.3}},{n:'生命之力',i:'❤️',d:'HP+20',fx:{mhp:20}},{n:'铁壁',i:'🏰',d:'受伤-10%',fx:{dr:.1}}],agi:[{n:'敏捷强化',i:'🦅',d:'SPD+0.5',fx:{spd:.5}},{n:'闪避精通',i:'💨',d:'闪避CD-20%',fx:{dashR:.2}},{n:'连击',i:'⚡',d:'连击伤害+5%',fx:{combo:.05}},{n:'幻影',i:'👤',d:'无敌帧+0.2s',fx:{iframe:12}}],mag:[{n:'魔力涌动',i:'🔮',d:'技能+20%',fx:{skDmg:.2}},{n:'元素精通',i:'🌈',d:'元素率+15%',fx:{elemB:.15}},{n:'冷却缩减',i:'⏳',d:'CD-15%',fx:{cdRed:.15}},{n:'吸魔',i:'🧿',d:'击杀减CD1s',fx:{killCd:60}}]},
meta:[{id:'hp',n:'生命强化',i:'❤️',max:10,cost:20,pL:{mhpP:.05}},{id:'atk',n:'攻击强化',i:'⚔️',max:10,cost:25,pL:{atkP:.03}},{id:'spd',n:'速度强化',i:'👟',max:5,cost:30,pL:{spdP:.02}},{id:'luck',n:'幸运',i:'🍀',max:5,cost:40,pL:{luckP:.05}},{id:'dm',n:'暗物质磁铁',i:'🌑',max:5,cost:50,pL:{dmP:.1}},{id:'gold',n:'初始金币',i:'💰',max:5,cost:30,pL:{gld:20}}],
achieves:[{id:'first_clear',n:'初探深渊',i:'🏆',d:'通关第1层'},{id:'full_clear',n:'深渊征服者',i:'👑',d:'通关全5层'},{id:'no_hit',n:'无伤通关',i:'🛡️',d:'一层不受伤'},{id:'collector',n:'收藏家',i:'📦',d:'拥有6个道具'},{id:'elem_master',n:'元素大师',i:'🌈',d:'触发所有元素反应'},{id:'kills_100',n:'百人斩',i:'💀',d:'一局杀100敌人'},{id:'deaths_10',n:'永不言弃',i:'🔄',d:'累计死亡10次'},{id:'meta_max',n:'满级大佬',i:'⭐',d:'某项升级满级'}],
events:[{t:'🔮 神秘祭坛',d:'散发紫光的古老祭坛...',ch:[{l:'献祭HP换力量',d:'-20%HP, ATK+8',fx:{hpCost:.2,atk:8}},{l:'祈祷',d:'50%得稀有道具',fx:{gamble:.5}},{l:'离开',d:'安全离开',fx:{}}]},{t:'⚗️ 元素之泉',d:'闪烁着元素之光的泉水...',ch:[{l:'🔥 火之泉',d:'20%火焰附加',fx:{elem:{fire:.2}}},{l:'❄️ 冰之泉',d:'20%冰冻附加',fx:{elem:{ice:.2}}},{l:'⚡ 雷之泉',d:'20%连锁附加',fx:{elem:{thunder:.2}}}]},{t:'💀 黑暗契约',d:'"力量...你想要吗？"',ch:[{l:'接受',d:'ATK+15, HP-20',fx:{atk:15,mhp:-20}},{l:'拒绝',d:'安全离开',fx:{}}]}],
shopDlg:['"欢迎光临虚空杂货铺！"','"深渊裂缝里淘来的好货！"','"买不买随你哦..."']
};

// ===== Utilities =====
const $=s=>document.getElementById(s);
const clamp=(v,a,b)=>Math.max(a,Math.min(b,v));
const rand=(a=0,b=1)=>a+Math.random()*(b-a);
const randInt=(a,b)=>Math.floor(rand(a,b+1));
const pick=a=>a[Math.floor(Math.random()*a.length)];
const dist=(a,b)=>Math.hypot(a.x-b.x,a.y-b.y);
const lerp=(a,b,t)=>a+(b-a)*t;
const angle=(a,b)=>Math.atan2(b.y-a.y,b.x-a.x);

// ===== Global State =====
const canvas=$('gameCanvas'),ctx=canvas.getContext('2d');
const bgCanvas=$('bgCanvas'),bgCtx=bgCanvas.getContext('2d');
const mmCanvas=$('minimap'),mmCtx=mmCanvas.getContext('2d');
let W=0,H=0;
let gameState='menu'; // menu|playing|paused|levelup|itemchoice|shop|event|dead|victory
let keys={},mouse={x:0,y:0,down:false};
let isMobile=false,joyDir={x:0,y:0},joyActive=false;
let animFrame=0,lastTime=0,dt=0;
let bgStars=[];

// Save data (persisted)
let save={dm:0,meta:{},achieves:{},deaths:0,runs:0,bestFloor:0};

// Run data (per-run)
let run={};

const initRun=(charId)=>{
  const ch=DATA.chars[charId];
  const metaBonus={mhpP:0,atkP:0,spdP:0,luckP:0,dmP:0,gld:0};
  for(const[k,v]of Object.entries(save.meta)){
    const md=DATA.meta.find(m=>m.id===k);
    if(md)for(const[pk,pv]of Object.entries(md.pL))metaBonus[pk]=(metaBonus[pk]||0)+pv*v;
  }
  run={
    charId,charData:ch,
    x:0,y:0,
    hp:Math.floor(ch.hp*(1+metaBonus.mhpP)),mhp:Math.floor(ch.hp*(1+metaBonus.mhpP)),
    atk:Math.floor(ch.atk*(1+metaBonus.atkP)),
    spd:ch.spd*(1+metaBonus.spdP),
    range:ch.range,as:ch.as,ps:ch.ps,
    def:0,crit:0.05,critD:1.5,dr:0,
    skills:ch.skills.map(s=>({...s,cdTimer:0})),
    items:[],talents:[],
    elem:{fire:0,ice:0,thunder:0,dark:0},
    elemTriggered:{evaporate:false,superconduct:false,shatter:false,annihilate:false},
    floor:0,roomIdx:0,rooms:[],
    gold:metaBonus.gld||0,dm:0,xp:0,level:1,xpReq:20,
    kills:0,dmgDealt:0,dmgTaken:0,roomsCleared:0,
    dashCd:0,dashMax:60,dashDur:0,dashDir:{x:0,y:0},dashInv:0,
    iframe:0,iframeDur:10,
    atkTimer:0,
    projList:[],enemyProj:[],
    cam:{x:0,y:0},
    cleared:false,doorOpen:false,
    buff:{atk:0,atkMul:0,invTimer:0},
    luckP:metaBonus.luckP||0,
    dmP:metaBonus.dmP||0,
    revive:0,berserk:0,reflect:0,dashInvDur:0,
    onKill:0,killCd:0,elemX2:0,cdRed:0,
    fireDmg:0,iceExplode:0,chainEx:0,skDmg:0,combo:0,comboCount:0,comboTimer:0,
    noHit:true,playing:true
  };
};

// ===== Dungeon Generator =====
const Dungeon=(()=>{
  const RW=800,RH=600; // room pixel size
  const WALL=20;

  const generateFloor=(fi)=>{
    const fd=DATA.floors[fi];
    const cnt=fd.rooms+randInt(0,2);
    const rooms=[];
    // Generate room graph — linear with branches
    for(let i=0;i<cnt;i++){
      const type=i===cnt-1?'boss':i===0?'start':
        (i===Math.floor(cnt/2)&&Math.random()<.6)?'elite':
        rollRoomType();
      rooms.push({
        idx:i,type,x:0,y:0,w:RW,h:RH,
        enemies:[],items:[],doors:[],traps:[],
        cleared:type==='start',explored:i===0,
        gx:i,gy:0 // grid position for minimap
      });
    }
    // Arrange rooms in a path with slight branching
    let gx=0,gy=0;
    for(let i=0;i<rooms.length;i++){
      rooms[i].gx=gx; rooms[i].gy=gy;
      if(i<rooms.length-1){
        const dir=pick(['right','right','down','up']);
        if(dir==='right')gx++;
        else if(dir==='down'){gx++;gy++;}
        else{gx++;gy--;}
      }
    }
    // Connect adjacent rooms with doors
    for(let i=0;i<rooms.length-1;i++){
      const dx=rooms[i+1].gx-rooms[i].gx;
      const dy=rooms[i+1].gy-rooms[i].gy;
      let doorDir='right';
      if(dy>0)doorDir=Math.random()<.5?'right':'down';
      else if(dy<0)doorDir=Math.random()<.5?'right':'up';
      const opp={right:'left',left:'right',up:'down',down:'up'};
      rooms[i].doors.push({to:i+1,dir:doorDir});
      rooms[i+1].doors.push({to:i,dir:opp[doorDir]});
    }
    // Populate enemies
    for(let i=1;i<rooms.length;i++){
      const r=rooms[i];
      if(r.type==='start')continue;
      if(r.type==='boss'){
        const tpl=DATA.enemies[fd.boss];
        r.enemies.push(createEnemy(tpl,fd.boss,RW/2,RH/2,1+fi*0.3));
      }else if(r.type==='elite'){
        const tpl=DATA.enemies[fd.elite];
        r.enemies.push(createEnemy(tpl,fd.elite,RW/2,RH/2,1+fi*0.2));
        addRegularEnemies(r,fd,fi,2);
      }else if(r.type==='combat'){
        addRegularEnemies(r,fd,fi,3+fi);
      }else if(r.type==='treasure'){
        // treasure room: 1-2 weak guards
        addRegularEnemies(r,fd,fi,randInt(1,2));
      }else if(r.type==='shop'||r.type==='event'){
        r.cleared=true; // no enemies
      }
      // Add traps on later floors
      if(fi>=2&&r.type==='combat'&&Math.random()<.3){
        const tc=randInt(1,3);
        for(let t=0;t<tc;t++){
          r.traps.push({x:rand(WALL+40,RW-WALL-40),y:rand(WALL+40,RH-WALL-40),r:20,dmg:5+fi*3,cd:0,active:true});
        }
      }
    }
    return rooms;
  };

  const rollRoomType=()=>{
    const r=Math.random();
    if(r<.60)return'combat';
    if(r<.75)return'treasure';
    if(r<.85)return'shop';
    return'event';
  };

  const addRegularEnemies=(room,fd,fi,count)=>{
    for(let i=0;i<count;i++){
      const tid=pick(fd.foes);
      const tpl=DATA.enemies[tid];
      const ex=rand(WALL+50,RW-WALL-50);
      const ey=rand(WALL+50,RH-WALL-50);
      room.enemies.push(createEnemy(tpl,tid,ex,ey,1+fi*0.15));
    }
  };

  const createEnemy=(tpl,tid,x,y,mul)=>{
    return{
      id:tid,name:tpl.name,
      x,y,hp:Math.floor(tpl.hp*mul),mhp:Math.floor(tpl.hp*mul),
      atk:Math.floor(tpl.atk*mul),spd:tpl.spd,sz:tpl.sz,
      col:tpl.col,ai:tpl.ai,xp:tpl.xp,
      boss:tpl.boss||0,elite:tpl.elite||0,
      dir:Math.random()*Math.PI*2,
      atkCd:0,moveCd:0,stateTimer:0,
      state:'idle',target:null,
      stunTimer:0,slowTimer:0,slowMul:1,
      burnTimer:0,burnDmg:0,
      weakTimer:0,
      visible:true,stealthTimer:0,
      projCd:0,summonCd:0,
      phaseTimer:0,phase:0
    };
  };

  const getDoorPos=(room,dir)=>{
    switch(dir){
      case'right':return{x:room.w-10,y:room.h/2};
      case'left':return{x:10,y:room.h/2};
      case'down':return{x:room.w/2,y:room.h-10};
      case'up':return{x:room.w/2,y:10};
    }
  };

  return{generateFloor,createEnemy,getDoorPos,RW,RH,WALL};
})();

// ===== AI Controller =====
const AI=(()=>{
  const update=(e,p,room)=>{
    if(e.hp<=0||e.stunTimer>0)return;
    const d=dist(e,p);
    const spd=e.spd*(e.slowTimer>0?0.5:1);
    const ag=angle(e,p);

    if(e.burnTimer>0){e.burnTimer--;if(e.burnTimer%20===0){e.hp-=e.burnDmg;FX.floatText(e.x,e.y-e.sz,`${e.burnDmg}`,'#f97316',12);}}
    if(e.slowTimer>0)e.slowTimer--;
    if(e.weakTimer>0)e.weakTimer--;
    if(e.stunTimer>0){e.stunTimer--;return;}
    if(e.stealthTimer>0)e.stealthTimer--;
    e.atkCd=Math.max(0,e.atkCd-1);

    switch(e.ai){
      case'wander': ai_wander(e,p,d,spd,ag,room); break;
      case'charge': ai_charge(e,p,d,spd,ag); break;
      case'flank': ai_flank(e,p,d,spd,ag); break;
      case'ranged': ai_ranged(e,p,d,spd,ag); break;
      case'stealth': ai_stealth(e,p,d,spd,ag); break;
      case'teleport': ai_teleport(e,p,d,spd,ag,room); break;
      case'patrol': ai_patrol(e,p,d,spd,ag); break;
      case'boss_circle': ai_bossCircle(e,p,d,spd,ag); break;
      case'boss_charge': ai_bossCharge(e,p,d,spd,ag); break;
      case'boss_summon': ai_bossSummon(e,p,d,spd,ag,room); break;
      case'boss_teleport': ai_bossTeleport(e,p,d,spd,ag,room); break;
      case'boss_final': ai_bossFinal(e,p,d,spd,ag,room); break;
    }
    // Keep in bounds
    e.x=clamp(e.x,Dungeon.WALL+e.sz,Dungeon.RW-Dungeon.WALL-e.sz);
    e.y=clamp(e.y,Dungeon.WALL+e.sz,Dungeon.RH-Dungeon.WALL-e.sz);
  };

  const moveToward=(e,tx,ty,spd)=>{const a=Math.atan2(ty-e.y,tx-e.x);e.x+=Math.cos(a)*spd;e.y+=Math.sin(a)*spd;e.dir=a;};
  const moveAway=(e,tx,ty,spd)=>{const a=Math.atan2(ty-e.y,tx-e.x);e.x-=Math.cos(a)*spd;e.y-=Math.sin(a)*spd;};
  const shoot=(e,p,spd=4,sz=4,col=e.col)=>{if(e.atkCd>0)return;e.atkCd=60;const a=angle(e,p);run.enemyProj.push({x:e.x,y:e.y,vx:Math.cos(a)*spd,vy:Math.sin(a)*spd,dmg:e.atk,sz,col,life:180});};

  const ai_wander=(e,p,d,spd,ag,room)=>{
    e.moveCd--;
    if(e.moveCd<=0){e.dir=Math.random()*Math.PI*2;e.moveCd=randInt(30,90);}
    e.x+=Math.cos(e.dir)*spd*0.5;e.y+=Math.sin(e.dir)*spd*0.5;
    if(d<120){moveToward(e,p.x,p.y,spd*0.8);if(d<40&&e.atkCd<=0){e.atkCd=45;return e.atk;}}
  };

  const ai_charge=(e,p,d,spd,ag)=>{
    if(e.state==='charge'){e.stateTimer--;e.x+=Math.cos(e.dir)*spd*3;e.y+=Math.sin(e.dir)*spd*3;if(e.stateTimer<=0)e.state='idle';if(d<e.sz+16)return e.atk*1.5;return;}
    if(d<200){e.stateTimer++;if(e.stateTimer>60){e.state='charge';e.dir=ag;e.stateTimer=20;FX.spawn(e.x,e.y,5,e.col,3,15);}}
    else{moveToward(e,p.x,p.y,spd);}
  };

  const ai_flank=(e,p,d,spd,ag)=>{
    const fa=ag+Math.PI/2*(e.x>p.x?1:-1);
    if(d>150)moveToward(e,p.x,p.y,spd);
    else if(d>60){e.x+=Math.cos(fa)*spd;e.y+=Math.sin(fa)*spd;}
    else if(d<60)moveToward(e,p.x,p.y,spd*1.5);
    if(d<50&&e.atkCd<=0){e.atkCd=40;return e.atk;}
  };

  const ai_ranged=(e,p,d,spd,ag)=>{
    if(d<150)moveAway(e,p.x,p.y,spd);
    else if(d>250)moveToward(e,p.x,p.y,spd);
    shoot(e,p,3.5,5,e.col);
  };

  const ai_stealth=(e,p,d,spd,ag)=>{
    if(e.stealthTimer<=0&&d>100){e.visible=false;e.stealthTimer=120;e.state='stealth';}
    if(e.state==='stealth'){moveToward(e,p.x,p.y,spd*1.5);if(d<50){e.visible=true;e.state='attack';return e.atk*2;}}
    else{if(d>80)moveToward(e,p.x,p.y,spd);if(d<50&&e.atkCd<=0){e.atkCd=50;return e.atk;}}
  };

  const ai_teleport=(e,p,d,spd,ag,room)=>{
    e.stateTimer++;
    if(e.stateTimer>90){
      FX.spawn(e.x,e.y,8,e.col,4,20);
      e.x=rand(Dungeon.WALL+50,Dungeon.RW-Dungeon.WALL-50);
      e.y=rand(Dungeon.WALL+50,Dungeon.RH-Dungeon.WALL-50);
      FX.spawn(e.x,e.y,8,e.col,4,20);
      e.stateTimer=0;
      if(dist(e,p)<80)shoot(e,p,5,6,e.col);
    }
    if(d<60&&e.atkCd<=0){e.atkCd=50;return e.atk;}
    if(d>100)moveToward(e,p.x,p.y,spd*0.6);
  };

  const ai_patrol=(e,p,d,spd,ag)=>{
    e.moveCd--;
    if(e.moveCd<=0){e.dir+=Math.PI/2;e.moveCd=60;}
    e.x+=Math.cos(e.dir)*spd*0.7;e.y+=Math.sin(e.dir)*spd*0.7;
    if(d<180)shoot(e,p,3,5,e.col);
    if(d<50&&e.atkCd<=0){e.atkCd=55;return e.atk*1.2;}
  };

  // Boss AIs
  const ai_bossCircle=(e,p,d,spd,ag)=>{
    e.phaseTimer++;
    const oa=ag+Math.PI/2;
    e.x+=Math.cos(oa)*spd;e.y+=Math.sin(oa)*spd;
    if(e.phaseTimer%45===0)shoot(e,p,3,8,'#3b82f6');
    if(e.phaseTimer%90===0){
      for(let i=0;i<8;i++){const a=i*Math.PI/4;run.enemyProj.push({x:e.x,y:e.y,vx:Math.cos(a)*3,vy:Math.sin(a)*3,dmg:e.atk,sz:6,col:'#3b82f6',life:120});}
    }
    if(d<50&&e.atkCd<=0){e.atkCd=40;return e.atk;}
  };

  const ai_bossCharge=(e,p,d,spd,ag)=>{
    if(e.state==='charge'){e.stateTimer--;e.x+=Math.cos(e.dir)*spd*4;e.y+=Math.sin(e.dir)*spd*4;FX.trail(e.x,e.y,e.col,4);if(e.stateTimer<=0){e.state='idle';FX.shake(8,15);}if(d<e.sz+20)return e.atk*2;return;}
    e.phaseTimer++;
    moveToward(e,p.x,p.y,spd*0.5);
    if(e.phaseTimer>80){e.state='charge';e.dir=ag;e.stateTimer=25;e.phaseTimer=0;FX.spawn(e.x,e.y,10,e.col,4,20);}
    if(e.phaseTimer%40===0)shoot(e,p,4,7,e.col);
  };

  const ai_bossSummon=(e,p,d,spd,ag,room)=>{
    e.phaseTimer++;
    if(d>120)moveToward(e,p.x,p.y,spd*0.4);
    else moveAway(e,p.x,p.y,spd*0.3);
    if(e.phaseTimer%50===0)shoot(e,p,3,6,e.col);
    e.summonCd--;
    if(e.summonCd<=0&&room.enemies.length<8){
      e.summonCd=180;
      const foes=DATA.floors[run.floor].foes;
      for(let i=0;i<2;i++){
        const tid=pick(foes);const tpl=DATA.enemies[tid];
        room.enemies.push(Dungeon.createEnemy(tpl,tid,e.x+rand(-60,60),e.y+rand(-60,60),1+run.floor*0.15));
      }
      FX.spawn(e.x,e.y,15,'#06b6d4',5,30);
    }
  };

  const ai_bossTeleport=(e,p,d,spd,ag,room)=>{
    e.phaseTimer++;
    moveToward(e,p.x,p.y,spd*0.6);
    if(e.phaseTimer>60){
      FX.spawn(e.x,e.y,12,e.col,5,25);
      e.x=rand(100,Dungeon.RW-100);e.y=rand(100,Dungeon.RH-100);
      FX.spawn(e.x,e.y,12,e.col,5,25);
      e.phaseTimer=0;
      // Burst attack after teleport
      for(let i=0;i<12;i++){const a=i*Math.PI/6;run.enemyProj.push({x:e.x,y:e.y,vx:Math.cos(a)*4,vy:Math.sin(a)*4,dmg:e.atk,sz:5,col:e.col,life:90});}
    }
    if(e.phaseTimer%35===0)shoot(e,p,4,6,e.col);
  };

  const ai_bossFinal=(e,p,d,spd,ag,room)=>{
    const hpPct=e.hp/e.mhp;
    e.phaseTimer++;
    // Phase transitions
    if(hpPct<0.3&&e.phase<2){e.phase=2;FX.shake(15,30);FX.spawn(e.x,e.y,30,'#ef4444',6,40);}
    else if(hpPct<0.6&&e.phase<1){e.phase=1;FX.shake(10,20);FX.spawn(e.x,e.y,20,'#ef4444',5,30);}

    const baseSpd=spd*(1+e.phase*0.3);
    if(d>100)moveToward(e,p.x,p.y,baseSpd*0.7);
    else{const oa=ag+Math.PI/2*(e.phaseTimer%200<100?1:-1);e.x+=Math.cos(oa)*baseSpd;e.y+=Math.sin(oa)*baseSpd;}

    // Attacks scale with phase
    const atkRate=Math.max(20,50-e.phase*15);
    if(e.phaseTimer%atkRate===0)shoot(e,p,4+e.phase,7,e.col);
    if(e.phaseTimer%(120-e.phase*30)===0){
      const cnt=6+e.phase*4;
      for(let i=0;i<cnt;i++){const a=i*Math.PI*2/cnt;run.enemyProj.push({x:e.x,y:e.y,vx:Math.cos(a)*3,vy:Math.sin(a)*3,dmg:e.atk,sz:6,col:e.col,life:120});}
    }
    // Phase 2: summon
    if(e.phase>=2){e.summonCd=(e.summonCd||0)-1;if(e.summonCd<=0&&room.enemies.length<10){
      e.summonCd=240;const foes=DATA.floors[run.floor].foes;
      for(let i=0;i<3;i++){const tid=pick(foes);const tpl=DATA.enemies[tid];room.enemies.push(Dungeon.createEnemy(tpl,tid,e.x+rand(-80,80),e.y+rand(-80,80),1+run.floor*0.15));}
      FX.spawn(e.x,e.y,20,'#ef4444',6,30);
    }}
    if(d<e.sz+20&&e.atkCd<=0){e.atkCd=30;return e.atk*1.5;}
  };

  return{update};
})();

// ===== Game Engine =====
const Engine=(()=>{
  const startRun=(charId)=>{
    initRun(charId);
    run.rooms=Dungeon.generateFloor(0);
    enterRoom(0);
    gameState='playing';
    UI.showScreen('gameScreen');
    UI.updateHUD();
    Audio.init();
    FX.clear();
    run.projList=[];run.enemyProj=[];
  };

  const enterRoom=(idx)=>{
    const room=run.rooms[idx];
    run.roomIdx=idx;
    room.explored=true;
    run.cleared=room.cleared;
    run.doorOpen=room.cleared;
    // Player spawn position based on door direction
    const prevRoom=run.rooms.find(r=>r.doors.some(d=>d.to===idx));
    if(prevRoom){
      const door=prevRoom.doors.find(d=>d.to===idx);
      const opp={right:'left',left:'right',up:'down',down:'up'};
      const dp=Dungeon.getDoorPos(room,opp[door.dir]);
      run.x=dp.x+(opp[door.dir]==='left'?40:opp[door.dir]==='right'?-40:0);
      run.y=dp.y+(opp[door.dir]==='up'?40:opp[door.dir]==='down'?-40:0);
    }else{
      run.x=Dungeon.RW/2;run.y=Dungeon.RH/2;
    }
    FX.clear();run.projList=[];run.enemyProj=[];
    if(room.type==='shop')showShop();
    if(room.type==='event')showEvent();
    if(room.type==='boss'&&!room.cleared)Audio.sfx.boss();
    Audio.sfx.door();
  };

  const nextFloor=()=>{
    run.floor++;
    if(run.floor===1)unlockAchieve('first_clear');
    if(run.floor>=DATA.floors.length){gameVictory();return;}
    run.rooms=Dungeon.generateFloor(run.floor);
    enterRoom(0);
    // Offer talent choice
    showTalentChoice();
    Audio.sfx.levelUp();
  };

  // === Main Update Loop ===
  const update=()=>{
    if(gameState!=='playing')return;
    const room=run.rooms[run.roomIdx];

    // Player movement
    updatePlayer(room);
    // Auto-attack
    updateAttack(room);
    // Skills cooldowns
    for(const sk of run.skills)if(sk.cdTimer>0)sk.cdTimer--;
    // Update projectiles
    updateProjectiles(room);
    // Update enemies
    for(const e of room.enemies){
      if(e.hp<=0)continue;
      const dmg=AI.update(e,{x:run.x,y:run.y},room);
      if(dmg&&dmg>0)damagePlayer(dmg,e);
    }
    // Remove dead enemies
    for(let i=room.enemies.length-1;i>=0;i--){
      if(room.enemies[i].hp<=0){
        const e=room.enemies[i];
        onEnemyKill(e);
        room.enemies.splice(i,1);
      }
    }
    // Update traps
    for(let ti=room.traps.length-1;ti>=0;ti--){
      const t=room.traps[ti];
      if(!t.active)continue;
      t.cd=Math.max(0,t.cd-1);
      if(t.dur!==undefined){t.dur--;if(t.dur<=0){room.traps.splice(ti,1);continue;}}
      if(t.player){
        // Player trap: damage enemies
        for(const e of room.enemies){
          if(e.hp>0&&dist(t,e)<t.r+e.sz&&t.cd<=0){
            e.hp-=t.dmg;run.dmgDealt+=t.dmg;t.cd=30;
            FX.floatText(e.x,e.y-e.sz,`${t.dmg}`,t.col||'#38bdf8',14);
            FX.spawn(t.x,t.y,5,t.col||'#38bdf8',2,15);
            if(t.el){const applyEl={fire:()=>{e.burnTimer=120;e.burnDmg=Math.floor(run.atk*0.15);},ice:()=>{e.slowTimer=180;},thunder:()=>{e.stunTimer=60;},dark:()=>{e.weakTimer=240;}};if(applyEl[t.el])applyEl[t.el]();}
          }
        }
      }else{
        // Enemy trap: damage player
        if(dist(t,{x:run.x,y:run.y})<t.r+12&&t.cd<=0){
          damagePlayer(t.dmg);t.cd=90;
          FX.spawn(t.x,t.y,8,'#ef4444',3,20);
        }
      }
    }
    // Check room clear
    if(!run.cleared&&room.enemies.every(e=>e.hp<=0)){
      run.cleared=true;run.doorOpen=true;room.cleared=true;
      run.roomsCleared++;
      // Drop items in treasure/combat rooms
      if(room.type==='treasure'||room.type==='combat'){
        if(Math.random()<0.3+run.luckP)showItemChoice();
      }
    }
    // Check door transitions
    if(run.doorOpen)checkDoors(room);
    // Dash timer
    if(run.dashCd>0)run.dashCd--;
    if(run.dashDur>0){
      run.dashDur--;
      run.x+=run.dashDir.x*8;run.y+=run.dashDir.y*8;
      FX.trail(run.x,run.y,'#06b6d4',3);
      run.x=clamp(run.x,Dungeon.WALL+16,Dungeon.RW-Dungeon.WALL-16);
      run.y=clamp(run.y,Dungeon.WALL+16,Dungeon.RH-Dungeon.WALL-16);
    }
    // Iframe
    if(run.iframe>0)run.iframe--;
    // Buff timers
    if(run.buff.atk>0)run.buff.atk--;
    if(run.buff.invTimer>0)run.buff.invTimer--;
    // Combo timer
    if(run.comboTimer>0){run.comboTimer--;if(run.comboTimer<=0)run.comboCount=0;}
    // Camera — centre room when viewport is larger than room
    run.cam.x=run.x-W/2;run.cam.y=run.y-H/2;
    if(W>=Dungeon.RW){run.cam.x=(Dungeon.RW-W)/2;}
    else{run.cam.x=clamp(run.cam.x,0,Dungeon.RW-W);}
    if(H>=Dungeon.RH){run.cam.y=(Dungeon.RH-H)/2;}
    else{run.cam.y=clamp(run.cam.y,0,Dungeon.RH-H);}
    // Update FX
    FX.update();
    UI.updateHUD();
  };

  const updatePlayer=(room)=>{
    let dx=0,dy=0;
    if(isMobile&&joyActive){dx=joyDir.x;dy=joyDir.y;}
    else{
      if(keys['KeyW']||keys['ArrowUp'])dy=-1;
      if(keys['KeyS']||keys['ArrowDown'])dy=1;
      if(keys['KeyA']||keys['ArrowLeft'])dx=-1;
      if(keys['KeyD']||keys['ArrowRight'])dx=1;
    }
    if(dx||dy){
      const len=Math.hypot(dx,dy);dx/=len;dy/=len;
      if(run.dashDur<=0){
        run.x+=dx*run.spd;run.y+=dy*run.spd;
      }
    }
    run.x=clamp(run.x,Dungeon.WALL+16,Dungeon.RW-Dungeon.WALL-16);
    run.y=clamp(run.y,Dungeon.WALL+16,Dungeon.RH-Dungeon.WALL-16);
  };

  const updateAttack=(room)=>{
    run.atkTimer=Math.max(0,run.atkTimer-1);
    if(!mouse.down&&!isMobile)return;
    if(run.atkTimer>0)return;
    run.atkTimer=Math.floor(60*run.as);
    const pAngle=Math.atan2(mouse.y+run.cam.y-run.y,mouse.x+run.cam.x-run.x);
    if(run.ps>0){
      // Ranged — fire projectile
      run.projList.push({x:run.x,y:run.y,vx:Math.cos(pAngle)*run.ps,vy:Math.sin(pAngle)*run.ps,dmg:calcAtk(),sz:5,col:'#7c3aed',life:120,pierce:0});
      Audio.sfx.shoot();
    }else{
      // Melee — hit enemies in arc
      for(const e of room.enemies){
        if(e.hp<=0||!e.visible)continue;
        const d=dist(e,{x:run.x,y:run.y});
        if(d<run.range){
          const ea=angle({x:run.x,y:run.y},e);
          const diff=Math.abs(((ea-pAngle+Math.PI*3)%(Math.PI*2))-Math.PI);
          if(diff<Math.PI/2){
            damageEnemy(e,calcAtk());
          }
        }
      }
      Audio.sfx.hit();
      FX.spawn(run.x+Math.cos(pAngle)*30,run.y+Math.sin(pAngle)*30,4,'#7c3aed',3,10,3);
    }
  };

  const calcAtk=()=>{
    let atk=run.atk;
    if(run.buff.atk>0)atk*=(1+run.buff.atkMul);
    if(run.berserk&&run.hp<run.mhp*0.3)atk*=2;
    // Combo
    if(run.combo>0&&run.comboCount>0)atk*=(1+run.combo*run.comboCount);
    // Crit
    let crit=false;
    if(Math.random()<run.crit){atk*=run.critD;crit=true;}
    return{val:Math.floor(atk),crit};
  };

  const damageEnemy=(e,atkObj)=>{
    let dmg=atkObj.val;
    const weak=e.weakTimer>0?1.3:1;
    dmg=Math.floor(dmg*weak);
    e.hp-=dmg;
    run.dmgDealt+=dmg;
    run.comboCount++;run.comboTimer=90;
    const col=atkObj.crit?'#facc15':'#fff';
    FX.floatText(e.x,e.y-e.sz,atkObj.crit?`暴击 ${dmg}`:`${dmg}`,col,atkObj.crit?20:14);
    FX.spawn(e.x,e.y,3,e.col,2,10);
    Audio.sfx.hit();
    // Apply elemental
    applyElement(e);
  };

  const applyElement=(e)=>{
    const elems=['fire','ice','thunder','dark'];
    for(const el of elems){
      const chance=run.elem[el]*(run.elemX2?2:1);
      if(chance>0&&Math.random()<chance){
        Audio.sfx.elem(el);
        switch(el){
          case'fire':e.burnTimer=120;e.burnDmg=Math.floor(run.atk*0.15+(run.fireDmg?run.atk*0.15:0));FX.spawn(e.x,e.y,6,'#f97316',3,20);break;
          case'ice':e.slowTimer=180;FX.spawn(e.x,e.y,6,'#38bdf8',3,25);
            if(run.iceExplode){for(const oe of run.rooms[run.roomIdx].enemies){if(oe!==e&&oe.hp>0&&dist(oe,e)<80){oe.hp-=Math.floor(run.atk*0.5);FX.spawn(oe.x,oe.y,4,'#38bdf8',2,15);}}}
            break;
          case'thunder':
            FX.spawn(e.x,e.y,8,'#facc15',4,15);
            let chainTargets=2+(run.chainEx||0);
            let lastTarget=e;
            const hit=new Set([e]);
            for(let c=0;c<chainTargets;c++){
              let nearest=null,nd=999;
              for(const oe of run.rooms[run.roomIdx].enemies){if(oe.hp>0&&!hit.has(oe)){const d2=dist(lastTarget,oe);if(d2<120&&d2<nd){nd=d2;nearest=oe;}}}
              if(!nearest)break;
              nearest.hp-=Math.floor(run.atk*0.3);hit.add(nearest);
              FX.spawn(nearest.x,nearest.y,4,'#facc15',3,10);lastTarget=nearest;
            }
            break;
          case'dark':e.weakTimer=240;FX.spawn(e.x,e.y,6,'#a78bfa',3,20);break;
        }
        // Check element reactions
        checkReactions(e);
      }
    }
  };

  const checkReactions=(e)=>{
    if(e.burnTimer>0&&e.slowTimer>0){// Fire+Ice = Evaporate
      e.hp-=Math.floor(run.atk*2);e.burnTimer=0;e.slowTimer=0;
      FX.spawn(e.x,e.y,15,'#fff',5,30);FX.floatText(e.x,e.y-30,'蒸发!','#fff',18);
      run.elemTriggered.evaporate=true;Audio.sfx.skill();
    }
    if(e.burnTimer>0&&e.stunTimer<=0&&run.elem.thunder>0){// Fire+Thunder = Superconduct (stun)
      e.stunTimer=90;FX.spawn(e.x,e.y,12,'#facc15',5,25);FX.floatText(e.x,e.y-30,'超导!','#facc15',18);
      run.elemTriggered.superconduct=true;
    }
    if(e.slowTimer>0&&e.stunTimer<=0&&run.elem.thunder>0){// Ice+Thunder = Shatter
      e.hp-=Math.floor(run.atk*1.5);e.slowTimer=0;e.stunTimer=60;
      FX.spawn(e.x,e.y,12,'#38bdf8',5,25);FX.floatText(e.x,e.y-30,'碎冰!','#38bdf8',18);
      run.elemTriggered.shatter=true;
    }
    if(e.weakTimer>0&&(e.burnTimer>0||e.slowTimer>0)){// Dark+Any = Annihilate
      e.hp-=Math.floor(run.atk*3);e.weakTimer=0;
      FX.spawn(e.x,e.y,20,'#a78bfa',6,35);FX.floatText(e.x,e.y-30,'湮灭!','#a78bfa',22);
      run.elemTriggered.annihilate=true;
    }
    // Check all reactions achievement
    if(Object.values(run.elemTriggered).every(v=>v))unlockAchieve('elem_master');
  };

  const damagePlayer=(dmg,src)=>{
    if(run.iframe>0||run.dashDur>0||run.buff.invTimer>0)return;
    let finalDmg=Math.max(1,Math.floor(dmg*(1-run.dr)-run.def));
    run.hp-=finalDmg;run.dmgTaken+=finalDmg;run.noHit=false;
    run.iframe=run.iframeDur;
    Audio.sfx.playerHit();
    FX.floatText(run.x,run.y-20,`-${finalDmg}`,'#ef4444',16);
    FX.shake(6,10);
    if(run.reflect>0&&src){
      const refDmg=Math.floor(finalDmg*run.reflect);
      src.hp-=refDmg;FX.floatText(src.x,src.y-src.sz,`反弹${refDmg}`,'#a78bfa',12);
    }
    if(run.hp<=0){
      if(run.revive>0){run.revive--;run.hp=Math.floor(run.mhp*0.3);FX.spawn(run.x,run.y,20,'#f97316',5,40);FX.floatText(run.x,run.y-30,'复活!','#f97316',22);return;}
      gameDeath();
    }
  };

  const onEnemyKill=(e)=>{
    gainXP(e.xp);
    const goldDrop=randInt(1,3+run.floor*2);
    run.gold+=goldDrop;
    FX.floatText(e.x,e.y-e.sz-10,`+${goldDrop}💰`,'#f59e0b',12);
    FX.spawn(e.x,e.y,8,e.col,3,20);
    run.kills++;
    if(run.onKill>0){run.hp=Math.min(run.mhp,run.hp+run.onKill);FX.floatText(run.x,run.y-25,`+${run.onKill}`,'#10b981',12);}
    if(run.killCd>0)for(const sk of run.skills)sk.cdTimer=Math.max(0,sk.cdTimer-run.killCd);
    // Dark matter drop
    const dmDrop=e.boss?randInt(5,10):e.elite?randInt(2,5):Math.random()<.2?1:0;
    if(dmDrop>0){run.dm+=Math.floor(dmDrop*(1+run.dmP));FX.floatText(e.x,e.y,`+${dmDrop}🌑`,'#7c3aed',12);}
    if(run.kills>=100)unlockAchieve('kills_100');
    Audio.sfx.coin();
  };

  const gainXP=(amount)=>{
    run.xp+=amount;
    while(run.xp>=run.xpReq){
      run.xp-=run.xpReq;run.level++;run.xpReq=Math.floor(run.xpReq*1.5);
      run.hp=Math.min(run.mhp,run.hp+10);
      Audio.sfx.levelUp();
      showTalentChoice();
    }
  };

  const updateProjectiles=(room)=>{
    // Player projectiles
    for(let i=run.projList.length-1;i>=0;i--){
      const p=run.projList[i];
      p.x+=p.vx;p.y+=p.vy;p.life--;
      if(p.life<=0||p.x<0||p.x>Dungeon.RW||p.y<0||p.y>Dungeon.RH){run.projList.splice(i,1);continue;}
      for(const e of room.enemies){
        if(e.hp<=0||!e.visible)continue;
        if(dist(p,e)<e.sz+p.sz){
          damageEnemy(e,calcAtk());
          // AOE projectile: explode and damage nearby enemies
          if(p.aoe){
            FX.spawn(p.x,p.y,12,p.col,5,20);FX.shake(4,6);
            for(const oe of room.enemies){
              if(oe!==e&&oe.hp>0&&dist({x:p.x,y:p.y},oe)<p.aoe){
                const aoeDmg=calcAtk();aoeDmg.val=Math.floor(aoeDmg.val*0.6);
                damageEnemy(oe,aoeDmg);
              }
            }
          }
          if(p.el){// Apply element from skill projectiles
            const applyEl={fire:()=>{e.burnTimer=120;e.burnDmg=Math.floor(run.atk*0.15);},ice:()=>{e.slowTimer=180;},thunder:()=>{e.stunTimer=60;},dark:()=>{e.weakTimer=240;}};
            if(applyEl[p.el])applyEl[p.el]();
          }
          if(!p.pierce||p.pierce<=0){run.projList.splice(i,1);break;}
          p.pierce--;
        }
      }
    }
    // Enemy projectiles
    for(let i=run.enemyProj.length-1;i>=0;i--){
      const p=run.enemyProj[i];
      p.x+=p.vx;p.y+=p.vy;p.life--;
      if(p.life<=0||p.x<0||p.x>Dungeon.RW||p.y<0||p.y>Dungeon.RH){run.enemyProj.splice(i,1);continue;}
      if(dist(p,{x:run.x,y:run.y})<p.sz+14){
        damagePlayer(p.dmg);
        run.enemyProj.splice(i,1);
      }
    }
  };

  const checkDoors=(room)=>{
    for(const door of room.doors){
      const dp=Dungeon.getDoorPos(room,door.dir);
      if(dist({x:run.x,y:run.y},dp)<30){
        const target=door.to;
        if(target>=run.rooms.length){nextFloor();return;}
        enterRoom(target);return;
      }
    }
    // Boss room → next floor exit
    if(room.type==='boss'&&room.cleared){
      const exitPos={x:Dungeon.RW/2,y:Dungeon.WALL+20};
      if(dist({x:run.x,y:run.y},exitPos)<40){nextFloor();}
    }
  };

  // === Skill System ===
  const useSkill=(idx)=>{
    const sk=run.skills[idx];
    if(!sk||sk.cdTimer>0)return;
    const cdMul=1-run.cdRed;
    sk.cdTimer=Math.floor(sk.cd*cdMul);
    const skMul=1+run.skDmg;
    const room=run.rooms[run.roomIdx];
    const pa=Math.atan2(mouse.y+run.cam.y-run.y,mouse.x+run.cam.x-run.x);
    Audio.sfx.skill();

    switch(sk.t){
      case'aoe':{
        for(const e of room.enemies){
          if(e.hp>0&&dist(e,{x:run.x,y:run.y})<(sk.r||65)){
            const dmgVal=Math.floor(run.atk*sk.mul*skMul);
            e.hp-=dmgVal;run.dmgDealt+=dmgVal;
            FX.floatText(e.x,e.y-e.sz,`${dmgVal}`,sk.el?{fire:'#f97316',ice:'#38bdf8',thunder:'#facc15',dark:'#a78bfa'}[sk.el]:'#fff',16);
            if(sk.el)applyElementDirect(e,sk.el);
          }
        }
        FX.spawn(run.x,run.y,15,sk.el?{fire:'#f97316',ice:'#38bdf8',thunder:'#facc15',dark:'#a78bfa'}[sk.el]:'#7c3aed',5,25);
        FX.shake(5,8);
        break;
      }
      case'dash':{
        run.dashDur=15;run.dashDir={x:Math.cos(pa),y:Math.sin(pa)};
        run.iframe=20;
        FX.spawn(run.x,run.y,10,'#06b6d4',4,20);
        // Damage along path
        for(const e of room.enemies){
          if(e.hp>0&&dist(e,{x:run.x,y:run.y})<(sk.dist||120)){
            const dmgVal=Math.floor(run.atk*sk.mul*skMul);
            e.hp-=dmgVal;run.dmgDealt+=dmgVal;
            FX.floatText(e.x,e.y-e.sz,`${dmgVal}`,'#06b6d4',16);
          }
        }
        break;
      }
      case'buff':{
        run.buff.atk=sk.dur;run.buff.atkMul=sk.ba;
        FX.spawn(run.x,run.y,12,'#ef4444',4,30);
        FX.floatText(run.x,run.y-30,'狂暴!','#ef4444',20);
        break;
      }
      case'multi':{
        for(let i=0;i<(sk.cnt||5);i++){
          const spread=(i-Math.floor((sk.cnt||5)/2))*0.15;
          run.projList.push({x:run.x,y:run.y,vx:Math.cos(pa+spread)*run.ps*1.2,vy:Math.sin(pa+spread)*run.ps*1.2,dmg:Math.floor(run.atk*sk.mul*skMul),sz:4,col:'#facc15',life:90,pierce:0,isSkill:true,el:sk.el});
        }
        break;
      }
      case'trap':{
        const tx=run.x+Math.cos(pa)*60,ty=run.y+Math.sin(pa)*60;
        room.traps.push({x:tx,y:ty,r:sk.r||45,dmg:Math.floor(run.atk*sk.mul*skMul),cd:0,active:true,dur:sk.dur||180,player:true,el:sk.el,col:'#38bdf8'});
        FX.spawn(tx,ty,6,'#38bdf8',3,15);
        break;
      }
      case'pierce':{
        run.projList.push({x:run.x,y:run.y,vx:Math.cos(pa)*run.ps*1.5,vy:Math.sin(pa)*run.ps*1.5,dmg:Math.floor(run.atk*sk.mul*skMul),sz:8,col:'#a78bfa',life:120,pierce:999,isSkill:true,el:sk.el});
        break;
      }
      case'aoe_proj':{
        run.projList.push({x:run.x,y:run.y,vx:Math.cos(pa)*6,vy:Math.sin(pa)*6,dmg:Math.floor(run.atk*sk.mul*skMul),sz:10,col:'#f97316',life:60,pierce:0,isSkill:true,el:sk.el,aoe:sk.r||55});
        break;
      }
      case'zone':{
        const zx=run.x+Math.cos(pa)*80,zy=run.y+Math.sin(pa)*80;
        // Zone effect: damage enemies in area over duration
        const zone={x:zx,y:zy,r:sk.r||75,dmg:Math.floor(run.atk*sk.mul*skMul/6),life:sk.dur||180,el:sk.el,col:{fire:'#f97316',ice:'#38bdf8',thunder:'#facc15',dark:'#a78bfa'}[sk.el]||'#7c3aed'};
        if(!run.zones)run.zones=[];
        run.zones.push(zone);
        FX.spawn(zx,zy,10,zone.col,4,20);
        break;
      }
    }
  };

  const applyElementDirect=(e,el)=>{
    Audio.sfx.elem(el);
    switch(el){
      case'fire':e.burnTimer=120;e.burnDmg=Math.floor(run.atk*0.15);FX.spawn(e.x,e.y,4,'#f97316',2,15);break;
      case'ice':e.slowTimer=180;FX.spawn(e.x,e.y,4,'#38bdf8',2,15);break;
      case'thunder':e.stunTimer=60;FX.spawn(e.x,e.y,4,'#facc15',2,15);break;
      case'dark':e.weakTimer=240;FX.spawn(e.x,e.y,4,'#a78bfa',2,15);break;
    }
    checkReactions(e);
  };

  const doDash=()=>{
    if(run.dashCd>0||run.dashDur>0)return;
    let dx=0,dy=0;
    if(isMobile&&joyActive){dx=joyDir.x;dy=joyDir.y;}
    else{
      if(keys['KeyW']||keys['ArrowUp'])dy=-1;
      if(keys['KeyS']||keys['ArrowDown'])dy=1;
      if(keys['KeyA']||keys['ArrowLeft'])dx=-1;
      if(keys['KeyD']||keys['ArrowRight'])dx=1;
    }
    if(!dx&&!dy){dx=Math.cos(angle({x:0,y:0},{x:mouse.x+run.cam.x-run.x,y:mouse.y+run.cam.y-run.y}));dy=Math.sin(angle({x:0,y:0},{x:mouse.x+run.cam.x-run.x,y:mouse.y+run.cam.y-run.y}));}
    const len=Math.hypot(dx,dy)||1;
    run.dashDir={x:dx/len,y:dy/len};
    run.dashDur=8;
    run.dashCd=Math.floor(run.dashMax*(1-(run.talents.find(t=>t.fx?.dashR)?.fx?.dashR||0)));
    run.iframe=run.iframeDur+(run.talents.find(t=>t.fx?.iframe)?.fx?.iframe||0);
    if(run.dashInvDur>0)run.buff.invTimer=run.dashInvDur;
    Audio.sfx.dash();
    FX.spawn(run.x,run.y,8,'#06b6d4',4,15);
  };

  // === Overlays ===
  const showTalentChoice=()=>{
    gameState='levelup';
    const pool=[...DATA.talents.str,...DATA.talents.agi,...DATA.talents.mag];
    const chosen=[];
    while(chosen.length<3&&pool.length>0){
      const idx=randInt(0,pool.length-1);
      chosen.push(pool.splice(idx,1)[0]);
    }
    const grid=$('talentGrid');grid.innerHTML='';
    for(const t of chosen){
      const card=document.createElement('div');card.className='talent-card';
      card.innerHTML=`<div class="talent-icon">${t.i}</div><div class="talent-name">${t.n}</div><div class="talent-desc">${t.d}</div>`;
      card.onclick=()=>{applyTalent(t);gameState='playing';$('levelUpOverlay').classList.add('hidden');};
      grid.appendChild(card);
    }
    $('levelUpOverlay').classList.remove('hidden');
  };

  const applyTalent=(t)=>{
    run.talents.push(t);
    const fx=t.fx;
    if(fx.atk)run.atk+=fx.atk;
    if(fx.spd)run.spd+=fx.spd;
    if(fx.mhp){run.mhp+=fx.mhp;run.hp+=fx.mhp;}
    if(fx.critD)run.critD+=fx.critD;
    if(fx.dr)run.dr+=fx.dr;
    if(fx.crit)run.crit+=fx.crit;
    if(fx.skDmg)run.skDmg+=fx.skDmg;
    if(fx.elemB)for(const k of Object.keys(run.elem))run.elem[k]+=fx.elemB;
    if(fx.cdRed)run.cdRed=1-(1-run.cdRed)*(1-fx.cdRed);
    if(fx.killCd)run.killCd+=fx.killCd;
    if(fx.combo)run.combo+=fx.combo;
    if(fx.dashR){}// handled in doDash
    if(fx.iframe)run.iframeDur+=fx.iframe;
    Audio.sfx.pickup();
  };

  const showItemChoice=()=>{
    gameState='itemchoice';
    const pool=DATA.items.filter(it=>{
      if(it.r==='legend'&&Math.random()>0.05+run.luckP)return false;
      if(it.r==='epic'&&Math.random()>0.2+run.luckP)return false;
      if(it.r==='rare'&&Math.random()>0.5+run.luckP)return false;
      return true;
    });
    const chosen=[];
    while(chosen.length<3&&pool.length>0){
      const idx=randInt(0,pool.length-1);
      chosen.push(pool.splice(idx,1)[0]);
    }
    const grid=$('itemGrid');grid.innerHTML='';
    for(const it of chosen){
      const card=document.createElement('div');card.className='item-card';
      card.innerHTML=`<div class="item-icon">${it.icon}</div><div class="item-rarity ${it.r}">${{common:'普通',rare:'稀有',epic:'史诗',legend:'传说'}[it.r]}</div><div class="item-name">${it.name}</div><div class="item-desc">${it.desc}</div>`;
      card.onclick=()=>{applyItem(it);gameState='playing';$('itemChoiceOverlay').classList.add('hidden');};
      grid.appendChild(card);
    }
    $('itemChoiceOverlay').classList.remove('hidden');
  };

  const applyItem=(it)=>{
    run.items.push(it);
    const fx=it.fx;
    if(fx.heal)run.hp=Math.min(run.mhp,run.hp+fx.heal);
    if(fx.atk)run.atk+=fx.atk;
    if(fx.spd)run.spd+=fx.spd;
    if(fx.def)run.def+=fx.def;
    if(fx.crit)run.crit+=fx.crit;
    if(fx.elem)for(const[k,v]of Object.entries(fx.elem))run.elem[k]=(run.elem[k]||0)+v;
    if(fx.onKill)run.onKill+=fx.onKill;
    if(fx.mhp){run.mhp+=fx.mhp;if(fx.mhp>0)run.hp+=fx.mhp;}
    if(fx.berserk)run.berserk=1;
    if(fx.reflect)run.reflect+=fx.reflect;
    if(fx.dashInv)run.dashInvDur+=fx.dashInv;
    if(fx.elemX2)run.elemX2=1;
    if(fx.revive)run.revive+=fx.revive;
    if(fx.cdRed)run.cdRed=1-(1-run.cdRed)*(1-fx.cdRed);
    if(fx.fireDmg)run.fireDmg+=fx.fireDmg;
    if(fx.iceExplode)run.iceExplode=1;
    if(fx.chainEx)run.chainEx=(run.chainEx||0)+fx.chainEx;
    if(run.items.length>=6)unlockAchieve('collector');
    UI.updateItemHUD();
    Audio.sfx.pickup();
  };

  const showShop=()=>{
    gameState='shop';
    $('shopDialog').textContent=pick(DATA.shopDlg);
    const pool=DATA.items.filter(i=>i.r!=='legend');
    const items=[];
    while(items.length<3&&pool.length){items.push(pool.splice(randInt(0,pool.length-1),1)[0]);}
    const grid=$('shopItems');grid.innerHTML='';
    for(const it of items){
      const price=({common:15,rare:30,epic:60})[it.r]||20;
      const card=document.createElement('div');card.className='shop-card';
      card.innerHTML=`<div class="item-icon">${it.icon}</div><div class="item-rarity ${it.r}">${{common:'普通',rare:'稀有',epic:'史诗'}[it.r]}</div><div class="item-name">${it.name}</div><div class="item-desc">${it.desc}</div><div class="shop-price">💰 ${price}</div>`;
      card.onclick=()=>{
        if(run.gold>=price){run.gold-=price;applyItem(it);card.style.opacity='.3';card.style.pointerEvents='none';Audio.sfx.coin();}
      };
      grid.appendChild(card);
    }
    $('shopOverlay').classList.remove('hidden');
  };

  const showEvent=()=>{
    gameState='event';
    const evt=pick(DATA.events);
    $('eventTitle').textContent=evt.t;
    $('eventDesc').textContent=evt.d;
    const choicesDiv=$('eventChoices');choicesDiv.innerHTML='';
    for(const ch of evt.ch){
      const btn=document.createElement('div');btn.className='event-choice';
      btn.innerHTML=`<div class="choice-label">${ch.l}</div><div class="choice-desc">${ch.d}</div>`;
      btn.onclick=()=>{
        applyEventChoice(ch.fx);
        gameState='playing';$('eventOverlay').classList.add('hidden');
      };
      choicesDiv.appendChild(btn);
    }
    $('eventOverlay').classList.remove('hidden');
  };

  const applyEventChoice=(fx)=>{
    if(!fx||Object.keys(fx).length===0)return;
    if(fx.hpCost){run.hp=Math.floor(run.hp*(1-fx.hpCost));}
    if(fx.atk)run.atk+=fx.atk;
    if(fx.mhp){run.mhp+=fx.mhp;if(fx.mhp<0)run.hp=Math.min(run.hp,run.mhp);}
    if(fx.gamble){if(Math.random()<fx.gamble)showItemChoice();else FX.floatText(run.x,run.y-30,'什么也没发生...','#64748b',14);}
    if(fx.elem)for(const[k,v]of Object.entries(fx.elem))run.elem[k]=(run.elem[k]||0)+v;
    Audio.sfx.menu();
  };

  // === End States ===
  const gameDeath=()=>{
    gameState='dead';run.playing=false;
    save.deaths++;save.dm+=run.dm;save.runs++;
    if(run.floor+1>save.bestFloor)save.bestFloor=run.floor+1;
    if(save.deaths>=10)unlockAchieve('deaths_10');
    saveSave();
    Audio.sfx.death();
    $('deathStats').innerHTML=`
      <div class="ds"><div class="dl">到达层</div><div class="dv">${run.floor+1}</div></div>
      <div class="ds"><div class="dl">击杀</div><div class="dv">${run.kills}</div></div>
      <div class="ds"><div class="dl">等级</div><div class="dv">${run.level}</div></div>
    `;
    $('deathDM').textContent=`🌑 ${run.dm}`;
    UI.showScreen('deathScreen');
  };

  const gameVictory=()=>{
    gameState='victory';run.playing=false;
    save.dm+=run.dm*2;save.runs++;save.bestFloor=5;
    unlockAchieve('full_clear');
    if(run.noHit)unlockAchieve('no_hit');
    saveSave();
    Audio.sfx.victory();
    $('victoryStats').innerHTML=`
      <div class="ds"><div class="dl">击杀</div><div class="dv">${run.kills}</div></div>
      <div class="ds"><div class="dl">等级</div><div class="dv">${run.level}</div></div>
      <div class="ds"><div class="dl">总伤害</div><div class="dv">${run.dmgDealt}</div></div>
    `;
    $('victoryDM').textContent=`🌑 ${run.dm*2}`;
    UI.showScreen('victoryScreen');
  };

  const unlockAchieve=(id)=>{
    if(!save.achieves[id]){save.achieves[id]=true;saveSave();FX.floatText(run.x||W/2,run.y?run.y-40:H/2,'🏆 成就解锁!','#f59e0b',20);}
  };

  // Update zones (skill zones like Thunder Storm)
  const updateZones=()=>{
    if(!run.zones)return;
    for(let i=run.zones.length-1;i>=0;i--){
      const z=run.zones[i];z.life--;
      if(z.life<=0){run.zones.splice(i,1);continue;}
      if(z.life%20===0){
        for(const e of run.rooms[run.roomIdx].enemies){
          if(e.hp>0&&dist(e,z)<z.r){
            e.hp-=z.dmg;run.dmgDealt+=z.dmg;
            FX.floatText(e.x,e.y-e.sz,`${z.dmg}`,z.col,12);
            if(z.el)applyElementDirect(e,z.el);
          }
        }
        FX.spawn(z.x,z.y,3,z.col,2,10);
      }
    }
  };

  return{startRun,update,useSkill,doDash,showTalentChoice,showItemChoice,updateZones,nextFloor,damagePlayer,gameDeath,gameVictory,unlockAchieve,enterRoom};
})();

// ===== Renderer =====
const Render=(()=>{
  const STAR_COUNT=80;
  let stars=[];

  const initStars=()=>{stars=[];for(let i=0;i<STAR_COUNT;i++)stars.push({x:rand(0,Dungeon.RW),y:rand(0,Dungeon.RH),s:rand(.5,2),b:rand(.2,.8)});};

  const render=()=>{
    ctx.save();
    const sk=FX.getShake();
    ctx.translate(sk.x,sk.y);
    // Clear ENTIRE canvas first (prevents black border when viewport > room)
    ctx.fillStyle='#000011';ctx.fillRect(0,0,W,H);

    const cam=run.cam;
    ctx.save();
    ctx.translate(-cam.x,-cam.y);

    // Room background
    ctx.fillStyle='#000011';ctx.fillRect(0,0,Dungeon.RW,Dungeon.RH);
    // Stars
    for(const s of stars){
      ctx.globalAlpha=s.b*(.6+Math.sin(animFrame*.02+s.x)*.4);
      ctx.fillStyle='#fff';
      ctx.fillRect(s.x,s.y,s.s,s.s);
    }
    ctx.globalAlpha=1;

    renderRoom();
    renderTraps();
    renderZones();
    renderEnemies();
    renderProjectiles();
    renderPlayer();
    FX.render(ctx,cam);

    ctx.restore();

    renderMinimap();
    ctx.restore();
  };

  const renderRoom=()=>{
    const room=run.rooms[run.roomIdx];
    const{w,h}=room;const W_=Dungeon.WALL;
    // Floor
    const floorCol=DATA.floors[run.floor].col;
    ctx.fillStyle=floorCol+'10';ctx.fillRect(W_,W_,w-W_*2,h-W_*2);
    // Floor grid
    ctx.strokeStyle=floorCol+'15';ctx.lineWidth=1;
    for(let x=W_;x<w-W_;x+=40){ctx.beginPath();ctx.moveTo(x,W_);ctx.lineTo(x,h-W_);ctx.stroke();}
    for(let y=W_;y<h-W_;y+=40){ctx.beginPath();ctx.moveTo(W_,y);ctx.lineTo(w-W_,y);ctx.stroke();}
    // Walls
    ctx.fillStyle='#1a1a3e';
    ctx.fillRect(0,0,w,W_);ctx.fillRect(0,h-W_,w,W_);
    ctx.fillRect(0,0,W_,h);ctx.fillRect(w-W_,0,W_,h);
    // Wall glow
    ctx.strokeStyle=floorCol+'40';ctx.lineWidth=2;
    ctx.strokeRect(W_,W_,w-W_*2,h-W_*2);
    // Doors
    if(run.doorOpen){
      for(const door of room.doors){
        const dp=Dungeon.getDoorPos(room,door.dir);
        const glow=Math.sin(animFrame*.05)*.3+.7;
        ctx.globalAlpha=glow;
        ctx.fillStyle='#06b6d4';
        ctx.beginPath();ctx.arc(dp.x,dp.y,15,0,Math.PI*2);ctx.fill();
        ctx.globalAlpha=1;
        ctx.fillStyle='#fff';ctx.font='bold 12px sans-serif';ctx.textAlign='center';
        ctx.fillText('➡',dp.x,dp.y+4);
      }
    }
    // Boss exit
    if(room.type==='boss'&&room.cleared){
      const glow=Math.sin(animFrame*.08)*.4+.6;
      ctx.globalAlpha=glow;
      ctx.fillStyle='#f59e0b';
      ctx.beginPath();ctx.arc(Dungeon.RW/2,Dungeon.WALL+20,18,0,Math.PI*2);ctx.fill();
      ctx.globalAlpha=1;
      ctx.fillStyle='#000';ctx.font='bold 14px sans-serif';ctx.textAlign='center';
      ctx.fillText('⬆',Dungeon.RW/2,Dungeon.WALL+25);
    }
  };

  const renderPlayer=()=>{
    ctx.save();
    ctx.translate(run.x,run.y);
    // Iframe flash
    if(run.iframe>0&&run.iframe%4<2){ctx.globalAlpha=.4;}
    // Dash trail
    if(run.dashDur>0)ctx.globalAlpha=.6;
    // Body
    ctx.fillStyle='#7c3aed';ctx.beginPath();ctx.arc(0,0,14,0,Math.PI*2);ctx.fill();
    // Inner glow
    ctx.fillStyle='#a78bfa';ctx.beginPath();ctx.arc(0,0,8,0,Math.PI*2);ctx.fill();
    // Direction indicator
    const aim=Math.atan2(mouse.y+run.cam.y-run.y,mouse.x+run.cam.x-run.x);
    ctx.strokeStyle='#e2e8f0';ctx.lineWidth=2;
    ctx.beginPath();ctx.moveTo(Math.cos(aim)*14,Math.sin(aim)*14);ctx.lineTo(Math.cos(aim)*22,Math.sin(aim)*22);ctx.stroke();
    // HP indicator ring
    const hpPct=run.hp/run.mhp;
    ctx.strokeStyle=hpPct>.5?'#10b981':hpPct>.25?'#f59e0b':'#ef4444';
    ctx.lineWidth=3;ctx.beginPath();ctx.arc(0,0,18,-Math.PI/2,-Math.PI/2+Math.PI*2*hpPct);ctx.stroke();
    ctx.globalAlpha=1;
    ctx.restore();
  };

  const renderEnemies=()=>{
    const room=run.rooms[run.roomIdx];
    for(const e of room.enemies){
      if(e.hp<=0)continue;
      if(!e.visible&&e.stealthTimer>0){ctx.globalAlpha=.15;}
      ctx.save();ctx.translate(e.x,e.y);
      // Body
      ctx.fillStyle=e.col;ctx.beginPath();ctx.arc(0,0,e.sz,0,Math.PI*2);ctx.fill();
      // Inner
      ctx.fillStyle=e.col+'80';ctx.beginPath();ctx.arc(0,0,e.sz*.6,0,Math.PI*2);ctx.fill();
      // Elite/Boss indicator
      if(e.boss){ctx.strokeStyle='#ef4444';ctx.lineWidth=3;ctx.beginPath();ctx.arc(0,0,e.sz+4,0,Math.PI*2);ctx.stroke();}
      if(e.elite){ctx.strokeStyle='#f59e0b';ctx.lineWidth=2;ctx.beginPath();ctx.arc(0,0,e.sz+3,0,Math.PI*2);ctx.stroke();}
      // Status effects
      if(e.burnTimer>0){ctx.fillStyle='#f97316';ctx.globalAlpha=.3;ctx.beginPath();ctx.arc(0,0,e.sz+2,0,Math.PI*2);ctx.fill();ctx.globalAlpha=1;}
      if(e.slowTimer>0){ctx.strokeStyle='#38bdf8';ctx.lineWidth=2;ctx.setLineDash([3,3]);ctx.beginPath();ctx.arc(0,0,e.sz+2,0,Math.PI*2);ctx.stroke();ctx.setLineDash([]);}
      if(e.weakTimer>0){ctx.strokeStyle='#a78bfa';ctx.lineWidth=1;ctx.setLineDash([2,2]);ctx.beginPath();ctx.arc(0,0,e.sz+4,0,Math.PI*2);ctx.stroke();ctx.setLineDash([]);}
      if(e.stunTimer>0){ctx.fillStyle='#facc15';ctx.font='bold 10px sans-serif';ctx.textAlign='center';ctx.fillText('💫',0,-e.sz-8);}
      // HP bar
      const bw=e.sz*2;const bh=4;const by=-e.sz-10;
      ctx.fillStyle='rgba(0,0,0,.5)';ctx.fillRect(-bw/2,by,bw,bh);
      const hp=clamp(e.hp/e.mhp,0,1);
      ctx.fillStyle=hp>.5?'#10b981':hp>.25?'#f59e0b':'#ef4444';
      ctx.fillRect(-bw/2,by,bw*hp,bh);

      ctx.restore();
      ctx.globalAlpha=1;
    }
  };

  const renderProjectiles=()=>{
    // Player projectiles
    for(const p of run.projList){
      ctx.fillStyle=p.col;ctx.beginPath();ctx.arc(p.x,p.y,p.sz,0,Math.PI*2);ctx.fill();
      ctx.fillStyle=p.col+'60';ctx.beginPath();ctx.arc(p.x,p.y,p.sz+2,0,Math.PI*2);ctx.fill();
    }
    // Enemy projectiles
    for(const p of run.enemyProj){
      ctx.fillStyle=p.col;ctx.beginPath();ctx.arc(p.x,p.y,p.sz,0,Math.PI*2);ctx.fill();
      ctx.fillStyle='#ef444480';ctx.beginPath();ctx.arc(p.x,p.y,p.sz+1,0,Math.PI*2);ctx.fill();
    }
  };

  const renderTraps=()=>{
    const room=run.rooms[run.roomIdx];
    for(const t of room.traps){
      if(!t.active)continue;
      const pulse=Math.sin(animFrame*.1)*.2+.8;
      ctx.globalAlpha=t.player?0.5:pulse;
      ctx.fillStyle=t.player?(t.col||'#38bdf8'):'#ef4444';
      ctx.beginPath();ctx.arc(t.x,t.y,t.r,0,Math.PI*2);ctx.fill();
      ctx.globalAlpha=1;
      if(!t.player){ctx.strokeStyle='#ef444480';ctx.lineWidth=1;ctx.setLineDash([4,4]);ctx.beginPath();ctx.arc(t.x,t.y,t.r+3,0,Math.PI*2);ctx.stroke();ctx.setLineDash([]);}
    }
  };

  const renderZones=()=>{
    if(!run.zones)return;
    for(const z of run.zones){
      const pulse=Math.sin(animFrame*.15)*.2+.3;
      ctx.globalAlpha=pulse;
      ctx.fillStyle=z.col;
      ctx.beginPath();ctx.arc(z.x,z.y,z.r,0,Math.PI*2);ctx.fill();
      ctx.globalAlpha=.6;
      ctx.strokeStyle=z.col;ctx.lineWidth=2;
      ctx.beginPath();ctx.arc(z.x,z.y,z.r,0,Math.PI*2);ctx.stroke();
      ctx.globalAlpha=1;
    }
  };

  const renderMinimap=()=>{
    const mc=mmCtx;const mw=160,mh=160;
    mc.clearRect(0,0,mw,mh);
    mc.fillStyle='rgba(0,0,17,.9)';mc.fillRect(0,0,mw,mh);
    if(!run.rooms||!run.rooms.length)return;
    // Find bounds
    let minGx=Infinity,maxGx=-Infinity,minGy=Infinity,maxGy=-Infinity;
    for(const r of run.rooms){minGx=Math.min(minGx,r.gx);maxGx=Math.max(maxGx,r.gx);minGy=Math.min(minGy,r.gy);maxGy=Math.max(maxGy,r.gy);}
    const rangeX=maxGx-minGx+1;const rangeY=maxGy-minGy+1;
    const cellW=Math.min(20,Math.floor((mw-20)/rangeX));
    const cellH=Math.min(20,Math.floor((mh-20)/rangeY));
    const ox=(mw-rangeX*cellW)/2;const oy=(mh-rangeY*cellH)/2;

    for(const r of run.rooms){
      if(!r.explored)continue;
      const rx=ox+(r.gx-minGx)*cellW;
      const ry=oy+(r.gy-minGy)*cellH;
      // Room color
      if(r.idx===run.roomIdx)mc.fillStyle='#7c3aed';
      else if(r.cleared)mc.fillStyle='#1a1a3e';
      else mc.fillStyle='#3b82f6';
      mc.fillRect(rx+1,ry+1,cellW-2,cellH-2);
      // Room type indicator
      mc.fillStyle='#fff';mc.font='8px sans-serif';mc.textAlign='center';
      const typeIcon={'boss':'💀','elite':'⚔','treasure':'🎁','shop':'🏪','event':'❓','start':'🏠','combat':''}[r.type]||'';
      if(typeIcon)mc.fillText(typeIcon,rx+cellW/2,ry+cellH/2+3);
      // Connections
      for(const d of r.doors){
        const tr=run.rooms[d.to];
        if(!tr||!tr.explored)continue;
        const trx=ox+(tr.gx-minGx)*cellW;
        const try_=oy+(tr.gy-minGy)*cellH;
        mc.strokeStyle='#64748b';mc.lineWidth=1;
        mc.beginPath();mc.moveTo(rx+cellW/2,ry+cellH/2);mc.lineTo(trx+cellW/2,try_+cellH/2);mc.stroke();
      }
    }
    // Player dot
    mc.fillStyle='#10b981';mc.beginPath();
    const prx=ox+(run.rooms[run.roomIdx].gx-minGx)*cellW+cellW/2;
    const pry=oy+(run.rooms[run.roomIdx].gy-minGy)*cellH+cellH/2;
    mc.arc(prx,pry,3,0,Math.PI*2);mc.fill();
  };

  return{render,initStars};
})();

// ===== UI Manager =====
const UI=(()=>{
  const screens=['menuScreen','charScreen','gameScreen','deathScreen','victoryScreen','metaScreen','achieveScreen','howScreen'];
  const overlays=['pauseOverlay','levelUpOverlay','itemChoiceOverlay','shopOverlay','eventOverlay'];

  const showScreen=(id)=>{
    for(const s of screens)$(s).classList.toggle('hidden',s!==id);
    for(const o of overlays)$(o).classList.add('hidden');
    if(id==='gameScreen'){$('hud').style.display='flex';$('minimap').style.display='block';if(isMobile)$('mobileControls').classList.remove('hidden');}
    else{$('hud').style.display='none';$('minimap').style.display='none';$('mobileControls').classList.add('hidden');}
  };

  const updateHUD=()=>{
    if(gameState!=='playing')return;
    const hpPct=clamp(run.hp/run.mhp,0,1)*100;
    $('hpFill').style.width=hpPct+'%';
    $('hpText').textContent=`${Math.max(0,run.hp)}/${run.mhp}`;
    const fd=DATA.floors[run.floor];
    $('hudFloor').textContent=`L${run.floor+1} · ${fd.name}`;
    $('hudRoom').textContent=`房间 ${run.roomIdx+1}/${run.rooms.length}`;
    // Skills CD
    for(let i=0;i<3;i++){
      const sk=run.skills[i];
      const cdEl=$(['cdQ','cdE','cdR'][i]);
      if(sk&&sk.cdTimer>0){
        cdEl.style.display='block';
        const cdMul=1-run.cdRed;
        cdEl.style.height=`${(sk.cdTimer/(sk.cd*cdMul))*100}%`;
      }else{cdEl.style.display='none';}
    }
    // Dash bar
    const dashPct=run.dashCd>0?(1-run.dashCd/run.dashMax)*100:100;
    $('dashFill').style.width=dashPct+'%';
    // Counters
    $('hudDarkMatter').textContent=`🌑 ${run.dm}`;
    $('hudGold').textContent=`💰 ${run.gold}`;
  };

  const updateItemHUD=()=>{
    const div=$('hudItems');div.innerHTML='';
    for(const it of run.items){
      const el=document.createElement('div');
      el.className=`hud-item ${it.r}`;
      el.textContent=it.icon;
      el.title=`${it.name}: ${it.desc}`;
      div.appendChild(el);
    }
  };

  const renderMeta=()=>{
    $('metaDM').textContent=save.dm;
    const grid=$('metaGrid');grid.innerHTML='';
    for(const m of DATA.meta){
      const lv=save.meta[m.id]||0;
      const maxed=lv>=m.max;
      const cost=m.cost*(lv+1);
      const card=document.createElement('div');
      card.className='meta-card'+(maxed?' maxed':'');
      card.innerHTML=`<div class="meta-icon">${m.i}</div><div class="meta-name">${m.n}</div><div class="meta-level">Lv.${lv}/${m.max}</div>${maxed?'<div class="meta-cost">已满级</div>':`<div class="meta-cost">💰 ${cost} 暗物质</div>`}`;
      if(!maxed){card.onclick=()=>{
        if(save.dm>=cost){save.dm-=cost;save.meta[m.id]=(save.meta[m.id]||0)+1;
          if(save.meta[m.id]>=m.max)Engine.unlockAchieve('meta_max');
          saveSave();renderMeta();Audio.sfx.pickup();}
      };}
      grid.appendChild(card);
    }
  };

  const renderAchieves=()=>{
    const grid=$('achieveGrid');grid.innerHTML='';
    for(const a of DATA.achieves){
      const unlocked=save.achieves[a.id];
      const card=document.createElement('div');
      card.className='achieve-card'+(unlocked?' unlocked':'');
      card.innerHTML=`<div class="achieve-icon">${a.i}</div><div class="achieve-info"><div class="achieve-name">${a.n}</div><div class="achieve-desc">${a.d}</div></div>`;
      grid.appendChild(card);
    }
  };

  return{showScreen,updateHUD,updateItemHUD,renderMeta,renderAchieves};
})();

// ===== Save / Load =====
const loadSave=()=>{try{const s=localStorage.getItem('voidabyss_save');if(s)save=JSON.parse(s);}catch(e){}};
const saveSave=()=>{try{localStorage.setItem('voidabyss_save',JSON.stringify(save));}catch(e){}};

// ===== Input =====
const Input=(()=>{
  const init=()=>{
    // Keyboard
    document.addEventListener('keydown',e=>{
      keys[e.code]=true;
      if(gameState==='playing'){
        if(e.code==='Space'){e.preventDefault();Engine.doDash();}
        if(e.code==='KeyQ')Engine.useSkill(0);
        if(e.code==='KeyE')Engine.useSkill(1);
        if(e.code==='KeyR')Engine.useSkill(2);
        if(e.code==='Escape'){
          if(gameState==='playing'){gameState='paused';$('pauseOverlay').classList.remove('hidden');}
        }
      }
    });
    document.addEventListener('keyup',e=>{keys[e.code]=false;});

    // Mouse
    canvas.addEventListener('mousemove',e=>{const r=canvas.getBoundingClientRect();mouse.x=e.clientX-r.left;mouse.y=e.clientY-r.top;});
    canvas.addEventListener('mousedown',e=>{if(e.button===0)mouse.down=true;});
    canvas.addEventListener('mouseup',e=>{if(e.button===0)mouse.down=false;});
    canvas.addEventListener('contextmenu',e=>e.preventDefault());

    // Mobile detection
    isMobile='ontouchstart'in window||navigator.maxTouchPoints>0;
    if(isMobile)initTouch();

    // Visibility change
    document.addEventListener('visibilitychange',()=>{
      if(document.hidden&&gameState==='playing'){gameState='paused';$('pauseOverlay').classList.remove('hidden');}
    });
  };

  const initTouch=()=>{
    const joystick=$('joystick'),knob=$('joyKnob');
    let joyCenter={x:0,y:0};

    const handleJoy=(e)=>{
      e.preventDefault();
      const t=e.touches[0];const r=joystick.getBoundingClientRect();
      joyCenter={x:r.left+r.width/2,y:r.top+r.height/2};
      const dx=t.clientX-joyCenter.x,dy=t.clientY-joyCenter.y;
      const dist_=Math.hypot(dx,dy);const maxR=50;
      const clampD=Math.min(dist_,maxR);
      const nx=dx/Math.max(dist_,1)*clampD,ny=dy/Math.max(dist_,1)*clampD;
      knob.style.transform=`translate(calc(-50% + ${nx}px), calc(-50% + ${ny}px))`;
      joyDir={x:dx/Math.max(dist_,1),y:dy/Math.max(dist_,1)};
      joyActive=true;
    };

    joystick.addEventListener('touchstart',e=>{joyActive=true;handleJoy(e);},{passive:false});
    joystick.addEventListener('touchmove',handleJoy,{passive:false});
    joystick.addEventListener('touchend',()=>{joyActive=false;joyDir={x:0,y:0};knob.style.transform='translate(-50%,-50%)';});

    // Mobile buttons
    $('mAttack').addEventListener('touchstart',()=>{mouse.down=true;mouse.x=W/2+100;mouse.y=H/2;});
    $('mAttack').addEventListener('touchend',()=>{mouse.down=false;});
    $('mDash').addEventListener('touchstart',()=>Engine.doDash());
    $('mSkillQ').addEventListener('touchstart',()=>Engine.useSkill(0));
    $('mSkillE').addEventListener('touchstart',()=>Engine.useSkill(1));
    $('mSkillR').addEventListener('touchstart',()=>Engine.useSkill(2));
  };

  return{init};
})();

// ===== Background Stars (menu) =====
const BG=(()=>{
  let stars=[];
  const init=()=>{
    bgCanvas.width=window.innerWidth;bgCanvas.height=window.innerHeight;
    stars=[];for(let i=0;i<120;i++)stars.push({x:rand(0,bgCanvas.width),y:rand(0,bgCanvas.height),s:rand(.5,2.5),b:rand(.1,1),sp:rand(.1,.5)});
  };
  const render=()=>{
    bgCtx.clearRect(0,0,bgCanvas.width,bgCanvas.height);
    bgCtx.fillStyle='#000011';bgCtx.fillRect(0,0,bgCanvas.width,bgCanvas.height);
    for(const s of stars){
      s.y+=s.sp;if(s.y>bgCanvas.height){s.y=0;s.x=rand(0,bgCanvas.width);}
      bgCtx.globalAlpha=s.b*(.5+Math.sin(animFrame*.01+s.x)*.5);
      ctx.fillStyle='#fff';
      bgCtx.fillStyle='#e2e8f0';bgCtx.fillRect(s.x,s.y,s.s,s.s);
    }
    bgCtx.globalAlpha=1;
  };
  return{init,render};
})();

// ===== Button Bindings =====
const bindButtons=()=>{
  // Main Menu
  $('btnStart').onclick=()=>{Audio.init();Audio.sfx.menu();UI.showScreen('charScreen');};
  $('btnMeta').onclick=()=>{Audio.sfx.menu();UI.renderMeta();UI.showScreen('metaScreen');};
  $('btnAchieve').onclick=()=>{Audio.sfx.menu();UI.renderAchieves();UI.showScreen('achieveScreen');};
  $('btnHow').onclick=()=>{Audio.sfx.menu();UI.showScreen('howScreen');};
  $('btnMute').onclick=()=>{const m=Audio.toggleMute();$('btnMute').textContent=m?'🔇':'🔊';};
  // Character Select
  document.querySelectorAll('.char-card').forEach(card=>{
    card.onclick=()=>{
      const charId=card.dataset.char;
      document.querySelectorAll('.char-card').forEach(c=>c.classList.remove('selected'));
      card.classList.add('selected');
      Audio.sfx.menu();
      setTimeout(()=>{Engine.startRun(charId);Render.initStars();save.runs++;saveSave();},300);
    };
  });
  $('btnCharBack').onclick=()=>{Audio.sfx.menu();UI.showScreen('menuScreen');};
  // Pause
  $('btnPause').onclick=()=>{if(gameState==='playing'){gameState='paused';$('pauseOverlay').classList.remove('hidden');}};
  $('btnResume').onclick=()=>{gameState='playing';$('pauseOverlay').classList.add('hidden');};
  $('btnQuit').onclick=()=>{gameState='menu';UI.showScreen('menuScreen');};
  $('btnMuteGame').onclick=()=>{const m=Audio.toggleMute();$('btnMuteGame').textContent=m?'🔇':'🔊';$('btnMute').textContent=m?'🔇':'🔊';};
  // Shop close
  $('btnShopClose').onclick=()=>{gameState='playing';$('shopOverlay').classList.add('hidden');};
  // Death / Victory
  $('btnRetry').onclick=()=>{Audio.sfx.menu();UI.showScreen('charScreen');};
  $('btnDeathMenu').onclick=()=>{Audio.sfx.menu();UI.showScreen('menuScreen');};
  $('btnVictoryRetry').onclick=()=>{Audio.sfx.menu();UI.showScreen('charScreen');};
  $('btnVictoryMenu').onclick=()=>{Audio.sfx.menu();UI.showScreen('menuScreen');};
  // Meta / Achieve back
  $('btnMetaBack').onclick=()=>{Audio.sfx.menu();UI.showScreen('menuScreen');};
  $('btnAchieveBack').onclick=()=>{Audio.sfx.menu();UI.showScreen('menuScreen');};
  $('btnHowBack').onclick=()=>{Audio.sfx.menu();UI.showScreen('menuScreen');};
};

// ===== Resize =====
const resize=()=>{
  W=window.innerWidth;H=window.innerHeight;
  canvas.width=W;canvas.height=H;
  BG.init();
};

// ===== Game Loop =====
const gameLoop=(timestamp)=>{
  animFrame++;
  dt=Math.min(32,(timestamp-lastTime)||16);lastTime=timestamp;

  if(gameState==='playing'){
    Engine.update();
    Engine.updateZones();
    Render.render();
  }

  if(gameState==='menu'||gameState==='dead'||gameState==='victory'){
    BG.render();
  }

  requestAnimationFrame(gameLoop);
};

// ===== Init =====
const initGame=()=>{
  loadSave();
  resize();
  window.addEventListener('resize',resize);
  Input.init();
  bindButtons();
  BG.init();

  // Loading animation
  let progress=0;
  const ldInterval=setInterval(()=>{
    progress+=randInt(5,15);
    if(progress>=100){
      progress=100;
      clearInterval(ldInterval);
      setTimeout(()=>{
        $('loading').style.display='none';
        UI.showScreen('menuScreen');
      },400);
    }
    $('ldFill').style.width=progress+'%';
  },80);
};

// Start!
initGame();
