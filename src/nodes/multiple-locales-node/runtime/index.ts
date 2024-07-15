import type { NodeInitializer } from "node-red";
import type { MultipleLocalesNodeNode, MultipleLocalesNodeNodeDef } from "./types";

const nodeInit: NodeInitializer = (RED): void => {
  function MultipleLocalesNodeNodeConstructor(
    this: MultipleLocalesNodeNode,
    config: MultipleLocalesNodeNodeDef
  ): void {
    RED.nodes.createNode(this, config);
  }

  RED.nodes.registerType("multiple-locales-node", MultipleLocalesNodeNodeConstructor);
};

export default nodeInit;
