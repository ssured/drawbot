const SerialPort = require("serialport");
const Readline = require("@serialport/parser-readline");
const { observable, action, when, reaction } = require("mobx");
const { queueProcessor } = require("mobx-utils");
const { readFile } = require("fs-extra");

(async () => {
  try {
    const ports = await SerialPort.list();
    if (ports.length === 0) throw new Error("no serial port found");

    const machineState = observable.object({
      awaitAck: true,
      time: 0,
      state: "",
      mx: 0,
      my: 0,
      mz: 0,
      wx: 0,
      wy: 0,
      wz: 0,
    });

    const { path } = ports[0];
    const port = new SerialPort(path, { baudRate: 115200 });
    const disposers = [() => port.close()];

    const parser = new Readline();
    port.pipe(parser);

    const input = observable.array([]);
    disposers.push(
      reaction(
        () => !machineState.awaitAck && input.length > 0,
        action((doWrite) => {
          if (!doWrite) return;
          machineState.awaitAck = true;
          const line = input.shift();
          console.log(input.length, ">>", line);
          port.write(line + "\n");
        }),
        {
          name: `Write commands to plotter ${path}`,
          fireImmediately: true,
        }
      )
    );

    const output = observable.array([]);
    parser.on(
      "data",
      action(`Process data from plotter ${path}`, (lineWithNewline) => {
        const line = lineWithNewline.substr(0, lineWithNewline.length - 1);
        console.log("<", Date.now(), machineState.awaitAck, line);
        if (line[0] === "<" && line[line.length - 1] === ">") {
          const [state, mposx, my, mz, wposx, wy, wz] = line
            .substr(1, line.length - 2)
            .split(",");
          machineState.time = Date.now();
          machineState.state = state;
          machineState.mx = parseFloat(mposx.split(":")[1]);
          machineState.my = parseFloat(my);
          machineState.mz = parseFloat(mz);
          machineState.wx = parseFloat(wposx.split(":")[1]);
          machineState.wy = parseFloat(wy);
          machineState.wz = parseFloat(wz);
        } else if (line.substr(0, 2) === "ok" || line.substr(0, 4) === "Grbl") {
          machineState.awaitAck = false;
        } else if (line) {
          output.push(line);
        }
      })
    );

    // const reset = action(() => (machineState.awaitAck = true));
    const write = action(`Write data to plotter ${path}`, (...lines) =>
      input.push(...lines)
    );
    const dispose = () => {
      for (const disposer of disposers) disposer();
    };

    (async function () {
      console.log("waiting for 0 awaitAck");
      await when(() => !machineState.awaitAck);
      console.log("done waiting for 0 awaitAck");

      disposers.push(
        reaction(
          () => machineState.time,
          () => port.write("?"),
          {
            name: `Track status of plotter ${path}`,
            fireImmediately: true,
            delay: 10,
          }
        )
      );

      disposers.push(
        queueProcessor(output, (line) =>
          console.log("> UNPROCESSED OUTPUT >" + line)
        )
      );

      const job = require("./box"); // await readFile("./index.gcode", "utf-8");
      write(...job.split("\n"));

      // write("M3 S1000", "G4 P0.2");
      // write("G0 F1500 X50 Y50");
      // write("G0 F1500 X0 Y0");
      // write("G0 F1500 X50 Y50");

      await waitUntilIdle();

      await properExit();
    })();

    async function waitUntilIdle() {
      await new Promise((r) => setTimeout(r, 500));
      await when(() => input.length === 0 && machineState.state === "Idle");
    }

    async function properExit() {
      write("M5", "G4 P0.2");
      write("G0 F1500 X0 Y0");
      await waitUntilIdle();
      dispose();
    }
  } catch (e) {
    console.error(e);
  }
})();
