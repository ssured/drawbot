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
import { queueProcessor } from "mobx-utils";
import SerialPort from "serialport";
import WebSocket from "ws";
import { Drawbot, DrawbotStatus, ifDrawbotState } from "./Drawbot";
import { Graph } from "./graph/subject";
import { connectWS } from "./graph/transport/ws/client";
import { DRAWBOT } from "./knownSubjects";
import { createLogger } from "./utils/log";

const Readline = require("@serialport/parser-readline");

// configure mobx to inform us of any improper behaviour
configure({ enforceActions: "observed" });
onReactionError((error) => {
  console.error(error);
  debugger;
});

const log = createLogger(__filename);

const graph = new Graph({});

const stopConnection = connectWS({
  graph,
  Socket: WebSocket as any,
  wsUrl: `ws://localhost:8080`,
});

class WritableDrawbotStatus extends DrawbotStatus {
  @action updateFromLogLine(line: string) {
    const time = Date.now();
    const [state, mposx, my, _mz, _wposx, _wy, _wz] = line
      .substr(1, line.length - 2)
      .split(",");

    const currentState = {
      state,
      mx: parseFloat(parseFloat(mposx.split(":")[1]).toFixed(2)),
      my: parseFloat(parseFloat(my).toFixed(2)),
    };

    const lastState = this.$.read(ifDrawbotState, "current");
    if (JSON.stringify(lastState) !== JSON.stringify(currentState)) {
      this.$.write(ifDrawbotState, currentState, "current");
    }
  }
}

class DrawbotServer extends Drawbot {
  @observable awaitAck = true;
  @observable lastLogLine = 0;

  @computed get writableStatus() {
    return this.$.open(WritableDrawbotStatus, this.status.$.subject);
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
        // console.log("<", Date.now(), getMachine().awaitAck, line);
        if (line[0] === "<" && line[line.length - 1] === ">") {
          getMachine().writableStatus.updateFromLogLine(line);
          getMachine().lastLogLine = Date.now();
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

    (async function () {
      console.log("waiting for 0 awaitAck");
      await when(() => getMachine().awaitAck === false);
      console.log("done waiting for 0 awaitAck");

      disposers.push(
        reaction(
          () => getMachine().status.current && getMachine().lastLogLine,
          () => port.write("?"),
          {
            name: `Track status of plotter ${path}`,
            fireImmediately: true,
            delay: 50,
          }
        )
      );

      disposers.push(
        queueProcessor(output, (line) =>
          console.log("> UNPROCESSED OUTPUT >" + line)
        )
      );

      log("start listening for jobs");

      let stop: (() => void) | undefined;

      reaction(
        () => getMachine().currentJob,
        (currentJob) => {
          stop?.();
          if (currentJob == null) {
            stop = () => {};
            return;
          }

          const execution = observable({
            pos: "",
          });

          const stopProcessing = reaction(
            () => currentJob.gcodeKeys.filter((key) => key > execution.pos),
            (unprocessedKeys) => {
              if (unprocessedKeys.length === 0) return;

              const key = unprocessedKeys[0];
              const gcode = currentJob.readLine(key);
              log("write", gcode);
              write(...gcode.split("\n"));
              execution.pos = key;
            },
            { fireImmediately: true }
          );

          stop = () => {
            stopProcessing();
            // write(String.fromCharCode(24)); // ctrl + x
            write("M5", "G4 P0.2");
            write("G90");
            write("G0 F1500 X0 Y0");
          };

          // const gcode = getMachine().currentJob?.gcode;
          // if (!gcode) return;
          // console.log("got job", gcode);

          // write(...gcode.split("\n"));
          // write("M5", "G4 P0.2");
          // write("G0 F1500 X0 Y0");
        },
        { fireImmediately: true }
      );
    })();
  } catch (e) {
    console.error(e);
  }
})();
