import { action, autorun, reaction, runInAction } from "mobx";
import { now } from "mobx-utils";
import WebSocket from "ws";
import { Drawbot, DrawbotJob } from "./Drawbot";
import { ChangeTuple, Graph } from "./graph/subject";
import { Message } from "./graph/transport/ws/shared";
import { DRAWBOT } from "./knownSubjects";
import { createLogger } from "./utils/log";

const log = createLogger(__filename);

const graph = new Graph({
  scheduler: process.nextTick,
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

const drawbot = () => graph.get(Drawbot, DRAWBOT);

autorun(() => {
  const {
    status: { mx, my },
    currentJob,
  } = drawbot();
  log("Pos:", mx, my, currentJob?.$.subject || "--");
});

reaction(
  () => now(5000),
  async (v, r) => {
    const job = await graph.create(DrawbotJob, ["tmp"]);
    console.log("add gcode");
    runInAction(() => {
      job.gcode = [
        `G0 F1500 X25 Y0`,
        "M3 S1000",
        "G4 P0.2",
        `G0 F1500 X25 Y25`,
      ].join("\n");
      drawbot().currentJob = job;
    });
  }
);
