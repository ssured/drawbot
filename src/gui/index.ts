import { html, render } from "lit-html";
import { autorun } from "mobx";
import { computedFn, now } from "mobx-utils";
import { Drawbot, DrawbotJob } from "../Drawbot";
import { Graph } from "../graph/subject";
import { DRAWBOT } from "../knownSubjects";
import * as ln from "@lnjs/core";
import simplify from "simplify-js";
import { createMatrix } from "../utils/2dmath";
import { connectWS } from "../graph/transport/ws/client";

const graph = new Graph({
  scheduler: requestAnimationFrame,
});

const stopConnection = connectWS({
  graph,
  wsUrl: `ws://localhost:8080`,
});

const gcode = {
  move(x: number | undefined, y: number | undefined) {
    return [
      `G0 F1500 ${x == null ? "" : `X${x.toFixed(2)}`} ${
        y == null ? "" : `Y${y.toFixed(2)}`
      }`,
    ];
  },

  moveRel(x: number | undefined, y: number | undefined) {
    return [
      "G91",
      `G0 F1500 ${x == null ? "" : `X${x.toFixed(2)}`} ${
        y == null ? "" : `Y${y.toFixed(2)}`
      }`,
      "G90",
    ];
  },

  penUp() {
    return ["M5", "G4 P0.2"];
  },
  penDown() {
    return ["M3 S1000", "G4 P0.2"];
  },
};

