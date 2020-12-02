const { writeFileSync } = require("fs-extra");
const gcode = require("./box");

console.log(gcode);

writeFileSync("./index.gcode", gcode, "utf-8");
