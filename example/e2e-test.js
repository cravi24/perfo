const Perfo = require('../dist').default;

const randomTime = (min, max) => {
  const num = Math.floor(Math.random() * (max - min)) + min;
  return num;
};

// function under performance test
const sleep = () => new Promise((resolve) => setTimeout(() => resolve(), randomTime(10, 25)));

Perfo.init();
Perfo.start(sleep, 100, 10);
