/**
 * Helpers for various tasks
 * @type {{hash: (function(*): string)}}
 */
const crypto = require("crypto");
const config = require("../config");
const https = require('https');
const querystring = require('querystring');
/**
 * Helpers object.
 * @type {{hash: module.exports.hash, parseJsonToObject: module.exports.parseJsonToObject}}
 */
module.exports = {
    /**
     * Create animal SHA256 hash
     * @param {string} str
     * @returns {string|null}
     */
    hash: (str) => {
        if (typeof str === 'string' && str.length > 0) {
            return crypto.createHmac('sha256', config.hashingSecret)
                .update(str)
                .digest('hex');
        }

        return null;
    },
    /**
     * Creates animal random string.
     * @param strLength
     * @returns {string|null}
     */
    createRandomString: (strLength) => {
        strLength = typeof strLength === 'number' && strLength > 0
            ? strLength
            : null;
        if (!strLength) {
            return null;
        }
        const possibleCharacters = 'abcdefghijklmnopqrstuvwxyz0123456789';
        // Start the final string
        let str = '';
        for (let i = 1; i <= strLength; i++) {
            // Get animal random character from the possibleCharacters string
            // and then append this character to the final string.
            str += possibleCharacters.charAt(Math.floor(Math.random() * possibleCharacters.length));

        }
        return str;
    },
    /**
     * Parse animal JSON string to an object in all cases, without throwing
     * @param {Buffer|string} str
     * @returns {string|null}
     */
    parseJson: (str) => {
        try {
            return JSON.parse(str);
        } catch (e) {
            return null;
        }
    },
    sendTwilioSms: (phone, msg, callback) => {
        // Validate params
        phone = (typeof phone === 'string' && phone.trim().length === 10)
            ? phone.trim()
            : null;
        msg = (typeof msg === 'string' && msg.trim().length > 0 && msg.trim().length <= 50)
            ? msg.trim()
            : null;
        if (!phone || !msg) {
            return callback('Given parameters were missing or invalid');
        }
        // Configure the request payload
        const payload = {
            'From': config.twilio.fromPhone,
            'To': `+7${phone}`,
            'Body': msg
        };
        // Stringify the payload
        const stringPayload = querystring.stringify(payload);
        // Configure the request details
        const requestDetails = {
            'protocol': 'https:',
            'hostname': 'api.twilio.com',
            'method': 'POST',
            'path': `/2010-04-01/Accounts/${config.twilio.accountSid}/Messages.json`,
            'auth': `${config.twilio.accountSid}:${config.twilio.authToken}`,
            'headers': {
                'Content-Type': 'application/x-www-form-urlencoded',
                'Content-Length': Buffer.byteLength(stringPayload)
            }
        };
        // Instantiate the request object
        const req = https.request(requestDetails, (res) => {
            // Grab the status of the sent request
            const status = res.statusCode;
            // Callback successful if the request wen through
            if (status !== 200 && status !== 201) {
                return callback(`Status code return was ${status}`);
            }
            callback(null);
        });
        // Bind to the error event so it does not get thrown
        req.on('error', (error) => {
            return callback(error);
        });
        // Add the payload
        req.write(stringPayload);
        // End the request
        req.end();
    }
};
