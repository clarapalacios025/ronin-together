window.__roninAudioCleanup?.();
// Original synthesized score and effects; no sampled recordings.
const musicVoices=new Set();
let ctx,musicBus,sfxBus,mode='menu',step=0,next=0,lastGrowl=0;
const level=key=>{const n=Number(localStorage.getItem(key));return localStorage.getItem(key)===null?.35:Math.max(0,Math.min(1,Number.isFinite(n)?n:.35));};
let musicLevel=level('ronin-music-volume'),effectsLevel=level('ronin-effects-volume');
let mute=localStorage.getItem('ronin-muted')==='true';
export const audioSettings=()=>({music:musicLevel,effects:effectsLevel,muted:mute});
function volumes(){if(!ctx)return;musicBus.gain.setTargetAtTime(mute||document.hidden?0:musicLevel*.65,ctx.currentTime,.15);sfxBus.gain.setTargetAtTime(mute||document.hidden?0:effectsLevel*.5,ctx.currentTime,.03);}
export function setAudioSettings(values){if(values.music!==undefined)musicLevel=values.music;if(values.effects!==undefined)effectsLevel=values.effects;if(values.muted!==undefined)mute=values.muted;localStorage.setItem('ronin-music-volume',musicLevel);localStorage.setItem('ronin-effects-volume',effectsLevel);localStorage.setItem('ronin-muted',mute);volumes();}
export async function unlockAudio(){try{if(!ctx){ctx=new (window.AudioContext||window.webkitAudioContext)();musicBus=ctx.createGain();sfxBus=ctx.createGain();musicBus.connect(ctx.destination);sfxBus.connect(ctx.destination);volumes();next=ctx.currentTime+.05;}await ctx.resume();volumes();return ctx.state==='running';}catch{return false;}}
export function musicMode(value){if(mode===value)return;mode=value;step=0;if(ctx){for(const voice of musicVoices){try{voice.stop();}catch{}}musicVoices.clear();musicBus.disconnect();musicBus=ctx.createGain();musicBus.connect(ctx.destination);volumes();next=ctx.currentTime+.08;}}
function tone(freq,time,duration,volume,type='sine',bus=musicBus,end=freq){const o=ctx.createOscillator(),g=ctx.createGain();o.type=type;o.frequency.setValueAtTime(freq,time);o.frequency.exponentialRampToValueAtTime(Math.max(20,end),time+duration);g.gain.setValueAtTime(.0001,time);g.gain.exponentialRampToValueAtTime(volume,time+.012);g.gain.exponentialRampToValueAtTime(.0001,time+duration);o.connect(g);g.connect(bus);if(bus===musicBus)musicVoices.add(o);o.start(time);o.stop(time+duration+.02);o.onended=()=>{musicVoices.delete(o);o.disconnect();g.disconnect();};}
function noise(time,duration,frequency,end,volume){const b=ctx.createBuffer(1,Math.ceil(ctx.sampleRate*duration),ctx.sampleRate),d=b.getChannelData(0);for(let i=0;i<d.length;i++)d[i]=Math.random()*2-1;const n=ctx.createBufferSource(),f=ctx.createBiquadFilter(),g=ctx.createGain();n.buffer=b;f.type='bandpass';f.Q.value=.8;f.frequency.setValueAtTime(frequency,time);f.frequency.exponentialRampToValueAtTime(end,time+duration);g.gain.setValueAtTime(.0001,time);g.gain.exponentialRampToValueAtTime(volume,time+.018);g.gain.exponentialRampToValueAtTime(.0001,time+duration);n.connect(f);f.connect(g);g.connect(sfxBus);n.start(time);n.onended=()=>{n.disconnect();f.disconnect();g.disconnect();};}
export function slashSound(){if(!ctx||mute||document.hidden)return;const t=ctx.currentTime;
 // Broad air displacement followed by a narrow blade hiss, without a pitched beep.
 noise(t,.27,900,2200,.48);
 noise(t+.025,.18,6500,1000,.7);
 noise(t+.10,.17,3200,500,.22);
}
export function monsterSound(kind=0,boss=false){if(!ctx||mute||document.hidden||ctx.currentTime-lastGrowl<.45)return;lastGrowl=ctx.currentTime;const t=ctx.currentTime,f=(boss?58:95+kind*12);tone(f,t,.38,.13,'sawtooth',sfxBus,f*.6);tone(f*1.04,t,.32,.07,'triangle',sfxBus,f*.7);noise(t,.32,400+kind*90,160,.2);}
const calm=[62,69,72,74,69,65,62,null,65,69,74,77,74,72,69,null,62,65,69,72,69,65,60,null,62,69,65,62,null,60,62,null];
// Six original pentatonic arrangements: separate melodies, tempos and percussion.
const scores=[
 {name:'Lantern Courtyard',beat:.30,root:50,voice:'pluck',drums:4,notes:[62,65,69,72,69,65,62,null,57,62,65,69,65,62,57,null,65,69,74,72,69,65,62,57,62,null,65,69,62,57,62,null]},
 {name:'Bamboo Grove',beat:.36,root:57,voice:'flute',drums:8,notes:[69,null,72,76,79,76,72,null,69,64,67,69,null,72,69,null,76,79,81,79,76,null,72,69,67,64,67,69,72,null,69,null]},
 {name:'Mountain Shrine',beat:.25,root:48,voice:'pluck',drums:2,notes:[60,61,65,67,68,67,65,61,60,null,55,60,61,65,67,null,72,68,67,65,61,60,55,null,60,65,67,68,67,65,61,60]},
 {name:'Snow Pass',beat:.43,root:52,voice:'flute',drums:8,notes:[76,null,74,null,71,67,64,null,66,null,67,71,74,null,71,null,79,null,76,74,71,null,67,64,66,67,null,71,67,66,64,null]},
 {name:'River Crossing',beat:.28,root:55,voice:'pluck',drums:4,notes:[67,69,74,76,79,76,74,69,67,62,67,69,74,69,67,null,74,76,79,81,79,76,74,69,67,69,74,76,74,69,67,62]},
 {name:'Volcanic Gate',beat:.21,root:45,voice:'pluck',drums:2,notes:[57,58,62,64,65,64,62,58,57,52,57,58,62,64,65,69,69,65,64,62,58,57,52,57,58,62,64,65,69,65,62,57]}
];
// Nine further arrangements keep the same instrument palette with distinct motifs and tempos.
for(let i=0;i<9;i++) {
 const base=scores[i%6],shift=[2,-2,5,0,3,-5,2,0,-2][i];
 scores.push({name:`Level ${i+7}`,beat:[.32,.27,.29,.35,.4,.31,.24,.26,.22][i],root:base.root+shift,voice:i%2?'pluck':'flute',drums:i===8?2:4,
 notes:base.notes.map((_,j)=>{const n=base.notes[(j+4+i*2)%32];return n===null?null:n+shift;})});
}
const hz=n=>440*2**((n-69)/12);
// Damped delay-string synthesis gives a plucked string body instead of a synth beep.
const pluckBuffers=new Map();
function pluck(note,t,volume=.2){let buffer=pluckBuffers.get(note);if(!buffer){const freq=hz(note),period=Math.round(ctx.sampleRate/freq),length=Math.floor(ctx.sampleRate*1.8);buffer=ctx.createBuffer(1,length,ctx.sampleRate);const data=buffer.getChannelData(0);let seed=note*137;for(let i=0;i<period;i++){seed=(seed*16807)%2147483647;data[i]=(seed/2147483647*2-1)*.7;}for(let i=period;i<length;i++)data[i]=.497*(data[i-period]+data[i-period+1]);pluckBuffers.set(note,buffer);}const source=ctx.createBufferSource(),gain=ctx.createGain();source.buffer=buffer;gain.gain.value=volume;source.connect(gain);gain.connect(musicBus);musicVoices.add(source);source.start(t);source.onended=()=>{musicVoices.delete(source);source.disconnect();gain.disconnect();};}
function flute(note,t,duration){const o=ctx.createOscillator(),g=ctx.createGain(),v=ctx.createOscillator(),vg=ctx.createGain();o.frequency.value=hz(note);v.frequency.value=4.8;vg.gain.value=2.4;v.connect(vg);vg.connect(o.frequency);g.gain.setValueAtTime(0,t);g.gain.linearRampToValueAtTime(.1,t+.12);g.gain.setTargetAtTime(.055,t+.25,.12);g.gain.linearRampToValueAtTime(0,t+duration);o.connect(g);g.connect(musicBus);for(const n of [o,v]){musicVoices.add(n);n.start(t);n.stop(t+duration+.02);}o.onended=()=>{musicVoices.delete(o);musicVoices.delete(v);o.disconnect();v.disconnect();vg.disconnect();g.disconnect();};}
const musicTimer=setInterval(()=>{if(!ctx||ctx.state!=='running'||document.hidden)return;if(next<ctx.currentTime)next=ctx.currentTime+.03;while(next<ctx.currentTime+.15){const index=Number(mode.split('-')[1])-1,score=mode==='ending'?{beat:.58,root:50,voice:'flute',drums:32,notes:[74,null,72,69,null,65,69,null,62,null,65,69,72,null,69,null,77,null,74,72,69,null,65,null,62,65,null,69,65,null,62,null]}:mode.startsWith('level-')?scores[Math.max(0,Math.min(scores.length-1,index))]:null,t=next,note=(score?.notes||calm)[step%32];
 if(score){if(note!==null){if(score.voice==='flute'&&step%2===0)flute(note,t,score.beat*2.5);else pluck(note,t,.25);if(step%8===0)pluck(note-12,t,.15);}if(step%score.drums===0){tone(step%8===0?85:125,t,.36,.26,'sine',musicBus,35);tone(160,t,.12,.045,'triangle',musicBus,65);}if(step%16===12)flute(score.root+24,t,score.beat*3);}
 else if(note!==null){tone(hz(note),t,1.1,.24,'triangle');tone(hz(note)*2,t,.6,.04);if(step%4===0)tone(hz(note)/2,t,1.8,.08);if(step%8===4)tone(hz(81),t,1.7,.045);}
 step++;next+=score?.beat||.52;}},60);
const onVisibility=()=>{volumes();if(ctx)next=ctx.currentTime+.05;};document.addEventListener('visibilitychange',onVisibility);
window.addEventListener('pointerdown',unlockAudio);window.addEventListener('keydown',unlockAudio);

function disposeAudio(){goVoice.pause();clearInterval(musicTimer);window.removeEventListener('pointerdown',unlockAudio);window.removeEventListener('keydown',unlockAudio);document.removeEventListener('visibilitychange',onVisibility);ctx?.close().catch(()=>{});}
window.__roninAudioCleanup=disposeAudio;
if(import.meta.hot)import.meta.hot.dispose(disposeAudio);

const goVoice=new Audio('/assets/go-recorded.m4a');
export function goSound(){if(mute||document.hidden||effectsLevel===0)return;goVoice.pause();goVoice.currentTime=0;goVoice.volume=effectsLevel;goVoice.play().catch(()=>{});}
export function landingSound(){if(!ctx||mute||document.hidden)return;const t=ctx.currentTime;tone(95,t,.5,.65,'sine',sfxBus,25);noise(t,.6,550,70,.45);}
