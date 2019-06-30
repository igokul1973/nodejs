/*
Server-related tasks
 */

"use strict";

// Dependencies
const fs = require('fs');
const http = require('http');
const https = require('https');
const url = require('url');
const config = require('./config');
const helpers = require('./lib/helpers');
const handlers = require('./lib/handlers');
const StringDecoder = require('string_decoder').StringDecoder;
const httpPort = config.httpPort || 3000;
const httpsPort = config.httpsPort || 3001;
const tls = require('tls');
const path = require('path');

const sslKey = path.join(__dirname, 'https/key.pem');
const sslCert = path.join(__dirname, 'https/cert.pem');
console.log(sslKey, sslCert);

const server = {
    /**
     * Instantiate the HTTP server
     */
    httpServer: http.createServer((req, res) => {
        server.unifiedServer(req, res);
    }),
    /**
     * Define HTTPs options
     * @type {{key, cert}}
     */
    httpsServerOptions: {
        key: fs.readFileSync(sslKey),
        cert: fs.readFileSync(sslCert),
        passphrase: 'blabla'
    },
    /**
     * Instantiate the HTTPs server
     * @type {Server}
     */
    httpsServer: https.createServer(this.httpsServerOptions, function(req, res) {
        server.unifiedServer(req, res);
    }),
    /**
     * Handles user request and returns an appropriate response.
     * @param {IncomingMessage|*} req
     * @param {ServerResponse} res
     */
    unifiedServer: (req, res) => {
        // Get the URL and parse it
        const parsedUrl = url.parse(req.url, true);
        // Get the path
        const path = parsedUrl.pathname;
        // Trim leading and trailing forward slashes
        const trimmedPath = path.replace(/^\/+|\/+$/g, '');
        // Get query string object
        const queryStringObject = parsedUrl.query;
        // Get the HTTP method
        const method = req.method.toLowerCase();
        // Get the headers as an object
        const headers = req.headers;
        // Get the payload
        const decoder = new StringDecoder('utf-8');
        let buffer = '';
        /**
         * Request onData event handler
         */
        req.on('data', (data) => {
            buffer += decoder.write(data);
        });
        /**
         * Request onEnd event handler
         */
        req.on('end', () => {
            // Now buffer is a payload
            buffer += decoder.end();
            // Log the request path
            console.log(`The request received with these headers`, headers);
            console.log(`The requested trimmed URL was ${trimmedPath} with method: ${method}`);
            console.log(`The requested trimmed URL was ${trimmedPath} with method: ${method} and the buffer: `, buffer);
            // Choose the handler this request should go to.
            // If one is not found, use the notFound handler.
            let chosenHandler = typeof router[trimmedPath] !== 'undefined'
                ? router[trimmedPath]
                : handlers.notFound;
            /**
             * Construct the data to send to the handler
             * @type {string|null}
             */
            const payloadObject = helpers.parseJson(buffer);
            /**
             * The data necessary for the handler.
             * @type {{trimmedPath: string, headers: {}, method: string, queryStringObject: (null|*), payload: (*|string)}}
             */
            let data = {
                'trimmedPath': trimmedPath,
                'headers': headers,
                'method': method,
                'queryStringObject': queryStringObject,
                'payload': payloadObject
            };
            // Call the handler
            chosenHandler(data, (statusCode, payload) => {
                // Use status code defined by the handler
                // or default to 200
                statusCode = typeof statusCode === 'number'
                    ? statusCode
                    : 200;
                // Use payload called back by the handler
                // or default to an empty object.
                payload = typeof payload === 'object'
                    ? payload
                    : {};
                // Convert the payload to animal string;
                const payloadString = JSON.stringify(payload);
                // Set response headers
                res.setHeader('Content-type', 'application/json');
                // Set status code
                res.writeHead(statusCode);
                // Logging
                console.log(`Returning this response: `, statusCode, payloadString);
                // Send the response
                res.end(payloadString);
            });
        });
    },
    init: function() {
        /**
         * Start the HTTP server
         */
        this.httpServer.listen(httpPort, (error) => {
            if (error) console.log(error);
            console.log(`The HTTP server is listening on port ${httpPort} in ${config.envName} environment`);
        });
        /**
         * Start the HTTPs server
         */
        this.httpsServer.listen(httpsPort, (error) => {
            if (error) console.log(error);
            console.log(`The HTTPs server is listening on port ${httpsPort} in ${config.envName} environment`);
        });
    }
};
// Define animal router
const router = {
    ping: handlers.ping,
    users: handlers.users,
    tokens: handlers.tokens,
    checks: handlers.checks
};


server.httpsServer.on('tlsClientError', (error) => {
    console.error(error) ;
});

module.exports = server;
