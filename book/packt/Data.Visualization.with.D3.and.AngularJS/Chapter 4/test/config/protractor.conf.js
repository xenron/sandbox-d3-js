var path = require('path');

exports.config = {
  
  // The address of a running selenium server.
  seleniumAddress: 'http://localhost:4444/wd/hub',

  // Spec patterns are relative to the configuration file location passed
  // to proractor (in this example conf.js).
  // They may include glob patterns.
  specs: [
    '../e2e/**/*.e2e.js'
  ],

  baseUrl: 'http://127.0.0.1:8000',

  // Options to be passed to Jasmine-node.
  jasmineNodeOpts: {
    showColors: true, // Use colors in the command line report.
  }
}