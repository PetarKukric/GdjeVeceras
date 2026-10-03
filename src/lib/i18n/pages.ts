import type { Lang } from './index';

/**
 * Duži tekstovi info stranica (privatnost, uslovi, FAQ, kako funkcioniše) — po jeziku.
 * Odvojeno od sr.ts/en.ts da rječnik interfejsa ostane pregledan.
 */

export const CONTACT_EMAIL = 'gdjevecerasbusiness@gmail.com';
export const LEGAL_UPDATED: Record<Lang, string> = { sr: '1. oktobar 2026.', en: '1 October 2026' };

export interface LegalSection { id: string; title: string; body: (string | string[])[] }

const privacySr: LegalSection[] = [
  { id: 'ko', title: 'Ko smo', body: [
    'Gdje Večeras („mi", „Platforma") je aplikacija za pronalaženje izlazaka i skupljanje Večeras Score bodova u lokalima. Ova politika objašnjava koje podatke prikupljamo, zašto i šta možeš uraditi s njima.',
  ] },
  { id: 'podaci', title: 'Koje podatke prikupljamo', body: [
    'Podatke koje nam sam daješ:',
    ['Nalog: ime, email adresa i lozinka (čuvamo samo njen hash, nikad samu lozinku). Ako se prijaviš preko Google-a, dobijamo tvoje ime, email, profilnu sliku i Google ID.',
     'Profil: profilna slika, kratki opis i fotke iz izlazaka koje sam dodaš.',
     'Aktivnost: sačuvani događaji i lokali, koga pratiš, komentari, prijave problema i poruke sa kontakt forme.'],
    'Podatke koji nastaju korišćenjem:',
    ['Check-in: lokal, vrijeme, način (QR ili fotka), dodijeljeni bodovi i fotka ako je check-in fotkom.',
     'Lokacija: samo u trenutku check-ina i samo ako to dozvoliš u pregledaču. Čuvamo koordinate i udaljenost od lokala da bismo spriječili lažne check-ine. Nikad ih ne prikazujemo drugim korisnicima i ne pratimo te u pozadini.',
     'Bodovi i nagrade: stanje bodova, nivo i kodovi preuzetih nagrada.'],
  ] },
  { id: 'zasto', title: 'Zašto ih koristimo', body: [
    ['Da bi nalog i prijava radili.',
     'Da bismo dodijelili bodove, provjerili check-in i izdali nagrade.',
     'Da bismo prikazali tvoj profil, rang listu i aktivnost ekipi koju pratiš (u skladu sa tvojim podešavanjima privatnosti).',
     'Da bismo slali emailove vezane za nalog (potvrda emaila, reset lozinke).',
     'Da bismo spriječili zloupotrebe (spam, lažni check-ini, ograničenje broja pokušaja).'],
    'Ne prodajemo tvoje podatke i ne koristimo ih za oglašavanje.',
  ] },
  { id: 'vidljivost', title: 'Šta vide drugi korisnici', body: [
    ['Tvoje ime, profilnu sliku, opis, nivo, ukupne bodove i fotke sa profila.',
     'Tvoje nedavne check-ine (lokal i vrijeme) — osim ako ih isključiš u Podešavanjima ili na profilu. Tada ih ne vidi niko osim tebe, ni na rang listi ni u feedu ekipe.',
     'Komentare koje objaviš ispod događaja i lokala.'],
    'Tvoj email, lokaciju i istoriju bodova ne vidi niko osim tebe (i administratora kada je potrebno za podršku).',
  ] },
  { id: 'lokali', title: 'Partner lokali', body: [
    'Partner lokal vidi broj check-ina u svom lokalu i provjerava kodove nagrada koje izdaje. Lokal ne dobija tvoj email ni lokaciju.',
  ] },
  { id: 'kolacici', title: 'Kolačići i lokalna memorija', body: [
    ['bl_session — drži te prijavljenim (neophodan).',
     'gv_lang — pamti izabrani jezik.',
     'Lokalna memorija pregledača — pamti izabrani grad.',
     'Google Analytics — samo ako je uključen na sajtu, za anonimnu statistiku posjeta.'],
  ] },
  { id: 'servisi', title: 'Servisi trećih strana', body: [
    'Podatke obrađuju i servisi koje koristimo za rad Platforme: Vercel (hosting i čuvanje slika), Turso (baza podataka), provajder email usluge, Google (prijava preko Google naloga, ako je koristiš) i servisi mapa (OpenStreetMap / Esri) za prikaz mape.',
  ] },
  { id: 'cuvanje', title: 'Koliko dugo čuvamo podatke', body: [
    'Podatke čuvamo dok imaš nalog. Kada obrišeš nalog, trajno brišemo nalog, profil, fotke (i same fajlove), check-ine, bodove, kodove nagrada, praćenja, komentare, poruke i razgovore u kojima učestvuješ.',
  ] },
  { id: 'prava', title: 'Tvoja prava', body: [
    ['Uvid i ispravka — profil i Podešavanja.',
     'Sakrivanje check-ina — jednim prekidačem.',
     'Brisanje — „Obriši nalog" u Podešavanjima briše sve odmah i trajno.',
     'Za sve ostalo (npr. kopija podataka) piši nam na email ispod.'],
  ] },
  { id: 'zastita', title: 'Kako štitimo podatke', body: [
    'Lozinke čuvamo kao bcrypt hash, sesije su potpisane i mogu se opozvati (promjena lozinke odjavljuje sve druge uređaje), QR kodovi lokala su kriptografski potpisani, a broj pokušaja prijave i slanja je ograničen. Sav saobraćaj ide preko HTTPS-a.',
  ] },
  { id: 'izmjene', title: 'Izmjene i kontakt', body: [
    `O značajnim izmjenama ove politike obavijestićemo te na Platformi. Pitanja o privatnosti: ${CONTACT_EMAIL}`,
  ] },
];

