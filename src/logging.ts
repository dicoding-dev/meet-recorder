import pino from "pino";

const transport = pino.transport({
  targets: [
    { target: "pino-pretty" },
    { target: "pino/file", options: { destination: "./recorder.log" } },
  ],
});

export const logger = pino(transport);
