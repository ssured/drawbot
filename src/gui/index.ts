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
  move(x: number | undefined, y: number | undefined) {
    return [`G0 F1500 ${x == null ? "" : `X${x}`} ${y == null ? "" : `Y${y}`}`];
  },

  moveRel(x: number | undefined, y: number | undefined) {
    return [
      "G91",
      `G0 F1500 ${x == null ? "" : `X${x}`} ${y == null ? "" : `Y${y}`}`,
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
