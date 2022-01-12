// test the app:
var expect = require('chai').expect;
var should = require('chai').should();
const { describe, it } = require('mocha');
const util = require("util");
var exec = util.promisify(require("child_process").exec);

var run = function(args) {
    try {
        const _args = ["wallpreview.js"];
        return exec(`node ${_args.concat(args).join(" ")}`);
    } catch (error) {
        throw error;
    }
};

describe('Test app', function() {
    it(`should work with params ['--version']`, async() => {
        const result = await run(['--version']);
        result.stdout.should.equal("1.0.0\n");
    });
});