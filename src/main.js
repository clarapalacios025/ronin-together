import {validateUsername} from './usernames.js';
import './portrait-effects.js';
import {mountEnding} from './ending.js';
import {defaults,assignKey,padInput,keyName} from './controls.js';
import {goSound,landingSound,unlockAudio,slashSound,monsterSound,musicMode,audioSettings,setAudioSettings} from './audio.js';
import Phaser from 'phaser';
import {Client} from 'colyseus.js';
import './style.css';
const arenaNames=['Lantern Courtyard','Bamboo Grove','Crimson Shrine','Snowbound Fortress','Riverside Village','Volcanic Gate','Cherry Blossom Garden','Fishing Harbor','Mountain Monastery','Tea Terraces','Moonlit Cemetery','Autumn Forest','Castle Rooftops','Storm Coast','Shogun Courtyard'];
const arenaTextures=['lantern-hd','bamboo-hd','shrine-hd','snow-hd','river-hd','volcano-hd',...Array.from({length:9},(_,i)=>`level-${i+7}`)];
mountEnding(document.querySelector('.campfire-view'));
const $=id=>document.getElementById(id);let hero=0,room,world,game;const touch={},held=new Set();
let bindings={...defaults};try{const saved=JSON.parse(localStorage.getItem('ronin-keybinds'));if(saved&&Object.keys(saved).every(k=>k in defaults&&typeof saved[k]==='string'))bindings={...defaults,...saved};}catch{}
let capturing=null;
const portraitBlocked=()=>matchMedia('(pointer:coarse) and (orientation:portrait)').matches;
const pressed=action=>held.has(bindings[action]);
function renderBindings(){for(const b of document.querySelectorAll('[data-bind]'))b.textContent=capturing===b.dataset.bind?'Press a key…':keyName(bindings[b.dataset.bind]);}
window.addEventListener('keydown',e=>{if(capturing){e.preventDefault();e.stopImmediatePropagation();if(e.repeat||!e.code)return;bindings=assignKey(bindings,capturing,e.code);capturing=null;held.clear();localStorage.setItem('ronin-keybinds',JSON.stringify(bindings));renderBindings();return;}if(portraitBlocked()||!room||$('arena').hidden||$('dialog').open||e.target.matches('input,textarea'))return;if(Object.values(bindings).includes(e.code)){e.preventDefault();held.add(e.code);}},true);
window.addEventListener('keyup',e=>held.delete(e.code),true);
function screen(id){const chat=$('chat-panel');chat.open=false;if(id==='arena')$('arena').querySelector('header').append(chat);else document.body.append(chat);if(id==='setup')queueMicrotask(refreshRooms);document.body.classList.remove('victory','defeat');$('defeat-scene').hidden=true;$('victory-scene').hidden=true;musicMode(id==='arena'?'level-1':'menu');document.body.classList.toggle('playing',id==='arena');for(let name of ['menu','setup','arena'])$(name).hidden=name!==id;}
function dialog(title,html){$('dialog-title').textContent=title;$('dialog-body').innerHTML=html;$('dialog').showModal();}
function updateMusicButton(){const off=audioSettings().music===0;$('menu-audio').textContent=off?'Unmute music':'Mute music';$('menu-audio').setAttribute('aria-pressed',String(off));}
let previousMusicVolume=Number(localStorage.getItem('ronin-previous-music-volume'))||.5;
$('menu-audio').onclick=()=>{const settings=audioSettings();if(settings.music>0){previousMusicVolume=settings.music;localStorage.setItem('ronin-previous-music-volume',previousMusicVolume);setAudioSettings({music:0});}else{setAudioSettings({music:previousMusicVolume,muted:false});unlockAudio();}updateMusicButton();};
updateMusicButton();unlockAudio();
let returnToMenu=false;
$('defeat-replay').onclick=()=>room?.send('start');$('defeat-leave').onclick=()=>{returnToMenu=true;room?.leave();};
$('victory-replay').onclick=()=>room?.send('start');$('victory-leave').onclick=()=>$('leave').click();$('play').onclick=()=>screen('setup');$('back').onclick=()=>screen('menu');$('close-dialog').onclick=()=>{capturing=null;$('dialog').close();}
$('help').onclick=()=>dialog('Stand together',`<p>Create a room and send its invite to a friend, or join using a room code. Up to four players can fight together. Solo practice is also available.</p><p><b>Move:</b> ${['up','left','down','right'].map(a=>keyName(bindings[a])).join(' / ')}. <b>Slash:</b> ${keyName(bindings.attack)}. <b>Dash:</b> ${keyName(bindings.dodge)}. <b>Jump:</b> ${keyName(bindings.jump)}. Jump and slash together for an aerial attack. Special: ${keyName(bindings.special)} / controller RB. Enjeru stomps and knocks enemies back; Furedi ignites his sword for 6 seconds, adding 24 fire damage per hit; Fuan releases an air gust dealing 35 damage and pushing nearby enemies back. Sutīvun drinks from his sake gourd, then sprays a cone dealing 65 damage. Specials recharge in 25 seconds. Change keyboard controls in Options. Controller: left stick moves; bottom face button attacks, right face button dashes, left face button revives. On phones, drag the left joystick to move and use the right buttons to slash and dash.</p><p>Defeat yokai for 15 points. Clear 15 levels to win; every third level has a boss worth 150 points. If everyone falls, the battle ends.</p><p>Points are score only. Each wave brings different, stronger yokai. More players mean larger waves and tougher enemies and bosses; team size is checked at the start of each wave. Every wave includes a green-flame shrine: 40 total HP is divided among injured living teammates. It requires at least two living ronin and goes dark after use. Solo players use enemy healing drops. Occasionally a gold tanuki appears; defeat it and collect its healing for 30 HP. Enjeru is strong and slow, Furedi balanced, and Fuan fast with lighter hits. Hold ${keyName(bindings.revive)} near a fallen ally’s gold orb for two seconds to revive them with 60 health. Each ronin can be revived three times per match. Phones have a Revive button. Clearing a wave does not reset the revival limit. The room creator starts the fight.</p>`);
$('options').onclick=()=>{const settings=audioSettings();dialog('Options',`<p>Original Edo-inspired music</p><label>Music <input id="music-volume" type="range" min="0" max="1" step=".05" value="${settings.music}"></label><br><label>Sound effects <input id="effects-volume" type="range" min="0" max="1" step=".05" value="${settings.effects}"></label><p><button id="mute">${settings.muted?'Unmute':'Mute all audio'}</button></p><h3>Keyboard controls</h3><p>Select an action, then press any keyboard key. Duplicate keys swap actions. Some system/browser shortcuts cannot be captured.</p><div class="keybinds">${Object.keys(defaults).map(a=>`<label>${a==='dodge'?'Dash':a[0].toUpperCase()+a.slice(1)} <button data-bind="${a}">${keyName(bindings[a])}</button></label>`).join('')}</div><button id="reset-keys">Reset controls</button><h3>Controller</h3><p>Connect a controller, then press a button to activate it. Left stick / D-pad: move. A / Cross: attack. B / Circle: dash. X / Square: hold to revive. Y / Triangle: jump. RB / R1: special. Menu: begin match.</p><p id="pad-status"></p>`);for(const b of document.querySelectorAll('[data-bind]'))b.onclick=()=>{capturing=b.dataset.bind;renderBindings();};$('reset-keys').onclick=()=>{bindings={...defaults};capturing=null;held.clear();localStorage.setItem('ronin-keybinds',JSON.stringify(bindings));renderBindings();};$('pad-status').textContent=window.isSecureContext?'Standard-mapped browser controllers supported.':'Controller access may require HTTPS. This local network link may block it in your browser.';$('music-volume').oninput=e=>{setAudioSettings({music:Number(e.target.value)});updateMusicButton();};$('effects-volume').oninput=e=>setAudioSettings({effects:Number(e.target.value)});$('mute').onclick=()=>{const muted=!audioSettings().muted;setAudioSettings({muted});$('mute').textContent=muted?'Unmute':'Mute all audio';};};
for(let el of document.querySelectorAll('.hero'))el.onclick=()=>{hero=Number(el.dataset.hero);document.querySelectorAll('.hero').forEach(e=>e.classList.toggle('selected',e===el));};
function connectedPad(){try{return Array.from(navigator.getGamepads?.()||[]).find(p=>p?.connected&&p.mapping==='standard');}catch{return null;}}
let previousPadButtons=[],lastPadNavigation=0;
function controllerMenu(t){const pad=connectedPad();$('controller-layout').hidden=!pad;const status=pad?'Xbox / standard controller connected · A attack · B dash · X revive · Y jump':!window.isSecureContext?'Controller access needs a secure page. On the host computer, open localhost:3000.':'Connect your Xbox controller by USB or Bluetooth, then press A.';
 for(const id of ['controller-status','pad-status']){const el=$(id);if(el&&el.textContent!==status)el.textContent=status;}
 if(pad&&!portraitBlocked()&&!document.hidden&&document.hasFocus()){
 const b=i=>!!pad.buttons[i]?.pressed,just=i=>b(i)&&!previousPadButtons[i];
 const panel=$('dialog').open?$('dialog'):!$('menu').hidden?$('menu'):!$('setup').hidden?$('setup'):null;
 if(panel){const items=Array.from(panel.querySelectorAll('button,input')).filter(el=>!el.disabled&&el.getClientRects().length);let index=items.indexOf(document.activeElement);
 const direction=b(13)||b(15)||(pad.axes[1]||0)>.6||(pad.axes[0]||0)>.6?1:b(12)||b(14)||(pad.axes[1]||0)<-.6||(pad.axes[0]||0)<-.6?-1:0;
 if(direction&&t-lastPadNavigation>220){index=(index+direction+items.length)%items.length;items[index]?.focus();lastPadNavigation=t;}
 if(just(0)){unlockAudio();if(index<0){items[0]?.focus();}else if(items[index].tagName==='BUTTON')items[index].click();else items[index].focus();}
 if(just(1)){if($('dialog').open){capturing=null;$('dialog').close();}else if(!$('setup').hidden)screen('menu');}
 }else if(just(9)&&!$('start').hidden){$('start').click();}
 previousPadButtons=pad.buttons.map(b=>b.pressed);
 }else previousPadButtons=[];
 requestAnimationFrame(controllerMenu);
}
requestAnimationFrame(controllerMenu);
window.addEventListener('gamepaddisconnected',()=>{previousPadButtons=[];room?.send('input',{});});
const client=new Client(`${location.protocol==='https:'?'wss':'ws'}://${location.host}`);
$('code').addEventListener('input',()=>{$('code').value=$('code').value.replace(/\D/g,'').slice(0,4);});
async function connect(join){const validation=validateUsername($('username').value);if(validation.error){$('error').textContent=validation.error;return;}if(join&&!/^\d{4}$/.test($('code').value.trim())){$('error').textContent='Enter the 4-digit room code.';return;}$('error').textContent='Connecting…';$('create').disabled=$('join').disabled=true;try{room=join?await client.joinById($('code').value.trim(),{hero,username:playerName(),nameColor:$('name-color').value}):await client.create('arena',{hero,username:playerName(),nameColor:$('name-color').value});screen('arena');$('room-code').textContent='ROOM '+room.roomId;room.onMessage('world',w=>{world=w;updateUi();});room.onMessage('welcome',()=>{});room.onLeave(()=>{if(game){game.destroy(true);game=null;}room=null;world=null;screen(returnToMenu?'menu':'setup');returnToMenu=false;$('error').textContent='You left the room. Create or join another to play.';held.clear();});room.onError((code,msg)=>{$('status').textContent='Connection issue: '+msg;});game=new Phaser.Game({type:Phaser.AUTO,parent:'game',width:1000,height:600,backgroundColor:'#172126',scale:{mode:Phaser.Scale.RESIZE,autoCenter:Phaser.Scale.CENTER_BOTH},scene:Battle});}catch(e){$('error').textContent='Could not join. Check the room code and server connection.';}finally{$('create').disabled=$('join').disabled=false;}}
const fullscreenElement=()=>document.fullscreenElement||document.webkitFullscreenElement;
function updateDisplay(){const active=!!fullscreenElement();$('fullscreen').textContent=active?'Exit full screen':'Full screen';if(!active)window.screen.orientation?.unlock?.();game?.scale.refresh();}
$('fullscreen').onclick=async()=>{setTimeout(()=>{$('display-hint').textContent='';},6000);const root=document.documentElement;$('display-hint').textContent='';try{if(fullscreenElement()){const exit=document.exitFullscreen||document.webkitExitFullscreen;await exit.call(document);return;}const enter=root.requestFullscreen||root.webkitRequestFullscreen;if(!enter){$('display-hint').textContent='Safari: use Share → Add to Home Screen for a larger view.';return;}await enter.call(root);try{await window.screen.orientation?.lock?.('landscape');}catch{}if(matchMedia('(orientation: portrait)').matches)$('display-hint').textContent='Turn your phone sideways for landscape play. Disable rotation lock if needed.';}catch{$('display-hint').textContent='Full screen is unavailable in this browser. Turn your phone sideways for a wider view.';}finally{updateDisplay();}};
document.addEventListener('fullscreenchange',updateDisplay);document.addEventListener('webkitfullscreenchange',updateDisplay);
window.addEventListener('orientationchange',()=>{resetStick();if(matchMedia('(orientation: landscape)').matches)$('display-hint').textContent='';game?.scale.refresh();});
$('create').onclick=()=>connect(false);$('join').onclick=()=>connect(true);$('leave').onclick=()=>room?.leave();$('start').onclick=()=>{room?.send('start');game?.canvas.focus();};$('copy').onclick=async()=>{try{await navigator.clipboard.writeText(`${location.origin}/?room=${room.roomId}`);$('copy').textContent='Invite copied';setTimeout(()=>$('copy').textContent='Copy invite',1800);}catch{prompt('Copy this room code',room.roomId);}};
let incoming=new URLSearchParams(location.search).get('room');if(incoming){$('code').value=incoming;screen('setup');}
const stick={x:0,y:0,pointer:null};
const joystick=$('joystick'),knob=joystick.querySelector('.joystick-knob');
function resetStick(){stick.x=stick.y=0;stick.pointer=null;knob.style.transform='translate(0px,0px)';}
function moveStick(e){const r=joystick.getBoundingClientRect(),radius=r.width*.32;let x=e.clientX-r.left-r.width/2,y=e.clientY-r.top-r.height/2;const distance=Math.hypot(x,y),scale=Math.min(1,radius/(distance||1));x*=scale;y*=scale;knob.style.transform=`translate(${x}px,${y}px)`;const amount=Math.max(0,(Math.min(distance/radius,1)-.12)/.88);stick.x=distance?x/(Math.hypot(x,y)||1)*amount:0;stick.y=distance?y/(Math.hypot(x,y)||1)*amount:0;}
joystick.onpointerdown=e=>{if(stick.pointer!==null)return;e.preventDefault();stick.pointer=e.pointerId;joystick.setPointerCapture(e.pointerId);moveStick(e);};
joystick.onpointermove=e=>{if(e.pointerId===stick.pointer){e.preventDefault();moveStick(e);}};
joystick.onpointerup=joystick.onpointercancel=joystick.onlostpointercapture=e=>{if(e.pointerId===stick.pointer)resetStick();};
document.addEventListener('visibilitychange',()=>{if(document.hidden){resetStick();held.clear();for(const key in touch)touch[key]=false;room?.send('input',{});}});
window.addEventListener('resize',resetStick);
for(let b of document.querySelectorAll('[data-key]')){b.onpointerdown=e=>{e.preventDefault();b.setPointerCapture(e.pointerId);touch[b.dataset.key]=true;};b.onpointerup=b.onpointercancel=()=>touch[b.dataset.key]=false;}
window.addEventListener('blur',()=>{resetStick();held.clear();for(let k in touch)touch[k]=false;room?.send('input',{});});
let lastUiState="",lastChatPhase='';
function updateUi(){if(!world)return;if(world.phase!==lastChatPhase){if(['intro','fight','over','victory'].includes(world.phase))$('chat-panel').open=false;lastChatPhase=world.phase;}let p=world.players[room.sessionId];const uiState=JSON.stringify([room.sessionId,Object.keys(world.players),world.phase,world.wave,world.startLevel,world.timer,world.partySize,p?.hero,p?.hp,p?.maxHp,p?.score,Math.ceil(p?.specialActive||0),Math.ceil(p?.specialCd||0),bindings.special]);if(uiState===lastUiState)return;lastUiState=uiState;const ability=$('ability');const title=['Earth · Earthshaker','Fire · Blazing sword','Air · Wind burst','Water · Sake surge'][p?.hero||0];ability.querySelector('span').textContent=`${title} · ${p?.specialActive>0?Math.ceil(p.specialActive)+'s active':p?.specialCd>0?Math.ceil(p.specialCd)+'s cooldown':world.phase==='fight'||world.phase==='rest'?keyName(bindings.special)+' / RB · Ready':'Available in battle'}`;ability.querySelector('progress').value=25-(p?.specialCd||0);let host=Object.keys(world.players)[0]===room.sessionId;let phase=world.phase;musicMode(phase==='victory'?'ending':`level-${Math.max(1,Math.min(15,world.wave||1))}`);document.body.classList.toggle('defeat',phase==='over');$('defeat-scene').hidden=phase!=='over';$('defeat-replay').hidden=!host;$('defeat-wait').hidden=host;document.body.classList.toggle('victory',phase==='victory');$('victory-scene').hidden=phase!=='victory';$('victory-replay').hidden=!host;$('status').textContent=phase==='intro'?`Wave ${world.wave} · ${arenaNames[world.wave-1]} · Prepare…`:phase==='lobby'?`${Object.keys(world.players).length}/4 ronin joined · Invite a friend, or begin solo practice.`:phase==='rest'?`Wave cleared · Next: ${arenaNames[world.wave]||'Dawn'} in ${world.timer}s · Collect healing and regroup`:phase==='over'?'YOU LOSE! Your party has fallen.':phase==='victory'?(world.startLevel>1?'Practice complete!':'YOU WIN! All 15 levels survived!'):`Level ${world.wave}/15 · ${arenaNames[Math.max(0,world.wave-1)]} · ${['Solo','Duo','Trio','Full team'][(world.partySize||1)-1]}${world.wave%3===0?' · ONI BOSS':''} · Health ${Math.ceil(p?.hp??0)}/${p?.maxHp??100} · Points ${p?.score??0}`;$('start').hidden=!host||!['lobby','over','victory'].includes(phase);}
class Battle extends Phaser.Scene{
 preload(){for(let i=7;i<=15;i++)this.load.image(`level-${i}`,`/assets/level-${i}.png`);this.load.image('healing-shrine','/assets/healing-shrine-front.png');this.load.image('earth-stone','/assets/earth-stone.png');this.load.image('edo-fire-portal','/assets/edo-fire-portal.png');this.load.image('waterfall','/assets/sutivun-waterfall-soft.png');this.load.image('element-effects','/assets/element-effects.png');this.load.image('water-ronin','/assets/sutivun-sheet.png');this.load.json('water-frames','/assets/sutivun-frames.json');this.load.image('water-cast','/assets/sutivun-special.png');this.load.json('water-cast-frames','/assets/sutivun-special-frames.json');for(const name of ['lantern','shrine','snow','river','volcano'])this.load.image(name+'-hd',`/assets/${name}-hd.png`);this.load.image('ability-poses','/assets/ronin-abilities.png');this.load.image('bamboo-hd','/assets/bamboo-grove-hd.png');this.load.image('samurai','/assets/spirit-samurai.png');for(const key of [...Array.from({length:7},(_,i)=>`enemy-cycle-${i}`),...Array.from({length:7},(_,i)=>`enemy-direction-${i}`),...Array.from({length:9},(_,i)=>`enemy-new-${i+7}`),'spirit-loop']){this.load.image(key,`/assets/${key}.png`);this.load.json(key+'-frames',`/assets/${key}.json`);}this.load.image('wave-art','/assets/yokai-waves.png');this.load.image('idle','/assets/ronin-idle.png');this.load.image('down','/assets/ronin-forward-arms.png');this.load.image('vertical','/assets/ronin-vertical.png');this.load.image('walks','/assets/walk-cycles-v2.png');this.load.image('court','/assets/courtyard.png');this.load.image('ronin-atlas','/assets/ronin-attacks.png');this.load.image('yokai-atlas','/assets/yokai.png');}
 create(){const elements=this.textures.get('element-effects'),elementImage=elements.getSourceImage();for(let r=0;r<2;r++)for(let c=0;c<4;c++)elements.add(`${r}-${c}`,0,c*elementImage.width/4,r*elementImage.height/2,elementImage.width/4,elementImage.height/2);
 for(const [key,json] of [['water-ronin','water-frames'],['water-cast','water-cast-frames']]){const texture=this.textures.get(key);for(const [name,b] of Object.entries(this.cache.json.get(json).frames)){const f=texture.add(name,0,b.x,b.y,b.width,b.height);f.setTrim(b.sourceWidth,b.sourceHeight,b.offsetX,b.offsetY,b.width,b.height);}}

 const abilityTexture=this.textures.get('ability-poses');for(let r=0;r<3;r++)for(let c=0;c<4;c++)abilityTexture.add(`${r}-${c}`,0,c*256,r*512,256,512);
 const samurai=this.textures.get('samurai');for(let row=0;row<2;row++)for(let col=0;col<4;col++)samurai.add(`${row}-${col}`,0,col*384,row*512,384,512);
 this.arenaBackground=this.add.image(500,300,'lantern-hd').setDisplaySize(1000,600).setDepth(-10);
 this.currentWave=-1;
 for(const key of [...Array.from({length:7},(_,i)=>`enemy-cycle-${i}`),...Array.from({length:7},(_,i)=>`enemy-direction-${i}`),...Array.from({length:9},(_,i)=>`enemy-new-${i+7}`),'spirit-loop']){const texture=this.textures.get(key),data=this.cache.json.get(key+'-frames');for(const [name,b] of Object.entries(data.frames)){const frame=texture.add(name,0,b.x,b.y,b.width,b.height);frame.setTrim(b.sourceWidth,b.sourceHeight,b.offsetX,b.offsetY,b.width,b.height);}}
 const waveArt=this.textures.get('wave-art');for(let i=0;i<8;i++)waveArt.add(String(i),0,(i%4)*384,Math.floor(i/4)*512,384,512);
 const idle=this.textures.get('idle');for(let r=0;r<3;r++)for(let c=0;c<4;c++)idle.add(`${r}-${c}`,0,c*256,r*512,256,512);
 const atlas=this.textures.get('ronin-atlas');
 // The strike extends beyond a uniform quarter-sheet; preserve the full blade.
 const attackX=[0,380,740,1210,1536],attackY=[0,342,680,1024],bodyX=[190,560,940,1350];
 for(let row=0;row<3;row++)for(let col=0;col<4;col++){
 const width=attackX[col+1]-attackX[col],height=attackY[row+1]-attackY[row];
 const frame=atlas.add(`${row}-${col}`,0,attackX[col],attackY[row],width,height);
 frame.setTrim(560,350,280-(bodyX[col]-attackX[col]),350-height,width,height);
 }
 const enemies=this.textures.get('yokai-atlas'),ei=enemies.getSourceImage();enemies.add('imp',0,0,0,ei.width/2,ei.height);enemies.add('oni',0,ei.width/2,0,ei.width/2,ei.height);
 const walks=this.textures.get('walks');
 // The illustrated sheet has uneven margins: use measured cell boundaries.
 const rows=[0,326,645,956,1230,1536],columns=[0,280,530,790,1024];
 for(let row=0;row<5;row++)for(let col=0;col<4;col++){
 const f=walks.add(`${row}-${col}`,0,columns[col],rows[row],columns[col+1]-columns[col],rows[row+1]-rows[row]);
 f.setTrim(280,330,(280-f.width)/2,330-f.height,f.width,f.height);
 }

 const vertical=this.textures.get('vertical');const vx=[0,222,402,580,776,973,1152,1337,1536],vy=[0,349,686,1024];
 for(let row=0;row<3;row++)for(let col=0;col<8;col++){
 const f=vertical.add(`${row}-${col}`,0,vx[col],vy[row],vx[col+1]-vx[col],vy[row+1]-vy[row]);
 f.setTrim(222,349,(222-f.width)/2,349-f.height,f.width,f.height);
 }
 const down=this.textures.get('down');const dcols=[0,216,400,583,775,966,1150,1335,1536],drows=[0,345,685,1024];
 for(let row=0;row<3;row++)for(let col=0;col<8;col++){
 const f=down.add(`${row}-${col}`,0,dcols[col],drows[row],dcols[col+1]-dcols[col],drows[row+1]-drows[row]);
 f.setTrim(222,349,(222-f.width)/2,349-f.height,f.width,f.height);
 }
 this.game.canvas.tabIndex=0;this.game.canvas.focus();this.input.on('pointerdown',()=>this.game.canvas.focus());
 if(!this.textures.exists('smoke-puff')){
 const tex=this.textures.createCanvas('smoke-puff',96,96),ctx=tex.context;
 const gradient=ctx.createRadialGradient(48,48,3,48,48,46);
 gradient.addColorStop(0,'rgba(214,214,209,0.8)');gradient.addColorStop(.45,'rgba(153,163,164,0.55)');gradient.addColorStop(1,'rgba(77,89,96,0)');
 ctx.fillStyle=gradient;ctx.fillRect(0,0,96,96);tex.refresh();
 }
 this.drops=new Map();this.actors=new Map();this.foes=new Map();this.fx=this.add.graphics().setDepth(-1);this.lastSend=0;
 }
 makeActor(p){const s=this.add.sprite(p.x,p.y,'ronin-atlas',`${Math.min(2,p.hero)}-0`).setOrigin(.5,.86);s.setDisplaySize(135,120);const shadow=this.add.ellipse(p.x,p.y+3,45,14,0x000000,.28);const tag=this.add.text(p.x,p.y-105,['Enjeru','Furedi','Fuan','Sutīvun'][p.hero],{fontSize:'13px',fontFamily:'Georgia',color:'#fff0cf',stroke:'#111b23',strokeThickness:4}).setOrigin(.5);const bar=this.add.graphics();return{s,shadow,tag,bar,x:p.x,y:p.y,lastX:p.x,lastY:p.y,attack:0,prevSwing:0,facing:'down',flip:false,hp:p.hp,flash:0};}
 smokeDissolve(x,y){
 for(let i=0;i<18;i++){
 const angle=i*2.399,puff=this.add.image(x+Math.cos(angle)*15,y-35+Math.sin(angle)*25,'smoke-puff').setDepth(y+5+i*.01).setScale(.25+Math.random()*.3).setAlpha(.85);
 this.tweens.add({targets:puff,x:puff.x+Math.cos(angle)*(28+Math.random()*30),y:puff.y-40-Math.random()*55,scaleX:1+Math.random()*.6,scaleY:1+Math.random()*.6,alpha:0,duration:850+Math.random()*450,delay:i*13,ease:'Sine.easeOut',onComplete:()=>puff.destroy()});
 }
 }
 enemyStrike(x,y,dx,dy,boss){
 const effect=this.add.graphics().setDepth(y+8),angle=Math.atan2(dy,dx);
 effect.lineStyle(boss?7:4,0xffc898,.95);
 for(let i=0;i<3;i++){const offset=(i-1)*.24;effect.beginPath();effect.arc(0,0,boss?64:38,angle-.65+offset,angle+.25+offset);effect.strokePath();}
 effect.setPosition(x,y-28);this.tweens.add({targets:effect,alpha:0,scaleX:1.3,scaleY:1.3,duration:230,onComplete:()=>effect.destroy()});
 }
 destroyActor(a){a.earthStones?.forEach(s=>s.destroy());for(let key of ['s','shadow','tag','bar','orb','spirit','reviveLabel','specialFx','elementSprite','waterfallSprite','fireEntrance','entranceFx','helperSprite','helperShadow','helperTag'])a[key]?.destroy();}
 update(t,delta){if(!room||!world)return;delta=Math.min(delta,50);if(t-(this.lastInputPoll||0)>=16){this.lastInputPoll=t;const pad=connectedPad();const controller=padInput(pad);const active=!portraitBlocked()&&!document.hidden&&document.hasFocus()&&!$('dialog').open&&!document.activeElement?.matches('input,textarea');const input=active?{x:Math.max(-1,Math.min(1,stick.x+controller.x+Number(pressed('right'))-Number(pressed('left')))),y:Math.max(-1,Math.min(1,stick.y+controller.y+Number(pressed('down'))-Number(pressed('up')))),attack:!!(touch.attack||pressed('attack')||controller.attack),revive:!!(touch.revive||pressed('revive')||controller.revive),dodge:!!(touch.dodge||pressed('dodge')||controller.dodge),jump:!!(touch.jump||pressed('jump')||controller.jump),special:!!(touch.special||pressed('special')||controller.special)}:{};if(active){input.x=Math.round(input.x*100)/100;input.y=Math.round(input.y*100)/100;}const signature=JSON.stringify(input);if(signature!==this.lastInputSignature||t-(this.lastSend||0)>250){room.send('input',input);this.lastInputSignature=signature;this.lastSend=t;}}
 const intro=world.phase==='intro',introElapsed=6-(world.introRemaining||0);
 const fade=intro?introElapsed<.6?introElapsed/.6:introElapsed<1.1?1:introElapsed<1.6?1-(introElapsed-1.1)/.5:0:0;
 $('level-fade').style.opacity=String(fade);
 if(world.wave!==this.currentWave&&(!intro||introElapsed>=.6)){this.currentWave=world.wave;const wave=Math.max(0,Math.min(15,world.wave));this.arenaBackground.setTexture(arenaTextures[Math.max(0,wave-1)]).setDisplaySize(1000,600);for(const a of this.actors.values()){const p=world.players[a.id];if(p){a.x=p.x;a.y=p.y;}a.entranceLanded=false;}const banner=$('wave-banner');banner.textContent=`LEVEL ${wave}/15 · ${arenaNames[Math.max(0,wave-1)]}${wave%3===0&&wave?' · BOSS BATTLE':''}`;banner.hidden=!intro;}
 $('wave-banner').hidden=!intro||introElapsed<1.1||introElapsed>2.8;
 const showGo=intro&&introElapsed>=4.6;$('go-cue').hidden=!showGo;
 if(showGo&&this.goWave!==world.wave){this.goWave=world.wave;goSound();}
 const blend=1-Math.exp(-delta/55);this.fx.clear();
 const mobile=matchMedia('(pointer:coarse)').matches,camera=this.cameras.main,me=world.players[room.sessionId];const zoom=Math.max(this.scale.width/1000,this.scale.height/600)*(mobile?1.2:1);if(camera.zoom!==zoom){camera.setZoom(zoom);camera.setBounds(0,0,1000,600);}if(me){const actor=this.actors.get(me.id);camera.centerOn(actor?.x??me.x,(actor?.y??me.y)-35);}

 for(let [id,a]of this.actors)if(!world.players[id]){this.destroyActor(a);this.actors.delete(id);}
 for(let p of Object.values(world.players)){let a=this.actors.get(p.id);if(!a){a=this.makeActor(p);this.actors.set(p.id,a);}const mine=p.id===room.sessionId;
 if(!a.specialFx)a.specialFx=this.add.graphics();const g=a.specialFx;g.clear().setDepth(p.y+2);
 if(p.specialActive>0&&p.hp>0){
 if(p.hero===0&&p.specialActive<=.48){const progress=Math.max(0,1-p.specialActive/.48),r=12+progress*180;g.lineStyle(6*(1-progress)+1,0xffd582,1-progress).strokeEllipse(p.stompX,p.stompY,r*2,r);g.lineStyle(2,0xfff4d4,(1-progress)*.7).strokeEllipse(p.stompX,p.stompY,r*1.6,r*.8);}

 }
 if(p.hero===3&&p.hp>0&&p.specialActive>0&&p.specialActive<=.85){const q=1-p.specialActive/.85,dx=p.waterDX||1,dy=p.waterDY||0;for(let j=0;j<40;j++){const d=((q*250+j*7)%250),spread=Math.sin(j*2.399)*d*.35,x=p.waterX+dx*d-dy*spread,y=p.waterY-65+dy*d+dx*spread;g.fillStyle(j%2?0x90e8ff:0xd6faff,(1-q)*.8).fillEllipse(x,y,9,4);}}
 a.earthStones?.forEach(s=>s.setVisible(false));
 // Earth debris follows one continuous rise/fall trajectory after the foot strike.
 if(p.hero===0){
 if(p.specialActive>.48||p.specialActive<=0)a.earthImpactShown=false;
 if(p.hp>0&&p.specialActive>0&&p.specialActive<=.48&&!a.earthImpactShown){a.earthImpactShown=true;a.earthImpactAt=t;a.earthOrigin={x:p.stompX,y:p.stompY};}
 const age=(t-(a.earthImpactAt??-9999))/1000;
 if(age>=0&&age<1.25&&a.earthOrigin){const q=Math.min(1,age/1.05),fade=age<1.05?1:1-(age-1.05)/.2,ox=a.earthOrigin.x,oy=a.earthOrigin.y;
 for(let j=0;j<12;j++){const angle=j*2.399,r=25+q*(65+j%4*17),groundX=ox+Math.cos(angle)*r,groundY=oy+Math.sin(angle)*r*.48,height=Math.sin(q*Math.PI)*(38+j%4*16),x=groundX,y=groundY-height,size=6+j%4*2;
 g.fillStyle(0x171717,.2*fade*(1-height/130)).fillEllipse(groundX,groundY+3,size*2.2,size*.65);
 if(!a.earthStones)a.earthStones=[];let stone=a.earthStones[j];if(!stone)stone=a.earthStones[j]=this.add.image(x,y,'earth-stone');stone.setVisible(true).setPosition(x,y).setDisplaySize(size*3.2,size*2.7).setAngle(j*47+q*(j%2?35:-30)).setFlipX(j%2===0).setAlpha(fade*.95).setDepth(groundY+2);
 if(q>.78){const dust=(q-.78)/.22;g.fillStyle(0x9f9278,(1-dust)*.25*fade).fillEllipse(groundX,groundY,size*(2+dust*2),size*(.7+dust));}
 }
 }
 }
 // The summoned warrior uses the same aligned ronin movement and sword frames.
 const summoned=p.hero===2&&p.helper&&p.specialActive>0&&p.hp>0;
 if(summoned){
 const h=p.helper;
 if(!a.helperSprite){a.helperSprite=this.add.sprite(h.x,h.y,'samurai','0-0').setOrigin(.5,.98);a.helperShadow=this.add.ellipse(h.x,h.y,42,14,0x83e9dc,.22);a.helperTag=this.add.text(h.x,h.y-110,'Spirit warrior',{fontSize:'10px',color:'#bfffee',stroke:'#15292b',strokeThickness:3}).setOrigin(.5);}
 const hs=a.helperSprite,dx=h.x-hs.x,dy=h.y-hs.y,b=1-Math.exp(-delta/65),travel=Math.hypot(dx*b,dy*b);hs.x+=dx*b;hs.y+=dy*b;
 a.helperDistance=(a.helperDistance||0)+travel;
 if(travel>.1){a.helperFacing=Math.abs(dy)>Math.abs(dx)?(dy<0?'up':'down'):'side';if(Math.abs(dx)>.3)a.helperFlip=dx<0;}
 if(h.swing>0&&!(a.helperSwing>0))a.helperStrike=t;
 a.helperSwing=h.swing;const elapsed=t-(a.helperStrike??-1000),strike=elapsed<340,moving=travel>.12,vertical=a.helperFacing!=='side';
 const frame=strike?(elapsed<80?0:elapsed<160?1:elapsed<250?2:3):moving?Math.floor(a.helperDistance/22)%4:0;
 const fade=Math.min(1,p.specialActive/.5);
 hs.setVisible(true).setTexture('samurai',`${strike?1:0}-${frame}`).setDisplaySize(110,147).setOrigin(.5,.94).setFlipX(!!a.helperFlip).clearTint().setAlpha(.95*fade).setDepth(hs.y);
 a.helperShadow.setVisible(true).setPosition(hs.x,hs.y+2).setAlpha(.22*fade).setDepth(hs.y-1);a.helperTag.setVisible(true).setPosition(hs.x,hs.y-118).setAlpha(fade).setDepth(1500);
 g.setDepth(hs.y+1).lineStyle(1,0xa3ffdf,.4*fade).strokeEllipse(hs.x,hs.y+2,45,16);
 }else{a.helperSprite?.setVisible(false);a.helperShadow?.setVisible(false);a.helperTag?.setVisible(false);a.helperSwing=0;}
if(p.hp<=0&&!a.down){a.down=true;a.deathAt=t;this.smokeDissolve(a.x,a.y);}else if(p.hp>0&&a.down){a.down=false;a.deathAt=0;}if(!a.orb){a.spirit=this.add.image(a.x,a.y-25,'spirit-loop','0-0').setDisplaySize(72,96);a.orb=this.add.graphics();a.reviveLabel=this.add.text(a.x,a.y+26,'',{fontSize:'12px',color:'#ffe6a0',stroke:'#111b23',strokeThickness:4}).setOrigin(.5);}
 const spiritFrame=Math.floor(t/110)%8;a.spirit.setTexture('spirit-loop',`${Math.floor(spiritFrame/4)}-${spiritFrame%4}`).setVisible(p.hp<=0&&(p.revivesUsed||0)<3).setPosition(a.x,a.y-27+Math.sin(t*.004)*4).setDisplaySize(72+Math.sin(t*.006)*3,96+Math.sin(t*.005)*4).setDepth(a.y+1);a.orb.clear().setDepth(a.y+2);a.reviveLabel.setVisible(p.hp<=0).setPosition(a.x,a.y+28).setDepth(1502);
 if(p.hp<=0&&(p.revivesUsed||0)<3){if(p.reviveProgress){a.orb.lineStyle(3,0xffffff,1).beginPath().arc(a.x,a.y-12,20,-Math.PI/2,-Math.PI/2+Math.PI*2*Math.min(1,p.reviveProgress/2)).strokePath();}a.reviveLabel.setText(p.reviveProgress?'Reviving…':mine?`Awaiting a teammate · ${3-(p.revivesUsed||0)} revives left`:`Hold ${keyName(bindings.revive)} · ${3-(p.revivesUsed||0)} revives left`);}
 if(p.hp<=0&&p.revivesUsed>=3)a.reviveLabel.setText('All 3 revives used');
 let dx=p.x-a.x,dy=p.y-a.y;const playerBlend=mine?1-Math.exp(-delta/18):blend;
 const travel=Math.hypot(dx*playerBlend,dy*playerBlend);a.x+=dx*playerBlend;a.y+=dy*playerBlend;
 // Keep stepping between network packets rather than flashing back to idle.
 const intent=Math.hypot(p.input?.x||0,p.input?.y||0)>.05;
 if(travel>.08&&intent)a.lastStepAt=t;
 const moving=p.hp>0&&intent&&t-(a.lastStepAt??-1000)<120;
 if(moving&&Math.hypot(dx,dy)>.3){const vertical=Math.abs(dy)>Math.abs(dx)*(a.facing==='side'?1.3:.75);if(vertical)a.facing=dy<0?'up':'down';else{a.facing='side';if(Math.abs(dx)>.3)a.flip=dx<0;}}
 if(p.swing>0&&a.prevSwing<=0){a.attack=t;if(mine)slashSound();}a.prevSwing=p.swing;let elapsed=t-a.attack;let attack=a.attack>0&&elapsed<340;let col=attack?(elapsed<90?1:elapsed<220?2:3):0;
 a.gaitSpeed=(a.gaitSpeed||0)+(travel/Math.max(delta,1)*1000-(a.gaitSpeed||0))*(1-Math.exp(-delta/90));
 if(moving)a.walkDistance=(a.walkDistance||0)+Math.min(a.gaitSpeed,280)*Math.min(delta,50)/1000;
 const phase=(a.walkDistance||0)/88,walkFrame=Math.floor(phase*4)%4;
 const breathe=!moving&&!attack&&p.hp>0?Math.sin(t*.003):0;
 // Two gentle weight transfers per stride; the foot anchor stays consistent.
 const jumping=p.hp>0&&p.jump>0;
 const jumpProgress=jumping?1-p.jump/.65:1;
 const airProgress=Phaser.Math.Clamp((jumpProgress-.12)/.72,0,1);
 const jumpHeight=jumping?Math.sin(Math.PI*airProgress)*48:0;
 const jumpSquash=!jumping?1:jumpProgress<.12?1-.06*Math.sin(jumpProgress/.12*Math.PI):jumpProgress>.84?1-.05*Math.sin((jumpProgress-.84)/.16*Math.PI):1;
 if(jumping&&!a.wasJumping)a.jumpPose={texture:a.s.texture.key,frame:a.s.frame.name,width:a.s.displayWidth,height:a.s.displayHeight,flip:a.s.flipX,origin:a.s.originY};
 a.wasJumping=jumping;
 let bob=moving&&!attack?-Math.abs(Math.sin(phase*Math.PI*2))*1.8:0;
 let lean=attack?(col===1?-7:col===2?9:3)*(a.flip?-1:1):moving?Math.sin(phase*Math.PI*2)*.65:0;
 const isVertical=a.facing!=='side';const resting=!moving&&!attack;const texture=resting?'idle':attack?'ronin-atlas':isVertical?(a.facing==='down'?'down':'vertical'):'walks';
 const frame=resting?Math.floor(t/420)%4:attack?col:isVertical?(a.facing==='up'?4+walkFrame:Math.floor(phase*8)%8):walkFrame;
 a.s.setTexture(texture,`${Math.min(2,p.hero)}-${frame}`).setDisplaySize(resting?66:attack?192:isVertical?80:100,120+breathe*1.6).setOrigin(.5,attack?1:.98).setFlipX(!resting&&(attack||!isVertical)?a.flip:false).setPosition(a.x+(attack&&col===2?(a.flip?-7:7):0),a.y+bob-jumpHeight).setAngle(p.hp<=0?0:lean+breathe*.35).setAlpha(p.hp<=0?Math.max(0,1-(t-a.deathAt)/250):1).setDepth(a.y);
 if(jumping&&!attack&&a.jumpPose){const pose=a.jumpPose;a.s.setTexture(pose.texture,pose.frame).setDisplaySize(pose.width,pose.height*jumpSquash).setFlipX(pose.flip).setOrigin(.5,pose.origin).setPosition(a.x,a.y-jumpHeight).setAngle(0);}
 const meditating=false;
 if(p.hero<3&&p.hp>0&&(p.cast>0||meditating)){const elapsed=.8-(p.cast||0);const pose=p.hero===0?(elapsed<.12?0:elapsed<.32?1:elapsed<.62?2:3):elapsed<.15?0:elapsed<.3?1:2+Math.floor(t/450)%2;a.s.setTexture('ability-poses',`${p.hero}-${pose}`).setDisplaySize(66,120).setOrigin(.5,.98).setPosition(a.x,a.y).setFlipX(false).setAngle(0);a.attack=0;}
 if(p.hero===3){const casting=p.cast>0,castElapsed=2.4-(p.specialActive||0),row=attack?4:moving?(a.facing==='up'?2:a.facing==='side'?3:1):0,frame=casting?(castElapsed<.4?0:castElapsed<1.2?1:castElapsed<1.55?2:3):attack?(elapsed<75?0:elapsed<155?1:elapsed<255?2:3):moving?walkFrame:Math.floor(t/420)%4;a.s.setTexture(casting?'water-cast':'water-ronin',casting?String(frame):`${row}-${frame}`).setDisplaySize(casting?136:120,casting?150:135).setOrigin(.5,1).setPosition(a.x,a.y-jumpHeight).setFlipX(casting?(p.waterDX||1)<0:row===3||attack?a.flip:false).setAngle(moving&&!casting&&!attack?Math.sin(phase*Math.PI*2)*4:0);}
 if(!a.elementSprite)a.elementSprite=this.add.sprite(a.x,a.y,'element-effects','0-0').setVisible(false);
 a.elementSprite.setVisible(false);
 if(p.hp>0&&p.specialActive>0&&p.hero===1&&attack){const f=elapsed<90?0:elapsed<175?1:elapsed<260?2:3;const anchor=[[-4,-68],[22,-54],[26,-43],[18,-42]][f],sign=a.flip?-1:1;a.elementSprite.setVisible(true).setTexture('element-effects',`0-${f}`).setOrigin(.5).setPosition(a.x+anchor[0]*sign,a.y+anchor[1]-jumpHeight).setDisplaySize(138,90).setFlipX(a.flip).setAlpha(f===3?.45:.78).setDepth(a.y+1);}
 if(p.hp>0&&p.hero===2&&p.specialActive>0&&p.specialActive<=1.05){const q=1-p.specialActive/1.05;a.elementSprite.setVisible(true).setTexture('element-effects',`1-${Math.floor(t/110)%4}`).setOrigin(.5,.94).setPosition(p.windX,p.windY).setDisplaySize(220+q*130,260+q*60).setAlpha(Math.min(1,q*8,(1-q)*5)*.8).setFlipX(false).setDepth(a.y+2);}
 if(p.hp<a.hp){a.flash=t+130;if(mine)this.cameras.main.shake(80,.002);}a.hp=p.hp;if(t<a.flash)a.s.setTint(0xff9b91);else a.s.clearTint();
 a.shadow.setScale(1-jumpHeight/110).setAlpha(.28-jumpHeight/300).setVisible(p.hp>0).setPosition(a.x,a.y+3).setDepth(a.y-1);a.tag.setPosition(a.x,a.y-140-jumpHeight).setDepth(1500).setColor(p.nameColor||'#fff0cf').setText(`${p.username||['Enjeru','Furedi','Fuan','Sutīvun'][p.hero]}${p.hp<=0?' · DOWN':''}`);
 a.bar.clear().setDepth(1501);a.bar.fillStyle(0x10181c,.85).fillRoundedRect(a.x-23,a.y-125-jumpHeight,46,5,2);a.bar.fillStyle(mine?0xe9c884:0x85b9aa).fillRoundedRect(a.x-23,a.y-125-jumpHeight,46*Math.min(1,Math.max(0,p.hp)/(p.maxHp||100)),5,2);
 if(!a.fireEntrance)a.fireEntrance=this.add.image(a.x,a.y,'edo-fire-portal').setVisible(false);a.fireEntrance.setVisible(false);if(!a.waterfallSprite)a.waterfallSprite=this.add.sprite(a.x,a.y,'waterfall').setVisible(false);a.waterfallSprite.setVisible(false);if(!a.entranceFx)a.entranceFx=this.add.graphics();const eg=a.entranceFx;eg.clear().setDepth(a.y+1);
 if(intro&&p.hp>0){
 const progress=Phaser.Math.Clamp((introElapsed-1.6)/2.6,0,1),x=p.x,y=p.y;a.x=x;a.y=y;a.tag.setVisible(progress>=1);a.bar.setVisible(progress>=1);a.shadow.setVisible(progress>0);a.s.setTexture('idle',`${Math.min(2,p.hero)}-0`).setDisplaySize(66,120).setOrigin(.5,.98).setFlipX(false).setAngle(0).setPosition(x,y).setAlpha(0);
 if(p.hero===0){const fall=Phaser.Math.Clamp(progress/.38,0,1);a.s.setAlpha(progress>0?1:0).setY(y-(1-fall*fall)*420);if(progress>=.38){if(!a.entranceLanded){a.entranceLanded=true;this.cameras.main.shake(300,.008);landingSound();}const q=(progress-.38)/.62;eg.lineStyle(4,0xc7af8e,1-q).strokeEllipse(x,y,50+q*230,15+q*70);for(let j=0;j<18;j++){const angle=j*2.399,r=25+q*110;eg.fillStyle(j%2?0xb5aa97:0x8b8277,(1-q)*.5).fillCircle(x+Math.cos(angle)*r,y+Math.sin(angle)*r*.25-q*20,8+q*15);}if(progress<.55)a.s.setTexture('ability-poses','0-2');}}
 if(p.hero===1){const glow=Math.sin(progress*Math.PI),open=Math.min(1,progress*4);a.s.setAlpha(Phaser.Math.Clamp((progress-.35)/.3,0,1));a.fireEntrance.setVisible(progress>0&&progress<1).setPosition(x,y+12).setOrigin(.5,.95).setDisplaySize(165*open,220*open).setAlpha(glow*.9).setDepth(y-1);for(let j=0;j<14;j++){const q=(introElapsed*.6+j*.618)%1,angle=j*2.399;eg.fillStyle(0xd8a365,glow*(1-q)*.55).fillCircle(x+Math.cos(angle)*55,y-q*150,1+j%2*.5);}}

 if(p.hero===2){a.s.setAlpha(Phaser.Math.Clamp((progress-.45)/.3,0,1));for(let j=0;j<24;j++){const angle=progress*12+j*2.399,r=25+Math.sin(progress*Math.PI)*60,lx=x+Math.cos(angle)*r,ly=y-30+Math.sin(angle)*r*.45-j*2;const alpha=Math.sin(progress*Math.PI)*.75,ax=Math.cos(angle),ay=Math.sin(angle);eg.fillStyle(j%2?0x8d956a:0x777c58,alpha).fillPoints([{x:lx-ax*7,y:ly-ay*7},{x:lx-ay*3,y:ly+ax*3},{x:lx+ax*7,y:ly+ay*7},{x:lx+ay*2,y:ly-ax*2}],true);eg.lineStyle(.6,0xc1b58e,alpha*.7).lineBetween(lx-ax*5,ly-ay*5,lx+ax*5,ly+ay*5);}eg.lineStyle(2,0xd7ead8,Math.sin(progress*Math.PI)*.65).strokeEllipse(x,y-30,100+progress*50,40);}
 if(p.hero===3){
 const smooth=v=>{v=Phaser.Math.Clamp(v,0,1);return v*v*(3-2*v);},rise=smooth(progress/.2),fade=1-smooth((progress-.68)/.32),opacity=rise*fade;
 a.s.setTexture('water-ronin','0-0').setDisplaySize(120,135).setOrigin(.5,1).setAlpha(smooth((progress-.42)/.28));
 a.waterfallSprite.setVisible(opacity>0).setTexture('waterfall').setPosition(x,y+20).setOrigin(.5,.94).setDisplaySize(185,285).setDepth(y+2).setAlpha(opacity*.65);
 // Continuous descending streamlets, not abrupt sprite-sheet stages. Each fades before wrapping.
 eg.setDepth(y+3);
 for(let j=0;j<34;j++){const q=(introElapsed*(.9+(j%5)*.06)+j*.618)%1,life=Math.sin(q*Math.PI),sx=x+Math.sin(j*2.399)*35+Math.sin(q*7+j)*2,sy=y-218+q*212;eg.lineStyle(j%3===0?1.5:.8,0xd9e9ec,opacity*life*.48).lineBetween(sx,sy,sx+Math.sin(q*5+j),sy+8+life*9);}
 for(let j=0;j<16;j++){const q=(introElapsed*1.3+j*.618)%1,side=j%2?1:-1,sx=x+side*(12+q*55),sy=y+3-Math.sin(q*Math.PI)*(9+j%4*3);eg.fillStyle(0xc4dfe6,opacity*(1-q)*.45).fillCircle(sx,sy,1+j%2);}
 for(let j=0;j<3;j++){const q=(introElapsed*.7+j/3)%1;eg.lineStyle(1,0xc5dce0,opacity*(1-q)*.22).strokeEllipse(x,y+4,35+q*120,9+q*24);}
 }


 }else{a.tag.setVisible(true);a.bar.setVisible(true);}
 if(mine&&p.hp>0){this.fx.lineStyle(1,0xf1d28d,.55);this.fx.strokeEllipse(a.x,a.y+3,49,17);}if(p.hp>0&&p.dash>1.32){a.s.setAlpha(.65);if(moving&&t-(a.lastGhost||0)>38){a.lastGhost=t;const ghost=this.add.image(a.s.x,a.s.y,a.s.texture.key,a.s.frame.name).setOrigin(a.s.originX,a.s.originY).setDisplaySize(a.s.displayWidth,a.s.displayHeight).setFlipX(a.s.flipX).setAngle(a.s.angle).setTint(0xffe2a4).setAlpha(.48).setDepth(a.y-2);this.tweens.add({targets:ghost,alpha:0,duration:300,onComplete:()=>ghost.destroy()});}}
 }
 const dropIds=new Set((world.pickups||[]).map(d=>d.id));for(const [id,view] of this.drops)if(!dropIds.has(id)){view.destroy(true);this.drops.delete(id);}for(const d of world.pickups||[]){let view=this.drops.get(d.id);if(!view){const base=this.add.image(0,5,'healing-shrine').setOrigin(.5,1).setDisplaySize(105,125).setVisible(!!d.shared),halo=this.add.ellipse(0,-52,55,35,0x70c591,.2),flame=this.add.image(0,-52,'spirit-loop','0-0').setDisplaySize(35,48).setTint(0x88efad),label=this.add.text(0,21,'',{fontSize:'10px',color:'#c4d8b8',stroke:'#152c24',strokeThickness:3}).setOrigin(.5);view=this.add.container(d.x,d.y,[base,halo,flame,label]);this.drops.set(d.id,view);}const available=!d.used&&(!d.shared||Object.values(world.players).filter(p=>p.hp>0).length>=2),frame=Math.floor(t/110)%8;view.setDepth(d.y+5);view.list[1].setVisible(available).setScale(1+Math.sin(t*.005)*.1);view.list[2].setVisible(available).setTexture('spirit-loop',`${Math.floor(frame/4)}-${frame%4}`).setDisplaySize((d.shared?35:42)*(1+Math.sin(t*.006)*.035),d.shared?48:56);view.list[3].setText(d.shared?(d.used?'Shrine spent':available?'40 HP · shared by team':'Team shrine · 2 living ronin required'):'+30 HP');}


 const livingTargets=Object.values(world.players).filter(p=>p.hp>0);
 let alive=new Set(world.enemies.map(e=>e.id));for(let [id,a]of this.foes)if(!alive.has(id)){this.tweens.add({targets:a.s,alpha:0,scaleX:a.s.scaleX*1.2,scaleY:a.s.scaleY*1.2,duration:220,onComplete:()=>a.s.destroy()});a.bar.destroy();a.portal?.destroy();this.foes.delete(id);}
 for(let e of world.enemies){let a=this.foes.get(e.id);if(!a){let s=this.add.sprite(e.x,e.y,'yokai-atlas',e.boss?'oni':'imp').setOrigin(.5,.87);s.setDisplaySize(e.boss?150:80,e.boss?160:90);a={s,portal:this.add.graphics(),bar:this.add.graphics(),x:e.x,y:e.y,hp:e.hp,flash:0};this.foes.set(e.id,a);monsterSound(e.kind,e.boss);}let dx=e.x-a.x,dy=e.y-a.y;a.x+=dx*blend;a.y+=dy*blend;const travel=Math.hypot(dx*blend,dy*blend);a.moveSpeed=(a.moveSpeed||0)+(travel/Math.max(delta,1)*1000-(a.moveSpeed||0))*(1-Math.exp(-delta/140));if(a.moveSpeed>8)a.walking=true;else if(a.moveSpeed<3)a.walking=false;if(a.walking)a.walkDistance=(a.walkDistance||0)+a.moveSpeed*delta/1000;if(a.walking&&Math.hypot(dx,dy)>2){
 const vertical=Math.abs(dy)>Math.abs(dx)*(a.facing==='side'?1.25:.8);
 a.facing=vertical?(dy<0?'back':'front'):'side';
 if(!vertical&&Math.abs(dx)>3)a.flip=dx<0;
 }
 const kind=e.kind??0,side=!a.facing||a.facing==='side',sheet=kind>=7?`enemy-new-${kind}`:`enemy-${side?'cycle':'direction'}-${kind}`,cycle=(a.walkDistance||0)/(e.boss?76:52),step=kind>=7?(side?0:a.facing==='back'?8:4)+Math.floor(cycle*4)%4:side?Math.floor(cycle*12)%12:(a.facing==='back'?4:0)+Math.floor(cycle*4)%4;
 const proportions=this.cache.json.get(sheet+'-frames').groups['0'],height=e.boss?160:90;
 a.s.setTexture(sheet,String(step)).setOrigin(.5,1).setDisplaySize(height*proportions.width/proportions.height,height).setFlipX(side&&!!a.flip);if(e.hp<a.hp)a.flash=t+110;a.hp=e.hp;if(t<a.flash)a.s.setTint(0xffe3af);else a.s.clearTint();let target,nearest=Infinity;for(const candidate of livingTargets){const distance=(candidate.x-e.x)**2+(candidate.y-e.y)**2;if(distance<nearest){nearest=distance;target=candidate;}}
 if(target){const nx=target.x-e.x,ny=target.y-e.y,dist=Math.hypot(nx,ny)||1;a.aim={x:nx/dist,y:ny/dist};}
 const aim=a.aim||{x:1,y:0};if(e.cd>(a.prevCd??e.cd)+.3){a.strikeAt=t;monsterSound(e.kind,e.boss);this.enemyStrike(a.x,a.y,aim.x,aim.y,e.boss);}a.prevCd=e.cd;
 const elapsed=t-(a.strikeAt??-1000),striking=elapsed<260;
 const near=target&&Math.hypot(target.x-e.x,target.y-e.y)<(e.boss?100:65);
 const windup=near&&!striking&&e.cd<.3?1-e.cd/.3:0;
 const lunge=striking?Math.sin(elapsed/260*Math.PI)*(e.boss?23:16):-windup*7;
 const edge=a.s.displayWidth/2+24,footX=Math.max(edge,Math.min(1000-edge,a.x+aim.x*lunge)),footY=Math.max(height+24,Math.min(570,a.y+aim.y*lunge));a.s.setPosition(footX,footY).setAngle(striking?aim.x*18*Math.sin(elapsed/260*Math.PI):-aim.x*windup*12).setDepth(a.y);
 if(e.knock>0){a.s.setY(footY-Math.sin((1-e.knock/.5)*Math.PI)*35).setAngle(e.kx*22*Math.sin((1-e.knock/.5)*Math.PI));}
 if(windup>0)a.s.setTint(0xffbb99);
 // One continuous portal timeline: ignite, reveal, then extinguish.
 a.spawnRemaining=Math.min(e.spawn||0,Math.max(0,(a.spawnRemaining??e.spawn??0)-delta/1000));const spawning=a.spawnRemaining>0,progress=1-a.spawnRemaining/1.2;
 a.portal.clear().setDepth(a.y+1);
 if(spawning){const g=a.portal,x=footX,y=footY-3,size=e.boss?62:36;
 const opening=Math.min(1,progress/.22),fade=Math.min(1,(1-progress)/.28),r=size*opening;
 g.fillStyle(0xff7a18,.16*fade).fillEllipse(x,y,r*2.9,r*1.15);
 g.fillStyle(0x28101d,.9*fade).fillEllipse(x,y,r*2,r*.65);
 g.lineStyle(4,0xff7318,fade).strokeEllipse(x,y,r*2,r*.65);
 g.lineStyle(2,0xffe6a0,fade).strokeEllipse(x,y,r*1.8,r*.5);
 for(let j=0;j<18;j++){const angle=j*Math.PI*2/18,phase=progress*12+j*2.399,px=x+Math.cos(angle)*r,py=y+Math.sin(angle)*r*.32,h=(15+11*(.5+.5*Math.sin(phase)))*(e.boss?1.5:1)*opening;
 g.fillStyle(j%2?0xffb32b:0xff641c,.85*fade);g.fillTriangle(px-5,py,px+5,py,px+Math.sin(phase)*5,py-h);
 g.fillStyle(0xffefb1,.9*fade);g.fillTriangle(px-2,py,px+2,py,px,py-h*.6);
 const lift=(progress*65+j*11)%55;g.fillStyle(0xffd779,fade*(1-lift/55));g.fillCircle(px+Math.sin(phase)*7,py-lift,1.5);
 }
 a.s.setAlpha(Phaser.Math.Clamp((progress-.2)/.5,0,1));a.s.setY(footY+(1-Phaser.Math.Clamp((progress-.2)/.5,0,1))*12);a.s.setAngle(0);
 }else a.s.setAlpha(1);
 a.bar.setVisible(!spawning);
 let width=e.boss?70:34,top=a.y-(e.boss?130:72);a.bar.clear().setDepth(1400).fillStyle(0x121820,.8).fillRoundedRect(a.x-width/2,top,width,5,2).fillStyle(0xdd7765).fillRoundedRect(a.x-width/2,top,width*e.hp/e.max,5,2);}
 }
}

