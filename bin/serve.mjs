#!/usr/bin/env node
// 启动本地出稿工作台：node bin/serve.mjs
import { createServer } from "../lib/server.mjs";
import { loadConfig } from "../lib/store.mjs";

const config = loadConfig();
const port = Number(process.env.PORT || config.port || 4789);
const host = "127.0.0.1";
const server = createServer(config);
server.listen(port, host, function () {
  console.log("出稿工作台已启动：" + "http://" + host + ":" + port);
  console.log("数据目录：" + config.brand.name + " / drafts/ media/ state/");
  console.log("（只监听本机；不含任何发布能力，发布要你自己去 X 复制粘贴）");
});
