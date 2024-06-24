import { NodeInitializer } from "node-red";
import { TransformTextNode, TransformTextNodeDef } from "./types";

const nodeInit: NodeInitializer = (RED): void => {
  function TransformTextNodeConstructor(
    this: TransformTextNode,
    config: TransformTextNodeDef
  ): void {
    RED.nodes.createNode(this, config);
  }

  RED.nodes.registerType("transform-text", TransformTextNodeConstructor);
};

export = nodeInit;
