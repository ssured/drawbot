import charwise from "charwise";
import stringify from "json-stable-stringify";
import {
  action,
  autorun,
  comparer,
  computed,
  createAtom,
  IInterceptor,
  IMapWillChange,
  intercept,
  IObservableMapInitialValues,
  observable,
  ObservableMap,
  observe,
  reaction,
  runInAction,
  untracked,
  when,
  _isComputingDerivation,
} from "mobx";
import { computedFn, queueProcessor } from "mobx-utils";
import sha256 from "tiny-hashes/sha256";

export type JSONPrimitive = string | boolean | number | null;
export type JSONEntry = JSONPrimitive | JSONArray | JSONMap;
type JSONEntryArr = JSONEntry[];
export interface JSONArray extends JSONEntryArr {}
type JSONEntryMap = { [key: string]: JSONEntry };
export interface JSONMap extends JSONEntryMap {}

export type Value = [string, JSONEntry];
// Change: subject, property, value, prevKnownValue
export type ChangeTuple =
  | [subject, string, Value]
  | [subject, string, Value, Value];

export type subject = string[];

export type Guard<T, U = undefined> = {
  toValue: (u: T | U) => JSONEntry | Model | undefined;
  fromValue: (u: JSONEntry | Node | undefined, root: Graph) => T | U;
};

export type GuardType<T extends Guard<any>> = T extends Guard<infer U>
  ? U
  : never;

export const ifNode: Guard<Model> = {
  toValue: (u) => (u instanceof Model ? u : undefined),
  fromValue: (u) => (u instanceof Model ? u : undefined),
};

// Hidden public methods
const ONOBSERVED = Symbol("onobserved");
const HAM = Symbol("ham");
const NODE = Symbol("node");
const PARSE = Symbol("parse");
const FOR = Symbol("for");
const IMMUTABLE = "$";

type ModelCtor<M extends Model> = (new (...args: any) => M) & {
  [FOR](api: ModelAPI): M;
} & Guard<M>;

export interface ModelAPI {
  read: {
    <R extends typeof Model>(model: R, prop: string): InstanceType<R> | null;
    <R>(guard: Guard<R>, prop: string): R | undefined;
  };
  write: {
    <W extends typeof Model>(
      model: W,
      value: InstanceType<W> | null,
      prop: string
    ): void;
    <W>(guard: Guard<W>, value: W, prop: string): void;
  };
  keys: () => string[];

  created: string; // state of host when this API was created
  subject: subject;
  [NODE]: Node;
  getState: (prop?: string) => string;
  stateToMs: (state: string) => number;

  sub: <M extends typeof Model>(Model: M, ...path: string[]) => InstanceType<M>;
  open: <M extends typeof Model>(
    Model: M,
    subject?: subject
  ) => InstanceType<M>;
  immutable: <M extends typeof Model>(Model: M) => InstanceType<M>;
  create: <M extends typeof Model>(
    Model: M,
    parent?: subject,
    initial?: Partial<WritablePart<InstanceType<M>>>,
    keepAlive?: number
  ) => Promise<InstanceType<M>>;
}

class Node {
  private data: ObservableMap<string, Value>;

  @computed private get hash() {
    const source = stringify(Object.fromEntries(this.data));
    return sha256(source);
  }

  @computed get immutable() {
    return (
      this.subject.length === 2 &&
      this.subject[0] === IMMUTABLE &&
      this.subject[1] === this.hash
    );
  }

  constructor(private graph: Graph, public subject: subject) {
    this.data = observable.map<string, Value>({}, { deep: false });
    intercept(this.data, graph[HAM]);
  }

  api: ModelAPI = {
    read: computedFn((guard: Guard<any> | ModelCtor<any>, prop: string) => {
      const value = guard.fromValue(this.get(prop), this.graph);
      return value === undefined && typeof guard === "function" ? null : value;
    }),
    write: (
      guard: Guard<any> | ModelCtor<any>,
      rawValue: JSONEntry | Model,
      prop: string
    ) => {
      if (this.immutable) throw new Error("Node is immutable");
      const valueToWrite = rawValue === null ? null : guard.toValue(rawValue);
      if (valueToWrite !== undefined)
        this.set(
          prop,
          valueToWrite instanceof Model ? valueToWrite.$[NODE] : valueToWrite
        );
    },
    keys: (() => {
      const c = computed(() => Array.from(this.keys()), {
        equals: comparer.structural,
      });
      return c.get.bind(c);
    })(),

    created: this.graph.getState(),
    subject: this.subject,
    [NODE]: this,
    getState: (prop?: string) => {
      if (prop == null) return this.graph.getState();

      this.activeAtom.reportObserved();
      return this.data.get(prop)?.[0] ?? "";
    },
    stateToMs: this.graph.stateToMs,

    // open een submodel, als er geen subpath wordt gegeven dan wordt de huidige node geopend als ander model
    sub: (Model, ...path) => {
      return Model[FOR](
        path.length === 0 ? this.api : this.graph[NODE](this.subject, path).api
      ) as any;
    },

    open: (Model, subject: subject = [this.graph.getUUID()]) =>
      Model[FOR](subject ? this.graph[NODE](subject).api : this.api) as any,

    immutable: (Model) => {
      if (this.immutable) return Model[FOR](this.api);
      const subject = [IMMUTABLE, this.hash];
      const node = this.graph[NODE](subject, []);

      // force data to be logged
      const stop = node.observe(() => {});
      runInAction(() => {
        for (const [key, value] of this.data) {
          node.merge(key, value);
        }
      });
      stop();

      return Model[FOR](node.api) as any;
    },

    create: this.graph.create,
  };