let roomsLoading=false;
async function refreshRooms(){
 if(roomsLoading||$('setup').hidden)return;roomsLoading=true;
 try{
  const response=await fetch('/api/rooms',{cache:'no-store'});if(!response.ok)throw Error();
  const rooms=await response.json(),list=$('active-rooms');list.replaceChildren();
  if(!rooms.length)list.textContent='No active rooms yet. Create one to start playing.';
  for(const r of rooms){
   const row=document.createElement('div');row.className='room-row';
   const label=document.createElement('span');label.textContent=`Room ${r.code} · ${r.players}/${r.capacity} players · ${r.phase==='lobby'?'Waiting':r.phase==='over'?'Defeated':r.phase==='victory'?'Finished':'Level '+r.level}`;
   const button=document.createElement('button');button.textContent=r.players>=r.capacity?'Full':'Join';button.disabled=r.players>=r.capacity;
   button.onclick=async()=>{button.disabled=true;$('code').value=r.code;await connect(true);await refreshRooms();};row.append(label,button);list.append(row);
  }
 }catch{$('active-rooms').textContent='Unable to load rooms. Try Refresh rooms.';}finally{roomsLoading=false;}
}
$('refresh-rooms').onclick=refreshRooms;
setInterval(()=>{if(!document.hidden)refreshRooms();},5000);

