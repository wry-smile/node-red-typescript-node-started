import type { EditorRED } from "node-red";
import type { MultipleLocalesNodeClientNodeProperties } from "./types";

declare const RED: EditorRED;

RED.nodes.registerType<MultipleLocalesNodeClientNodeProperties>("multiple-locales-node", {
  category: "function",
  color: "#a6bbcf",
  defaults: {
    name: { value: "" },
  },
  inputs: 1,
  outputs: 1,
  icon: "file.png",
  paletteLabel: "multiple-locales-node",
  label() {
    return this.name || "multiple-locales-node";
  },
});