  private onObserved = () => {
    this.onUnobserved?.();
    this.onUnobserved = this.graph[ONOBSERVED](this);
  };

  private onUnobserved: (() => void) | undefined;
  private activeAtom = createAtom(`node-${this.subject}`, this.onObserved, () =>
    this.onUnobserved?.()
  );

  get observe() {
    this.activeAtom.reportObserved();
    return this.data.observe.bind(this.data);
  }

  get = computedFn((key: string) => {
    this.activeAtom.reportObserved();
    const encoded = this.data.get(key)?.[1];
    return encoded === undefined ? undefined : this.graph[PARSE](encoded);
  });
  merge(key: string, value: Value) {
    this.data.set(key, value);
  }
  set(key: string, value: JSONEntry | Node) {
    this.graph.set(this.subject, key, value);
    return this;
  }
  *keys() {
    this.activeAtom.reportObserved();
    yield* this.data.keys();
  }
  get source() {
    this.activeAtom.reportObserved();
    return this.data.entries.bind(this.data);
  }
}

export class FutureDataError extends Error {}

const keyFor = (subject: subject): string => charwise.encode(subject);
// const subjectFor = (key: string): subject => JSON.parse(key);

// Returns a monotonic increasing string.
// calling getState with an argument registers this argument as a branding Id for the state
// example usage is branding states with your public key

const defaultGetState = (() => {
  const drift = () => 0;

  let last = "";
  let index = 0;
  const z = (35).toString(36);
  let id = "";
  return (newId?: string): string => {
    if (newId) {
      id = newId;
    }
    const now = (Date.now() + drift()).toString(36);
    index = last === now ? index + 1 : 0;
    last = now;
    if (index === 0) return charwise.encode([now, id]);
    const v = index.toString(36);
    return charwise.encode([now, id, z.repeat(v.length - 1) + v]);
  };
})();

// state to timestamp
const defaultStateToMs = (state: string) => {
  let value: string;
  try {
    value = (charwise.decode(state) as [string])[0];
  } catch (e) {
    value = state;
  }
  return parseInt(value, 36);
};

export class Graph {
  public getState: () => string;
  public stateToMs: (state: string) => number;
  public getUUID: () => string;
  public EPSILON: number;

  public readonly observed = observable.map<string, subject>(
    {},
    { deep: false }
  );
  protected readonly changes = observable.array<ChangeTuple>([], {
    deep: false,
  });
  public readonly feed = observable.array<ChangeTuple>([], { deep: false });

  public readonly connections = observable.map<
    (subject: subject) => boolean,
    {
      onChange(tuple: ChangeTuple): void;
      onObserved(subject: subject, observed: boolean): void;
    }
  >();

  constructor({
    getState = defaultGetState, // () => Date.now().toString(36),
    stateToMs = defaultStateToMs, // (state: string) => parseInt(state, 36),
    getUUID = () => this.getState() + Math.random().toString(36).substr(2),
    EPSILON = 0.0001,
    scheduler,
  }: Partial<{
    getState: () => string;
    stateToMs: (state: string) => number;
    getUUID: () => string;
    EPSILON: number;
    scheduler?: ((callback: () => void) => any) | undefined;
  }>) {
    this.getState = getState;
    this.stateToMs = stateToMs;
    this.getUUID = getUUID;
    this.EPSILON = EPSILON;

    // listen to incoming changes feed
    reaction(
      () => this.feed.length,
      (size) => {
        if (size === 0) return;

        for (const change of this.feed.splice(0, this.feed.length)) {
          const [_subject, prop, value] = change;
          const subject = this.observed.get(keyFor(_subject));
          if (subject == null) continue;
          try {
            this.merge([subject, prop, value]);
          } catch (e) {
            if (e instanceof FutureDataError) {
              const msDiff = stateToMs(value[0]) - stateToMs(this.getState());
              setTimeout(
                action(() => this.feed.push(change)),
                Math.abs(msDiff) + 1
              );

              console.log("rescheduled", msDiff, change);
            } else {
              throw e;
            }
          }
        }
      },
      { scheduler }
    );

    // install handlers
    observe(this.observed, (change) => {
      const subject =
        change.type === "delete" ? change.oldValue : change.newValue;
      const observed = change.type !== "delete";

      for (const [filter, { onObserved }] of this.connections) {
        if (!filter(subject)) continue;
        onObserved(subject, observed);
      }
    });

    queueProcessor(this.changes, (tuple) => {
      const subject = tuple[0];

      for (const [filter, { onChange }] of this.connections) {
        if (!filter(subject)) continue;
        onChange(tuple);
      }
    });
  }

