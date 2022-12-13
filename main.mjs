import { Worker, isMainThread, parentPort, workerData } from "node:worker_threads";

import fastify from "fastify";
import { sendPayloadToTreblle } from "@treblle/utils";
import treblleFastify from "treblle-fastify";
import { config } from "dotenv";
import { PrismaClient } from "@prisma/client";

import myTreblleFastify from "./myHook.mjs";

config();

if (isMainThread) {
  const worker = new Worker(new URL("./main.mjs", import.meta.url).pathname);
  const app = fastify();
  const prisma = new PrismaClient();
  await prisma.$connect();

  const key = process.env.TREBLLE_API_KEY;
  const pid = process.env.TREBLLE_PROJECT_ID;

  switch (process.env.TYPE) {
    case "worker":
      app.register(myTreblleFastify, { apiKey: key, projectId: pid, worker });
      break;
    case "plugin":
      app.register(treblleFastify, { apiKey: key, projectId: pid });
      break;
  }

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

  const take = (query) => (query && !Number.isNaN(Number(query.take)) ? Number(query.take) : 50);
  app.get("/db", async (request, reply) =>
    JSON.stringify(await prisma.post.findMany({ take: take(request.query) }))
  );

  try {
    const port = process.env.PORT ? Number(process.env.PORT) : 3000;
    const host = await app.listen({ port });
    console.log(host);
  } catch (err) {
    app.log.error(err);
    process.exit(1);
  }
} else {
  parentPort.on("message", (data) => {
    const { trebllePayload, apiKey } = JSON.parse(data);
    sendPayloadToTreblle(trebllePayload, apiKey);
  });
}
