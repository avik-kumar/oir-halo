import * as THREE from 'https://cdnjs.cloudflare.com/ajax/libs/three.js/r128/three.module.js';
import {
  TRACK_WIDTH, RULES_MAX_MPH, G, CAR, P, DEFAULTS, SP, RACE_DEFAULTS,
} from './config.js';

/** Optional race-mode hooks set by js/race.js */
export let raceHooks = {
  onCrossLine: null,
  onStep: null,
  onReset: null,
  suppressPracticeLaps: false,
  lockCameraKeys: false,
  /** Menu / race-lobby: ignore drive + hotkeys (C/T/R). */
  blockKeys: false,
  hudExtra: null,
};

export function setRaceHooks(h) {
  Object.assign(raceHooks, h || {});
}

export function applyRacePack() {
  Object.assign(P, RACE_DEFAULTS);
}

export let T = null;
export let trackGroup = null;
export let RAW = null;
export let RAWLABEL = '';
// ====================== SCENE ======================
const renderer = new THREE.WebGLRenderer({antialias:true});
renderer.setPixelRatio(Math.min(window.devicePixelRatio||1, 2));
renderer.setSize(innerWidth, innerHeight);
renderer.domElement.id = 'view';
document.body.appendChild(renderer.domElement);
const scene = new THREE.Scene();
scene.background = new THREE.Color(0x9cc4e4);
scene.fog = new THREE.Fog(0xa8c8e8, 280, 1100);
const camera = new THREE.PerspectiveCamera(65, innerWidth/innerHeight, 0.2, 2500);
scene.add(new THREE.HemisphereLight(0xeef4ff, 0x3d5c32, 0.9));
const sun = new THREE.DirectionalLight(0xfff8ee, 0.75); sun.position.set(120,180,60); scene.add(sun);
const fill = new THREE.DirectionalLight(0xc8d8ff, 0.22); fill.position.set(-60,40,-80); scene.add(fill);
addEventListener('resize', () => { renderer.setPixelRatio(Math.min(window.devicePixelRatio||1, 2)); renderer.setSize(innerWidth, innerHeight); camera.aspect = innerWidth/innerHeight; camera.updateProjectionMatrix(); });

