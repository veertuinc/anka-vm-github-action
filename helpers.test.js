let helpers = require('./helpers');
const core = require('@actions/core');

describe('helper functions', () => {
  describe('getVMLabel', () => {
    afterEach(() => {
      core.exportVariable('GITHUB_REPOSITORY', undefined)
      core.exportVariable('GITHUB_RUN_NUMBER', undefined);
      core.exportVariable('GITHUB_JOB', undefined);
      core.exportVariable('GITHUB_ACTION', undefined);
    });
    test('default (no argument)', async() => {
      core.exportVariable('GITHUB_REPOSITORY', 'veertuinc/anka-vm-github-action');
      core.exportVariable('GITHUB_RUN_NUMBER', '102');
      core.exportVariable('GITHUB_JOB', 'functional-tests');
      core.exportVariable('GITHUB_ACTION', 'self2');
      expect(await helpers.getVMLabel()).toBe('github-actions-veertuinc/anka-vm-github-action-102-functional-tests-self2')
      expect(process.env["self2_vmLabel"]).toBe('github-actions-veertuinc/anka-vm-github-action-102-functional-tests-self2')
    }); // TEST
    test('custom', async() => {
      core.exportVariable('GITHUB_REPOSITORY', 'veertuinc/anka-vm-github-action');
      core.exportVariable('GITHUB_RUN_NUMBER', '102');
      core.exportVariable('GITHUB_JOB', 'functional-tests');
      core.exportVariable('GITHUB_ACTION', 'self3');
      expect(await helpers.getVMLabel("build-vms")).toMatch(/build-vms-\d+/)
      expect(process.env["self3_vmLabel"]).toMatch(/build-vms-\d+/)
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