/**
 * The primary file for the API.
 */
"use strict";

// Dependencies
const server = require('./server');
const workers = require('./workers');
const tls = require('tls');

const ciphers = tls.getCiphers();

// Declare the app
const app = {
    // Init function
    init: () => {
        server.init();
        workers.init();
    }
};

console.log(ciphers);
// Execute
app.init();

// Export the app
module.exports = app;
