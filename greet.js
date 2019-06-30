"use strict";

const EventEmitter = require('events');

module.exports = class Greetr extends EventEmitter {
    constructor() {
        super();
        this.greeting = 'Hello world from Greetr!';
    }

    greet(data) {
        console.log(`${this.greeting}: ${data}`);
        this.emit('greet', data);
    }
}
