import {validateUsername,usernameColor} from './src/usernames.js';
import express from 'express';
import {createServer} from 'node:http';
import {Server,Room} from 'colyseus';
import {createServer as createViteServer} from 'vite';
class Arena extends Room {
 static codes=new Set();
 static active=new Map();
 static list(){return [...Arena.active.values()].filter(r=>Object.keys(r.players).length).map(r=>({code:r.roomId,players:Object.keys(r.players).length,capacity:4,level:r.wave,phase:r.phase}));}
 onAuth(_client,options){const result=validateUsername(options.username||'');if(result.error)throw new Error(result.error);return true;}
 maxClients=4;
 onDispose(){Arena.codes.delete(this.roomId);Arena.active.delete(this.roomId);}
 onCreate(){const start=Math.floor(Math.random()*9000);let code;for(let i=0;i<9000;i++){const candidate=String(1000+(start+i)%9000);if(!Arena.codes.has(candidate)){code=candidate;break;}}if(!code)throw new Error('All room codes are in use. Try again shortly.');this.roomId=code;Arena.codes.add(code);this.players={};this.enemies=[];this.pickups=[];this.wave=0;this.phase='lobby';this.serial=0;this.timer=0;this.setMetadata({title:'Ronin room'});Arena.active.set(this.roomId,this);
 this.onMessage('choose',(c,d)=>{let p=this.players[c.sessionId];if(this.phase==='lobby'&&p){p.hero=Math.max(0,Math.min(3,Number(d)||0));p.maxHp=p.hero===0?150:100;p.hp=p.maxHp;}});
 this.onMessage('input',(c,d)=>{let p=this.players[c.sessionId];if(p)p.input={x:Math.max(-1,Math.min(1,Number(d.x)||0)),y:Math.max(-1,Math.min(1,Number(d.y)||0)),attack:!!d.attack,dodge:!!d.dodge,revive:!!d.revive,jump:!!d.jump,special:!!d.special};});
 this.onMessage('start',(c,options)=>{if(c.sessionId===Object.keys(this.players)[0]&&['lobby','over','victory'].includes(this.phase)){for(let p of Object.values(this.players)){p.maxHp=p.hero===0?150:100;p.hp=p.maxHp;p.specialCd=0;p.cast=0;p.stompPending=false;p.specialActive=0;p.specialHeld=false;p.helper=null;p.jump=0;p.jumpCd=0;p.jumpHeld=false;p.revivesUsed=0;p.reviveProgress=0;p.score=0;p.level=0;}this.startLevel=1;this.wave=this.startLevel-1;this.pickups=[];this.nextWave();}});
 this.setSimulationInterval(dt=>this.tick(dt/1000),33);
 }
 onJoin(c,o){this.players[c.sessionId]={id:c.sessionId,username:validateUsername(o.username||'').name,nameColor:usernameColor(o.nameColor),hero:Math.max(0,Math.min(3,Number(o.hero)||0)),x:420+Object.keys(this.players).length*70,y:370,hp:100,revivesUsed:0,score:0,level:0,cd:0,dash:0,swing:0,jump:0,jumpCd:0,jumpHeld:false,input:{}};const p=this.players[c.sessionId];p.maxHp=p.hero===0?150:100;p.hp=p.maxHp;c.send('welcome',{room:this.roomId});}
 onLeave(c){delete this.players[c.sessionId];}
 nextWave(){this.wave++;if(this.wave>15){this.phase='victory';return;}this.phase='intro';this.introRemaining=6;this.enemies=[];this.pickups=[];Object.values(this.players).forEach((p,i)=>{p.x=420+i*70;p.y=370;p.input={};p.jump=0;p.swing=0;p.dash=0;p.helper=null;});this.partySize=Math.max(1,Math.min(4,Object.keys(this.players).length));const n=Math.ceil((5+Math.min(this.wave,6)*2+Math.max(0,this.wave-6))*[.60,1.25,1.8,2.25][this.partySize-1]);this.initialCount=n;this.reinforcements=Math.ceil(n*.5);this.reinforcementTimer=10;this.specialTimer=5+Math.random()*7;this.specialRolled=false;}
 beginFight(){this.phase='fight';this.pickups.push({id:++this.serial,x:500,y:this.wave>6?500:545,heal:40,shared:true});for(let i=0;i<this.initialCount;i++)this.spawnEnemy(false,i);if(this.wave%3===0)this.spawnEnemy(true,this.initialCount);}
 spawnEnemy(boss=false,i=0,special=false){
 const w=this.wave<=6?this.wave:6+(this.wave-6)*.25,size=Math.max(1,Math.min(4,this.partySize||1)),tier=size-1;
 // Solo has room to recover; parties face more bodies and stronger bosses.
 const hp=Math.round((special?30+w*8:boss?310+w*70:47+w*13)*(special?[1,1.2,1.4,1.6][tier]:boss?[.55,1.5,2.3,3][tier]:[.68,1.3,1.65,1.95][tier]));
 const speed=(special?100+w*5:boss?52+w*6:74+w*7)*[.84,1,1.05,1.08][tier];
 const damage=Math.round((special?4+w:boss?15+w*3:6+w*2)*[.57,.95,1.05,1.1][tier]);
 this.enemies.push({id:++this.serial,x:100+Math.random()*800,y:this.wave>6?(i%2?185:495):(i%2?(boss?184:120):530),hp,max:hp,boss,special,spawn:1.2,kind:special?6:(this.wave<=6?this.wave-1:this.wave),speed,damage,cd:0});
 }

