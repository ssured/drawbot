import { ChangeTuple, JSONEntry, subject } from "../subject";

import { autorun, observable, runInAction, toJS } from "mobx";
import { createTransformer, ObservableGroupMap } from "mobx-utils";
import { createUUID } from "../id";
import charwise from "charwise";

export interface syncstorage {
  readonly uuid: string;
  readonly isNew: boolean;
  read(subject: subject): ChangeTuple[];
  write(tuple: ChangeTuple): void;
}

export interface asyncstorage {
  readonly uuid: Promise<string>;
  readonly isNew: Promise<boolean>;
  read(subject: subject): Promise<ChangeTuple[]>;
  write(tuple: ChangeTuple): Promise<void>;
}

export const UUID_KEY = "UUID-KEY";

export function asyncFromGetSet({
  get,
  set,
}: {
  get: <T>(id: string) => Promise<T>;
  set: (id: string, value: JSONEntry) => Promise<void>;
}): asyncstorage {
  async function read(id: string) {
    const subject = charwise.decode(id) as subject;
    const data = ((await get(id)) || {}) as { [key: string]: ChangeTuple[2] };
    return Object.entries(data).map(
      ([prop, value]) => [subject, prop, value] as ChangeTuple
    );
  }

  const asyncTupleStorageQueue = observable.array<ChangeTuple>([]);

  const asyncTuplesBySubject = new ObservableGroupMap(
    asyncTupleStorageQueue,
    (tuple) => charwise.encode(tuple[0])
  );

  const persistSubject = createTransformer(
    (id: string) => {
      let persisted = new Set<ChangeTuple>();

      (async () => {
        const data = await read(id);

        while (asyncTuplesBySubject.has(id)) {
          const tuples = asyncTuplesBySubject
            .get(id)!
            .filter((tuple) => !persisted.has(tuple));

          for (const [subject, prop, value] of tuples) {
            data.push([subject, prop, toJS(value)]);
          }

          await set(
            id,
            Object.fromEntries(data.map(([, prop, value]) => [prop, value]))
          );

          runInAction(() => {
            for (const tuple of tuples) {
              if (!asyncTupleStorageQueue.remove(tuple)) {
                throw new Error(
                  `${id} Tuple ${JSON.stringify(tuple)} not found`
                );
              }
              persisted.add(tuple);

              // log(`${key}:${tuple[1]} = ${JSON.stringify(tuple[2])}`);
            }
          });
        }
      })();

      return {
        onDone: () => {
          console.log(`${id} persisted ${persisted.size} tuples`);
        },
      };
    },
    (persister) => persister?.onDone()
  );

  autorun(
    () => {
      for (const key of asyncTuplesBySubject.keys()) {
        persistSubject(key);
      }
    },
    { delay: 10 }
  );

  let setIsNew!: (isNew: boolean) => void;
  const isNewPromise = new Promise<boolean>((res) => (setIsNew = res));

  let setUUID!: (uuid: string) => void;
  const UUIDPromise = new Promise<string>((res) => (setUUID = res));

  get<string | undefined>(UUID_KEY).then((uuid) => {
    if (uuid == null) {
      const newUUID = createUUID();
      set(UUID_KEY, newUUID);
      setUUID(newUUID);
      setIsNew(true);
    } else {
      setUUID(uuid);
      setIsNew(false);
    }
  });

  return {
    get uuid() {
      return UUIDPromise;
    },
    get isNew() {
      return isNewPromise;
    },
    read: (subject: subject) => read(charwise.encode(subject)),
    write: async (tuple: ChangeTuple) => {
      const [id] = tuple;
      runInAction(() => asyncTupleStorageQueue.push(tuple));
    },
  };
}

export function syncFromStorage(
  storage: Pick<Storage, "getItem" | "setItem">
): syncstorage {
  const read = (subject: subject): ChangeTuple[] => {
    try {
      const id = charwise.encode(subject);
      const encoded = storage.getItem(id);
      const decoded: { [key: string]: ChangeTuple[2] } =
        encoded == null ? {} : JSON.parse(encoded);
      return Array.from(Object.entries(decoded)).map(([prop, value]) => [
        subject,
        prop,
        value,
      ]);
    } catch (e) {
      return [];
    }
  };

  const write = (tuple: ChangeTuple): void => {
    const subject = tuple[0];
    const id = charwise.encode(subject);
    const current = read(subject);
    current.push(tuple);

    storage.setItem(
      id,
      JSON.stringify(
        Object.fromEntries(current.map(([, prop, value]) => [prop, value]))
      )
    );
  };

  let isNew = false;
  let uuid = storage.getItem(UUID_KEY);
  if (uuid == null) {
    uuid = createUUID();
    isNew = true;
    storage.setItem(UUID_KEY, uuid);
  }

  return {
    get uuid() {
      return uuid!;
    },
    get isNew() {
      return isNew;
    },
    read,
    write,
  };
}
