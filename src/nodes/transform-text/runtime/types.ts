import type { Node, NodeDef } from "node-red";
import type { TransformTextOptions } from "../types";

export interface TransformTextNodeDef extends NodeDef, TransformTextOptions {}
export type TransformTextNode = Node & TransformTextOptions;
