import { action, comparer, computed } from "mobx";
import { ifNumber, ifObject, ifString } from "./graph/guard";
import { GuardType, Model } from "./graph/subject";

export class DrawbotJob extends Model {
  @action addGcode(gcodes: string | string[]) {
    for (const gcode of Array.isArray(gcodes) ? gcodes : [gcodes]) {
      const state = this.$.getState();
      this.$.write(ifString, gcode, state);
    }
  }

  @computed({ equals: comparer.structural }) get gcodeKeys() {
    return this.$.keys()
      .filter((key) => key.substr(0, 2) === "KJ")
      .sort();
  }

  readLine(key: string) {
    return this.$.read(ifString, key) || "";
  }

  @computed get gcode() {
    return this.gcodeKeys
      .map((key) => this.readLine(key))
      .filter((gcode) => gcode !== "")
      .join("\n");
  }
  set gcode(gcode) {
    this.addGcode(gcode);
    // this.$.write(ifString, gcode, "gcode");
  }
}

export const ifDrawbotState = ifObject({
  time: ifNumber,
  state: ifString,
  mx: ifNumber,
  my: ifNumber,
});

export class DrawbotStatus extends Model {
  @computed get current(): Partial<GuardType<typeof ifDrawbotState>> {
    return this.$.read(ifDrawbotState, "current") || {};
  }

  @computed get time() {
    return this.current.time || 0;
  }
  @computed get state() {
    return this.current.state || "";
  }
  @computed get mx() {
    return this.current.mx || 0;
  }
  @computed get my() {
    return this.current.my || 0;
  }
}

export class Drawbot extends Model {
  @computed get status() {
    return this.$.open(DrawbotStatus, ["tmp", ...this.$.subject]);
  }

  @computed get currentJob() {
    return this.$.read(DrawbotJob, "job");
  }
  set currentJob(job) {
    this.$.write(DrawbotJob, job, "job");
  }
}
