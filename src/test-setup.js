// Force TF.js to use the CPU backend in the test environment.
// jsdom provides window/document globals but has no WebGL, so without this
// TF.js would log WebGL errors before falling back automatically.
import * as tf from '@tensorflow/tfjs';
await tf.setBackend('cpu');
await tf.ready();

// Silence the "install tfjs-node for speed" advisory that TF.js prints
// whenever it detects a Node-like environment — it's noise in test output.
const _warn = console.warn.bind(console);
console.warn = (...args) => {
  if (typeof args[0] === 'string' && args[0].includes('TensorFlow.js in Node.js')) return;
  _warn(...args);
};
