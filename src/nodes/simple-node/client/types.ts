import type { EditorNodeProperties } from "node-red";
import type { SimpleNodeOptions } from "../types";

export interface SimpleNodeClientNodeProperties
  extends EditorNodeProperties,
  SimpleNodeOptions {}