const privacyEn: LegalSection[] = [
  { id: 'ko', title: 'Who we are', body: [
    'Gdje Večeras ("we", "the Platform") is an app for finding nights out and collecting Večeras Score points at venues. This policy explains what data we collect, why, and what you can do about it.',
  ] },
  { id: 'podaci', title: 'What we collect', body: [
    'Data you give us:',
    ['Account: name, email address and password (we store only its hash, never the password itself). If you sign in with Google, we receive your name, email, profile photo and Google ID.',
     'Profile: profile photo, short bio and the night-out photos you add.',
     'Activity: saved events and venues, who you follow, comments, problem reports and contact form messages.'],
    'Data created as you use the app:',
    ['Check-ins: venue, time, method (QR or photo), points awarded and the photo if you checked in with one.',
     'Location: only at the moment of check-in and only if you allow it in your browser. We store the coordinates and distance from the venue to prevent fake check-ins. We never show them to other users and never track you in the background.',
     'Points and rewards: your balance, level and codes for redeemed rewards.'],
  ] },
  { id: 'zasto', title: 'Why we use it', body: [
    ['To run your account and sign-in.',
     'To award points, verify check-ins and issue rewards.',
     'To show your profile, the leaderboard and your activity to people who follow you (according to your privacy settings).',
     'To send account emails (email confirmation, password reset).',
     'To prevent abuse (spam, fake check-ins, attempt limits).'],
    'We do not sell your data and do not use it for advertising.',
  ] },
  { id: 'vidljivost', title: 'What other users see', body: [
    ['Your name, profile photo, bio, level, total points and profile photos.',
     'Your recent check-ins (venue and time) — unless you turn them off in Settings or on your profile. Then nobody but you sees them, not on the leaderboard nor in the crew feed.',
     'Comments you post on events and venues.'],
    'Your email, location and points history are visible only to you (and to administrators when needed for support).',
  ] },
  { id: 'lokali', title: 'Partner venues', body: [
    'A partner venue sees the number of check-ins at its venue and verifies the reward codes it issues. Venues never receive your email or location.',
  ] },
  { id: 'kolacici', title: 'Cookies and local storage', body: [
    ['bl_session — keeps you signed in (required).',
     'gv_lang — remembers your language.',
     'Browser local storage — remembers your city.',
     'Google Analytics — only if enabled on the site, for anonymous visit statistics.'],
  ] },
  { id: 'servisi', title: 'Third-party services', body: [
    'Data is also processed by the services we use to run the Platform: Vercel (hosting and image storage), Turso (database), our email provider, Google (Google sign-in, if you use it) and map providers (OpenStreetMap / Esri) for the map.',
  ] },
  { id: 'cuvanje', title: 'How long we keep data', body: [
    'We keep your data while you have an account. When you delete your account, we permanently delete your account, profile, photos (including the files), check-ins, points, reward codes, follows, comments, messages and conversations you are part of.',
  ] },
  { id: 'prava', title: 'Your rights', body: [
    ['Access and correction — your profile and Settings.',
     'Hiding check-ins — one switch.',
     'Deletion — "Delete account" in Settings removes everything immediately and permanently.',
     'For anything else (e.g. a copy of your data) email us below.'],
  ] },
  { id: 'zastita', title: 'How we protect data', body: [
    'Passwords are stored as bcrypt hashes, sessions are signed and can be revoked (changing your password signs out all other devices), venue QR codes are cryptographically signed, and sign-in and sending attempts are rate-limited. All traffic goes over HTTPS.',
  ] },
  { id: 'izmjene', title: 'Changes and contact', body: [
    `We will announce significant changes to this policy on the Platform. Privacy questions: ${CONTACT_EMAIL}`,
  ] },
];