const drawbotInfo = computedFn(() => {
  const drawbot = graph.get(Drawbot, DRAWBOT);
  return html`<dl>
      <dt>state</dt>
      <dd>${drawbot.status.state}</dd>
      <dt>mx</dt>
      <dd>
        <button
          @click=${() => drawbot.currentJob?.addGcode(gcode.moveRel(-10, 0))}
        >
          -10
        </button>
        <button
          @click=${() => drawbot.currentJob?.addGcode(gcode.moveRel(-1, 0))}
        >
          -1
        </button>
        ${drawbot.status.mx}
        <button
          @click=${() => drawbot.currentJob?.addGcode(gcode.moveRel(1, 0))}
        >
          +1
        </button>
        <button
          @click=${() => drawbot.currentJob?.addGcode(gcode.moveRel(10, 0))}
        >
          +10
        </button>
      </dd>
      <dt>my</dt>
      <dd>
        <button
          @click=${() => drawbot.currentJob?.addGcode(gcode.moveRel(0, -10))}
        >
          -10
        </button>
        <button
          @click=${() => drawbot.currentJob?.addGcode(gcode.moveRel(0, -1))}
        >
          -1
        </button>
        ${drawbot.status.my}
        <button
          @click=${() => drawbot.currentJob?.addGcode(gcode.moveRel(0, 1))}
        >
          +1
        </button>
        <button
          @click=${() => drawbot.currentJob?.addGcode(gcode.moveRel(0, 10))}
        >
          +10
        </button>
      </dd>
      <dt>time</dt>
      <dd>${new Date(drawbot.status.time).toISOString()}</dd>
      <dt>job</dt>
      <dd>${JSON.stringify(drawbot.currentJob?.$.subject ?? null)}</dd>
      <dt>pen</dt>
      <dd>
        <button @click=${() => drawbot.currentJob?.addGcode(gcode.penUp())}>
          up
        </button>
        <button @click=${() => drawbot.currentJob?.addGcode(gcode.penDown())}>
          down
        </button>
      </dd>
    </dl>

    <div>
      <button
        @click=${async () =>
          (drawbot.currentJob = await drawbot.$.create(DrawbotJob))}
      >
        New job
      </button>

      ${drawbot.currentJob == null
        ? ""
        : html`
            <input
              @change=${(e: { target: HTMLInputElement }) => {
                if (e.target.value)
                  drawbot.currentJob?.addGcode(e.target.value);
                e.target.value = "";
              }}
            />
          `}
    </div>

    <button
      @click=${async () => {
        const svg = (document.getElementById("svgObject")! as HTMLObjectElement)
          .contentDocument!;

        const BBox = function (
          xMin = Infinity,
          yMin = Infinity,
          xMax = -Infinity,
          yMax = -Infinity
        ) {
          return {
            xMin,
            xMax,
            yMin,
            yMax,
            extend({ x, y }: { x: number; y: number }) {
              if (x < this.xMin) this.xMin = x;
              if (x > this.xMax) this.xMax = x;
              if (y < this.yMin) this.yMin = y;
              if (y > this.yMax) this.yMax = y;
            },
            get width() {
              return this.xMax - this.xMin;
            },
            get height() {
              return this.yMax - this.yMin;
            },
            get aspect() {
              return this.width / this.height;
            },
            get cx() {
              return (this.xMin + this.xMax) / 2;
            },
            get cy() {
              return (this.yMin + this.yMax) / 2;
            },
            get c() {
              return { x: this.cx, y: this.cy };
            },
            get rMin() {
              return Math.min(this.width, this.height) / 2;
            },
            get rMax() {
              return Math.max(this.width, this.height) / 2;
            },
            get r() {
              return Math.sqrt(this.width ** 2 + this.height ** 2) / 2;
            },
          };
        };

        const input = BBox();

        for (const polyline of svg.getElementsByTagName("polyline")) {
          for (const point of polyline.points) {
            input.extend(point);
          }
        }

        const PAPERSIZE = BBox(0, 0, 210 - 10, 297 / 2 - 10);

        let matrix = createMatrix().translate(PAPERSIZE.cx, PAPERSIZE.cy);
        if (PAPERSIZE.aspect > input.aspect) {
          matrix = matrix.rotate(90); //.scale(PAPERSIZE.rMin / input.rMax);
        } else {
        }
        matrix = matrix.scale(PAPERSIZE.rMin / input.rMax);
        matrix = matrix.translate(-input.cx, -input.cy);

        const output = BBox();

        for (const polyline of svg.getElementsByTagName("polyline")) {
          for (const point of polyline.points) {
            output.extend(point.matrixTransform(matrix));
          }
        }

        console.log(JSON.stringify({ input, PAPERSIZE, output }, null, 2));

        // drawbot.currentJob?.addGcode(gcode.penUp());
        // drawbot.currentJob?.addGcode(gcode.move(output.xMin, output.yMin));
        // drawbot.currentJob?.addGcode(gcode.penDown());
        // drawbot.currentJob?.addGcode(gcode.move(output.xMax, undefined));
        // drawbot.currentJob?.addGcode(gcode.move(undefined, output.yMax));
        // drawbot.currentJob?.addGcode(gcode.move(output.xMin, undefined));
        // drawbot.currentJob?.addGcode(gcode.move(undefined, output.yMin));
        // drawbot.currentJob?.addGcode(gcode.penUp());

        for (const polyline of svg.getElementsByTagName("polyline")) {
          let index = 0;
          for (const point of polyline.points) {
            const { x, y } = point.matrixTransform(matrix);
            // console.log(point.x, point.y, x, y);
            drawbot.currentJob?.addGcode(gcode.move(x, y));
            if (index++ === 0) {
              // first point
              drawbot.currentJob?.addGcode(gcode.penDown());
            }
          }
          drawbot.currentJob?.addGcode(gcode.penUp());
          await new Promise((r) => setTimeout(r, 1000));
        }

        // // function render() {
        // let paths = scene
        //   .render(eye, center, up, width, height, 100, 0.1, 100, 0.01)
        //   .map((path) => simplify(path, 0.025));
        // // let svg = ln.toSVG(paths, width, height);
        // // document.body.innerHTML = svg;
        // // }

        // console.log(paths.length, paths);

        // for (const path of paths) {
        //   {
        //     // drawbot.currentJob?.addGcode(gcode.penUp());
        //     const { x, y } = path[0];
        //     drawbot.currentJob?.addGcode(gcode.move(x, y));
        //     drawbot.currentJob?.addGcode(gcode.penDown());
        //   }
        //   for (const { x, y } of path.slice(1)) {
        //     drawbot.currentJob?.addGcode(gcode.move(x, y));
        //   }
        //   drawbot.currentJob?.addGcode(gcode.penUp());

        //   await new Promise((r) => setTimeout(r, 1000));
        // }
      }}
    >
      Plaatje
    </button>

    <pre>${drawbot.currentJob?.gcode || " - none -"}</pre>`;
});

autorun(() => render(drawbotInfo(), document.getElementById("main")!), {
  scheduler: requestAnimationFrame,
});
