/* Local, deliberately isolated design demos. No production authentication or server. */
(() => {
  'use strict';
  const theme = document.body.dataset.theme;
  const key = `christmas-prototype-${theme}-v1`;
  const app = document.getElementById('app');
  const reduceMotion = matchMedia('(prefers-reduced-motion: reduce)');
  const names = ['Anna', 'Kata', 'Péter', 'Nagyi', 'Bence', 'Dóri', 'Márk', 'Zsófi'];
  const moreNames = ['Ági', 'Balázs', 'Csilla', 'Dani', 'Eszter', 'Feri', 'Gabi', 'Hanna', 'Ildi', 'János', 'Klári', 'Laci', 'Misi', 'Nóri', 'Orsi', 'Pali', 'Réka', 'Sári', 'Tomi', 'Vera', 'Zoli', 'Zsuzsi'];
  const icons = {
    star: '<path d="m12 2 2.8 6 6.6.8-4.8 4.6 1.3 6.6-5.9-3.3L6.1 20l1.3-6.6L2.6 8.8 6 8z"/>',
    gift: '<rect x="4" y="10" width="16" height="11" rx="1"/><path d="M2 7h20v4H2zm10 0v14M12 7C3 7 5 0 9 3zm0 0c9 0 7-7 3-4z"/>',
    arrow: '<path d="M4 12h16m-6-6 6 6-6 6"/>',
    back: '<path d="M20 12H4m6-6-6 6 6 6"/>',
    lock: '<rect x="5" y="10" width="14" height="11" rx="2"/><path d="M8 10V7a4 4 0 0 1 8 0v3m-4 5v2"/>',
    menu: '<path d="M5 6h14M5 12h14M5 18h14"/>',
    refresh: '<path d="M20 10a8 8 0 1 0-1 7M20 3v7h-7"/>',
    pause: '<path d="M8 5v14M16 5v14"/>',
    play: '<path d="m8 4 12 8-12 8z"/>',
    check: '<path d="m5 12 4 4L19 6"/>',
    close: '<path d="m6 6 12 12M6 18 18 6"/>',
    heart: '<path d="M12 20S2 14 2 7a5 5 0 0 1 10-1 5 5 0 0 1 10 1c0 7-10 13-10 13Z"/>',
    people: '<circle cx="9" cy="7" r="3"/><path d="M3 21v-4a6 6 0 0 1 12 0v4m0-17a3 3 0 0 1 0 6m3 3a5 5 0 0 1 3 4v4"/>',
    pencil: '<path d="m4 16 12-12 4 4L8 20H4zm10-10 4 4"/>',
    trash: '<path d="M3 6h18M9 6V3h6v3M6 6l1 15h10l1-15M10 10v7m4-7v7"/>',
    book: '<path d="M4 3h14v17H4a2 2 0 0 1 0-4h14M5 3v13m4-9h6m-6 3h4"/>',
    cup: '<path d="M4 8h13v8a5 5 0 0 1-5 5H9a5 5 0 0 1-5-5zm13 1h2a3 3 0 0 1 0 6h-2M7 2v3m4-3v3m4-3v3"/>',
    ticket: '<path d="M3 6h18v4a2 2 0 0 0 0 4v4H3v-4a2 2 0 0 0 0-4zm12 0v2m0 3v2m0 3v2"/>',
    exit: '<path d="M10 3H4v18h6m-1-9h12m-5-5 5 5-5 5"/>',
  };
  function icon(name) { return `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${icons[name] || icons.star}</svg>`; }
  const copy = {
    hu: {
      brand: 'Karácsony nálunk', family: 'Együtt · 2026 karácsonya', allConcepts: 'A 3D téli házikó', controls: 'Prototípus beállításai', demoNote: 'Csak helyi mintaadatok. Az újrakezdés ennek a változatnak a mentett adatait törli.', restart: 'Újrakezdem', thirty: 'Kipróbálom 30 fővel', eight: 'Vissza 8 főre', language: 'Switch to English', pause: 'Mozgás szüneteltetése', resume: 'Mozgás indítása', menu: 'Menü', refresh: 'Frissítés', refreshed: 'Minden kívánság a helyén.', signout: 'Kilépés', member: 'Családi ajándékozás', namesTitle: 'Ki jött meg?', namesIntro: 'Keresd meg a neved. A kabátodat nyugodtan hagyd a széken.', protected: 'Jelszóval védve', you: 'Te', hello: 'Szia, {name}!', welcomeBack: 'De jó, hogy itt vagy, {name}!', passwordIntro: 'Egy kis titok, hogy a többiek ne leshessenek bele a meglepetésedbe.', password: 'Jelszavad', newPassword: 'Válassz egy jelszót', passwordHelp: 'Legalább 4 karakter. Olyan legyen, amire később is emlékszel.', passwordFoot: 'Legközelebb ezen az eszközön már megismerünk.', wrongPassword: 'Ez most nem stimmelt. Próbáld meg még egyszer.', passwordShort: 'Még egy kicsit hosszabb jelszó kell: legalább 4 karakter.', continue: 'Jöhet a húzás', back: 'Vissza', drawEyebrow: 'Egy apró döntés. Egy nagy mosoly.', available: '{n} még vár rád', goneCount: '{n} már elkelt', gone: 'Már elkelt', choose: 'Ezt választom', chooseNumber: '{n}. titkos meglepetés kiválasztása', warning: 'Csak egyet választhatsz. Amit megérintesz, az lesz a tiéd — nincs újrahúzás.', revealEyebrow: 'Psszt. Ez most kettőtök titka.', revealTitle: 'Idén neki szerzel örömet:', revealBody: 'Egy kis figyelmesség tőled. Egy nagy mosoly tőle. A többi maradjon meglepetés.', seeWishes: 'Lássuk, mire vágyik', revealNote: 'A titkot megőrizzük. A mosoly a te dolgod.', recipientTab: 'Az én húzásom', mineTab: 'Kívánságaim', everyoneTab: 'Mindenki', recipientEyebrow: 'Idén te vagy a titkos angyalkája', recipientBody: 'Néhány ötlet tőle. A meglepetést már te teszed hozzá.', secret: 'Csak te látod, kit húztál.', wishList: 'A kívánságlistája', wishCount: '{n} kívánság', ownTitle: 'És te minek örülnél?', ownIntro: 'Segíts egy kicsit annak, aki téged húzott.', addWish: 'Új kívánság', high: 'Nagyon örülnék neki', medium: 'Jó lenne', low: 'Csak egy ötlet', buy: 'Ezt én intézem', release: 'Mégsem én veszem', claimed: 'Már készül a meglepetés', mineClaim: 'Ezt te intézed', secretClaim: 'Ő ebből semmit sem lát.', claimSaved: 'Félretettük neked. Ő ebből semmit sem lát.', claimReleased: 'Újra szabad az ötlet.', giftLink: 'Megnézem', emptyTitle: 'Még szövögeti a kívánságait.', emptyBody: 'Nézz vissza később. Addig is gondolj arra, mitől szokott felcsillanni a szeme.', ownEmptyTitle: 'Egy kis súgás jól jönne.', ownEmptyBody: 'Egy könyv? Egy közös délután? Írd le, minek örülnél.', everyoneTitle: 'Mindenki hozott egy kis álmot.', everyoneIntro: 'Nézz körül nyugodtan. Ha valamit elvállalsz, a többiek már tudni fogják — az ünnepelt persze nem.', browseBack: 'Vissza mindenkihez', guidelines: 'Amiben megegyeztünk', budget: 'Kb. 10–15 ezer Ft', guidelinesBody: 'Legyen személyes, ne csak legyen valami. Egy közös élmény, egy régi vágy vagy valami igazán neki való többet ér a polcon porosodó holmiknál.', guidelinesTip: 'Ha bizonytalan vagy, a kívánságlista jó kiindulópont. A sok apró kacatot és a kapkodva vett ajándékot most hagyjuk.', guidelinesNote: 'Nem az árcédulára fog emlékezni.', editWish: 'Kívánság szerkesztése', newWish: 'Minek örülnél?', description: 'A kívánságod', descriptionPlaceholder: 'Például egy nagy bögre a téli teázásokhoz…', link: 'Link, ha van', priority: 'Mennyire szeretnéd?', save: 'Felírom', saveEdit: 'Mentés', cancel: 'Mégsem', close: 'Bezárás', saved: 'Felírtuk. Már láthatja, aki téged húzott.', deleted: 'Töröltük a kívánságot.', delete: 'Törlés', edit: 'Szerkesztés', preview: 'Itt csak a linket mutatjuk. A kívánságodat így is elmentheted.', invalidLink: 'Teljes webcímet adj meg, https:// vagy http:// kezdettel.', emptyDescription: 'Írj pár szót arról, minek örülnél.', noDraw: 'Előbb válassz egy meglepetést.', loading: 'Mindjárt bent vagyunk…', trivia: 'Tudtad? A szaloncukrot régen selyempapírba csomagolták, kézzel.', loading2: 'A süti már kész. A titkok még sülnek.', walk: 'Menjünk közelebb', doorTitle: 'Megjöttél.', doorBody: 'Odabent már várnak. Kopogj be!', enter: 'Bekopogok', walkBack: 'Vissza a havas utcára', cat: 'Megsimogatom a cicát', catSays: 'Mrrr. A csomagolópapír az enyém.', catDraw: 'Válassz egy csillogó gömböt. A cica majd lehozza.', catHint: 'A cica már alig várja. Te csak bökj rá egy gömbre.', chooseBauble: '{n}. titkos karácsonyfadísz kiválasztása', added: 'Felírva: {date}', startInside: 'Jöhet a karácsony', wishBook: 'Egy könyv, amibe bele lehet feledkezni', wishBookDesc: 'Jöhet egy kedvenc regényed is. Szeretem, ha egy könyvnek története van, mielőtt hozzám kerül.', wishCup: 'Egy jó nagy, kézzel készült bögre', wishCupDesc: 'A kicsikbe sosem fér elég tea. Földszínek, kicsit szabálytalan forma — pont úgy szeretem.', wishTime: 'Egy közös, ráérős délután', wishTimeDesc: 'Séta, kávé, vagy süssünk valamit együtt. A lényeg, hogy ne siessünk sehova.', home: 'Kezdőlap', smallSecret: 'Csak köztünk marad.', deleteAsk: 'Biztosan törlöd ezt a kívánságot?', confirmDelete: 'Igen, törlöm', cancelDelete: 'Megtartom', storageIssue: 'A böngésző most nem tud menteni. A mintát kipróbálhatod, de a változások bezáráskor elvesznek.'
    },
    en: {
      brand: 'Christmas, together', family: 'Our little Christmas · 2026', allConcepts: 'The 3D winter house', controls: 'Prototype controls', demoNote: 'Local sample data only. Restart clears this direction’s saved demo data.', restart: 'Start fresh', thirty: 'Try with 30 people', eight: 'Back to 8 people', language: 'Váltás magyarra', pause: 'Pause motion', resume: 'Resume motion', menu: 'Menu', refresh: 'Refresh', refreshed: 'All wishes are up to date.', signout: 'Sign out', member: 'Our family gift exchange', namesTitle: 'Look who’s here.', namesIntro: 'Find your name. You can leave your coat on the chair.', protected: 'Password protected', you: 'You', hello: 'Hello, {name}!', welcomeBack: 'There you are, {name}!', passwordIntro: 'A little secret to keep curious noses out of your surprise.', password: 'Your password', newPassword: 'Choose a password', passwordHelp: 'At least 4 characters. Something you’ll remember next time.', passwordFoot: 'We’ll remember you on this device next time.', wrongPassword: 'That wasn’t quite it. Give it another try.', passwordShort: 'A little longer, please: at least 4 characters.', continue: 'Let’s make a little magic', back: 'Back', drawEyebrow: 'One little choice. One very happy someone.', available: '{n} waiting for you', goneCount: '{n} already taken', gone: 'Already taken', choose: 'This one', chooseNumber: 'Choose concealed surprise {n}', warning: 'You only get one pick. The one you tap is yours — no peeking, no swapping.', revealEyebrow: 'Shhh. This is your little secret.', revealTitle: 'This Christmas, you’re making', revealBody: 'A little thought from you. A very big smile from them. The rest is a lovely secret.', seeWishes: 'See what they’re wishing for', revealNote: 'We’ll keep the secret. You take care of the smile.', recipientTab: 'My person', mineTab: 'My wishes', everyoneTab: 'Everyone', recipientEyebrow: 'Your someone to spoil this Christmas', recipientBody: 'A few hints from them. A little thoughtfulness from you.', secret: 'Only you can see who you picked.', wishList: 'Their little wish list', wishCount: '{n} wishes', ownTitle: 'And what about you?', ownIntro: 'Leave a little hint for whoever picked your name.', addWish: 'Add a wish', high: 'Would really love this', medium: 'Would be lovely', low: 'Just a little idea', buy: 'I’ll take care of this', release: 'Release this wish', claimed: 'A surprise is in the works', mineClaim: 'You’re taking care of this', secretClaim: 'They won’t see a thing.', claimSaved: 'Saved for you. They won’t see a thing.', claimReleased: 'This idea is available again.', giftLink: 'Take a look', emptyTitle: 'A little dreaming is still underway.', emptyBody: 'Pop back soon. Meanwhile, think about the things that make their eyes light up.', ownEmptyTitle: 'A little hint would be lovely.', ownEmptyBody: 'A book? An afternoon together? Tell your secret giver what would make you smile.', everyoneTitle: 'A little wish from everyone.', everyoneIntro: 'Have a little look around. If you claim a gift, the other givers will know — its owner stays happily in the dark.', browseBack: 'Back to everyone', guidelines: 'Our little agreement', budget: 'Around €25–40', guidelinesBody: 'Something thoughtful, something personal. An afternoon together, a long-held wish, or something that says “I know you” beats a thing that gathers dust.', guidelinesTip: 'Stuck? Their wish list is a good place to start. Let’s skip the filler gifts and the last-minute panic buys.', guidelinesNote: 'They’ll remember the thought, not the price tag.', editWish: 'Edit your wish', newWish: 'What would make you smile?', description: 'Your wish', descriptionPlaceholder: 'Maybe a big handmade mug for winter tea…', link: 'A link, if you have one', priority: 'How much would you love it?', save: 'Add to my list', saveEdit: 'Save changes', cancel: 'Never mind', close: 'Close', saved: 'Written down. Your secret giver can see it now.', deleted: 'Wish removed.', delete: 'Delete', edit: 'Edit', preview: 'This demo shows the link only. Your wish can still be saved.', invalidLink: 'Use a full web address beginning with https:// or http://.', emptyDescription: 'Write a few words about what you’d like.', noDraw: 'Choose a little surprise first.', loading: 'Making ourselves at home…', trivia: 'A Hungarian tradition: szaloncukor sweets were once wrapped in tissue paper by hand.', loading2: 'The cookies are ready. The secrets are still baking.', walk: 'Let’s get a little closer', doorTitle: 'There you are.', doorBody: 'Everyone’s inside. Go on, knock.', enter: 'Knock, knock', walkBack: 'Back to the snowy street', cat: 'Pet the cat', catSays: 'Prrr. The wrapping paper is mine.', catDraw: 'Pick a shiny bauble. The cat will fetch it.', catHint: 'The cat’s ready when you are. Just tap a bauble.', chooseBauble: 'Choose concealed Christmas bauble {n}', added: 'Added {date}', startInside: 'Let Christmas begin', wishBook: 'A book to get completely lost in', wishBookDesc: 'Your favourite novel would be lovely, too. I like a book with a story before it even reaches me.', wishCup: 'A very big, handmade mug', wishCupDesc: 'The little ones never hold enough tea. Earthy colours and a slightly wonky shape would be just right.', wishTime: 'A whole afternoon, just us', wishTimeDesc: 'A walk, a coffee, or baking something together. Mostly, I’d like us not to be in a hurry.', home: 'Home', smallSecret: 'Just between us.', deleteAsk: 'Remove this wish from your list?', confirmDelete: 'Yes, remove it', cancelDelete: 'Keep it', storageIssue: 'This browser can’t save right now. You can try the demo, but changes will be lost when you close it.'
    }
  };
  const themeCopy = {
    village: {
      hu: { title: 'Kint hull a hó.<br><em>Bent várunk.</em>', intro: 'Gyere beljebb. Egy bögre melegség, egy kis titok, és valaki, akinek idén te szerzel örömet.', action: 'Elindulok a házhoz', note: 'A cica már elfoglalta a legjobb helyet.', sticker: 'Már ég<br>a kandalló', caption: 'Valahol itt lakik a karácsony.', drawTitle: 'Melyiket hozza le a cica?', drawAside: 'A fa tavaly is túlélte. Nagyjából.' },
      en: { title: 'Snow outside.<br><em>Love inside.</em>', intro: 'Come a little closer. There’s something warm to drink, a secret to keep, and someone’s Christmas to make.', action: 'Walk up to the house', note: 'The cat’s already taken the good chair.', sticker: 'The fire’s<br>already on', caption: 'Somewhere in here, Christmas is waiting.', drawTitle: 'Which one should the cat fetch?', drawAside: 'The tree survived last year. Mostly.' }
    },
    letters: {
      hu: { title: 'Egy kis titok.<br><em>Nagy szeretettel.</em>', intro: 'Az asztal már tele van szalagokkal és jókívánságokkal. Egy borítékban ott lapul, kinek szerzel idén örömet.', action: 'Leülök az asztalhoz', note: 'A legjobb ajándék azzal kezdődik: „ez pont ő”.', sticker: 'Neked,<br>szeretettel', caption: 'Egy kis papír. Egy nagy meglepetés.', drawTitle: 'Egy levél csak neked.', drawAside: 'A masni nem tökéletes. A szándék igen.' },
      en: { title: 'A little secret.<br><em>A lot of love.</em>', intro: 'The table’s a happy mess of ribbon and good intentions. Inside one little envelope: your someone for Christmas.', action: 'Pull up a chair', note: 'The best gifts begin with “that’s so them”.', sticker: 'For you,<br>with love', caption: 'A little paper. A very big surprise.', drawTitle: 'One little letter, just for you.', drawAside: 'The bow’s a little wonky. The thought is perfect.' }
    },
    gingerbread: {
      hu: { title: 'Még egy süti.<br><em>Még egy titok.</em>', intro: 'Fahéj a levegőben, liszt az asztalon, valakinek a neve egy süti alatt. Aki sütit választ, örömet is szerez.', action: 'Nézzük, mi sült ki', note: 'A kóstolás szigorúan ajánlott.', sticker: 'Titkos<br>recept!', caption: 'Kicsit girbe, kicsit gurba. Pont jó.', drawTitle: 'Melyik mosolyog rád?', drawAside: 'Nem ér végigkóstolni az összeset.' },
      en: { title: 'One more cookie.<br><em>One little secret.</em>', intro: 'Cinnamon in the air. Flour absolutely everywhere. Someone’s name tucked under a cookie. Go on, pick a good one.', action: 'Let’s see what’s baking', note: 'Quality control is strongly encouraged.', sticker: 'Secret<br>recipe!', caption: 'A little wonky. Quite delicious.', drawTitle: 'Which one has your name on it?', drawAside: 'Taste-testing all of them is cheating.' }
    }
  };
  function fresh() {
    const wishes = {};
    names.forEach((name, i) => { wishes[name] = i === 2 || i === 4 ? [] : [
      { id: `${name}-book`, sample: 'Book', priority: 'high', art: 'book', date: '2026-11-25' },
      { id: `${name}-cup`, sample: 'Cup', priority: 'medium', art: 'cup', date: '2026-11-26' },
      { id: `${name}-time`, sample: 'Time', priority: 'low', art: 'ticket', date: '2026-11-27' }
    ]; });
    return { user: null, assignments: {}, pools: {}, passwords: {}, wishes, claims: { 'Anna-cup': 'someone', 'Kata-cup': 'someone', 'Nagyi-cup': 'someone' }, large: false };
  }
  const memory = {};
  function read(k) { try { return localStorage.getItem(k); } catch { return memory[k] || null; } }
  function write(k, v) { memory[k] = v; try { localStorage.setItem(k, v); } catch { /* The demo remains usable in memory. */ } }
  let state;
  try { state = JSON.parse(read(key)) || fresh(); if (!state.wishes || !state.pools) state = fresh(); } catch { state = fresh(); }
  let lang = read('christmas-prototype-language') || (navigator.language.toLowerCase().startsWith('en') ? 'en' : 'hu');
  if (!copy[lang]) lang = 'hu';
  let paused = read('christmas-prototype-paused') === 'true';
  let screen = state.user ? (state.assignments[state.user] ? 'wishes' : 'draw') : 'welcome';
  let selectedName = '', browseName = '', activeTab = 'recipient', busy = false, modalWish = null, toastTimer, drawTimer;
  let formDraft = null;
  const t = (k, args = {}) => Object.entries(args).reduce((s, [a, v]) => s.replaceAll(`{${a}}`, String(v)), copy[lang][k] || k);
  const tc = k => themeCopy[theme][lang][k];
  const esc = v => String(v ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const roster = () => state.large ? [...names, ...moreNames] : names;
  const persist = () => write(key, JSON.stringify(state));
  const motion = () => !paused && !reduceMotion.matches;
  const button = (label, action, extra = '', cls = '') => `<button class="button ${cls}" data-action="${action}" ${extra}>${label}</button>`;
  function atmosphere(room = false) {
    if (theme === 'village') return `<div class="atmosphere snow ${room ? 'room-snow' : ''}" aria-hidden="true">${Array.from({ length: room ? 14 : 30 }, (_, i) => `<i style="--x:${(i * 37 + 5) % 100}%;--size:${2 + i % 3}px;--duration:${7 + i % 7}s;--delay:-${i % 12}s"></i>`).join('')}</div><div class="atmosphere" aria-hidden="true"><div class="window-glow ${room ? 'glow-room' : ''}"></div>${room ? '<span class="sleepy">z z z</span>' : Array.from({ length: 5 }, (_, i) => `<span class="star" style="--x:${14 + i * 17}%;--y:${10 + i % 3 * 8}%;--size:${13 + i % 3 * 4}px;--delay:-${i}s">✦</span>`).join('')}</div>`;
    return `<div class="atmosphere" aria-hidden="true">${Array.from({ length: 3 }, (_, i) => `<i class="steam" style="--x:${theme === 'letters' ? 3 + i * 2 : 8 + i * 2}%;--y:${theme === 'letters' ? 43 : 68}%;--delay:-${i * 1.3}s"></i>`).join('')}</div>`;
  }
  function scene(cls = '', room = true, pet = true) {
    const asset = theme === 'village' && room ? 'room' : theme;
    return `<div class="scene ${cls}"><img src="assets/${asset}.png" alt="">${atmosphere(theme === 'village' && room)}${theme === 'village' && room && pet ? `<button class="room-hotspot" data-action="pet" aria-label="${t('cat')}"></button>` : ''}</div>`;
  }
  function header() {
    return `<div class="gingham-strip" aria-hidden="true"></div><header class="site-header"><a class="wordmark" href="winter-house/">${icon('gift')}<span>${t('brand')}</span></a><span class="family-label">${t('family')}</span><div class="header-controls"><button class="utility" data-action="motion" aria-label="${t(paused ? 'resume' : 'pause')}" aria-pressed="${paused}">${icon(paused ? 'play' : 'pause')}</button><button class="language" data-action="language" aria-label="${t('language')}">${lang === 'hu' ? 'EN' : 'HU'}</button>${state.user ? `<div class="menu-wrap"><button class="utility" data-action="menu" aria-label="${t('menu')}" aria-expanded="false">${icon('menu')}</button><div class="menu" hidden><div class="menu-label">${esc(state.user)}</div><button data-action="refresh">${icon('refresh')}${t('refresh')}</button><button data-action="signout">${icon('exit')}${t('signout')}</button></div></div>` : ''}</div></header>`;
  }
  function footer() {
    return `<footer class="proto-footer"><a href="winter-house/">${icon('back')}${t('allConcepts')}</a><details class="prototype-tools"><summary>${t('controls')}</summary><div><p>${t('demoNote')}</p><button data-action="restart">${t('restart')}</button><br><button data-action="size">${t(state.large ? 'eight' : 'thirty')}</button></div></details></footer>`;
  }
  function welcome() {
    return `<section class="welcome-grid"><div class="welcome-copy"><p class="eyebrow">${t('member')} · 2026</p><h1 class="welcome-title">${tc('title')}</h1><p class="lede">${tc('intro')}</p>${button(`${tc('action')}${icon('arrow')}`, 'start')}<span class="hand-note">${tc('note')}</span><div class="welcome-meta"><div class="avatar-stack" aria-hidden="true"><i>A</i><i>K</i><i>P</i><i>N</i></div><span>${lang === 'hu' ? `${roster().length} ember. Ugyanannyi meglepetés.` : `${roster().length} people. So many little surprises.`}</span></div></div><div class="scene-wrap"><button class="scene-button" data-action="start" aria-label="${tc('action')}">${scene('welcome-scene', false, false)}<span class="door-hint">${icon('arrow')} ${tc('action')}</span></button><span class="scene-sticker">${tc('sticker')}</span><p class="scene-caption">${tc('caption')}</p></div></section>`;
  }
  function door() {
    return `<section class="door-stage ${motion() ? 'walking' : ''}"><div class="door-camera"><img src="assets/village.png" alt="">${atmosphere(false)}<button class="door-target" data-action="enter" aria-label="${t('enter')}"><span>✦</span></button></div><div class="door-intro"><h1>${t('doorTitle')}</h1><p>${t('doorBody')}</p>${button(`${t('enter')}${icon('arrow')}`, 'enter')}<button class="quiet-link" data-action="door-back">${t('walkBack')}</button></div></section>`;
  }
  function identity() {
    return `<section class="step-grid"><div class="side-scene">${scene()}</div><div class="form-panel"><p class="eyebrow">${t('smallSecret')}</p><h1 class="screen-title">${t('namesTitle')}</h1><p class="screen-intro">${t('namesIntro')}</p><div class="name-list">${roster().map(name => `<button class="name-button" data-action="name" data-name="${esc(name)}"><span class="name-initial" aria-hidden="true">${name[0]}</span><span>${esc(name)}${state.passwords[name] ? `<small>${t('protected')}</small>` : ''}</span></button>`).join('')}</div><p class="sample-note">${tc('note')}</p></div></section>`;
  }
  function password() {
    return `<section class="step-grid"><div class="side-scene">${scene()}</div><div class="form-panel"><button class="quiet-link" data-action="names">${icon('back')}${t('back')}</button><p class="eyebrow">${t('smallSecret')}</p><h1 class="screen-title">${esc(t(state.passwords[selectedName] ? 'welcomeBack' : 'hello', { name: selectedName }))}</h1><p class="screen-intro">${t('passwordIntro')}</p><form id="password-form"><label class="field">${t(state.passwords[selectedName] ? 'password' : 'newPassword')}<input name="password" type="password" minlength="4" required autocomplete="${state.passwords[selectedName] ? 'current-password' : 'new-password'}" aria-describedby="password-help password-error"><small id="password-help">${t('passwordHelp')}</small></label><p class="error" id="password-error" role="alert"></p><button class="button" type="submit">${t('continue')}${icon('arrow')}</button></form><p class="password-note">${t('passwordFoot')}</p></div></section>`;
  }
  function shuffled(items) {
    const a = [...items];
    for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; }
    return a;
  }
  function pool() {
    if (!state.pools[state.user]) {
      const eligible = shuffled(roster().filter(n => n !== state.user));
      state.pools[state.user] = eligible.map((name, i) => ({ name, taken: i > 0 && i % 4 === 0 }));
      persist();
    }
    return state.pools[state.user];
  }
  function treePositions(count) {
    const result = [];
    let row = 0;
    while (result.length < count) {
      const inRow = Math.min(row + 2, count - result.length);
      for (let col = 0; col < inRow; col++) result.push({ x: 50 + (col - (inRow - 1) / 2) * (20 + row * 8), y: 18 + row * 25 });
      row++;
    }
    return result;
  }
  function draw() {
    const slots = pool(), remaining = slots.filter(s => !s.taken).length;
    const tree = theme === 'village';
    const positions = treePositions(slots.length);
    const controls = slots.map((slot, i) => `<button class="draw-option ${slot.taken ? 'gone' : ''}" data-action="pick" data-index="${i}" ${slot.taken ? 'disabled' : ''} aria-label="${t(slot.taken ? 'gone' : tree ? 'chooseBauble' : 'chooseNumber', { n: i + 1 })}" ${tree ? `style="--bx:${positions[i].x}%;--by:${positions[i].y}%"` : ''}><span class="${tree ? 'bauble' : 'gift'}" aria-hidden="true">${tree ? '<i></i>' : '<i class="gift-bow"></i><i class="gift-lid"></i><i class="gift-box"></i>'}</span><small>${slot.taken ? t('gone') : tree ? '' : t('choose')}</small></button>`).join('');
    return `<section class="draw-layout ${tree ? `cat-draw ${slots.length > 10 ? 'many' : ''}` : ''}"><div class="draw-heading"><p class="eyebrow">${t('drawEyebrow')}</p><h1 class="screen-title">${tc('drawTitle')}</h1><p class="screen-intro">${tree ? t('catDraw') : tc('drawAside')}</p><p class="draw-warning">${icon('lock')}${t('warning')}</p></div>${tree ? `<div class="tree-room"><img class="room-background" src="assets/room.png" alt=""><div class="room-vignette"></div>${atmosphere(true)}<div class="interactive-tree" style="--tree-height:${Math.max(410, Math.ceil((Math.sqrt(8 * slots.length + 9) - 3) / 2) * 80 + 110)}px"><div class="tree-star" aria-hidden="true">✦</div><div class="tree-shape" aria-hidden="true"><i></i><i></i><i></i><i></i><b></b></div><div class="draw-options">${controls}</div></div><div class="cat-perch" aria-hidden="true"><img src="assets/cat.png" alt=""><span>z z z</span></div><p class="tree-caption">${tc('drawAside')}</p></div>` : `<div class="draw-surface"><div class="draw-options">${controls}</div></div>`}<div class="draw-progress ${tree ? 'on-dark' : ''}"><span>${t('available', { n: remaining })}</span><span>·</span><span>${t('goneCount', { n: slots.length - remaining })}</span></div>${tree ? `<p class="draw-aside">${t('catHint')}</p>` : ''}</section>`;
  }
  function reveal() {
    return `<section class="reveal-panel"><span class="reveal-ornament" aria-hidden="true">✧</span><p class="eyebrow">${t('revealEyebrow')}</p><div class="reveal-paper"><p>${t('revealTitle')}</p><h1 class="recipient-name">${esc(state.assignments[state.user])}</h1>${lang === 'en' ? '<p>very, very happy.</p>' : ''}<span aria-hidden="true">♡</span></div><p class="lede">${t('revealBody')}</p>${button(`${t('seeWishes')}${icon('arrow')}`, 'wishes')}<p class="reveal-note">${t('revealNote')}</p></section>`;
  }
  function guidelines() {
    return `<details class="guidelines" ${read(`christmas-guidelines-${theme}`) === 'open' ? 'open' : ''}><summary>${t('guidelines')}</summary><p><strong>${t('budget')}</strong></p><p>${t('guidelinesBody')}</p><p>${t('guidelinesTip')}</p><span class="hand-note">${t('guidelinesNote')}</span></details>`;
  }
  function wishText(w) { return w.sample ? t(`wish${w.sample}`) : w.description; }
  function wishDescription(w) { return w.sample ? t(`wish${w.sample}Desc`) : ''; }
  function wishContent(w) {
    const date = new Date(w.date).toLocaleDateString(lang === 'hu' ? 'hu-HU' : 'en-GB', { month: 'short', day: 'numeric' });
    return `<div class="wish-topline"><span class="priority ${w.priority}">${w.priority === 'high' ? '✦' : '◇'} ${t(w.priority)}</span><span class="priority">${t('added', { date })}</span></div><h3>${esc(wishText(w))}</h3>${wishDescription(w) ? `<p>${esc(wishDescription(w))}</p>` : ''}${safeUrl(w.url) ? `<a class="wish-link" href="${esc(w.url)}" target="_blank" rel="noopener noreferrer">${t('giftLink')} ↗</a>` : ''}`;
  }
  // Own wishes have no claim input, state, control, or status in their renderer.
  function ownWish(w) {
    return `<article class="wish-card own-wish"><div class="wish-art" aria-hidden="true">${icon(w.art || 'heart')}</div><div>${wishContent(w)}<div class="own-actions"><button data-action="edit-wish" data-id="${esc(w.id)}" aria-label="${t('edit')}: ${esc(wishText(w))}">${icon('pencil')}</button><button data-action="delete-wish" data-id="${esc(w.id)}" aria-label="${t('delete')}: ${esc(wishText(w))}">${icon('trash')}</button></div></div></article>`;
  }
  function giverWish(w) {
    const claim = state.claims[w.id], mine = claim === state.user;
    return `<article class="wish-card"><div class="wish-art" aria-hidden="true">${icon(w.art || 'heart')}</div><div>${wishContent(w)}<div class="wish-bottom"><button class="claim ${mine ? 'mine' : ''}" data-action="claim" data-id="${esc(w.id)}" ${claim && !mine ? 'disabled' : ''}>${icon(claim ? 'check' : 'gift')}${t(mine ? 'release' : claim ? 'claimed' : 'buy')}</button><span class="claim-help">${t(mine ? 'mineClaim' : 'secretClaim')}</span></div></div></article>`;
  }
  function ownList() {
    const wishes = state.wishes[state.user] || [];
    return `<section class="own-section" id="my-wishes"><div class="own-heading"><h2>${t('ownTitle')}</h2>${button(`+ ${t('addWish')}`, 'new-wish', '', 'small')}</div><p class="screen-intro">${t('ownIntro')}</p>${wishes.length ? wishes.map(ownWish).join('') : `<div class="empty"><h3>${t('ownEmptyTitle')}</h3><p>${t('ownEmptyBody')}</p>${button(t('addWish'), 'new-wish', '', 'small secondary')}</div>`}</section>`;
  }
  function navigation() {
    return `<nav class="navigation" aria-label="${t('menu')}">${[['recipient', 'gift', 'recipientTab'], ['mine', 'heart', 'mineTab'], ['everyone', 'people', 'everyoneTab']].map(([tab, symbol, label]) => `<button data-action="tab" data-tab="${tab}" ${activeTab === tab ? 'aria-current="page"' : ''}>${icon(symbol)}${t(label)}</button>`).join('')}</nav>`;
  }
  function lists() {
    const recipient = state.assignments[state.user];
    if (activeTab === 'everyone' && !browseName) return `${navigation()}<section class="wishes-layout"><aside class="wishes-aside">${scene('list-scene')}<p class="eyebrow">${t('family')}</p><h1 class="screen-title">${t('everyoneTab')}</h1><p class="lede">${t('everyoneIntro')}</p>${guidelines()}</aside><div><h2 class="screen-subtitle">${t('everyoneTitle')}</h2><div class="everyone-grid">${roster().filter(n => n !== state.user).map(n => `<button class="person-card" data-action="person" data-name="${esc(n)}"><span class="name-initial" aria-hidden="true">${n[0]}</span><strong>${esc(n)}</strong><small>${t('wishCount', { n: (state.wishes[n] || []).length })}</small></button>`).join('')}</div></div></section>`;
    const name = activeTab === 'everyone' ? browseName : recipient;
    const list = state.wishes[name] || [];
    return `${navigation()}<section class="wishes-layout"><aside class="wishes-aside">${scene('list-scene')}<p class="eyebrow">${t(activeTab === 'mine' ? 'mineTab' : activeTab === 'everyone' ? 'everyoneTab' : 'recipientEyebrow')}</p><h1 class="screen-title">${esc(activeTab === 'mine' ? state.user : name)}</h1><p class="lede">${t(activeTab === 'mine' ? 'ownIntro' : 'recipientBody')}</p>${activeTab === 'recipient' ? `<p class="secret-note">${icon('lock')}${t('secret')}</p>` : ''}${guidelines()}<span class="hand-note">${tc('note')}</span></aside><div>${activeTab === 'mine' ? ownList() : `${activeTab === 'everyone' ? `<button class="quiet-link" data-action="everyone">${icon('back')}${t('browseBack')}</button>` : ''}<div class="list-heading"><h2>${t('wishList')}</h2><span>${t('wishCount', { n: list.length })}</span></div>${list.length ? list.map(giverWish).join('') : `<div class="empty"><h3>${t('emptyTitle')}</h3><p>${t('emptyBody')}</p></div>`}${activeTab === 'recipient' ? ownList() : ''}`}</div></section>`;
  }
  function render(focus = true) {
    document.documentElement.lang = lang;
    document.body.classList.toggle('motion-paused', paused);
    document.body.dataset.screen = screen;
    const views = { welcome, door, names: identity, password, draw, reveal, wishes: lists };
    app.innerHTML = `${header()}<main class="main screen-enter" id="main">${views[screen]()}</main>${footer()}`;
    document.querySelectorAll('.guidelines').forEach(el => el.addEventListener('toggle', () => write(`christmas-guidelines-${theme}`, el.open ? 'open' : 'closed')));
    if (focus) { const h = document.querySelector('h1'); if (h) { h.tabIndex = -1; h.focus({ preventScroll: true }); } }
    if (screen === 'draw') scheduleWiggle();
  }
  function go(next) { screen = next; render(); window.scrollTo({ top: 0, behavior: 'instant' }); }
  function toast(message) {
    document.querySelector('.toast')?.remove(); clearTimeout(toastTimer);
    const el = document.createElement('div'); el.className = 'toast'; el.textContent = message; el.setAttribute('role', 'status'); document.body.append(el);
    toastTimer = setTimeout(() => el.remove(), 4000);
  }
  async function transition(next) {
    if (busy) return; busy = true;
    if (!motion()) { busy = false; go(next); return; }
    const layer = document.createElement('div'); layer.className = 'portal';
    layer.innerHTML = `<img src="assets/${theme === 'village' ? 'room' : theme}.png" alt=""><div class="loading-caption" role="status">${t('loading')}<small>${t('trivia')}</small><div class="loading-line"></div></div>`;
    document.body.append(layer);
    const img = layer.querySelector('img');
    await img.animate([{ transform: 'scale(1.25)', filter: 'blur(5px)' }, { transform: 'scale(1)', filter: 'blur(0)' }], { duration: 1250, easing: 'cubic-bezier(.2,.65,.2,1)', fill: 'forwards' }).finished;
    go(next);
    await layer.animate([{ opacity: 1 }, { opacity: 0 }], { duration: 400, fill: 'forwards' }).finished;
    layer.remove(); busy = false;
  }
  function celebrate() {
    if (!motion()) return;
    const layer = document.createElement('div'); layer.className = 'confetti'; layer.setAttribute('aria-hidden', 'true');
    layer.innerHTML = Array.from({ length: 22 }, (_, i) => `<i style="--dx:${Math.cos(i * 2.4) * (140 + i * 10)}px;--dy:${Math.sin(i * 2.4) * (160 + i * 11)}px;--size:${10 + i % 4 * 5}px;--c:${['#e3bd74', '#ae5343', '#7e9c6a'][i % 3]};--turn:${i * 35}deg">${i % 3 ? '✦' : '•'}</i>`).join(''); document.body.append(layer); setTimeout(() => layer.remove(), 1800);
  }
  function scheduleWiggle() {
    clearTimeout(drawTimer);
    drawTimer = setTimeout(() => {
      if (screen !== 'draw' || busy) return;
      if (motion()) { const items = [...document.querySelectorAll('.draw-option:not(:disabled)')]; const el = items[Math.floor(Math.random() * items.length)]; el?.classList.add('wiggle'); setTimeout(() => el?.classList.remove('wiggle'), 900); }
      scheduleWiggle();
    }, 6500);
  }
  async function pick(index, el) {
    if (busy || state.assignments[state.user]) return;
    const slot = pool()[index]; if (!slot || slot.taken) return;
    busy = true;
    // Persist this exact slot before animation; reload cannot turn it into another choice.
    state.assignments[state.user] = slot.name; persist();
    document.querySelectorAll('.draw-option').forEach(b => { b.disabled = true; });
    try {
      if (motion() && theme === 'village') {
        const cat = document.querySelector('.cat-perch img');
        const from = cat.getBoundingClientRect(), to = el.getBoundingClientRect();
        const dx = to.left + to.width / 2 - from.left - from.width / 2;
        const dy = to.top + to.height / 2 - from.top - from.height / 2;
        cat.closest('.cat-perch').classList.add('pouncing');
        await cat.animate([{ transform: 'translate(0,0) rotate(-12deg)' }, { transform: `translate(${dx * .5}px,${dy - 55}px) rotate(12deg)`, offset: .6 }, { transform: `translate(${dx}px,${dy}px) rotate(28deg)` }], { duration: 1050, easing: 'cubic-bezier(.3,.05,.55,1)', fill: 'forwards' }).finished;
        el.classList.add('picked'); document.querySelector('.interactive-tree').classList.add('tree-shake');
        await new Promise(r => setTimeout(r, 480));
      } else if (motion()) { el.classList.add('picked'); await new Promise(r => setTimeout(r, 850)); }
    } finally { busy = false; go('reveal'); celebrate(); }
  }
  function safeUrl(value) { if (!value) return ''; try { const url = new URL(value); return ['http:', 'https:'].includes(url.protocol) ? url.href : ''; } catch { return ''; } }
  async function digest(value) {
    if (!globalThis.crypto?.subtle) return `demo:${value.length}:${Array.from(value).reduce((a, c) => (a * 31 + c.charCodeAt(0)) >>> 0, 7)}`;
    const bytes = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(`prototype-only:${value}`));
    return Array.from(new Uint8Array(bytes)).map(v => v.toString(16).padStart(2, '0')).join('');
  }
  function showWishForm(id = null) {
    modalWish = id;
    const existing = id ? (state.wishes[state.user] || []).find(w => w.id === id) : null;
    if (id && !existing) return;
    const w = formDraft || existing || { description: '', url: '', priority: 'medium' };
    const root = document.createElement('div'); root.className = 'modal-backdrop';
    root.innerHTML = `<section class="wish-modal" role="dialog" aria-modal="true" aria-labelledby="wish-form-title"><div class="modal-heading"><h2 id="wish-form-title">${t(id ? 'editWish' : 'newWish')}</h2><button class="utility" data-action="close-modal" aria-label="${t('close')}">${icon('close')}</button></div><form id="wish-form"><label class="field">${t('description')}<textarea name="description" maxlength="500" required placeholder="${t('descriptionPlaceholder')}">${esc(w.sample ? `${wishText(w)}\n${wishDescription(w)}` : w.description)}</textarea></label><label class="field">${t('link')}<input type="url" name="url" value="${esc(w.url || '')}" placeholder="https://…"><small class="preview-fallback" ${w.url ? '' : 'hidden'}>${t('preview')}</small></label><label class="field">${t('priority')}<select name="priority">${['high', 'medium', 'low'].map(p => `<option value="${p}" ${w.priority === p ? 'selected' : ''}>${t(p)}</option>`).join('')}</select></label><p class="error" id="wish-error" role="alert"></p><div class="modal-buttons">${button(t('cancel'), 'close-modal', 'type="button"', 'secondary')}<button class="button" type="submit">${t(id ? 'saveEdit' : 'save')}</button></div></form></section>`;
    document.body.append(root); app.inert = true; root.querySelector('textarea').focus();
    root.querySelector('[name=url]').addEventListener('input', e => { root.querySelector('.preview-fallback').hidden = !e.target.value; });
  }
  function closeModal() { document.querySelector('.modal-backdrop')?.remove(); app.inert = false; formDraft = null; document.querySelector('[data-action=new-wish]')?.focus({ preventScroll: true }); }
  document.addEventListener('click', async event => {
    const el = event.target.closest('[data-action]'); if (!el) return;
    const action = el.dataset.action;
    if (busy && !['motion'].includes(action)) return;
    if (action === 'start') { if (theme === 'village') go('door'); else await transition('names'); }
    else if (action === 'enter') await transition('names');
    else if (action === 'door-back') go('welcome');
    else if (action === 'names') go('names');
    else if (action === 'name') { selectedName = el.dataset.name; go('password'); document.querySelector('[name=password]')?.focus(); }
    else if (action === 'pick') await pick(Number(el.dataset.index), el);
    else if (action === 'wishes') { activeTab = 'recipient'; go('wishes'); }
    else if (action === 'language') {
      const passwordValue = document.querySelector('[name=password]')?.value;
      lang = lang === 'hu' ? 'en' : 'hu'; write('christmas-prototype-language', lang); render(false);
      if (passwordValue) document.querySelector('[name=password]').value = passwordValue;
    }
    else if (action === 'motion') { paused = !paused; write('christmas-prototype-paused', String(paused)); document.body.classList.toggle('motion-paused', paused); el.innerHTML = icon(paused ? 'play' : 'pause'); el.setAttribute('aria-pressed', String(paused)); el.setAttribute('aria-label', t(paused ? 'resume' : 'pause')); }
    else if (action === 'menu') { const menu = el.nextElementSibling; menu.hidden = !menu.hidden; el.setAttribute('aria-expanded', String(!menu.hidden)); }
    else if (action === 'refresh') { render(false); toast(t('refreshed')); }
    else if (action === 'signout') { state.user = null; selectedName = ''; persist(); go('welcome'); }
    else if (action === 'restart' || action === 'size') { const large = action === 'size' ? !state.large : false; state = fresh(); state.large = large; if (large) moreNames.forEach(n => { state.wishes[n] = []; }); persist(); selectedName = ''; activeTab = 'recipient'; browseName = ''; go('welcome'); }
    else if (action === 'tab') {
      if (!state.assignments[state.user]) { toast(t('noDraw')); return; }
      activeTab = el.dataset.tab; browseName = ''; go('wishes');
    }
    else if (action === 'person') { if (el.dataset.name === state.user) return; browseName = el.dataset.name; activeTab = 'everyone'; go('wishes'); }
    else if (action === 'everyone') { browseName = ''; activeTab = 'everyone'; go('wishes'); }
    else if (action === 'claim') {
      const owner = Object.keys(state.wishes).find(n => state.wishes[n].some(w => w.id === el.dataset.id));
      if (!owner || owner === state.user) return;
      const current = state.claims[el.dataset.id]; if (current && current !== state.user) return;
      if (current) delete state.claims[el.dataset.id]; else state.claims[el.dataset.id] = state.user;
      persist(); const scroll = window.scrollY; render(false); window.scrollTo(0, scroll); toast(t(current ? 'claimReleased' : 'claimSaved'));
    }
    else if (action === 'new-wish') showWishForm();
    else if (action === 'edit-wish') showWishForm(el.dataset.id);
    else if (action === 'delete-wish') {
      state.wishes[state.user] = (state.wishes[state.user] || []).filter(w => w.id !== el.dataset.id); delete state.claims[el.dataset.id]; persist(); render(false); toast(t('deleted'));
    }
    else if (action === 'close-modal') closeModal();
    else if (action === 'pet') {
      const parent = el.closest('.scene'); parent.querySelector('.mascot-message')?.remove();
      const bubble = document.createElement('span'); bubble.className = 'mascot-message'; bubble.textContent = t('catSays'); bubble.setAttribute('role', 'status'); parent.append(bubble); setTimeout(() => bubble.remove(), 3600);
    }
  });
  document.addEventListener('submit', async event => {
    if (event.target.id === 'password-form') {
      event.preventDefault(); if (busy) return;
      const passwordValue = new FormData(event.target).get('password'); const error = document.getElementById('password-error');
      if (passwordValue.length < 4) { error.textContent = t('passwordShort'); return; }
      busy = true;
      try {
        const hash = await digest(passwordValue);
        if (state.passwords[selectedName] && state.passwords[selectedName] !== hash) { error.textContent = t('wrongPassword'); return; }
        state.passwords[selectedName] = hash; state.user = selectedName; persist(); activeTab = 'recipient'; go(state.assignments[state.user] ? 'wishes' : 'draw');
      } finally { busy = false; }
    }
    if (event.target.id === 'wish-form') {
      event.preventDefault(); const values = Object.fromEntries(new FormData(event.target));
      const error = document.getElementById('wish-error');
      if (!values.description.trim()) { error.textContent = t('emptyDescription'); return; }
      if (values.url && !safeUrl(values.url)) { error.textContent = t('invalidLink'); return; }
      const wishes = state.wishes[state.user] ||= [];
      const existing = modalWish ? wishes.find(w => w.id === modalWish) : null;
      const wish = { id: existing?.id || `wish-${Date.now()}-${Math.random().toString(36).slice(2)}`, description: values.description.trim().slice(0, 500), url: safeUrl(values.url), priority: ['high', 'medium', 'low'].includes(values.priority) ? values.priority : 'medium', date: existing?.date || new Date().toISOString(), art: existing?.art || 'heart' };
      if (existing) wishes[wishes.indexOf(existing)] = wish; else wishes.push(wish);
      persist(); closeModal(); render(false); toast(t('saved'));
    }
  });
  document.addEventListener('keydown', event => {
    const modal = document.querySelector('.modal-backdrop');
    if (event.key === 'Escape') { if (modal) closeModal(); document.querySelector('.menu')?.setAttribute('hidden', ''); document.querySelector('[data-action=menu]')?.setAttribute('aria-expanded', 'false'); }
    if (event.key === 'Tab' && modal) {
      const focusable = [...modal.querySelectorAll('button,input,textarea,select,a[href]')]; const first = focusable[0], last = focusable.at(-1);
      if (event.shiftKey && document.activeElement === first) { event.preventDefault(); last.focus(); }
      else if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first.focus(); }
    }
  });
  render(false);
})();
