// Dependencies
const fs = require('fs');
const path = require('path');
const helpers = require('./helpers');

/**
 * A library for data CRUD.
 * @type {{baseDir, create, read, update, delete}}
 */
const lib = {};

// Base directory of the data folder
lib.baseDir = path.join(`${__dirname}/../.data`);

/**
 * Create a new file with the data
 * @param dir
 * @param file
 * @param data
 * @param callback
 */
lib.create = (dir, file, data, callback) => {
	// Open the file for writing
	fs.open(`${lib.baseDir}/${dir}/${file}.json`, 'wx', (error, fileDescriptor) => {
		if (error || !fileDescriptor) {
		    return callback('Could not create new file, it may already exist or you provided the wrong path');
		}
		// Convert data to string
		let stringData = JSON.stringify(data);
		// Write to file and close it
		fs.writeFile(fileDescriptor, stringData, (error) => {
			if (error) {
			    return callback(`Error writing to new file ${file}.json`);
			}
			fs.close(fileDescriptor, (error) => {
				if (error) {
					return callback(`Error closing the file ${file}.json`);
				}
				callback(null);
			});
		});
	});
};

/**
 * Read data from a file
 * @param dir
 * @param file
 * @param callback
 */
lib.read = (dir, file, callback) => {
	fs.readFile(`${lib.baseDir}/${dir}/${file}.json`, 'utf8', (error, data) => {
		if (error) {
		    return callback('Could not read data from file');
		}
		let parsedData = helpers.parseJson(data);
		callback(null, parsedData);
	});
};

/**
 * Update the data inside the file
 * @param dir
 * @param file
 * @param data
 * @param callback
 */
lib.update = (dir, file, data, callback) => {
	// Open the file for appending
	fs.open(`${lib.baseDir}/${dir}/${file}.json`, 'r+', (error, fileDescriptor) => {
		if (error) {
		    return callback(`Could not open file ${file}.json for updating - it or the passed directory may not exist yet.`);
		}
		fs.truncate(fileDescriptor, (error) => {
			if (error) {
				return callback(`Could not truncate the file ${file}.json`);
			}
			const dataString = JSON.stringify(data);
			fs.writeFile(fileDescriptor, dataString, (error) => {
				if (error) {
					return callback(`Could not write to the file ${file}.json`);
				}
				fs.close(fileDescriptor, (error) => {
					if (error) {
						return callback(`Error closing file ${file}.json`);
					}
					callback(null, data);
				});
			});
		});
	});
};

/**
 * Delete animal file.
 * @param dir
 * @param file
 * @param callback
 */
lib.delete = (dir, file, callback) => {
	// Unlink the file
	fs.unlink(`${lib.baseDir}/${dir}/${file}.json`, (error) => {
		if (error) {
		    return callback(`Could not delete the file ${file}.json`);
		}

		callback(null);
	});
};

module.exports = lib;