 hit(p,e,damage){if(e.hp<=0||e.spawn>0)return;e.hp-=damage;if(e.hp<=0){p.score+=e.boss?150:15;if(e.special)this.pickups.push({id:++this.serial,x:e.x,y:e.y,heal:30});}}
 specialTick(p,dt){
 p.cast=Math.max(0,(p.cast||0)-dt);p.specialCd=Math.max(0,(p.specialCd||0)-dt);
 const previous=p.specialActive||0;p.specialActive=Math.max(0,previous-dt);
 if(p.hp<=0||!['fight','rest'].includes(this.phase)){p.specialActive=0;p.cast=0;p.stompPending=false;p.windPending=false;p.waterPending=false;p.helper=null;p.specialHeld=!!p.input.special;return;}
 if(p.input.special&&!p.specialHeld&&!p.specialCd){
 p.specialCd=25;p.cast=.8;p.jump=0;p.swing=0;p.specialActive=[.8,6,1.4,2.4][p.hero];
 if(p.hero===0){p.stompX=p.x;p.stompY=p.y;p.stompPending=true;}
 if(p.hero===2){p.windPending=true;p.windX=p.x;p.windY=p.y;}
 if(p.hero===3){p.cast=2.4;p.waterPending=true;p.waterX=p.x;p.waterY=p.y;const targets=this.enemies.filter(e=>e.hp>0&&!(e.spawn>0)).sort((a,b)=>Math.hypot(a.x-p.x,a.y-p.y)-Math.hypot(b.x-p.x,b.y-p.y));const target=targets[0],dx=target?target.x-p.x:p.faceX||1,dy=target?target.y-p.y:p.faceY||0,n=Math.hypot(dx,dy)||1;p.waterDX=dx/n;p.waterDY=dy/n;}
 }
 if(p.stompPending&&p.specialActive<=.48){p.stompPending=false;for(const e of this.enemies){const dx=e.x-p.x,dy=e.y-p.y,n=Math.hypot(dx,dy);if(n<180&&e.hp>0&&!(e.spawn>0)){this.hit(p,e,45);e.kx=dx/(n||1)||1;e.ky=dy/(n||1);e.knock=.5;e.stun=.8;}}}
 p.specialHeld=!!p.input.special;
 if(p.hero===2&&p.windPending&&p.specialActive<=1.05){p.windPending=false;for(const e of this.enemies){const dx=e.x-p.windX,dy=e.y-p.windY,n=Math.hypot(dx,dy);if(n<240&&e.hp>0&&!(e.spawn>0)){this.hit(p,e,35);e.kx=dx/(n||1)||1;e.ky=dy/(n||1);e.knock=.65;e.stun=.9;}}}
 if(p.hero===3&&p.waterPending&&p.specialActive<=.85){p.waterPending=false;for(const e of this.enemies){const dx=e.x-p.waterX,dy=e.y-p.waterY,n=Math.hypot(dx,dy);if(n<250&&(n<45||(dx*p.waterDX+dy*p.waterDY)/(n||1)>.65))this.hit(p,e,65);}}
 p.helper=null;
 }
 tick(dt){if(this.phase==='intro'){this.introRemaining=Math.max(0,this.introRemaining-dt);if(this.introRemaining===0)this.beginFight();}for(const e of this.enemies)e.spawn=Math.max(0,(e.spawn||0)-dt);for(let p of Object.values(this.players)){p.cd=Math.max(0,p.cd-dt);p.dash=Math.max(0,p.dash-dt);p.swing=Math.max(0,p.swing-dt);p.jump=Math.max(0,(p.jump||0)-dt);p.jumpCd=Math.max(0,(p.jumpCd||0)-dt);this.specialTick(p,dt);if(!['lobby','fight','rest'].includes(this.phase)||p.hp<=0)continue;let i=p.input,n=Math.max(1,Math.hypot(i.x||0,i.y||0));if(p.cast>0){p.jumpHeld=!!i.jump;continue;}if(i.jump&&!p.jumpHeld&&p.jumpCd===0){p.jump=.65;p.jumpCd=1.1;}p.jumpHeld=!!i.jump;if(i.x||i.y){const f=Math.hypot(i.x||0,i.y||0);p.faceX=(i.x||0)/f;p.faceY=(i.y||0)/f;}let speed=[155,190,235,175][p.hero];if(i.dodge&&p.dash===0)p.dash=1.6;let inv=p.dash>1.32;if(inv)speed=[540,620,720,580][p.hero];const moving=Math.hypot(i.x||0,i.y||0)>.05;if(p.hero===3&&moving&&!inv){p.swayTime=(p.swayTime||0)+dt;speed*=1+.085*Math.sin(p.swayTime*5);}const weave=p.hero===3&&moving&&!inv?Math.sin((p.swayTime||0)*5)*11:0;p.x=Math.max(this.wave>6?90:55,Math.min(this.wave>6?910:945,p.x+((i.x||0)/n*speed-(i.y||0)/n*weave)*dt));p.y=Math.max(this.wave>6?180:110,Math.min(this.wave>6?510:550,p.y+((i.y||0)/n*speed+(i.x||0)/n*weave)*dt));if(this.phase==='fight'&&i.attack&&p.cd===0){p.cd=.42;p.swing=.2;for(let e of this.enemies)if(e.hp>0&&!(e.spawn>0)&&Math.hypot(e.x-p.x,e.y-p.y)<105){e.hp-=[38,27,20,25][p.hero]+(p.hero===1&&p.specialActive>0?24:0);if(e.hp<=0){p.score+=e.boss?150:15;if(e.special)this.pickups.push({id:++this.serial,x:e.x,y:e.y,heal:30});}}}}
 if(this.phase==='fight'&&this.reinforcements>0){this.reinforcementTimer-=dt;if(this.reinforcementTimer<=0||!this.enemies.some(e=>e.hp>0)){for(let j=0;j<this.reinforcements;j++)this.spawnEnemy(false,j);this.reinforcements=0;}}
 if(this.phase==='fight'&&!this.specialRolled){this.specialTimer-=dt;if(this.specialTimer<=0){this.specialRolled=true;if(Math.random()<.65)this.spawnEnemy(false,0,true);}}
 if(['fight','rest'].includes(this.phase))this.pickups=this.pickups.filter(drop=>{if(drop.used)return true;const alive=Object.values(this.players).filter(p=>p.hp>0),hurt=alive.filter(p=>p.hp<(p.maxHp||100));if(drop.shared&&alive.length<2)return true;const collector=alive.find(p=>(drop.shared?hurt.length:p.hp<(p.maxHp||100))&&Math.hypot(p.x-drop.x,p.y-drop.y)<38);if(!collector)return true;if(drop.shared){let pool=drop.heal,recipients=hurt;while(pool>.001&&recipients.length){const share=pool/recipients.length;for(const p of recipients){const amount=Math.min(share,(p.maxHp||100)-p.hp);p.hp+=amount;pool-=amount;}recipients=recipients.filter(p=>p.hp<(p.maxHp||100)-.001);}drop.used=true;return true;}collector.hp=Math.min(collector.maxHp||100,collector.hp+drop.heal);return false;});
 this.enemies=this.enemies.filter(e=>e.hp>0);
 if(['fight','rest'].includes(this.phase))for(const fallen of Object.values(this.players).filter(p=>p.hp<=0&&(p.revivesUsed||0)<3)){
 const helper=Object.values(this.players).find(p=>p.hp>0&&!(p.jump>0)&&p.input.revive&&Math.hypot(p.x-fallen.x,p.y-fallen.y)<80);
 fallen.reviveProgress=helper?(fallen.reviveProgress||0)+dt:0;
 if(fallen.reviveProgress>=2){fallen.hp=60;fallen.revivesUsed=(fallen.revivesUsed||0)+1;fallen.reviveProgress=0;fallen.dash=1.6;}
 }

 if(this.phase==='fight'){let alive=Object.values(this.players).filter(p=>p.hp>0);if(!alive.length)this.phase='over';else{for(let e of this.enemies){if(e.spawn>0)continue;if(e.stun>0){e.stun=Math.max(0,e.stun-dt);if(e.knock>0){e.knock=Math.max(0,e.knock-dt);e.x+=e.kx*300*dt;e.y+=e.ky*300*dt;}continue;}let p=alive.reduce((a,b)=>Math.hypot(a.x-e.x,a.y-e.y)<Math.hypot(b.x-e.x,b.y-e.y)?a:b);let dx=p.x-e.x,dy=p.y-e.y,n=Math.hypot(dx,dy)||1;e.cd=Math.max(0,e.cd-dt);if(n>35){e.x+=dx/n*e.speed*dt;e.y+=dy/n*e.speed*dt;}if(n<(e.boss?75:40)&&e.cd===0){e.cd=e.boss?1.3:1;if(p.dash<1.32&&!(p.jump>.12&&p.jump<.53))p.hp=Math.max(0,p.hp-e.damage);}}if(!this.enemies.length){this.phase='rest';this.timer=8;}}}
 // Keep defeated-party scenes alive and prevent enemies piling onto one point.
 if(['fight','over'].includes(this.phase)){
 for(const e of this.enemies){
 if(e.spawn>0)continue;
 if(this.phase==='over'){e.roamTime=(e.roamTime||0)+dt;const angle=e.id*2.399+Math.sin(e.roamTime*.4)*.8;e.x+=Math.cos(angle)*35*dt;e.y+=Math.sin(angle)*35*dt;}
 let sx=0,sy=0;
 for(const other of this.enemies){if(other===e)continue;let dx=e.x-other.x,dy=e.y-other.y,d=Math.hypot(dx,dy);const spacing=e.boss||other.boss?70:42;if(d<spacing){if(d<.01){dx=Math.cos(e.id*2.399);dy=Math.sin(e.id*2.399);d=1;}const push=(spacing-d)/spacing*60;sx+=dx/d*push;sy+=dy/d*push;}}
 const margin=e.boss?110:this.wave>6?90:70;e.x=Math.max(margin,Math.min(1000-margin,e.x+sx*dt));e.y=Math.max(this.wave>6?185:e.boss?184:120,Math.min(this.wave>6?510:540,e.y+sy*dt));
 }
 }
 if(this.phase==='rest'){this.timer-=dt;if(this.timer<=0)this.nextWave();}this.broadcast('world',{players:this.players,enemies:this.enemies,pickups:this.pickups,wave:this.wave,startLevel:this.startLevel||1,phase:this.phase,partySize:this.partySize||1,introRemaining:this.introRemaining||0,timer:Math.ceil(this.timer)});}
}
class LobbyChat extends Room {
 onAuth(_client,options){const result=validateUsername(options.username||'');if(result.error)throw new Error(result.error);return true;}
 onCreate(){this.history=[];this.users=new Map();this.serial=0;this.onMessage('chat',(client,data)=>{const user=this.users.get(client.sessionId);if(!user||typeof data?.text!=='string')return;const text=data.text.replace(/[\x00-\x1f\x7f]/g,' ').trim().slice(0,240);if(!text)return;if(Date.now()-user.last<1000){client.send('chat-error','Please wait a second between messages.');return;}user.last=Date.now();const message={id:++this.serial,name:user.name,text};this.history.push(message);if(this.history.length>60)this.history.shift();this.broadcast('chat',message);});}
 onJoin(client,options){const name=validateUsername(options.username||'').name;this.users.set(client.sessionId,{name,last:0});client.send('history',this.history);}
 onLeave(client){this.users.delete(client.sessionId);}
}
const app=express();const http=createServer(app);const game=new Server({server:http});game.define('arena',Arena);game.define('lobby-chat',LobbyChat);
app.get('/api/rooms',(_req,res)=>res.set('Cache-Control','no-store').json(Arena.list()));
if(process.env.NODE_ENV==='production')app.use(express.static('dist'));else{const vite=await createViteServer({server:{middlewareMode:true},appType:'spa'});app.use(vite.middlewares);}
await game.listen(Number(process.env.PORT)||3000,'0.0.0.0');console.log('Ronin Together ready on port '+(process.env.PORT||3000));
