import http from "http";
import { autorun, runInAction } from "mobx";
import WebSocket from "ws";
import { log } from "../../../hub";
import { Graph, subject, Tuples } from "../../subject";
import { Message } from "./shared";

export const provideWS = ({
  graph,
  port,
  Socket = WebSocket.Server,
  filter = () => true,
  onConnect,
}: {
  graph: Graph;
  port: number;
  Socket?: typeof WebSocket.Server;
  filter?: (subject: subject) => boolean;
  onConnect?: (ws: WebSocket, request: http.IncomingMessage) => () => void;
}) => {
  const wss = new Socket({ port });

  wss.on("connection", (ws, request) => {
    const onDisconnect = onConnect?.(ws, request);
    // const remoteIp = request.socket.remoteAddress;
    // log("connected", remoteIp);
    const observerDisposers = new Map<string, () => void>();
    function dispose() {
      for (const disposer of observerDisposers.values()) disposer();
      observerDisposers.clear();
      onDisconnect?.();
    }
    ws.on("close", dispose);
    ws.on("error", dispose);

    function send(data: Message) {
      // console.log('send', JSON.stringify(data));
      ws.send(JSON.stringify(data));
    }

    function receive(msg: Message) {
      if ("tuple" in msg) {
        if (!filter(msg.tuple[0])) return;
        runInAction(() => graph.feed.push(msg.tuple));
      } else {
        const { subject, observed } = msg;
        if (!filter(subject)) return;

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

        // log('observed', [...graph.observed.values()]);
      }

      // log(`received ${JSON.stringify(msg)}`);
    }

    ws.on("message", (message) => {
      receive(JSON.parse(message as string) as Message);
    });
  });
};
