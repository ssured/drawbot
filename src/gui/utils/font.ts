import m from "makerjs";
import { Font, load } from "opentype.js";
import { toPaths } from "./makerjs";

export const FONTS = {
  hand: "./hand.TTF",
};

const fontCache = new Map<string, Promise<Font>>();

function loadFont(name: keyof typeof FONTS): Promise<Font> {
  if (!fontCache.has(name)) {
    fontCache.set(
      name,
      new Promise((res, rej) => {
        load(FONTS[name], (err, font) => (err ? rej(err) : res(font!)));
      })
    );
  }
  return fontCache.get(name)!;
}

export type Text = {
  font: keyof typeof FONTS;
  text: string;
  size: number;
};

export const renderText = async function (text: Text) {
  const font = await loadFont(text.font);
  return toPaths(new m.models.Text(font, text.text, text.size, true));
};
