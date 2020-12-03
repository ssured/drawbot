import { html, render } from "lit-html";
import { action, autorun } from "mobx";
import { computedFn, now } from "mobx-utils";
import { Drawbot, DrawbotJob } from "../Drawbot";
import { ChangeTuple, Graph } from "../graph/subject";
import { Message } from "../hubmessage";
import { DRAWBOT } from "../knownSubjects";

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
  _absoluteCoordinates: true,

  move(x: number | undefined, y: number | undefined) {
    return [
      ...this.abs(),
      `G0 F1500 ${x == null ? "" : `X${x}`} ${y == null ? "" : `Y${y}`}`,
    ];
  },

  moveRel(x: number | undefined, y: number | undefined) {
    return [
      ...this.rel(),
      `G0 F1500 ${x == null ? "" : `X${x}`} ${y == null ? "" : `Y${y}`}`,
    ];
  },

  abs() {
    if (this._absoluteCoordinates) return [];
    this._absoluteCoordinates = true;
    return ["G90"];
  },
  rel() {
    if (!this._absoluteCoordinates) return [];
    this._absoluteCoordinates = false;
    return ["G91"];
  },
};

const drawbotInfo = computedFn(() => {
  const drawbot = graph.get(Drawbot, DRAWBOT);
  return html`<dl>
      <dt>state</dt>
      <dd>${drawbot.status.state}</dd>
      <dt>mx</dt>
      <dd>
        ${drawbot.status.mx}
        <input
          type="number"
          value="${drawbot.status.mx}"
          @change=${(e: { target: HTMLInputElement }) => {
            console.log(e.target, e.target.valueAsNumber);
            drawbot.currentJob?.addGcode(
              gcode.move(e.target.valueAsNumber, undefined)
            );
          }}
        />
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
        ${drawbot.status.my}
        <input
          type="number"
          value="${drawbot.status.my}"
          @change=${(e: { target: HTMLInputElement }) => {
            console.log(e.target, e.target.valueAsNumber);
            drawbot.currentJob?.addGcode(
              gcode.move(undefined, e.target.valueAsNumber)
            );
          }}
        />
      </dd>
      <dt>time</dt>
      <dd>${drawbot.status.time}</dd>
      <dt>job</dt>
      <dd>${JSON.stringify(drawbot.currentJob?.$.subject ?? null)}</dd>
    </dl>

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
              if (e.target.value) drawbot.currentJob?.addGcode(e.target.value);
              e.target.value = "";
            }}
          />
        `}

    <pre>${drawbot.currentJob?.gcode || " - none -"}</pre>`;
});

autorun(() => render(drawbotInfo(), document.getElementById("main")!), {
  scheduler: requestAnimationFrame,
});
