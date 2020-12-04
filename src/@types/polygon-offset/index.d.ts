declare module "polygon-offset" {
  import clip from "martinez-polygon-clipping";

  class Offset {
    data(points: clip.Geometry): Offset;
    arcSegments(segments: number): Offset;

    margin(size: number): clip.Polygon;
    padding(size: number): clip.Polygon;
    offset(size: number): clip.Polygon;

    offsetLine(margin: number): clip.Geometry;
  }

  export default Offset;
}
