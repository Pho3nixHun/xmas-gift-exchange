import { startChristmasFacts } from './facts.js';

const $=s=>document.querySelector(s),ui=$('#ui'),pins=$('#hotspots'),storageKey='winter-house-3d-v1';
const names=['Anna','Péter','Kata','Nagyi','Bence','Dóri','Márk','Zsófi'];
const esc=v=>String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const memory={};const read=k=>{try{return localStorage.getItem(k);}catch{return memory[k];}};const write=(k,v)=>{memory[k]=v;try{localStorage.setItem(k,v);}catch{}};
function fresh(){return {user:null,assignments:{},pools:{},passwords:{},wishes:{},claims:{'Kata-1':'other','Anna-1':'other','Nagyi-1':'other'},large:false};}
let state;try{state=JSON.parse(read(storageKey))||fresh();if(!state.pools)state=fresh();}catch{state=fresh();}
let lang=read('winter-house-lang')||(navigator.language.startsWith('en')?'en':'hu'),view='outside',selected='',browse='',busy=false,toastTimer,editing=null,sound=null,pageIndex=0,boardPage=0,editorOpen=false;
const drafts=new Map();
const board=document.querySelector('#board-surface'),paperSurface=document.querySelector('#paper-surface');
const save=()=>write(storageKey,JSON.stringify(state));
const copy={
 en:{brand:'the little<br><b>winter house</b>',title:'There’s a light<br><em>on for you.</em>',eyebrow:'A small world. A little Christmas magic.',intro:'Somewhere beyond the snow, a fire is crackling. And someone’s Christmas is waiting for you.',begin:'Follow the lights',note:'Take your time. It’s warm inside.',doorTitle:'You made it.',doorIntro:'The door’s open. The kettle’s on.',knock:'Knock, knock',doorNote:'Or tap the red door. Don’t be shy.',identityTitle:'Look who’s here.',identityIntro:'Hang your coat. Find your name. The cat will be with you in a moment.',identityEyebrow:'Come in. Make yourself at home.',passwordTitle:'Our little secret.',passwordIntro:'A password keeps curious noses out of your Christmas.',password:'Your password',passwordNew:'Choose a password',passwordHint:'At least four characters. We’ll remember you here.',passwordWrong:'Not quite. Try your password again.',continue:'Make yourself at home',back:'Back',protected:'Password protected',roomTitle:'The good kind of chaos.',roomIntro:'A tree full of secrets. A desk for your wishes. A cat with absolutely no self-control.',tree:'The tree',desk:'My wishes',letters:'Everyone',home:'The room',recipient:'My person',treePin:'Pick a little secret',deskPin:'Leave a little wish',lettersPin:'The family’s wishes',catPin:'Definitely up to something',treeTitle:'Pick something shiny.',treeIntro:'The cat has been waiting all evening for this.',remaining:'{n} little secrets left',taken:'Already chosen',baubleLabel:'Choose secret ornament {n}',warning:'One tap, one person. Your choice is final. The cat will fetch the ornament you choose.',revealEye:'Psst. Just between you and the cat.',revealTitle:'Your someone is',revealBody:'A little thought from you. A very big smile from them. The rest stays a lovely secret.',revealAction:'See their little wishes',recipientEye:'Your secret someone',recipientIntro:'A few hints from them. A little thoughtfulness from you.',deskTitle:'A little note to your Santa.',deskIntro:'What would make you smile this Christmas?',lettersTitle:'A little wish from everyone.',lettersIntro:'Quietly coordinate a surprise. Its owner won’t see a thing.',wishCount:'{n} wishes',ownIntro:'These wishes are visible to the others. Their plans stay a surprise.',addWish:'+ Write a little wish',claim:'I’ll take care of this',release:'Release this wish',claimed:'A surprise is in the works',claimedToast:'Saved for you. They won’t see a thing.',releaseToast:'This little wish is available again.',empty:'Still dreaming up something lovely.<br>Pop back in a little while.',ownEmpty:'A favourite book? An afternoon together?<br>A little hint would be lovely.',high:'Would really love this',medium:'Would be lovely',low:'Just a little idea',book:'A book to get lost in',bookDesc:'Your favourite novel would be lovely, too. I like a book with a story before it even reaches me.',cup:'A very big, handmade mug',cupDesc:'The little ones never hold enough tea. Earthy colours and a slightly wonky shape, please.',time:'An afternoon, just us',timeDesc:'A walk, a coffee, or baking something together. Mostly, I’d like us not to be in a hurry.',rules:'Our little agreement',rulesBody:'Around €25–40. Something thoughtful, personal, or shared. Let’s skip the filler gifts and the last-minute panic buys.',ruleNote:'They’ll remember the thought, not the price tag.',secret:'Only you can see who you picked.',addTitle:'What would make you smile?',editTitle:'A little change of wish.',description:'Your wish',url:'A link, if you have one',priority:'How much would you love it?',saveWish:'Put it on my list',saveEdit:'Save changes',cancel:'Never mind',edit:'Edit',delete:'Remove',saved:'Written down. Your secret giver can see it now.',deleted:'Wish removed.',invalid:'Write a few words about what you’d like.',invalidUrl:'Use a full http:// or https:// web address.',preview:'Link previews aren’t connected in this local prototype.',link:'Take a look ↗',language:'Váltás magyarra',soundOn:'Sound on',soundOff:'Sound off',pause:'Pause ambient motion',resume:'Resume ambient motion',menu:'Open menu',closeMenu:'Close menu',refresh:'Refresh wishes',refreshDone:'All your wishes are up to date.',signout:'Sign out',restart:'Replay from the snowy street',compare:'Illustrated fallback',large:'Try 30 people',small:'Back to 8 people',demo:'Interactive 3D prototype · local sample data',catSays:'Prrr. The wrapping paper is mine.',bellSays:'Ding. Someone’s definitely home.',moving:'Just a little closer…',chapterOutside:'A light in the window',chapterDoor:'At the doorstep',chapterInside:'Make yourself at home',chapterTree:'A perfectly good bad idea',chapterReveal:'Your little secret',chapterDesk:'A little wish',chapterLetters:'All together',gesture:'Drag gently to look around',loading:'A little Christmas is taking shape.',loadingSmall:'Lighting the windows. Waking the cat.',error:'The little house couldn’t open its doors.',errorBody:'This experience needs WebGL 2. Try a browser with graphics acceleration enabled, or open the illustrated prototype.',fallback:'Open the illustrated prototype',retry:'Try again',noPick:'Visit the tree to choose your person first.'},
 hu:{brand:'a kis<br><b>karácsonyi ház</b>',title:'Ég egy fény.<br><em>Téged várunk.</em>',eyebrow:'Egy apró világ. Egy kis karácsonyi varázslat.',intro:'Valahol a hóesés mögött pattog a tűz. És valakinek a karácsonya épp rád vár.',begin:'Követem a fényeket',note:'Nem kell sietni. Idebent jó meleg van.',doorTitle:'Megjöttél.',doorIntro:'Nyitva az ajtó. Már forr a víz.',knock:'Kipp-kopp',doorNote:'Vagy bökj a piros ajtóra. Gyere bátran.',identityTitle:'Ki jött meg?',identityIntro:'A kabátodat hagyd a széken. Keresd meg a neved. A cica mindjárt jön.',identityEyebrow:'Gyere beljebb. Érezd otthon magad.',passwordTitle:'Csak köztünk marad.',passwordIntro:'Egy kis jelszó, hogy a kíváncsi orrok ne szimatolják ki a meglepetést.',password:'Jelszavad',passwordNew:'Válassz egy jelszót',passwordHint:'Legalább négy karakter. Itt megjegyzünk legközelebbre.',passwordWrong:'Ez most nem stimmelt. Próbáld meg még egyszer.',continue:'Jöhet a karácsony',back:'Vissza',protected:'Jelszóval védve',roomTitle:'A jóleső felfordulás.',roomIntro:'Titkok a fán, kívánságok az asztalon. A cica pedig már alig bír magával.',tree:'A fa',desk:'Kívánságaim',letters:'Mindenki',home:'A szoba',recipient:'A húzottam',treePin:'Válassz egy kis titkot',deskPin:'Írj egy kívánságot',lettersPin:'A család kívánságai',catPin:'Biztosan készül valamire',treeTitle:'Melyiket nézted ki?',treeIntro:'A cica egész este erre a pillanatra várt.',remaining:'{n} kis titok vár még',taken:'Már elkelt',baubleLabel:'A(z) {n}. titkos dísz kiválasztása',warning:'Egy bökés, egy név. A választás végleges. A cica azt a díszt hozza le, amelyikre ráböksz.',revealEye:'Psszt. Csak te és a cica tudjátok.',revealTitle:'Idén neki szerzel örömet:',revealBody:'Egy kis figyelmesség tőled. Egy nagy mosoly tőle. A többi maradjon meglepetés.',revealAction:'Lássuk, mire vágyik',recipientEye:'A te titkos ünnepelted',recipientIntro:'Néhány ötlet tőle. A meglepetést már te teszed hozzá.',deskTitle:'Egy kis súgás az angyalkádnak.',deskIntro:'Minek örülnél idén karácsonykor?',lettersTitle:'Mindenkinek van egy kis álma.',lettersIntro:'Itt titokban összebeszélhettek. Az ünnepelt ebből semmit sem lát.',wishCount:'{n} kívánság',ownIntro:'A többiek látják a kívánságaidat. A terveik meglepetések maradnak.',addWish:'+ Felírok egy kívánságot',claim:'Ezt én intézem',release:'Mégsem én veszem',claimed:'Már készül a meglepetés',claimedToast:'Félretettük neked. Ő ebből semmit sem lát.',releaseToast:'Újra szabad az ötlet.',empty:'Még szövögeti a kívánságait.<br>Nézz vissza egy kicsit később.',ownEmpty:'Egy jó könyv? Egy közös délután?<br>Egy kis súgás jól jönne.',high:'Nagyon örülnék neki',medium:'Jó lenne',low:'Csak egy ötlet',book:'Egy könyv, amibe bele lehet feledkezni',bookDesc:'Jöhet egy kedvenc regényed is. Szeretem, ha egy könyvnek története van, mielőtt hozzám kerül.',cup:'Egy jó nagy, kézzel készült bögre',cupDesc:'A kicsikbe sosem fér elég tea. Földszínek, kicsit szabálytalan forma — pont úgy szeretem.',time:'Egy közös, ráérős délután',timeDesc:'Séta, kávé, vagy süssünk valamit együtt. A lényeg, hogy ne siessünk sehova.',rules:'Amiben megegyeztünk',rulesBody:'Kb. 10–15 ezer Ft. Valami személyes, figyelmes, vagy egy közös élmény. A sok apró kacatot és a kapkodva vett ajándékot most hagyjuk.',ruleNote:'Nem az árcédulára fog emlékezni.',secret:'Csak te látod, kit húztál.',addTitle:'Minek örülnél?',editTitle:'Egy kis változás a kívánságban.',description:'A kívánságod',url:'Link, ha van',priority:'Mennyire szeretnéd?',saveWish:'Felírom',saveEdit:'Mentés',cancel:'Mégsem',edit:'Szerkesztés',delete:'Törlés',saved:'Felírtuk. Már láthatja, aki téged húzott.',deleted:'Töröltük a kívánságot.',invalid:'Írj pár szót arról, minek örülnél.',invalidUrl:'Teljes webcímet adj meg, http:// vagy https:// kezdettel.',preview:'Ebben a helyi mintában a linkelőnézet még nincs bekötve.',link:'Megnézem ↗',language:'Switch to English',soundOn:'Hang be',soundOff:'Hang ki',pause:'Mozgás szüneteltetése',resume:'Mozgás indítása',menu:'Menü megnyitása',closeMenu:'Menü bezárása',refresh:'Kívánságok frissítése',refreshDone:'Minden kívánság a helyén.',signout:'Kilépés',restart:'Újra a havas utcáról',compare:'Illusztrált tartaléknézet',large:'Kipróbálom 30 fővel',small:'Vissza 8 főre',demo:'Interaktív 3D prototípus · helyi mintaadatok',catSays:'Mrrr. A csomagolópapír az enyém.',bellSays:'Ding. Valaki biztosan van itthon.',moving:'Még egy kicsit közelebb…',chapterOutside:'Fény az ablakban',chapterDoor:'A küszöbön',chapterInside:'Itthon vagy',chapterTree:'Egy remek rossz ötlet',chapterReveal:'A te kis titkod',chapterDesk:'Egy kis kívánság',chapterLetters:'Mind együtt',gesture:'Húzd finoman, és nézz körül',loading:'Mindjárt kész a kis karácsony.',loadingSmall:'Fények az ablakba. Ébresztő a cicának.',error:'Most nem nyílt ki a kis ház ajtaja.',errorBody:'Ehhez az élményhez WebGL 2 szükséges. Próbáld bekapcsolt grafikus gyorsítással, vagy nyisd meg az illusztrált változatot.',fallback:'Az illusztrált változat',retry:'Újra próbálom',noPick:'Előbb válassz valakit a karácsonyfánál.'}
};
Object.assign(copy.en,{identityIntro:'Before we open the door: which one is you?',identityEyebrow:'A familiar face at the doorstep',favouriteHint:'Give this wish a little extra sparkle.',factTitle:'A little Christmas curiosity',nextFact:'Another little fact',previousWish:'Previous wish',nextWish:'Next wish',previousNames:'Previous names',nextNames:'More names',closePaper:'Put the notes away',pageOf:'{n} of {total}',writing:'A note from you',boardHint:'Choose a name. Unfold a little wish.',bought:'I’m buying this',reserved:'Set aside by you',outsideHint:'Tap outside the paper to return to the room'});
Object.assign(copy.hu,{identityIntro:'Mielőtt ajtót nyitunk: melyik név a tiéd?',identityEyebrow:'Ismerős arc a küszöbön',favouriteHint:'Ez a kívánság külön csillagot érdemel.',factTitle:'Egy kis karácsonyi érdekesség',nextFact:'Még egy érdekesség',previousWish:'Előző kívánság',nextWish:'Következő kívánság',previousNames:'Előző nevek',nextNames:'További nevek',closePaper:'Elteszem a lapokat',pageOf:'{n} / {total}',writing:'Egy kis üzenet tőled',boardHint:'Válassz egy nevet. Nézz bele a kívánságaiba.',bought:'Ezt megveszem',reserved:'Ezt te intézed',outsideHint:'Bökj a papíron kívülre, és visszatérsz a szobába'});
if(!copy[lang])lang='hu';const t=(k,args={})=>Object.entries(args).reduce((s,[key,v])=>s.replaceAll(`{${key}}`,v),copy[lang][k]||k);
const extraNames=['Ági','Balázs','Csilla','Dani','Eszter','Feri','Gabi','Hanna','Ildi','János','Klári','Laci','Misi','Nóri','Orsi','Pali','Réka','Sári','Tomi','Vera','Zoli','Zsuzsi'];
const roster=()=>state.large?[...names,...extraNames]:names;
function sampleWishes(name){if(state.wishes[name])return state.wishes[name];if(name==='Péter'||name==='Bence'||extraNames.includes(name))return [];return ['book','cup','time'].map((kind,i)=>({id:`${name}-${i}`,kind,priority:['high','medium','low'][i]}));}
function title(w){return w.kind?t(w.kind):w.description;}function description(w){return w.kind?t(w.kind+'Desc'):'';}
function pool(){
 if(!state.pools[state.user]){
   const arr=roster().filter(n=>n!==state.user);
   for(let i=arr.length-1;i>0;i--){const j=Math.floor(Math.random()*(i+1));[arr[i],arr[j]]=[arr[j],arr[i]];}
   state.pools[state.user]=arr.map((name,i)=>({name,taken:i>0&&i%5===0}));
 }
 const slots=state.pools[state.user];
 if(slots.some(s=>!Number.isInteger(s.color))){
   const colors=slots.map((_,i)=>i%4);
   for(let i=colors.length-1;i>0;i--){const j=Math.floor(Math.random()*(i+1));[colors[i],colors[j]]=[colors[j],colors[i]];}
   slots.forEach((slot,i)=>slot.color=colors[i]);save();
 }
 return slots;
}
const action=(text,id,cls='',extra='')=>`<button class="action ${cls}" data-action="${id}" ${extra}>${text}</button>`;
const heading=(eye,title,body='',cls='')=>`<section class="scene-heading ${cls}"><p class="eyebrow">${eye}</p><h1>${title}</h1>${body?`<p>${body}</p>`:''}</section>`;
function announce(message){$('#toast').textContent=message;$('#toast').classList.add('visible');clearTimeout(toastTimer);toastTimer=setTimeout(()=>$('#toast').classList.remove('visible'),4200);}
function rules(){return `<details class="rules" ${read('winter-house-rules')==='open'?'open':''}><summary>${t('rules')}</summary><p>${t('rulesBody')}</p><p><em>${t('ruleNote')}</em></p></details>`;}
function drawPins(){pins.innerHTML='';const add=(id,label,action,extra='',className='')=>{const b=document.createElement('button');b.className='world-pin '+className;b.dataset.anchor=id;b.dataset.action=action;b.setAttribute('aria-label',label);b.textContent=label;if(extra)b.dataset.index=extra;pins.append(b);return b;};if(busy)return;
 if(view==='outside')add('door',t('knock'),'walk');
 if(view==='room'){if(!state.assignments[state.user])add('tree',t('treePin'),'visit-tree');else add('recipient',t('recipient'),'visit-recipient');add('desk',t('deskPin'),'visit-desk');add('letters',t('lettersPin'),'visit-letters');add('sofa',lang==='en'?'Catnap':'Cicaszundi','catnap');const cookie=add('cookies',lang==='en'?(world.cookiesLeft?'A cookie?':'All gone'):(world.cookiesLeft?'Egy süti?':'Elfogyott'),'eat-cookie');cookie.disabled=world.cookieBusy||!world.cookiesLeft;}
 if(view==='tree')pool().forEach((slot,i)=>{if(pool().length>10&&Math.floor(i/6)!==world.ornamentPage)return;const b=add('bauble-'+i,slot.taken?t('taken'):t('baubleLabel',{n:i+1}),'pick',String(i),'round '+(slot.taken?'taken':''));b.disabled=slot.taken;});
}
function card(w,own){const mine=state.claims[w.id]===state.user,taken=!!state.claims[w.id];return `<article class="wish-row"><span class="priority">${w.priority==='high'?'✦':'◇'} ${t(w.priority)}</span><h2>${esc(title(w))}</h2>${description(w)?`<p>${esc(description(w))}</p>`:''}${safeUrl(w.url)?`<a href="${esc(w.url)}" target="_blank" rel="noopener noreferrer">${t('link')}</a>`:''}${own?`<div class="paper-actions"><button data-action="edit" data-id="${esc(w.id)}">${t('edit')}</button><button data-action="delete" data-id="${esc(w.id)}">${t('delete')}</button></div>`:`<button class="claim-button ${mine?'mine':''}" data-action="claim" data-id="${esc(w.id)}" ${taken&&!mine?'disabled':''}>${mine?'✓ ':''}${t(mine?'release':taken?'claimed':'bought')}</button>`}</article>`;}
function drawBoard(){
 const people=roster().filter(n=>n!==state.user),pages=Math.ceil(people.length/8);boardPage=Math.min(boardPage,pages-1);
 board.innerHTML=`<div class="pinned-names">${people.slice(boardPage*8,boardPage*8+8).map((n,i)=>`<button class="name-note ${n===(browse||(view==='recipient'?state.assignments[state.user]:null))?'selected-name':''}" style="--tilt:${[-3,2,1,-2,3,-1,2,-3][i]}deg" data-action="browse" data-name="${esc(n)}">${esc(n)}</button>`).join('')}</div>${pages>1?`<div class="board-pages"><button data-action="board-page" data-direction="-1" aria-label="${t('previousNames')}" ${boardPage===0?'disabled':''}>←</button><span>${boardPage+1} / ${pages}</span><button data-action="board-page" data-direction="1" aria-label="${t('nextNames')}" ${boardPage===pages-1?'disabled':''}>→</button></div>`:''}`;
 board.hidden=!state.user||['outside','door','identity','password'].includes(view);
 board.classList.toggle('interactive',view==='letters'&&!browse&&!busy);
 board.inert=view!=='letters'||!!browse||busy;
}
function editor(){
 const w=editing?sampleWishes(state.user).find(w=>w.id===editing):null,d=drafts.get(editing||'new')||{description:w?title(w)+(description(w)?'\n'+description(w):''):'',url:w?.url||'',priority:w?.priority||'medium'};
 return `<div class="wish-editor"><h2 id="editor-heading">${t(editing?'editTitle':'addTitle')}</h2><form id="wish-form"><label>${t('description')}<textarea name="description" maxlength="500" required>${esc(d.description)}</textarea></label><label>${t('url')}<input name="url" type="url" value="${esc(d.url)}" placeholder="https://…"></label><fieldset class="wish-priorities"><legend>${t('priority')}</legend>${['high','medium','low'].map(p=>`<label class="wish-favourite"><input type="radio" name="priority" value="${p}" ${d.priority===p?'checked':''}><span class="pencil-check" aria-hidden="true"></span><span>${t(p)}</span></label>`).join('')}</fieldset><p class="error" id="wish-error" role="alert"></p><div class="buttons">${action(t('cancel'),'close-editor','outline','type="button"')}<button type="submit" class="action">${t(editing?'saveEdit':'saveWish')}</button></div></form></div>`;
}
function paper(){
 const own=view==='desk',name=own?state.user:view==='letters'?browse:state.assignments[state.user],wishes=sampleWishes(name);
 pageIndex=Math.max(0,Math.min(pageIndex,wishes.length-1));
 return `<section class="paper-stack" aria-label="${own?t('desk'):esc(name)}"><header class="stack-header"><div><p class="eyebrow">${t(own?'writing':view==='recipient'?'recipientEye':'letters')}</p><h1>${esc(name)}</h1></div><button class="put-away" data-action="visit-room" aria-label="${t('closePaper')}">×</button></header><div class="paper-scroll">${editorOpen?editor():`${wishes.length?card(wishes[pageIndex],own):`<p class="paper-empty">${t(own?'ownEmpty':'empty')}</p>`}${own?`<button class="add-wish" data-action="add">${t('addWish')}</button>`:''}${rules()}`}</div>${!editorOpen?`<footer class="stack-footer"><button data-action="page" data-direction="-1" aria-label="${t('previousWish')}" ${pageIndex===0?'disabled':''}>←</button><span>${wishes.length?t('pageOf',{n:pageIndex+1,total:wishes.length}):'✳'}</span><button data-action="page" data-direction="1" aria-label="${t('nextWish')}" ${pageIndex>=wishes.length-1?'disabled':''}>→</button></footer>${!own?`<button class="board-return" data-action="browse-back">↖ ${t('letters')}</button>`:''}`:''}</section>`;
}
function sizePaper(){
 const viewport=window.visualViewport, width=Math.min(420,innerWidth-44),height=Math.max(200,Math.min(620,(viewport?.height||innerHeight)-175));
 paperSurface.style.width=width+'px';paperSurface.style.height=height+'px';world?.sizePaper(width,height);
}
function captureDraft(){const form=$('#wish-form');if(form)drafts.set(editing||'new',Object.fromEntries(new FormData(form)));}
async function openPerson(name){
 if(busy||name===state.user||!roster().includes(name))return;
 browse=name;pageIndex=0;view='letters';editorOpen=false;setBusy(true);render(false);await world.openStack('letters',roster().filter(n=>n!==state.user).indexOf(name)%8);setBusy(false);render();
}
function render(focus=true){
 world?.setDeskLamp(view==='desk');
 document.documentElement.lang=lang;document.body.dataset.view=view;document.body.classList.toggle('motion-paused',!!world?.paused);$('.brand span:last-child').innerHTML=t('brand');$('#language').textContent=lang==='en'?'HU':'EN';$('#language').setAttribute('aria-label',t('language'));$('#motion').setAttribute('aria-label',t(world?.paused?'resume':'pause'));$('.sound-label').textContent=t(sound?.enabled?'soundOn':'soundOff');$('#menu-toggle').setAttribute('aria-label',t('menu'));$('#gesture').textContent=t('gesture');
 let html='';
 if(view==='outside')html=`<section class="intro"><p class="eyebrow">${t('eyebrow')}</p><h1>${t('title')}</h1><p class="description">${t('intro')}</p><p class="under-note">${t('note')}</p></section>`;
 if(view==='door')html=`${heading(t('identityEyebrow'),t('doorTitle'),t('doorIntro'))}<div class="door-note">${action(`${t('knock')} <span class="arrow">→</span>`,'enter')}<p class="under-note">${t('doorNote')}</p></div>`;
 if(view==='identity')html=`<section class="entry-sheet"><p class="eyebrow">${t('identityEyebrow')}</p><h1>${t('identityTitle')}</h1><p>${t('identityIntro')}</p><div class="name-grid">${roster().map(n=>`<button data-action="name" data-name="${esc(n)}">${esc(n)}${state.passwords[n]?`<small>${t('protected')}</small>`:''}</button>`).join('')}</div></section>`;
 if(view==='password')html=`<section class="entry-sheet"><p class="eyebrow">${esc(selected)}</p><h1>${t('passwordTitle')}</h1><p>${t('passwordIntro')}</p><form id="login"><label class="field-label">${t(state.passwords[selected]?'password':'passwordNew')}<input name="password" type="password" required minlength="4" autocomplete="${state.passwords[selected]?'current-password':'new-password'}" aria-describedby="password-help password-error"></label><p id="password-help">${t('passwordHint')}</p><p id="password-error" class="error" role="alert"></p><button class="action" type="submit">${t('continue')} →</button>${action(t('back'),'identity','text','type="button"')}</form></section>`;
 if(view==='room')html=heading(t('chapterInside'),t('roomTitle'),t('roomIntro'));
 if(view==='tree')html=`${heading(t('chapterTree'),t('treeTitle'),t('treeIntro'))}<div class="draw-status">${pool().length>10?`<div class="tree-pager"><button data-action="turn-tree" data-direction="-1" aria-label="${lang==='en'?'Previous branches':'Előző ágak'}">←</button><span>${world.ornamentPage+1} / ${world.ornamentPages}</span><button data-action="turn-tree" data-direction="1" aria-label="${lang==='en'?'Next branches':'Következő ágak'}">→</button></div>`:''}<p><strong>${t('remaining',{n:pool().filter(s=>!s.taken).length})}</strong> · ${pool().filter(s=>s.taken).length} ${t('taken').toLowerCase()}</p><p class="warning">${t('warning')}</p></div>`;
 if(view==='reveal')html=`<section class="reveal"><span class="reveal-star" aria-hidden="true">✧</span><p class="eyebrow">${t('revealEye')}</p><p>${t('revealTitle')}</p><h1>${esc(state.assignments[state.user])}</h1><p>${t('revealBody')}</p>${action(`${t('revealAction')} →`,'recipient')}</section>`;
 if(view==='letters'&&!browse)html=heading(t('letters'),t('lettersTitle'),t('boardHint'),'board-heading');
 ui.innerHTML=html;drawBoard();paperSurface.hidden=!['desk','recipient'].includes(view)&&!(view==='letters'&&browse);if(!paperSurface.hidden)paperSurface.innerHTML=paper();else paperSurface.innerHTML='';drawPins();
 const chapters={outside:['01','chapterOutside'],door:['02','chapterDoor'],identity:['02','chapterDoor'],password:['02','chapterDoor'],room:['03','chapterInside'],tree:['04','chapterTree'],reveal:['05','chapterReveal'],recipient:['06','chapterReveal'],desk:['06','chapterDesk'],letters:['06','chapterLetters']};const [n,k]=chapters[view];$('#chapter').innerHTML=`${n} <i></i> ${t(k)}`;
 document.querySelectorAll('.rules').forEach(el=>el.addEventListener('toggle',()=>write('winter-house-rules',el.open?'open':'closed')));
 if(focus){const h=paperSurface.querySelector('h1')||ui.querySelector('h1');if(h){h.tabIndex=-1;h.focus({preventScroll:true});}}
}
function setBusy(value){busy=value;document.body.classList.toggle('screen-transition',value);if(value){clearTimeout(toastTimer);$('#toast').classList.remove('visible');pins.innerHTML='';ui.classList.add('hush');}else ui.classList.remove('hush');board.inert=value||view!=='letters'||!!browse;paperSurface.inert=value;}
async function visit(place){
 if(busy)return;captureDraft();editorOpen=false;
 if(place==='tree'&&state.assignments[state.user])place='recipient';
 if(place==='recipient'&&!state.assignments[state.user])place='tree';
 if(place==='tree'){const slots=pool();world.setBaubles(slots.length,slots.flatMap((s,i)=>s.taken?[i]:[]),slots.map(s=>s.color));}
 browse='';pageIndex=0;setBusy(true);
 if(world.stack.visible){await world.animate(300,t=>world.stack.scale.setScalar(1-t*.7));world.stack.visible=false;world.stack.scale.setScalar(1);}
 view=place;render(false);
 if(place==='desk')await world.openStack('desk');
 else if(place==='recipient')await world.openStack('recipient');
 else await world.travel(place);
 setBusy(false);render();
}
async function enter(){if(busy||!state.user)return;setBusy(true);sound?.bell();await world.enter();view='room';setBusy(false);render();if(state.assignments[state.user])await visit('recipient');}
async function pick(index){if(busy||state.assignments[state.user])return;const s=pool()[index];if(!s||s.taken)return;state.assignments[state.user]=s.name;save();setBusy(true);sound?.pounce();await world.pounce(index);view='reveal';setBusy(false);render();sound?.chime();}
async function catnap(){if(busy||view!=='room')return;setBusy(true);await world.nap();setBusy(false);render(false);sound?.purr();}
async function eatCookie(index){
 if(busy||view!=='room'||world.cookieBusy||!world.cookiesLeft)return;
 const keyboard=document.activeElement?.dataset.action==='eat-cookie';
 const eating=world.eatCookie(index,()=>sound?.chew());drawPins();
 if(await eating){drawPins();announce(lang==='en'?(world.cookiesLeft?'Crunch. Worth the crumbs.':'The last cookie. A little Christmas secret.'):(world.cookiesLeft?'Hamm. Megérte a morzsákat.':'Az utolsó süti. Maradjon karácsonyi titok.'));}
 if(keyboard)(pins.querySelector('[data-action=eat-cookie]:not(:disabled)')||$('#world')).focus({preventScroll:true});
}
async function worldAction(action,index){if(busy)return;if(['desk','recipient','letters'].includes(view)&&(!paperSurface.hidden||action==='empty')){await visit('room');return;}if(action==='door'){if(view==='outside'){setBusy(true);await world.travel('door');view='identity';setBusy(false);render();}else if(view==='door')await enter();}else if(action==='bell'){world.ring();sound?.bell();announce(t('bellSays'));}else if(action==='cookie'){await eatCookie(index);}else if(action==='sofa'){await catnap();}else if(action==='cat'){world.pet();sound?.purr();announce(t('catSays'));}else if(action==='bauble'&&view==='tree')await pick(index);else if(['tree','desk','letters','recipient'].includes(action)&&state.user)await visit(action);}
function safeUrl(v){if(!v)return '';try{const u=new URL(v);return ['https:','http:'].includes(u.protocol)?u.href:'';}catch{return '';}}
async function hash(value){if(!crypto.subtle)return 'local-'+Array.from(value).reduce((h,c)=>(h*31+c.charCodeAt(0))>>>0,13);const digest=await crypto.subtle.digest('SHA-256',new TextEncoder().encode('prototype:'+value));return [...new Uint8Array(digest)].map(v=>v.toString(16).padStart(2,'0')).join('');}
function showEditor(id=null){
 if(view!=='desk')return;editing=id;if(id&&!sampleWishes(state.user).some(w=>w.id===id))return;
 editorOpen=true;render(false);$('#wish-form textarea').focus({preventScroll:true});
}
function closeEditor(){captureDraft();editorOpen=false;render(false);paperSurface.querySelector('[data-action=add]')?.focus({preventScroll:true});}
function menu(){const m=$('#menu');m.hidden=!m.hidden;$('#menu-toggle').setAttribute('aria-expanded',String(!m.hidden));if(m.hidden)return;m.innerHTML=`<p>${t('demo')}</p>${state.user?`<p>${esc(state.user)}</p><button data-action="refresh">${t('refresh')}</button><button data-action="signout">${t('signout')}</button>`:''}<button data-action="restart">${t('restart')}</button><button data-action="large">${t(state.large?'small':'large')}</button><a href="../01-come-on-in.html">${t('compare')}</a>`;}

