import * as T from './vendor/three.module.js';

const V = (x=0,y=0,z=0) => new T.Vector3(x,y,z);
const clamp=T.MathUtils.clamp;
const ease=t=>t<.5?4*t*t*t:1-Math.pow(-2*t+2,3)/2;
let seed=83;
const rand=()=>{seed=(seed*1664525+1013904223)>>>0;return seed/4294967296;};
const palette={snow:0xc6dddc,wood:0x684c37,darkWood:0x3b3028,plaster:0xd3ad79,roof:0x9c4939,pine:0x214d3d,gold:0xdba955,red:0xa63e31,cream:0xf5e4ba};
const geometryCache=new Map(), materialCache=new Map();
function mat(color,roughness=.85,metalness=0,emissive=0,intensity=0){const k=[color,roughness,metalness,emissive,intensity].join('/');if(!materialCache.has(k))materialCache.set(k,new T.MeshStandardMaterial({color,roughness,metalness,emissive,emissiveIntensity:intensity}));return materialCache.get(k);}
function geo(type,...args){const k=type+args.join(',');if(!geometryCache.has(k))geometryCache.set(k,new T[type+'Geometry'](...args));return geometryCache.get(k);}
function group(parent,x=0,y=0,z=0,dynamic=false){const g=new T.Group();g.position.set(x,y,z);g.userData.dynamic=dynamic;parent.add(g);return g;}
function mesh(parent,geometry,material,x=0,y=0,z=0,sx=1,sy=1,sz=1){const m=new T.Mesh(geometry,material);m.position.set(x,y,z);m.scale.set(sx,sy,sz);m.castShadow=true;m.receiveShadow=true;parent.add(m);return m;}
function box(p,x,y,z,w,h,d,color){return mesh(p,geo('Box',1,1,1),typeof color==='number'?mat(color):color,x,y,z,w,h,d);}
function ball(p,x,y,z,sx,sy,sz,color,segments=12){return mesh(p,geo('Sphere',1,segments,8),typeof color==='number'?mat(color):color,x,y,z,sx,sy,sz);}
function cylinder(p,x,y,z,rt,rb,h,color,segments=12){return mesh(p,geo('Cylinder',rt,rb,h,segments),typeof color==='number'?mat(color):color,x,y,z);}
function tube(p,points,r,color){return mesh(p,new T.TubeGeometry(new T.CatmullRomCurve3(points.map(v=>Array.isArray(v)?V(...v):v)),Math.max(8,points.length*3),r,5,false),typeof color==='number'?mat(color):color);}
function rounded(p,x,y,z,w,h,d,color,r=.1){const k=`round/${w}/${h}/${d}/${r}`;let geometry=geometryCache.get(k);if(!geometry){const s=new T.Shape();const a=-w/2,b=-h/2;s.moveTo(a+r,b);s.lineTo(a+w-r,b);s.quadraticCurveTo(a+w,b,a+w,b+r);s.lineTo(a+w,b+h-r);s.quadraticCurveTo(a+w,b+h,a+w-r,b+h);s.lineTo(a+r,b+h);s.quadraticCurveTo(a,b+h,a,b+h-r);s.lineTo(a,b+r);s.quadraticCurveTo(a,b,a+r,b);geometry=new T.ExtrudeGeometry(s,{depth:d,bevelEnabled:true,bevelSegments:2,steps:1,bevelSize:r*.2,bevelThickness:r*.2,curveSegments:3});geometry.translate(0,0,-d/2);geometryCache.set(k,geometry);}return mesh(p,geometry,typeof color==='number'?mat(color):color,x,y,z);}
function glowTexture(){const c=document.createElement('canvas');c.width=c.height=64;const ctx=c.getContext('2d'),g=ctx.createRadialGradient(32,32,0,32,32,32);g.addColorStop(0,'rgba(255,239,183,1)');g.addColorStop(.12,'rgba(255,209,120,.7)');g.addColorStop(.4,'rgba(255,172,69,.16)');g.addColorStop(1,'rgba(255,157,69,0)');ctx.fillStyle=g;ctx.fillRect(0,0,64,64);return new T.CanvasTexture(c);}
const glowMap=glowTexture();
function glow(p,x,y,z,size,color=0xffb950,opacity=.55){const s=new T.Sprite(new T.SpriteMaterial({map:glowMap,color,transparent:true,opacity,depthWrite:false,blending:T.AdditiveBlending}));s.position.set(x,y,z);s.scale.setScalar(size);p.add(s);return s;}
function woodTexture(){const c=document.createElement('canvas');c.width=c.height=256;const ctx=c.getContext('2d');ctx.fillStyle='#907052';ctx.fillRect(0,0,256,256);for(let i=0;i<140;i++){ctx.strokeStyle=`rgba(40,20,7,${rand()*.09})`;ctx.lineWidth=1+rand()*2;ctx.beginPath();const x=rand()*256;ctx.moveTo(x,0);ctx.bezierCurveTo(x+rand()*12,80,x-8,180,x+rand()*15,256);ctx.stroke();}const t=new T.CanvasTexture(c);t.colorSpace=T.SRGBColorSpace;t.wrapS=t.wrapT=T.RepeatWrapping;return t;}
const timber=new T.MeshStandardMaterial({map:woodTexture(),color:0xcab895,roughness:.87});

// Merge static scenery by material. Moving parts and raycast targets retain their transforms.
function batchStatic(root){root.updateMatrixWorld(true);const inverse=root.matrixWorld.clone().invert(),buckets=new Map();root.traverse(m=>{if(!m.isMesh||Array.isArray(m.material))return;let p=m;while(p&&p!==root){if(p.userData.dynamic||p.userData.action)return;p=p.parent;}const key=m.material.uuid;if(!buckets.has(key))buckets.set(key,{material:m.material,meshes:[]});buckets.get(key).meshes.push(m);});for(const {material,meshes}of buckets.values()){if(meshes.length<3)continue;const pos=[],normal=[],uv=[],indices=[];let offset=0;for(const m of meshes){const g=m.geometry.clone().applyMatrix4(inverse.clone().multiply(m.matrixWorld));const a=g.attributes;pos.push(...a.position.array);if(a.normal)normal.push(...a.normal.array);else normal.push(...new Array(a.position.array.length).fill(0));if(a.uv)uv.push(...a.uv.array);else uv.push(...new Array(a.position.count*2).fill(0));if(g.index)for(const i of g.index.array)indices.push(i+offset);else for(let i=0;i<a.position.count;i++)indices.push(i+offset);offset+=a.position.count;g.dispose();m.removeFromParent();}const g=new T.BufferGeometry();g.setAttribute('position',new T.Float32BufferAttribute(pos,3));g.setAttribute('normal',new T.Float32BufferAttribute(normal,3));g.setAttribute('uv',new T.Float32BufferAttribute(uv,2));g.setIndex(indices);g.computeBoundingSphere();g.userData.merged=true;const m=new T.Mesh(g,material);m.castShadow=true;m.receiveShadow=true;root.add(m);}}

function fir(parent,x,z,height,snow=true){const g=group(parent,x,0,z);cylinder(g,0,height*.15,0,.09,.15,height*.3,palette.wood);for(let i=0;i<5;i++){const f=i/5,r=height*(.3-f*.045),h=height*.34,y=height*(.22+f*.15);const m=mesh(g,geo('Cone',r,h,9),mat(i%2?0x2e5748:0x234b3f),0,y,0);m.rotation.y=i*.8;if(snow){const cap=mesh(g,geo('Cone',r*.85,h*.76,9),mat(palette.snow),0,y+h*.18,0);cap.rotation.y=i*.8;}}return g;}
function gift(p,x,y,z,w,color,ribbon=0xdcb980){const g=group(p,x,y,z);rounded(g,0,w*.43,0,w,w*.83,w*.82,color,.06);box(g,0,w*.44,0,w*.13,w*.85,w*.84,ribbon);box(g,0,w*.44,0,w*1.01,w*.12,w*.84,ribbon);rounded(g,0,w*.88,0,w*1.06,w*.12,w*.9,color,.035);for(const sign of[-1,1]){const bow=mesh(g,geo('Torus',w*.15,w*.028,5,12),mat(ribbon),sign*w*.12,w*1.02,0);bow.rotation.x=Math.PI/2;bow.rotation.y=sign*.4;bow.scale.set(1,.55,1);}return g;}
function lantern(p,x,y,z,size=.5){const g=group(p,x,y,z);box(g,0,size*.45,0,size*.47,size*.8,size*.47,mat(0xffce7b,.6,0,0xffae4b,2.7));for(const a of[-1,1])for(const b of[-1,1])box(g,a*size*.26,size*.45,b*size*.26,size*.06,size*.9,size*.06,0x4d4231);cylinder(g,0,size*.94,0,size*.12,size*.4,size*.3,0x4d4231,4).rotation.y=Math.PI/4;cylinder(g,0,0,0,size*.4,size*.4,size*.07,0x4d4231,4).rotation.y=Math.PI/4;const ring=mesh(g,geo('Torus',size*.14,size*.025,5,12),mat(0x463c2d),0,size*1.2,0);glow(g,0,size*.48,0,size*3,0xffb961,.4);return g;}
function wreath(p,x,y,z,size=.5){const g=group(p,x,y,z);for(let i=0;i<20;i++){const a=i/20*Math.PI*2;ball(g,Math.cos(a)*size,Math.sin(a)*size,0,size*.25,size*.24,size*.2, i%2?0x355b3e:0x264b33);if(i%4===0)ball(g,Math.cos(a)*size,Math.sin(a)*size,.1,size*.075,size*.075,size*.075,0xad4531);}const bow1=ball(g,-size*.18,-size*.9,.15,size*.3,size*.15,size*.09,0xa94432);bow1.rotation.z=-.3;const bow2=ball(g,size*.18,-size*.9,.15,size*.3,size*.15,size*.09,0xa94432);bow2.rotation.z=.3;box(g,-size*.12,-size*1.13,.12,size*.12,size*.5,.03,0xa94432).rotation.z=-.2;box(g,size*.12,-size*1.13,.12,size*.12,size*.5,.03,0xa94432).rotation.z=.2;return g;}

