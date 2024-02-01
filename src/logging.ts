import pino from "pino";

/**
 * @todo
 * [] Stream log to file
 * [] Rotate log file daily
 */
export const logger = pino({
  transport: {
    target: "pino-pretty",
  },
});
