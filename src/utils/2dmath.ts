export interface Point extends Pick<SVGPoint, "x" | "y"> {}
export function getDistance(a: Point, b?: Point): number {
  if (!b) return 0;
  return Math.sqrt((b.x - a.x) ** 2 + (b.y - a.y) ** 2);
}
export function getMidpoint(a: Point, b: Point): SVGPoint {
  return createPoint((a.x + b.x) / 2, (a.y + b.y) / 2);
}
export function subtractPoint(a: Point, b: Point): SVGPoint {
  return createPoint(a.x - b.x, a.y - b.y);
}
export function addPoint(a: Point, b: Point): SVGPoint {
  return createPoint(a.x + b.x, a.y + b.y);
}
const getSVG = (() => {
  let cachedSvg: SVGSVGElement;

  return function getSVG(): SVGSVGElement {
    return (
      cachedSvg ||
      (cachedSvg = document.createElementNS(
        "http://www.w3.org/2000/svg",
        "svg"
      ))
    );
  };
})();
export function createMatrix(
  values?: [number, number, number, number, number, number]
): SVGMatrix {
  const matrix = getSVG().createSVGMatrix();
  if (values) {
    matrix.a = values[0];
    matrix.b = values[1];
    matrix.c = values[2];
    matrix.d = values[3];
    matrix.e = values[4];
    matrix.f = values[5];
  }
  return matrix;
}
export function createPoint(): SVGPoint;
export function createPoint(x: number, y: number): SVGPoint;
export function createPoint(point: { x: number; y: number }): SVGPoint;
export function createPoint(
  xOrPoint?: number | { x: number; y: number },
  maybeY?: number
): SVGPoint {
  const point = getSVG().createSVGPoint();
  if (typeof xOrPoint !== "undefined") {
    const { x, y } =
      typeof xOrPoint === "object" ? xOrPoint : { x: xOrPoint, y: maybeY! };
    point.x = x;
    point.y = y;
  }
  return point;
}
