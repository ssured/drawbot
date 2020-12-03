import charwise from "charwise";
import { mkdirp, readFile, writeFile } from "fs-extra";
import { join } from "path";
import { subject } from "../subject";
import { asyncFromGetSet } from "../storage";
import sanitize from "sanitize-filename";

export const jsonLocalFileStorage = (dataDir = "./data") => {
  function idToPath(id: string) {
    try {
      const subject = charwise.decode(id) as subject;
      return join(
        dataDir,
        ...subject.map((k) => sanitize(k, { replacement: "__" }))
      );
    } catch (e) {
      return join(dataDir, "_", id);
    }
  }
  function idToFile(id: string) {
    return join(idToPath(id), "data.json");
  }

  return asyncFromGetSet({
    async get(id) {
      const file = idToFile(id);
      try {
        const contents = await readFile(file, "utf-8");
        return JSON.parse(contents) as any;
      } catch (e) {
        console.log("get error", file, e);
      }
      return;
    },
    async set(id, value) {
      await mkdirp(idToPath(id));
      const contents = JSON.stringify(value, null, 2);
      await writeFile(idToFile(id), contents, "utf-8");
    },
  });
};