function playerName(){return validateUsername($('username').value).name||'Wanderer';}
try{$('username').value=localStorage.getItem('ronin-username')||'';}catch{}
$('chat-name').value=$('username').value;
for(const id of ['username','chat-name'])$(id).addEventListener('input',()=>{const value=$(id).value.slice(0,20);$('username').value=$('chat-name').value=value;try{localStorage.setItem('ronin-username',value);}catch{}});
let chatRoom=null,chatConnecting=false;
function appendChat(message){const row=document.createElement('p'),name=document.createElement('strong');name.textContent=message.name+': ';row.append(name,document.createTextNode(message.text));const log=$('chat-log');log.append(row);while(log.children.length>60)log.firstChild.remove();log.scrollTop=log.scrollHeight;}
$('chat-connect').onclick=async()=>{const validation=validateUsername($('chat-name').value);if(validation.error){$('chat-status').textContent=validation.error;return;}if(chatConnecting)return;chatConnecting=true;$('chat-connect').disabled=true;$('chat-status').textContent='Connecting…';try{if(chatRoom)await chatRoom.leave();const joined=await client.joinOrCreate('lobby-chat',{username:playerName(),nameColor:$('name-color').value});chatRoom=joined;$('chat-log').replaceChildren();joined.onMessage('history',messages=>messages.forEach(appendChat));joined.onMessage('chat',appendChat);joined.onMessage('chat-error',message=>$('chat-status').textContent=message);joined.onLeave(()=>{if(chatRoom!==joined)return;chatRoom=null;$('chat-message').disabled=$('chat-send').disabled=true;$('chat-status').textContent='Disconnected. Connect to chat again.';});$('chat-message').disabled=$('chat-send').disabled=false;$('chat-status').textContent='Chatting as '+playerName();$('chat-connect').textContent='Reconnect / update name';}catch{$('chat-status').textContent='Chat unavailable. Try connecting again.';}finally{chatConnecting=false;$('chat-connect').disabled=false;}};
$('chat-form').onsubmit=event=>{event.preventDefault();const text=$('chat-message').value.trim();if(!chatRoom||!text)return;chatRoom.send('chat',{text});$('chat-message').value='';};
$('chat-panel').addEventListener('focusin',()=>{held.clear();room?.send('input',{});});

try{$('name-color').value=localStorage.getItem('ronin-name-color')||'#fff0cf';}catch{}
$('name-color').oninput=()=>{try{localStorage.setItem('ronin-name-color',$('name-color').value);}catch{}};

function updateOrientationGate(){
 const blocked=portraitBlocked();$('rotate-device').hidden=!blocked;
 for(const id of ['app','chat-panel'])$(id).inert=blocked;
 if(blocked){resetStick();held.clear();for(const key in touch)touch[key]=false;room?.send('input',{});document.activeElement?.blur?.();}
}
matchMedia('(pointer:coarse) and (orientation:portrait)').addEventListener('change',updateOrientationGate);
updateOrientationGate();
