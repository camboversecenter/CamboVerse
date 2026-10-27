import { Quaternion, Vector3 } from 'three';

export type PanoramaId = string;
export type PanoramaStop = { id: PanoramaId; title: string; orientation:[number,number,number,number]; heading:number; links: {to: PanoramaId; u: number; v: number}[] };
export const PANORAMA_MANIFEST='/models/local/room-panorama-tour/tour.json';
export const panoramaStop = (id: PanoramaId, stops:PanoramaStop[]) => stops.find(s=>s.id===id)!;
export const panoramaUrl = (id: PanoramaId, ultra: boolean) => `/models/local/room-panorama-tour/${id}-${ultra?4096:2048}.jpg`;
/** Pixel-normalized equirectangular position, matching the inward-facing sphere. */
export function panoramaDirection(u: number, v: number, orientation:PanoramaStop['orientation'], radius=8): [number,number,number] {
  const phi=u*Math.PI*2, theta=v*Math.PI;
  const direction=new Vector3(Math.cos(phi)*Math.sin(theta),Math.cos(theta),Math.sin(phi)*Math.sin(theta));
  direction.applyAxisAngle(new Vector3(0,1,0),-Math.PI/2).applyQuaternion(new Quaternion(...orientation)).multiplyScalar(radius);
  return direction.toArray();
}
