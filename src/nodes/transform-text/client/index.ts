import { EditorRED } from "node-red";
import { TransformTextClientNodeProperties } from "./types";

declare const RED: EditorRED;

RED.nodes.registerType<TransformTextClientNodeProperties>("transform-text", {
  category: "function",
  color: "#a6bbcf",
  defaults: {
    name: { value: "" },
  },
  inputs: 1,
  outputs: 1,
  icon: "file.png",
  paletteLabel: "TransformText",
  label: function () {
    return this.name || "TransformText";
  },
});