// ---------- Halo V1 model (+z = forward, +x = left) ----------
const car3d = new THREE.Group(); car3d.rotation.order = 'YXZ';
const carFrontWheels = [], carSpin = [];
function cellTexture(){
  const c=document.createElement('canvas'); c.width=c.height=64; const g=c.getContext('2d');
  g.fillStyle='#0f1322'; g.fillRect(0,0,64,64);
  g.strokeStyle='#4d587a'; g.lineWidth=3; g.strokeRect(0,0,64,64);
  const t=new THREE.CanvasTexture(c); t.wrapS=t.wrapT=THREE.RepeatWrapping; t.repeat.set(5,5);
  t.anisotropy=renderer.capabilities.getMaxAnisotropy(); return t;
}
// ---- simple catamaran: one smooth lofted body, constant width, arched tunnel underneath ----
const BW=0.78, Y0=0.24, TW=0.26;   // half width, ground clearance, tunnel half width
const bodyW=z=>{ if(z>1){ const t=(z-1)/1.5; return BW*(1-.5*Math.pow(t,2.2)); } if(z<-2){ const t=(-2-z)/.7; return BW*(1-.35*t*t); } return BW; };
const bodyH=z=>{ if(z>1){ const t=(z-1)/1.5; return .66-.2*t*t; } if(z<-2){ const t=(-2-z)/.7; return .66-.1*t*t; } return .66; };
// 42-point cross-section: 0-5 lower-left corner, 6-11 upper-left, 12-18 solar crown, 19-24 upper-right, 25-30 lower-right, 31-41 tunnel arch
function section(z){
  const W=bodyW(z), H=bodyH(z), Th=Math.min(.22,H-Y0-.08), rb=Math.max(.04,Math.min(.14,W-TW-.03)),
        rt=Math.max(.04,Math.min(.18,W*.45,H-Y0-rb-.02)), xc=W-rt, n=5, P=[];
  for(let a=0;a<=n;a++){ const t=a/n*Math.PI/2; P.push([W-rb+rb*Math.sin(t), Y0+rb-rb*Math.cos(t)]); }
  for(let a=0;a<=n;a++){ const t=a/n*Math.PI/2; P.push([W-rt+rt*Math.cos(t), H-rt+rt*Math.sin(t)]); }
  for(let k=1;k<8;k++){ const x=xc-2*xc*k/8; P.push([x, H+0.02*(1-(x/xc)*(x/xc))]); }
  for(let a=n;a>=0;a--){ const t=a/n*Math.PI/2; P.push([-(W-rt+rt*Math.cos(t)), H-rt+rt*Math.sin(t)]); }
  for(let a=n;a>=0;a--){ const t=a/n*Math.PI/2; P.push([-(W-rb+rb*Math.sin(t)), Y0+rb-rb*Math.cos(t)]); }
  for(let a=0;a<=10;a++){ const t=a/10*Math.PI; P.push([-TW*Math.cos(t), Y0+Th*Math.sin(t)]); }
  return P;
}
function loftBody(){
  const S=48, zs=[], sec=[];
  for(let i=0;i<S;i++){ const z=2.5-5.2*i/(S-1); zs.push(z); sec.push(section(z)); }
  const M=sec[0].length, pos=[], uv=[], col=[];
  const colOf=j=>(j<=3||(j>=27&&j<=30))?[.165,.31,.72]:(j>=31?[.12,.12,.14]:[.93,.94,.97]);
  sec.forEach((pts,i)=>pts.forEach((p,j)=>{ pos.push(p[0],p[1],zs[i]); uv.push(p[0],zs[i]); col.push(...colOf(j)); }));
  const body=[], top=[];
  for(let i=0;i<S-1;i++) for(let j=0;j<M;j++){
    const j2=(j+1)%M, a=i*M+j, b=i*M+j2, c=(i+1)*M+j, d=(i+1)*M+j2;
    ((j>=11&&j<19)?top:body).push(a,b,c, b,d,c);
  }
  let base=S*M;
  for(const i of [0,S-1]){
    sec[i].forEach((p,j)=>{ pos.push(p[0],p[1],zs[i]); uv.push(p[0],zs[i]); col.push(...colOf(j)); });
    THREE.ShapeUtils.triangulateShape(sec[i].map(p=>new THREE.Vector2(p[0],p[1])),[]).forEach(f=>body.push(base+f[0],base+f[1],base+f[2]));
    base+=M;
  }
  const mk=(idx,withCol)=>{ const g=new THREE.BufferGeometry(); g.setAttribute('position',new THREE.Float32BufferAttribute(pos,3));
    g.setAttribute('uv',new THREE.Float32BufferAttribute(uv,2)); if(withCol) g.setAttribute('color',new THREE.Float32BufferAttribute(col,3));
    g.setIndex(idx); g.computeVertexNormals(); return g; };
  return {body:mk(body,true), top:mk(top,false)};
}
{
  const ph=(c,s)=>new THREE.MeshPhongMaterial({color:c, shininess:s||50, specular:0x444444, side:THREE.DoubleSide});
  const shell=new THREE.MeshPhongMaterial({color:0xffffff, vertexColors:true, shininess:60, specular:0x555555, side:THREE.DoubleSide});
  const cells=new THREE.MeshPhongMaterial({map:cellTexture(), shininess:70, specular:0x445577, side:THREE.DoubleSide});
  const L=loftBody(); car3d.add(new THREE.Mesh(L.body,shell), new THREE.Mesh(L.top,cells));

  // cockpit on the RIGHT (-x): glass bubble, roll hoop, helmet. Cells cover the rest of the top.
  const H=bodyH(0.1)+0.02;
  const bub=new THREE.Mesh(new THREE.SphereGeometry(1,18,10,0,Math.PI*2,0,Math.PI/2),
    new THREE.MeshPhongMaterial({color:0x1d2a38,transparent:true,opacity:0.45,shininess:120,specular:0xaaccff,side:THREE.DoubleSide,depthWrite:false}));
  bub.scale.set(0.2,0.25,0.62); bub.position.set(-0.4,H,0.15); car3d.add(bub);
  const hoop=new THREE.Mesh(new THREE.TorusGeometry(0.2,0.018,6,16,Math.PI),ph(0x8a8f98,80)); hoop.position.set(-0.4,H-0.02,-0.4); car3d.add(hoop);
  const helmet=new THREE.Mesh(new THREE.SphereGeometry(0.09,12,10),ph(0xf2c230,80)); helmet.position.set(-0.4,H+0.1,0.05); car3d.add(helmet);
  car3d.userData.helmet=helmet;
  // Eyes at yellow helmet: above solar deck (H), inside canopy bubble
  car3d.userData.cockpitEye=new THREE.Vector3(-0.4, H+0.1, 0.05);

  // wheels, inset under the body, same track front and rear
  const tireM=new THREE.MeshLambertMaterial({color:0x151515}), hubM=ph(0xc4c8d0,90);
  const mkWheel=(x,z,front)=>{
    const steer=new THREE.Group(); steer.position.set(x,0.26,z);
    const spin=new THREE.Group(); steer.add(spin);
    const tire=new THREE.Mesh(new THREE.CylinderGeometry(0.26,0.26,0.12,20),tireM); tire.rotation.z=Math.PI/2; spin.add(tire);
    const hub=new THREE.Mesh(new THREE.CylinderGeometry(0.15,0.15,0.125,12),hubM); hub.rotation.z=Math.PI/2; spin.add(hub);
    spin.add(new THREE.Mesh(new THREE.BoxGeometry(0.13,0.03,0.28),tireM));
    car3d.add(steer); carSpin.push(spin); if(front) carFrontWheels.push(steer);
  };
  mkWheel(-0.52,1.3,true); mkWheel(0.52,1.3,true); mkWheel(-0.52,-1.3,false); mkWheel(0.52,-1.3,false);
}
// soft ground shadow (separate from the car so it follows the road, not the car's roll)
const shadow=(()=>{
  const c=document.createElement('canvas'); c.width=64; c.height=128; const g=c.getContext('2d');
  g.scale(1,2); const gr=g.createRadialGradient(32,32,4,32,32,31); gr.addColorStop(0,'rgba(0,0,0,.6)'); gr.addColorStop(.6,'rgba(0,0,0,.3)'); gr.addColorStop(1,'rgba(0,0,0,0)');
  g.fillStyle=gr; g.fillRect(0,0,64,64);
  const geo=new THREE.PlaneGeometry(2.3,6.2); geo.rotateX(-Math.PI/2); geo.translate(0,0,-0.2);
  const m=new THREE.Mesh(geo,new THREE.MeshBasicMaterial({map:new THREE.CanvasTexture(c),transparent:true,depthWrite:false,polygonOffset:true,polygonOffsetFactor:-8,polygonOffsetUnits:-8}));
  m.rotation.order='YXZ'; m.renderOrder=6; scene.add(m); return m;
})();
scene.add(car3d);
// ====================== TRACK ======================

