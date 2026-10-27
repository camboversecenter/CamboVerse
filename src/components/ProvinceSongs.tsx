import { useEffect, useRef, useState } from 'react';
import { PROVINCE_MEDIA,PROVINCE_INTRO_URL } from '../provinceMedia';
import './ProvinceSongs.css';

export default function ProvinceSongs({ onBack, initialId }: { onBack: () => void; initialId?: string }) {
  const [id, setId] = useState(() => PROVINCE_MEDIA.find(p => p.id === initialId)?.id ?? PROVINCE_MEDIA[0].id);
  const [image, setImage] = useState<'look' | 'face' | 'body'>('look');
  const [audioError, setAudioError] = useState(false);
  const [imageError, setImageError] = useState(false);
  const [search,setSearch]=useState('');
  const audio = useRef<HTMLAudioElement>(null);
  const media = PROVINCE_MEDIA.find(p => p.id === id)!;
  const avatar = media.avatar;
  const visible=PROVINCE_MEDIA.filter(p=>`${p.avatar.province} ${p.avatar.provinceKm} ${p.avatar.name} ${p.avatar.nameKm}`.toLowerCase().includes(search.trim().toLowerCase()));

  useEffect(() => {
    const player = audio.current;
    return () => { player?.pause(); };
  }, [id]);

  const select = (next: string) => {
    if (next === id) return;
    audio.current?.pause();
    setId(next);
    setImage('look');
    setAudioError(false);
    setImageError(false);
  };

  const back = () => {
    // A shared preview URL must not reopen the preview when the map is refreshed.
    const url = new URL(window.location.href);
    url.searchParams.delete('view');
    url.searchParams.delete('province');
    window.history.replaceState(null, '', url.pathname + url.search + url.hash);
    onBack();
  };

  return <main className="province-songs">
    <header className="province-songs-header">
      <button type="button" onClick={back}>← Map</button>
      <span>CamboVerse · Province collection</span>
      <span className="province-preview-badge">Preview</span>
    </header>
    <div className="province-songs-content">
      <div className="province-songs-intro">
        <p className="province-eyebrow">Meet the voices of Cambodia</p>
        <h1>Province Songs &amp; Characters</h1>
        <p>Explore all {PROVINCE_MEDIA.length} province and capital collections, with their songs and fictional AI characters.</p>
        <a href={PROVINCE_INTRO_URL} target="_blank" rel="noreferrer">Watch the 25-character introduction ↗</a>
      </div>
      <label className="province-song-search">Find a province or character
        <input type="search" value={search} onChange={e=>setSearch(e.target.value)} placeholder="Province or character name"/>
      </label>
      <p className="province-song-count">{visible.length} of {PROVINCE_MEDIA.length} collections</p>
      <nav className="province-song-picker" aria-label="Choose a province song">
        {visible.map(p => <button key={p.id} type="button" aria-pressed={id === p.id} onClick={() => select(p.id)}>
          <img src={p.thumbnail} alt="" width="48" height="48" loading="lazy" />
          <span><strong>{p.avatar.province}</strong><small>{p.avatar.name} · <span lang="km">{p.avatar.nameKm}</span></small></span>
        </button>)}
      </nav>
      <article className="province-song-detail" key={id} aria-label={`${avatar.province} song and character`}>
        <div className="province-character">
          <div className="province-character-stage">
            {imageError ? <p>Image unavailable. Choose another view.</p>
              : <img key={media[image]} src={media[image]} alt={`${avatar.name}, fictional AI character for ${avatar.province} — ${image === 'face' ? 'portrait' : image === 'body' ? 'full body' : 'approved look'}`} onError={() => setImageError(true)} />}
            <span>AI-generated character</span>
          </div>
          <div className="province-image-picker" role="group" aria-label="Character image">
            {(['look', 'face', 'body'] as const).map(view => <button key={view} type="button" aria-pressed={image === view} onClick={() => { setImage(view); setImageError(false); }}>
              {view === 'look' ? 'Approved look' : view === 'face' ? 'Portrait' : 'Full body'}
            </button>)}
          </div>
        </div>
        <div className="province-song-copy">
          <p className="province-eyebrow">{avatar.province} · <span lang="km">{avatar.provinceKm}</span></p>
          <h2>{avatar.name} <span lang="km">{avatar.nameKm}</span></h2>
          <p className="province-character-summary">{avatar.persona.summary}</p>
          <section className="province-music-card" aria-label={`${avatar.province} music player`}>
            <p className="province-eyebrow">The province song</p>
            <h3 lang="km">{media.titleKm}</h3>
            <p>{media.title}</p>
            <audio key={media.song} ref={audio} src={media.song} controls preload="none" aria-label={`Play ${media.title}`} onError={() => setAudioError(true)} />
            {audioError && <p role="alert">The song could not load. Try the original audio file below.</p>}
            <a href={media.song} target="_blank" rel="noreferrer">Open original audio ↗</a>
          </section>
          <details className="province-song-section">
            <summary>Read lyrics <span lang="km">អត្ថបទចម្រៀង</span></summary>
            <div className="province-lyrics" lang="km">{media.lyrics}</div>
          </details>
          <details className="province-song-section">
            <summary>Meet {avatar.name}</summary>
            <p>{avatar.persona.greetingEn}</p>
            <p lang="km">{avatar.persona.greetingKm}</p>
            <p>This preview shows the character profile and song. A live conversation is not available here yet.</p>
          </details>
          <details className="province-song-section">
            <summary>Credits &amp; licence</summary>
            <p>{avatar.name}, CamboVerse Provinces — {avatar.province}, CamboVerse Center. CC BY 4.0. AI-generated character; song made with Suno.</p>
            <pre>{media.rights}</pre>
            <a href="https://creativecommons.org/licenses/by/4.0/" target="_blank" rel="noreferrer">CC BY 4.0 licence ↗</a>
          </details>
        </div>
      </article>
      <footer className="province-songs-footer">All {PROVINCE_MEDIA.length} collections preserved from the CamboVerse Provinces archive · Character images and songs are AI-generated.</footer>
    </div>
  </main>;
}
