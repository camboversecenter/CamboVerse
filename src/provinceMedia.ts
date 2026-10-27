import battambang from '../camboverse-provinces/03-battambang/avatar/avatar.json';
import kampongThom from '../camboverse-provinces/07-kampong-thom/avatar/avatar.json';
import mondulkiri from '../camboverse-provinces/13-mondulkiri/avatar/avatar.json';
import battambangFace from '../camboverse-provinces/03-battambang/avatar/face.jpg';
import battambangBody from '../camboverse-provinces/03-battambang/avatar/body.jpg';
import battambangLook from '../camboverse-provinces/03-battambang/avatar/look-D-approved.jpg';
import battambangSong from '../camboverse-provinces/03-battambang/song/battambang-beloved.mp3';
import battambangLyrics from '../camboverse-provinces/03-battambang/song/lyrics.txt?raw';
import battambangRights from '../camboverse-provinces/03-battambang/song/rights.txt?raw';
import kampongThomFace from '../camboverse-provinces/07-kampong-thom/avatar/face.jpg';
import kampongThomBody from '../camboverse-provinces/07-kampong-thom/avatar/body.jpg';
import kampongThomLook from '../camboverse-provinces/07-kampong-thom/avatar/look-D-approved.jpg';
import kampongThomSong from '../camboverse-provinces/07-kampong-thom/song/kampong-thom-shelter-of-the-heart.mp3';
import kampongThomLyrics from '../camboverse-provinces/07-kampong-thom/song/lyrics.txt?raw';
import kampongThomRights from '../camboverse-provinces/07-kampong-thom/song/rights.txt?raw';
import mondulkiriFace from '../camboverse-provinces/13-mondulkiri/avatar/face.jpg';
import mondulkiriBody from '../camboverse-provinces/13-mondulkiri/avatar/body.jpg';
import mondulkiriLook from '../camboverse-provinces/13-mondulkiri/avatar/look-E-approved.jpg';
import mondulkiriSong from '../camboverse-provinces/13-mondulkiri/song/mondulkiri-paradise.mp3';
import mondulkiriLyrics from '../camboverse-provinces/13-mondulkiri/song/lyrics.txt?raw';
import mondulkiriRights from '../camboverse-provinces/13-mondulkiri/song/rights.txt?raw';

export const PROVINCE_MEDIA = [
  { id: 'battambang', avatar: battambang, face: battambangFace, body: battambangBody, look: battambangLook,
    song: battambangSong, lyrics: battambangLyrics, rights: battambangRights,
    title: 'Battambang, Beloved', titleKm: 'បាត់ដំបងបណ្ដូលចិត្ត', mood: 'Funky 80s synth-pop', duration: '3:30' },
  { id: 'kampong-thom', avatar: kampongThom, face: kampongThomFace, body: kampongThomBody, look: kampongThomLook,
    song: kampongThomSong, lyrics: kampongThomLyrics, rights: kampongThomRights,
    title: 'Kampong Thom, Shelter of the Heart', titleKm: 'កំពង់ធំជម្រំចិត្ត', mood: 'Khmer bedroom-pop with roneat', duration: '4:05' },
  { id: 'mondulkiri', avatar: mondulkiri, face: mondulkiriFace, body: mondulkiriBody, look: mondulkiriLook,
    song: mondulkiriSong, lyrics: mondulkiriLyrics, rights: mondulkiriRights,
    title: 'Mondulkiri, Paradise', titleKm: 'មណ្ឌលគិរី ឋានសួគ៌', mood: 'Tropical acoustic pop', duration: '3:55' },
];
