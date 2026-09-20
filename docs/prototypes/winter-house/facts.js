// Short, sourced facts. Kept separate so text paints before Three.js starts building.
export const christmasFacts=[
 {en:'In Hungary, children put clean boots in the window for Mikulás on 6 December.',hu:'A Mikulást december 6-án az ablakba tett, kitisztított csizmákkal várják a gyerekek.',source:'Visit Hungary',url:'https://visithungary.com/articles/6th-december-boots-in-the-windows'},
 {en:'Szaloncukor has decorated Hungarian Christmas trees since the 19th century. An ornament you can eat!',hu:'A szaloncukor a 19. század óta díszíti a magyar karácsonyfákat. Egy dísz, amit meg is lehet enni!',source:'Hungarikum',url:'https://www.hungarikum.hu/de/node/7812'},
 {en:'Henry Cole commissioned a Christmas card in 1843. Its design included a family feast and acts of charity.',hu:'Henry Cole 1843-ban rendelt karácsonyi üdvözlőlapot. A képen családi ünneplés és jótékonykodás is szerepelt.',source:'V&A',url:'https://www.vam.ac.uk/articles/the-first-christmas-card'}
];
export function startChristmasFacts(lang){
 const loader=document.querySelector('#loading'),article=document.createElement('article');article.className='loading-fact';
 let index=0;try{index=(Number(localStorage.getItem('winter-fact-index'))||0)%christmasFacts.length;localStorage.setItem('winter-fact-index',String((index+1)%christmasFacts.length));}catch{}
 const show=()=>{const fact=christmasFacts[index];article.innerHTML=`<span class="fact-eyebrow">${lang==='en'?'A little Christmas curiosity':'Egy kis karácsonyi érdekesség'}</span><p>${fact[lang]||fact.hu}</p><div><a href="${fact.url}" target="_blank" rel="noopener noreferrer">${fact.source} ↗</a><button type="button" aria-label="${lang==='en'?'Another little fact':'Még egy érdekesség'}">${index+1} / ${christmasFacts.length} →</button></div>`;article.querySelector('button').onclick=()=>{index=(index+1)%christmasFacts.length;show();};};
 loader.append(article);show();
 const timer=setInterval(()=>{index=(index+1)%christmasFacts.length;show();},6000);
 return ()=>clearInterval(timer);
}