export class WinterWorld {
  constructor(canvas,{onAction,onFrame}={}){
    this.canvas=canvas;this.onAction=onAction;this.onFrame=onFrame;this.mobile=innerWidth<650;this.stage='outside';this.paused=false;this.reduced=matchMedia('(prefers-reduced-motion: reduce)').matches;this.elapsed=0;this.frameCount=0;this.fps=60;this.quality=this.mobile?1:1.5;this.hitRoots=[];this.anchors={};this.tweens=[];this.fireParts=[];this.twinkles=[];this.trail=[];this.lookOffset=V();this.drag={x:0,y:0};this.last=0;this.transitioning=false;
    this.renderer=new T.WebGLRenderer({canvas,antialias:true,alpha:false,powerPreference:'high-performance'});
    this.renderer.setPixelRatio(Math.min(devicePixelRatio,this.quality));this.renderer.setSize(innerWidth,innerHeight);this.renderer.outputColorSpace=T.SRGBColorSpace;this.renderer.toneMapping=T.ACESFilmicToneMapping;this.renderer.toneMappingExposure=1.2;this.renderer.shadowMap.enabled=true;this.renderer.shadowMap.type=T.PCFSoftShadowMap;this.renderer.shadowMap.autoUpdate=false;this.renderer.shadowMap.needsUpdate=true;
    this.scene=new T.Scene();this.scene.background=new T.Color(0x122e39);this.scene.fog=new T.FogExp2(0x173943,.014);
    this.camera=new T.PerspectiveCamera(40,innerWidth/innerHeight,.1,130);this.camera.position.set(18,13,23);this.target=V(-2,1.3,0);this.basePosition=this.camera.position.clone();this.baseTarget=this.target.clone();
    this.outside=group(this.scene);this.house=group(this.scene);this.room=group(this.scene);this.roof=group(this.house);this.front=group(this.house);this.room.visible=false;
    this.hemi=new T.HemisphereLight(0xbedce6,0x304448,2.4);this.scene.add(this.hemi);
    this.moonLight=new T.DirectionalLight(0xcde6f2,3);this.moonLight.position.set(-9,17,9);this.moonLight.castShadow=true;this.moonLight.shadow.mapSize.set(1024,1024);this.moonLight.shadow.camera.left=-14;this.moonLight.shadow.camera.right=14;this.moonLight.shadow.camera.top=14;this.moonLight.shadow.camera.bottom=-14;this.moonLight.shadow.normalBias=.04;this.moonLight.shadow.bias=-.0003;this.scene.add(this.moonLight);
    this.warmLight=new T.PointLight(0xffa84f,22,15,2);this.warmLight.position.set(-2,2.2,-2);this.scene.add(this.warmLight);
    this.fill=new T.PointLight(0xffe0a0,18,17,2);this.fill.position.set(3.3,3,2.7);this.scene.add(this.fill);
    this.buildLandscape();this.buildOutside();this.buildHouse();this.buildRoom();this.buildParticles();this.buildCat();this.buildEasterEggs();this.buildPost();
    batchStatic(this.landscape);batchStatic(this.outside);batchStatic(this.roof);batchStatic(this.front);batchStatic(this.house);batchStatic(this.room);
    this.house.visible=true;this.room.visible=false;this.cat.visible=false;this.setPose('outside',true);this.setupInput();this.resize();
    this.clockStart=performance.now();this.raf=requestAnimationFrame(t=>this.loop(t));
  }
  buildLandscape(){
    // A continuous, quiet landscape beyond the cutaway. Nothing sits between camera and room.
    const p=this.landscape=group(this.scene);
    cylinder(p,0,-.62,0,65,65,.45,0x759997,64);
    for(let i=0;i<18;i++){
      const a=Math.PI*.1+i/17*Math.PI*.85, x=Math.cos(a)*35,z=-12-Math.sin(a)*22;
      ball(p,x,-1.8,z,9+rand()*7,3+rand()*3,7,0x739797,16);
    }
    for(let i=0;i<34;i++){const x=(rand()-.5)*65,z=-11-rand()*25;fir(p,x,z,2+rand()*4,true);}
    for(const [x,z] of [[-14,-13],[13,-17],[23,-24],[-25,-23]]){
      const h=group(p,x,-.25,z);box(h,0,1,0,2.5,2,2,0x637e78);
      const roof=mesh(h,geo('Cone',2,1.3,4),mat(0xa7c0b8),0,2.6,0);roof.rotation.y=Math.PI/4;
      for(const dx of[-.65,.65])box(h,dx,1.1,1.02,.45,.6,.04,mat(0xe8c58a,.7,0,0xe5b064,.7));
      glow(h,0,1.1,1.1,3,0xffbd72,.12);
    }
    const materials=new Map();p.traverse(m=>{if(!m.isMesh)return;const old=m.material;if(!materials.has(old.uuid)){const color=old.color.clone();if(old.emissiveIntensity>0)color.lerp(new T.Color(0xffc675),.4);else color.lerp(new T.Color(0x345b6a),.62);materials.set(old.uuid,new T.MeshBasicMaterial({color}));}m.material=materials.get(old.uuid);m.castShadow=false;});
  }
  buildOutside(){
    const p=this.outside;
    cylinder(p,0,-.56,0,10.6,10,.7,0x526b68,64);cylinder(p,0,-.18,0,10.8,10.6,.24,palette.snow,64);
    for(let i=0;i<48;i++){const a=i/48*Math.PI*2;ball(p,Math.cos(a)*10.25,-.17,Math.sin(a)*10.25,.8,.19,.65,palette.snow);}
    // A curved stone path, with little boot prints leading to the door.
    for(let i=0;i<22;i++){const z=3.9+i*.28,x=Math.sin(i*.13)*.9;const stone=cylinder(p,x,-.01,z,.45,.44,.06,i%3===0?0xb2c6c0:0x9cb7b5,7);stone.scale.z=.65;stone.rotation.y=i*.4;const print=ball(p,x+(i%2?.16:-.16),.035,z,.08,.008,.18,0x819e9c);print.rotation.y=-.08+i*.01;}
    for(const [x,z,h]of[[-7,-3,6],[-7.8,1,4.5],[-6,5,4],[-4.8,-6,5.5],[5,-6,6.5],[7,-3,5],[8,2,4.1],[6.5,6,3.2],[-8.7,-6,3.6],[8,-6,3.5],[-6,7.2,2.4]])fir(p,x,z,h,true);
    for(let i=0;i<40;i++){const a=rand()*Math.PI*2,r=5+rand()*5;ball(p,Math.cos(a)*r,-.03,Math.sin(a)*r,.2+rand()*.7,.09+rand()*.16,.2+rand()*.6,palette.snow);}
    // Split-rail fence, with snow caps and red-ribbon gate posts.
    for(const sign of[-1,1])for(let i=0;i<6;i++){const x=sign*(2.5+i*.95),z=6.5;box(p,x,.55,z,.12,1.25,.14,0x746856);ball(p,x,1.2,z,.13,.09,.13,palette.snow);if(i<5){box(p,x+sign*.45,.4,z,.9,.09,.08,0x80725e);box(p,x+sign*.45,.88,z,.9,.09,.08,0x80725e);}}
    for(const [x,z]of[[-1.65,5.2],[1.5,7.9],[-1.2,9.3]]){lantern(p,x,.06,z,.62);ball(p,x,.05,z,.8,.035,.65,mat(0xf2d8a0,.9,0,0xe8af60,.24));}
    // Miniature sled beside the entrance.
    const sled=group(p,-3.8,.15,4.1);sled.rotation.y=.4;for(const x of[-.35,.35])tube(sled,[[x,0,.8],[x,0,-.7],[x,.2,-.9],[x,.35,-.65]],.045,0x574b3c);for(let i=0;i<5;i++)box(sled,0,.28,-.5+i*.23,.85,.08,.16,0x9c5940);
    const moon=ball(p,-15,18,-20,1.25,1.25,.5,mat(0xffeac5,.8,0,0xffe3ad,1.4),24);glow(p,-15,18,-20,9,0xb5d8d8,.15);
    const stars=new Float32Array(160*3);for(let i=0;i<160;i++){stars[i*3]=(rand()-.5)*90;stars[i*3+1]=10+rand()*25;stars[i*3+2]=-25-rand()*35;}const sg=new T.BufferGeometry();sg.setAttribute('position',new T.BufferAttribute(stars,3));p.add(new T.Points(sg,new T.PointsMaterial({color:0xffe2b0,size:.055,sizeAttenuation:true,transparent:true,opacity:.75,depthWrite:false})));
  }
  buildHouse(){
    const p=this.house,f=this.front,r=this.roof;
    rounded(p,0,.08,0,8.4,.3,7.8,0x655944,.1);
    // Side and back walls; the front is divided around a genuinely open doorway.
    box(p,-4,1.8,0,.22,3.6,7.4,palette.plaster);box(p,4,1.8,0,.22,3.6,7.4,palette.plaster);box(p,0,1.8,-3.7,8,3.6,.2,palette.plaster);
    box(f,-2.43,1.8,3.7,3.14,3.6,.22,palette.plaster);box(f,2.43,1.8,3.7,3.14,3.6,.22,palette.plaster);box(f,0,3.27,3.7,1.72,.65,.22,palette.plaster);
    for(const x of[-4,-.85,.85,4])box(f,x,1.8,3.84,.15,3.6,.16,palette.wood);for(const y of[.23,3.5])box(f,0,y,3.83,8.1,.14,.14,palette.wood);
    // Gable and two sloping roof planes, with individually irregular snow pillows.
    const shape=new T.Shape();shape.moveTo(-4.2,0);shape.lineTo(4.2,0);shape.lineTo(0,2.5);shape.closePath();const gable=new T.ExtrudeGeometry(shape,{depth:7.6,bevelEnabled:false});mesh(r,gable,mat(palette.plaster),0,3.55,-3.8);
    const angle=Math.atan2(2.65,4.6),length=Math.hypot(4.6,2.65);
    for(const sign of[-1,1]){const roof=box(r,sign*2.3,4.86,0,length,.2,8.35,0x934936);roof.rotation.z=-sign*angle;const snow=box(r,sign*2.3,5.02,0,length,.21,8.45,palette.snow);snow.rotation.z=-sign*angle;
      const roofBeam=box(r,sign*2.3,4.79,4.19,length,.19,.2,palette.darkWood);roofBeam.rotation.z=-sign*angle;
      for(let i=0;i<22;i++){const t=i/21,x=sign*t*4.62,y=6.39-t*2.7;ball(r,x,y,4.13,.28,.14,.32,palette.snow);}
      for(let i=0;i<22;i++)ball(r,sign*4.6,3.7,-4.1+i*.39,.26,.14,.35,palette.snow);
      for(let i=0;i<10;i++){const z=-3.5+i*.72;mesh(r,geo('Cone',.04,.18+rand()*.2,5),mat(0xb6d3d4,.2),sign*4.65,3.54,z).rotation.z=Math.PI;}
    }
    box(r,2.6,5.9,-1.3,.74,2,.78,0x9c6e51);box(r,2.6,6.94,-1.3,.97,.2,1.01,0xbcbcaf);box(r,2.6,7.07,-1.3,1.03,.14,1.07,palette.snow);box(r,2.6,7.15,-1.3,.5,.02,.54,0x354344);
    // Painted shutters and warm mullioned windows.
    for(const x of[-2.5,2.5])this.window(f,x,1.85,3.87,1.15,1.5);
    this.window(r,0,4.55,3.86,.8,.95);
    for(const side of[-1,1]){const win=group(p,side*4.13,1.9,-.2);win.rotation.y=side*Math.PI/2;this.window(win,0,0,0,1.4,1.5);}
    const doorFrame=rounded(f,0,1.42,3.9,1.94,2.95,.22,palette.darkWood,.15); // frame ring is made from rails; clear the opening below.
    doorFrame.visible=false;doorFrame.userData.dynamic=true;
    for(const x of[-.91,.91])box(f,x,1.45,3.85,.13,2.9,.26,0x78563b);box(f,0,2.89,3.85,1.95,.15,.27,0x78563b);
    this.door=group(p,-.83,.12,3.83,true);this.door.userData.action='door';this.hitRoots.push(this.door);
    rounded(this.door,.83,1.3,0,1.65,2.64,.14,0x924532,.1);for(let i=0;i<5;i++)box(this.door,.17+i*.32,1.3,.082,.018,2.45,.018,0x74382c);for(const y of[.48,1.2,2.14])rounded(this.door,.83,y,.09,1.28,.45,.035,0xa15139,.04);ball(this.door,1.47,1.1,.17,.075,.075,.075,mat(0xdcb65d,.28,.7));wreath(this.door,.84,1.91,.22,.35);
    this.anchors.door=V(0,1.5,4.1);
    for(let i=0;i<3;i++)rounded(p,0,.06-i*.04,4.1+i*.27,2.4+i*.28,.12,.7,0x9cac9e,.08);
    for(const x of[-1.15,1.15]){const g=group(f,x,2.7,4.0);cylinder(g,0,-.15,0,.08,.16,.2,mat(0xc9a75d,.3,.6));ball(g,0,-.28,0,.045,.045,.045,0x786441);glow(g,0,-.12,.1,.6,0xffd794,.2);}
    lantern(f,1.32,1.88,4.06,.55);
    this.bell=group(f,-1.34,2,4.0,true);this.bell.userData.action='bell';cylinder(this.bell,0,0,0,.07,.16,.21,mat(0xdcb26a,.3,.65));ball(this.bell,0,-.13,0,.05,.05,.05,0x7a502d);this.hitRoots.push(this.bell);
    // A sagging strand of lights follows the eaves.
    const wire=[];for(let i=0;i<=48;i++){const x=-4.5+i/48*9,y=6.19-Math.abs(x)*.57-.12-Math.sin(i/48*Math.PI*4)*.09;wire.push([x,y,4.32]);if(i%2===0){const bulb=ball(f,x,y-.08,4.33,.045,.065,.045,mat(0xffd797,.3,0,0xffb35f,3));if(i%6===0)this.twinkles.push(glow(f,x,y-.08,4.38,.55,0xffba67,.45));}}tube(f,wire,.016,0x7b6746);
    this.smoke=group(this.scene,2.6,7.2,-1.3,true);for(let i=0;i<9;i++){const sprite=new T.Sprite(new T.SpriteMaterial({map:glowMap,color:0xb1cbd0,transparent:true,opacity:.1,depthWrite:false}));sprite.scale.setScalar(.7);sprite.userData.phase=i/9;this.smoke.add(sprite);}
  }
  window(p,x,y,z,w,h){
    rounded(p,x,y,z,w+.18,h+.2,.13,0x715839,.06);box(p,x,y,z+.08,w,h,.05,mat(0xffd18c,.7,0,0xffb859,1.3));for(const s of[-1,1]){box(p,x+s*w*.25,y,z+.13,.045,h,.065,0x735130);box(p,x,y+s*h*.17,z+.13,w,.045,.065,0x735130);const shutter=rounded(p,x+s*(w*.7),y,z-.02,w*.34,h+.13,.1,0x395344,.04);shutter.rotation.y=-s*.2;for(let j=0;j<6;j++)box(p,x+s*(w*.7),y-h*.41+j*h*.16,z+.05,w*.28,.023,.015,0x647456);}
    box(p,x,y-h/2-.13,z+.12,w+1,.14,.3,0x917452);ball(p,x,y-h/2-.04,z+.2,(w+1)*.54,.085,.19,palette.snow);glow(p,x,y,z+.2,w*3,0xffbc6a,.26);
  }
  buildRoom(){
    const p=this.room;
    rounded(p,0,-.05,-.1,8.3,.24,7.8,0x71553b,.06);
    for(let i=0;i<20;i++){const x=-3.85+i*.405;const plank=box(p,x,.08,0,.39,.06,7.4,timber);plank.material=timber;for(let j=0;j<3;j++){box(p,x,.115,-2.8+j*2.8+(i%2)*.5,.38,.005,.015,0x655039);}}
    const leftWall=mesh(p,geo('Plane',7.6,4),mat(0xa98158),-4,2,0);leftWall.rotation.y=Math.PI/2;box(p,0,2,-3.8,8.1,4,.18,0xd2b487);
    for(const x of[-3.9,3.9])box(p,x,2,-3.68,.18,4,.18,0x765239);for(const y of[.32,3.85]){box(p,0,y,-3.66,8,.16,.12,0x78583b);box(p,-3.84,y,0,.15,.16,7.4,0x78583b);}
    // Patterned paper on the back wall, made from geometry rather than an image backdrop.
    for(let row=0;row<8;row++)for(let col=0;col<17;col++){const x=-3.65+col*.46,y=.6+row*.4;if(x<-1.1&&y<3)continue;const flower=ball(p,x,y,-3.686,.018,.045,.009,0xa2845f,6);flower.rotation.z=.4;}
    this.buildFireplace(p);this.buildIndoorTree(p);this.buildFurniture(p);
    // Back window: a view through to the snowy sky, with softly draped curtains.
    rounded(p,.1,2.42,-3.6,1.48,1.8,.12,0x60472f,.07);this.buildWindowView(p);box(p,.1,2.42,-3.43,.065,1.6,.07,0x906f48);box(p,.1,2.42,-3.43,1.3,.065,.07,0x906f48);box(p,.1,1.56,-3.32,1.8,.14,.5,0x8a6943);
    for(const s of[-1,1])for(let i=0;i<5;i++){const m=ball(p,.1+s*(.78+i*.052),2.4,-3.28,.07,.92,.09,i%2?0x8f4031:0xa9583d);m.rotation.z=-s*.04;}
    const frame=group(p,1.3,2.65,-3.55);rounded(frame,0,0,0,1,.85,.08,0xa78751,.06);box(frame,0,0,.05,.83,.68,.02,0xc4b28b);for(let i=0;i<3;i++)mesh(frame,geo('Cone',.17,.4,5),mat(i%2?0x345948:0x55765a),-.25+i*.25,-.05,.08).rotation.x=Math.PI/2;
    this.roomLight=new T.PointLight(0xffca7c,18,12,2);this.roomLight.position.set(0,3.5,.5);this.room.add(this.roomLight);
  }
  buildWindowView(p){
    // A small, animated view behind the real mullions. Everything stays clipped
    // to the glass, with no extra scene render or detailed city geometry.
    const view=group(p,.1,2.42,-3.465,true);
    this.windowMaterial=new T.ShaderMaterial({
      uniforms:{time:{value:0},passing:{value:0},glow:{value:0}},
      vertexShader:`varying vec2 vUv;void main(){vUv=uv;gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.);}`,
      fragmentShader:`varying vec2 vUv;uniform float time;uniform float passing;uniform float glow;
        float hash(vec2 p){return fract(sin(dot(p,vec2(127.1,311.7)))*43758.5453);}
        float snow(vec2 uv,vec2 cells,float speed,float seed){
          vec2 q=uv*cells+vec2(-time*speed*.24,time*speed);
          vec2 cell=floor(q),local=fract(q);
          float h=hash(cell+seed);
          vec2 center=vec2(.2+.6*h,.2+.6*hash(cell+seed+9.));
          center.x+=sin(time*.65+h*6.28)*.09;
          float radius=.045+h*.055;
          return (1.-smoothstep(radius*.25,radius,length(local-center)))*(.4+h*.6);
        }
        void main(){
          vec2 uv=vUv;
          vec3 c=mix(vec3(.085,.16,.2),vec3(.015,.042,.065),smoothstep(0.,1.,uv.y));
          // Hazy roof shapes and just a handful of neighbours' warm windows.
          float column=floor(uv.x*7.);
          float roof=.22+hash(vec2(column,4.))*.2;
          float house=1.-smoothstep(roof-.008,roof+.025,uv.y);
          c=mix(c,vec3(.027,.064,.078),house*.8);
          for(int i=0;i<9;i++){
            float f=float(i),h=hash(vec2(f,8.));
            vec2 center=vec2(.065+f*.11,.13+mod(f,3.)*.055);
            vec2 d=abs(uv-center);
            float pane=(1.-smoothstep(.009,.022,d.x))*(1.-smoothstep(.015,.031,d.y));
            float lit=.18+.68*smoothstep(-.35,.35,sin(time*(.055+h*.025)+f*2.4));
            float halo=exp(-dot((uv-center)*vec2(14.,12.),(uv-center)*vec2(14.,12.)));
            c+=vec3(.85,.43,.14)*lit*(pane*.58+halo*.055);
          }
          // A passing light, softened by falling snow and cold glass.
          vec2 light=vec2(mix(-.2,1.2,passing),.115);
          vec2 d=(uv-light)*vec2(4.,6.);
          c+=vec3(.7,.48,.24)*exp(-dot(d,d))*glow*.45;
          for(int i=0;i<2;i++){
            vec2 head=(uv-light-vec2(float(i)*.06,0.))*vec2(42.,55.);
            c+=vec3(.95,.76,.43)*exp(-dot(head,head))*glow*.7;
          }
          float flakes=snow(uv,vec2(8.,10.),.48,3.)*.37+snow(uv,vec2(4.,5.),.62,19.)*.65;
          c+=vec3(.64,.79,.85)*flakes;
          // Slightly misted edges keep the view soft and tucked into the frame.
          float edge=1.-smoothstep(0.,.09,min(min(uv.x,1.-uv.x),min(uv.y,1.-uv.y)));
          c=mix(c,vec3(.12,.2,.23),edge*.24);
          gl_FragColor=vec4(c,1.);
        }`});
    const glass=mesh(view,new T.PlaneGeometry(1.22,1.52),this.windowMaterial);
    glass.castShadow=false;glass.receiveShadow=false;
    this.windowLight=new T.PointLight(0xffd5a0,0,3.5,2);
    this.windowLight.position.set(.1,2,-3.1);p.add(this.windowLight);
  }
  updateWindow(time){
    const progress=clamp(((time+23)%29)/7,0,1);
    const glow=Math.pow(Math.sin(progress*Math.PI),2);
    this.windowMaterial.uniforms.time.value=time;
    this.windowMaterial.uniforms.passing.value=progress;
    this.windowMaterial.uniforms.glow.value=glow;
    this.windowLight.intensity=glow*4;
    this.windowLight.position.x=.1+(progress-.5);
  }
  buildFireplace(p){
    const g=group(p,-2.55,0,-3.18);
    rounded(g,0,.16,.2,2.45,.25,1.25,0x81664b,.07);box(g,0,1.45,-.25,2.05,2.7,.5,0xb2805b);
    rounded(g,0,1.07,.045,1.65,1.65,.08,0x342b26,.13);
    for(const s of[-1,1])for(let i=0;i<6;i++)rounded(g,s*.88,.35+i*.3,.15,.38,.27,.44,(i+(s>0?1:0))%2?0xa16d4b:0xb58359,.025);
    for(let i=0;i<7;i++){const a=i/6*Math.PI,m=rounded(g,Math.cos(a)*.78,1.52+Math.sin(a)*.46,.15,.35,.3,.47,i%2?0xa77350:0xc49669,.025);m.rotation.z=a-Math.PI/2;}
    rounded(g,0,2.23,.13,2.5,.2,.95,0x60422b,.065);
    for(let row=0;row<4;row++)for(let col=0;col<5;col++)box(g,-.86+col*.42+(row%2)*.07,2.5+row*.3,-.16,.39,.27,.18,(row+col)%2?0xbb936a:0xc8a176);
    for(let i=0;i<3;i++){const log=cylinder(g,-.3+i*.3,.37,.38,.14,.14,.92,0x60422b,9);log.rotation.z=Math.PI/2;log.rotation.y=(i-1)*.35;}
    const flameMat=mat(0xffa747,.55,0,0xffa142,1.8);
    // Keep the live fire out of static batching: rising tongues change silhouette,
    // while the small ember cloud stays within the chimney opening.
    this.flameMaterial=new T.ShaderMaterial({transparent:true,depthWrite:false,side:T.DoubleSide,
      uniforms:{time:{value:0}},
      vertexShader:`varying vec2 vUv;void main(){vUv=uv;gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.);}`,
      fragmentShader:`varying vec2 vUv;uniform float time;
        void main(){
          float x=(vUv.x-.5)*2., y=vUv.y;
          float sway=sin(y*8.-time*4.1)*.07*y+sin(y*17.-time*6.3)*.035*y;
          float tongues=0.;
          for(int i=0;i<5;i++){
            float f=float(i),center=(f-2.)*.29+sway;
            float height=.52+.22*sin(f*2.7+time*2.9)+.12*sin(time*5.3+f);
            float width=.19*(1.-y*.85);
            float tongue=(1.-smoothstep(width*.35,width,abs(x-center)))*(1.-smoothstep(height-.2,height,y));
            tongues=max(tongues,tongue);
          }
          float base=(1.-smoothstep(.48,.84,abs(x)))*(1.-smoothstep(.05,.35,y));
          float fire=max(tongues,base)*smoothstep(0.,.07,y);
          float core=(1.-smoothstep(.12,.5,y))*(1.-smoothstep(.2,.7,abs(x)));
          vec3 color=mix(vec3(1.,.12,.008),vec3(1.,.56,.055),fire);
          color=mix(color,vec3(1.,.83,.3),core*.85);
          gl_FragColor=vec4(color*1.5,fire*.96);
        }`});
    const liveFire=group(g,0,.99,.43,true);
    const flame=mesh(liveFire,new T.PlaneGeometry(1.5,1.38),this.flameMaterial);
    flame.castShadow=false;flame.receiveShadow=false;
    this.embers=group(g,0,.4,.47,true);
    for(let i=0;i<12;i++){const ember=glow(this.embers,0,0,0,.045,0xff8b36,.65);ember.userData.phase=i/12;ember.userData.drift=rand()*2-1;}
    this.fireGlow=glow(g,0,.7,.5,2.5,0xff923d,.32);
    for(let i=0;i<3;i++){const stocking=group(g,-.75+i*.7,1.98,.64);stocking.rotation.z=(i-1)*.1;rounded(stocking,0,-.2,0,.21,.48,.09,i===1?0x426448:0x9e4431,.07);rounded(stocking,.09,-.43,.015,.34,.18,.12,i===1?0x426448:0x9e4431,.07);box(stocking,0,.03,.01,.24,.12,.14,0xe2d2ac);ball(stocking,0,-.19,.065,.05,.05,.012,0xe1bc7d);}
    wreath(g,0,3.06,.17,.36);
    for(let i=0;i<17;i++){const x=-1.13+i*.14;ball(g,x,2.41,.37,.16,.09,.14,i%2?0x355e3e:0x486342);if(i%3===0)ball(g,x,2.43,.46,.035,.035,.035,0xc27640);}
    for(const x of[-.9,.87]){cylinder(g,x,2.62,.03,.075,.075,.4,0xebd7a7);const flame=ball(g,x,2.88,.03,.045,.09,.045,flameMat);flame.userData.dynamic=true;flame.userData.height=.09;flame.userData.phase=x;this.fireParts.push(flame);glow(g,x,2.85,.03,.55,0xffce83,.4);}
  }
  buildIndoorTree(p){
    this.tree=group(p,2.5,.13,-1.7,true);
    const g=this.tree;cylinder(g,0,.23,0,.19,.25,.45,palette.wood);cylinder(g,0,.15,0,.58,.48,.23,0x786a49,16);
    for(let layer=0;layer<7;layer++){const y=.75+layer*.43,r=1.23-layer*.15;const core=mesh(g,geo('Cone',r,.99,11),mat(layer%2?0x2f5841:0x254b35),0,y,0);core.rotation.y=layer*.7;for(let j=0;j<9;j++){const a=j/9*Math.PI*2+layer*.5;const branch=ball(g,Math.cos(a)*r*.67,y-.25,Math.sin(a)*r*.67,r*.48,.17,r*.27,layer%2?0x355b42:0x31573c);branch.rotation.y=-a;branch.rotation.z=.1;}}
    const wire=[];for(let i=0;i<150;i++){const f=i/149,y=.7+f*2.98,r=1.14-f*.96,a=f*Math.PI*2*4.4;const x=Math.sin(a)*r,z=Math.cos(a)*r;wire.push([x,y,z]);if(i%3===0){ball(g,x,y,z,.035,.038,.035,mat(0xffd895,.35,0,0xffbd69,1.8),7);if(i%12===0)this.twinkles.push(glow(g,x,y,z,.44,0xffca77,.5));}if(i%11===0&&i>5){ball(g,x,y-.06,z,.075,.09,.075,mat(i%2?0xb6523a:0xc29b55,.35,.5));}}
    tube(g,wire,.012,0x9a8552);
    const starShape=new T.Shape();for(let i=0;i<10;i++){const a=i/10*Math.PI*2+Math.PI/2,r=i%2?.12:.28;const x=Math.cos(a)*r,y=Math.sin(a)*r;i?starShape.lineTo(x,y):starShape.moveTo(x,y);}starShape.closePath();mesh(g,new T.ExtrudeGeometry(starShape,{depth:.07,bevelEnabled:true,bevelSize:.025,bevelThickness:.025,bevelSegments:1,steps:1}),mat(0xedbe66,.35,.5,0xffc96c,.8),0,3.9,0);glow(g,0,3.9,.1,1.5,0xffd890,.35);
    batchStatic(g);
    for(const [x,z,w,c]of[[-.8,.7,.57,0xa74735],[.5,.75,.48,0xd3ba83],[-.2,1.1,.4,0x49694b],[.8,.5,.38,0xaf6946]])gift(p,2.5+x,.15,-1.7+z,w,c);
    this.anchors.tree=V(2.5,2,-1.05);
    const proxy=mesh(g,geo('Cone',1.35,3.8,8),new T.MeshBasicMaterial({visible:false}),0,1.9,0);proxy.userData.action='tree';proxy.userData.dynamic=true;this.hitRoots.push(proxy);
    this.baubleRoot=group(g,0,0,0,true);this.baubles=[];
    this.setBaubles(7);
  }
  setBaubles(count,taken=[],colors=[]){
    if(!this.baubleRoot)return;
    for(const b of this.baubles){this.hitRoots=this.hitRoots.filter(m=>m!==b.group);}
    this.baubleRoot.traverse(o=>{if(o.geometry?.userData.merged)o.geometry.dispose();if(o.isSprite)o.material.dispose();});this.baubleRoot.clear();this.baubles=[];this.ornamentPage=0;this.ornamentPages=count>10?Math.ceil(count/6):1;this.tree.rotation.y=0;
    // Cosmetic colors are passed separately from the fixed, hidden name mapping.
    const finishes=[0xb52e46,0x8650be,0x2884c5,0xe0b86c];
    const rows=count>10?Math.ceil(count/4):3;
    for(let i=0;i<count;i++){
      let x,y,z;
      if(count<=10){const positions=[[-.27,3,.48],[.28,2.72,.59],[-.57,2.18,.72],[.16,2.12,.86],[.66,1.65,.84],[-.6,1.23,.95],[.08,.92,1.13],[.6,.73,1.1],[-.65,.7,.98]];[x,y,z]=positions[i];}
      else{const positions=[[-.27,3,.48],[.28,2.65,.62],[-.57,2.06,.8],[.26,1.92,.91],[-.58,1.22,1],[.26,.85,1.17]];[x,y,z]=positions[i%6];const a=Math.floor(i/6)/this.ornamentPages*Math.PI*2;const originalX=x;x=x*Math.cos(a)+z*Math.sin(a);z=z*Math.cos(a)-originalX*Math.sin(a);}
      const color=finishes[colors[i]??i%4];const g=group(this.baubleRoot,x,y,z,true);g.userData.action='bauble';g.userData.index=i;g.userData.page=count>10?Math.floor(i/6):0;const body=ball(g,0,0,0,.135,.15,.135,mat(color,.22,.45,color,.24),16);cylinder(g,0,.164,0,.035,.039,.042,0xc7a56a,8);const loop=mesh(g,geo('Torus',.025,.007,4,9),mat(0xc7a56a),0,.203,0);
      for(let a=0;a<6;a++){const spoke=box(g,0,0,.133,.011,.105,.008,0xf7e6bc);spoke.rotation.z=a/6*Math.PI;}
      const aura=glow(g,0,0,.015,.85,color,.38);g.userData.taken=taken.includes(i);g.visible=g.userData.page===0;if(g.userData.taken){body.material=mat(0x6e725d,.8,.2);aura.visible=false;g.scale.setScalar(.65);}batchStatic(g);this.baubles.push({group:g,body,aura,index:i,homeY:y,color:colors[i]??i%4});this.hitRoots.push(g);
    }
  }
  async turnOrnaments(direction){if(this.transitioning)return;this.transitioning=true;const from=this.tree.rotation.y;this.ornamentPage=(this.ornamentPage+direction+this.ornamentPages)%this.ornamentPages;const to=from-direction*Math.PI*2/this.ornamentPages;this.baubles.forEach(b=>{b.group.visible=b.group.userData.page===this.ornamentPage;});await this.animate(900,t=>{this.tree.rotation.y=T.MathUtils.lerp(from,to,ease(t));});this.transitioning=false;}
  buildFurniture(p){
    // Woven rug, turned slightly off-square; a lived-in room rather than a showroom.
    const rug=group(p,-.25,.13,.8);rug.rotation.y=.09;
    for(let i=0;i<5;i++){const colors=[0x9e4d3b,0xc8a16e,0x4b6350,0xb56b47,0xc9af7e];const m=cylinder(rug,0,.005*i,0,1.8-i*.16,1.8-i*.16,.012,colors[i],48);m.scale.set(1.35,1,.88);}
    for(let i=0;i<25;i++)for(const s of[-1,1])box(rug,-2+i*.167,.025,s*1.35,.025,.012,.2,0xc7b184);
    // Upholstered wingback chair, thick seat cushions and little wooden feet.
    const chair=this.sofa=group(p,-2.35,.13,.4);chair.rotation.y=.35;
    for(const x of[-.49,.49])for(const z of[-.42,.42])cylinder(chair,x,.2,z,.06,.045,.4,0x68513a,8);
    rounded(chair,0,.64,0,1.33,.45,1.15,0x5b7453,.2);rounded(chair,0,1.31,-.48,1.25,1.45,.35,0x496444,.22).rotation.x=-.09;
    for(const x of[-.65,.65]){rounded(chair,x,.95,.04,.25,.48,1.3,0x66815a,.12);ball(chair,x,1.36,-.42,.14,.36,.22,0x57754d);}
    rounded(chair,0,.89,.09,1.05,.18,.87,0x7a8c62,.12);const cushion=rounded(chair,.24,1.37,-.24,.51,.51,.2,0xc39860,.12);cushion.rotation.z=.18;cushion.rotation.x=.15;for(let i=0;i<3;i++)box(chair,.24,1.2+i*.14,-.125,.37,.018,.015,0x8a4b35);
    batchStatic(chair);chair.userData.action='sofa';this.hitRoots.push(chair);
    chair.updateWorldMatrix(true,false);this.anchors.sofa=chair.localToWorld(V(0,.4,.75));
    // A coffee table, steaming tea, scattered biscuits and a book.
    const table=group(p,-.15,.13,1.2);cylinder(table,0,.77,0,1.03,1.03,.13,timber,32).scale.z=.73;for(const x of[-.62,.62])for(const z of[-.4,.4])box(table,x,.37,z,.085,.74,.085,0x6c4c30);
    const mug=group(table,.4,.85,.07);cylinder(mug,0,.14,0,.12,.1,.27,0xe1cea5,16);cylinder(mug,0,.285,0,.095,.095,.005,0x66452e,16);const handle=mesh(mug,geo('Torus',.08,.022,6,14),mat(0xdfc89a),.13,.15,0);handle.rotation.y=Math.PI/2;for(let i=0;i<3;i++)ball(mug,0,.12+i*.06,.103,.025,.013,.005,0x8e4630,6);
    this.teaSteam=group(table,.4,1.12,.07,true);for(let i=0;i<4;i++){const s=glow(this.teaSteam,0,0,0,.3,0xd7dbca,.07);s.userData.phase=i/4;}
    cylinder(table,-.44,.86,.09,.28,.3,.035,0xb89a64,20);
    this.cookieRoot=group(table,-.44,.885,.09,true);this.cookies=[];this.cookieBusy=false;
    for(let i=0;i<3;i++){
      const a=i*2.1,cookie=group(this.cookieRoot,Math.cos(a)*.12,.02,Math.sin(a)*.12,true);
      cookie.userData.action='cookie';cookie.userData.index=i;cookie.userData.eaten=false;
      ball(cookie,0,0,0,.085,.026,.085,0xbd8a51);
      for(let j=0;j<5;j++){const angle=j*2.4;ball(cookie,Math.cos(angle)*.047,.023,Math.sin(angle)*.047,.009,.006,.009,0x65432d,6);}
      batchStatic(cookie);this.cookies.push(cookie);this.hitRoots.push(cookie);
    }
    const plateHit=cylinder(this.cookieRoot,0,0,0,.3,.3,.02,new T.MeshBasicMaterial({visible:false}),16);
    plateHit.userData.action='cookie';this.hitRoots.push(plateHit);
    this.cookieCrumbs=group(this.cookieRoot,0,0,0,true);this.cookieCrumbs.visible=false;
    for(let i=0;i<7;i++)ball(this.cookieCrumbs,0,0,0,.008,.006,.008,0xb78043,6);
    table.updateWorldMatrix(true,false);this.anchors.cookies=table.localToWorld(V(-.44,1.45,.1));
    const book=rounded(table,-.12,.91,-.3,.38,.075,.48,0x954a3a,.02);book.rotation.y=-.3;box(table,-.12,.957,-.3,.26,.005,.36,0xd9c49a).rotation.y=-.3;
    // A writing desk is a real destination, with a drawer, lamp, paper and pencil.
    this.desk=group(p,2,.13,2.1,true);const d=this.desk;
    rounded(d,0,1.14,0,2.15,.15,.95,timber,.06);for(const x of[-.88,.88])for(const z of[-.34,.34])box(d,x,.55,z,.1,1.1,.1,0x6b4c31);rounded(d,0,.91,.04,1.82,.32,.71,0x8f6b45,.035);ball(d,0,.94,.42,.055,.035,.04,mat(0xc3a360,.3,.7));
    for(let i=0;i<3;i++){const page=box(d,.06,1.24+i*.008,.02,.7,.008,.57,0xf0dfb5);page.rotation.y=-.08+i*.08;}const pencil=box(d,.57,1.25,.06,.025,.025,.5,0xa54d37);pencil.rotation.y=.28;
    cylinder(d,-.49,1.23,0,.17,.17,.08,0xa88347,20);cylinder(d,-.49,1.52,0,.025,.025,.55,mat(0xbb9657,.4,.65),8);
    this.deskLampShade=mat(0xbfa178,.85,0,0xddac64,0).clone();
    const lamp=group(d,-.49,0,0,true);
    mesh(lamp,geo('Cone',.23,.34,16,1,true),this.deskLampShade,0,1.91,0);
    this.deskLampBulb=mat(0xf1d8a3,.5,0,0xffcf83,0).clone();
    ball(lamp,0,1.79,0,.06,.085,.06,this.deskLampBulb);
    this.deskLampGlow=glow(lamp,0,1.76,0,.95,0xffd29a,0);
    this.deskLampLight=new T.PointLight(0xffc77d,0,2.8,2);
    this.deskLampLight.position.set(0,1.7,.025);lamp.add(this.deskLampLight);
    this.deskLampPoolMaterial=new T.MeshBasicMaterial({map:glowMap,color:0xffc77d,transparent:true,opacity:0,depthWrite:false,blending:T.AdditiveBlending});
    const pool=mesh(lamp,new T.PlaneGeometry(1.05,.78),this.deskLampPoolMaterial,.12,1.224,.1);
    pool.rotation.x=-Math.PI/2;pool.castShadow=false;pool.receiveShadow=false;
    this.deskLampOn=false;this.deskLampLevel=0;
    const deskProxy=box(d,0,1.1,0,2.2,.5,1,new T.MeshBasicMaterial({visible:false}));deskProxy.userData.action='desk';this.hitRoots.push(deskProxy);this.anchors.desk=V(2,1.9,2.45);batchStatic(d);
    const writingChair=group(p,2,.13,3.2);
    for(const x of[-.32,.32])for(const z of[-.3,.3])box(writingChair,x,.34,z,.065,.68,.065,0x654b34);
    rounded(writingChair,0,.72,0,.79,.12,.76,0x826342,.055);
    rounded(writingChair,0,.81,-.025,.69,.12,.63,0x9e4d3b,.055);
    for(const x of[-.32,.32])box(writingChair,x,1.04,.31,.065,.77,.065,0x654b34);
    rounded(writingChair,0,1.35,.31,.83,.3,.085,0x826342,.04);
    for(const x of[-.16,0,.16])box(writingChair,x,1.1,.31,.045,.38,.045,0x826342);
    // Family letters pinned to a notice board: the browse destination.
    this.letters=group(p,-3.82,2.02,1.7,true);this.letters.rotation.y=Math.PI/2;
    rounded(this.letters,0,0,0,2.15,2.65,.12,0x745435,.06);box(this.letters,0,0,.075,1.96,2.45,.035,0xae8b58);
    const lettersProxy=box(this.letters,0,0,.1,2.15,2.65,.1,new T.MeshBasicMaterial({visible:false}));lettersProxy.userData.action='letters';this.hitRoots.push(lettersProxy);
    this.anchors.letters=V(-3.65,3.55,1.7);batchStatic(this.letters);
    this.stack=group(this.room,-2.5,1.42,2.8,true);this.stack.visible=false;
    for(let i=0;i<5;i++){const sheet=box(this.stack,(i%2?1:-1)*i*.016,-i*.012,-i*.018,2.15,2.95,.012,i===0?0xf7e9cb:0xdccaa5);sheet.rotation.z=(i-2)*.009;}
    this.stackWidth=2.15;this.stackHeight=2.95;
    const letter=group(p,-2.55,2.72,-2.62,true);letter.userData.action='recipient';
    rounded(letter,0,0,0,.66,.41,.035,0xf4ddb2,.02);tube(letter,[[-.3,.17,.025],[0,-.04,.035],[.3,.17,.025]],.009,0xb39161);
    ball(letter,0,-.035,.058,.055,.055,.018,0xa54231);this.hitRoots.push(letter);this.anchors.recipient=V(-2.55,3.35,-2.5);
    lantern(p,3.4,.12,2.8,.55);
  }
  buildCat(){
    const g=this.cat=group(this.scene,-1.25,.18,1.7,true);this.catHome=g.position.clone();const orange=mat(0xce8b4d),dark=mat(0x96532e),cream=mat(0xefd5a3);
    this.catBody=ball(g,0,.24,0,.35,.25,.54,orange,16);this.catHead=group(g,0,.46,.38,true);const head=this.catHead;this.catEyes=[];this.catResting=false;
    ball(head,0,0,0,.24,.22,.22,orange,16);for(const s of[-1,1]){const ear=mesh(head,geo('Cone',.105,.25,4),orange,s*.16,.2,0);ear.rotation.z=-s*.2;mesh(head,geo('Cone',.06,.15,4),mat(0xd3a382),s*.16,.2,.04).rotation.z=-s*.2;ball(head,s*.083,-.057,.185,.093,.072,.056,cream);const eye=group(head,s*.102,.04,.182,true);ball(eye,0,0,0,.045,.062,.027,mat(0x3a4b37),12);ball(eye,s*.001,0,.023,.014,.045,.01,0x1b2722);ball(eye,s*(-.002)+.008,.02,.033,.009,.013,.007,0xf8e9c7,8);this.catEyes.push(eye);for(let j=0;j<3;j++)tube(head,[[s*.12,-.047-j*.02,.21],[s*.29,-.045+(j-1)*.043,.23]],.004,0x594434);}
    ball(head,0,-.028,.235,.032,.025,.019,0xa57560,8);for(let i=0;i<3;i++){const stripe=ball(head,(i-1)*.075,.156,.14,.024,.067,.012,dark);stripe.rotation.z=(i-1)*-.15;}
    this.catLegs=[];for(const x of[-.22,.22])for(const z of[-.33,.3]){const leg=group(g,x,.18,z,true);ball(leg,0,-.07,0,.085,.17,.095,orange);ball(leg,0,-.16,.04,.094,.06,.13,cream);this.catLegs.push(leg);}
    this.catTail=group(g,0,.22,-.45,true);tube(this.catTail,[[0,0,0],[.18,.1,-.15],[.38,.21,-.17],[.48,.35,-.05],[.42,.45,.04]],.064,orange);for(let i=0;i<4;i++){const stripe=ball(g,0,.45-i*.022,-.29+i*.14,.3,.03,.048,dark);stripe.rotation.x=.1;}
    this.catBody.userData.dynamic=true;batchStatic(this.catHead);batchStatic(this.cat);this.cat.userData.action='cat';this.hitRoots.push(this.cat);this.anchors.cat=g.position.clone().add(V(0,.6,0));this.cat.rotation.y=-.45;this.cat.scale.setScalar(1.15);
  }
  buildParticles(){
    const count=this.mobile?420:850,positions=new Float32Array(count*3),sizes=new Float32Array(count),phases=new Float32Array(count);
    for(let i=0;i<count;i++){positions[i*3]=(rand()-.5)*35;positions[i*3+1]=rand()*19;positions[i*3+2]=(rand()-.5)*32;sizes[i]=.5+rand();phases[i]=rand()*6.28;}
    const g=new T.BufferGeometry();g.setAttribute('position',new T.BufferAttribute(positions,3));g.setAttribute('aSize',new T.BufferAttribute(sizes,1));g.setAttribute('aPhase',new T.BufferAttribute(phases,1));
    this.snowMaterial=new T.ShaderMaterial({uniforms:{time:{value:0},ratio:{value:Math.min(devicePixelRatio,1.5)},inside:{value:0}},vertexShader:`attribute float aSize;attribute float aPhase;uniform float time;uniform float ratio;uniform float inside;varying float vAlpha;void main(){vec3 p=position;p.y=mod(position.y-time*(.35+aSize*.25),19.);p.x+=sin(time*.28+aPhase+p.y*.2)*.5;p.z+=cos(time*.2+aPhase)*.25;vec4 mv=modelViewMatrix*vec4(p,1.);gl_Position=projectionMatrix*mv;gl_PointSize=clamp(aSize*60.*ratio/max(1.,-mv.z),1.,7.);vAlpha=(.35+aSize*.25)*(1.-inside*step(abs(p.x),4.5)*step(abs(p.z),4.5));}`,fragmentShader:`varying float vAlpha;void main(){float d=length(gl_PointCoord-.5);float a=(1.-smoothstep(.12,.5,d))*vAlpha;gl_FragColor=vec4(.86,.94,.92,a);}`,transparent:true,depthWrite:false});
    this.snow=new T.Points(g,this.snowMaterial);this.scene.add(this.snow);
    this.burstGeo=new T.BufferGeometry();this.burstPos=new Float32Array(65*3);this.burstVel=[];for(let i=0;i<65;i++)this.burstVel.push(V((rand()-.5)*3,rand()*2,(rand()-.5)*3));this.burstGeo.setAttribute('position',new T.BufferAttribute(this.burstPos,3));this.burst=new T.Points(this.burstGeo,new T.PointsMaterial({color:0xffd993,size:.045,transparent:true,depthWrite:false,blending:T.AdditiveBlending}));this.burst.visible=false;this.scene.add(this.burst);
  }
  buildEasterEggs(){
    // These visitors are scenery only: no hit targets, new textures, or timers.
    const snowman=this.snowman=group(this.scene,0,0,7,true);
    ball(snowman,0,.57,0,.5,.56,.46,0xe1efeb);ball(snowman,0,1.2,0,.36,.38,.34,0xe1efeb);ball(snowman,0,1.72,0,.27,.28,.26,0xe1efeb);
    for(const x of[-.09,.09])ball(snowman,x,1.79,.23,.028,.032,.025,0x293b3a,8);
    const nose=mesh(snowman,geo('Cone',.055,.27,8),mat(0xcf7a39),0,1.71,.32);nose.rotation.x=Math.PI/2;
    for(let i=0;i<3;i++)ball(snowman,0,.96+i*.18,.335,.03,.03,.022,0x35423a,8);
    cylinder(snowman,0,1.96,0,.36,.36,.06,0x293e3c);cylinder(snowman,0,2.12,0,.22,.24,.29,0x293e3c);cylinder(snowman,0,2.02,0,.245,.245,.06,0xa4493a);
    cylinder(snowman,0,1.47,0,.29,.3,.12,0xa4493a);box(snowman,.14,1.22,.34,.14,.5,.055,0xa4493a).rotation.z=.12;
    this.snowArms=[];this.snowFeet=[];
    for(const sign of[-1,1]){const arm=group(snowman,sign*.32,1.25,0,true);tube(arm,[[0,0,0],[sign*.34,.12,0],[sign*.5,.32,.04]],.026,0x725138);tube(arm,[[sign*.35,.13,0],[sign*.55,.13,0]],.018,0x725138);this.snowArms.push(arm);this.snowFeet.push(ball(snowman,sign*.24,.12,.12,.2,.13,.29,0x52676a));this.snowFeet.at(-1).userData.dynamic=true;}
    batchStatic(snowman);
    this.flyingSnow=group(this.scene,0,0,0,true);
    for(let i=0;i<2;i++)ball(this.flyingSnow,0,0,0,.18,.18,.18,0xdceeed);
    const sleigh=this.sleigh=group(this.scene,0,12,-20,true);
    rounded(sleigh,0,0,0,1.6,.35,.7,0x973c31,.08);box(sleigh,.65,.4,0,.15,.8,.72,0x973c31);
    for(const z of[-.34,.34])tube(sleigh,[[-1,-.4,z],[.7,-.4,z],[1,-.1,z]],.045,0xccab68);
    ball(sleigh,.1,.55,0,.32,.45,.3,0xb34c39);ball(sleigh,.08,1.03,.06,.2,.21,.2,0xe6cda5);ball(sleigh,-.06,.96,.12,.18,.18,.18,0xede0c4);mesh(sleigh,geo('Cone',.22,.45,10),mat(0xb34c39),.13,1.34,0).rotation.z=-.3;ball(sleigh,.21,1.56,0,.07,.07,.07,0xf1e5cc);
    for(const x of[-2,-3.5]){ball(sleigh,x,.35,0,.45,.23,.2,0x79583e);ball(sleigh,x-.36,.64,0,.16,.26,.15,0x79583e);for(const sign of[-1,1]){tube(sleigh,[[x-.36,.8,sign*.09],[x-.4,1.2,sign*.16],[x-.65,1.35,sign*.18]],.024,0xb7986b);for(const dx of[-.23,.23])box(sleigh,x+dx,.03,sign*.14,.045,.6,.045,0x79583e);}tube(sleigh,[[x+.4,.3,0],[x+1.5,.12,0]],.012,0xd2b57a);}
    glow(sleigh,-4.04,.66,.04,.35,0xff6747,.9);
    batchStatic(sleigh);
    // Keep the distant silhouette legible in the night sky, without shadows on the room.
    sleigh.children.forEach(child=>child.position.x+=1.5);
    const lit=new Map();sleigh.traverse(m=>{
      if(!m.isMesh)return;m.castShadow=false;m.receiveShadow=false;
      if(!lit.has(m.material)){const material=m.material.clone();material.fog=false;material.emissive.copy(material.color);material.emissiveIntensity=.35;lit.set(m.material,material);}
      m.material=lit.get(m.material);
    });
    const star=this.shootingStar=group(this.scene,0,0,0,true);
    this.starTrailMaterial=new T.ShaderMaterial({transparent:true,depthWrite:false,blending:T.AdditiveBlending,
      uniforms:{opacity:{value:0}},vertexShader:`varying vec2 vUv;void main(){vUv=uv;gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.);}`,
      fragmentShader:`varying vec2 vUv;uniform float opacity;void main(){float edge=exp(-pow((vUv.y-.5)*7.,2.));float tail=pow(vUv.x,1.7);gl_FragColor=vec4(1.,.83,.48,edge*tail*opacity);}`});
    const trail=mesh(star,new T.PlaneGeometry(150,13),this.starTrailMaterial,-75,0,0);trail.castShadow=false;trail.receiveShadow=false;
    this.starHalo=glow(star,0,0,.02,30,0xffe8aa,1);this.starHalo.material.fog=false;
    this.starCore=glow(star,0,0,.03,14,0xffffff,1);this.starCore.material.fog=false;
    this.starPoint=ball(star,0,0,.05,2.2,2.2,.3,new T.MeshBasicMaterial({color:0xfff9de,transparent:true,depthWrite:false,fog:false}),8);
    this.starPoint.castShadow=false;this.starPoint.receiveShadow=false;
    this.starSparkles=[];
    for(let i=0;i<7;i++){const spark=glow(star,-12-i*17,Math.sin(i*2.4)*5,.01,5,0xffdf91,.7);spark.material.fog=false;this.starSparkles.push(spark);}
    this.updateEasterEggs(0);
  }
  updateEasterEggs(time){
    const walk=(time+50)%64,walkActive=walk<18;
    this.snowman.visible=walkActive||this.reduced;
    if(this.reduced)this.snowman.position.set(-7,0,this.room.visible?-9:6.5);
    else{this.snowman.position.set(-12+24*(walk/18),Math.abs(Math.sin(time*4))*.065,this.room.visible?-10:6.7);this.snowman.rotation.y=Math.PI/2;this.snowman.rotation.z=Math.sin(time*4)*.04;this.snowArms.forEach((a,i)=>a.rotation.x=Math.sin(time*4+i*Math.PI)*.3);this.snowFeet.forEach((f,i)=>f.position.z=.12+Math.sin(time*4+i*Math.PI)*.13);}
    const fight=(time+45)%71;this.flyingSnow.visible=!this.reduced&&fight<7;
    this.flyingSnow.children.forEach((b,i)=>{const t=clamp((fight-i*.9)/5,0,1),from=i?13:-14,to=i?-14:13;b.visible=t>0&&t<1;b.position.set(T.MathUtils.lerp(from,to,t),1.7+Math.sin(t*Math.PI)*7,T.MathUtils.lerp(i?-17:-13,i?-13:-17,t));});
    // Faraway paths are composed in the visible sky for each camera, so orbiting
    // the miniature room cannot hide an entire pass behind its back wall.
    const openSky=['outside','room'].includes(this.stage)&&!this.transitioning;
    const lane=this.mobile?innerHeight*(this.stage==='room'?.23:.30):(this.stage==='room'?85:Math.max(115,innerHeight*.15));
    const depth=20,units=2*depth*Math.tan(this.camera.fov*Math.PI/360)/innerHeight;
    this.camera.updateMatrixWorld();
    const fly=(time+46)%52,flight=fly/14;
    this.sleigh.visible=openSky&&!this.reduced&&fly<14;
    this.sleigh.position.copy(this.skyPosition(1.2-1.4*flight,lane+(this.mobile?24:-5)+Math.sin(flight*Math.PI*2)*5,depth));
    this.sleigh.quaternion.copy(this.camera.quaternion);this.sleigh.rotateZ(Math.sin(flight*Math.PI*2)*.025);
    this.sleigh.scale.setScalar(units*Math.min(190,innerWidth*.29)/5.2);
    const shooting=(time+25)%28,pass=shooting/3.6;
    this.shootingStar.visible=openSky&&!this.reduced&&shooting<3.6;
    this.shootingStar.position.copy(this.skyPosition(-.15+1.4*pass,lane-18+36*pass,depth-1));
    this.shootingStar.quaternion.copy(this.camera.quaternion);this.shootingStar.rotateZ(-Math.atan2(36,innerWidth*1.4));
    this.shootingStar.scale.setScalar(units*(this.mobile?.8:1));
    const fade=T.MathUtils.smoothstep(pass,0,.12)*(1-T.MathUtils.smoothstep(pass,.88,1));
    this.starTrailMaterial.uniforms.opacity.value=fade*.9;
    this.starHalo.material.opacity=fade*.9;this.starCore.material.opacity=fade;this.starPoint.material.opacity=fade;
    this.starSparkles.forEach((spark,i)=>{spark.material.opacity=fade*(.3+.25*Math.sin(time*7+i*2));});
  }
  skyPosition(x,y,depth){
    const height=2*depth*Math.tan(this.camera.fov*Math.PI/360);
    return V((x-.5)*height*this.camera.aspect,(.5-y/innerHeight)*height,-depth).applyMatrix4(this.camera.matrixWorld);
  }
  buildPost(){
    // One render target and one composite: warm light bleed, lens vignette, very subtle grain.
    this.renderTarget=new T.WebGLRenderTarget(1,1,{depthBuffer:true,type:T.HalfFloatType});this.postScene=new T.Scene();this.postCamera=new T.OrthographicCamera(-1,1,1,-1,0,1);
    this.postMaterial=new T.ShaderMaterial({uniforms:{frame:{value:this.renderTarget.texture},resolution:{value:new T.Vector2(innerWidth,innerHeight)},time:{value:0}},vertexShader:`varying vec2 vUv;void main(){vUv=uv;gl_Position=vec4(position.xy,0.,1.);}`,fragmentShader:`uniform sampler2D frame;uniform vec2 resolution;uniform float time;varying vec2 vUv;float lum(vec3 c){return dot(c,vec3(.2126,.7152,.0722));}void main(){vec3 c=texture2D(frame,vUv).rgb;vec3 bloom=vec3(0.);vec2 px=1./resolution;for(int i=0;i<8;i++){float a=float(i)*.785398;vec2 d=vec2(cos(a),sin(a));vec3 s=texture2D(frame,vUv+d*px*5.).rgb;vec3 s2=texture2D(frame,vUv+d*px*13.).rgb;bloom+=s*max(lum(s)-.72,0.)*.1+s2*max(lum(s2)-.78,0.)*.06;}c+=bloom*.45;vec2 q=vUv-.5;float vig=1.-dot(q,q)*.26;c*=vig;float noise=fract(sin(dot(vUv*resolution,vec2(12.9898,78.233)))*43758.5453);c+=(noise-.5)*.005;gl_FragColor=vec4(c,1.);#include <tonemapping_fragment>\n#include <colorspace_fragment>}`.replace(';#include',';\n#include'),depthTest:false,depthWrite:false});
    this.postScene.add(new T.Mesh(new T.PlaneGeometry(2,2),this.postMaterial));
  }
  poses(stage){const mobile=this.mobile;return {
    outside:{p:mobile?V(18,16,28):V(17,11,22),t:mobile?V(0,1.3,0):V(-3,1.1,1.2),f:mobile?44:40},
    door:{p:mobile?V(.8,3.3,13):V(1.2,2.55,9.8),t:mobile?V(0,.5,3.7):V(-1.35,1.7,3.7),f:43},
    room:this.roomPose(),
    identity:{p:mobile?V(9,10,16):V(10,7.5,13),t:mobile?V(0,1.6,-.5):V(-1.6,1.2,-.4),f:44},
    tree:{p:mobile?V(5.2,4.8,8.3):V(6.7,4.1,6.7),t:V(2.5,2,-1.15),f:mobile?41:42},
    desk:this.stackPose('desk'),
    notes:this.stackPose('letters'),
    letters:{p:V(-3.6+Math.max(4.7,2.9/this.camera.aspect),2.2,2.1),t:V(-3.65,2.05,1.7),f:44},
    recipient:this.stackPose('recipient'),
    reveal:{p:mobile?V(5,3.3,5.9):V(4.7,2.5,4.5),t:V(2.3,1.9,-1),f:46},
  }[stage]||this.poses('room');}
  roomPose(){
    // Fit the cutaway to the screen; wide displays use a lower, more frontal view.
    const aspect=this.camera.aspect, target=V(0,1.45,.15);
    const direction=this.mobile?V(.38,.6,1).normalize():V(.43,.48,1).normalize();
    const distance=Math.max(11.7,13.6/aspect);
    return {p:target.clone().addScaledVector(direction,distance),t:target,f:43};
  }
  paperWidth(place){return place==='desk'?.37:place==='recipient'?.9:2.15;}
  stackPose(place){
    const t=place==='desk'?V(2,1.74,2.22):place==='recipient'?V(-2.55,2.72,-2.23):V(-2.55,2.08,1.7);
    const height=window.visualViewport?.height||innerHeight;
    const available=Math.max(160,Math.min(620,height-175));
    const pixels=this.paperPixels||{width:400,height:550};
    const paperHeight=this.paperWidth(place)*pixels.height/pixels.width;
    const distance=paperHeight/(2*Math.tan(42*Math.PI/360)*(available/innerHeight));
    const direction=place==='desk'?V(0,.16,1).normalize():place==='recipient'?V(.16,.04,1).normalize():V(1,.08,.18).normalize();
    return {p:t.clone().addScaledVector(direction,distance),t,f:42};
  }
  configureStack(place){
    this.stackPlace=place;this.stackWidth=this.paperWidth(place);
    const pixels=this.paperPixels||{width:400,height:550},scale=this.stackWidth/2.15;
    this.stackHeight=this.stackWidth*pixels.height/pixels.width;
    this.stack.children.forEach((m,i)=>{
      m.scale.set(this.stackWidth,this.stackHeight,.012*scale);
      m.position.set((i%2?1:-1)*i*.016*scale,-i*.012*scale,-i*.018*scale);
    });
  }
  updatePaperViewport(stage=this.stage){
    const viewport=window.visualViewport,height=viewport?.height||innerHeight;
    if(['desk','recipient','notes'].includes(stage)&&height<innerHeight-50)this.camera.setViewOffset(innerWidth,innerHeight,0,(innerHeight-height)/2-(viewport?.offsetTop||0),innerWidth,innerHeight);
    else this.camera.clearViewOffset();
  }
  sizePaper(width,height){
    this.updatePaperViewport();
    this.paperPixels={width,height};this.configureStack(this.stackPlace||'letters');
    if(['desk','recipient','notes'].includes(this.stage)&&!this.transitioning){this.setPose(this.stage,true);this.placeStack(this.stage==='notes'?'letters':this.stage);}
  }
  placeStack(place){
    this.configureStack(place);
    const pose=this.stackPose(place);this.stack.position.copy(pose.t);this.stack.lookAt(pose.p);this.stack.rotateY(-.025);this.stack.rotateZ(-.018);
  }
  setDeskLamp(active){this.deskLampOn=active;}
  updateDeskLamp(dt){
    // The task light responds to arriving/leaving, even with ambient motion paused.
    const target=this.deskLampOn?1:0;
    this.deskLampLevel=this.reduced?target:T.MathUtils.lerp(this.deskLampLevel,target,1-Math.exp(-dt*9));
    const level=this.deskLampLevel;
    this.deskLampShade.emissiveIntensity=level*.65;
    this.deskLampBulb.emissiveIntensity=level*2.4;
    this.deskLampGlow.material.opacity=level*.34;
    this.deskLampLight.intensity=level*3.2;
    this.deskLampPoolMaterial.opacity=level*.58;
  }
  async approachDesk(){
    this.transitioning=true;this.stage='desk';this.deskPhase='walking';this.updatePaperViewport();this.drag.x=0;this.drag.y=0;
    const pose=this.stackPose('desk'),from=this.camera.position.clone(),look=this.target.clone(),fov=this.camera.fov;
    const route=new T.CatmullRomCurve3([from,V(4.4,2.9,5.2),V(2.15,2.25,3.95),pose.p]);
    await this.animate(2600,t=>{
      const e=ease(t);this.camera.position.copy(route.getPoint(e));
      this.target.lerpVectors(look,pose.t,e);this.camera.fov=T.MathUtils.lerp(fov,pose.f,e);
      this.camera.updateProjectionMatrix();this.camera.lookAt(this.target);
    });
    this.basePosition.copy(pose.p);this.baseTarget.copy(pose.t);this.deskPhase='seated';this.transitioning=false;
  }
  async openStack(place,cardIndex=0){
    this.placeStack(place);const destination=this.stack.position.clone(),orientation=this.stack.quaternion.clone();
    if(place==='recipient'){
      // Visit the mantel letter itself, then draw its notes forward from the seal.
      this.stack.visible=false;this.stack.scale.setScalar(1);
      await this.travel('recipient');
      const source=V(-2.55,2.72,-2.57),closed=new T.Quaternion().setFromEuler(new T.Euler(0,0,-.08));
      this.stack.visible=true;this.transitioning=true;
      await this.animate(950,t=>{
        const e=ease(t);this.stack.position.lerpVectors(source,destination,e);
        this.stack.scale.setScalar(.4+.6*e);this.stack.quaternion.slerpQuaternions(closed,orientation,e);
      });
      this.transitioning=false;return;
    }
    if(place==='desk'){
      this.stack.visible=false;this.stack.scale.setScalar(1);
      await this.approachDesk();
      const source=V(2.06,1.39,2.12),flat=new T.Quaternion().setFromEuler(new T.Euler(-Math.PI/2,0,-.08));
      this.stack.position.copy(source);this.stack.quaternion.copy(flat);this.stack.visible=true;this.deskPhase='lifting';this.transitioning=true;
      await this.animate(1100,t=>{
        const e=ease(t);this.stack.position.lerpVectors(source,destination,e);
        this.stack.position.y+=Math.sin(t*Math.PI)*.035;
        this.stack.quaternion.slerpQuaternions(flat,orientation,e);
      });
      this.deskPhase='seated';this.transitioning=false;return;
    }
    const column=cardIndex%2,row=Math.floor(cardIndex/2);
    const source=this.letters.localToWorld(V(((126+column*228)/480-.5)*1.91,(.5-(74.125+row*122.25)/580)*2.32,.14));
    this.stack.visible=true;this.stack.position.copy(source);this.stack.scale.setScalar(.3);
    await Promise.all([this.travel('notes'),this.animate(1400,t=>{this.stack.position.lerpVectors(source,destination,ease(t));this.stack.scale.setScalar(.3+.7*ease(t));})]);
  }
  async shufflePaper(direction){
    if(this.paperShuffling)return;this.paperShuffling=true;
    const position=this.stack.position.clone(),rotation=this.stack.rotation.z;
    await this.animate(360,t=>{const arc=Math.sin(t*Math.PI);this.stack.rotation.z=rotation+direction*arc*.035;this.stack.position.y=position.y+arc*.055;});
    this.stack.rotation.z=rotation;this.stack.position.copy(position);this.paperShuffling=false;
  }
  surfaceTransform(object,width,height,worldWidth,worldHeight,z){
    object.updateWorldMatrix(true,false);this.camera.updateMatrixWorld();
    const normal=new T.Matrix4().set(worldWidth/width,0,0,-worldWidth/2,0,-worldHeight/height,0,worldHeight/2,0,0,1,z,0,0,0,1);
    const viewport=new T.Matrix4().set(innerWidth/2,0,0,innerWidth/2,0,-innerHeight/2,0,innerHeight/2,0,0,1,0,0,0,0,1);
    const m=viewport.multiply(this.camera.projectionMatrix).multiply(this.camera.matrixWorldInverse).multiply(object.matrixWorld).multiply(normal);
    return 'matrix3d('+m.elements.join(',')+')';
  }
  surfaces(){
    const size=this.paperPixels||{width:400,height:550};
    return {paperVisible:this.stack.visible,board:this.surfaceTransform(this.letters,480,580,1.91,2.32,.106),paper:this.surfaceTransform(this.stack,size.width,size.height,this.stackWidth,this.stackHeight,.013*this.stackWidth/2.15)};
  }
  setPose(stage,instant=false){const pose=this.poses(stage);this.stage=stage;this.updatePaperViewport(stage);if(instant){this.camera.position.copy(pose.p);this.target.copy(pose.t);this.camera.fov=pose.f;this.camera.updateProjectionMatrix();this.basePosition.copy(pose.p);this.baseTarget.copy(pose.t);this.camera.lookAt(this.target);}return pose;}
  animate(duration,update){return new Promise(resolve=>{if(this.reduced){update(1);resolve();return;}this.tweens.push({start:performance.now(),duration,update,resolve});});}
  async travel(stage){
    if(this.transitioning)return;this.transitioning=true;const target=this.poses(stage),from=this.camera.position.clone(),look=this.target.clone(),fov=this.camera.fov;this.stage=stage;this.updatePaperViewport(stage);this.drag.x=0;this.drag.y=0;
    await this.animate(stage==='door'?2400:1550,t=>{const e=ease(t);this.camera.position.lerpVectors(from,target.p,e);if(stage==='door')this.camera.position.y+=Math.sin(t*Math.PI*8)*.035*Math.sin(t*Math.PI);this.target.lerpVectors(look,target.t,e);this.camera.fov=T.MathUtils.lerp(fov,target.f,e);this.camera.updateProjectionMatrix();this.camera.lookAt(this.target);});
    this.basePosition.copy(target.p);this.baseTarget.copy(target.t);this.transitioning=false;
  }
  async enter(){
    if(this.transitioning)return;this.transitioning=true;
    // Furnish the interior before the door opens, so the threshold never reveals an empty shell.
    this.room.visible=true;this.cat.visible=true;this.renderer.shadowMap.needsUpdate=true;
    await this.animate(900,t=>{this.door.rotation.y=-ease(t)*Math.PI*.63;});
    const from=this.camera.position.clone(),look=this.target.clone();await this.animate(1500,t=>{this.camera.position.lerpVectors(from,V(0,1.65,3.15),ease(t));this.target.lerpVectors(look,V(0,1.45,-2),ease(t));this.camera.lookAt(this.target);});
    this.outside.visible=false;this.house.visible=false;this.smoke.visible=false;this.room.visible=true;this.cat.visible=true;this.scene.background.set(0x28494f);this.scene.fog.color.set(0x28494f);this.hemi.intensity=1.6;this.hemi.color.set(0xe8d6b2);this.moonLight.intensity=2.2;this.moonLight.color.set(0xffd6a2);this.snowMaterial.uniforms.inside.value=1;this.renderer.shadowMap.needsUpdate=true;
    this.transitioning=false;await this.travel('room');
  }
  async restoreInside(stage='room'){this.outside.visible=false;this.house.visible=false;this.smoke.visible=false;this.room.visible=true;this.cat.visible=true;this.scene.background.set(0x28494f);this.scene.fog.color.set(0x28494f);this.hemi.intensity=1.6;this.hemi.color.set(0xe8d6b2);this.moonLight.intensity=2.2;this.moonLight.color.set(0xffd6a2);this.snowMaterial.uniforms.inside.value=1;this.renderer.shadowMap.needsUpdate=true;this.setPose(stage,true);}
  get cookiesLeft(){return this.cookies.filter(cookie=>!cookie.userData.eaten).length;}
  async eatCookie(index,onBite){
    if(this.cookieBusy||this.stage!=='room')return false;
    const cookie=index===undefined?this.cookies.find(c=>!c.userData.eaten):this.cookies[index];
    if(!cookie||cookie.userData.eaten)return false;
    this.cookieBusy=true;cookie.userData.eaten=true;onBite?.();
    const start=cookie.position.clone();this.cookieRoot.updateWorldMatrix(true,false);
    const toward=this.cookieRoot.worldToLocal(this.camera.position.clone()).sub(start).normalize();
    this.cookieCrumbs.visible=true;
    await this.animate(950,t=>{
      const e=ease(t);cookie.position.copy(start).addScaledVector(toward,e*.2);cookie.position.y+=Math.sin(t*Math.PI)*.23;
      cookie.rotation.z=Math.sin(t*Math.PI)*.35;cookie.scale.setScalar(1-e);
      this.cookieCrumbs.children.forEach((crumb,i)=>{const a=i*2.4,r=.025+e*.055;crumb.position.set(start.x+Math.cos(a)*r,.008+Math.sin(t*Math.PI)*(.06+i*.009),start.z+Math.sin(a)*r);});
    });
    cookie.visible=false;this.cookieBusy=false;this.renderer.shadowMap.needsUpdate=true;return true;
  }
  setCatRest(amount){
    this.cat.scale.set(1.15-.15*amount,1.15-.45*amount,1.15-.3*amount);
    this.catHead.position.set(0,.46-.16*amount,.38-.07*amount);this.catHead.rotation.set(.18*amount,0,0);
    this.catLegs.forEach((leg,i)=>{leg.position.y=.18-.055*amount;leg.rotation.x=(i%2?-1:1)*amount*1.1;});
    this.catTail.rotation.set(-.15*amount,-1.1*amount,-.5*amount);
    this.catEyes.forEach(eye=>eye.scale.y=1-.9*amount);
  }
  async nap(){
    if(this.catBusy||this.catResting)return;
    this.catBusy=true;
    this.sofa.updateWorldMatrix(true,false);
    const start=this.cat.position.clone(),seat=this.sofa.localToWorld(V(-.1,1.02,.13));
    const direction=Math.atan2(seat.x-start.x,seat.z-start.z),facing=this.cat.rotation.y;
    await this.animate(350,t=>{const e=ease(t);this.cat.rotation.y=T.MathUtils.lerp(facing,direction,e);this.cat.scale.set(1.15,1.15-.3*e,1.15+.12*e);});
    await this.animate(850,t=>{
      this.cat.position.lerpVectors(start,seat,t);this.cat.position.y+=Math.sin(t*Math.PI)*.9;
      this.cat.scale.setScalar(1.15);this.cat.rotation.x=-Math.sin(t*Math.PI)*.3;
      this.catLegs.forEach((leg,i)=>leg.rotation.x=Math.sin(t*Math.PI)*(i%2?-.65:.8));
    });
    this.cat.rotation.x=0;this.cat.position.copy(seat);
    await this.animate(850,t=>{const e=ease(t);this.setCatRest(e);this.cat.rotation.y=T.MathUtils.lerp(direction,this.sofa.rotation.y+.9,e);this.cat.position.y=seat.y-Math.sin(t*Math.PI)*.045;});
    this.cat.position.copy(seat);this.catResting=true;this.catBusy=false;this.renderer.shadowMap.needsUpdate=true;
  }
  async pounce(index){
    const bauble=this.baubles[index];if(!bauble||bauble.group.userData.taken)return;
    this.catBusy=true;if(this.catResting){await this.animate(450,t=>this.setCatRest(1-ease(t)));this.catResting=false;}
    this.transitioning=true;this.catBusy=true;const start=this.cat.position.clone(),target=bauble.group.getWorldPosition(V());this.cat.rotation.y=Math.atan2(target.x-start.x,target.z-start.z);const cameraStart=this.camera.position.clone(),lookStart=this.target.clone(),jumpCamera=this.mobile?V(7,6,12):V(6.4,4.6,9.3),jumpLook=V(.7,1.65,-.2);
    await this.animate(450,t=>{this.cat.scale.set(1.15,1.15-.3*Math.sin(t*Math.PI),1.15+.18*Math.sin(t*Math.PI));this.catHead.rotation.x=-.2*Math.sin(t*Math.PI);this.camera.position.lerpVectors(cameraStart,jumpCamera,ease(t));this.target.lerpVectors(lookStart,jumpLook,ease(t));this.camera.lookAt(this.target);});
    await this.animate(1050,t=>{const e=t;this.cat.position.lerpVectors(start,target,e);this.cat.position.y+=Math.sin(e*Math.PI)*1.8;this.cat.rotation.z=-Math.sin(e*Math.PI)*.3;this.cat.rotation.x=-Math.sin(e*Math.PI)*.4;this.catLegs.forEach((leg,i)=>{leg.rotation.x=i%2===0?-.45:1.1*Math.sin(e*Math.PI);});});
    this.burst.position.copy(target);this.burst.visible=true;this.burstStart=performance.now()/1000;bauble.group.visible=false;
    await this.animate(1100,t=>{this.tree.rotation.z=Math.sin(t*22)*.045*(1-t);this.cat.position.lerpVectors(target,V(1.35,.2,-.1),ease(t));this.cat.rotation.z=Math.sin(t*9)*.08*(1-t);this.cat.rotation.x*=.95;this.catLegs.forEach(l=>l.rotation.x*=.93);});
    this.tree.rotation.z=0;this.cat.rotation.x=0;this.cat.rotation.z=0;this.cat.rotation.y=-.5;this.setCatRest(0);this.renderer.shadowMap.needsUpdate=true;this.catBusy=false;this.transitioning=false;
    await this.travel('reveal');
  }
  async pet(){
    if(this.catBusy)return;this.catBusy=true;
    const head=this.catHead.rotation.z,tail=this.catTail.rotation.z;
    await this.animate(900,t=>{this.catHead.rotation.z=head+Math.sin(t*Math.PI*2)*.15;this.catBody.scale.y=.25+Math.sin(t*Math.PI)*.025;this.catTail.rotation.z=tail+Math.sin(t*Math.PI*6)*.15;});
    this.catHead.rotation.z=head;this.catTail.rotation.z=tail;this.catBody.scale.y=.25;this.catBusy=false;
  }
  ring(){this.animate(1000,t=>{this.bell.rotation.z=Math.sin(t*24)*.4*(1-t);});}
  setupInput(){
    let down=null,moved=false;const canvas=this.canvas;const ray=new T.Raycaster(),pointer=new T.Vector2();
    const hit=e=>{pointer.set(e.clientX/innerWidth*2-1,-e.clientY/innerHeight*2+1);ray.setFromCamera(pointer,this.camera);const valid=this.hitRoots.filter(o=>{let p=o;while(p){if(!p.visible)return false;p=p.parent;}if(this.stage==='tree')return o.userData.action==='bauble'||o.userData.action==='cat';return o.userData.action!=='bauble';});const hits=ray.intersectObjects(valid,true);if(!hits.length)return null;let item=hits[0].object;while(item&&!item.userData.action)item=item.parent;return item;};
    canvas.addEventListener('pointerdown',e=>{down={x:e.clientX,y:e.clientY};moved=false;canvas.setPointerCapture(e.pointerId);});
    canvas.addEventListener('pointermove',e=>{if(this.transitioning)return;if(down){const dx=e.clientX-down.x,dy=e.clientY-down.y;if(Math.abs(dx)+Math.abs(dy)>7)moved=true;if(['outside','room'].includes(this.stage)){this.drag.x=clamp(this.drag.x+dx*.002,-.55,.55);this.drag.y=clamp(this.drag.y+dy*.001,-.15,.2);down={x:e.clientX,y:e.clientY};}}else{this.lookOffset.set((e.clientX/innerWidth-.5)*.17,(.5-e.clientY/innerHeight)*.09,0);canvas.style.cursor=hit(e)?'pointer':'grab';}});
    canvas.addEventListener('pointerup',e=>{if(down&&!moved&&!this.transitioning){const item=hit(e);this.onAction?.(item?item.userData.action:'empty',item?.userData.index);}down=null;});canvas.addEventListener('pointercancel',()=>{down=null;});
    canvas.addEventListener('keydown',e=>{if(['ArrowLeft','ArrowRight','ArrowUp','ArrowDown'].includes(e.key)){e.preventDefault();this.drag.x=clamp(this.drag.x+(e.key==='ArrowLeft'?-.08:e.key==='ArrowRight'?.08:0),-.55,.55);this.drag.y=clamp(this.drag.y+(e.key==='ArrowUp'?.03:e.key==='ArrowDown'?-.03:0),-.15,.2);}});
    window.addEventListener('resize',()=>this.resize());document.addEventListener('visibilitychange',()=>{if(document.hidden){cancelAnimationFrame(this.raf);this.last=0;}else this.raf=requestAnimationFrame(t=>this.loop(t));});
    const mq=matchMedia('(prefers-reduced-motion: reduce)');mq.addEventListener('change',e=>this.reduced=e.matches);
  }
  resize(){this.mobile=innerWidth<650;this.renderer.setSize(innerWidth,innerHeight);const ratio=this.renderer.getPixelRatio();this.renderTarget.setSize(Math.round(innerWidth*ratio),Math.round(innerHeight*ratio));this.postMaterial.uniforms.resolution.value.set(innerWidth*ratio,innerHeight*ratio);this.camera.aspect=innerWidth/innerHeight;this.camera.updateProjectionMatrix();if(!this.transitioning)this.setPose(this.stage,true);}
  project(v){const p=v.clone().project(this.camera);return {x:(p.x+1)/2*innerWidth,y:(1-p.y)/2*innerHeight,visible:p.z<1&&p.z>-1&&Math.abs(p.x)<1.2&&Math.abs(p.y)<1.2};}
  loop(now){
    this.raf=requestAnimationFrame(t=>this.loop(t));const dt=this.last?Math.min((now-this.last)/1000,.05):1/60;this.last=now;
    if(!this.paused&&!this.reduced)this.elapsed+=dt;
    this.fps=this.fps*.97+(1/dt)*.03;this.frameCount++;
    // An inexpensive adaptive pixel budget. Never lower the hit-target resolution.
    if(this.frameCount===150&&this.fps<38&&this.renderer.getPixelRatio()>1){this.renderer.setPixelRatio(1);this.resize();}
    for(let i=this.tweens.length-1;i>=0;i--){const a=this.tweens[i],t=clamp((now-a.start)/a.duration,0,1);a.update(t);if(t===1){this.tweens.splice(i,1);a.resolve();}}
    if(!this.transitioning){const p=this.basePosition.clone();if(['outside','room'].includes(this.stage)){const delta=p.clone().sub(this.baseTarget);delta.applyAxisAngle(V(0,1,0),this.drag.x);delta.y+=this.drag.y*5;p.copy(this.baseTarget).add(delta);}if(['desk','notes','recipient','letters'].includes(this.stage)){this.camera.position.copy(p);this.target.copy(this.baseTarget);}else{if(!this.reduced&&!this.paused){p.x+=this.lookOffset.x;p.y+=this.lookOffset.y;}this.camera.position.lerp(p,.045);this.target.lerp(this.baseTarget,.06);}this.camera.lookAt(this.target);}
    const time=this.elapsed;this.updateEasterEggs(time);this.updateWindow(time);this.updateDeskLamp(dt);
    this.snowMaterial.uniforms.time.value=time;
    this.flameMaterial.uniforms.time.value=time;
    this.embers.children.forEach(e=>{const f=(time*.33+e.userData.phase)%1;e.position.set(e.userData.drift*.46+Math.sin(f*9+e.userData.phase*6)*.06,f*1.25,Math.sin(f*5)*.045);e.material.opacity=Math.sin(f*Math.PI)*.7;e.scale.setScalar(.02+Math.sin(f*Math.PI)*.025);});
    this.fireParts.forEach(f=>{f.scale.y=f.userData.height*(1+Math.sin(time*7+f.userData.phase)*.17+Math.sin(time*11+f.userData.phase)*.09);});
    this.warmLight.intensity=22+Math.sin(time*6)*1.2+Math.sin(time*9)*.6;
    this.fireGlow.material.opacity=.3+Math.sin(time*4)*.025;
    this.twinkles.forEach((s,i)=>{s.material.opacity=.16+Math.sin(time*1.5+i*2.6)*.055;});
    this.smoke.children.forEach(s=>{const f=(time*.11+s.userData.phase)%1;s.position.set(Math.sin(f*3)*.5+f*.5,f*3.8,Math.cos(f*2)*.12);s.scale.setScalar(.4+f*1.4);s.material.opacity=Math.sin(f*Math.PI)*.12;});
    this.teaSteam.children.forEach(s=>{const f=(time*.25+s.userData.phase)%1;s.position.set(Math.sin(f*4)*.06,f*.6,0);s.scale.setScalar(.1+f*.25);s.material.opacity=Math.sin(f*Math.PI)*.085;});
    if(!this.catBusy){
      if(this.catResting){this.catBody.scale.y=.25+Math.sin(time*1.7)*.003;this.catTail.rotation.z=-.5+Math.sin(time*.7)*.025;}
      else{this.catTail.rotation.y=Math.sin(time*2)*.16;this.catHead.rotation.y=Math.sin(time*.5)*.12;this.catBody.scale.y=.25+Math.sin(time*2.2)*.006;}
    }
    if(this.stage==='tree'&&!this.transitioning)this.baubles.forEach((b,i)=>{if(b.group.userData.taken)return;b.group.rotation.z=Math.sin(time*1.6+i)*.07;b.group.position.y=b.homeY+Math.sin(time*1.6+i)*.025;b.aura.material.opacity=.34+Math.sin(time*2+i)*.12;});
    if(this.burst.visible){const t=now/1000-this.burstStart;for(let i=0;i<65;i++){const v=this.burstVel[i];this.burstPos[i*3]=v.x*t;this.burstPos[i*3+1]=v.y*t-t*t*.8;this.burstPos[i*3+2]=v.z*t;}this.burstGeo.attributes.position.needsUpdate=true;this.burst.material.opacity=Math.max(0,1-t/2);if(t>2||this.reduced)this.burst.visible=false;}
    this.scene.updateMatrixWorld();const points={};for(const [name,v]of Object.entries(this.anchors))points[name]=this.project(v);if(this.stage==='tree')for(const b of this.baubles){const pt=this.project(b.group.getWorldPosition(V()));pt.visible=pt.visible&&b.group.visible;points['bauble-'+b.index]=pt;}this.onFrame?.(points,this.surfaces());
    this.renderer.setRenderTarget(this.renderTarget);this.renderer.render(this.scene,this.camera);this.sceneStats={triangles:this.renderer.info.render.triangles,drawCalls:this.renderer.info.render.calls};this.renderer.setRenderTarget(null);this.renderer.render(this.postScene,this.postCamera);
  }
  stats(){return {fps:Math.round(this.fps),pixelRatio:this.renderer.getPixelRatio(),triangles:this.sceneStats?.triangles,drawCalls:this.sceneStats?.drawCalls,geometries:this.renderer.info.memory.geometries,stage:this.stage,catResting:this.catResting,catBusy:!!this.catBusy,catPosition:this.cat.position.toArray(),cookiesLeft:this.cookiesLeft,cookieBusy:this.cookieBusy,webgl:true,interiorVisible:this.room.visible,deskPhase:this.deskPhase,deskLampOn:this.deskLampOn,deskLamp:this.deskLampLevel,fireTime:this.flameMaterial.uniforms.time.value,windowTime:this.windowMaterial.uniforms.time.value,windowGlow:this.windowMaterial.uniforms.glow.value,camera:this.camera.position.toArray(),eggs:{snowman:this.snowman.visible,snowballs:this.flyingSnow.visible,santa:this.sleigh.visible,santaPosition:this.project(this.sleigh.position),shootingStar:this.shootingStar.visible,starPosition:this.project(this.shootingStar.position)}};}
}
