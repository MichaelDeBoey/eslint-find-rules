const assert = require('assert');
const proxyquire = require('proxyquire');
const sinon = require('sinon');

const consoleLog = console.log; // eslint-disable-line no-console
const processExit = process.exit;

const getCurrentRules = sinon.stub().returns(['current', 'rules']);
const getPluginRules = sinon.stub().returns(['plugin', 'rules']);
const getAllAvailableRules = sinon.stub().returns(['all', 'available']);
const getUnusedRules = sinon.stub().returns(['unused', 'rules']);
const getDeprecatedRules = sinon.stub().returns(['deprecated', 'rules']);

let stub;
let exitStatus;

describe('bin', () => {
  beforeEach(() => {
    stub = {
      async '../lib/rule-finder'() {
        return {
          getCurrentRules,
          getPluginRules,
          getAllAvailableRules,
          getUnusedRules,
          getDeprecatedRules
        };
      }
    };

    console.log = (...args) => { // eslint-disable-line no-console
      if (args[0].match(/(current|plugin|all-available|unused|deprecated|rules found)/)) {
        return;
      }
      consoleLog(...args);
    };
    exitStatus = null;
    process.exit = status => {
      exitStatus = status;
    };
    process.argv = process.argv.slice(0, 2);
  });

  afterEach(() => {
    console.log = consoleLog; // eslint-disable-line no-console
    process.exit = processExit;
    // Purge yargs cache
    delete require.cache[require.resolve('yargs')];
  });

  it('no option', async () => {
    let callCount = 0;
    console.log = (...args) => { // eslint-disable-line no-console
      callCount += 1;
      if (args[0].match(
        /(no option provided, please provide a valid option|usage:|eslint-find-rules \[option] <file> \[flag])/)
      ) {
        return;
      }
      consoleLog(...args);
    };
    await proxyquire('../../src/bin/find', stub);
    assert.equal(callCount, 3); // eslint-disable-line no-console
  });

  it('option -c|--current', async () => {
    process.argv[2] = '-c';
    await proxyquire('../../src/bin/find', stub);
    assert.ok(getCurrentRules.called);
    assert.equal(exitStatus, 0);
  });

  it('option -p|--plugin', async () => {
    process.argv[2] = '-p';
    await proxyquire('../../src/bin/find', stub);
    assert.ok(getPluginRules.called);
    assert.equal(exitStatus, 0);
  });

  it('option -a|--all-available', async () => {
    process.argv[2] = '-a';
    await proxyquire('../../src/bin/find', stub);
    assert.ok(getAllAvailableRules.called);
    process.argv[2] = '--all-available';
    await proxyquire('../../src/bin/find', stub);
    assert.ok(getAllAvailableRules.called);
    assert.equal(exitStatus, 0);
  });

  it('option -a along with --ext', async () => {
    process.argv[2] = '-a';
    process.argv[3] = '--ext .json';
    await proxyquire('../../src/bin/find', stub);
    assert.ok(getAllAvailableRules.called);
    assert.equal(exitStatus, 0);
  });

  it('option -a along with multi --ext', async () => {
    process.argv[2] = '-a';
    process.argv[3] = '--ext .js';
    process.argv[4] = '--ext .json';
    await proxyquire('../../src/bin/find', stub);
    assert.ok(getAllAvailableRules.called);
    assert.equal(exitStatus, 0);
  });

  it('option -u|--unused', async () => {
    process.argv[2] = '-u';
    await proxyquire('../../src/bin/find', stub);
    assert.ok(getUnusedRules.called);
    assert.equal(exitStatus, 1);
  });

  it('options -u|--unused and no unused rules found', async () => {
    getUnusedRules.returns([]);
    process.argv[2] = '-u';
    await proxyquire('../../src/bin/find', stub);
    assert.ok(getUnusedRules.called);
    assert.equal(exitStatus, 0);
  });

  it('option -u|--unused along with -n', async () => {
    process.argv[2] = '-u';
    process.argv[3] = '-n';
    await proxyquire('../../src/bin/find', stub);
    assert.ok(getUnusedRules.called);
    assert.equal(exitStatus, 0);
  });

  it('option -u|--unused along with --no-error', async () => {
    process.argv[2] = '-u';
    process.argv[3] = '--no-error';
    await proxyquire('../../src/bin/find', stub);
    assert.ok(getUnusedRules.called);
    assert.equal(exitStatus, 0);
  });

  it('option -d|--deprecated', async () => {
    process.argv[2] = '-d';
    await proxyquire('../../src/bin/find', stub);
    assert.ok(getDeprecatedRules.called);
    assert.equal(exitStatus, 1);
  });

  it('options -d|--deprecated and no deprecated rules found', async () => {
    getDeprecatedRules.returns([]);
    process.argv[2] = '-d';
    await proxyquire('../../src/bin/find', stub);
    assert.ok(getDeprecatedRules.called);
    assert.equal(exitStatus, 0);
  });

  it('option -d|--deprecated along with -n', async () => {
    process.argv[2] = '-d';
    process.argv[3] = '-n';
    await proxyquire('../../src/bin/find', stub);
    assert.ok(getDeprecatedRules.called);
    assert.equal(exitStatus, 0);
  });

  it('option -d|--deprecated along with --no-error', async () => {
    process.argv[2] = '-d';
    process.argv[3] = '--no-error';
    await proxyquire('../../src/bin/find', stub);
    assert.ok(getDeprecatedRules.called);
    assert.equal(exitStatus, 0);
  });

  it('logs verbosely', async () => {
    process.argv[2] = '-c';
    process.argv[3] = '-v';
    await proxyquire('../../src/bin/find', stub);
    assert.ok(getCurrentRules.called);
  });

  it('logs core rules', async () => {
    stub = {
      async '../lib/rule-finder'(specifiedFile, options) {
        return {
          getCurrentRules() {
            assert(!options.omitCore);
            return ['current', 'rules'];
          }
        };
      }
    };
    process.argv[2] = '-c';
    await proxyquire('../../src/bin/find', stub);
  });

  it('does not log core rules with --no-core', async () => {
    stub = {
      async '../lib/rule-finder'(specifiedFile, options) {
        return {
          getCurrentRules() {
            assert(options.omitCore);
            return ['current', 'rules'];
          }
        };
      }
    };
    process.argv[2] = '-c';
    process.argv[3] = '--no-core';
    await proxyquire('../../src/bin/find', stub);
  });

  it('does not include deprecated rules by default', async () => {
    stub = {
      async '../lib/rule-finder'(specifiedFile, options) {
        return {
          getAllAvailableRules() {
            assert(!options.includeDeprecated);
            return ['current', 'rules'];
          }
        };
      }
    };
    process.argv[2] = '-a';
    await proxyquire('../../src/bin/find', stub);
  });

  it('includes deprecated rules with --include deprecated', async () => {
    stub = {
      async '../lib/rule-finder'(specifiedFile, options) {
        return {
          getAllAvailableRules() {
            assert(options.includeDeprecated);
            return ['current', 'rules'];
          }
        };
      }
    };
    process.argv[2] = '-a';
    process.argv[3] = '--include=deprecated';
    await proxyquire('../../src/bin/find', stub);
  });

  it('includes deprecated rules with -i deprecated', async () => {
    stub = {
      async '../lib/rule-finder'(specifiedFile, options) {
        return {
          getAllAvailableRules() {
            assert(options.includeDeprecated);
            return ['current', 'rules'];
          }
        };
      }
    };
    process.argv[2] = '-a';
    process.argv[3] = '-i';
    process.argv[4] = 'deprecated';
    await proxyquire('../../src/bin/find', stub);
  });
});
