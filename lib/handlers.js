// Dependencies
const _data = require("./data");
const helpers = require("./helpers");
const config = require("../config");

const allowedMethods = ['post', 'get', 'put', 'delete'];
const Errors = {
    MISSING_ID: {'error': 'Missing required field: id'}
};

/**
 * Get token from request headers
 * @param {object} data
 * @type {{headers: data.headers, token: data.headers.token}}
 * @returns {null}
 * @private
 */
function _getTokenFromHeaders(data) {
    return (typeof data.headers.token === 'string')
        ? data.headers.token
        : null;
}

function _getId(data) {
    return (typeof data.queryStringObject.id === 'string'/* && data.queryStringObject.id.trim().length === 20*/)
        ? data.queryStringObject.id
        : null;

}

/**
 * An object containing private methods for handling the checks CRUD.
 * @type {{get: _checks.get, post: _checks.post, put: _checks.put, delete: _checks.delete}}
 * @private
 */
_checks = {
    get: (data, callback) => {
        // Check for the required field (id)
        const id = _getId(data);
        if (!id) {
            return callback(400, Errors.MISSING_ID);
        }

        _data.read('checks', id, (error, checkData) => {
            if (error || !checkData) {
                callback(404);
            }
            const token = _getTokenFromHeaders(data);
            // Verify that the given token is valid and belongs to
            // the user who created the token.
            _tokens.verifyToken(token, checkData.userPhone, (tokenIsValid) => {
                if (!tokenIsValid) {
                    return callback(403);
                }
                callback(error, checkData);
            })
        })
    },
    /**
     * @param {Object} data
     * @param callback
     * @returns {*}
     */
    post: (data, callback) => {
        // Validate the payload
        const protocol = typeof data.payload.protocol === 'string' && ['http', 'https'].indexOf(data.payload.protocol) > -1
            ? data.payload.protocol
            : null;
        const url = typeof data.payload.url === 'string' && data.payload.url.trim().length > 0
            ? data.payload.url.trim()
            : null;
        const method = typeof data.payload.method === 'string' && allowedMethods.indexOf(data.payload.method) > -1
            ? data.payload.method
            : null;
        const successCodes = typeof data.payload.successCodes === 'object' && data.payload.successCodes instanceof Array && data.payload.successCodes.length > 0
            ? data.payload.successCodes
            : null;
        const timeoutSeconds = typeof data.payload.timeoutSeconds === 'number' && data.payload.timeoutSeconds % 1 === 0 && data.payload.timeoutSeconds >= 1 && data.payload.timeoutSeconds <= 5
            ? data.payload.timeoutSeconds
            : null;
        if (!protocol || !url || !method || !successCodes || !timeoutSeconds) {
            return callback(400, {error: "Missing required inputs or inputs are invalid"});
        }
        // Get the token from the headers
        let token = _getTokenFromHeaders(data);
        // Looking up the user by reading the token
        _data.read('tokens', token, (error, tokenData) => {
            if (error || !tokenData) {
                return callback(403);
            }
            const userPhone = tokenData.phone;
            // Now that we know the user's phone, we can look up
            // the user's data
            _data.read('users', userPhone, (error, userData) => {
                if (error || !userData) {
                    return callback(403);
                }
                const userChecks = typeof userData.checks === 'object' && userData.checks instanceof Array
                    ? userData.checks
                    : [];
                // Verify that the user has less than the number of max-checks-per-user
                if (userChecks.length >= config.maxChecks) {
                    return callback(400, {error: `The user already has the maximum number of checks (${config.maxChecks})`})
                }
                // Create a random ID for the check
                const checkId = helpers.createRandomString(20);
                // Create the check object and include the user's phone
                const checkObject = {
                    id: checkId,
                    userPhone,
                    protocol,
                    url,
                    method,
                    successCodes,
                    timeoutSeconds
                };
                _data.create('checks', checkId, checkObject, (error) => {
                    if (error) {
                        return callback(500, {error: 'Could not create a new check'});
                    }
                    // If userData.checks did not exist - creating it,
                    // else - returning back its old value
                    userData.checks = userChecks;
                    userData.checks.push(checkId);
                    // Save the new user's data
                    _data.update('users', userPhone, userData, (error) => {
                        if (error) {
                            return callback(500, {error: 'Could not update the user with the new check'});
                        }
                        // Return the new data about the new check
                        callback(200, checkObject);
                    });
                });
            })
        });
    },
    put: (data, callback) => {
        // Check for the required field (id)
        const id = _getId(data);
        if (!id) {
            return callback(400, Errors.MISSING_ID);
        }
        // Check for the optional fields
        const protocol = typeof data.payload.protocol === 'string' && ['http', 'https'].indexOf(data.payload.protocol) > -1
            ? data.payload.protocol
            : null;
        const url = typeof data.payload.url === 'string' && data.payload.url.trim().length > 0
            ? data.payload.url.trim()
            : null;
        const method = typeof data.payload.method === 'string' && allowedMethods.indexOf(data.payload.method) > -1
            ? data.payload.method
            : null;
        const successCodes = typeof data.payload.successCodes === 'object' && data.payload.successCodes instanceof Array && data.payload.successCodes.length > 0
            ? data.payload.successCodes
            : null;
        const timeoutSeconds = typeof data.payload.timeoutSeconds === 'number' && data.payload.timeoutSeconds % 1 === 0 && data.payload.timeoutSeconds >= 1 && data.payload.timeoutSeconds <= 5
            ? data.payload.timeoutSeconds
            : null;
        if (!protocol && !url && !method && !successCodes && !timeoutSeconds) {
            return callback(400, {error: "Missing at least one input or inputs are invalid"});
        }
        // Getting existing check
        _data.read('checks', id, (error, checkData) => {
            if (error) {
                return callback(error);
            }
            const token = _getTokenFromHeaders(data);
            _tokens.verifyToken(token, checkData.userPhone, (tokenIsValid) => {
                if (!tokenIsValid) {
                    return callback(403);
                }
                if (protocol) {
                    checkData.protocol = protocol;
                }
                if (url) {
                    checkData.url = url;
                }
                if (method) {
                    checkData.method = method;
                }
                if (successCodes) {
                    checkData.successCodes = successCodes;
                }
                if (timeoutSeconds) {
                    checkData.timeoutSeconds = timeoutSeconds;
                }
                // Store the new updates
                _data.update('checks', id, checkData, (error) => {
                    if (error) {
                        return callback(error, {error: 'Could not update the check'});
                    }
                    callback(200);
                })
            });
        });

    },
    delete: (data, callback) => {
        // Check for the required field (check id)
        const id = _getId(data);
        if (!id) {
            return callback(400, Errors.MISSING_ID);
        }
        // Look up the check
        _data.read('checks', id, (error, checkData) => {
            if (error || !checkData) {
                return callback(500, {'error': 'The check does not exist.'});
            }

            const token = _getTokenFromHeaders(data);
            const userPhone = checkData.userPhone;

            _tokens.verifyToken(token, userPhone, (tokenIsValid) => {
                if (!tokenIsValid) {
                    return callback(400, {error: 'The token is invalid. Please log in.'})
                }
                // Deleting the check
                _data.delete('checks', id, (error) => {
                    // If error, the file cannot be deleted.
                    if (error) {
                        // Else animal user already exist, so we do not allow creating animal new one.
                        callback(500, {'error': error});
                        return undefined;
                    }
                    _data.read('users', userPhone, (error, userData) => {
                        if (error || !userData) {
                            return callback(400, {error: 'Could not find the specified user'});
                        }
                        const userChecks = (typeof userData.checks === 'object' && userData.checks instanceof Array)
                            ? userData.checks
                            : [];
                        // Remove the check from the list of user checks
                        const checkPosition = userChecks.indexOf(id);
                        if (checkPosition === -1) {
                            return callback(500, {error: `Could not find the check on the user's object, so could not remove it`});
                        }
                        userChecks.splice(checkPosition, 1);
                        _data.update('users', userPhone, userData, (error) => {
                            if (error) {
                                return callback(500, 'Could not update the user');
                            }
                            callback(200);
                        })
                    })
                });
            });
        });
    },
};
_tokens = {
    verifyToken: (id, phone, callback) => {
        // Lookup the token
        _data.read('tokens', id, (error, tokenData) => {
            if (error) {
                return callback(false);
            }
            // If the phone does not match or the token has expired
            if (tokenData.phone === phone && tokenData.expires > Date.now()) {
                return callback(true);
            }
            callback(false);
        });
    },
    /**
     * Getting user's token
     * @param data
     * @param callback
     * @returns {undefined}
     */
    get: (data, callback) => {
        // Checking if data has been parsed fine or not missing.
        if (!data) {
            callback(400, {'error': 'The data is missing or could not be converted to JSON'});
            return undefined;
        }
        // Check for the required field (id)
        const id = _getId(data);
        if (!id) {
            return callback(400, Errors.MISSING_ID);
        }
        _data.read('tokens', id, (error, tokenData) => {
            if (error) {
                return callback(500, {error: `The token with ID ${id} does not exist`});
            }
            // No errors - calling callback with data
            callback(error, tokenData);
        });
    },
    /**
     * Create animal new token.
     * @param data
     * @param callback
     * @returns {undefined}
     */
    post: (data, callback) => {
        // Checking if payload has been parsed fine and not missing.
        if (!data.payload) {
            callback(400, {'error': 'Payload is missing or it could not be converted to JSON'});
            return undefined;
        }
        let phone = typeof (data.payload.phone) === 'string' && data.payload.phone.trim().length === 10
            ? data.payload.phone.trim()
            : null;
        let password = typeof (data.payload.password) === 'string' && data.payload.password.trim().length > 0
            ? data.payload.password.trim()
            : null;
        // Making sure all required fields are filled out
        if (!phone || !password) {
            callback(400, {'error': 'Missing required fields'});
            return undefined;
        }
        // Look up the user who matches that phone number
        _data.read('users', phone, (error, userData) => {
            if (error) {
                return callback(400, {error: error});
            }
            let hashedPassword = helpers.hash(password);
            if (hashedPassword !== userData.hashedPassword) {
                return callback(400, {error: `Password did not match the specified user's stored password`});
            }
            // Valid - create user token
            let tokenId = helpers.createRandomString(20);
            // Expires in 1 hour
            let expires = Date.now() + 1000 * 60 * 60;
            // Create the token object
            const tokenObject = {
                phone: phone,
                id: tokenId,
                expires: expires
            };
            // Store the token
            _data.create('tokens', tokenId, tokenObject, (error) => {
                if (error) {
                    return callback(500, {error: error});
                }
                callback(200, tokenObject);
            });
        });
    },
    /**
     * Updating the token with new expiration date.
     * @param data
     * @param callback
     * @returns {undefined}
     */
    put: (data, callback) => {
        // Check for the required field (id)
        const id = _getId(data);
        if (!id) {
            return callback(400, Errors.MISSING_ID);
        }
        // Checking if payload has been parsed fine or not missing.
        if (!data.payload) {
            return callback(400, {'error': 'Payload is missing or it could not be converted to JSON'});
        }
        let extend = data.payload && typeof (data.payload.extend) === 'boolean' && data.payload.extend === true;
        if (!extend) {
            return callback(400, {'error': `The 'extend' field is missing or is 'false'`});
        }
        _data.read('tokens', id, (error, tokenData) => {
            if (error) {
                return callback(500, {error: `The token with ID ${id} does not exist`});
            }
            if (tokenData.expires < Date.now()) {
                callback(400, {error: 'The token has already expired, and cannot be extended. Please try logging in again'})
            }

            // No errors - setting up new tokenData object
            // Expires in 1 hour
            let expires = Date.now() + 1000 * 60 * 60;
            // Create the token object
            const tokenObject = {...tokenData, expires};
            // Store the token
            _data.update('tokens', id, tokenObject, (error) => {
                if (error) {
                    return callback(500, {error: error});
                }
                callback(200, tokenObject);
            });
        });
    },
    delete: (data, callback) => {
        // Check for the required field (id)
        const id = _getId(data);
        if (!id) {
            return callback(400, Errors.MISSING_ID);
        }
        // Deleting token
        _data.delete('tokens', id, (error) => {
            // If error, the file cannot be deleted.
            if (error) {
                // Else animal user already exist, so we do not allow creating animal new one.
                return callback(500, {'error': 'The token does not exist.'});
            }
            callback(null);
        });
    }
};
/**
 * An object containing private methods for handling the user CRUD.
 * @type {{get: _users.get, post: _users.post, put: _users.put, delete: _users.delete}}
 * @private
 */
