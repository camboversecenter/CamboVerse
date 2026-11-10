import {Box3, Matrix4, Object3D, Quaternion, Raycaster, Vector3} from 'three';

export interface LabHand {id: string; handedness: string; object?: Object3D; rayObject?: Object3D; pressed: boolean}
export interface GrabOptions {
  /** Floating specimens opt in; other tools return to their original slot. */
  floating?: boolean;
  scaleRange?: readonly [number, number];
  onMove?: (object: Object3D, dt: number) => void;
  onRelease?: (object: Object3D, cancelled: boolean) => void;
  onHighlight?: (highlighted: boolean) => void;
}
type Held = {object: Object3D; offset: Matrix4; home: Matrix4};
function visible(object: Object3D) {
  for (let p: Object3D | null = object; p; p = p.parent) if (!p.visible) return false;
  return true;
}
function inside(object:Object3D, ancestor:Object3D) {
  for (let p=object.parent;p;p=p.parent) if (p===ancestor) return true;
  return false;
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
  private second?: {owner:string; helper:string; distance:number; startScale:number; range:readonly [number, number]};
  private handA = new Vector3();
  private handB = new Vector3();
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
    if (this.second?.owner === id) this.second = undefined;
    const options = this.objects.get(held.object)?.();
    options?.onRelease?.(held.object, cancelled);
    if (!options?.floating || cancelled) held.home.decompose(held.object.position, held.object.quaternion, held.object.scale);
    held.object.updateMatrixWorld(true);
  }
  cancel() {
    this.second = undefined;
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
      if (distance >= .12 || (nearest && inside(nearest,object))) continue;
      if (distance < best || (nearest && inside(object,nearest))) {best = distance; nearest = object;}
    }
    return nearest;
  }
  step(hands: LabHand[], dt: number, focused = true) {
    // When one grip opens, rebase the remaining hand at the current pose.
    // Preserve the original home for tracking-loss cancellation.
    if (this.second) {
      const {owner, helper} = this.second;
      const a = hands.find(h => h.id === owner), b = hands.find(h => h.id === helper);
      const held = this.held.get(owner);
      if (!focused || this.blocked || !a?.object || !b?.object || !held || !visible(held.object)) {
        this.release(owner, true);
        this.second = undefined;
      } else if (!a.pressed || !b.pressed) {
        const remaining = a.pressed ? a : b.pressed ? b : undefined;
        if (remaining?.object) {
          remaining.object.updateWorldMatrix(true, false);
          held.object.updateWorldMatrix(true, false);
          held.offset.copy(remaining.object.matrixWorld).invert().multiply(held.object.matrixWorld);
          this.held.delete(owner);
          this.held.set(remaining.id, held);
        }
        this.second = undefined;
      }
    }
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
      if (this.second?.helper === hand.id) {this.consumed.add(hand.handedness); continue;}
      if (rising && !held && !this.second) {
        for (const [owner, target] of this.held) {
          const range = this.objects.get(target.object)?.().scaleRange;
          const first = hands.find(h => h.id === owner && h.pressed);
          if (!first?.object || !range || first.handedness === hand.handedness) continue;
          const distance = first.object.getWorldPosition(this.handA).distanceTo(hand.object.getWorldPosition(this.handB));
          this.second = {owner, helper:hand.id, distance:Math.max(.05,distance), startScale:target.object.scale.x, range};
          this.latchedOwners.set(hand.id, hand.handedness);
          break;
        }
        if (this.second) {this.consumed.add(hand.handedness); continue;}
      }
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
    if (this.second) {
      const {owner, helper, range, startScale, distance} = this.second;
      const a = hands.find(h => h.id === owner)?.object, b = hands.find(h => h.id === helper)?.object;
      const held = this.held.get(owner);
      if (held && a && b) {
        const gap = a.getWorldPosition(this.handA).distanceTo(b.getWorldPosition(this.handB));
        held.object.scale.setScalar(Math.max(range[0], Math.min(range[1], startScale * gap / distance)));
        held.object.updateMatrixWorld(true);
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
