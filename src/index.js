import log, { initLogger } from './utils/logger';
import throttler from './throttler';
import metrics from './metrics';

/**
 * initialize/setup before starting performance test
 * @param {* pass options like logger} options
 */
const init = (options) => {
  initLogger(options && options.logger);
};

const executeCallback = async (callback) => {
  try {
    const startTime = Date.now();
    await callback();
    const latency = Date.now() - startTime;
    metrics.endRecording(latency, true);
  } catch (e) {
    metrics.endRecording(0, false);
    log.info(`error while executing: ${e}`);
  } finally {
    metrics.logMetricsIfDone();
  }
};

/**
 * This function assumes your fucntion is ready for performance test and
 * prep work like caching is already done.
 * @param {* function you want to run performance test for} functionCallback
 * @param {* no of times function needs to be executed} targetExecutionCount
 * @param {* per second rate at which function needs be executed } throughput
 * @param {* options like payloadSize, reportingProgressFrequency can be passed} options
 */
const start = async (functionCallback, targetExecutionCount, throughput, options = {}) => {
  log.info(`Starting performance test for throughput ${throughput} & target execution count ${targetExecutionCount}`);
  throttler.init(throughput, Date.now());
  metrics.init(targetExecutionCount, options);
  for (let i = 0; i < targetExecutionCount; i++) {
    executeCallback(functionCallback);
    // eslint-disable-next-line no-await-in-loop
    await throttler.throttle(i);
  }
};

const Perfo = { start, init };

export default Perfo;
