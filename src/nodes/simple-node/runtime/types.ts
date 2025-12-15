import type { Node, NodeDef } from "node-red";
import type { SimpleNodeOptions } from "../types";

export interface SimpleNodeNodeDef extends NodeDef, SimpleNodeOptions {}
export type SimpleNodeNode = Node & SimpleNodeOptions;
