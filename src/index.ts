import { readFileSync, writeFileSync } from "fs-extra";
import * as convert from "xml-js";
import { svgPathProperties } from "./svg-path-properties";
import { Box } from "./SVGViewBox";
import simplify from "simplify-js";
import {
  Geometry,
  union,
  diff,
  Position,
  Polygon,
  MultiPolygon,
} from "martinez-polygon-clipping";

import parse from "parse-svg-path";
import contours from "svg-path-contours";

const PAPER_WIDTH = 297;
const PAPER_HEIGHT = 210;
const PAPER_RESOLUTION = 0.05;

export type point = { x: number; y: number };

const pointToString = (p: point) => `X${p.x.toFixed(2)} Y${p.y.toFixed(2)}`;

const isPosition = (u: unknown): u is Position =>
  Array.isArray(u) &&
  u.length === 2 &&
  typeof u[0] === "number" &&
  typeof u[1] === "number";
const isPath = (u: unknown): u is Position[] =>
  Array.isArray(u) && (u.length === 0 || isPosition(u[0]));
const isPolygon = (u: unknown): u is Polygon =>
  Array.isArray(u) && (u.length === 0 || isPath(u[0]));
const isMPolygon = (u: unknown): u is MultiPolygon =>
  Array.isArray(u) && (u.length === 0 || isPolygon(u[0]));
const gMap = <T>(g: Geometry, f: (pos: Position) => T) => {
  return (isMPolygon(g) ? g : [g]).map((p) =>
    p.map((xys) => {
      return xys.map((xy) => {
        xy; //?
        return f(xy);
      });
    })
  );
};
const pathsOf = (g: Geometry) => {
  const paths: Geometry[] = [];
  for (const polygon of isMPolygon(g) ? g : [g]) {
    for (const path of polygon) {
      paths.push([path]);
    }
  }
  return paths;
};

export class Path {
  constructor(protected readonly points: Geometry) {}
  translate(t: point) {
    return new Path(gMap(this.points, ([x, y]) => [x + t.x, y + t.y]));
  }
  scale(s: number) {
    return new Path(gMap(this.points, ([x, y]) => [x * s, y * s]));
  }
  get isClosed() {
    let first: string;
    let last: string;
    gMap(this.points, ([x, y]) => {
      last = x.toFixed(2) + " " + y.toFixed(2);
      first = first || last;
    });
    return first === last;
  }
  get paths() {
    return pathsOf(this.points).map((g) => new Path(g));
  }
  // simplify(r: number) {
  //   return new Path(this.points);
  // }
  gcode() {
    if (this.points.length === 0) return "";

    const lines: string[] = [];

    for (const polygon of isMPolygon(this.points)
      ? this.points
      : [this.points]) {
      JSON.stringify(polygon); //?
      for (const path of polygon) {
        path[0]; //?
        lines.push(
          ...[
            `G0 F${GCODE_G0_SPEED} X${path[0]
              .map((n) => n.toFixed(2))
              .join(" Y")}`,
            ...GCODE_PENDOWN,
            ...path
              .slice(1)
              .map(
                (p) =>
                  `G1 F${GCODE_G1_SPEED} X${p
                    .map((n) => n.toFixed(2))
                    .join(" Y")}`
              ),
            ...GCODE_PENUP,
          ]
        );
      }
    }

    return lines.join(`\n`);
  }
  get geometry(): Geometry {
    return this.points;
  }
}

export const GCODE_PENDOWN = ["M3 S1000", "G4 P0.2"] as const;
export const GCODE_PENUP = ["M5", "G4 P0.2"] as const;
export const GCODE_G0_SPEED = 1500;
export const GCODE_G1_SPEED = 1500;

const file = "Bird.svg";
const raw = readFileSync(file, "utf-8");
const data: {
  svg: {
    _attributes: {
      viewBox: string;
      width: string;
      height: string;
    };
    path: {
      _attributes: {
        d: string;
        fill?: string;
        stroke?: string;
        "stroke-width"?: string;
      };
    }[];
  };
} = convert.xml2js(raw, { compact: true }) as any;

class Drawing {
  scale: number;

  constructor(
    protected readonly target: Box,
    protected readonly resolution: number,
    protected readonly source = target
  ) {
    this.scale = source === target ? 1 : target.rmin / source.rmax;
  }

  get sourceResolution() {
    return this.resolution / this.scale;
  }

  protected projectPath(path: Path): Path {
    return this.target === this.source
      ? path
      : path
          .translate({ x: -this.source.cx, y: -this.source.cy })
          .scale(this.scale)
          .translate({ x: this.target.cx, y: this.target.cy });
  }

  protected paths: Path[] = [];
  addPath(path: Path) {
    const projected = this.projectPath(path);
    this.paths.push(projected);
  }

