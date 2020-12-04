import * as m from "makerjs";
import * as clip from "martinez-polygon-clipping";
import mournerSimplify from "simplify-js";
import Offset from "polygon-offset";

const MACHINE_PRECISION_IN_MM = 0.05;

function isPosition(u: unknown): u is clip.Position {
  return Array.isArray(u) && typeof u[0] === "number";
}

function isPolygon(u: unknown): u is clip.Polygon {
  return Array.isArray(u) && isPosition(u[0]);
}

function isMultiPolygon(u: unknown): u is clip.MultiPolygon {
  return Array.isArray(u) && isPolygon(u[0]);
}

// function isGeometry(u: unknown): u is clip.Geometry {
//   return isPolygon(u) || isMultiPolygon(u);
// }

export function simplify<T extends number[][]>(path: T): T {
  const xyPath = path.map((p) => ({ x: p[0], y: p[1] }));
  const simplified = mournerSimplify(
    xyPath,
    MACHINE_PRECISION_IN_MM
  ).map(({ x, y }) => [x, y]);
  // console.log(`Simplify ${xyPath.length} => ${simplified.length}`);
  return simplified as T;
}

const chainsToMultiPolygon = (chains: m.IChain[]): clip.MultiPolygon => {
  const mpolygon: clip.MultiPolygon = [];

  for (const chain of chains) {
    const keyPoints = m.chain.toKeyPoints(
      chain,
      MACHINE_PRECISION_IN_MM
    ) as number[][];

    if (chain.endless) {
      keyPoints.push(keyPoints[0]);
    }
    const polygon: clip.Polygon = [simplify(keyPoints)];
    mpolygon.push(polygon);

    for (const hole of chain.contains || []) {
      const holeKeyPoints = m.chain.toKeyPoints(
        hole,
        MACHINE_PRECISION_IN_MM
      ) as number[][];
      if (chain.endless) {
        holeKeyPoints.push(holeKeyPoints[0]);
      }

      polygon.push(simplify(holeKeyPoints));

      if (hole.contains) {
        mpolygon.push(...chainsToMultiPolygon(hole.contains));
      }
    }
  }

  return mpolygon;
};

export const modelToPolygon = (model: m.IModel): clip.MultiPolygon => {
  return chainsToMultiPolygon(
    (m.model.findChains(model, {
      contain: true,
    }) || []) as m.IChain[]
  );
};

export const polygonToModel = (polygons: clip.Geometry): m.IModel => {
  const result: m.IModel = { models: {} };

  let index = 0;
  for (const polygon of isMultiPolygon(polygons) ? polygons : [polygons]) {
    for (const paths of polygon) {
      for (const path of paths) {
        result.models![++index] = new m.models.ConnectTheDots(true, path);
      }
    }
  }
  return result;
};

const convertMethod = (method: "diff" | "union" | "intersection" | "xor") => (
  subject: m.IModel,
  ...objects: m.IModel[]
): m.IModel => {
  return polygonToModel(
    objects.reduce(
      (result, objt) => clip[method](result, modelToPolygon(objt)),
      modelToPolygon(subject) as clip.Geometry
    )
  );
};

export const subtract = convertMethod("diff");
export const xor = convertMethod("xor");
export const intersect = convertMethod("intersection");
export const union = convertMethod("union");

export const marginG = (model: clip.Geometry, size: number): clip.Geometry => {
  const offset = new Offset();
  offset.data(model);
  offset.arcSegments(10);
  return offset.margin(size);
};

export const margin = (model: m.IModel, size: number): m.IModel => {
  const offset = new Offset();
  offset.data(modelToPolygon(model));
  offset.arcSegments(10);
  const offsetted = offset.margin(size);

  const result: m.IModel = { models: {} };
  let index = 0;
  for (const path of offsetted || []) {
    path.push(path[0]);
    result.models![++index] = new m.models.ConnectTheDots(true, simplify(path));
  }
  return result;
};

export const padding = (model: m.IModel, size: number): m.IModel => {
  const offset = new Offset();
  const mpolygon = modelToPolygon(model);
  // console.log({ f: "padding", mpolygon });
  offset.data(mpolygon);
  offset.arcSegments(10);
  const offsetted = offset.padding(size);

  const result: m.IModel = { models: {} };
  let index = 0;
  for (const path of offsetted || []) {
    path.push(path[0]);
    result.models![++index] = new m.models.ConnectTheDots(true, simplify(path));
  }
  return result;
};

export const offsetG = (geom: clip.Geometry, size: number): clip.Geometry => {
  const offset = new Offset();
  offset.data(geom);
  offset.arcSegments(10);
  return offset.offset(size).map((p) => [p]);
};

export const offset = (model: m.IModel, size: number): m.IModel => {
  const offset = new Offset();
  offset.data(modelToPolygon(model));
  offset.arcSegments(10);
  const offsetted = offset.offset(size);

  const result: m.IModel = { models: {} };
  let index = 0;
  for (const path of offsetted || []) {
    path.push(path[0]);
    result.models![++index] = new m.models.ConnectTheDots(true, simplify(path));
  }
  return result;
};