// Sound is procedural, opt-in, and starts only from a user gesture.
class HearthSound{
 constructor(){this.enabled=false;this.ctx=null;this.master=null;}
 async toggle(){if(!this.ctx){this.ctx=new AudioContext();this.master=this.ctx.createGain();this.master.gain.value=0;this.master.connect(this.ctx.destination);const buffer=this.ctx.createBuffer(1,this.ctx.sampleRate*3,this.ctx.sampleRate),data=buffer.getChannelData(0);let previous=0;for(let i=0;i<data.length;i++){previous=(previous+(.02*(Math.random()*2-1)))/1.02;data[i]=previous*2.3;}const source=this.ctx.createBufferSource();source.buffer=buffer;source.loop=true;const filter=this.ctx.createBiquadFilter();filter.type='lowpass';filter.frequency.value=450;const gain=this.ctx.createGain();gain.gain.value=.35;source.connect(filter).connect(gain).connect(this.master);source.start();}this.enabled=!this.enabled;if(this.enabled)await this.ctx.resume();this.master.gain.setTargetAtTime(this.enabled?.15:0,this.ctx.currentTime,.4);return this.enabled;}
 tone(frequency,when=0,duration=1,volume=.2,type='sine'){if(!this.enabled)return;const c=this.ctx,start=c.currentTime+when,o=c.createOscillator(),g=c.createGain();o.type=type;o.frequency.value=frequency;g.gain.setValueAtTime(0,start);g.gain.linearRampToValueAtTime(volume,start+.015);g.gain.exponentialRampToValueAtTime(.0001,start+duration);o.connect(g).connect(this.master);o.start(start);o.stop(start+duration+.02);}
 bell(){this.tone(660,0,1.3,.45);this.tone(990,.03,1.7,.15);}
 chime(){[523.25,659.25,783.99,1046.5].forEach((f,i)=>this.tone(f,i*.15,1.7,.28));}
 purr(){[0,.12,.24,.36,.48].forEach(t=>this.tone(90,t,.17,.15,'triangle'));}
 chew(){
   if(!this.enabled)return;
   const c=this.ctx;if(c.state==='suspended')c.resume();
   if(!this.chewBuffer){this.chewBuffer=c.createBuffer(1,Math.ceil(c.sampleRate*.16),c.sampleRate);const samples=this.chewBuffer.getChannelData(0);for(let i=0;i<samples.length;i++)samples[i]=(Math.random()*2-1)*(.6+.4*Math.sin(i*.17));}
   [0,.18,.39,.63].forEach((delay,i)=>{
     const start=c.currentTime+delay,source=c.createBufferSource(),filter=c.createBiquadFilter(),gain=c.createGain();
     source.buffer=this.chewBuffer;source.playbackRate.value=1-i*.07;
     filter.type='bandpass';filter.frequency.value=1600-i*270;filter.Q.value=.65;
     gain.gain.setValueAtTime(0,start);gain.gain.linearRampToValueAtTime(.5-i*.085,start+.008);gain.gain.exponentialRampToValueAtTime(.001,start+.13);
     source.connect(filter).connect(gain).connect(this.master);source.start(start);source.stop(start+.18);
     source.onended=()=>{source.disconnect();filter.disconnect();gain.disconnect();};
     this.tone(125-i*12,delay+.035,.07,.12,'triangle');
   });
 }
 pounce(){this.tone(220,0,.14,.1,'triangle');this.tone(330,.11,.1,.08,'triangle');}
}