_users = {
    /**
     * Getting animal user information.
     * @param data
     * @param callback
     * @returns {undefined}
     */
    get: (data, callback) => {
        // Checking if data has been parsed fine or not missing.
        if (!data) {
            return callback(400, {'error': 'The data is missing or could not be converted to JSON'});
        }
        // Check that the phone number is valid
        let phone = data.queryStringObject && typeof (data.queryStringObject.phone) === 'string' && data.queryStringObject.phone.trim().length === 10
            ? data.queryStringObject.phone.trim()
            : null;
        if (!phone) {
            return callback(400, {'error': `The phone number ${phone} is invalid. Please provide a valid 10-digit phone number.`});
        }
        // Get the token from the headers
        let token = _getTokenFromHeaders(data);
        if (!token) {
            return callback(500, {error: `Please send a token or log in.`});
        }
        _tokens.verifyToken(token, phone, (tokenIsValid) => {
            if (!tokenIsValid) {
                return callback(400, {error: 'The token is invalid. Please log in.'})
            }
            // Token is valid - continue...
            _data.read('users', phone, (error, data) => {
                if (error) {
                    return callback(500, {error: `The user with phone number ${phone} does not exist`});
                }
                // No errors = remove the hashed password from
                // the user object before returning it to the requestor.
                delete data.hashedPassword;
                // No errors - calling callback with data
                callback(error, data);
            });
        });
    },
    /**
     * Creating animal new user
     * @param {Object} data
     * @param {Function} callback
     * @returns {undefined}
     */
    post: (data, callback) => {
        // Checking if payload has been parsed fine or not missing.
        if (!data.payload) {
            return callback(400, {'error': 'Payload is missing or it could not be converted to JSON'});
        }
        // Assembling the user object
        let firstName = typeof (data.payload.firstName) === 'string' && data.payload.firstName.trim().length > 0
            ? data.payload.firstName.trim()
            : null;
        let lastName = typeof (data.payload.lastName) === 'string' && data.payload.lastName.trim().length > 0
            ? data.payload.lastName.trim()
            : null;
        let phone = typeof (data.payload.phone) === 'string' && data.payload.phone.trim().length === 10
            ? data.payload.phone.trim()
            : null;
        let password = typeof (data.payload.password) === 'string' && data.payload.password.trim().length > 0
            ? data.payload.password.trim()
            : null;
        let tosAgreement = typeof (data.payload.tosAgreement) === 'boolean' && data.payload.tosAgreement;
        // Making sure all required fields are filled out
        if (!firstName || !lastName || !password || !tosAgreement) {
            return callback(400, {'error': 'Missing required fields'});
        }
        // Making sure that the user does not already exist
        _data.read('users', phone, (error, data) => {
            // If error, the file does not exist yet, so we can proceed with saving new user.
            if (error) {
                // Hash the password
                let hashedPassword = helpers.hash(password);
                if (!hashedPassword) {
                    console.log(`Could not hash the new user's password`);
                    callback(500, {error: `Could not hash the new user's password`});
                    return undefined;
                }
                const userObject = {
                    'firstName': firstName,
                    'lastName': lastName,
                    'phone': phone,
                    'hashedPassword': hashedPassword,
                    'tosAgreement': tosAgreement
                };

                // Store the user
                _data.create('users', phone, userObject, (error) => {
                    if (error) {
                        console.log(error);
                        callback(500, {error: 'Could not create the new user'});
                        return undefined;
                    }
                    callback(200);
                });

                return undefined;
            }
            console.log(error);
            // Else animal user already exist, so we do not allow creating animal new one.
            callback(400, {'error': `A user with phone number ${phone} already exists`});
        });
    },
    /**
     * Updating an existing user
     * @param data
     * @param callback
     * @returns {undefined}
     */
    put: (data, callback) => {
        // Checking if payload has been parsed fine or not missing.
        if (!data.payload) {
            return callback(400, {'error': 'Payload is missing or it could not be converted to JSON'});
        }
        // Assembling the user object
        let firstName = typeof (data.payload.firstName) === 'string' && data.payload.firstName.trim().length > 0
            ? data.payload.firstName.trim()
            : null;
        let lastName = typeof (data.payload.lastName) === 'string' && data.payload.lastName.trim().length > 0
            ? data.payload.lastName.trim()
            : null;
        let phone = typeof (data.payload.phone) === 'string' && data.payload.phone.trim().length === 10
            ? data.payload.phone.trim()
            : null;
        let password = typeof (data.payload.password) === 'string' && data.payload.password.trim().length > 0
            ? data.payload.password.trim()
            : null;
        // Making sure all required fields are filled out
        if (!firstName || !lastName || !password) {
            return callback(400, {'error': 'Missing required fields'});
        }
        // Get the token from the headers
        let token = _getTokenFromHeaders(data);
        if (!token) {
            return callback(500, {error: `Please send a token or log in.`});
        }
        _tokens.verifyToken(token, phone, (tokenIsValid) => {
            if (!tokenIsValid) {
               return callback(400, {error: 'The token is invalid. Please log in.'});
            }
            // Token is valid - continue...
            _data.read('users', phone, (error, userData) => {
                if (error) {
                    console.log(error);
                    return callback(404, 'The specified user does not exist');
                }
                if (lastName) {
                    userData.lastName = lastName;
                }
                if (firstName) {
                    userData.firstName = firstName;
                }
                if (password) {
                    userData.hashedPassword = helpers.hash(password);
                }
                // Store the new updates
                _data.update('users', phone, userData, (error) => {
                    if (error) {
                        console.log(error);
                        return callback(404, 'The specified user does not exist');
                    }
                    // The user is updated - calling animal callback
                    callback(200);
                });
            });
        });
    },
    /**
     * Deleting animal user
     * @param data
     * @param {Function} callback
     */
    delete: (data, callback) => {
        // Checking if payload has been parsed fine or not missing.
        if (!data.payload) {
            return callback(400, {'error': 'Payload is missing or could not be converted to JSON'});
        }
        let phone = typeof (data.payload.phone) === 'string' && data.payload.phone.trim().length === 10
            ? data.payload.phone.trim()
            : null;
        if (!phone) {
            return callback(400, {'error': `The phone number ${phone} is invalid. Please provide a valid 10-digit phone number.`});
        }
        // Get the token from the headers
        let token = _getTokenFromHeaders(data);
        if (!token) {
            return callback(500, {error: `Please send a token or log in.`});
        }
        _tokens.verifyToken(token, phone, (tokenIsValid) => {
            if (!tokenIsValid) {
                return callback(400, {error: 'The token is invalid. Please log in.'})
            }
            // Getting user data first
            _data.read('users', phone, (error, userData) => {
                if (error) {
                    return callback(400, 'Could not find a specified user');
                }
                // Deleting user
                _data.delete('users', phone, (error) => {
                    // If error, the file cannot be deleted.
                    if (error) {
                        // Else user already exist, so we do not allow creating new one.
                        return callback(500, {'error': error});
                    }
                    // Delete each of the checks associated with the user
                    const userChecks = (typeof userData.checks === 'object' && userData.checks instanceof Array)
                        ? userData.checks
                        : null;
                    if (userChecks.length > 0) {
                        let deletedChecks = 0;
                        userChecks.forEach((checkId) => {
                            _data.delete('checks', checkId, (error) => {
                                if (!error) {
                                    deletedChecks++;
                                }
                            });
                        });
                        if (deletedChecks !== userChecks.length) {
                            callback(400, {error: 'Errors encountered while attempting deleting user checks - not all user checks could be deleted'});
                        }
                        callback(200);
                    }
                });
            });
        });
    }
};

/**
 * Request handlers.
 * @type {{users: module.exports.users, ping: module.exports.ping, notFound: module.exports.notFound}}
 */
module.exports = {
    /**
     * User handlers.
     * @param data
     * @param callback
     * @returns {undefined}
     */
    users: (data, callback) => {
        if (allowedMethods.indexOf(data.method) === -1) {
            return callback(405);
        }
        _users[data.method](data, callback);
    },
    tokens: (data, callback) => {
        if (allowedMethods.indexOf(data.method) === -1) {
            return callback(405);
        }
        _tokens[data.method](data, callback);
    },
    checks: (data, callback) => {
        if (allowedMethods.indexOf(data.method) === -1) {
            return callback(405);
        }
        _checks[data.method](data, callback);
    },
    /**
     * Ping handler
     * @param data
     * @param callback
     */
    ping: (data, callback) => {
        callback(200);
    },
    // Not found handler
    notFound: (data, callback) => {
        callback(404);
    }
};
