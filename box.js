const W = 297 / 2 - 20;
const H = 210 / 2 - 20;
const C = [W / 2, H / 2];

const aantalHoeken = 4;
const angleInc = (2 * Math.PI) / 90;

const hoeken = [...Array(aantalHoeken)].map(
  (_, i) => (i * (2 * Math.PI)) / aantalHoeken
);
const radiusFactor = Math.sin(angleInc) + Math.cos(angleInc);

let radius = 1;
let angle = 0;

let GCODE = ["G1 F1500 X0 Y0", "M3 S1000", "M5", "G4 P0.2"];

while (radius < Math.min(...C)) {
  const poly = hoeken
    .map((hoek) =>
      [
        Math.sin(angle + hoek) * radius + C[0],
        Math.cos(angle + hoek) * radius + C[1],
      ].map((n) => n.toFixed(2))
    )
    .map(([x, y]) => `X${x} Y${y}`);

  GCODE.push(`G1 F1500 ${poly[0]}`);
  GCODE.push("M3 S1000", "G4 P0.2");
  GCODE.push(...poly.reverse().map((point) => `G1 F1500 ${point}`));
  GCODE.push("M5", "G4 P0.2");

  angle += angleInc;
  radius *= radiusFactor;
}

module.exports = GCODE.concat("G1 F1500 X0 Y0").join("\n");
