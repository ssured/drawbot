import { html, render } from "lit-html";
import { action, autorun } from "mobx";
import { computedFn, now } from "mobx-utils";
import { Drawbot } from "../Drawbot";
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

const drawbotInfo = computedFn(() => {
  const drawbot = graph.get(Drawbot, DRAWBOT);
  return html`<dl>
    <dt>gcode</dt>
    <dd><pre>${drawbot.currentJob?.gcode || " - none -"}</pre></dd>
    <dt>mx</dt>
    <dd>${drawbot.mx}</dd>
    <dt>my</dt>
    <dd>${drawbot.my}</dd>
    <dt>time</dt>
    <dd>${drawbot.time}</dd>
  </dl>`;
});

autorun(() => render(drawbotInfo(), document.getElementById("main")!), {
  scheduler: requestAnimationFrame,
});
