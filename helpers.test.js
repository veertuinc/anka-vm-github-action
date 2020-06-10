let helpers = require('./helpers');

describe('helper functions', () => {
  describe('getVMLabel', () => {
    test('default (no argument)', async() => {
      expect(await helpers.getVMLabel()).toBe('github-actions-\${GITHUB_REPOSITORY}-\${GITHUB_RUN_NUMBER}-\${GITHUB_JOB}-\${GITHUB_ACTION}')
    }); // TEST
    test('custom', async() => {
      expect(await helpers.getVMLabel("build-vms")).toMatch(/build-vms-\d+/)
    }); // TEST
  }); // DESCRIBE
  describe('turnStringIntoObject', () => {
    test('no args', async() => {
      expect(await helpers.turnStringIntoObject()).toEqual({})
    }); // TEST
    test('hostCommandOptions: populated (string)', async() => {
      expect(await helpers.turnStringIntoObject("{ silent: true, cwd: \"/tmp\"}")).toEqual({silent: true, cwd: "/tmp"})
    }); // TEST
    test('hostCommandOptions: populated (single quotes ERROR)', async() => {
      await expect(
       helpers.turnStringIntoObject("{ silent: true, cwd: '/tmp'}")
      ).rejects.toThrowError(/inside of a string/)
    }); // TEST
    test('hostCommandOptions (string), options (object)', async() => {
        expect(await helpers.turnStringIntoObject("{ cwd: \"/tmp\" }",{silent: true})).toEqual({silent: true, cwd: "/tmp"})
    }); // TEST
    test('hostCommandOptions (undefined), options (object)', async() => {
      expect(await helpers.turnStringIntoObject(undefined,{silent: true})).toEqual({silent: true})
    }); // TEST
    test('hostCommandOptions (object), options (object)', async() => {
      expect(await helpers.turnStringIntoObject({silent:false},{silent: true})).toEqual({silent: false})
    }); // TEST
    test('hostCommandOptions (object), options (undefined)', async() => {
      expect(await helpers.turnStringIntoObject({silent:false},undefined)).toEqual({silent: false})
    }); // TEST
  }); // DESCRIBE
});