const SerialPort = require("serialport");
const Readline = require("@serialport/parser-readline");
const { observable, action, when, reaction } = require("mobx");
const { queueProcessor } = require("mobx-utils");
const { readFile } = require("fs-extra");

const machineState = observable.object({
  awaitAck: 1,
  time: 0,
  state: "",
  mx: 0,
  my: 0,
  mz: 0,
  wx: 0,
  wy: 0,
  wz: 0,
});

const path = "/dev/tty.usbserial-A50285BI";
const port = new SerialPort(path, { baudRate: 115200 });
const disposers = [() => port.close()];

const parser = new Readline();
port.pipe(parser);

const input = observable.array([]);
disposers.push(
  reaction(
    () => machineState.awaitAck === 0 && input.length > 0,
    action((doWrite) => {
      if (!doWrite) return;
      machineState.awaitAck += 1;
      const line = input.shift() + "\n";
      port.write(line);
    }),
    {
      name: `Write commands to plotter ${path}`,
      fireImmediately: true,
      delay: 5,
    }
  )
);

const output = observable.array([]);
parser.on(
  "data",
  action(`Process data from plotter ${path}`, (lineWithNewline) => {
    const line = lineWithNewline.substr(0, lineWithNewline.length - 1);
    console.log(Date.now(), machineState.awaitAck, line);
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
      machineState.awaitAck += 1;
    } else if (line.substr(0, 2) === "ok" || line.substr(0, 4) === "Grbl") {
      machineState.awaitAck -= 1;
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
  await when(() => machineState.awaitAck === 0);

  // disposers.push(
  //   reaction(
  //     () => machineState.time,
  //     action(() => {
  //       port.write("?\n");
  //     }),
  //     {
  //       name: `Track status of plotter ${path}`,
  //       fireImmediately: true,
  //       delay: 100,
  //     }
  //   )
  // );

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
