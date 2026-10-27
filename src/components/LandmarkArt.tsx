import type { ReactNode } from "react";

/** Original schematic landmark illustrations, shared by map symbols and site cards. */
export function LandmarkArt({ siteId, compact = false }: { siteId: string; compact?: boolean }) {
  const tower = (x: number, y: number, h: number, width = 12) => (
    <g key={`${x}-${y}`}>
      <path d={`M${x-width/2} ${y}v-${h*.55}l${width*.18} -3v-${h*.2}l${width*.2} -3L${x} ${y-h}l${width*.12} ${h*.25} ${width*.2} 3v${h*.2}l${width*.18} 3V${y}Z`} />
      <path d={`M${x-2} ${y}v-9h4v9`} fill="#473d35" stroke="none" />
    </g>
  );
  const trees = <g fill="#578775" stroke="none"><circle cx="17" cy="26" r="13"/><circle cx="88" cy="24" r="16"/><circle cx="78" cy="14" r="10"/></g>;
  let art: ReactNode;
  switch (siteId) {
    case "angkor-wat":
      art = <><path d="M12 62h80v-8H12Z"/>{[24,38,52,66,80].map((x,i)=>tower(x,54,[22,32,44,32,22][i],13))}<path d="M10 68h84M20 72h64" stroke="#79c1bb" fill="none"/></>;
      break;
    case "bayon":
      art = <><path d="M21 65h62v-9H21Z"/>{tower(30,56,28,17)}{tower(77,56,24,16)}<path d="M39 58V27l4-6v-7h18v7l5 6v31Z"/><path d="M43 35q4-3 7 0m5 0q4-3 7 0M52 36l-2 9h5m-10 5q7 6 14 0" fill="none" stroke="#655343" strokeWidth="2"/></>;
      break;
    case "ta-prohm":
    case "beng-mealea":
    case "preah-khan":
      art = <>{trees}<path d="M16 62V39h17v-9h36v9h19v23H61V46H43v16Z"/>{siteId === "preah-khan" ? <path d="M34 33l18-17 18 17M18 44h15m38 0h16" fill="none"/> : <path d={siteId === "ta-prohm" ? "M62 9q-8 19-8 28l-7 13-10 15m17-28 9 15 15 11M66 11q-5 25-3 32l9 23" : "M25 10q14 18 11 36l-11 19m12-26 13 23M61 58l9-9 12 7-5 10"} fill="none" stroke="#b4a37d" strokeWidth="5"/>}</>;
      break;
    case "royal-palace":
      art = <g fill="#e3b65d"><path d="M20 61V43h64v18M12 43l40-21 40 21ZM23 32 52 15l29 17Z"/>{tower(52,29,25,8)}<path d="M30 45v16m14-16v16m16-16v16m14-16v16" stroke="#fff0be" strokeWidth="3"/></g>;
      break;
    case "wat-phnom":
      art = <><path d="M6 69q17-28 46-28t46 28" fill="#618269" stroke="none"/><path d="M57 47h22l-3-9-4-7-4-22-4 22-4 7Z" fill="#f1ead7"/><path d="M20 52V38h32v14M15 38l21-16 22 16Z" fill="#c77f50"/><path d="m40 54-5 4h8l-6 4h9l-6 4" stroke="#dfc8a0" fill="none"/></>;
      break;
    case "pre-rup":
      art = <g fill="#bd8158"><path d="M10 66h84v-7H17v-7h70v-7H24v-7h56v7"/>{tower(32,45,21,13)}{tower(52,45,33,15)}{tower(73,45,21,13)}<path d="M49 66V48h6v18" fill="#795c45"/></g>;
      break;
    case "koh-ker":
      art = <><path d="M13 65v-8h7v-8h7v-8h7v-8h7v-8h23v8h7v8h7v8h7v8h7v8Z"/><path d="M48 65V29h8v36" fill="#8f7357"/><path d="M20 57h27m11 0h27M27 49h20m11 0h20M34 41h13m11 0h13" fill="none"/></>;
      break;
    case "phnom-kulen":
      art = <><path d="M7 64 25 31l16 9 18-25 37 49Z" fill="#608875" stroke="none"/><path d="M52 25h17l-4 16 7 6-8 19H43l12-21-8-7Z" fill="#9cd3cd" stroke="#c8ede3"/><path d="M21 69h65" stroke="#9cd3cd"/></>;
      break;
    case "oudong":
      art = <><path d="M4 69q25-35 48-28 20-19 48 28" fill="#688875" stroke="none"/>{[27,51,77].map((x,i)=><g key={x} fill="#f0e4c6"><path d={`M${x-8} 53h16l-2-7-3-4-3-${18+i*4}-3 ${18+i*4}-3 4Z`}/></g>)}</>;
      break;
    case "preah-vihear":
      art = <><path d="M7 67h87L78 53 23 49Z" fill="#647e74" stroke="none"/><path d="M20 52V35h18V24h29v11h17v17H60V39H45v13Z"/><path d="m33 24 19-14 20 14M47 55l-8 13" fill="none"/></>;
      break;
    case "banteay-srei":
      art = <g fill="#cc927e"><path d="M14 63h76v-8H14Z"/>{tower(28,55,29,18)}{tower(52,55,42,21)}{tower(77,55,29,18)}<path d="M41 32q11-12 22 0M44 37q8-8 16 0" fill="none" stroke="#f2c7a5"/></g>;
      break;
    case "sambor-prei-kuk":
      art = <g fill="#b5815d">{tower(27,62,30,19)}{tower(53,62,45,25)}{tower(79,62,29,18)}<path d="M40 36h26M40 41h26" stroke="#e0af7c"/></g>;
      break;
    case "banteay-chhmar":
      art = <><path d="M12 63V44h17v8h48v-8h15v19Z"/>{tower(42,54,38,20)}{tower(66,54,32,18)}<path d="M36 32h4m5 0h4m-12 9q6 4 11 0m13-5h3m4 0h3" fill="none" stroke="#645443" strokeWidth="2"/></>;
      break;
    default:
      art = <>{tower(52,62,45,28)}<path d="M22 65h60"/></>;
  }
  return (
    <svg className={`landmark-art${compact ? " compact" : ""}`} viewBox="0 0 104 78" aria-hidden="true" focusable="false">
      {!compact && <><rect width="104" height="78" rx="9" fill="#203d40"/><circle cx="81" cy="17" r="9" fill="#d4ba7b" opacity=".65"/><path d="M0 60q25-12 53 0t51-2v20H0Z" fill="#304f47"/></>}
      <g fill="#d9bd88" stroke="#907449" strokeWidth="1" strokeLinejoin="round" strokeLinecap="round">{art}</g>
    </svg>
  );
}
