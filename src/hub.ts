import { autorun, runInAction } from "mobx";
import WebSocket from "ws";
import { jsonLocalFileStorage } from "./graph/storage/file";
import { Graph, subject, Tuples } from "./graph/subject";
import { createLogger } from "./utils/log";
import { Message } from "./hubmessage";

const log = createLogger(__filename);
const graph = new Graph({
  scheduler: process.nextTick,
});

(async () => {
  const filter = (subject: subject) => {
    if (subject[0] === "tmp") return false;
    return true;
  };

  const localFile = jsonLocalFileStorage();

  console.log(
    "Persisting on disk",
    await localFile.uuid,
    await localFile.isNew
  );

  graph.connections.set(filter, {
    onChange: (tuple) => localFile.write(tuple),
    onObserved: async (subject, observed) => {
      if (!observed) return;

      const tuples = await localFile.read(subject);
      runInAction(() => graph.feed.push(...tuples));
    },
  });
})();

{
  const wss = new WebSocket.Server({ port: 8080 });

  wss.on("connection", (ws, request) => {
    const remoteIp = request.socket.remoteAddress;
    log("connected", remoteIp);

    const observerDisposers = new Map<string, () => void>();
    function dispose() {
      for (const disposer of observerDisposers.values()) disposer();
      observerDisposers.clear();
      log("disposed", remoteIp, graph.observed.size);
    }
    ws.on("close", dispose);
    ws.on("error", dispose);

    function send(data: Message) {
      // console.log('send', JSON.stringify(data));
      ws.send(JSON.stringify(data));
    }

    function receive(msg: Message) {
      if ("tuple" in msg) {
        runInAction(() => {
          graph.feed.push(msg.tuple);
        });
      } else {
        const { subject, observed } = msg;
        const key = JSON.stringify(subject);

        // GUARD for administration errors
        if (observed === observerDisposers.has(key)) {
          log("ERROR in connection handling " + key);
          throw new Error("ERROR in connection handling " + key);
        }

        if (observed) {
          // keep a log of max sent state, to prevent sending the same data
          const propState = new Map<string, string>();

          observerDisposers.set(
            key,
            autorun(() => {
              for (const tuple of graph.get(Tuples, subject)) {
                const [, prop, [state]] = tuple;
                if (state > (propState.get(prop) || "")) {
                  send({ tuple });
                  propState.set(prop, state);
                }
              }
            })
          );
        } else {
          observerDisposers.get(key)!();
          observerDisposers.delete(key);
        }
      }

      log(`received ${JSON.stringify(msg)}`);
    }

    ws.on("message", (message) => {
      receive(JSON.parse(message as string) as Message);
    });
  });
}
