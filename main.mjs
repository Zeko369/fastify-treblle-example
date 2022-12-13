import fastify from "fastify";
import treblleFastify from "treblle-fastify";

const app = fastify();

const key = "";
const pid = "";

app.register(treblleFastify, {
  apiKey: key,
  projectId: pid,
});

app.get("/", async (request, reply) => {
  return { hello: "world" };
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
