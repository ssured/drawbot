import * as clip from "martinez-polygon-clipping";
import { Path } from "./index";

// type Position = number[]
// type Polygon = Position[][]
// type MultiPolygon = Position[][][]
// type Geometry = Polygon | MultiPolygon

// export function union(subject: Geometry, clipping: Geometry): Geometry;
// export function diff(subject: Geometry, clipping: Geometry): Geometry;
// export function xor(subject: Geometry, clipping: Geometry): Geometry;
// export function intersection(subject: Geometry, clipping: Geometry): Geometry;

const convertMethod = (method: "diff" | "union" | "intersection" | "xor") => (
  subject: Path,
  outline: clip.Geometry
): clip.Geometry => {
  return clip[method](outline, [[subject.points.map((p) => [p.x, p.y])]]);
};

export const subtract = convertMethod("diff");
export const xor = convertMethod("xor");
export const intersect = convertMethod("intersection");
export const union = convertMethod("union");
