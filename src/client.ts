import { action, autorun, computed, reaction } from "mobx";
import { now } from "mobx-utils";
import WebSocket from "ws";
import { ifNumber } from "./graph/guard";
import { ChangeTuple, Graph, Model, subject } from "./graph/subject";
import { createLogger } from "./utils/log";
import { Message } from "./graph/transport/ws/shared";

const log = createLogger(__filename);

const graph = new Graph({});

// Setup WebSocket connection to server
{
  const ws = new WebSocket(`ws://localhost:8080`);

  const socketIsOpen = new Promise<void>((res) => {
    ws.addEventListener("open", () => {
      res();

      ws.addEventListener("message", (e) => {
        const msg = JSON.parse(e.data) as Message;
        log(`Received ${JSON.stringify(msg)}`);
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

const start: subject = ["test"];

class App extends Model {
  @computed get counter() {
    return this.$.read(ifNumber, "counter") || 0;
  }

  private setCounter(counter: number) {
    this.$.write(ifNumber, counter, "counter");
  }

  @action increment() {
    this.setCounter(this.counter + 1);
  }
}

autorun(() => log("Counter:", graph.get(App, start).counter));

reaction(
  () => now(),
  () => graph.get(App, start).increment()
);
