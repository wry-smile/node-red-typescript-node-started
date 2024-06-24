import { EditorNodeProperties } from "node-red";
import { TransformTextOptions } from "../types";

export interface TransformTextClientNodeProperties
  extends EditorNodeProperties,
    TransformTextOptions {}
