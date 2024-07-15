import type { Node, NodeDef } from "node-red";
import type { MultipleLocalesNodeOptions } from "../types";

export interface MultipleLocalesNodeNodeDef extends NodeDef, MultipleLocalesNodeOptions {}
export type MultipleLocalesNodeNode = Node & MultipleLocalesNodeOptions;