  gcode() {
    let lines: string[] = [];

    let outline: Geometry = [];
    this.paths.length; //?
    for (const polygon of this.paths.reverse()) {
      for (const path of polygon.paths) {
        let toAdd = path;
        if (path.isClosed) {
          // console.log(path.length);
          // JSON.stringify(path.geometry); //?

          // console.log(path.geometry);
          let outside: Geometry;
          try {
            try {
              outside =
                outline.length === 0
                  ? path.geometry
                  : diff(path.geometry, outline);
            } catch (e) {
              outside = path.geometry;
            }

            try {
              outline =
                outline.length === 0
                  ? path.geometry
                  : union(path.geometry, outline);
            } catch (e) {
              e; //?
            }

            // outside; //?
            toAdd = new Path(outside);
          } catch (e) {
            e; //?
            console.log(JSON.stringify(path.geometry, null, 2));
            console.log(JSON.stringify(outline, null, 2));
            throw e;
          }
        }

        // lines.
        lines.push(
          toAdd /*.simplify(this.resolution)*/
            .gcode()
        );
      }
    }
    // .map((p) => p.simplify(this.resolution).gcode())
    return lines.join("\n");
  }
}

const drawing = new Drawing(
  new Box(0, 0, PAPER_WIDTH - 40, PAPER_HEIGHT - 40),
  PAPER_RESOLUTION,
  data.svg._attributes.viewBox
    ? Box.fromString(data.svg._attributes.viewBox)
    : new Box(
        0,
        0,
        parseInt(data.svg._attributes.width),
        parseInt(data.svg._attributes.height)
      )
);
// data //?
let count = 0;
data.svg; //?
for (const svgPath of data.svg.path) {
  // if (count++ > 8) continue;
  const { d } = svgPath._attributes;

  try {
    var result = contours(parse(d)) as Polygon;
    drawing.addPath(new Path(result));
  } catch (e) {
    e; //?
    d; //?
  }

  // JSON.stringify(result, null, 2); //?
}

//   break;
//   const props = new svgPathProperties(d);

//   let path = new Path();

//   function dist({ x: xa, y: ya }: point, { x: xb, y: yb }: point) {
//     return Math.sqrt((xa - xb) * (xa - xb) + (ya - yb) * (ya - yb));
//   }

//   let last: point;
//   for (const part of props.getParts()) {
//     if (part.length === 0) {
//       continue;
//     }

//     if (isNaN(part.start.x)) {
//       continue;
//     }

//     for (let pos = 0; pos < part.length; pos += drawing.sourceResolution) {
//       let next = part.getPointAtLength(Math.min(pos, part.length));
//       if (last == null || dist(last, next) <= 2 * drawing.sourceResolution) {
//         path.add(next);
//       } else {
//         dist(last, next); //?
//       }
//       last = next;
//     }

//     if (part.closed) {
//       path.add({ ...path.start });
//       drawing.addPath(path);
//       path = new Path();
//       continue;
//     }
//   }
//   // path.closed = true;
//   // path.add(path.points[0]);
//   drawing.addPath(path);

//   // for (const dCmd of d.split(/m/i)) {
//   //   if (dCmd.length === 0) continue;
//   //   try {
//   //     const props = new svgPathProperties("m" + dCmd);
//   //     const path = new Path();
//   //     const length = props.getTotalLength();
//   //     for (let pos = 0; pos < length; pos += drawing.sourceResolution) {
//   //       path.add(props.getPointAtLength(pos));
//   //     }
//   //     path.add(props.getPointAtLength(length));

//   //     // console.log(d.substr(-1));
//   //     // path.isClosed //?

//   //     drawing.addPath(path);
//   //   } catch (e) {
//   //     e //?
//   //     dCmd.substr(0, 40); //?
//   //     throw e;
//   //   }
//   //   // for (const part of props.getParts()) {
//   //   // if (part.length === 0) continue;
//   // }
// }

const gcode = drawing.gcode();

const cleaned: string[] = [];
const lines = gcode.split("\n");
// optimize gcode
if (false) {
  let skip = 0;
  lines.forEach((line, i) => {
    if (i < skip) return;
    if (line !== "M5" || i > lines.length - 5) {
      cleaned.push(line);
      return;
    }

    const prevLine = lines[i - 1].split(" ");
    const travelLine = lines[i + 2].split(" ");

    if (prevLine[2] === travelLine[2] && prevLine[3] === travelLine[3]) {
      skip = i + 5;
    } else {
      cleaned.push(line);
    }
  });
} else {
  cleaned.push(...lines);
}

const out = "index.gcode";
writeFileSync(out, cleaned.join("\n"), "utf-8");
