/**
 * Template se (za razliku od layouta) ponovo montira pri svakoj navigaciji, pa sadržaj
 * nove stranice "uđe" (fade + podizanje). Veliku tranziciju sa pink stubovima radi
 * PageTransition u layout.tsx. Animacija završava na `transform: none` da ne bi pravila
 * containing block za `position: fixed` elemente (modali, dock).
 */
export default function Template({ children }: { children: React.ReactNode }) {
  return <div className="page-enter flex-grow flex flex-col">{children}</div>;
}
