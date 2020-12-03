import { computed } from "mobx";
import { ifNumber, ifString } from "./graph/guard";
import { Model } from "./graph/subject";

export class DrawbotJob extends Model {
  @computed get gcode() {
    return this.$.read(ifString, "gcode") || "";
  }
  set gcode(gcode) {
    this.$.write(ifString, gcode, "gcode");
  }
}

export class DrawbotStatus extends Model {
  @computed get time() {
    return this.$.read(ifNumber, "time") || 0;
  }
  @computed get state() {
    return this.$.read(ifString, "state") || "";
  }
  @computed get mx() {
    return this.$.read(ifNumber, "mx") || 0;
  }
  @computed get my() {
    return this.$.read(ifNumber, "my") || 0;
  }
  @computed get mz() {
    return this.$.read(ifNumber, "mz") || 0;
  }
}

export class Drawbot extends Model {
  @computed get status() {
    return this.$.open(DrawbotStatus, ["tmp", ...this.$.subject]);
  }

  @computed get time() {
    return this.status.time;
  }
  @computed get state() {
    return this.status.state;
  }
  @computed get mx() {
    return this.status.mx;
  }
  @computed get my() {
    return this.status.my;
  }
  @computed get mz() {
    return this.status.mz;
  }

  @computed get currentJob() {
    return this.$.read(DrawbotJob, "job");
  }
  set currentJob(job) {
    this.$.write(DrawbotJob, job, "job");
  }
}
