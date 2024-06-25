import type { EditorNodeProperties } from "node-red";
import type { TransformTextOptions } from "../types";

export interface TransformTextClientNodeProperties
  extends EditorNodeProperties,
  TransformTextOptions {}