const termsSr: LegalSection[] = [
  { id: 'opste', title: 'Opšte odredbe', body: [
    'Gdje Večeras služi za pronalaženje događaja i lokala, check-in u lokale, skupljanje Večeras Score bodova i njihovu zamjenu za nagrade. Korišćenjem Platforme prihvataš ove uslove.',
  ] },
  { id: 'nalog', title: 'Nalog', body: [
    ['Moraš imati najmanje 16 godina. Za događaje sa starosnom granicom (npr. 18+) i nagrade koje uključuju alkohol važi zakonska granica — lokal te može tražiti ličnu kartu.',
     'Jedna osoba — jedan nalog. Daj tačne podatke i čuvaj lozinku.',
     'Odgovoran si za sve što se dešava preko tvog naloga.'],
  ] },
  { id: 'bodovi', title: 'Check-in i Večeras Score bodovi', body: [
    ['Bodove dobijaš za check-in u lokalu: skeniranjem QR koda na ulazu ili fotkom uz lokaciju dok si zaista u lokalu.',
     'Možeš se čekirati jednom u 12 sati, u bilo kojem lokalu. Bonus za račun se odobrava tek nakon provjere računa, a jedan račun se može iskoristiti samo jednom.',
     'Zabranjeno je varati: skenirati fotku QR koda van lokala, lažirati lokaciju, praviti više naloga ili dijeliti nalog. Takve check-ine poništavamo, a nalog možemo ograničiti ili obrisati zajedno sa bodovima.',
     'Bodovi nemaju novčanu vrijednost, ne mogu se prodati ni prenijeti na drugi nalog. Pravila bodovanja i nivoa možemo mijenjati uz najavu na Platformi.'],
  ] },
  { id: 'nagrade', title: 'Nagrade', body: [
    ['Nagradu uzimaš zamjenom bodova; dobijaš jednokratni kod koji pokazuješ osoblju lokala (ili GdjeVečeras timu za merch).',
     'Nagrade lokala izdaje lokal i za njih važe pravila tog lokala (radno vrijeme, zaliha, starosna granica). GdjeVečeras merch izdajemo mi.',
     'Zaliha je ograničena. Iskorišten kod se ne može ponovo koristiti; bodovi za iskorišten kod se ne vraćaju.'],
  ] },
  { id: 'sadrzaj', title: 'Sadržaj koji objavljuješ', body: [
    ['Ostaješ vlasnik fotki i komentara koje objaviš, a nama daješ dozvolu da ih prikazujemo na Platformi dok ih ne obrišeš.',
     'Zabranjeno je objavljivati tuđe fotke bez dozvole, uvredljiv, diskriminišući, nasilan, seksualno eksplicitan ili nezakonit sadržaj, i spam.',
     'Takav sadržaj uklanjamo bez najave. Svaki sadržaj možeš prijaviti.'],
  ] },
  { id: 'vlasnici', title: 'Vlasnici lokala', body: [
    'Vlasnici lokala odgovaraju za tačnost svojih događaja, cijena i nagrada, i obavezni su da izdaju nagrade za važeće kodove. Status partnera dodjeljuje i ukida GdjeVečeras.',
  ] },
  { id: 'odgovornost', title: 'Ograničenje odgovornosti', body: [
    'Platformu pružamo „takvu kakva jeste". Ne garantujemo tačnost informacija o događajima — za izmjene i otkazivanja odgovoran je organizator. Ne odgovaramo za ponašanje korisnika i lokala niti za štetu nastalu izlaskom. Pij odgovorno i nikad ne vozi pod uticajem alkohola.',
  ] },
  { id: 'prekid', title: 'Prekid korišćenja', body: [
    'Nalog možeš obrisati u svakom trenutku u Podešavanjima. Mi možemo ograničiti ili obrisati nalog koji krši ove uslove.',
  ] },
  { id: 'izmjene', title: 'Izmjene i kontakt', body: [
    `Uslove možemo mijenjati; o značajnim izmjenama obavještavamo na Platformi. Nastavak korišćenja znači prihvatanje novih uslova. Pitanja: ${CONTACT_EMAIL}`,
  ] },
];

