/** Camera stops aligned to the compact Blender compositions, not survey coordinates. */
type V3 = [number, number, number];
type Stop = { target: V3; camera: V3 };
const stop = (target: V3, camera: V3): Stop => ({ target, camera });
export const HERITAGE_HOTSPOTS: Record<string, Record<string, Stop>> = {
  'angkor-wat': {
    'moat-bridge': stop([0, .3, 18], [5, 3, 22]),
    'western-gate': stop([0, 1.4, 14.6], [4, 3.5, 20.5]),
    causeway: stop([0, .35, 8], [2.2, 2, 12.5]),
    'reflecting-ponds': stop([-6.2, -.04, 8], [-6.2, 2.8, 12.5]),
    'temple-galleries': stop([-5, 1.45, 2.5], [-6, 3.4, 8.5]),
    'central-sanctuary': stop([0, 6, -6], [1, 7.5, 5.5]),
  },
  bayon: {
    "heart-of-angkor-thom": stop([0, 3, -4], [-21, 14, 22]),
    "bas-relief-galleries": stop([-5, 1.3, 6.5], [-5, 1.8, 10]),
    "face-towers": stop([3.5, 2.5, 4], [0, 2.8, 3.6]),
    "smile-of-angkor": stop([-3.5, 2.5, 4], [0, 2.8, 3.6]),
    "central-sanctuary": stop([0, 5.8, -4], [.1, 7.5, 4.5]),
  },
  "ta-prohm": {
    rajavihara: stop([0, 1.6, 10], [3.5, 3.4, 16]),
    "galleried-enclosures": stop([-5, 1.4, 7], [-6, 3.4, 12]),
    "strangler-roots": stop([5.2, 2.8, 2.7], [9, 4.5, 8.5]),
    "fallen-stones": stop([7.8, .4, 5], [5.8, 2.6, 6.2]),
    "movie-star-temple": stop([-5.8, 2.4, -6.5], [-3, 3.2, -1]),
  },
  "banteay-srei": {
    "pink-sandstone": stop([-3.2, 3, -5], [-7.7, 4.5, 1.3]),
    "counselors-temple": stop([0, 3.2, -5.3], [8.5, 7.5, 5]),
    "two-libraries": stop([3.7, 2.2, .4], [6.8, 3.4, 4.5]),
    "citadel-of-women": stop([0, 2.2, 10], [3.2, 3.4, 16]),
    "stolen-returned-reborn": stop([3.2, 3, -5], [7.7, 4.5, 1.3]),
  },
  "preah-vihear": {
    // Mountain revision: scale .15, lift 3; temple-local framing is unchanged.
    "long-ascent": stop([0, 3.51, 4.5], [1.65, 4.83, 7.05]),
    "five-gopuras": stop([0, 4.095, -1.41], [1.005, 4.41, .21]),
    "lord-of-the-peak": stop([0, 4.26, -4.95], [2.55, 6.30, -6.6]),
    "cliff-edge": stop([0, 4.08, -5.8], [3.3, 6.03, -8.25]),
    "world-heritage": stop([0, 2.4, 0], [14, 17, 20]),
  },
  "royal-palace": {
    "facing-chaktomuk": stop([-3, 2, 9], [4, 4, 21]),
    "throne-hall": stop([-4, 4.5, -4], [-.7, 5, 10]),
    "golden-spire": stop([-4, 8, -5], [1, 9, 4]),
    "moonlight-pavilion": stop([-5, 3.6, 9], [-2, 5, 24]),
    "silver-pagoda": stop([7, 2.7, -1], [3.7, 4.4, 10]),
  },
  "sambor-prei-kuk": {
    "prasat-sambor": stop([-2, 2.7, -17.5], [-.5, 3.2, -12.5]),
    "prasat-tao": stop([0, 2.5, -1], [3.8, 3.2, 8]),
    "prasat-yeay-poan": stop([2.5, 2.7, 17], [3, 3.3, 21.5]),
    "flying-palaces": stop([-10.6, 1.8, -10.4], [-15.5, 4, -1]),
    "forest-groups": stop([0, 1, 0], [23, 28, 33]),
  },
  "preah-khan": {
    "labyrinthine-galleries": stop([0, 1.6, -3], [.35, 1.55, 8.6]),
    "column-pavilion": stop([7.4, 2.6, 5.4], [3.2, 3.2, 7.8]),
    "hall-of-dancers": stop([0, 1.7, 5.4], [-6.5, 4.6, 7.5]),
  },
  "koh-ker": {
    "prasat-thom": stop([0, 2, 0], [6.8, 5.5, 9]),
    "summit-shrine": stop([0, 4.1, 0], [2.8, 6.4, 3.4]),
    "brief-capital": stop([0, 1.4, 0], [-10, 9, 13]),
  },
  "banteay-chhmar": {
    "face-towers": stop([0, .80, 0], [1.2, 1.2, 1.8]),
    "satellite-temples": stop([7.44, .216, 2.88], [9.24, 2.4, 5.4]),
    "site-layout": stop([-.96, .24, -1.2], [20.88, 22.32, 25.2]),
  },
  "beng-mealea": {
    "overgrown-ruins": stop([0, 1, -6.8], [1.3, 3, -2.4]),
    "root-covered-windows": stop([6.5, 1.6, 0], [6.6, 2.6, 4.7]),
    "visitor-walkway": stop([0, 1.2, 7], [.15, 1.65, 15.3]),
  },
  oudong: {
    "oudong-mountain": stop([0, 7, -2], [0, 3, 15]),
    "royal-stupas": stop([0, 7.5, -12], [0, 9, -5]),
  },
};