function smooth(a, k, passes){
  const n = a.length;
  for(let p=0;p<passes;p++){
    const o = new Array(n);
    for(let i=0;i<n;i++){ let s=0; for(let j=-k;j<=k;j++) s += a[(i+j+n*4)%n]; o[i]=s/(2*k+1); }
    a = o;
  }
  return a;
}

function buildFromXYZ(X, Z, Y){
  { const n0=Y.length, err=Y[n0-1]-Y[0]; for(let i=0;i<n0;i++) Y[i]-=err*i/(n0-1); }
  if(X.length>3 && Math.hypot(X[0]-X[X.length-1], Z[0]-Z[Z.length-1])<3){ X.pop(); Z.pop(); Y.pop(); }
  X = smooth(X,2,3); Z = smooth(Z,2,3);
  const n = X.length, cum = [0];
  for(let i=0;i<n;i++){ const j=(i+1)%n; cum.push(cum[i]+Math.hypot(X[j]-X[i], Z[j]-Z[i])); }
  const total = cum[n], N = Math.max(40, Math.round(total/2));
  const rx=[],rz=[],ry=[]; let seg=0;
  for(let k=0;k<N;k++){
    const s = k*total/N;
    while(cum[seg+1] < s) seg++;
    const j=(seg+1)%n, f=(s-cum[seg])/Math.max(1e-6,cum[seg+1]-cum[seg]);
    rx.push(X[seg]+(X[j]-X[seg])*f); rz.push(Z[seg]+(Z[j]-Z[seg])*f); ry.push(Y[seg]+(Y[j]-Y[seg])*f);
  }
  let y=smooth(ry,38,2); y=smooth(y,12,1);
  const x=smooth(rx,3,2), z=smooth(rz,3,2);
  const tx=[],tz=[],lx=[],lz=[];
  for(let i=0;i<N;i++){
    const a=(i+1)%N, b=(i-1+N)%N;
    let dx=x[a]-x[b], dz=z[a]-z[b]; const d=Math.hypot(dx,dz); dx/=d; dz/=d;
    tx.push(dx); tz.push(dz); lx.push(dz); lz.push(-dx);
  }
  // FIX: use local arrays (T is still null / stale here -> that caused the black screen)
  const curv=[];
  for(let i=0;i<N;i++){
    const im=(i-2+N)%N, ip=(i+2)%N;
    const cross=tx[im]*tz[ip]-tz[im]*tx[ip], dot=tx[im]*tx[ip]+tz[im]*tz[ip];
    curv.push(Math.abs(Math.atan2(cross, dot)));
  }
  return {N,x,y,z,tx,tz,lx,lz,curv,len:total};
}

