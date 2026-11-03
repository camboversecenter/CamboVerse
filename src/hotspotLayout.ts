/** Keep an on-screen capture label clear of the header, guide and walking controls.
 * Off-screen anchors stay off-screen; turning never pulls unseen objects into view.
 */
export function captureLabelPosition(x: number, y: number, width: number, height: number): [number, number] {
  if (x < 0 || x > width || y < 0 || y > height) return [x, y];
  const side = Math.min(122, width / 2);
  const top = Math.min(width <= 640 ? 206 : 160, height * .5);
  const bottom = Math.max(top, height - 160);
  return [Math.max(side, Math.min(width - side, x)), Math.max(top, Math.min(bottom, y))];
}
