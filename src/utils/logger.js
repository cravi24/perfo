/* eslint-disable no-console */
const consoleLogger = {
  info: (message) => console.info(message),
  debug: (message) => console.debug(message),
  warn: (message) => console.warn(message),
  error: (message) => console.error(message),
};

let clientLogger;
export const initLogger = (logger) => {
  clientLogger = logger;
};

const log = clientLogger || consoleLogger;

export default log;