function parseCSV(text){
  const L = text.replace(/^[`'"]+|[`'"]+$/g,'').trim().split(/\r?\n/);
  const h = L[0].replace(/^[`'"]+|[`'"]+$/g,'').split(',').map(s=>s.trim().toLowerCase());
  const iLat=h.indexOf('latitude'), iLon=h.indexOf('longitude');
  let iE=h.indexOf('elevation_ft'); if(iE<0) iE=h.indexOf('elevation_raw_ft');
  if(iLat<0||iLon<0) throw new Error('CSV needs latitude and longitude columns');
  const pts=[];
  for(let k=1;k<L.length;k++){
    const c=L[k].split(','); if(c.length<=iLon) continue;
    const la=parseFloat(c[iLat]), lo=parseFloat(c[iLon]), e=iE>=0?parseFloat(c[iE]):0;
    if(isFinite(la)&&isFinite(lo)) pts.push([la,lo,isFinite(e)?e:0]);
  }
  if(pts.length<10) throw new Error('Not enough valid points ('+pts.length+')');
  const lat0=pts.reduce((s,p)=>s+p[0],0)/pts.length, lon0=pts.reduce((s,p)=>s+p[1],0)/pts.length;
  const kx=111320*Math.cos(lat0*Math.PI/180), kz=110574;
  return {X:pts.map(p=>(p[1]-lon0)*kx), Z:pts.map(p=>-(p[0]-lat0)*kz), Y:pts.map(p=>p[2]*0.3048)};
}
function loadRaw(raw,label){ RAW=raw; RAWLABEL=label; setTrack(buildFromXYZ(raw.X.slice(),raw.Z.slice(),raw.Y.map(v=>v*P.elev)),label); }

function mockOval(){
  const X=[],Z=[],Y=[], S=150, R=55, n=240, per=2*S+2*Math.PI*R;
  for(let i=0;i<n;i++){
    let s=i/n*per, x,z;
    if(s<S){ x=R; z=-S/2+s; }
    else if((s-=S)<Math.PI*R){ const a=s/R; x=R*Math.cos(a); z=S/2+R*Math.sin(a); }
    else if((s-=Math.PI*R)<S){ x=-R; z=S/2-s; }
    else { s-=S; const a=Math.PI+s/R; x=R*Math.cos(a); z=-S/2+R*Math.sin(a); }
    X.push(x); Z.push(z); Y.push(2*Math.sin(i/n*Math.PI*2));
  }
  return buildFromXYZ(X,Z,Y);
}

// Ribbon with UVs (u across 0..1, v along in 8 m units)
function ribbon(w, dy, color, off, matOpts){
  off=off||0; matOpts=matOpts||{};
  const {renderOrder, ...mo}=matOpts;
  const pos=[], uv=[], idx=[], N=T.N; let s=0;
  for(let i=0;i<N;i++){
    if(i>0) s+=Math.hypot(T.x[i]-T.x[i-1], T.z[i]-T.z[i-1]);
    const cx=T.x[i]+T.lx[i]*off, cz=T.z[i]+T.lz[i]*off;
    pos.push(cx+T.lx[i]*w/2, T.y[i]+dy, cz+T.lz[i]*w/2, cx-T.lx[i]*w/2, T.y[i]+dy, cz-T.lz[i]*w/2);
    uv.push(0,s/8, 1,s/8);
    const a=2*i,b=a+1,c=2*((i+1)%N),d=c+1; idx.push(a,b,c, b,d,c);
  }
  const g=new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.Float32BufferAttribute(pos,3));
  g.setAttribute('uv', new THREE.Float32BufferAttribute(uv,2));
  g.setIndex(idx); g.computeVertexNormals();
  const mesh=new THREE.Mesh(g, new THREE.MeshLambertMaterial(Object.assign({color, side:THREE.DoubleSide}, mo)));
  if(renderOrder!=null) mesh.renderOrder=renderOrder;
  return mesh;
}

// Edge lines are baked into a mipmapped texture so they stay visible/anti-aliased at distance
function asphaltTex(){
  const c=document.createElement('canvas'); c.width=512; c.height=8; const g=c.getContext('2d');
  g.fillStyle='#3a3a40'; g.fillRect(0,0,512,8);
  g.fillStyle='#f2f2f2'; g.fillRect(14,0,15,8); g.fillRect(512-29,0,15,8);
  const t=new THREE.CanvasTexture(c); t.wrapS=t.wrapT=THREE.RepeatWrapping;
  t.anisotropy=renderer.capabilities.getMaxAnisotropy(); return t;
}

// Fence distance per track index (more runoff in sharper turns), kept clear of other parts of the track
function computeFences(){
  const N=T.N, turn=smooth(T.curv,10,2), clr=TRACK_WIDTH/2+1.8; T.fdL=[]; T.fdR=[];
  const clear=(px,pz,i)=>{
    for(let j=0;j<N;j++){ let dj=Math.abs(j-i); if(dj>N/2) dj=N-dj; if(dj<40) continue;
      const dx=px-T.x[j], dz=pz-T.z[j]; if(dx*dx+dz*dz<clr*clr) return false; }
    return true;
  };
  for(let i=0;i<N;i++){
    const want=TRACK_WIDTH/2+4+Math.min(7,turn[i]*28), min=TRACK_WIDTH/2+2.2;
    for(const sg of [1,-1]){
      let d=want; while(d>min && !clear(T.x[i]+T.lx[i]*d*sg, T.z[i]+T.lz[i]*d*sg, i)) d-=1;
      (sg>0?T.fdL:T.fdR).push(d);
    }
  }
}

function buildFences(){
  const grp=new THREE.Group(), N=T.N, step=Math.max(2,Math.floor(N/170)), idxs=[];
  for(let i=0;i<N;i+=step) idxs.push(i);
  const nS=idxs.length, dum=new THREE.Object3D(); dum.rotation.order='YXZ';
  const posts=new THREE.InstancedMesh(new THREE.CylinderGeometry(0.035,0.04,0.9,6), new THREE.MeshLambertMaterial({color:0x8e9098}), nS*2);
  const rails=new THREE.InstancedMesh(new THREE.BoxGeometry(0.05,0.05,1), new THREE.MeshLambertMaterial({color:0xc4c6ce}), nS*4);
  let pi=0, ri=0;
  for(const sg of [1,-1]){
    const pts=idxs.map(i=>{ const d=(sg>0?T.fdL:T.fdR)[i]; return {x:T.x[i]+T.lx[i]*d*sg, y:T.y[i], z:T.z[i]+T.lz[i]*d*sg}; });
    pts.forEach((p,k)=>{
      dum.position.set(p.x,p.y+0.35,p.z); dum.rotation.set(0,0,0); dum.scale.set(1,1,1); dum.updateMatrix(); posts.setMatrixAt(pi++,dum.matrix);
      const q=pts[(k+1)%nS], dx=q.x-p.x, dz=q.z-p.z, dy=q.y-p.y, hl=Math.hypot(dx,dz), len=Math.hypot(hl,dy);
      if(hl>40) return;
      for(const h of [0.3,0.65]){
        dum.position.set((p.x+q.x)/2,(p.y+q.y)/2+h,(p.z+q.z)/2); dum.rotation.set(-Math.atan2(dy,hl),Math.atan2(dx,dz),0); dum.scale.set(1,1,len);
        dum.updateMatrix(); rails.setMatrixAt(ri++,dum.matrix);
      }
    });
  }
  posts.count=pi; rails.count=ri; posts.frustumCulled=rails.frustumCulled=false;
  posts.instanceMatrix.needsUpdate=rails.instanceMatrix.needsUpdate=true;
  grp.add(posts,rails); return grp;
}

function buildTerrainMesh(cx, cz){
  const span=1400, seg=80, geo=new THREE.PlaneGeometry(span, span, seg, seg);
  const pos=geo.attributes.position;
  for(let i=0;i<pos.count;i++){
    const px=cx+pos.getX(i), pz=cz-pos.getY(i);
    const s=sample(px, pz, -1);
    const off=Math.max(0, Math.abs(s.lat)-TRACK_WIDTH*0.55);
    pos.setZ(i, s.h-1.65-off*0.04);
  }
  geo.computeVertexNormals();
  const gnd=new THREE.Mesh(geo, new THREE.MeshLambertMaterial({color:0x3f6b38, flatShading:true}));
  gnd.rotation.x=-Math.PI/2; gnd.position.set(cx,0,cz); gnd.renderOrder=0;
  return gnd;
}

function setTrack(t, label){
  T = t;
  if(trackGroup) scene.remove(trackGroup);
  trackGroup = new THREE.Group();
  const cx=T.x.reduce((a,b)=>a+b)/T.N, cz=T.z.reduce((a,b)=>a+b)/T.N;
  trackGroup.add(buildTerrainMesh(cx, cz));
  const shoulder=18, po=f=>({polygonOffset:true, polygonOffsetFactor:f, polygonOffsetUnits:f});
  trackGroup.add(ribbon(shoulder,-0.14,0x4a7c42,-(TRACK_WIDTH/2+shoulder/2),{renderOrder:0}));
  trackGroup.add(ribbon(shoulder,-0.14,0x456b3a,(TRACK_WIDTH/2+shoulder/2),{renderOrder:0}));
  trackGroup.add(ribbon(TRACK_WIDTH+1.2,0.04,0x45454a,0,Object.assign({renderOrder:2},po(-2))));       // paved border
  trackGroup.add(ribbon(TRACK_WIDTH,0.06,0xffffff,0,Object.assign({renderOrder:3,map:asphaltTex()},po(-4)))); // asphalt + edge lines
  computeFences();
  trackGroup.add(buildFences());
  const line=new THREE.Mesh(new THREE.BoxGeometry(TRACK_WIDTH,0.06,1.25), new THREE.MeshBasicMaterial({color:0xffffff}));
  line.position.set(T.x[0],T.y[0]+0.2,T.z[0]); line.rotation.y=Math.atan2(T.tx[0],T.tz[0]); line.renderOrder=12;
  trackGroup.add(line);
  scene.add(trackGroup);
  document.getElementById('tinfo').textContent = label+' · '+(T.len/1609.34).toFixed(3)+' mi · '+T.N+' pts';
  buildMap(); resetCar(); resetLaps();
}

// ---- minimap (north up) ----
let mapEl, mctx, MS=220;
export function initMinimap(){
  mapEl = document.getElementById('map');
  mctx = mapEl.getContext('2d');
  MS = 220;
  const dpr = window.devicePixelRatio || 1;
  mapEl.width = MS * dpr;
  mapEl.height = MS * dpr;
  mapEl.style.width = MS + 'px';
  mapEl.style.height = MS + 'px';
  mctx.setTransform(1, 0, 0, 1, 0, 0);
  mctx.scale(dpr, dpr);
}
export let mapT=null;
function buildMap(){
  let x0=1e9,x1=-1e9,z0=1e9,z1=-1e9;
  for(let i=0;i<T.N;i++){ x0=Math.min(x0,T.x[i]); x1=Math.max(x1,T.x[i]); z0=Math.min(z0,T.z[i]); z1=Math.max(z1,T.z[i]); }
  const sc=(MS-36)/Math.max(x1-x0,z1-z0,1), ox=MS/2-(x0+x1)/2*sc, oz=MS/2-(z0+z1)/2*sc, path=new Path2D();
  for(let i=0;i<T.N;i+=3){ const px=T.x[i]*sc+ox, pz=T.z[i]*sc+oz; i?path.lineTo(px,pz):path.moveTo(px,pz); }
  path.closePath(); mapT={sc,ox,oz,path};
}
function drawMap(){
  if(!mapT||document.getElementById('mapwrap').style.display==='none') return;
  const m=mapT, c=mctx; c.clearRect(0,0,MS,MS); c.lineJoin='round'; c.lineCap='round';
  c.strokeStyle='rgba(0,0,0,.65)'; c.lineWidth=7; c.stroke(m.path);
  c.strokeStyle='#e8e8ea'; c.lineWidth=4; c.stroke(m.path);
  const sx=T.x[0]*m.sc+m.ox, sz=T.z[0]*m.sc+m.oz;
  c.strokeStyle='#ffd60a'; c.lineWidth=3; c.beginPath();
  c.moveTo(sx+T.lx[0]*7,sz+T.lz[0]*7); c.lineTo(sx-T.lx[0]*7,sz-T.lz[0]*7); c.stroke();
  const cx=car.x*m.sc+m.ox, cz=car.z*m.sc+m.oz, fx=Math.sin(car.psi), fz=Math.cos(car.psi);
  c.fillStyle='#ff3b30'; c.strokeStyle='#fff'; c.lineWidth=1.5; c.beginPath();
  c.moveTo(cx+fx*10,cz+fz*10); c.lineTo(cx-fx*6+fz*6,cz-fz*6-fx*6); c.lineTo(cx-fx*6-fz*6,cz-fz*6+fx*6);
  c.closePath(); c.fill(); c.stroke();
  c.fillStyle='#fff'; c.font='11px system-ui'; c.fillText('N ↑',MS-30,16);
}

function sample(px, pz, guess){
  const N=T.N; let best=1e18, bi=0;
  const test=i=>{ const d=(px-T.x[i])**2+(pz-T.z[i])**2; if(d<best){best=d;bi=i;} };
  if(guess<0) for(let i=0;i<N;i++) test(i);
  else for(let k=-25;k<=25;k++) test((guess+k+N)%N);
  let j=bi;
  if((px-T.x[bi])*T.tx[bi]+(pz-T.z[bi])*T.tz[bi] < 0) j=(bi-1+N)%N;
  const n=(j+1)%N, sx=T.x[n]-T.x[j], sz=T.z[n]-T.z[j], sl=Math.hypot(sx,sz);
  const f=Math.max(0,Math.min(1,((px-T.x[j])*sx+(pz-T.z[j])*sz)/(sl*sl)));
  const qx=T.x[j]+sx*f, qz=T.z[j]+sz*f;
  return {idx:bi, lat:(px-qx)*T.lx[j]+(pz-qz)*T.lz[j], h:T.y[j]+(T.y[n]-T.y[j])*f, slope:(T.y[n]-T.y[j])/sl};
}

// ====================== CAR / PHYSICS ======================
export const car = {x:0,z:0,psi:0,u:0,v:0,r:0,steer:0,sin:0,thr:0,h:0,idx:0,ax:0,ay:0,slope:0,off:false,
             E:CAR.capWh, Pbatt:0, Psolar:0, Pregen:0};
export function resetCar(){
  const i=T.N-6;
  car.x=T.x[i]; car.z=T.z[i]; car.psi=Math.atan2(T.tx[i],T.tz[i]);
  car.u=car.v=car.r=car.steer=car.sin=car.thr=car.wheelAngle=car.ax=car.ay=car.slope=0;
  car.Pregen=0; car.idx=i; car.h=T.y[i]; car.off=false; car.E=CAR.capWh;
  camYaw=car.psi;
}

const keys={up:0,down:0,left:0,right:0};
export function clearDriveKeys(){ keys.up=keys.down=keys.left=keys.right=0; }

function tire(y){ return Math.sin(CAR.C*Math.atan(y-CAR.E*(y-Math.atan(y)))); }

function step(dt){
  const m=P.mass, L=CAR.L, b=P.wf*L, a=L-b, Iz=m*a*b;
  const s=sample(car.x,car.z,car.idx); car.idx=s.idx;
  car.off = Math.abs(s.lat) > TRACK_WIDTH/2+0.5;
  const mu = P.mu*(car.off?0.5:1);
  let {u,v,r}=car;

  const tin=keys.left-keys.right, rate=(tin===0||tin*car.sin<0)?7:3.5;
  car.sin+=Math.max(-rate*dt,Math.min(rate*dt,tin-car.sin));
  car.wheelAngle=car.sin*0.38;
  const smax=Math.min(0.4, 0.95*CAR.L*mu*G/(u*u+36));
  car.steer=car.sin*smax;
  // Pedal: held = drive; released = auto regen (cut while friction braking)
  if(keys.up) car.thr=Math.min(1, car.thr+dt*8);
  else car.thr=0;
  const st=car.steer;
  const latScale=(u*u)/(u*u+49);

  const down=CAR.downC*u*u+CAR.downD*Math.abs(u), W=m*G*Math.cos(Math.atan(car.slope))+down;
  let Fzf=W*P.wf - 0.5*m*car.ax*CAR.h/L, Fzr=W*(1-P.wf) + 0.5*m*car.ax*CAR.h/L;
  const mn=0.1*m*G/2; Fzf=Math.max(mn,Fzf); Fzr=Math.max(mn,Fzr);

  let Fb=0; if(keys.down && u>0.2) Fb=0.62*mu*W;
  const gs=Math.sqrt(Math.max(0.4,1-(Fb/(mu*W))**2));

  const Pw=P.motorKW*P.motors*1000*CAR.motorEff;
  const uMot=Math.max(u,1.8);
  let Fx=0, Fregen=0, PregenIn=0;
  if(car.thr>0){
    Fx=car.thr*Math.min(Pw/uMot, 1e5);
    Fx=Math.min(Fx, mu*Fzr);
  } else if(!keys.down && u>CAR.regenUMin){
    const PregenCap=P.motorKW*P.motors*1000*CAR.regenPowerFrac;
    Fregen=Math.min(PregenCap/u, mu*Fzr*0.9);
    PregenIn=Fregen*u*CAR.regenEff;
  }

  const FxTire=Math.abs(Fx)+Fregen;
  const rb=keys.down?1.15:CAR.rearBias;
  const FyrMax=Math.sqrt(Math.max(0,(mu*Fzr)**2-FxTire*FxTire))*gs*rb, FyfMax=mu*Fzf*gs;
  const vx=Math.abs(u)+2.5;
  const af=Math.atan2(v+a*r,vx)-st, ar=Math.atan2(v-b*r,vx);
  const Fyf=-FyfMax*tire(P.B*0.82*af)*latScale;
  const Fyr=-FyrMax*tire(P.B*0.82*ar)*latScale;

  const aeroDrag=CAR.aeroA*u*u+CAR.aeroB*Math.abs(u);
  const crr=CAR.Crr0+CAR.Crr1*u+CAR.Crr2*u*u+(car.off?0.06:0);
  const drag=(aeroDrag+crr*W)*Math.sign(u);

  const Ftot=Fx-Fregen-Fb-drag-Fyf*Math.sin(st);
  car.ax += (Ftot/m-car.ax)*Math.min(1,dt*6);
  car.ay = (Fyf*Math.cos(st)+Fyr)/m;
  u+=(Ftot/m+v*r)*dt;
  v+=(car.ay-u*r)*dt;
  r+=((a*Fyf*Math.cos(st)-b*Fyr)/Iz)*latScale*dt;
  if(u<0) u=0;
  // low speed: blend to kinematic bicycle (yaw rate = u*tan(steer)/L) -> steering at a standstill only angles the wheels
  const wk=Math.max(0,1-u/5);
  if(wk>0) r+=(u*Math.tan(st)/L-r)*Math.min(1,wk*dt*12);
  r*=Math.exp(-dt*0.5);                                   // mild yaw damping
  if(keys.down){ v*=Math.exp(-dt*4); r*=Math.exp(-dt*5); }  // stronger while braking
  if(u<4) v*=Math.exp(-dt*(4-u)*2.5);
  car.psi+=r*dt;
  const fx=Math.sin(car.psi), fz=Math.cos(car.psi), lx=fz, lz=-fx;
  car.x+=(u*fx+v*lx)*dt; car.z+=(u*fz+v*lz)*dt;

  // fence collision: push back, kill outward velocity, scrape speed
  const sc=sample(car.x,car.z,car.idx), sg=sc.lat>0?1:-1, lim=(sg>0?T.fdL[sc.idx]:T.fdR[sc.idx])-0.9;
  if(Math.abs(sc.lat)>lim){
    const over=Math.abs(sc.lat)-lim, nx=T.lx[sc.idx]*sg, nz=T.lz[sc.idx]*sg;
    car.x-=nx*over; car.z-=nz*over;
    const vn=(u*fx+v*lx)*nx+(u*fz+v*lz)*nz;
    if(vn>0){ u-=1.3*vn*(nx*fx+nz*fz); v-=1.3*vn*(nx*lx+nz*lz); }
    u=Math.max(0,u)*Math.exp(-dt*3);
  }

  const s2=sample(car.x,car.z,car.idx); const dy=s2.h-car.h; car.h=s2.h;
  car.slope += (s2.slope-car.slope)*Math.min(1,dt*5);
  const sp2=u*u+v*v;
  if(sp2>0.5){ const k=Math.sqrt(Math.max(0.04,sp2-2*G*dy)/sp2); u*=k; v*=k; }
  car.u=u; car.v=v; car.r=r;

  const Pmot=Math.max(0,Fx*u)/CAR.motorEff;
  car.Pregen=PregenIn;
  car.Psolar=P.irr*CAR.area*CAR.cellEff*CAR.mppt;
  const Pnet=Pmot-PregenIn+CAR.auxW/CAR.vicor-car.Psolar;
  const I=Pnet/CAR.Vpack, loss=I*I*(CAR.Rint+CAR.Rharn);
  car.Pbatt=Pnet+loss;
  car.E=Math.min(CAR.capWh, Math.max(0, car.E-car.Pbatt*dt/3600));

  const prev=car.idx; car.idx=s2.idx;
  if(simT>0||u>0.5) simT+=dt;
  if(prev>T.N*0.75 && car.idx<T.N*0.25){
    if(raceHooks.onCrossLine) raceHooks.onCrossLine();
    if(!raceHooks.suppressPracticeLaps) crossLine();
  }
  if(car.idx>T.N*0.4 && car.idx<T.N*0.6) halfway=true;
  if(raceHooks.onStep) raceHooks.onStep(dt);
}

// ====================== LAPS / HUD ======================
export let simT=0, lapStart=null, halfway=false, lastLap=null, bestLap=null, lapCount=0;
/** Full history wipe (track load / new session). */
function resetLaps(){ simT=0; lapStart=null; halfway=false; lastLap=null; bestLap=null; lapCount=0; car.E=CAR.capWh; }
/** Abort only the lap in progress — keeps last/best/count. */
function resetCurrentLap(){ lapStart=null; halfway=false; car.E=CAR.capWh; }
function crossLine(){
  if(lapStart!==null && halfway){
    lastLap=simT-lapStart; lapCount++;
    if(bestLap===null||lastLap<bestLap) bestLap=lastLap;
  }
  lapStart=simT; halfway=false;
}
export const fmt=t=>t==null?'–':Math.floor(t/60)+':'+(t%60).toFixed(3).padStart(6,'0');
export function hud(){
  const mph=Math.round(car.u*2.23694);
  const spEl=document.getElementById('speed');
  spEl.textContent=mph+' mph';
  spEl.classList.toggle('over', mph>=RULES_MAX_MPH);
  if(raceHooks.hudExtra){
    document.getElementById('laps').innerHTML=raceHooks.hudExtra();
    return;
  }
  document.getElementById('laps').innerHTML=
    'Lap '+(lapCount+1)+' · '+fmt(lapStart===null?0:simT-lapStart)+'<br>Last '+fmt(lastLap)+' · Best '+fmt(bestLap)+
    '<br>SOC '+(car.E/CAR.capWh*100).toFixed(1)+'% · batt '+Math.round(car.Pbatt)+' W · solar '+Math.round(car.Psolar)+' W'+
    (car.Pregen>1?' · regen '+Math.round(car.Pregen)+' W':'')+
    (car.off?'<br><span style="color:#ffb">off track</span>':'');
}

// ====================== INPUT / UI ======================
export let camMode=0;
function setCam(m){
  camMode=m;
  // Stay inside the car: keep body/array visible; only hide third-person bits
  car3d.visible=true;
  shadow.visible=(m===0);
  if(car3d.userData.helmet) car3d.userData.helmet.visible=(m===0);
  camera.near=m?0.05:0.2;
  camera.fov=m?85:65; camera.updateProjectionMatrix();
  document.getElementById('dash').style.display=m?'block':'none';
}
export function setTune(open){
  document.getElementById('tune').style.display=open?'block':'none';
  document.getElementById('topen').style.display=open?'none':'block';
  document.getElementById('mapwrap').style.display=open?'none':'block';
}
export function refreshSliders(){
  const box=document.getElementById('sliders');
  if(!box) return;
  [...box.children].forEach(r=>{ if(r._show) r._show(); });
}

export function bindUI(){
const KM={ArrowUp:'up',ArrowDown:'down',ArrowLeft:'left',ArrowRight:'right'};
const typingTarget=el=>{
  if(!el||el===document.body) return false;
  const t=el.tagName;
  return t==='INPUT'||t==='TEXTAREA'||t==='SELECT'||el.isContentEditable;
};
addEventListener('keydown',e=>{
  if(typingTarget(e.target)) return;
  if(raceHooks.blockKeys) return;
  const k=KM[e.key]; if(k){ keys[k]=1; e.preventDefault(); }
  if(e.repeat) return;
  const c=e.key.toLowerCase();
  if(c==='r'){
    if(raceHooks.onReset) raceHooks.onReset();
    else { resetCar(); resetCurrentLap(); }
  }
  if(raceHooks.lockCameraKeys) return;
  if(c==='c') setCam(1-camMode);
  if(c==='t') setTune(document.getElementById('tune').style.display==='none');
});
addEventListener('keyup',e=>{
  if(typingTarget(e.target)) return;
  if(raceHooks.blockKeys){
    keys.up=keys.down=keys.left=keys.right=0;
    return;
  }
  const k=KM[e.key]; if(k){ keys[k]=0; e.preventDefault(); }
});
document.getElementById('tclose').onclick=()=>setTune(false);
document.getElementById('topen').onclick=e=>{ setTune(true); e.target.blur(); };

const box=document.getElementById('sliders');
SP.forEach(([key,label,min,max,stp])=>{
  const row=document.createElement('div');
  row.innerHTML='<label><span>'+label+'</span><b></b></label><input type="range" min="'+min+'" max="'+max+'" step="'+stp+'">';
  const inp=row.querySelector('input'), val=row.querySelector('b');
  const show=()=>{inp.value=P[key]; val.textContent=P[key];};
  inp.addEventListener('input',()=>{P[key]=parseFloat(inp.value); val.textContent=P[key];});
  inp.addEventListener('change',()=>{ inp.blur(); if(key==='elev'&&RAW) loadRaw(RAW,RAWLABEL); });
  row._show=show; show(); box.appendChild(row);
});
document.getElementById('resetp').onclick=e=>{ Object.assign(P,DEFAULTS); refreshSliders(); e.target.blur(); };
document.getElementById('resetb').onclick=e=>{ resetCar(); resetCurrentLap(); e.target.blur(); };
}

// ====================== LOOP ======================
export let camYaw=0, lookYaw=0, last=performance.now(), acc=0;
const qA=new THREE.Quaternion(), qB=new THREE.Quaternion(), Y=new THREE.Vector3(0,1,0), X=new THREE.Vector3(1,0,0), eye=new THREE.Vector3(), lookAtPt=new THREE.Vector3();
export function frame(now){
  const fdt=Math.min(0.05,(now-last)/1000); acc+=fdt; last=now;
  const DT=1/120; while(acc>=DT){ step(DT); acc-=DT; }
  const roll=Math.max(-0.06,Math.min(0.06,0.004*car.ay));
  car3d.position.set(car.x,car.h+0.07,car.z);
  car3d.rotation.set(-Math.atan(car.slope), car.psi, roll);
  carFrontWheels.forEach(w=>{ w.rotation.y=car.wheelAngle||0; });
  const sa=car.u*fdt/0.26; carSpin.forEach(s=>{ s.rotation.x+=sa; });
  shadow.position.set(car.x,car.h+0.085,car.z); shadow.rotation.set(-Math.atan(car.slope),car.psi,0);
  car3d.updateMatrixWorld(true);
  if(camMode===1){
    // Low seat inside offset cockpit — deck/array sits ahead in the upper FOV
    eye.copy(car3d.userData.cockpitEye); car3d.localToWorld(eye); camera.position.copy(eye);
    car3d.getWorldQuaternion(qA);
    lookYaw+=(Math.max(-0.35,Math.min(0.35,car.r*0.45))-lookYaw)*0.12;
    qB.setFromAxisAngle(Y, lookYaw); qA.multiply(qB);
    qB.setFromAxisAngle(Y, Math.PI); qA.multiply(qB);
    // slight pitch down from helmet height through the canopy
    qB.setFromAxisAngle(X, 0.06); qA.multiply(qB);
    camera.quaternion.copy(qA);
  } else {
    // Chase: hard-follow position (no longitudinal lerp jitter), soft-follow yaw only.
    // Same heading for camera offset and look-at so they don't fight.
    let d=car.psi-camYaw; d=Math.atan2(Math.sin(d),Math.cos(d));
    const kYaw=1-Math.exp(-fdt*6.5);
    camYaw+=d*kYaw;
    const sx=Math.sin(camYaw), cz=Math.cos(camYaw);
    camera.position.set(car.x-sx*7.5, car.h+2.6, car.z-cz*7.5);
    lookAtPt.set(car.x+sx*3, car.h+0.8, car.z+cz*3);
    camera.lookAt(lookAtPt);
  }
  hud(); drawMap(); renderer.render(scene,camera);
  requestAnimationFrame(frame);
}


export {
  renderer, scene, camera, car3d, carFrontWheels, carSpin, shadow,
  smooth, buildFromXYZ, parseCSV, mockOval, loadRaw, setTrack, sample,
  step, resetLaps, resetCurrentLap, crossLine, buildMap, drawMap, setCam,
};
