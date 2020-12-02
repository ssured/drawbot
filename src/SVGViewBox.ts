// https://github.com/adobe-webplatform/Snap.svg/blob/master/src/path.js

export class Box {
  static fromString(source: string) {
    return new Box(
      ...(source.split(/\s+/).map(n => parseFloat(n)) as [
        number,
        number,
        number,
        number
      ])
    );
  }

  constructor(
    public readonly x: number,
    public readonly y: number,
    public readonly width: number,
    public readonly height: number
  ) {}

  get x2() {
    return this.x + this.width;
  }
  get y2() {
    return this.y + this.height;
  }
  get cx() {
    return this.x + this.width / 2;
  }
  get cy() {
    return this.y + this.height / 2;
  }
  get r() {
    return Math.sqrt(this.width * this.width + this.height * this.height) / 2;
  }
  get rmin() {
    return Math.min(this.width, this.height) / 2;
  }
  get rmax() {
    return Math.max(this.width, this.height) / 2;
  }
  path(r = 0) {
    return rectPath(this.x, this.y, this.width, this.height, r);
  }
  toString() {
    return [this.x, this.y, this.width, this.height].join(" ");
  }
}

type PathDataItem = [string, ...number[]];

export function rectPath(
  x: number,
  y: number,
  w: number,
  h: number,
  r = 0
): PathDataItem[] {
  if (r) {
    return [
      ["M", +x + +r, y],
      ["l", w - r * 2, 0],
      ["a", r, r, 0, 0, 1, r, r],
      ["l", 0, h - r * 2],
      ["a", r, r, 0, 0, 1, -r, r],
      ["l", r * 2 - w, 0],
      ["a", r, r, 0, 0, 1, -r, -r],
      ["l", 0, r * 2 - h],
      ["a", r, r, 0, 0, 1, r, -r],
      ["z"]
    ];
  }
  var res: PathDataItem[] = [
    ["M", x, y],
    ["l", w, 0],
    ["l", 0, h],
    ["l", -w, 0],
    ["z"]
  ];
  // res.toString = toString;
  return res;
}