function positionPins(points){
 const items=[...pins.children].flatMap(el=>{
   const p=points[el.dataset.anchor];if(!p)return [];
   const width=el.offsetWidth,height=el.offsetHeight;
   return [{el,width,height,visible:p.visible,x:el.classList.contains('round')?p.x:Math.max(width/2+12,Math.min(innerWidth-width/2-12,p.x)),y:p.y+Number(el.dataset.offset||0)}];
 });
 // Keep labels attached to their objects, with enough separation on narrow phones.
 if(view==='room'){
   items.sort((a,b)=>a.y-b.y);
   items.forEach((item,i)=>{for(const previous of items.slice(0,i)){
     if(item.visible&&previous.visible&&Math.abs(item.x-previous.x)<(item.width+previous.width)/2+8)
       item.y=Math.max(item.y,previous.y+(item.height+previous.height)/2+8);
   }});
 }
 for(const {el,x,y,visible}of items){el.style.left=x+'px';el.style.top=y+'px';el.style.visibility=visible?'visible':'hidden';}
}

let world;
const finishFacts=startChristmasFacts(lang),loadingStarted=performance.now();
try{
 await new Promise(resolve=>requestAnimationFrame(()=>requestAnimationFrame(resolve)));
 const {WinterWorld}=await import('./world.js?v=sky-2');
 $('#loading p').textContent=t('loading');$('#loading small').textContent=t('loadingSmall');document.documentElement.lang=lang;
 world=new WinterWorld($('#world'),{
   onAction:worldAction,
   onFrame:(points,surfaces)=>{
     board.style.transform=surfaces.board;
     paperSurface.style.transform=surfaces.paper;
     paperSurface.style.visibility=surfaces.paperVisible?'visible':'hidden';
     positionPins(points);
   }
 });
 sizePaper();window.addEventListener('resize',sizePaper);window.visualViewport?.addEventListener('resize',sizePaper);
 sound=new HearthSound();world.paused=read('winter-house-paused')==='true';$('#motion').setAttribute('aria-pressed',String(world.paused));
 if(state.user){view=state.assignments[state.user]?'recipient':'room';await world.restoreInside(view);if(view==='recipient'){world.placeStack('recipient');world.stack.visible=true;world.setPose('recipient',true);}}
 render(false);await new Promise(resolve=>setTimeout(resolve,Math.max(0,(state.user?600:2400)-(performance.now()-loadingStarted))));finishFacts();$('#loading').classList.add('finished');setTimeout(()=>$('#loading').remove(),800);
 // Read-only diagnostic surface used by the local browser checks.
 window.winterHouse={stats:()=>world.stats(),points:()=>Object.fromEntries(world.baubles.map(b=>[b.index,world.project(b.group.getWorldPosition(world.camera.position.clone()))])),get view(){return view;},surfaces:()=>world.surfaces()};
}catch(error){finishFacts();console.error('The winter house could not start:',error);$('#loading').remove();ui.innerHTML=`<div class="no-webgl"><h1>${t('error')}</h1><p>${t('errorBody')}</p><a href="../01-come-on-in.html">${t('fallback')}</a></div>`;}

