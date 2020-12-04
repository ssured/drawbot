import { ChangeTuple, subject } from "../../subject";

export type Message =
  | {
      tuple: ChangeTuple;
    }
  | {
      subject: subject;
      observed: boolean;
    };
