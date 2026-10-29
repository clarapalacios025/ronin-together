// Lightweight, continuous elemental atmosphere for the character cards.
const reduced = matchMedia('(prefers-reduced-motion: reduce)');
const stone = new Image(); stone.src = '/assets/earth-stone.png';
const cards = [...document.querySelectorAll('.hero')].map((card, element) => {
  const canvas = document.createElement('canvas');
  canvas.className = 'element-motion'; canvas.setAttribute('aria-hidden', 'true');
  canvas.width = 300; canvas.height = 450;
  card.querySelector('.portrait').append(canvas);
  const ctx=canvas.getContext('2d');
  card.addEventListener('pointerleave',()=>ctx.clearRect(0,0,300,450));
  return {card, element, ctx};
});
let last = 0;
function draw(now) {
  requestAnimationFrame(draw);
  if (document.hidden || reduced.matches || now-last<33) return;
  last=now;
  for (const {card,element,ctx:c} of cards) {
    if (!card.getClientRects().length || !card.matches(':hover')) continue;
    c.clearRect(0,0,300,450);
    const t=now/1000;
    if(element===1) {
      // Soft continuous flame currents at the portrait edges, not repeated fire stamps.
      for(let side=0;side<2;side++) {
        const x=side?278:22;
        const glow=c.createRadialGradient(x,360,5,x,360,180);
        glow.addColorStop(0,'#dd70252b');glow.addColorStop(1,'#b9470900');
        c.fillStyle=glow;c.fillRect(0,160,300,290);
        for(let j=0;j<9;j++) {
          const q=(t*.18+j/9)%1,y=475-q*510;
          const sway=Math.sin(t*1.6+j*1.9)*12;
          c.globalAlpha=Math.sin(q*Math.PI)*.38;
          for(let layer=0;layer<3;layer++) {
            c.strokeStyle=['#b3481722','#e17e353d','#f3bd7166'][layer];
            c.lineWidth=[18,7,1.5][layer];c.lineCap='round';
            c.beginPath();c.moveTo(x+sway-8,y+42);
            c.bezierCurveTo(x+24,y+12,x-19,y-14,x+sway,y-49);
            c.stroke();
          }
        }
      }
      c.globalAlpha=1;
      continue;
    }
    for(let i=0;i<(element===0?12:28);i++) {
      const q=(t*(element===3?.25:.16)+i*.618033)%1;
      const x=(i%2?270:30)+Math.sin(t*.8+i*2.4)*23;
      const y=element===3?q*500-25:470-q*500;
      const a=Math.sin(q*Math.PI)*.65;
      c.save(); c.globalAlpha=a;
      if(element===0) {
        if(stone.complete && stone.naturalWidth) {
          const size=24+i%3*9;c.translate(x,y);c.rotate(Math.sin(t+i)*.3);
          c.drawImage(stone,-size/2,-size/2,size,size);
        }
      } else if(element===2) {
        // Layered, curling air currents with soft edges rather than leaves.
        const drift=Math.sin(t*1.2+i)*12;
        for(let layer=0;layer<3;layer++) {
          c.strokeStyle=layer===2?'#dce7e0aa':'#b7d0c733';
          c.lineWidth=layer===0?9:layer===1?4:1;
          c.beginPath();c.moveTo(x-38,y+32);
          c.bezierCurveTo(x+48+drift,y+10,x-42-drift,y-24,x+32,y-62);
          c.stroke();
        }
      } else {
        c.strokeStyle='#95ccd577';c.lineWidth=1.4;c.beginPath();c.moveTo(x,y-22);c.bezierCurveTo(x+5,y-10,x-5,y+5,x,y+20);c.stroke();
        c.strokeStyle='#c2e5e344';c.beginPath();c.ellipse(x,425,8+q*15,2+q*3,0,0,Math.PI*2);c.stroke();
      }
      c.restore();
    }
  }
}
requestAnimationFrame(draw);