  public merge([subject, key, value]: ChangeTuple) {
    this[NODE](subject).merge(key, value);
    if (subject.length > 1 && subject[0] !== IMMUTABLE) {
      // if it's a path, notify upstream subjects
      const parent = subject.slice(0, -1);
      const key = subject.slice(-1)[0];
      const state = value[0];
      this.merge([parent, key, [state, [0, subject]]]);
    }
  }

  [PARSE](encoded: JSONEntry): JSONEntry | Node {
    return Array.isArray(encoded)
      ? encoded[0] === 0
        ? this[NODE](encoded[1] as subject)
        : encoded[1]
      : encoded;
  }
  @action public setSubject(subject: subject, key: string, target: subject) {
    this.merge([subject, key, [this.getState(), [0, target]]]);
  }
  @action public set(
    subject: subject,
    key: string,
    value: JSONEntry | Model | Node
  ) {
    const valueToWrite =
      value instanceof Model
        ? [0, value.$.subject]
        : value instanceof Node
        ? [0, value.subject]
        : Array.isArray(value)
        ? [1, value]
        : value;
    this.merge([subject, key, [this.getState(), valueToWrite]]);
  }

  @action public assign(
    subject: subject,
    data: Record<string, JSONEntry | Model>
  ) {
    for (const [key, value] of Object.entries(data)) {
      this.set(subject, key, value);
    }
  }

  [NODE] = (() => {
    const getNode = computedFn(
      (strSubject: string): Node => {
        const subject = JSON.parse(strSubject) as subject;
        return untracked(() => new Node(this, subject));
      }
    );

    return (subject: subject, sub: string[] = []) =>
      getNode(JSON.stringify([...subject, ...sub]));
  })();

  [ONOBSERVED](node: Node): () => void {
    const key = keyFor(node.subject);
    runInAction(() => this.observed.set(key, node.subject));

    const stopTrackingChanges = node.observe(
      action((change) => {
        if (change.type === "delete") throw new Error("Cannot delete data");

        this.changes.push(
          change.type === "add"
            ? [node.subject, change.name, change.newValue]
            : [node.subject, change.name, change.newValue, change.oldValue]
        );
      })
    );

    return () => {
      runInAction(() => this.observed.delete(key));

      // data source could be persisted like this:
      // JSON.stringify([...node.source()])

      stopTrackingChanges();
    };
  }
  [HAM]: IInterceptor<IMapWillChange<string, Value>> = (change) => {
    if (change.type === "delete") return null;

    const machineState = this.getState();
    const [currentState, currentValue] = change.object.get(change.name) || [
      "",
      undefined,
    ];
    const [incomingState, incomingValue] = change.newValue!;

    if (incomingState > machineState) throw new FutureDataError();

    if (
      incomingState < currentState ||
      (incomingState === currentState &&
        (typeof incomingValue === "number" && typeof currentValue === "number"
          ? Math.abs(incomingValue - currentValue) < this.EPSILON
          : JSON.stringify(incomingValue) <= JSON.stringify(currentValue)))
    )
      return null;

    return change;
  };

  public get<M extends typeof Model>(
    Model: M,
    subject: subject
  ): InstanceType<M> {
    return _isComputingDerivation()
      ? (Model[FOR](this[NODE](subject).api) as any)
      : computed(() => Model[FOR](this[NODE](subject).api) as any).get();
  }

  public create = async <M extends typeof Model>(
    Model: M,
    parent: subject = [],
    initial: Partial<WritablePart<InstanceType<M>>> = {},
    keepAlive = 1000
  ): Promise<InstanceType<M>> => {
    const model = observable.box<InstanceType<M>>();
    const subject = [...parent, this.getUUID()];

    const stop = autorun(() => {
      const m = this.get(Model, subject);
      runInAction(() => model.set(m));
      m.$.keys();
    });

    await when(() => !!model.get());
    Object.assign(model.get(), initial);
    setTimeout(stop, keepAlive);
    return model.get();
  };
}

const modelFactory = computedFn((model: typeof Model, api: ModelAPI) =>
  untracked(() => new model(api))
);

export class Model {
  static [FOR](api: ModelAPI) {
    return modelFactory(this, api);
  }

  static toValue(u: Model | undefined): Node | undefined {
    return u instanceof this ? u.$[NODE] : undefined;
  }

  static fromValue<M extends Model>(
    u: JSONEntry | Node | undefined,
    graph: Graph
  ): M | undefined {
    return u instanceof Node ? graph.get(this as any, u.subject) : undefined;
  }

  public constructor(public $: ModelAPI) {}
}

export class Tuples extends Model {
  *[Symbol.iterator]() {
    for (const [key, value] of this.$[NODE].source()) {
      yield [this.$.subject, key, value] as ChangeTuple;
    }
  }
}