const termsEn: LegalSection[] = [
  { id: 'opste', title: 'General', body: [
    'Gdje Večeras helps you find events and venues, check in at venues, collect Večeras Score points and redeem them for rewards. By using the Platform you accept these terms.',
  ] },
  { id: 'nalog', title: 'Your account', body: [
    ['You must be at least 16. For age-restricted events (e.g. 18+) and rewards that include alcohol the legal age applies — the venue may ask for ID.',
     'One person — one account. Give accurate details and keep your password safe.',
     'You are responsible for everything that happens through your account.'],
  ] },
  { id: 'bodovi', title: 'Check-ins and Večeras Score points', body: [
    ['You earn points by checking in at a venue: by scanning the QR code at the entrance, or with a photo and your location while you are actually at the venue.',
     'You can check in once every 12 hours, at any venue. The receipt bonus is only granted after the receipt is reviewed, and each receipt can be used only once.',
     'Cheating is not allowed: scanning a photo of a QR code outside the venue, faking your location, making multiple accounts or sharing an account. We cancel such check-ins and may restrict or delete the account along with its points.',
     'Points have no cash value and cannot be sold or transferred. We may change the points and level rules with notice on the Platform.'],
  ] },
  { id: 'nagrade', title: 'Rewards', body: [
    ['You redeem a reward with points and receive a one-time code to show to venue staff (or to the GdjeVečeras team for merch).',
     'Venue rewards are issued by the venue and its rules apply (opening hours, stock, age limits). GdjeVečeras merch is issued by us.',
     'Stock is limited. A used code cannot be reused; points spent on a used code are not refunded.'],
  ] },
  { id: 'sadrzaj', title: 'Content you post', body: [
    ['You keep ownership of the photos and comments you post and give us permission to show them on the Platform until you delete them.',
     'Do not post other people\'s photos without permission, offensive, discriminatory, violent, sexually explicit or illegal content, or spam.',
     'We remove such content without notice. You can report any content.'],
  ] },
  { id: 'vlasnici', title: 'Venue owners', body: [
    'Venue owners are responsible for the accuracy of their events, prices and rewards, and must honour valid reward codes. Partner status is granted and revoked by GdjeVečeras.',
  ] },
  { id: 'odgovornost', title: 'Limitation of liability', body: [
    'The Platform is provided "as is". We do not guarantee the accuracy of event information — the organiser is responsible for changes and cancellations. We are not liable for the conduct of users or venues or for any harm arising from a night out. Drink responsibly and never drink and drive.',
  ] },
  { id: 'prekid', title: 'Ending use', body: [
    'You can delete your account at any time in Settings. We may restrict or delete an account that breaks these terms.',
  ] },
  { id: 'izmjene', title: 'Changes and contact', body: [
    `We may change these terms and will announce significant changes on the Platform. Continuing to use the Platform means you accept the new terms. Questions: ${CONTACT_EMAIL}`,
  ] },
];

