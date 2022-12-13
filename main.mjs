import { Worker, isMainThread, parentPort, workerData } from "node:worker_threads";

import fastify from "fastify";
import { sendPayloadToTreblle } from "@treblle/utils";
import treblleFastify from "treblle-fastify";
import myTreblleFastify from "./myHook.mjs";
import { config } from "dotenv";

config();

if (isMainThread) {
  const worker = new Worker(new URL("./main.mjs", import.meta.url).pathname);
  const app = fastify();

  const key = process.env.TREBLLE_API_KEY;
  const pid = process.env.TREBLLE_PROJECT_ID;

  // app.register(treblleFastify, { apiKey: key, projectId: pid });
  app.register(myTreblleFastify, { apiKey: key, projectId: pid, worker });

  app.get("/", async (request, reply) => {
    return {
      hello: "world",
      posts: [
        { id: 1, title: "hello", body: "lorem ipsum dolor sit amet" },
        { id: 1, title: "hello", body: "lorem ipsum dolor sit amet" },
        { id: 1, title: "hello", body: "lorem ipsum dolor sit amet" },
        { id: 1, title: "hello", body: "lorem ipsum dolor sit amet" },
        { id: 1, title: "hello", body: "lorem ipsum dolor sit amet" },
        { id: 1, title: "hello", body: "lorem ipsum dolor sit amet" },
        { id: 1, title: "hello", body: "lorem ipsum dolor sit amet" },
        { id: 1, title: "hello", body: "lorem ipsum dolor sit amet" },
      ],
    };
  });

  (async () => {
    try {
      const host = await app.listen({ port: 3000 });
      console.log(host);
    } catch (err) {
      app.log.error(err);
      process.exit(1);
    }
  })();
} else {
  parentPort.on("message", (data) => {
    const { trebllePayload, apiKey } = JSON.parse(data);
    sendPayloadToTreblle(trebllePayload, apiKey);
  });
}
