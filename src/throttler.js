import nanoNow from 'nano-time';

const NANO_SECOND_PER_MS = 1000000;
const NANO_SECOND_PER_SEC = 1000 * NANO_SECOND_PER_MS;
const MIN_SLEEP_NANO_SECOND = 2 * NANO_SECOND_PER_MS;
const LONG_MAX = 1000000;

let startMs;
let sleepTimeNs;
let targetThroughput;

let sleepDeficitNs = 0;
let throttleCount = 0;

const init = (eventTargetThroughput, eventStartMs) => {
  startMs = eventStartMs;
  targetThroughput = eventTargetThroughput;
  sleepTimeNs = eventTargetThroughput > 0 ? NANO_SECOND_PER_SEC / eventTargetThroughput : LONG_MAX;
};

const shouldThrottle = (currentExecutionIndex) => {
  // throttling is not required.
  if (targetThroughput < 0) {
    return false;
  }

  const elapsedSec = (Date.now() - startMs) / 1000;
  return elapsedSec > 0 && currentExecutionIndex / elapsedSec > targetThroughput;
};

const sleep = (durationInMs) => new Promise((resolve) => setTimeout(() => resolve(), durationInMs));

const throttle = async (currentExecutionIndex) => {
  if (!shouldThrottle(currentExecutionIndex)) {
    return;
  }
  sleepDeficitNs += sleepTimeNs;

  // If enough sleep deficit has accumulated, sleep a little
  if (sleepDeficitNs >= MIN_SLEEP_NANO_SECOND) {
    const sleepStartNs = nanoNow();
    let remaining = sleepDeficitNs;
    while (remaining > 0) {
      // eslint-disable-next-line no-await-in-loop
      await sleep(remaining / 1000000);
      const elapsed = nanoNow() - sleepStartNs;
      remaining = sleepDeficitNs - elapsed;
    }
    sleepDeficitNs = 0;
    throttleCount += 1;
  }
};

const getThrottleCount = () => throttleCount;

module.exports = {
  init,
  throttle,
  getThrottleCount,
};
