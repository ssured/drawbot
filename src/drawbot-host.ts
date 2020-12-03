import {
  action,
  autorun,
  computed,
  configure,
  observable,
  onReactionError,
  reaction,
  when,
} from "mobx";
import { now, queueProcessor } from "mobx-utils";
import WebSocket from "ws";
import { ifNumber, ifString } from "./graph/guard";
import { ChangeTuple, Graph, Model, subject } from "./graph/subject";
import { createLogger } from "./utils/log";
import { Message } from "./hubmessage";

import SerialPort from "serialport";
import { Drawbot, DrawbotStatus } from "./Drawbot";
import { DRAWBOT } from "./knownSubjects";
const Readline = require("@serialport/parser-readline");

// configure mobx to inform us of any improper behaviour
configure({ enforceActions: "observed" });
onReactionError((error) => {
  console.error(error);
  debugger;
});

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

class DrawbotServer extends Drawbot {
  @observable awaitAck = true;

  @computed get writableStatus() {
    return this.$.open(WritableDrawbotStatus, this.status.$.subject);
  }
}

class WritableDrawbotStatus extends DrawbotStatus {
  @action updateFromLogLine(line: string) {
    const [state, mposx, my, mz, _wposx, _wy, _wz] = line
      .substr(1, line.length - 2)
      .split(",");
    this.$.write(ifNumber, Date.now(), "time");
    this.$.write(ifString, state, "state");
    this.$.write(ifNumber, parseFloat(mposx.split(":")[1]), "mx");
    this.$.write(ifNumber, parseFloat(my), "my");
    this.$.write(ifNumber, parseFloat(mz), "mz");
  }
}

(async () => {
  try {
    const ports = await SerialPort.list();
    if (ports.length === 0) throw new Error("no serial port found");

    const { path } = ports[0];
    const port = new SerialPort(path, { baudRate: 115200 });
    const disposers = [() => port.close()];

    const parser = new Readline();
    port.pipe(parser);

    const getMachine = () => graph.get(DrawbotServer, DRAWBOT);

    const input = observable.array<string>([]);
    disposers.push(
      reaction(
        () => !getMachine().awaitAck && input.length > 0,
        action((doWrite) => {
          if (!doWrite) return;
          getMachine().awaitAck = true;
          const line = input.shift()!;
          console.log(input.length, ">>", line);
          port.write(line + "\n");
        }),
        {
          name: `Write commands to plotter ${path}`,
          fireImmediately: true,
        }
      )
    );

    const output = observable.array<string>([]);
    parser.on(
      "data",
      action(`Process data from plotter ${path}`, (lineWithNewline: string) => {
        const line = lineWithNewline.substr(0, lineWithNewline.length - 1);
        console.log("<", Date.now(), getMachine().awaitAck, line);
        if (line[0] === "<" && line[line.length - 1] === ">") {
          getMachine().writableStatus.updateFromLogLine(line);
        } else if (line.substr(0, 2) === "ok" || line.substr(0, 4) === "Grbl") {
          getMachine().awaitAck = false;
        } else if (line) {
          output.push(line);
        }
      })
    );

    // const reset = action(() => (machineState.awaitAck = true));
    const write = action(
      `Write data to plotter ${path}`,
      (...lines: string[]) => input.push(...lines)
    );
    const dispose = () => {
      for (const disposer of disposers) disposer();
    };

    autorun(() => log("awaitAck", getMachine().awaitAck));

    (async function () {
      console.log("waiting for 0 awaitAck");
      await when(() => getMachine().awaitAck === false);
      console.log("done waiting for 0 awaitAck");

      disposers.push(
        reaction(
          () => getMachine().time,
          () => port.write("?"),
          {
            name: `Track status of plotter ${path}`,
            fireImmediately: true,
            delay: 1000,
          }
        )
      );

      disposers.push(
        queueProcessor(output, (line) =>
          console.log("> UNPROCESSED OUTPUT >" + line)
        )
      );

      log("start listening for jobs");

      autorun(() => {
        const gcode = getMachine().currentJob?.gcode;
        if (!gcode) return;
        console.log("got job", gcode);

        write(...gcode.split("\n"));
        write("M5", "G4 P0.2");
        write("G0 F1500 X0 Y0");
      });
    })();
  } catch (e) {
    console.error(e);
  }
})();
