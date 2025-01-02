import type { NodeInitializer } from "node-red";

const pluginInit: NodeInitializer = (RED): void => {
 RED.plugins.registerPlugin("snapshot", {
    type: "Snapshot",
    onadd() {

    }
  })
};

export default pluginInit;
