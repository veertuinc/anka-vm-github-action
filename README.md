## Using the (BETA) Anka GitHub Action

1. Install the [Anka Virtualization CLI](https://github.com/veertuinc/getting-started#initial-setup) onto a macOS host machine. You'll need a [Template and Tag](https://github.com/veertuinc/getting-started#create-templatebash) generated.
1. Install and ensure you have registered a shared (org level; found under org settings/actions) _or_ project specific runner (found under repo settings/actions) with GitHub. These runners need to be running on the host machines you run your Anka Virtualization CLI.
1. Include a `.github/workflows/{whatever}.yml` in your repo
2. Make sure to set your mapping key `uses:` to `veertuinc/anka-vm-github-action@vX.X.X`
3. There are a few required key/values you need to include under `with:`: `anka-template` and `commands` (see the Inputs section for more information)

```yaml
name: My Project's CI/CD
on:
  push:
    branches: [ master ]
jobs:
  ios:
    runs-on: [self-hosted, macOS]
    steps:
      - uses: actions/checkout@v2
      - name: build
        id: build
        uses: veertuinc/anka-vm-github-action@v1.0.0-beta
        with:
          anka-template: "10.15.4"
          anka-tag: "base:port-forward-22:xcode11-v1"
          anka-run-options: "--env"
          commands: |
            echo "Starting build process"
            ./build.sh && \
            ./cleanup.sh
          artifacts: |
            log.txt
            build/binaryfile-v1
```

The above example will clone your project repo to the github action runner's working directory, pull the Template `10.15.4` and Tag `base:port-forward-22:xcode11-v1` from the Registry, prepare an Anka VM using that Template and Tag, execute the commands inside of the VM ensuring Environment Variables are passed in with `anka-run-options: "--env"`, and then upload artifacts `./log.txt` and `./build/binaryfile-v1` from the current directory (which is mounted by default into the VM).

> **Build and Test time can be significantly impacted by the default host -> guest mount. It's suggested that you use `anka-run-options: "--wait-network --wait-time --no-volume"` and then git clone your repo inside of `commands:`.**

### Inputs

These are defined under the `with:` mapping key inside of your workflow yaml.

#### `anka-template`

- **Name or UUID of your Anka Template**
- **[Required]**

#### `commands`

- **Commands you wish to run inside of the Anka VM**
- **[Required]**
- You can use `commands: |` for multi-line input or a simple string

#### `anka-tag`

- **Name of Anka Tag (optional)**
- defaults to latest tag

#### `anka-custom-vm-label`
- **Label for the cloned VM that will execute your code**
- Defaults to `github-actions-${GITHUB_REPOSITORY}-${GITHUB_RUN_NUMBER}-${GITHUB_JOB}-${GITHUB_ACTION}`
- Your custom label will have a random number added to the end of it to prevent collisions when two VMs are running on the same node with the same label

#### `host-pre-commands`
- **Commands you wish to run outside on the node (host) BEFORE preparation of and execution inside the VM**
#### `host-post-commands`
- **Commands you wish to run outside on the node (host) AFTER preparation of and execution inside the VM**
#### `anka-start-options`
- **Options set for the anka start execution**
#### `anka-run-options`
- **Options set for anka run execution**
#### `anka-registry-pull-options`
- **Options set for anka registry pull execution**
#### `host-command-options`
- **Options to use for github actions exec command**
- Must be a js object (do not use single quotes to wrap values `{ cwd: 'This Wont Work' }`) or JSON (`{ "cwd": "./pathOnHostToRunAnkaCommands" }`) inside of a string
- Supported options: https://github.com/actions/toolkit/blob/master/packages/exec/src/interfaces.ts
#### `lock-file-location`
- **Location where the pull/clone lock file exists**
- Defaults to /tmp
#### `artifact-files`
- **Each file you wish to upload and include in the final artifact, newline separated**
#### `artifact-archive-file-name`
- **Name of the artifact (archive) that contains all of the files specified in the `artifact-files` input**
- Defaults to "artifact"
#### `artifacts-root-directory`
- **An absolute or relative file path that denotes the root parent directory of the files being uploaded**
- Defaults to "./"
#### `skip-registry-pull`
- **Skip the registry pull; useful if you do not have a registry or it is down but the Template + Tag are already on the node**

### Outputs

These are returned to your workflow.yaml so that subsequent steps can use them.

#### `std`
- The STDOUT and STDERR from the executed commands
- Includes artifact upload output

Usage:

```
  functional-tests-second-agent:
    runs-on: [self-hosted, macOS]
    needs: prep
    steps:
      - uses: actions/checkout@v2
      - name: sleep
        run: "sleep 20"
      - name: pull test 2
        id: pull-test-2
        uses: veertuinc/anka-vm-github-action@v1.0.0-beta
        with:
          anka-template: "10.15.4"
          anka-tag: "base:port-forward-22"
          commands: |
            env
            ls -laht ./
            ls -laht ../
            pwd
            echo "HERE" && \
            echo "THERE HERE WHERE"

      - name: Check for output
        run: |
          PULL_TEST_STD="${{ steps.pull-test-2.outputs.std }}"
          printf "pull test std ========================\n$PULL_TEST_STD"
          [[ ! -z "$(echo \"$PULL_TEST_STD\" | head -n 1)" ]] || exit 50
          [[ ! -z "$(echo \"$PULL_TEST_STD\" | grep 'Lock file /tmp/registry-pull-lock-10.15.4 found')" ]] || exit 51
          true
```


## Developing

### Prepare your environment

```bash
npm install
```

### Testing

There are two types of tests we perform:
1. Unit tests (testing functions)

    ```bash
    npm test
    ```

2. Functional testing using a workflow yaml (not in this repo)

### TO-DO
- Support multiple artifacts and files for those artifacts
- Better tests with mocks so we can avoid so much functional testing
- Execution of anka run should happen with `anka run template sh` and then passing into STDIN
- Clone within VM (with skip-clone inputs)
