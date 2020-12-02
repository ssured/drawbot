import { runInAction } from "mobx";
import { queueProcessor } from "mobx-utils";
import { ChangeTuple, Graph, subject, JSONMap, Value } from "../subject";
import { readFile, writeFile } from "fs/promises";
import { join } from "path";

const dataDir = "./data";

function subjectToPath(subject: subject) {
  return join(dataDir, ...subject);
}

async function read(subject: subject): Promise<ChangeTuple[]> {
  const path = subjectToPath(subject);
  const filename = `${path}.json`;

  let current: JSONMap = {};

  try {
    const json = await readFile(filename, "utf-8");
    current = JSON.parse(json) as JSONMap;
  } catch (e) {
    console.error(e);
  }

  return [...Object.entries(current)].map(([prop, value]) => [
    subject,
    prop,
    value as any,
  ]);
}

class Data {
  private static cache = new Map<string, Data>();
  public static for(subject: subject) {
    const path = subjectToPath(subject);
    if (!this.cache.has(path)) {
      this.cache.set(path, new Data(subject));
    }
    return this.cache.get(path)!;
  }
  protected static remove(data: Data) {
    this.cache.delete(data.path);
  }

  protected constructor(protected readonly subject: subject) {
    this.persist();
  }

  protected readonly path = subjectToPath(this.subject);

  protected async persist() {
    let current = await read(this.subject);

    while (Object.keys(this.update).length > 0) {
      const next = { ...current, ...this.update };
      this.update = {};
      await writeFile(this.path, JSON.stringify(next), "utf-8");
      current = next;
    }

    this.dispose();
  }

  protected dispose() {
    Data.remove(this);
  }

  protected update: Record<string, Value> = {};

  public write(prop: string, value: Value) {
    this.update[prop] = value;
  }
}

function write([subject, prop, value]: ChangeTuple) {
  Data.for(subject).write(prop, value);
}

export const connect = (
  graph: Graph,
  filter: (subject: subject) => boolean = () => true
) => {
  const disposers: (() => void)[] = [];

  disposers.push(
    queueProcessor(graph.changes, (tuple) => {
      const subject = tuple[0];
      if (!filter(subject)) return;

      graph.get();
      write(tuple);
    })
  );

  const onUnobserved = new Map<string, (() => void) | undefined>();

  graph.observed.observe_(async (change) => {
    // console.log('observe', change.type, change.name, graph.observed.size);

    const subject =
      change.type === "delete" ? change.oldValue : change.newValue;
    if (!Array.isArray(subject)) return;

    switch (subject[0]) {
      case undefined:
        return;

      case Partitions.external: {
        onUnobserved.get(change.name)?.();
        if (change.type === "add") {
          const stop =
            subject[1] === ExternalNodes.fs
              ? handleFS(graph, subject)
              : subject[1] === ExternalNodes.pdf
              ? handlePDF(graph, subject)
              : subject[1] === ExternalNodes.ssh
              ? handleSSH(graph, subject)
              : undefined;

          onUnobserved.set(change.name, stop);
        } else {
          onUnobserved.delete(change.name);
        }
        return;
      }
    }

    if (change.type !== "add") return;
    const tuples = await gunrad.read(subject);

    runInAction(() => graph.feed.push(...tuples));
  });

  return () => {
    for (const disposer of disposers) disposer();
  };
};

import { ExternalNodes, Partitions } from "../../_client_server/graph";
import { gunrad } from "../utils/storage";
import { handleFS } from "./external";
import { handlePDF } from "./pdf";
import { handleSSH } from "./ssh";

export const graph = new Graph({});

(async () => {
  console.log(
    "Persisting in radix tree",
    await gunrad.uuid,
    await gunrad.isNew
  );

  queueProcessor(graph.changes, (tuple) => {
    const subject = tuple[0];
    if (!Array.isArray(subject)) return;

    switch (subject[0]) {
      case undefined:
      case Partitions.external: {
        return;
      }
    }

    gunrad.write(tuple);
  });

  const onUnobserved = new Map<string, (() => void) | undefined>();

  graph.observed.observe(async (change) => {
    console.log("observe", change.type, change.name, graph.observed.size);

    const subject =
      change.type === "delete" ? change.oldValue : change.newValue;
    if (!Array.isArray(subject)) return;

    switch (subject[0]) {
      case undefined:
        return;

      case Partitions.external: {
        onUnobserved.get(change.name)?.();
        if (change.type === "add") {
          const stop =
            subject[1] === ExternalNodes.fs
              ? handleFS(graph, subject)
              : subject[1] === ExternalNodes.pdf
              ? handlePDF(graph, subject)
              : subject[1] === ExternalNodes.ssh
              ? handleSSH(graph, subject)
              : undefined;

          onUnobserved.set(change.name, stop);
        } else {
          onUnobserved.delete(change.name);
        }
        return;
      }
    }

    if (change.type !== "add") return;
    const tuples = await gunrad.read(subject);

    runInAction(() => graph.feed.push(...tuples));
  });
})();
