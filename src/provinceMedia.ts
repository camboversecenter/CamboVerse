import tracker from '../camboverse-provinces/README.md?raw';

export interface ProvinceAvatar {
  id:string;province:string;provinceKm:string;name:string;nameKm:string;
  refs:{face:string;body:string;approved:string};
  persona:{summary:string;greetingEn:string;greetingKm:string};
}

// Include the complete reviewed Git collection, rather than a three-item demo.
const avatars=import.meta.glob<ProvinceAvatar>('../camboverse-provinces/*/avatar/avatar.json',{eager:true,import:'default'});
const images=import.meta.glob<string>('../camboverse-provinces/*/avatar/*.{jpg,jpeg,png,webp}',{eager:true,query:'?url',import:'default'});
const songs=import.meta.glob<string>('../camboverse-provinces/*/song/*.mp3',{eager:true,query:'?url',import:'default'});
const text=import.meta.glob<string>('../camboverse-provinces/*/song/*.txt',{eager:true,query:'?raw',import:'default'});

export const PROVINCE_MEDIA=Object.entries(avatars).sort(([a],[b])=>a.localeCompare(b)).map(([path,avatar])=>{
  const base=path.slice(0,path.indexOf('/avatar/')),folder=base.split('/').at(-1)!;
  const songEntry=Object.entries(songs).find(([key])=>key.startsWith(`${base}/song/`));
  const trackerRow=tracker.split('\n').find(line=>line.includes(`](./${folder}/)`));
  const titleKm=trackerRow?.split('|')[4]?.trim()??avatar.provinceKm;
  const title=songEntry?.[0].split('/').at(-1)?.replace(/\.mp3$/,'').split('-').map(w=>w[0].toUpperCase()+w.slice(1)).join(' ')??`${avatar.province} song`;
  return {
    id:folder.replace(/^\d+[-]/,''),folder,avatar,title,titleKm,
    face:images[`${base}/avatar/${avatar.refs.face}`],body:images[`${base}/avatar/${avatar.refs.body}`],
    look:images[`${base}/avatar/${avatar.refs.approved}`],thumbnail:`/province-thumbnails/${folder}.webp`,
    song:songEntry?.[1]??'',lyrics:text[`${base}/song/lyrics.txt`]??'',rights:text[`${base}/song/rights.txt`]??'',
  };
});
export const PROVINCE_INTRO_URL='https://github.com/camboversecenter/CamboVerse/blob/main/camboverse-provinces/video/camboverse-provinces-avatars-16x9.mp4';
