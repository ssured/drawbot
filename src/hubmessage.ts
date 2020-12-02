import { ChangeTuple, subject } from "./graph/subject";

export type Message =
  | {
      tuple: ChangeTuple;
    }
  | {
      subject: subject;
      observed: boolean;
    };
