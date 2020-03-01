import throttler from './throttler';
import log from './utils/logger';

let perfExecutionStartTime;
let expectedExecutionCount;
const latencies = [];
let perfProgressReportFrequency;
let successCount = 0;
let failedCount = 0;
let bytes = 0;
let maxLatency = 0;
let bytesPerExecution = 0;
let totalLatency = 0;
let windowStart;
let windowCount = 0;
let windowMaxLatency = 0;
let windowTotalLatency = 0;
let windowBytes = 0;

const init = (executionCount, { payloadSize, reportingProgressFrequency }) => {
  perfExecutionStartTime = Date.now();
  expectedExecutionCount = executionCount;
  windowStart = Date.now();
  bytesPerExecution = payloadSize || 0;
  perfProgressReportFrequency = reportingProgressFrequency || 5000;
};

const logPerfResultsInCurrentWindow = () => {
  const elapsed = Date.now() - windowStart;
  const recsPerSec = (1000.0 * windowCount) / elapsed;
  const mbPerSec = (1000.0 * windowBytes) / elapsed / (1024.0 * 1024.0);

  log.info(
    `Total executions: ${windowCount},
    Throughput: ${recsPerSec.toFixed(2)} records/sec,
    Data throughput: ${mbPerSec} MB/sec,
    Avg latency: ${(windowTotalLatency / windowCount).toFixed(2)} ms,
    Max latency: ${windowMaxLatency} ms`,
  );
};

const createNewPerfWindow = () => {
  windowStart = Date.now();
  windowCount = 0;
  windowMaxLatency = 0;
  windowTotalLatency = 0;
  windowBytes = 0;
};

/**
 * End recording should be called after every execution.
 * @param {*} latency
 * @param {*} time
 * @param {*} isExecutionSuccess
 */
const endRecording = (latency, isExecutionSuccess) => {
  if (isExecutionSuccess) {
    successCount += 1;
    bytes += bytesPerExecution;
    totalLatency += latency;
    maxLatency = Math.max(maxLatency, latency);
    windowBytes += bytesPerExecution;
    windowTotalLatency += latency;
    windowMaxLatency = Math.max(windowMaxLatency, latency);
    latencies.push(latency);
  } else {
    failedCount += 1;
  }
  windowCount += 1;
  /* maybe report the recent perf */
  if (Date.now() - windowStart >= perfProgressReportFrequency) {
    logPerfResultsInCurrentWindow();
    createNewPerfWindow();
  }
};

const getPercentiles = (totalExecutions, eventPercentiles) => {
  const size = Math.min(totalExecutions, latencies.length);
  latencies.sort((a, b) => a - b);
  const percentileResult = [];
  for (let i = 0; i < eventPercentiles.length; i++) {
    const perIndex = Math.floor(eventPercentiles[i] * size);
    percentileResult[i] = latencies[perIndex];
  }
  return percentileResult;
};

const logPerformanceStats = () => {
  const totalExecutions = successCount + failedCount;
  const elapsed = Date.now() - perfExecutionStartTime;
  const recsPerSec = (1000 * totalExecutions) / elapsed;
  const mbPerSec = (1000 * bytes) / elapsed / (1024 * 1024);
  const eventPercentiles = [0.95, 0.99, 0.999];
  const percs = getPercentiles(successCount, eventPercentiles);
  const perc95 = percs[0];
  const perc99 = percs[1];
  const perc999 = percs[2];
  log.info(
    `Total executions: ${totalExecutions},
    Throughput: ${recsPerSec.toFixed(2)} records/sec,
    Data throughput: ${mbPerSec} MB/sec,
    Avg latency: ${(totalLatency / totalExecutions).toFixed(2)}ms,
    Max latency: ${maxLatency} ms,
    P95: ${perc95} ms,
    P99: ${perc99} ms,
    P99.9: ${perc999} ms,
    Throttle count ${throttler.getThrottleCount()}`,
  );
};

const reset = () => {
  failedCount = 0;
  successCount = 0;
  bytes = 0;
  totalLatency = 0;
  maxLatency = 0;
};

const logMetricsIfDone = () => {
  const count = successCount + failedCount;
  if (count === expectedExecutionCount) {
    if (failedCount > 0) {
      log.info(`failed to publish ${failedCount} events`);
    }
    logPerformanceStats();
    reset();
  }
};

module.exports = {
  init,
  endRecording,
  logMetricsIfDone,
  reset,
};
