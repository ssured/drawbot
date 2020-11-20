import { readFileSync, writeFileSync } from "fs-extra";
import * as convert from "xml-js";
import { svgPathProperties } from "svg-path-properties";
import simplify from "simplify-js";
import { Box } from "./SVGViewBox";

const PAPER_WIDTH = 297;
const PAPER_HEIGHT = 210;
const PAPER_RESOLUTION = 0.05;

const GCODE_PENDOWN = ["M3"] as const;
const GCODE_PENUP = ["M5"] as const;
const GCODE_G0_SPEED = 2500;
const GCODE_G1_SPEED = 1500;

const file = "pika.svg";
const raw = readFileSync(file, "utf-8");
const data: {
  svg: {
    _attributes: {
      viewBox: string;
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

type point = { x: number; y: number };

class Path {
  constructor(protected points: point[] = []) {}
  get length() {
    return this.points.length;
  }
  translate(t: point) {
    return new Path(this.points.map(p => ({ x: p.x + t.x, y: p.y + t.y })));
  }
  scale(s: number) {
    return new Path(this.points.map(p => ({ x: p.x * s, y: p.y * s })));
  }
  simplify(r: number) {
    return new Path(simplify(this.points, r));
  }
  gcode() {
    return [
      `G0 F${GCODE_G0_SPEED} X${this.points[0].x.toFixed(
        2
      )} Y${this.points[0].y.toFixed(2)}`,
      ...GCODE_PENDOWN,
      ...this.points
        .slice(1)
        .map(
          ({ x, y }) =>
            `G1 F${GCODE_G1_SPEED} X${x.toFixed(2)} Y${y.toFixed(2)}`
        ),
      ...GCODE_PENUP
    ].join(`\n`);
  }
}

class MutablePath extends Path {
  add(point: point) {
    this.points.push(point);
  }
}

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
    this.paths.push(this.projectPath(path));
  }

  gcode() {
    return this.paths
      .map(p => p.simplify(this.resolution).gcode())
      .join("\n\n");
  }
}

const drawing = new Drawing(
  new Box(0, 0, PAPER_WIDTH, PAPER_HEIGHT),
  PAPER_RESOLUTION,
  Box.fromString(data.svg._attributes.viewBox)
);

for (const svgPath of data.svg.path) {
  const props = new svgPathProperties(svgPath._attributes.d);
  for (const part of props.getParts()) {
    if (part.length === 0) continue;

    const path = new MutablePath();
    for (let pos = 0; pos < part.length; pos += drawing.sourceResolution) {
      path.add(part.getPointAtLength(pos));
    }
    path.add(part.end);

    drawing.addPath(path);
  }
  // props.getTotalLength() //?
  // props.getParts().length //?
}

const gcode = drawing.gcode(); //?

const out = "index.gcode";
writeFileSync(out, gcode, "utf-8");
