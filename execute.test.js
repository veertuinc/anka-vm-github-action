let execute = require('./execute');

describe('execute functions', () => {
  
  let options = "{ silent: true }"
  describe('nodeCommands', () => {
    test('basic', async() => {
      await execute.nodeCommands("echo 123",options)
      await expect(`${execute.STD.trim()}`).toBe("123");
    });
    test('fail with single quotes', async() => {
      await expect(
        execute.nodeCommands("echo 123","{ cwd: './' }")
      ).rejects.toThrowError(/inside of a string/)
    });
    test('basic multi', async() => {
      await execute.nodeCommands("echo 456",options)
      await execute.nodeCommands("echo 789",options,execute.STD)
      await expect(`${execute.STD.trim()}`).toBe("456\n789");
    });
    test('basic newlines', async() => {
      await execute.nodeCommands(`
      touch /tmp/test
      ls -laht ./
      ls -laht ../
      pwd
      echo "HERE" && \
      echo "THERE HERE WHERE"
      `,options)
      await expect(`${execute.STD}`).toMatch(`total `);
      await expect(`${execute.STD}`).toMatch(`HERE\nTHERE `);
    });
    test('chained commands and redirection to file', async() => {
      await execute.nodeCommands("hostname && echo \"test1\" && echo \"Test2\" > /tmp/test && cat /tmp/test",options)
      await expect(`${execute.STD}`).toMatch(`\ntest1\nTest2`);
    });
    test('chained commands and redirection to file', async() => {
      await execute.nodeCommands("hostname && echo \"test1\" && echo \"Test2\" > /tmp/test && cat /tmp/test",options)
      await expect(`${execute.STD}`).toMatch(`\ntest1\nTest2`);
    });
    test('script execution with args', async() => {
      await execute.nodeCommands("hostname && ./.github/workflows/test.bash 1 2 3 4",options)
      await expect(`${execute.STD}`).toMatch(`\n1\n2\n3 4`);
    });
    test('script execution with args', async() => {
      await execute.nodeCommands("hostname && ./.github/workflows/test.bash 1 2 3 4",options)
      await expect(`${execute.STD}`).toMatch(`\n1\n2\n3 4`);
    });
    describe('options', () => {
      test('silent (js object)', async() => {
        await execute.nodeCommands("echo 123","{silent: false}",options)
        await expect(execute.finalHostCommandOptions.silent).toBe(false);
      });
      test('cwd does not exist (js object)', async() => {
        await expect(
          execute.nodeCommands("echo 123","{silent: true, cwd: \"./doesnotexist\"}",options)
        ).rejects.toEqual(new Error('cannot find ./doesnotexist'))
      });
      test('cwd (js object)', async() => {
        await execute.nodeCommands("ls","{cwd: \"./dist\"}")
        await expect(`${execute.STD.trim()}`).toBe("index.js");
      });
      test('json (json)', async() => {
        await execute.nodeCommands("ls","{\"cwd\": \"./dist\"}")
        await expect(`${execute.STD.trim()}`).toBe("index.js");
      });
    });
  });
});