import {Box3, Matrix4, Object3D, Quaternion, Raycaster, Vector3} from 'three';

export interface LabHand {id: string; handedness: string; object?: Object3D; rayObject?: Object3D; pressed: boolean}
export interface GrabOptions {
  onMove?: (object: Object3D, dt: number) => void;
  onRelease?: (object: Object3D, cancelled: boolean) => void;
  onHighlight?: (highlighted: boolean) => void;
}
type Held = {object: Object3D; offset: Matrix4; home: Matrix4};
function visible(object: Object3D) {
  for (let p: Object3D | null = object; p; p = p.parent) if (!p.visible) return false;
  return true;
}

/** Pose math and gesture ownership are independent of React and scientific state. */
export class LabManipulation {
  private objects = new Map<Object3D, () => GrabOptions>();
  private held = new Map<string, Held>();
  private pressed = new Map<string, boolean>();
  private consumed = new Set<string>();
  private latchedOwners = new Map<string, string>();
  private highlighted = new Set<Object3D>();
  private ray = new Raycaster();
  private position = new Vector3();
  private quaternion = new Quaternion();
  private matrix = new Matrix4();
  private bounds = new Box3();
  private closest = new Vector3();
  blocked = false;

  register(object: Object3D, options: () => GrabOptions) {
    this.objects.set(object, options);
    return () => {
      for (const [id, held] of this.held) if (held.object === object) this.release(id, true);
      this.highlighted.delete(object);
      this.objects.delete(object);
    };
  }
  isHeld(object: Object3D | null) {return !!object && [...this.held.values()].some(h => h.object === object);}
  ownsGrip(handedness: string) {return this.consumed.has(handedness) || [...this.latchedOwners.values()].includes(handedness);}
  targets() {return [...this.highlighted];}

  private release(id: string, cancelled: boolean) {
    const held = this.held.get(id);
    if (!held) return;
    this.held.delete(id);
    this.objects.get(held.object)?.().onRelease?.(held.object, cancelled);
    // Lab tools return to their slots; losing tracking never strands an object.
    held.home.decompose(held.object.position, held.object.quaternion, held.object.scale);
    held.object.updateMatrixWorld(true);
  }
  cancel() {
    for (const id of this.held.keys()) this.release(id, true);
    for (const object of this.highlighted) this.objects.get(object)?.().onHighlight?.(false);
    this.highlighted.clear(); this.consumed.clear();
  }
  private candidate(hand: Object3D) {
    hand.updateWorldMatrix(true, false);
    hand.getWorldPosition(this.ray.ray.origin);
    hand.getWorldQuaternion(this.quaternion);
    this.ray.ray.direction.set(0, 0, -1).applyQuaternion(this.quaternion);
    this.ray.near = 0; this.ray.far = 3;
    const eligible = [...this.objects.keys()].filter(object => {
      if (this.isHeld(object)) return false;
      if (!visible(object)) return false;
      object.updateWorldMatrix(true, true);
      return true;
    });
    const hit = this.ray.intersectObjects(eligible, true).find(h=>visible(h.object));
    if (!hit) return undefined;
    let object: Object3D | null = hit.object;
    while (object && !this.objects.has(object)) object = object.parent;
    return object ?? undefined;
  }
  /** On squeeze, also allow a controller held close to a tool to pick it up
   * without requiring an exact ray hit. Keep this off the per-frame hover path. */
  private nearCandidate(hand: Object3D) {
    hand.getWorldPosition(this.position);
    let nearest: Object3D | undefined, best = .12;
    for (const object of this.objects.keys()) {
      if (this.isHeld(object) || !visible(object)) continue;
      object.updateWorldMatrix(true, true);
      this.bounds.setFromObject(object);
      if (this.bounds.isEmpty()) continue;
      this.bounds.clampPoint(this.position, this.closest);
      const distance = this.closest.distanceTo(this.position);
      if (distance < best) {best = distance; nearest = object;}
    }
    return nearest;
  }
  step(hands: LabHand[], dt: number, focused = true) {
    const ids = new Set(hands.map(h => h.id));
    for (const [id, held] of this.held) if (!ids.has(id) || !visible(held.object)) this.release(id, true);
    for (const id of this.pressed.keys()) if (!ids.has(id)) this.pressed.delete(id);
    for (const id of this.latchedOwners.keys()) if (!hands.some(h=>h.id===id&&h.pressed)) this.latchedOwners.delete(id);
    this.consumed.clear();
    const highlighted = new Set<Object3D>();
    if (!focused || this.blocked) this.cancel();
    for (const hand of hands) {
      const rising = hand.pressed && !this.pressed.get(hand.id);
      this.pressed.set(hand.id, hand.pressed);
      if (!focused || this.blocked || !hand.object) {this.release(hand.id, true); continue;}
      if (!hand.pressed) this.release(hand.id, false);
      let held = this.held.get(hand.id);
      const candidate = held?.object ?? (rising ? this.nearCandidate(hand.object) : undefined) ?? this.candidate(hand.rayObject ?? hand.object);
      if (candidate) highlighted.add(candidate);
      if (rising && candidate && !held) {
        hand.object.updateWorldMatrix(true, false); candidate.updateWorldMatrix(true, false);
        candidate.updateMatrix();
        const home = candidate.matrix.clone();
        const world = candidate.matrixWorld.clone();
        // Bring a distant ray-selected object within comfortable reach. Nearby
        // objects retain their offset, so a close grab does not jump in the hand.
        candidate.getWorldPosition(this.position);
        hand.object.getWorldPosition(this.ray.ray.origin);
        if (this.position.distanceTo(this.ray.ray.origin) > .8) {
          (hand.rayObject ?? hand.object).getWorldQuaternion(this.quaternion);
          this.position.set(0, 0, -.55).applyQuaternion(this.quaternion).add(this.ray.ray.origin);
          world.setPosition(this.position);
        }
        held = {object: candidate, home, offset: hand.object.matrixWorld.clone().invert().multiply(world)};
        this.held.set(hand.id, held);
        this.latchedOwners.set(hand.id, hand.handedness);
      }
      if (held) {
        this.consumed.add(hand.handedness);
        hand.object.updateWorldMatrix(true, false);
        held.object.parent?.updateWorldMatrix(true, false);
        this.matrix.copy(held.object.parent?.matrixWorld ?? new Matrix4()).invert()
          .multiply(hand.object.matrixWorld).multiply(held.offset)
          .decompose(held.object.position, held.object.quaternion, held.object.scale);
        held.object.updateMatrixWorld(true);
        this.objects.get(held.object)?.().onMove?.(held.object, Math.min(.05, Math.max(0, dt)));
      }
    }
    for (const object of this.highlighted) if (!highlighted.has(object)) this.objects.get(object)?.().onHighlight?.(false);
    for (const object of highlighted) if (!this.highlighted.has(object)) this.objects.get(object)?.().onHighlight?.(true);
    this.highlighted = highlighted;
  }
}

export function sliderValue(fraction: number, min: number, max: number, step: number) {
  return Math.min(max, Math.max(min, min + Math.round(Math.max(0, Math.min(1, fraction)) * (max - min) / step) * step));
}

export function sliderDecimals(step: number) {
  const [coefficient, exponent = '0'] = step.toString().toLowerCase().split('e');
  return Math.min(20, Math.max(0, (coefficient.split('.')[1]?.length ?? 0) - Number(exponent)));
}
