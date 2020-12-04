import { runInAction } from "mobx";
import { jsonLocalFileStorage } from "./graph/storage/file";
import { ChangeTuple, Graph, subject } from "./graph/subject";
import { createLogger } from "./utils/log";
import { provideWS } from "./graph/transport/ws/server";

export const log = createLogger(__filename);
const graph = new Graph({
  scheduler: process.nextTick,
});

(async () => {
  const filter = (subject: subject) => {
    if (subject[0] === "tmp") return false;
    return true;
  };

  const localFile = jsonLocalFileStorage();

  graph.connections.set(filter, {
    onChange: (tuple) => localFile.write(tuple),
    onObserved: async (subject, observed) => {
      if (!observed) return;
      const tuples = await localFile.read(subject);
      runInAction(() => graph.feed.push(...tuples));
    },
  });
})();

provideWS({
  graph,
  port: 8080,
});