document.addEventListener('click',async e=>{
 const el=e.target.closest('[data-action]');if(!el||busy)return;const a=el.dataset.action;
 if(a==='eat-cookie')await eatCookie();else if(a==='catnap')await catnap();else if(a==='walk')await worldAction('door');else if(a==='enter')await enter();
 else if(a==='identity'){view='identity';render();}
 else if(a==='name'){selected=el.dataset.name;view='password';render();$('#login input').focus();}
 else if(a==='visit')await visit(el.dataset.place);
 else if(a.startsWith('visit-'))await visit(a.slice(6));
 else if(a==='recipient')await visit('recipient');
 else if(a==='pick')await pick(Number(el.dataset.index));
 else if(a==='turn-tree'){busy=true;pins.innerHTML='';await world.turnOrnaments(Number(el.dataset.direction));busy=false;render(false);}
 else if(a==='browse')await openPerson(el.dataset.name);
 else if(a==='browse-back')await visit('letters');
 else if(a==='board-page'){boardPage+=Number(el.dataset.direction);drawBoard();(board.querySelector(`[data-action=board-page][data-direction="${el.dataset.direction}"]:not(:disabled)`)||board.querySelector('[data-action=board-page]:not(:disabled)'))?.focus({preventScroll:true});}
 else if(a==='page'){pageIndex+=Number(el.dataset.direction);world.shufflePaper(Number(el.dataset.direction));render(false);(paperSurface.querySelector(`[data-action=page][data-direction="${el.dataset.direction}"]:not(:disabled)`)||paperSurface.querySelector('[data-action=page]:not(:disabled)'))?.focus({preventScroll:true});paperSurface.querySelector('.wish-row')?.animate([{opacity:0,transform:'translateX(15px) rotate(2deg)'},{opacity:1,transform:'none'}],{duration:world.reduced?0:350});}
 else if(a==='claim'){const owner=view==='letters'?browse:state.assignments[state.user];if(owner===state.user||!sampleWishes(owner).some(w=>w.id===el.dataset.id))return;const c=state.claims[el.dataset.id];if(c&&c!==state.user)return;if(c)delete state.claims[el.dataset.id];else state.claims[el.dataset.id]=state.user;save();const scroll=$('.paper-scroll').scrollTop;render(false);$('.paper-scroll').scrollTop=scroll;paperSurface.querySelector('[data-action=claim]')?.focus({preventScroll:true});announce(t(c?'releaseToast':'claimedToast'));}
 else if(a==='add')showEditor();else if(a==='edit')showEditor(el.dataset.id);else if(a==='close-editor')closeEditor();
 else if(a==='delete'){state.wishes[state.user]=sampleWishes(state.user).filter(w=>w.id!==el.dataset.id);delete state.claims[el.dataset.id];save();render(false);announce(t('deleted'));}
 else if(a==='refresh'){captureDraft();try{const next=JSON.parse(read(storageKey));if(next?.user===state.user)state=next;}catch{}$('#menu').hidden=true;$('#menu-toggle').setAttribute('aria-expanded','false');render(false);announce(t('refreshDone'));}
 else if(a==='restart'){state=fresh();save();location.reload();}
 else if(a==='signout'){state.user=null;save();location.reload();}
 else if(a==='large'){const large=!state.large;state=fresh();state.large=large;save();location.reload();}
});
$('#language').addEventListener('click',()=>{if(busy)return;captureDraft();const pw=$('#login input')?.value;lang=lang==='en'?'hu':'en';write('winter-house-lang',lang);render(false);if(pw)$('#login input').value=pw;if(!$('#menu').hidden){$('#menu').hidden=true;menu();}});
$('#motion').addEventListener('click',()=>{if(!world)return;world.paused=!world.paused;document.body.classList.toggle('motion-paused',world.paused);write('winter-house-paused',String(world.paused));$('#motion').textContent=world.paused?'▷':'Ⅱ';$('#motion').setAttribute('aria-pressed',String(world.paused));$('#motion').setAttribute('aria-label',t(world.paused?'resume':'pause'));});
$('#sound').addEventListener('click',async()=>{if(!sound)return;const enabled=await sound.toggle();$('#sound').setAttribute('aria-pressed',String(enabled));$('#sound').setAttribute('aria-label',t(enabled?'soundOn':'soundOff'));$('.sound-label').textContent=t(enabled?'soundOn':'soundOff');if(enabled)sound.bell();});
$('#menu-toggle').addEventListener('click',menu);
document.addEventListener('submit',async e=>{
 if(e.target.id==='login'){e.preventDefault();if(busy)return;const v=new FormData(e.target).get('password');if(v.length<4)return;busy=true;try{const h=await hash(v);if(state.passwords[selected]&&state.passwords[selected]!==h){$('#password-error').textContent=t('passwordWrong');return;}state.passwords[selected]=h;state.user=selected;save();busy=false;await enter();}finally{busy=false;}}
 if(e.target.id==='wish-form'){e.preventDefault();const v=Object.fromEntries(new FormData(e.target));if(!v.description.trim()){$('#wish-error').textContent=t('invalid');return;}if(v.url&&!safeUrl(v.url)){$('#wish-error').textContent=t('invalidUrl');return;}const wishes=sampleWishes(state.user).map(w=>({...w})),index=editing?wishes.findIndex(w=>w.id===editing):-1;const wish={id:editing||'wish-'+Date.now(),description:v.description.trim().slice(0,500),url:safeUrl(v.url),priority:['high','medium','low'].includes(v.priority)?v.priority:'medium',createdAt:index>=0?wishes[index].createdAt||new Date().toISOString():new Date().toISOString()};if(index>=0)wishes[index]=wish;else wishes.push(wish);state.wishes[state.user]=wishes;save();drafts.delete(editing||'new');editorOpen=false;pageIndex=index>=0?index:wishes.length-1;render(false);announce(t('saved'));}
});
document.addEventListener('keydown',e=>{
 if(e.key==='Escape'){
   if(!$('#menu').hidden){$('#menu').hidden=true;$('#menu-toggle').setAttribute('aria-expanded','false');return;}
   if(['desk','recipient','letters','tree'].includes(view)){e.preventDefault();visit('room');}
 }
 if(!editorOpen&&paperSurface.contains(document.activeElement)&&['ArrowLeft','ArrowRight'].includes(e.key)){
   e.preventDefault();paperSurface.querySelector(`[data-action="page"][data-direction="${e.key==='ArrowLeft'?-1:1}"]:not(:disabled)`)?.click();
 }
});
let swipeStart=null;
paperSurface.addEventListener('pointerdown',e=>{if(!e.target.closest('button,input,textarea,select,a,summary')&&!editorOpen)swipeStart={x:e.clientX,y:e.clientY};});
paperSurface.addEventListener('pointerup',e=>{if(swipeStart){const dx=e.clientX-swipeStart.x,dy=e.clientY-swipeStart.y;if(Math.abs(dx)>55&&Math.abs(dx)>Math.abs(dy)*1.5)paperSurface.querySelector(`[data-action="page"][data-direction="${dx<0?1:-1}"]:not(:disabled)`)?.click();}swipeStart=null;});
paperSurface.addEventListener('pointercancel',()=>swipeStart=null);

document.addEventListener('visibilitychange',()=>{if(sound?.ctx&&sound.enabled){if(document.hidden)sound.ctx.suspend();else sound.ctx.resume();}});