export const LEGAL: Record<'privacy' | 'terms', Record<Lang, LegalSection[]>> = {
  privacy: { sr: privacySr, en: privacyEn },
  terms: { sr: termsSr, en: termsEn },
};

export interface FaqGroup { id: string; title: string; items: { q: string; a: string }[] }

export const FAQ: Record<Lang, FaqGroup[]> = {
  sr: [
    { id: 'osnove', title: 'Osnove', items: [
      { q: 'Šta je Gdje Večeras?', a: 'Aplikacija za izlaske: vidiš sve žurke, svirke, klubove i pabove u gradu, a za svaki dolazak u lokal skupljaš Večeras Score bodove koje mijenjaš za piće, ulaze i GdjeVečeras merch.' },
      { q: 'Da li je besplatno?', a: 'Da, potpuno. Plaćaš samo ulaz na događaj ako ga lokal naplaćuje — cijena je uvijek napisana na stranici događaja.' },
      { q: 'U kojim gradovima radite?', a: 'Banja Luka, Gradiška, Prnjavor, Srbac, Doboj, Laktaši i Prijedor — i lista raste. Javi nam se ako želiš svoj grad.' },
      { q: 'Kako se prijavljujem?', a: 'Emailom i lozinkom ili jednim klikom preko Google naloga. Potvrdi email da bi mogao skupljati bodove i dodavati fotke.' },
    ] },
    { id: 'bodovi', title: 'Check-in i bodovi', items: [
      { q: 'Kako se čekiram?', a: 'Dva načina: skeniraj GV QR kod na ulazu ili šanku lokala (običnom kamerom telefona ili na stranici Check-in), ili se čekiraj fotkom — uslikaš atmosferu i dozvoliš lokaciju, a mi provjerimo da si u lokalu.' },
      { q: 'Koliko bodova dobijam?', a: 'Svaki lokal daje +10 bodova, a partner lokali i lokali boostovani za vikend +30. Ako izlaziš 3 vikenda zaredom, bodovi se množe ×1,5, a za svaka još 2 vikenda množilac raste za 0,5 (5 vikenda = ×2). U nekim lokalima račun iznad zadatog iznosa (npr. 120 KM) donosi dodatni bonus kad ga lokal odobri.' },
      { q: 'Zašto mi check-in nije prošao?', a: 'Najčešće: već si se čekirao negdje u zadnjih 12 sati, predaleko si od lokala ili lokal nema unesenu lokaciju. Poruka na ekranu kaže tačan razlog.' },
      { q: 'Šta su nivoi?', a: 'Početnik, Stalni gost (100), Noćna ptica (500) i Legenda noći (1.500 ukupno zarađenih bodova). Trošenje bodova ne spušta nivo — on zavisi od ukupno zarađenog.' },
    ] },
    { id: 'nagrade', title: 'Nagrade', items: [
      { q: 'Kako uzimam nagradu?', a: 'Na stranici Nagrade izaberi nagradu i potvrdi. Dobijaš kod (npr. GV-AB12-CD34) koji pokažeš osoblju lokala; za merch se javi nama. Svaki kod važi jednom.' },
      { q: 'Gdje vidim svoje kodove?', a: 'Na dnu stranice Nagrade, u sekciji „Moji kodovi".' },
      { q: 'Mogu li prenijeti bodove prijatelju?', a: 'Ne — bodovi su lični i nemaju novčanu vrijednost.' },
    ] },
    { id: 'privatnost', title: 'Profil i privatnost', items: [
      { q: 'Ko vidi gdje sam izašao?', a: 'Tvoje nedavne check-ine vide drugi na profilu i u feedu ekipe. Jednim prekidačem (profil ili Podešavanja) ih sakriješ od svih.' },
      { q: 'Da li pratite moju lokaciju?', a: 'Ne. Lokaciju tražimo samo u trenutku check-ina fotkom (i opciono kod QR-a, da spriječimo skeniranje od kuće) i nikad je ne prikazujemo drugima.' },
      { q: 'Kako brišem nalog?', a: 'Podešavanja → Obriši nalog. Brišemo sve odmah i trajno, uključujući fotke.' },
    ] },
    { id: 'lokali', title: 'Za lokale', items: [
      { q: 'Kako moj lokal postaje partner?', a: 'Piši nam preko kontakt forme (tema „Postani partner"). Dobijaš vlasnički pristup panelu, QR kod za ulaz i možeš dodavati događaje i svoje nagrade.' },
      { q: 'Kako provjeravam kod nagrade na šanku?', a: 'U panelu → Nagrade i kodovi → „Provjeri kod gosta". Kod označiš kao iskorišten kad izdaš nagradu.' },
    ] },
  ],
  en: [
    { id: 'osnove', title: 'Basics', items: [
      { q: 'What is Gdje Večeras?', a: 'An app for nights out: see every party, gig, club and pub in town, and earn Večeras Score points for every visit to a venue — then trade them for drinks, entry and GdjeVečeras merch.' },
      { q: 'Is it free?', a: 'Yes, completely. You only pay for event entry if the venue charges it — the price is always shown on the event page.' },
      { q: 'Which cities do you cover?', a: 'Banja Luka, Gradiška, Prnjavor, Srbac, Doboj, Laktaši and Prijedor — and growing. Let us know if you want your city.' },
      { q: 'How do I sign in?', a: 'With email and password, or one click with Google. Confirm your email to collect points and add photos.' },
    ] },
    { id: 'bodovi', title: 'Check-ins and points', items: [
      { q: 'How do I check in?', a: 'Two ways: scan the GV QR code at the entrance or bar of a venue (with your regular phone camera or on the Check-in page), or check in with a photo — snap the vibe and allow location so we can confirm you are there.' },
      { q: 'How many points do I get?', a: 'Every venue gives +10 points, while partner venues and venues boosted for the weekend give +30. Go out 3 weekends in a row and your points are multiplied ×1.5, growing by 0.5 for every 2 more weekends (5 weekends = ×2). At some venues a receipt above a set amount (e.g. 120 KM) earns an extra bonus once the venue approves it.' },
      { q: 'Why did my check-in fail?', a: 'Usually: you already checked in somewhere in the last 12 hours, you are too far from the venue, or the venue has no location set. The on-screen message tells you exactly why.' },
      { q: 'What are levels?', a: 'Rookie, Regular (100), Night Owl (500) and Night Legend (1,500 points earned in total). Spending points never lowers your level — it depends on total points earned.' },
    ] },
    { id: 'nagrade', title: 'Rewards', items: [
      { q: 'How do I redeem a reward?', a: 'Pick a reward on the Rewards page and confirm. You get a code (e.g. GV-AB12-CD34) to show venue staff; for merch, contact us. Each code works once.' },
      { q: 'Where are my codes?', a: 'At the bottom of the Rewards page, under "My codes".' },
      { q: 'Can I give points to a friend?', a: 'No — points are personal and have no cash value.' },
    ] },
    { id: 'privatnost', title: 'Profile and privacy', items: [
      { q: 'Who can see where I went?', a: 'Others see your recent check-ins on your profile and in their crew feed. One switch (profile or Settings) hides them from everyone.' },
      { q: 'Do you track my location?', a: 'No. We ask for location only at the moment of a photo check-in (and optionally for QR, to stop scanning from home) and never show it to anyone.' },
      { q: 'How do I delete my account?', a: 'Settings → Delete account. Everything is removed immediately and permanently, including photos.' },
    ] },
    { id: 'lokali', title: 'For venues', items: [
      { q: 'How does my venue become a partner?', a: 'Message us via the contact form (topic "Become a partner"). You get owner access to the dashboard, a QR code for your entrance, and can post events and your own rewards.' },
      { q: 'How do I verify a reward code at the bar?', a: 'Dashboard → Rewards & codes → "Check guest code". Mark it as used when you hand over the reward.' },
    ] },
  ],
};
