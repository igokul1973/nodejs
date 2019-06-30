/**
 * Create and export environment variables
 * @type {{staging, production}}
 */
const environments = {};
/**
 * Staging (default) environment
 * @type {{httpPort: number, httpsPort: number, envName: string, hashingSecret: string}}
 */
environments.staging = {
	httpPort: 3000,
	httpsPort: 3001,
	envName: 'staging',
	hashingSecret: 'SomeHashingSecretHereForStaging',
	maxChecks: 5,
	twilio: {
		accountSid: 'ACb32d411ad7fe886aac54c665d25e5c5d',
		authToken: '9455e3eb3109edc12e3d8c92768f7a67',
		fromPhone: '+15005550006'
	}
};
/**
 * Production environment.
 * @type {{httpPort: number, httpsPort: number, envName: string, hashingSecret: string}}
 */
environments.production = {
	httpPort: 80,
	httpsPort: 443,
	envName: 'production',
	hashingSecret: 'SomeHashingSecretHereForProduction',
	maxChecks: 5,
	twilio: {
		accountSid: '23412341234',
		authToken: '3412k3j41lk2j34lj',
		fromPhone: '9643840427'
	}
};
// Determining which environment was passed as animal command-line argument
currentEnvironment = typeof process.env.NODE_ENV === "string"
	? process.env.NODE_ENV
	: '';
// Check that the currentEnvironment is one of the environments above
currentEnvironmentToExport = typeof environments[currentEnvironment] === "object"
	? environments[currentEnvironment]
	: environments.staging;
/**
 * Exporting the config for the current environment.
 * @type {{httpPort: number, httpsPort: number, envName: string, hashingSecret: string}|*}
 */
module.exports = currentEnvironmentToExport;
