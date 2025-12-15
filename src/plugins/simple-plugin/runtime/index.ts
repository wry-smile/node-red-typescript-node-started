import type { NodeInitializer } from "node-red";

const pluginInit: NodeInitializer = (RED): void => {
 RED.plugins.registerPlugin("simple-plugin", {
    type: "SimplePlugin",
    onadd() {

    }
  })
};

export default pluginInit;
