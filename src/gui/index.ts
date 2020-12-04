import { html, render } from "lit-html";
import { action, autorun } from "mobx";
import { computedFn, now } from "mobx-utils";
import { Drawbot, DrawbotJob } from "../Drawbot";
import { ChangeTuple, Graph } from "../graph/subject";
import { Message } from "../hubmessage";
import { DRAWBOT } from "../knownSubjects";
import * as ln from "@lnjs/core";
import simplify from "simplify-js";

const graph = new Graph({
  scheduler: requestAnimationFrame,
});

// Setup WebSocket connection to server
{
  const ws = new WebSocket(`ws://localhost:8080`);

  const socketIsOpen = new Promise<void>((res) => {
    ws.addEventListener("open", () => {
      res();

      ws.addEventListener("message", (e) => {
        const msg = JSON.parse(e.data) as Message;
        // log(`Received ${JSON.stringify(msg)}`);
        onMessage(msg);
      });
    });
  });

  async function send(msg: Message) {
    await socketIsOpen;
    ws.send(JSON.stringify(msg));
  }

  const onMessage = action((msg: Message) => {
    if (!("tuple" in msg)) return;
    graph.feed.push(msg.tuple);
  });

  graph.connections.set(() => true, {
    onChange: (tuple) => send({ tuple: tuple.slice(0, 3) as ChangeTuple }),
    onObserved: (subject, observed) => send({ subject, observed }),
  });
}

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
        // function shape(x: number, y: number): number {
        //   // return Math.cos(x * y) * (x * x - y * y);
        //   // return -1 / (x * x + y * y);
        //   return -1 / Math.pow(Math.pow(x, 2) + Math.pow(y, 2), 2);
        // }

        // let scene = new ln.Scene();
        // let min = new ln.Vector(-2, -2, -4);
        // let max = new ln.Vector(2, 2, 2);
        // let box = new ln.Box(min, max);
        // let fn = new ln.Function(shape, box, ln.Direction.Below);
        // scene.add(fn);

        // let eye = new ln.Vector(3, 0, 3);
        // let center = new ln.Vector(1.1, 0, 0);
        // let up = new ln.Vector(0, 0, 1);

        // let height = 297 / 2 - 10;
        // let width = 210 - 10;
        // let paths = scene
        //   .render(eye, center, up, width, height, 50, 0.1, 100, 0.01)
        //   .map((path) => simplify(path, 0.05));

        const scene = new ln.Scene();
        const n = 5;
        for (let x = -n; x <= n; x++) {
          for (let y = -n; y <= n; y++) {
            const p = Math.random() * 0.25 + 0.2;
            const dx = Math.random() * 0.5 - 0.25;
            const dy = Math.random() * 0.5 + 0.25;
            const z = 3;
            const fx = x;
            const fy = y;
            const fz = Math.random() * 3 + 1;
            if (x === 2 && y === 1) {
              continue;
            }
            const shape = new ln.Cube(
              new ln.Vector(fx - p, fy - p, 0),
              new ln.Vector(fx + p, fy + p, fz)
            );
            scene.add(shape);
          }
        }

        let eye = new ln.Vector(1.75, 1.25, 6);
        let center = new ln.Vector(0, 0, 0);
        let up = new ln.Vector(0, 0, 1);
        let height = 297 / 2 - 10;
        let width = 210 - 10;

        // function render() {
        let paths = scene
          .render(eye, center, up, width, height, 100, 0.1, 100, 0.01)
          .map((path) => simplify(path, 0.025));
        // let svg = ln.toSVG(paths, width, height);
        // document.body.innerHTML = svg;
        // }

        console.log(paths.length, paths);

        for (const path of paths) {
          {
            // drawbot.currentJob?.addGcode(gcode.penUp());
            const { x, y } = path[0];
            drawbot.currentJob?.addGcode(gcode.move(x, y));
            drawbot.currentJob?.addGcode(gcode.penDown());
          }
          for (const { x, y } of path.slice(1)) {
            drawbot.currentJob?.addGcode(gcode.move(x, y));
          }
          drawbot.currentJob?.addGcode(gcode.penUp());

          await new Promise((r) => setTimeout(r, 1000));
        }
      }}
    >
      Plaatje
    </button>

    <pre>${drawbot.currentJob?.gcode || " - none -"}</pre>`;
});

autorun(() => render(drawbotInfo(), document.getElementById("main")!), {
  scheduler: requestAnimationFrame,
});
