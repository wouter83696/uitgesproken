(function(global){
  function normalizeHex(input){
    var v=String(input||'').trim();
    if(!v)return '';
    if(/^#([0-9a-f]{3})$/i.test(v))return('#'+v.charAt(1)+v.charAt(1)+v.charAt(2)+v.charAt(2)+v.charAt(3)+v.charAt(3)).toLowerCase();
    if(/^#([0-9a-f]{6})$/i.test(v))return v.toLowerCase();
    return '';
  }
  function baseVar(name,fallback,root){
    try{
      var value=getComputedStyle(root||document.documentElement).getPropertyValue(name)||'';
      var hex=normalizeHex(value);
      if(hex)return hex;
    }catch(_e){}
    return fallback;
  }
  function prng(seed){
    var a=seed>>>0;
    return function(){
      a|=0;
      a=(a+0x6D2B79F5)|0;
      var t=Math.imul(a^(a>>>15),1|a);
      t=(t+Math.imul(t^(t>>>7),61|t))^t;
      return((t^(t>>>14))>>>0)/4294967296;
    };
  }
  function hexToRgb(hex){
    var h=String(hex||'').replace('#','');
    if(h.length===3)h=h[0]+h[0]+h[1]+h[1]+h[2]+h[2];
    return [parseInt(h.slice(0,2),16),parseInt(h.slice(2,4),16),parseInt(h.slice(4,6),16)];
  }
  function rgbToHsl(r,g,b){
    r/=255;g/=255;b/=255;
    var mx=Math.max(r,g,b),mn=Math.min(r,g,b),h=0,s=0,l=(mx+mn)/2;
    if(mx!==mn){
      var d=mx-mn;
      s=l>.5?d/(2-mx-mn):d/(mx+mn);
      switch(mx){
        case r:h=(g-b)/d+(g<b?6:0);break;
        case g:h=(b-r)/d+2;break;
        case b:h=(r-g)/d+4;break;
      }
      h*=60;
    }
    return [h,s,l];
  }
  function mixToWhite(hex,amt){
    var rgb=hexToRgb(hex);
    return 'rgb('+rgb.map(function(v){return Math.round(v+(255-v)*amt);}).join(',')+')';
  }
  function mixHex(hexA,hexB,amt){
    var a=hexToRgb(hexA),b=hexToRgb(hexB),t=Math.max(0,Math.min(1,Number(amt)||0));
    return '#'+a.map(function(v,i){
      return Math.round(v+(b[i]-v)*t).toString(16).padStart(2,'0');
    }).join('');
  }
  function blobPath(ctx,cx,cy,r,irr,pts,rnd){
    var step=(Math.PI*2)/pts;
    ctx.beginPath();
    for(var i=0;i<=pts;i++){
      var a=i*step,rr=r*(1-irr/2+rnd()*irr),x=cx+Math.cos(a)*rr,y=cy+Math.sin(a)*rr;
      if(i===0)ctx.moveTo(x,y);
      else{
        var ca=a-step/2,cr=r*(1-irr/2+rnd()*irr),cpx=cx+Math.cos(ca)*cr,cpy=cy+Math.sin(ca)*cr;
        ctx.quadraticCurveTo(cpx,cpy,x,y);
      }
    }
    ctx.closePath();
  }
  function triPath(ctx,cx,cy,r,rnd){
    var a=rnd()*Math.PI*2;
    ctx.beginPath();
    for(var i=0;i<3;i++){
      var ang=a+i*(Math.PI*2/3),x=cx+Math.cos(ang)*r,y=cy+Math.sin(ang)*r;
      if(i===0)ctx.moveTo(x,y);else ctx.lineTo(x,y);
    }
    ctx.closePath();
  }
  function diamondPath(ctx,cx,cy,r,rnd){
    var rx=r*(0.7+rnd()*0.4),ry=r*(0.9+rnd()*0.3);
    ctx.beginPath();
    ctx.moveTo(cx,cy-ry);
    ctx.lineTo(cx+rx,cy);
    ctx.lineTo(cx,cy+ry);
    ctx.lineTo(cx-rx,cy);
    ctx.closePath();
  }
  function drawToCanvas(ctx,opts){
    opts=opts||{};
    var W=Math.max(1,Math.round(opts.width||ctx.canvas.width||1));
    var H=Math.max(1,Math.round(opts.height||ctx.canvas.height||1));
    var isNight=!!opts.isNight;
    var pal=(Array.isArray(opts.palette)&&opts.palette.length?opts.palette:['#CFE6DF']).map(function(v){return normalizeHex(v)||v;});
    var darkPalette=(Array.isArray(opts.darkPalette)&&opts.darkPalette.length?opts.darkPalette:['#67C5BB','#74CEC4','#7FD1C8','#8AD8D0','#93DCD4']).map(function(v){return normalizeHex(v)||v;});
    var count=Math.max(1,Math.round(typeof opts.count==='number'?opts.count:6));
    var alphaBoost=typeof opts.alphaBoost==='number'?opts.alphaBoost:1;
    var darkAlphaBoost=typeof opts.darkAlphaBoost==='number'?opts.darkAlphaBoost:1.02;
    var sizeScale=typeof opts.sizeScale==='number'?opts.sizeScale:1;
    var darkSizeScale=typeof opts.darkSizeScale==='number'?opts.darkSizeScale:1;
    var darkMix=typeof opts.darkMix==='number'?opts.darkMix:0.12;
    var irr=typeof opts.irregularity==='number'?opts.irregularity:0.35;
    var shapeSource=(Array.isArray(opts.shapeSource)&&opts.shapeSource.length?opts.shapeSource:['organic']).slice();
    var seedShapes=(Array.isArray(opts.seedShapes)&&opts.seedShapes.length?opts.seedShapes:shapeSource).slice();
    var useGrid=shapeSource.indexOf('grid')>=0;
    var drawShapes=shapeSource.filter(function(s){return s!=='grid';});
    if(!drawShapes.length)drawShapes=['organic'];
    ctx.fillStyle=opts.baseFill||(isNight?baseVar('--pk-cards-index-dark-bg','#1b1840'):baseVar('--pk-cards-index-bg','#FAFAF8'));
    ctx.fillRect(0,0,W,H);
    var seed=0;
    var seedSource=String(opts.seedKey||'')||pal.join('|')+'|'+count+'|'+seedShapes.join('|');
    for(var si=0;si<seedSource.length;si++)seed=((seed*31+seedSource.charCodeAt(si))|0)>>>0;
    var rnd=prng(seed+count*997);
    var pos=[];
    var aspect=W/Math.max(H,1);
    var phoneRef=780;
    var maxDim=Math.max(W,H);
    var scaleUp=Math.max(1,Math.pow(maxDim/phoneRef,0.3));
    var baseDim=phoneRef*(aspect>1?0.8:1)*scaleUp;
    if(useGrid){
      var cols=Math.ceil(Math.sqrt(count)),rows=Math.ceil(count/cols);
      for(var i=0;i<count;i++){
        var col=i%cols,row=Math.floor(i/cols);
        pos.push({x:W*((col+.2+rnd()*.6)/cols*1.16-.08),y:H*((row+.2+rnd()*.6)/rows*1.16-.08)});
      }
    }else{
      for(var j=0;j<count;j++)pos.push({x:(rnd()*1.1-.05)*W,y:(rnd()*1.1-.05)*H});
    }
    for(var k=0;k<count;k++){
      var raw=(isNight?darkPalette:pal)[k%(isNight?darkPalette.length:pal.length)],rgb=hexToRgb(raw),hsl=rgbToHsl(rgb[0],rgb[1],rgb[2]);
      var warm=(hsl[0]>=0&&hsl[0]<=70)||(hsl[0]>=290&&hsl[0]<=360),amt=warm?0.12:0.1;
      if(hsl[2]>.75)amt=warm?0.18:0.14;
      var alpha=isNight?Math.min((0.22+rnd()*.10)*darkAlphaBoost,.6):Math.min(((warm?0.19:0.24)+rnd()*.1)*alphaBoost,.68);
      var radius=(baseDim*(.19+rnd()*.16))*(isNight?darkSizeScale:sizeScale);
      var shapeType=drawShapes[k%drawShapes.length]||'organic';
      ctx.globalAlpha=alpha;
      ctx.fillStyle=isNight?mixHex(raw,'#1b1840',darkMix):mixToWhite(raw,amt);
      if(isNight){
        ctx.shadowColor=ctx.fillStyle;
        ctx.shadowBlur=22;
      }else{
        ctx.shadowColor='transparent';
        ctx.shadowBlur=0;
      }
      if(shapeType==='circle'){ctx.beginPath();ctx.arc(pos[k].x,pos[k].y,radius,0,Math.PI*2);ctx.closePath();ctx.fill();}
      else if(shapeType==='triangle'){triPath(ctx,pos[k].x,pos[k].y,radius,rnd);ctx.fill();}
      else if(shapeType==='diamond'){diamondPath(ctx,pos[k].x,pos[k].y,radius,rnd);ctx.fill();}
      else{blobPath(ctx,pos[k].x,pos[k].y,radius,irr,8+Math.floor(rnd()*5),rnd);ctx.fill();}
    }
    ctx.globalAlpha=1;
    ctx.shadowBlur=0;
    ctx.shadowColor='transparent';
  }
  global.PK=global.PK||{};
  global.PK.previewBackground={
    normalizeHex:normalizeHex,
    baseVar:baseVar,
    drawToCanvas:drawToCanvas
  };
})(window);
