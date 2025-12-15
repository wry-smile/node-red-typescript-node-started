import type { NodeInitializer } from "node-red";
import type { SimpleNodeNode, SimpleNodeNodeDef } from "./types";

const nodeInit: NodeInitializer = (RED): void => {
  function SimpleNodeNodeConstructor(
    this: SimpleNodeNode,
    config: SimpleNodeNodeDef
  ): void {
    RED.nodes.createNode(this, config);
  }

  RED.nodes.registerType("simple-node", SimpleNodeNodeConstructor);
};

export default nodeInit;
