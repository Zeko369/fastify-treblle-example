import os from "node:os";
import fp from "fastify-plugin";

import { sendPayloadToTreblle, generateFieldsToMask, maskSensitiveValues } from "@treblle/utils";
import { readFile } from "node:fs/promises";

async function treblleFastify(
  fastify,
  {
    apiKey = process.env.TREBLLE_API_KEY,
    projectId = process.env.TREBLLE_PROJECT_ID,
    additionalFieldsToMask = [],
    worker,
  }
) {
  const pkg = JSON.parse(
    await readFile(new URL("./node_modules/treblle-fastify/package.json", import.meta.url), "utf8")
  );

  fastify.addHook("onSend", async (request, reply, payload) => {
    let errors = [];
    const body = request.body ?? {};
    const params = request.params;
    const query = request.query;
    const requestPayload = { ...body, ...params, ...query };
    const fieldsToMask = generateFieldsToMask(additionalFieldsToMask);
    const maskedRequestPayload = maskSensitiveValues(requestPayload, fieldsToMask);

    const protocol = `${request.protocol}/${request.raw.httpVersion}`;
    let originalResponseBody = payload;
    let maskedResponseBody;
    try {
      if (Buffer.isBuffer(payload)) {
        originalResponseBody = originalResponseBody.toString("utf8");
      }
      if (typeof originalResponseBody === "string") {
        let parsedResponseBody = JSON.parse(originalResponseBody);
        maskedResponseBody = maskSensitiveValues(parsedResponseBody, fieldsToMask);
      } else if (typeof originalResponseBody === "object") {
        maskedResponseBody = maskSensitiveValues(originalResponseBody, fieldsToMask);
      }
    } catch (error) {
      // if we can't parse the body we'll leave it empty and set an error
      errors.push({
        source: "onShutdown",
        type: "INVALID_JSON",
        message: "Invalid JSON format",
        file: null,
        line: null,
      });
    }
    const trebllePayload = {
      api_key: apiKey,
      project_id: projectId,
      sdk: "fastify",
      version: pkg.version,
      data: {
        server: {
          timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
          os: {
            name: os.platform(),
            release: os.release(),
            architecture: os.arch(),
          },
          software: null,
          signature: null,
          protocol,
          ip: fastify.server.address().address,
        },
        language: {
          name: "node",
          version: process.version,
        },
        request: {
          timestamp: new Date().toISOString().replace("T", " ").substr(0, 19),
          ip: request.ip,
          url: `${request.protocol}://${request.headers["host"]}${request.url}`,
          user_agent: request.headers["user-agent"],
          method: request.method,
          headers: request.headers,
          body: maskedRequestPayload,
        },
        response: {
          headers: reply.getHeaders(),
          code: reply.statusCode,
          size: reply.getHeader("content-length") ?? 0,
          load_time: reply.getResponseTime(),
          body: maskedResponseBody ?? null,
        },
        errors,
      },
    };
    try {
      worker.postMessage(JSON.stringify({ trebllePayload, apiKey }));
    } catch (error) {
      console.log(error);
    }
  });
}

export default fp(treblleFastify, {
  name: "treblle-fastify",
});
