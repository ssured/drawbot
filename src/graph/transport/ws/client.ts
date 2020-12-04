import { action } from "mobx";
import { ChangeTuple, Graph, subject } from "../../subject";
import { Message } from "./shared";

// Setup WebSocket connection to server
export const connectWS = ({
  graph,
  wsUrl,
  Socket = WebSocket,
  filter = () => true,
  onChange = (tuple) => graph.feed.push(tuple),
  onObserved,
}: {
  graph: Graph;
  wsUrl: string;
  Socket?: typeof WebSocket;
  filter?: (subject: subject) => boolean;
  onChange?: (tuple: ChangeTuple) => void;
  onObserved?: (subject: subject, observed: boolean) => void;
}): (() => void) => {
  const ws = new Socket(wsUrl);

  const LOOKBACK_LENGTH = 50;
  const seen = new (class extends Set<string> {
    add(value: string) {
      const result = super.add(value);
      while (this.size > LOOKBACK_LENGTH) this.delete(this.keys().next().value);
      return result;
    }
    addTuple(tuple: ChangeTuple) {
      this.add(JSON.stringify(tuple.slice(0, 3)));
    }
    hasTuple(tuple: ChangeTuple) {
      return this.has(JSON.stringify(tuple.slice(0, 3)));
    }
  })();

  ws.addEventListener(
    "message",
    action((e) => {
      const msg = JSON.parse(e.data) as Message;
      // log(`Received ${JSON.stringify(msg)}`);
      if ("tuple" in msg) {
        if (filter(msg.tuple[0])) {
          seen.addTuple(msg.tuple);
          onChange(msg.tuple);
        }
      } else {
        if (filter(msg.subject)) onObserved?.(msg.subject, msg.observed);
      }
    })
  );

  const socketIsOpen = new Promise<void>((res) => {
    ws.addEventListener("open", () => res());
  });

  async function send(msg: Message) {
    await socketIsOpen;
    ws.send(JSON.stringify(msg));
    // console.log("sent", msg);
  }

  graph.connections.set(filter, {
    onChange: (tuple) => {
      if (!seen.hasTuple(tuple))
        send({ tuple: tuple.slice(0, 3) as ChangeTuple });
    },
    onObserved: (subject, observed) => send({ subject, observed }),
  });

  return () => {
    graph.connections.delete(filter);
    ws.close();
  };
};
