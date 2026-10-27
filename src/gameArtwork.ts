import { timingZone, type GameState } from './khmerGameEngine';

/** Original vector-style canvas artwork; also used as the WebXR game board. */
export function drawGameBoard(c: CanvasRenderingContext2D, s: GameState, accent: string) {
  const width = 600, height = 280;
  c.clearRect(0, 0, width, height);
  const bg = c.createLinearGradient(0, 0, 0, height); bg.addColorStop(0, '#183b36'); bg.addColorStop(1, '#0e2423');
  c.fillStyle = bg; c.fillRect(0, 0, width, height);
  c.fillStyle = '#29453a'; c.beginPath(); c.ellipse(300, 265, 390, 85, 0, 0, Math.PI * 2); c.fill();
  const line = (x1: number, y1: number, x2: number, y2: number, color: string, weight = 2) => {
    c.strokeStyle = color; c.lineWidth = weight; c.lineCap = 'round'; c.beginPath(); c.moveTo(x1, y1); c.lineTo(x2, y2); c.stroke();
  };
  const circle = (x: number, y: number, r: number, color: string) => { c.fillStyle = color; c.beginPath(); c.arc(x, y, r, 0, Math.PI * 2); c.fill(); };
  const label = (text: string, x: number, y: number, color = '#e5ecdf', size = 13) => { c.fillStyle = color; c.font = `600 ${size}px system-ui`; c.textAlign = 'center'; c.fillText(text, x, y); };
  const rect = (x: number, y: number, w: number, h: number, color: string, radius = 6) => { c.fillStyle = color; c.beginPath(); c.roundRect(x, y, w, h, radius); c.fill(); };
  line(20, 17, 580, 17, '#8aab8b', 1);
  for (let i = 0; i < 15; i++) {
    c.fillStyle = ['#d6a44d', '#cf6d51', '#69a89e'][i % 3]; c.beginPath();
    c.moveTo(25 + i * 39, 17); c.lineTo(47 + i * 39, 17); c.lineTo(36 + i * 39, 37); c.fill();
  }
  const runner = (x: number, y: number, color: string, hop: number, sack = true, facing = 1) => {
    c.save(); c.translate(x, y - hop); c.scale(facing, 1);
    circle(0, -37, 11, '#d29a72');
    c.fillStyle = '#302d28'; c.beginPath(); c.arc(0, -41, 11, Math.PI, Math.PI * 2); c.fill();
    rect(-12, -24, 24, 30, color, 9);
    line(-12, -17, -21, 3, '#d29a72', 7); line(12, -17, 21, 3, '#d29a72', 7);
    if (sack) {
      c.fillStyle = '#bd9d68'; c.beginPath(); c.moveTo(-21, -1); c.quadraticCurveTo(-28, 35, -18, 39); c.lineTo(18, 39); c.quadraticCurveTo(27, 30, 21, -1); c.closePath(); c.fill();
      line(-20, 0, 20, 0, '#e1ca95', 4);
      for (let i = -12; i <= 12; i += 8) line(i, 6, i - 2, 34, '#a6885c', 1);
    } else {
      line(-7, 6, -14, 35, '#24382e', 9); line(7, 6, 15, 35, '#24382e', 9);
      line(8, -14, 29, -3, '#d29a72', 7);
    }
    c.restore();
  };
  const track = (value: number, zone: [number, number], title: string) => {
    rect(52, 231, 496, 16, '#122725');
    rect(52 + zone[0] * 4.96, 231, (zone[1] - zone[0]) * 4.96, 16, '#79b99c');
    line(52 + value * 4.96, 226, 52 + value * 4.96, 253, '#fff8df', 4);
    label(title, 300, 271, '#b8d1c3', 12);
  };
  if (s.kind === 'aim') {
    const x = 52 + s.target * 4.96;
    line(61, 50, 540, 50, '#956846', 10); line(535, 50, 535, 208, '#805839', 12);
    line(x, 50, x, 94, '#c1ac7b', 2);
    const pot = c.createLinearGradient(x - 35, 0, x + 35, 0); pot.addColorStop(0, '#8b4028'); pot.addColorStop(.45, '#da8f5d'); pot.addColorStop(1, '#9e4d2d');
    c.fillStyle = pot; c.beginPath(); c.moveTo(x - 13, 93); c.bezierCurveTo(x - 10, 109, x - 39, 108, x - 36, 138); c.bezierCurveTo(x - 31, 175, x + 31, 175, x + 36, 138); c.bezierCurveTo(x + 39, 108, x + 10, 109, x + 13, 93); c.closePath(); c.fill();
    c.strokeStyle = '#e0a475'; c.lineWidth = 4; c.beginPath(); c.ellipse(x, 94, 14, 4, 0, 0, Math.PI * 2); c.stroke();
    if (s.feedback === 'A clean hit!') { line(x, 99, x - 9, 123, '#492d20', 2); line(x - 9, 123, x + 8, 139, '#492d20', 2); line(x + 8, 139, x, 162, '#492d20', 2); }
    const mx = 52 + s.position * 4.96;
    line(mx - 12, 211, mx + 16, s.cooldown > 0 ? 150 : 185, '#e6c592', 8);
    track(s.position, timingZone(s), 'Swing inside the highlighted zone');
  } else if (s.kind === 'race') {
    for (let lane = 0; lane < 2; lane++) {
      const y = lane === 0 ? 111 : 212;
      line(65, y + 41, 554, y + 41, '#6e8974', 2);
      for (let j = 0; j < 5; j++) rect(546 + j % 2 * 8, y - 30 + j * 14, 8, 14, j % 2 ? '#dae4cc' : '#4a5e4c', 0);
      const progress = lane === 0 ? s.you : s.rival;
      const hop = s.phase === 'playing' ? Math.abs(Math.sin(s.elapsed * 9)) * (lane === 0 && s.cooldown > 0 ? 0 : 7) : 0;
      runner(72 + progress * 4.6, y, lane === 0 ? accent : '#d57d5e', hop);
      label(lane === 0 ? `YOU · ${Math.round(s.you)}%` : `RIVAL · ${Math.round(s.rival)}%`, 140, y - 54, '#d7e2ce', 11);
    }
    label('FINISH', 546, 65, '#d7e2ce', 11);
  } else if (s.kind === 'tug') {
    const shift = (s.you - 50) * 1.45;
    [100, 152, 204].forEach(x => runner(x + shift * .5, 153, '#d47c5c', 0, false, 1));
    [396, 448, 500].forEach(x => runner(x + shift * .5, 153, accent, 0, false, -1));
    line(62 + shift, 151, 538 + shift, 151, '#d2b479', 5);
    rect(293 + shift, 141, 14, 24, '#edb94d', 2);
    line(227, 179, 227, 209, '#e9d6a4', 2); line(373, 179, 373, 209, '#e9d6a4', 2);
    label('RIVAL', 115, 72); label('YOUR TEAM', 483, 72);
    label(`${Math.round(s.you)}% towards your side`, 300, 211, '#dae7d7', 12);
    track(s.position, timingZone(s), 'Pull together on the green beat');
  } else {
    const p = s.position / 100, x = 60 + p * 480, y = 185 - Math.sin(p * Math.PI) * 100;
    runner(60, 164, '#d47c5c', 0, false, 1); runner(540, 164, accent, 0, false, -1);
    c.save(); c.translate(x, y); c.rotate(p * Math.PI * 2);
    c.fillStyle = '#dc725e'; c.beginPath(); c.moveTo(-5, 5); c.quadraticCurveTo(-22, 18, -35, 7); c.lineTo(-25, 25); c.quadraticCurveTo(-7, 26, 8, 8); c.fill();
    rect(-12, -12, 24, 24, '#e6c09a', 7);
    line(-8, -10, 7, 10, '#b75549', 3); line(-9, 5, 9, -5, '#b75549', 3); c.restore();
    track(s.position, timingZone(s), 'Catch the knotted scarf inside the zone');
  }
  if (s.phase === 'countdown') {
    circle(300, 135, 43, '#102723ed'); label(String(Math.ceil(s.countdown)), 300, 151, '#f4deb0', 46);
  }
}
