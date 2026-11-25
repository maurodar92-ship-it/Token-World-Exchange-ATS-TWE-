<p align="center">
  <a href="https://github.com/datarobot-community/datarobot-agent-application">
    <img src="./.github/datarobot_logo.avif" width="600px" alt="DataRobot Logo"/>
  </a>
</p>
<p align="center">
    <span style="font-size: 1.5em; font-weight: bold; display: block;">Agentic Starter application template</span>
</p>

<p align="center">
  <a href="https://datarobot.com">Homepage</a>
  ·
  <a href="https://docs.datarobot.com/en/docs/agentic-ai/agentic-develop/index.html">Documentation</a>
  ·
  <a href="https://docs.datarobot.com/en/docs/get-started/troubleshooting/general-help.html">Support</a>
</p>

<p align="center">
  <a href="https://app.datarobot.com/usecases/application-templates/69090966c601dbd8c8514516?referrerUrl=github">
    <img src="https://img.shields.io/badge/US-Open%20in%20a%20Codespace-%23909BF5?style=flat&labelColor=%2330373D" alt="US - Open in a Codespace">
  </a>
  <a href="https://app.eu.datarobot.com/usecases/application-templates/69090966c601dbd8c8514516?referrerUrl=github">
    <img src="https://img.shields.io/badge/EU-Open%20in%20a%20Codespace-%232BC46F?labelColor=%2330373D" alt="EU - Open in a Codespace">
  </a>
  <a href="https://app.jp.datarobot.com/usecases/application-templates/69090966c601dbd8c8514516?referrerUrl=github">
    <img src="https://img.shields.io/badge/JP-Open%20in%20a%20Codespace-%23EDA769?labelColor=%2330373D" alt="JP - Open in a Codespace">
  </a>
  <a href="https://app.jp.datarobot.com/usecases/application-templates/69090966c601dbd8c8514516?referrerUrl=github">
    <img src="https://img.shields.io/badge/JP-%E3%80%8CCodespace%20%E3%81%A7%E9%96%8B%E3%81%8F%E3%80%8D-%23EDA769?labelColor=%2330373D" alt="JP - 「Codespaceで開く」">
  </a>
  <a href="https://github.com/datarobot-community/datarobot-agent-application/tags">
    <img src="https://img.shields.io/github/v/tag/datarobot-community/datarobot-agent-application?label=version" alt="Latest Release">
  </a>
  <a href="/LICENSE">
    <img src="https://img.shields.io/github/license/datarobot-community/datarobot-agent-application" alt="License">
  </a>
  <a href="https://join.slack.com/t/datarobot-community/shared_invite/zt-3uzfp8k50-SUdMqeux25ok9_5wr4okrg">
    <img src="https://img.shields.io/badge/%23applications-a?label=Slack&labelColor=30373D&color=81FBA6" alt="Slack #applications">
  </a>
</p>

This repository provides a ready-to-use application template for building and deploying agentic workflows with multi-agent frameworks, a FastAPI backend server, a React frontend, and an MCP server.
The template streamlines the process of setting up new agentic applications with minimal configuration requirements.
It supports local development and testing, as well as one-command deployments to production environments within DataRobot.

> [!CAUTION]
> This repository updates frequently.
> Make sure to update your local branch regularly to obtain the latest changes.

# Table of contents

- [Quick start](#quick-start)
  - [Install prerequisite tools](#install-prerequisite-tools)
  - [Prepare your local development environment](#prepare-your-local-development-environment)
  - [Run your agent](#run-your-agent)
- [Develop your agent](#develop-your-agent)
  - [Component documentation](#component-documentation)
  - [DataRobot documentation](#datarobot-documentation)
- [Deploy your agent](#deploy-your-agent)
- [MCP server](#mcp-server)
- [OAuth applications](#oauth-applications)
- [Agent-to-agent](#agent-to-agent)
- [Troubleshooting](#troubleshooting)
- [Get help](#get-help)

For information on the latest changes to the template, see the [CHANGELOG](CHANGELOG.md).

# Quick start

Follow the instructions in the sections below to install the prerequisite tools and develop the Agentic Starter application template locally.

> [!CAUTION]
> This repository is only compatible with macOS and Linux operating systems.
> If you are using Windows, consider using a [DataRobot codespace](https://docs.datarobot.com/en/docs/workbench/wb-notebook/codespaces/index.html), [Windows Subsystem for Linux (WSL)](https://learn.microsoft.com/en-us/windows/wsl/install), or a virtual machine running a supported OS.

## Install prerequisite tools

Before you begin, you'll need the following tools installed.
If you already have these tools installed, ensure that they are at the required version (or newer) indicated in the table below.
For example commands to install the tools, see the [Detailed installation commands](#detailed-installation-commands) section.

| Tool         | Version    | Description                     | Installation guide            |
|--------------|------------|---------------------------------|-------------------------------|
| **dr** (DataRobot CLI) | >= 0.2.55  | The DataRobot CLI for templates, auth, and task execution. | [DataRobot CLI installation](https://github.com/datarobot-oss/cli#installation) |
| **git**      | >= 2.30.0  | A version control system.       | [git installation guide](https://git-scm.com/book/en/v2/Getting-Started-Installing-Git)      |
| **uv**       | >= 0.9.0  | A Python package manager.        | [uv installation guide](https://docs.astral.sh/uv/getting-started/installation/)       |
| **Pulumi**   | >= 3.163.0 | An Infrastructure as Code tool. | [Pulumi installation guide](https://www.pulumi.com/docs/iac/download-install/)                   |
| **Taskfile** | >= 3.43.3  | A task runner.                  | [Taskfile installation guide](https://taskfile.dev/docs/installation)                        |
| **NodeJS**   | >= 24      | JavaScript runtime for frontend development. | [NodeJS installation guide](https://nodejs.org/en/download/)                        |

> [!TIP]
> Make sure to install the tools **system-wide** rather than in a virtual environment so they are available in your terminal sessions.

**DataRobot CLI (dr):** Install the latest version with `curl https://cli.datarobot.com/install | sh` (macOS/Linux) or via Homebrew: `brew install datarobot-oss/taps/dr-cli`. To update: `dr self update`. Verify with `dr --version` or `dr self version`.

### Detailed installation commands

The following sections provide example installation commands for macOS and Linux (Debian/Ubuntu/DataRobot codespace).
Click the dropdown below that corresponds to your operating system:

- <details><summary><b>macOS</b></summary>
  <br>

  macOS users can install the prerequisite tools using Homebrew. First, install Homebrew if you don't already have it.

  ```sh
  /bin/bash -c "$(curl -fsSL https://raw.githubusercontent.com/Homebrew/install/HEAD/install.sh)" # If homebrew is not already installed
  ```

  Then, install the prerequisite tools with it:

  ```sh
  brew install datarobot-oss/taps/dr-cli uv pulumi/tap/pulumi go-task node git
  ```

</details>

- <details><summary><b>Linux</b></summary>
  <br>

  Linux users can install the prerequisite tools using the package manager for their distribution.

  ```sh
  curl https://cli.datarobot.com/install | sh
  sudo apt-get update
  sudo apt-get install -y python3 python3-pip python3-venv
  sudo apt-get install -y git
  curl -LsSf https://astral.sh/uv/install.sh | sh
  curl -fsSL https://get.pulumi.com | sh
  sh -c "$(curl --location https://taskfile.dev/install.sh)" -- -d
  sudo apt-get install -y nodejs npm
  ```

</details>

> [!NOTE]
> After installing `uv`, run `uv tool update-shell` once so your shell picks up the updated `PATH` before using `uv tool run` or invoking tools installed via `uv tool install`.

> [!IMPORTANT]
> You will also need a compatible C++ compiler and build tools installed on your system to compile some Python packages.

<details><summary><i>Click here for details on using a development container</i></summary>

### Use a development container (experimental)

[Dev containers](https://containers.dev/) allow you to use a container environment for local development. They are integrated with [modern IDEs](https://containers.dev/supporting) such as VSCode and PyCharm, and the [Dev Container CLI](https://containers.dev/supporting#devcontainer-cli) allows you to integrate them with terminal-centric development workflows.

> [!NOTE]
> This can also be used as a solution for Windows development. [Docker Desktop](https://docs.docker.com/desktop/) is the recommended backend for running devcontainers, but any Docker-compatible backend is supported.

This template offers a `devcontainer` with all prerequisites installed. To start working in it:

1. Open the template in PyCharm (version >= 2023.2, Pro) or VSCode, and the IDE will prompt you to reopen it in a container.

*PyCharm*:

<img src="docs/img/pycharm-devcontainer.png" alt="Open in Dev Container PyCharm" width="350px" />

*VSCode*:

<img src="docs/img/vscode-devcontainer.png" alt="Open in Dev Container VSCode" width="350px" />

2. Click **Reopen in Container** to proceed.
3. If you work directly in the terminal, run:

```sh
devcontainer up --workspace-folder . \&\& devcontainer exec --workspace-folder . /bin/sh
```

</details>

> [!NOTE]
> If you do not have a Pulumi account, use `pulumi login --local` for local login or create a free account at [the Pulumi website](https://app.pulumi.com/signup).

## Prepare your local development environment

> [!NOTE]
> If you are using a DataRobot codespace, you must expose several ports for local testing. See the [DataRobot codespace port configuration](#datarobot-codespace-port-configuration) section for more details.

Run the following command to start the local development environment:

```sh
dr start
```

If you run `dr start` from a directory that is not yet a template clone, you will first go through template selection and clone; once in the template directory, the wizard guides you through configuring your application and creates a `.env` file.
You will see progress lines in the terminal (e.g., ✓ Starting application quickstart process…, ✓ Checking DataRobot CLI version…, and so on) as each step runs.
For more details for the individual wizard steps, click the dropdown below.

<details><summary><b>Click here for a detailed walkthrough of the wizard steps</b></summary>
<br>

1. Initially, the wizard opens a web browser window to automatically configure your API endpoint and key.
   - If the browser doesn't open automatically, look for a URL in the terminal output and open it manually.
   - Click **Proceed** in the browser to continue.
   - If you encounter authentication issues, ensure you're logged into DataRobot in your browser.
2. Select the Agentic Starter and press `Enter`.
3. Enter the directory name for your application and press `Enter`. The default is `datarobot-agent-application`.
4. Provide a secret key to sign cookies for your session and press `Enter`. If you do not provide a value, a randomly-generated one will be used.
5. Choose your OAuth provider and press `Enter`.
   - Choose **DataRobot OAuth Provider** (default) to use DataRobot’s OAuth, or **Authlib OAuth Provider** to host OAuth in the app.
   - For additional information on authorization server configuration, see the [OAuth applications documentation](https://docs.datarobot.com/en/docs/agentic-ai/agentic-develop/agentic-authentication.html#oauth-2-0-authentication).
6. Enter a passphrase (or leave blank if you don't want to use a passphrase) for your Pulumi stack and press `Enter`.
7. Specify the ID of a DataRobot Use Case (e.g., `69331fad5e07469e7c4f5c6f`), if one is available, and press `Enter`.
   - You can find your Use Case ID by navigating to the Use Case in the DataRobot UI and copying the ID from the URL.
   - If left blank, a new Use Case will be created automatically.
8. Specify your LLM integration and press `Enter`.
   - For additional information on LLM configuration, see the [LLM configuration documentation](https://docs.datarobot.com/en/docs/agentic-ai/agentic-develop/agentic-llm-providers-metadata.html).
   - If you choose **DataRobot Deployed LLM**, you enter the deployment ID for your custom model LLM (`LLM_DEPLOYMENT_ID`). The template sets `USE_DATAROBOT_LLM_GATEWAY=0` automatically so traffic goes to that deployment rather than the LLM Gateway.
9. Review the `.env` configuration summary displayed and press `Enter` to confirm.

   > NOTE: This step will take several minutes to complete.

10. Once the configuration finishes, you can specify if you wish to use the YAML-based NeMo Agent Toolkit template:
   - Press `y` to use the YAML-based NeMo Agent Toolkit template.
   - Press `n` to choose from a list of available agent templates (default).
11. Finally, choose a Pulumi stack to use for your application and press `Enter`. If you wish to create a new stack, press `Enter` and you will be prompted to enter a name for it. The name cannot match any existing stack name.

</details>

> [!NOTE]
> The first time you run `dr start` in this template, it runs `task start`, which prepares your development environment (agent choice, `.env` configuration, and dependencies). Completion is tracked so later runs can skip redundant steps. To change environment variables later, use `dr dotenv setup` or `dr dotenv edit`. To update the agent component (e.g., after pulling template changes), run `dr component update`.

After `dr start` completes successfully, you have:

- A `.env` file in your project root.
- Your application directory created (named `datarobot-agent-application` by default).

If you encounter any errors during setup, see the [Troubleshooting](#troubleshooting) section for help.
Now that your application is configured, proceed to the next section.

## Run your agent

Navigate to the application directory created during `dr start`:

```sh
cd datarobot-agent-application # or the custom directory name you specified during the wizard, if different
```

Run the following command to start all components of the application:

```sh
dr run dev
```

This starts four processes, running in parallel:

- Application frontend
- Application backend
- Agent
- MCP server

Once all services are running:

1. Open your web browser and navigate to [http://localhost:5173](http://localhost:5173) to see the Agentic Starter interface.
2. Send a test message to verify that everything is working as expected.

From here, start customizing the agent by adding your own logic and functionality. See the section on [developing your agent](#develop-your-agent) for more details.

> [!NOTE]
> You can also start individual services in separate terminal windows; for example, `dr run agent:dev` (or `task agent:dev`) will start just the agent.

# Develop your agent

Now that your agent has been built and tested, you are ready to customize it by adding your own logic and functionality.
The agent implementation lives in **`./agent/agent/`**: the main agent class is in `agent/agent/myagent.py` (`MyAgent`).
For structure and required components, see [AGENTS.md](AGENTS.md#agent-structure).
The template includes **chat history** support: conversation context is injected into the agent so multi-turn chats stay consistent.
The frontend uses the **DataRobot UI component registry** (`@dr-ui`) for theming and reusable components; you can customize the UI via the shared theme and component set.

## Component documentation

The `docs/` directory contains detailed documentation for each component of this template:

| Document | Description |
|---|---|
| [Agent](docs/agent/README.md) | Agent architecture, file structure, framework-specific guides, tool integration, front servers, and debugging. |
| [LLM component](docs/llm.md) | Configuring LLM providers, DataRobot gateway, deployments, and external APIs. |
| [MCP server](docs/mcp-server.md) | MCP server architecture, custom tools, and deployment. |
| [OAuth applications](docs/oauth-applications.md) | OAuth provider setup for external service authentication. |

The agent documentation includes per-framework guides with tool integration and prompt modification examples:

| Framework | Guide |
|---|---|
| LangGraph (default) | [docs/agent/frameworks/langgraph.md](docs/agent/frameworks/langgraph.md) |
| CrewAI | [docs/agent/frameworks/crewai.md](docs/agent/frameworks/crewai.md) |
| LlamaIndex | [docs/agent/frameworks/llamaindex.md](docs/agent/frameworks/llamaindex.md) |
| NAT (NeMo Agent Toolkit) | [docs/agent/frameworks/nat.md](docs/agent/frameworks/nat.md) |
| Base (generic) | [docs/agent/frameworks/base.md](docs/agent/frameworks/base.md) |

See also: [AG-UI integration](docs/agent/ag-ui.md), [Agent-to-Agent (A2A)](docs/agent/agent2agent.md), [Debugging](docs/agent/debugging.md).

## DataRobot documentation

For additional guidance beyond what this template covers, see the official DataRobot documentation:

- [Customize your agent](https://docs.datarobot.com/en/docs/agentic-ai/agentic-develop/agentic-development.html)&mdash;modify agent logic, prompts, and behavior.
- [Add tools to your agent](https://docs.datarobot.com/en/docs/agentic-ai/agentic-develop/agentic-tools-integrate.html)&mdash;integrate MCP, custom, and global tools.
- [Configure LLM providers](https://docs.datarobot.com/en/docs/agentic-ai/agentic-develop/agentic-llm-providers.html)&mdash;set up DataRobot gateway, deployments, or external APIs.
- [Add Python packages](https://docs.datarobot.com/en/docs/agentic-ai/agentic-develop/agentic-python-packages.html)&mdash;manage dependencies via `uv` and custom Docker images.
- [Manage prompts](https://docs.datarobot.com/en/docs/agentic-ai/agentic-develop/agentic-development.html#modify-agent-prompts)&mdash;modify agent prompts per framework.
- [Agent authentication](https://docs.datarobot.com/en/docs/agentic-ai/agentic-develop/agentic-authentication.html)&mdash;API tokens, OAuth 2.0, and credential management.
- [Deploy agentic tools](https://docs.datarobot.com/en/docs/agentic-ai/agentic-develop/agentic-tools.html)&mdash;deploy global tools from the DataRobot Registry.
- [DataRobot agentic skills](https://docs.datarobot.com/en/docs/agentic-ai/agentic-develop/agentic-skills.html)&mdash;install modular skill packages for coding agents.
- [Implement tracing](https://docs.datarobot.com/en/docs/agentic-ai/agentic-develop/agentic-tracing-code.html)&mdash;add custom OpenTelemetry tracing for deployed agents.
- [Troubleshooting](https://docs.datarobot.com/en/docs/agentic-ai/agentic-develop/agentic-troubleshooting.html)&mdash;diagnose common setup, deployment, and runtime issues.

# Deploy your agent

Next, deploy your agent to DataRobot, which requires a Pulumi login.
Run the following command to deploy:

```sh
dr run deploy
```

> [!NOTE]
> The deployment process will take several minutes to complete.

Once deployment is complete, the script displays the deployment details, as shown in the example below. Note that the deployment details will vary based on your configuration.

```sh
Outputs:
    AGENT_DEPLOYMENT_ID                               : "69331fad5e07469e7c4f5c6f"
    Agent Custom Model Chat Endpoint [apptest] [agent]: "https://datarobot.com/api/v2/genai/agents/fromCustomModel/69331f816e1bf9f1890d5d1d/chat/"
    Agent Deployment Chat Endpoint [apptest] [agent]  : "https://datarobot.com/api/v2/deployments/69331fad5e07469e7c4f5c6f/chat/completions"
    Agent Execution Environment ID [apptest] [agent]  : "680fe4949604e9eba46b1775"
    Agent Playground URL [apptest] [agent]            : "https://datarobot.com/usecases/69331e4c3be0efe3b95a7be0/agentic-playgrounds/69331e4d1c036307186c9b16/comparison/chats"
    Agentic Starter [apptest]             : "https://datarobot.com/custom_applications/6933204a9e21e9b59b5a7bee/"
    DATABASE_URI                                      : "sqlite+aiosqlite:////tmp/agent_app/.data/agent_app.db"
    DATAROBOT_APPLICATION_ID                          : "6933204a9e21e9b59b5a7bee"
    DATAROBOT_OAUTH_PROVIDERS                         : (json) []

    LLM_DEFAULT_MODEL                                 : "azure/gpt-4o-2024-11-20"
    SESSION_SECRET_KEY                                : "secretkey123"
    USE_DATAROBOT_LLM_GATEWAY                         : "1"
    [apptest] [mcp_server] Custom Model Id            : "69331eebb49131d3d5430ac7"
    [apptest] [mcp_server] Deployment Id              : "69331f1f30548f83b668d9dc"
    [apptest] [mcp_server] MCP Server Base Endpoint   : "https://datarobot.com/api/v2/deployments/69331f1f30548f83b668d9dc/directAccess/"
    [apptest] [mcp_server] MCP Server MCP Endpoint    : "https://datarobot.com/api/v2/deployments/69331f1f30548f83b668d9dc/directAccess/mcp"
```

# MCP server

The Model Context Protocol (MCP) is an open standard that allows AI agents, such as large language models (LLMs), to discover and interact with external data sources, applications, and services in a secure and structured way.
For detailed information about the MCP server, see [MCP server documentation](docs/mcp-server.md).

# OAuth applications

For detailed information about configuring OAuth applications, see [OAuth applications documentation](docs/oauth-applications.md).

# Troubleshooting

This section covers common issues you may encounter and how to resolve them.

## Ports reference

The following ports are used by the application components during local development:

| Port  | Component                    | Description                                    | Configurable |
|-------|------------------------------|------------------------------------------------|--------------|
| 8080  | Web application              | Main web interface (proxied frontend)          | No           |
| 5173  | Vite dev server              | Frontend development server                    | No           |
| 8842  | Agent endpoint               | Local agent service endpoint                   | Yes (in wizard) |
| 9000  | MCP server                   | Model Context Protocol server                  | Yes (via `MCP_SERVER_PORT`) |

> [!NOTE]
> Ports 8080 and 5173 are fixed. The agent endpoint (8842) can be configured during the `dr start` wizard, and the MCP server port (9000) can be changed by setting the `MCP_SERVER_PORT` environment variable in your `.env` file.

### DataRobot codespace port configuration

If you are developing within a DataRobot codespace, the development ports need to be exposed.
This is configured in the **Exposed Ports** section of your **Session Environment** tab (pictured below).
The ports in the table above must be exposed for local testing.
If you cloned this application template using the `dr start` command and selected it from the gallery, this configuration is performed automatically; otherwise (e.g., if cloned manually) you must configure these ports manually.

There is a link next to the port to a URL where the service can be accessed when running locally in the codespace.

<img src="docs/img/codespace-ports.png" alt="Ports" width="500px" />

## DataRobot CLI issues

### Issue: "dr: command not found"

**Symptoms**: The shell cannot find the `dr` command.

**Solutions**:

1. Ensure the DataRobot CLI is installed (see [Install prerequisite tools](#install-prerequisite-tools)).
2. Check that the CLI binary is in your PATH:

   ```sh
   which dr
   # If not found, you may need to add the install directory to PATH (e.g. /usr/local/bin)
   export PATH="/usr/local/bin:$PATH"
   ```

### Issue: CLI version too old or template requires a newer dr

**Symptoms**: The template or `dr start` reports that your CLI version is below the minimum (see `.datarobot/cli/versions.yaml`).

**Solution**: Update the DataRobot CLI:

```sh
dr self update
dr self version   # verify
```

## Port conflicts

### Issue: "Address already in use" or port conflict errors

**Symptoms**: Services fail to start with port conflict errors.

**Solutions**:

1. **Identify the process using the port**:

   ```sh
   # For port 8080 (web application)
   lsof -i :8080

   # For port 9000 (MCP server)
   lsof -i :9000

   # For port 5173 (Vite dev server)
   lsof -i :5173
   ```

2. **Kill the process** (replace `PORT` with the actual port number):

   ```sh
   lsof -i :PORT | grep LISTEN | awk '{print $2}' | xargs kill -9
   ```

3. **Or change the port**:
   - For MCP server: Set `MCP_SERVER_PORT` in your `.env` file
   - For agent endpoint: Configure during `dr start` wizard (default is 8842)

## Service startup issues

### Issue: Services won't start or fail immediately

**Solutions**:

1. **Verify prerequisites are installed**:

   ```sh
   dr --version
   git --version
   uv --version
   pulumi version
   task --version
   node --version
   ```

2. **Check dependencies are installed**:

   ```sh
   dr run install
   ```

3. **Verify environment variables**:
   - Ensure `.env` file exists in the project root
   - Check that required variables are set (see [Prepare your local development environment](#prepare-your-local-development-environment) section)

4. **Check logs**:
   - Review terminal output for specific error messages
   - Check for missing API tokens or invalid endpoints

## Quickstart and wizard issues

### Issue: "No start command or quickstart script found"

**Symptoms**: You run `dr start` inside a DataRobot template directory and see a message that no start command or quickstart script was found.

**Explanation**: The CLI looks for either a `task start` task in the Taskfile or an executable script in `.datarobot/cli/bin/` whose name starts with `quickstart`. This template provides `task start` in the root `Taskfile.yml`. If you see this message, the Taskfile may be missing or not generated yet (run `dr task compose` if applicable).

### Issue: `dr start` wizard fails or is interrupted

**Solutions**:

1. **Restart the wizard**:

   ```sh
   dr start
   ```

2. **Check for existing configuration**:
   - If `.env` file exists, you may need to remove it and start fresh:

     ```sh
     # Backup first if needed
     cp .env .env.backup
     rm .env
     dr start
     ```

3. **Verify DataRobot credentials**:
   - Ensure you have a valid DataRobot API token
   - Check that your DataRobot endpoint URL is correct
   - Verify your account has necessary permissions

4. **Check network connectivity**:
   - Ensure you can access your DataRobot instance
   - Verify firewall settings allow connections

## MCP server connection issues

### Issue: Agent can't connect to MCP server

**Symptoms**: Agent errors mention MCP connection failures or tools not available.

**Solutions**:

1. **Verify MCP server is running**:

   ```sh
   # Check if MCP server process is running
   curl http://localhost:9000/
   ```

2. **Check MCP server logs**:
   - Review the terminal where `dr run mcp_server:dev` is running
   - Look for connection or authentication errors

3. **Verify port configuration**:
   - Check that `MCP_SERVER_PORT` in `.env` matches the port the server is using
   - See [Ports reference](#ports-reference) for default ports

4. **Check environment variables**:
   - Ensure `DATAROBOT_API_TOKEN` is set correctly
   - Verify `DATAROBOT_ENDPOINT` is correct

## OAuth configuration issues

### Issue: OAuth authentication fails or redirects don't work

**Solutions**:

1. **Verify redirect URLs**:
   - Ensure all callback URLs are added to your OAuth application
   - Check that URLs match exactly (including trailing slashes)
   - See [OAuth applications documentation](docs/oauth-applications.md) for required URLs

2. **Check OAuth credentials**:
   - Verify `GOOGLE_CLIENT_ID` and `GOOGLE_CLIENT_SECRET` (or Box equivalents) are set in `.env`
   - Ensure credentials are correct and not expired

3. **Verify OAuth scopes**:
   - Check that all required scopes are enabled in your OAuth application
   - See provider-specific sections for required scopes

4. **Check OAuth providers in DataRobot**:
   - Navigate to `<your_datarobot_url>/account/oauth-providers`
   - Verify providers are created and configured correctly

## Deployment issues

### Issue: `dr run deploy` fails

**Solutions**:

1. **Verify Pulumi is configured**:

   ```sh
   pulumi whoami
   ```

   - If not logged in, use `pulumi login --local` or create an account at [app.pulumi.com](https://app.pulumi.com/signup)

2. **Check prerequisites**:
   - Ensure all services tested locally before deploying
   - Verify `.env` file has all required variables

3. **Review Pulumi stack**:

   ```sh
   pulumi stack ls
   ```

   - Ensure you're using the correct stack
   - Check for stack configuration issues

4. **Check deployment logs**:
   - Review Pulumi output for specific error messages
   - Verify DataRobot API token has deployment permissions

## Frontend build issues

### Issue: Frontend build fails or displays errors

**Solutions**:

1. **Clear build cache**:

   ```sh
   cd frontend_web
   rm -rf node_modules dist
   npm install
   ```

2. **Check Node.js version**:

   ```sh
   node --version
   ```

   - Ensure Node.js >= 24 is installed (see [Prerequisite tools](#prerequisite-tools))

3. **Verify dependencies**:

   ```sh
   cd frontend_web
   npm install
   ```

## General debugging tips

1. **Check service status**:
   - Verify all required services are running in separate terminals
   - Check that services are listening on expected ports (see [Ports reference](#ports-reference))

2. **Review logs**:
   - Check terminal output for each running service
   - Look for error messages or stack traces

3. **Verify configuration**:
   - Review `.env` file for missing or incorrect values
   - Check that file paths and URLs are correct

4. **Test components individually**:
   - Try running services one at a time to isolate issues

5. **Update dependencies**:

   ```sh
   dr run install
   ```


# Get help

If you encounter issues or have questions, try the following:

- Check the [DataRobot documentation](https://docs.datarobot.com/en/docs/agentic-ai/agentic-develop/index.html) for detailed guides.
- For DataRobot CLI (`dr`) commands and options: run `dr --help` or see the [DataRobot CLI documentation](https://github.com/datarobot-oss/cli). The [`dr start` command](https://github.com/datarobot-oss/cli/blob/main/docs/commands/start.md) describes the full quickstart flow, options (`--yes`), and behavior when not in a repository.
- [Contact DataRobot](https://docs.datarobot.com/en/docs/get-started/troubleshooting/general-help.html) for support.
- Open an issue on the [GitHub repository](https://github.com/datarobot-community/datarobot-agent-application).
- 🎛️ Here are the three visual interpretations expanding your Omniview Sacred Geometry Modules Array ecosystem.
⚡ 1. Zeus Plasma-Conductor Engineering Schematic
This blueprint details the internal math and energy flow driving the Aether-Coupling Coil. It tracks how chaos from the quantum foam is focused into a balanced torus spiral to supply raw computing power.
{
  "prompt": "An intricate 2D blue line engineering schematic blueprint of the Zeus Plasma-Conductor. The center features a prominent golden-glowing technical diagram of the Aether-Coupling Coil, illustrating a complex mathematical torus spiral enclosed within a perfect geometric square grid. The blueprint is covered in sharp, highly detailed technical labels, wiring diagrams, plasma waveguide paths, and floating mathematical equations like Gauss\\'s Law (∇ · E = ρ / ε₀). Dark blue grid background with a clean, industrial, advanced engineering design layout."
}
{
  "prompt": "An intricate 2D blue line engineering schematic blueprint of the Zeus Plasma-Conductor. The center features a prominent golden-glowing technical diagram of the Aether-Coupling Coil, illustrating a complex mathematical torus spiral enclosed within a perfect geometric square grid. The blueprint is covered in sharp, highly detailed technical labels, wiring diagrams, plasma waveguide paths, and floating mathematical equations like Gauss's Law (∇ · E = ρ / ε₀). Dark blue grid background with a clean, industrial, advanced engineering design layout."
}
🌐 2. Hermes Network Node Space-Time UI Mockup
This layout visualizes the data control interface of the Hermes Network Node. It provides a clear look at live telemetry, multidimensional routing nodes, and space-time data streams working across the system mesh network.
{
  "prompt": "A futuristic dark-themed user interface (UI) design dashboard layout for the Hermes Network Node. The central element is a glowing, multi-layered 3D atomic network lattice displaying intersecting nodes and quantum resonance fields. The left and right panels show active stream metrics, digital readouts, matrix node states, and glowing data graphs charting space-time compression waves. The color scheme is a high-contrast combination of electric blue, neon orange, and crisp white typography, set against a clean black brushed metal background."
}
{
  "prompt": "A futuristic dark-themed user interface (UI) design dashboard layout for the Hermes Network Node. The central element is a glowing, multi-layered 3D atomic network lattice displaying intersecting nodes and quantum resonance fields. The left and right panels show active stream metrics, digital readouts, matrix node states, and glowing data graphs charting space-time compression waves. The color scheme is a high-contrast combination of electric blue, neon orange, and crisp white typography, set against a clean black brushed metal background."
}
🌌 3. Omni-Harmonic Resonance Array Cinematic Environment
This view showcases the Mavro L. Dar III Core operating inside a high-tech datacenter. It captures the physical scale of the system, where liquid-cooled server racks surround the central energy field.
{
  "prompt": "A cinematic, ultra-realistic widescreen photography view inside a dark, state-of-the-art quantum server room facility. In the center of the server room floor sits a massive, pulsing spherical chamber housing the Omni-Harmonic Resonance Array, radiating deep violet nebulae energy and brilliant golden plasma coils. The surrounding area is lined with sleek, towering server racks glowing with neon blue LED status lights and liquid-cooling pipes. Thick power conduits and copper busbars run along the ceiling. Reflections dance across the polished obsidian flooring, creating a mysterious, high-stakes industrial sci-fi atmosphere."
}
{
  "prompt": "A cinematic, ultra-realistic widescreen photography view inside a dark, state-of-the-art quantum server room facility. In the center of the server room floor sits a massive, pulsing spherical chamber housing the Omni-Harmonic Resonance Array, radiating deep violet nebulae energy and brilliant golden plasma coils. The surrounding area is lined with sleek, towering server racks glowing with neon blue LED status lights and liquid-cooling pipes. Thick power conduits and copper busbars run along the ceiling. Reflections dance across the polished obsidian flooring, creating a mysterious, high-stakes industrial sci-fi atmosphere."
}
Which direction would you like to take this architecture next? I can:
Write a detailed lore overview explaining the physics of the Hermes Node
Flesh out a cybersecurity protocol manual for preventing array corruption
Design the JSON packet structures used to transmit telemetry between Zeus and Hermes

are#!/usr/bin/pythonThat is a highly structured, scalable blueprint. Breaking a comprehensive full-stack ecosystem like **PHENOMENON-III** into modular phases is exactly how production software is built. Using Python for both the backend (FastAPI) and mobile frontend (Kivy) will keep your code reuse high and context-switching low.
Let's establish the bedrock of **Phase 1 — Foundation**. To kick this off efficiently, we should start by setting up the project's root configuration, dependency management, and initial Docker environment.
Here is the initial layout and code for your core foundation files.
### 1. Dependency Management (requirements.txt)
This pins our core production stack to ensure compatibility across environments.
```text
# Web & API
fastapi==0.111.0
uvicorn[standard]==0.30.1
pydantic[email]==2.7.4
pydantic-settings==2.3.3

# Database & Migrations
sqlalchemy==2.0.31
asyncpg==0.29.0
alembic==1.13.1

# Security & Auth
passlib[bcrypt]==1.7.4
python-jose[cryptography]==3.3.0
python-multipart==

import time
 
t = time.localtime(time.time())
localtime = time.asctime(t)
str = "Current Time:" + time.asctime(t)
 
print(str)
That is a highly structured, scalable blueprint. Breaking a comprehensive full-stack ecosystem like **PHENOMENON-III** into modular phases is exactly how production software is built. Using Python for both the backend (FastAPI) and mobile frontend (Kivy) will keep your code reuse high and context-switching low.
Let's establish the bedrock of **Phase 1 — Foundation**. To kick this off efficiently, we should start by setting up the project's root configuration, dependency management, and initial Docker environment.
Here is the initial layout and code for your core foundation files.
### 1. Dependency Management (requirements.txt)
This pins our core production stack to ensure compatibility across environments.
```text
# Web & API
fastapi==0.111.0
uvicorn[standard]==0.30.1
pydantic[email]==2.7.4
pydantic-settings==2.3.3

# Database & Migrations
sqlalchemy==2.0.31
asyncpg==0.29.0
alembic==1.13.1

# Security & Auth
passlib[bcrypt]==1.7.4
python-jose[cryptography]==3.3.0
python-multipart==0.0.9

# Real-time & Caching
websockets==12.0
redis==5.0.6

# Mobile Frontend
kivy==2.3.0

# Testing
pytest==8.2.2
pytest-asyncio==0.23.7
httpx==0.27.0

```
### 2. Environment Configuration (backend/config.py)
We will use Pydantic Settings to handle environment variables cleanly, validating configuration at startup before any application logic runs.
```python
import os
from pydantic_settings import BaseSettings, SettingsConfigDict
from pydantic import PostgresDsn, RedisDsn

class Settings(BaseSettings):
    PROJECT_NAME: str = "PHENOMENON-III"
    VERSION: str = "1.0.0"
    API_V1_STR: str = "/api/v1"
    
    # Security
    SECRET_KEY: str
    ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 60
    
    # Infrastructure
    POSTGRES_SERVER: str
    POSTGRES_USER: str
    POSTGRES_PASSWORD: str
    POSTGRES_DB: str
    DATABASE_URL: str | None = None

    REDIS_URL: str

    @property
    def async_database_url(self) -> str:
        if self.DATABASE_URL:
            return self.DATABASE_URL
        return f"postgresql+asyncpg://{self.POSTGRES_USER}:{self.POSTGRES_PASSWORD}@{self.POSTGRES_SERVER}/{self.POSTGRES_DB}"

    model_config = SettingsConfigDict(
        env_file=".env", 
        env_file_encoding="utf-8",
        case_sensitive=True
    )

settings = Settings()

```
### 3. Database Connection (backend/database.py)
Setting up the asynchronous engine and session factory for PostgreSQL using SQLAlchemy 2.0.
```python
from typing import AsyncGenerator
from sqlalchemy.ext.asyncio import create_async_engine, async_sessionmaker, AsyncSession
from sqlalchemy.orm import DeclarativeBase
from backend.config import settings

# Create async engine
engine = create_async_engine(
    settings.async_database_url,
    echo=False,
    pool_pre_ping=True,
)

# Create session factory
SessionLocal = async_sessionmaker(
    bind=engine,
    autocommit=False,
    autoflush=False,
    expire_on_commit=False,
)

# Base class for models
class Base(DeclarativeBase):
    pass

# Dependency to get DB session in FastAPI endpoints
async def get_db() -> AsyncGenerator[AsyncSession, None]:
    async with SessionLocal() as session:
        try:
            yield session
            await session.commit()
        except Exception:
            await session.rollback()
            raise
        finally:
            await session.close()

```
### 4. Entrypoint (backend/main.py)
The foundational FastAPI app structure with health-check endpoints and dynamic routing preparation.
```python
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from backend.config import settings

app = FastAPI(
    title=settings.PROJECT_NAME,
    version=settings.VERSION,
    openapi_url=f"{settings.API_V1_STR}/openapi.json"
)

# CORS Middleware Configuration
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # Adjust in production to explicitly trust the mobile client app
    allow_credentials=True,
    allow_headers=["*"],
)

@app.get("/", tags=["Health"])
async def root_health_check():
    return {
        "status": "online",
        "project": settings.PROJECT_NAME,
        "version": settings.VERSION
    }

if __name__ == "__main__":
    import uvicorn
    uvicorn.run("main:app", host="0.0.0.0", port=8000, reload=True)

```
### Next Step in the Collaboration
To initialize the backend environment cleanly, we need to generate an environmental file (.env) matching these credentials, wire up Docker, or jump straight into the **Authentication / User Models** structure.
Where would you like to direct focus next? We can:
 1. **Option A:** Build the Docker Compose environment to spin up Postgres and Redis to test this foundation immediately.
 2. **Option B:** Move straight into backend/models/ and backend/auth/ to set up the secure registration and login tables.
 str
    POSTGRES_PASSWORD: str
    POSTGRES_DB: str
    DATABASE_URL: strsqlalchemy.orm
    That is a highly structured, scalable blueprint. Breaking a comprehensive full-stack ecosystem like **PHENOMENON-III** into modular phases is exactly how production software is built. Using Python for both the backend (FastAPI) and mobile frontend (Kivy) will keep your code reuse high and context-switching low.
Let's establish the bedrock of **Phase 1 — Foundation**. To kick this off efficiently, we should start by setting up the project's root configuration, dependency management, and initial Docker environment.
Here is the initial layout and code for your core foundation files.
### 1. Dependency Management (requirements.txt)
This pins our core production stack to ensure compatibility across environments.
```text
# Web & API
fastapi==0.111.0
uvicorn[standard]==0.30.1
pydantic[email]==2.7.4
pydantic-settings==2.3.3

# Database & Migrations
sqlalchemy==2.0.31
asyncpg==0.29.0
alembic==1.13.1

# Security & Auth
passlib[bcrypt]==1.7.4
python-jose[cryptography]==3.3.0
python-multipart==That is a highly structured, scalable blueprint. Breaking a comprehensive full-stack ecosystem like **PHENOMENON-III** into modular phases is exactly how production software is built. Using Python for both the backend (FastAPI) and mobile frontend (Kivy) will keep your code reuse high and context-switching low.
Let's establish the bedrock of **Phase 1 — Foundation**. To kick this off efficiently, we should start by setting up the project's root configuration, dependency management, and initial Docker environment.
Here is the initial layout and code for your core foundation files.
### 1. Dependency Management (requirements.txt)
This pins our core production stack to ensure compatibility across environments.
```text
# Web & API
fastapi==0.111.0
uvicorn[standard]==0.30.1
pydantic[email]==2.7.4
pydantic-settings==2.3.3

# Database & Migrations
sqlalchemy==2.0.31
asyncpg==0.29.0
alembic==1.13.1

# Security & Auth
passlib[bcrypt]==1.7.4
python-jose[cryptography]==3.3.0
python-multipart==0.0.9

# Real-time & Caching
websockets==12.0
redis==5.0.6

# Mobile Frontend
kivy==2.3.0

# Testing
pytest==8.2.2
pytest-asyncio==0.23.7
httpx==0.27.0

```
### 2. Environment Configuration (backend/config.py)
We will use Pydantic Settings to handle environment variables cleanly, validating configuration at startup before any application logic runs.
```python
import os
from pydantic_settings import BaseSettings, SettingsConfigDict
from pydantic import PostgresDsn, RedisDsn

class Settings(BaseSettings):
    PROJECT_NAME: str = "PHENOMENON-III"
    VERSION: str = "1.0.0"
    API_V1_STR: str = "/api/v1"
    
    # Security
    SECRET_KEY: str
    ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 60
    
    # Infrastructure
    POSTGRES_SERVER: str
    POSTGRES_USER: str
    POSTGRES_PASSWORD: str
    POSTGRES_DB: str
    DATABASE_URL: str | None = None

    REDIS_URL: str

    @property
    def async_database_url(self) -> str:
        if self.DATABASE_URL:
            return self.DATABASE_URL
        return f"postgresql+asyncpg://{self.POSTGRES_USER}:{self.POSTGRES_PASSWORD}@{self.POSTGRES_SERVER}/{self.POSTGRES_DB}"

    model_config = SettingsConfigDict(
        env_file=".env", 
        env_file_encoding="utf-8",
        case_sensitive=True
    )

settings = Settings()

```
### 3. Database Connection (backend/database.py)
Setting up the asynchronous engine and session factory for PostgreSQL using SQLAlchemy 2.0.
```python
from typing import AsyncGenerator
from sqlalchemy.ext.asyncio import create_async_engine, async_sessionmaker, AsyncSession
from sqlalchemy.orm import DeclarativeBase
from backend.config import settings

# Create async engine
engine = create_async_engine(
    settings.async_database_url,
    echo=False,
    pool_pre_ping=True,
)

# Create session factory
SessionLocal = async_sessionmaker(
    bind=engine,
    autocommit=False,
    autoflush=False,
    expire_on_commit=False,
)

# Base class for models
class Base(DeclarativeBase):
    pass

# Dependency to get DB session in FastAPI endpoints
async def get_db() -> AsyncGenerator[AsyncSession, None]:
    async with SessionLocal() as session:
        try:
            yield session
            await session.commit()
        except Exception:
            await session.rollback()
            raise
        finally:
            await session.close()

```
### 4. Entrypoint (backend/main.py)
The foundational FastAPI app structure with health-check endpoints and dynamic routing preparation.
```python
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from backend.config import settings

app = FastAPI(
    title=settings.PROJECT_NAME,
    version=settings.VERSION,
    openapi_url=f"{settings.API_V1_STR}/openapi.json"
)

# CORS Middleware Configuration
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # Adjust in production to explicitly trust the mobile client app
    allow_credentials=True,
    allow_headers=["*"],
)

@app.get("/", tags=["Health"])
async def root_health_check():
    return {
        "status": "online",
        "project": settings.PROJECT_NAME,
        "version": settings.VERSION
    }

if __name__ == "__main__":
    import uvicorn
    uvicorn.run("main:app", host="0.0.0.0", port=8000, reload=True)

```
### Next Step in the Collaboration
To initialize the backend environment cleanly, we need to generate an environmental file (.env) matching these credentials, wire up Docker, or jump straight into the **Authentication / User Models** structure.
Where would you like to direct focus next? We can:
 1. **Option A:** Build the Docker Compose environment to spin up Postgres and Redis to test this foundation immediately.
 2. **Option B:** Move straight into backend/models/ and backend/auth/ to set up the secure registration and login tables.
 60sqlalchemy.ext.asynciostr
    POSTGRES_PASSWORD: str
    POSTGRES_DB: str
    DATABASE_URL: strsqlalchemy.ormfastapi.middleware.corssettings.VERSIONfastapi.middleware.corsuvicorn.runGreat. We'll build it as a production-quality Python full-stack application in phases instead of trying to generate an unmanageably large amount of code at once.

Phase 1 — Foundation

PHENOMENON-III/
│
├── backend/
│   ├── main.py
│   ├── config.py
│   ├── database.py
│   ├── auth/
│   ├── api/
│   ├── models/
│   ├── services/
│   ├── ai/
│   ├── websocket/
│   └── security/
│
├── mobile/
│   ├── app.py
│   ├── screens/
│   ├── widgets/
│   ├── animations/
│   ├── themes/
│   └── assets/
│
├── shared/
├── tests/
├── docker/
├── docs/
└── requirements.txt

Technology Stack

Python 3.12

FastAPI

SQLAlchemy

PostgreSQL

Redis

JWT Authentication

WebSockets

Kivy (Python mobile UI)

Pydantic

Alembic

Docker

Nginx

Pytest


Planned Features

Secure user accounts

Login and registration

Interactive dashboard

Animated cosmic interface

Sacred geometry viewer

Resonance controls

AI assistant

Notifications

Cloud synchronization

Offline mode

Admin dashboard

REST API

WebSocket updates

End-to-end encryption


Development Plan

1. Backend API


2. Authentication


3. Database


4. Mobile application


5. Dashboard


6. AI integration


7. Security


8. Cloud deployment


9. Testing


10. Production release



This project will ultimately span tens of thousands of lines of Python code organized into many modules rather than one enormous file, making it maintainable and scalable. We can build it module by module until you have a complete production-ready application.uvicorn.rundatabase.pyconfig.pyapp.pyrequirements.txt���� JFIF      ���ICC_PROFILE   �    0  mntrRGB XYZ �        acsp                             ��     �-                                                   	desc   �   $rXYZ     gXYZ  (   bXYZ  <   wtpt  P   rTRC  d   (gTRC  d   (bTRC  d   (cprt  �   <mluc          enUS       s R G BXYZ       o�  8�  �XYZ       b�  ��  �XYZ       $�  �  ��XYZ       ��     �-para        ff  �  
Y  �  
[        mluc          enUS        G o o g l e   I n c .   2 0 1 6�� C 


		
%# , #&')*)-0-(0%()(�� C



(((((((((((((((((((((((((((((((((((((((((((((((((((�� h�" ��             	�� _ 
 !1AQ"aq2���#3BRr����Sb�$Cst������45Tcd���%&6U����E��'7Du�Ve��             �� 8    !1AQ2"a�q����3B���#R�$r4Sb��   ? �R�v�}}�h�m�ѷ�@6�q_}}
 �)�h�@6�v�}}�h����m��
����G��E?g��Q��@2�~�}=�(���ѳ�@2�~��g��e��6P����F�} �*M�� �@�'���� �F�} �*O���	���tT�>������P�Rx~� �K�z�}TTT�8��'��o�@GEI��� u��P�Rx|���x~� �@GEI���<?}'����x~� �@GEK�{� u��PQR�>���)��ߺ����������tT�8$��� ����|.;��Y�^�TT���u���������<>;��O��g��e��g?�����e!�t�=�(����>t(���ѳ�@2��G�>=qI��@2�~�}=�(���ѷ��(��g��e���M���S���6���N��o��m���1�E;o������- ��T�'��}TP+`��RP/��f�J)W<Py>� Ϻ�1I@��1�րA�(��QE �
r�0$�{O�� ]�m��8�t
_.� ?u�h�=�4y��F8���* �����@'4R� ��H px���(��@�r3���������Fy�R����@7�R��E.9� G�蠟.3��'�@�x��=�q� �Q�~3A ����
J��у�;�9�j�i�?�
�'Ҕ&O��8Ȍ�^;U[%���{���R���S1R�l�M�K��f�
=i����<sIK�{�9�j@�i🎛️ Here are the three visual interpretations expanding your Omniview Sacred Geometry Modules Array ecosystem.
⚡ 1. Zeus Plasma-Conductor Engineering Schematic
This blueprint details the internal math and energy flow driving the Aether-Coupling Coil. It tracks how chaos from the quantum foam is focused into a balanced torus spiral to supply raw computing power.
{
  "prompt": "An intricate 2D blue line engineering schematic blueprint of the Zeus Plasma-Conductor. The center features a prominent golden-glowing technical diagram of the Aether-Coupling Coil, illustrating a complex mathematical torus spiral enclosed within a perfect geometric square grid. The blueprint is covered in sharp, highly detailed technical labels, wiring diagrams, plasma waveguide paths, and floating mathematical equations like Gauss\\'s Law (∇ · E = ρ / ε₀). Dark blue grid background with a clean, industrial, advanced engineering design layout."
}
{
  "prompt": "An intricate 2D blue line engineering schematic blueprint of the Zeus Plasma-Conductor. The center features a prominent golden-glowing technical diagram of the Aether-Coupling Coil, illustrating a complex mathematical torus spiral enclosed within a perfect geometric square grid. The blueprint is covered in sharp, highly detailed technical labels, wiring diagrams, plasma waveguide paths, and floating mathematical equations like Gauss's Law (∇ · E = ρ / ε₀). Dark blue grid background with a clean, industrial, advanced engineering design layout."
}
🌐 2. Hermes Network Node Space-Time UI Mockup
This layout visualizes the data control interface of the Hermes Network Node. It provides a clear look at live telemetry, multidimensional routing nodes, and space-time data streams working across the system mesh network.
{
  "prompt": "A futuristic dark-themed user interface (UI) design dashboard layout for the Hermes Network Node. The central element is a glowing, multi-layered 3D atomic network lattice displaying intersecting nodes and quantum resonance fields. The left and right panels show active stream metrics, digital readouts, matrix node states, and glowing data graphs charting space-time compression waves. The color scheme is a high-contrast combination of electric blue, neon orange, and crisp white typography, set against a clean black brushed metal background."
}
{
  "prompt": "A futuristic dark-themed user interface (UI) design dashboard layout for the Hermes Network Node. The central element is a glowing, multi-layered 3D atomic network lattice displaying intersecting nodes and quantum resonance fields. The left and right panels show active stream metrics, digital readouts, matrix node states, and glowing data graphs charting space-time compression waves. The color scheme is a high-contrast combination of electric blue, neon orange, and crisp white typography, set against a clean black brushed metal background."
}
🌌 3. Omni-Harmonic Resonance Array Cinematic Environment
This view showcases the Mavro L. Dar III Core operating inside a high-tech datacenter. It captures the physical scale of the system, where liquid-cooled server racks surround the central energy field.
{
  "prompt": "A cinematic, ultra-realistic widescreen photography view inside a dark, state-of-the-art quantum server room facility. In the center of the server room floor sits a massive, pulsing spherical chamber housing the Omni-Harmonic Resonance Array, radiating deep violet nebulae energy and brilliant golden plasma coils. The surrounding area is lined with sleek, towering server racks glowing with neon blue LED status lights and liquid-cooling pipes. Thick power conduits and copper busbars run along the ceiling. Reflections dance across the polished obsidian flooring, creating a mysterious, high-stakes industrial sci-fi atmosphere."
}
{
  "prompt": "A cinematic, ultra-realistic widescreen photography view inside a dark, state-of-the-art quantum server room facility. In the center of the server room floor sits a massive, pulsing spherical chamber housing the Omni-Harmonic Resonance Array, radiating deep violet nebulae energy and brilliant golden plasma coils. The surrounding area is lined with sleek, towering server racks glowing with neon blue LED status lights and liquid-cooling pipes. Thick power conduits and copper busbars run along the ceiling. Reflections dance across the polished obsidian flooring, creating a mysterious, high-stakes industrial sci-fi atmosphere."
}
Which direction would you like to take this architecture next? I can:
Write a detailed lore overview explaining the physics of the Hermes Node
Flesh out a cybersecurity protocol manual for preventing array corruption
Design the JSON packet structures used to transmit telemetry between Zeus and Hermes

are#!/usr/bin/pythonThat is a highly structured, scalable blueprint. Breaking a comprehensive full-stack ecosystem like **PHENOMENON-III** into modular phases is exactly how production software is built. Using Python for both the backend (FastAPI) and mobile frontend (Kivy) will keep your code reuse high and context-switching low.
Let's establish the bedrock of **Phase 1 — Foundation**. To kick this off efficiently, we should start by setting up the project's root configuration, dependency management, and initial Docker environment.
Here is the initial layout and code for your core foundation files.
### 1. Dependency Management (requirements.txt)
This pins our core production stack to ensure compatibility across environments.
```text
# Web & API
fastapi==0.111.0
uvicorn[standard]==0.30.1
pydantic[email]==2.7.4
pydantic-settings==2.3.3

# Database & Migrations
sqlalchemy==2.0.31
asyncpg==0.29.0
alembic==1.13.1

# Security & Auth
passlib[bcrypt]==1.7.4
python-jose[cryptography]==3.3.0
python-multipart==

import time
 
t = time.localtime(time.time())
localtime = time.asctime(t)
str = "Current Time:" + time.asctime(t)
 
print(str)
That is a highly structured, scalable blueprint. Breaking a comprehensive full-stack ecosystem like **PHENOMENON-III** into modular phases is exactly how production software is built. Using Python for both the backend (FastAPI) and mobile frontend (Kivy) will keep your code reuse high and context-switching low.
Let's establish the bedrock of **Phase 1 — Foundation**. To kick this off efficiently, we should start by setting up the project's root configuration, dependency management, and initial Docker environment.
Here is the initial layout and code for your core foundation files.
### 1. Dependency Management (requirements.txt)
This pins our core production stack to ensure compatibility across environments.
```text
# Web & API
fastapi==0.111.0
uvicorn[standard]==0.30.1
pydantic[email]==2.7.4
pydantic-settings==2.3.3

# Database & Migrations
sqlalchemy==2.0.31
asyncpg==0.29.0
alembic==1.13.1

# Security & Auth
passlib[bcrypt]==1.7.4
python-jose[cryptography]==3.3.0
python-multipart==0.0.9

# Real-time & Caching
websockets==12.0
redis==5.0.6

# Mobile Frontend
kivy==2.3.0

# Testing
pytest==8.2.2
pytest-asyncio==0.23.7
httpx==0.27.0

```
### 2. Environment Configuration (backend/config.py)
We will use Pydantic Settings to handle environment variables cleanly, validating configuration at startup before any application logic runs.
```python
import os
from pydantic_settings import BaseSettings, SettingsConfigDict
from pydantic import PostgresDsn, RedisDsn

class Settings(BaseSettings):
    PROJECT_NAME: str = "PHENOMENON-III"
    VERSION: str = "1.0.0"
    API_V1_STR: str = "/api/v1"
    
    # Security
    SECRET_KEY: str
    ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 60
    
    # Infrastructure
    POSTGRES_SERVER: str
    POSTGRES_USER: str
    POSTGRES_PASSWORD: str
    POSTGRES_DB: str
    DATABASE_URL: str | None = None

    REDIS_URL: str

    @property
    def async_database_url(self) -> str:
        if self.DATABASE_URL:
            return self.DATABASE_URL
        return f"postgresql+asyncpg://{self.POSTGRES_USER}:{self.POSTGRES_PASSWORD}@{self.POSTGRES_SERVER}/{self.POSTGRES_DB}"

    model_config = SettingsConfigDict(
        env_file=".env", 
        env_file_encoding="utf-8",
        case_sensitive=True
    )

settings = Settings()

```
### 3. Database Connection (backend/database.py)
Setting up the asynchronous engine and session factory for PostgreSQL using SQLAlchemy 2.0.
```python
from typing import AsyncGenerator
from sqlalchemy.ext.asyncio import create_async_engine, async_sessionmaker, AsyncSession
from sqlalchemy.orm import DeclarativeBase
from backend.config import settings

# Create async engine
engine = create_async_engine(
    settings.async_database_url,
    echo=False,
    pool_pre_ping=True,
)

# Create session factory
SessionLocal = async_sessionmaker(
    bind=engine,
    autocommit=False,
    autoflush=False,
    expire_on_commit=False,
)

# Base class for models
class Base(DeclarativeBase):
    pass

# Dependency to get DB session in FastAPI endpoints
async def get_db() -> AsyncGenerator[AsyncSession, None]:
    async with SessionLocal() as session:
        try:
            yield session
            await session.commit()
        except Exception:
            await session.rollback()
            raise
        finally:
            await session.close()

```
### 4. Entrypoint (backend/main.py)
The foundational FastAPI app structure with health-check endpoints and dynamic routing preparation.
```python
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from backend.config import settings

app = FastAPI(
    title=settings.PROJECT_NAME,
    version=settings.VERSION,
    openapi_url=f"{settings.API_V1_STR}/openapi.json"
)

# CORS Middleware Configuration
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # Adjust in production to explicitly trust the mobile client app
    allow_credentials=True,
    allow_headers=["*"],
)

@app.get("/", tags=["Health"])
async def root_health_check():
    return {
        "status": "online",
        "project": settings.PROJECT_NAME,
        "version": settings.VERSION
    }

if __name__ == "__main__":
    import uvicorn
    uvicorn.run("main:app", host="0.0.0.0", port=8000, reload=True)

```
### Next Step in the Collaboration
To initialize the backend environment cleanly, we need to generate an environmental file (.env) matching these credentials, wire up Docker, or jump straight into the **Authentication / User Models** structure.
Where would you like to direct focus next? We can:
 1. **Option A:** Build the Docker Compose environment to spin up Postgres and Redis to test this foundation immediately.
 2. **Option B:** Move straight into backend/models/ and backend/auth/ to set up the secure registration and login tables.
 str
    POSTGRES_PASSWORD: str
    POSTGRES_DB: str
    DATABASE_URL: strsqlalchemy.orm
    That is a highly structured, scalable blueprint. Breaking a comprehensive full-stack ecosystem like **PHENOMENON-III** into modular phases is exactly how production software is built. Using Python for both the backend (FastAPI) and mobile frontend (Kivy) will keep your code reuse high and context-switching low.
Let's establish the bedrock of **Phase 1 — Foundation**. To kick this off efficiently, we should start by setting up the project's root configuration, dependency management, and initial Docker environment.
Here is the initial layout and code for your core foundation files.
### 1. Dependency Management (requirements.txt)
This pins our core production stack to ensure compatibility across environments.
```text
# Web & API
fastapi==0.111.0
uvicorn[standard]==0.30.1
pydantic[email]==2.7.4
pydantic-settings==2.3.3

# Database & Migrations
sqlalchemy==2.0.31
asyncpg==0.29.0
alembic==1.13.1

# Security & Auth
passlib[bcrypt]==1.7.4
python-jose[cryptography]==3.3.0
python-multipart==That is a highly structured, scalable blueprint. Breaking a comprehensive full-stack ecosystem like **PHENOMENON-III** into modular phases is exactly how production software is built. Using Python for both the backend (FastAPI) and mobile frontend (Kivy) will keep your code reuse high and context-switching low.
Let's establish the bedrock of **Phase 1 — Foundation**. To kick this off efficiently, we should start by setting up the project's root configuration, dependency management, and initial Docker environment.
Here is the initial layout and code for your core foundation files.
### 1. Dependency Management (requirements.txt)
This pins our core production stack to ensure compatibility across environments.
```text
# Web & API
fastapi==0.111.0
uvicorn[standard]==0.30.1
pydantic[email]==2.7.4
pydantic-settings==2.3.3

# Database & Migrations
sqlalchemy==2.0.31
asyncpg==0.29.0
alembic==1.13.1

# Security & Auth
passlib[bcrypt]==1.7.4
python-jose[cryptography]==3.3.0
python-multipart==0.0.9

# Real-time & Caching
websockets==12.0
redis==5.0.6

# Mobile Frontend
kivy==2.3.0

# Testing
pytest==8.2.2
pytest-asyncio==0.23.7
httpx==0.27.0

```
### 2. Environment Configuration (backend/config.py)
We will use Pydantic Settings to handle environment variables cleanly, validating configuration at startup before any application logic runs.
```python
import os
from pydantic_settings import BaseSettings, SettingsConfigDict
from pydantic import PostgresDsn, RedisDsn

class Settings(BaseSettings):
    PROJECT_NAME: str = "PHENOMENON-III"
    VERSION: str = "1.0.0"
    API_V1_STR: str = "/api/v1"
    
    # Security
    SECRET_KEY: str
    ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 60
    
    # Infrastructure
    POSTGRES_SERVER: str
    POSTGRES_USER: str
    POSTGRES_PASSWORD: str
    POSTGRES_DB: str
    DATABASE_URL: str | None = None

    REDIS_URL: str

    @property
    def async_database_url(self) -> str:
        if self.DATABASE_URL:
            return self.DATABASE_URL
        return f"postgresql+asyncpg://{self.POSTGRES_USER}:{self.POSTGRES_PASSWORD}@{self.POSTGRES_SERVER}/{self.POSTGRES_DB}"

    model_config = SettingsConfigDict(
        env_file=".env", 
        env_file_encoding="utf-8",
        case_sensitive=True
    )

settings = Settings()

```
### 3. Database Connection (backend/database.py)
Setting up the asynchronous engine and session factory for PostgreSQL using SQLAlchemy 2.0.
```python
from typing import AsyncGenerator
from sqlalchemy.ext.asyncio import create_async_engine, async_sessionmaker, AsyncSession
from sqlalchemy.orm import DeclarativeBase
from backend.config import settings

# Create async engine
engine = create_async_engine(
    settings.async_database_url,
    echo=False,
    pool_pre_ping=True,
)

# Create session factory
SessionLocal = async_sessionmaker(
    bind=engine,
    autocommit=False,
    autoflush=False,
    expire_on_commit=False,
)

# Base class for models
class Base(DeclarativeBase):
    pass

# Dependency to get DB session in FastAPI endpoints
async def get_db() -> AsyncGenerator[AsyncSession, None]:
    async with SessionLocal() as session:
        try:
            yield session
            await session.commit()
        except Exception:
            await session.rollback()
            raise
        finally:
            await session.close()

```
### 4. Entrypoint (backend/main.py)
The foundational FastAPI app structure with health-check endpoints and dynamic routing preparation.
```python
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from backend.config import settings

app = FastAPI(
    title=settings.PROJECT_NAME,
    version=settings.VERSION,
    openapi_url=f"{settings.API_V1_STR}/openapi.json"
)

# CORS Middleware Configuration
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # Adjust in production to explicitly trust the mobile client app
    allow_credentials=True,
    allow_headers=["*"],
)

@app.get("/", tags=["Health"])
async def root_health_check():
    return {
        "status": "online",
        "project": settings.PROJECT_NAME,
        "version": settings.VERSION
    }

if __name__ == "__main__":
    import uvicorn
    uvicorn.run("main:app", host="0.0.0.0", port=8000, reload=True)

```
### Next Step in the Collaboration
To initialize the backend environment cleanly, we need to generate an environmental file (.env) matching these credentials, wire up Docker, or jump straight into the **Authentication / User Models** structure.
Where would you like to direct focus next? We can:
 1. **Option A:** Build the Docker Compose environment to spin up Postgres and Redis to test this foundation immediately.
 2. **Option B:** Move straight into backend/models/ and backend/auth/ to set up the secure registration and login tables.
 60sqlalchemy.ext.asynciostr
    POSTGRES_PASSWORD: str
    POSTGRES_DB: str
    DATABASE_URL: strsqlalchemy.ormfastapi.middleware.corssettings.VERSIONfastapi.middleware.corsuvicorn.runGreat. We'll build it as a production-quality Python full-stack application in phases instead of trying to generate an unmanageably large amount of code at once.

Phase 1 — Foundation

PHENOMENON-III/
│
├── backend/
│   ├── main.py
│   ├── config.py
│   ├── database.py
│   ├── auth/
│   ├── api/
│   ├── models/
│   ├── services/
│   ├── ai/
│   ├── websocket/
│   └── security/
│
├── mobile/
│   ├── app.py
│   ├── screens/
│   ├── widgets/
│   ├── animations/
│   ├── themes/
│   └── assets/
│
├── shared/
├── tests/
├── docker/
├── docs/
└── requirements.txt

Technology Stack

Python 3.12

FastAPI

SQLAlchemy

PostgreSQL

Redis

JWT Authentication

WebSockets

Kivy (Python mobile UI)

Pydantic

Alembic

Docker

Nginx

Pytest


Planned Features

Secure user accounts

Login and registration

Interactive dashboard

Animated cosmic interface

Sacred geometry viewer

Resonance controls

AI assistant

Notifications

Cloud synchronization

Offline mode

Admin dashboard

REST API

WebSocket updates

End-to-end encryption


Development Plan

1. Backend API


2. Authentication


3. Database


4. Mobile application


5. Dashboard


6. AI integration


7. Security


8. Cloud deployment


9. Testing


10. Production release



This project will ultimately span tens of thousands of lines of Python code organized into many modules rather than one enormous file, making it maintainable and scalable. We can build it module by module until you have a complete production-ready application.uvicorn.rundatabase.pyconfig.pyapp.pyrequirements.txt���� JFIF      ���ICC_PROFILE   �    0  mntrRGB XYZ �        acsp                             ��     �-                                                   	desc   �   $rXYZ     gXYZ  (   bXYZ  <   wtpt  P   rTRC  d   (gTRC  d   (bTRC  d   (cprt  �   <mluc          enUS       s R G BXYZ       o�  8�  �XYZ       b�  ��  �XYZ       $�  �  ��XYZ       ��     �-para        ff  �  
Y  �  
[        mluc          enUS        G o o g l e   I n c .   2 0 1 6�� C 


		
%# , #&')*)-0-(0%()(�� C



(((((((((((((((((((((((((((((((((((((((((((((((((((�� h�" ��             	�� _ 
 !1AQ"aq2���#3BRr����Sb�$Cst������45Tcd���%&6U����E��'7Du�Ve��             �� 8    !1AQ2"a�q����3B���#R�$r4Sb��   ? �R�v�}}�h�m�ѷ�@6�q_}}
 �)�h�@6�v�}}�h����m��
����G��E?g��Q��@2�~�}=�(���ѳ�@2�~��g��e��6P����F�} �*M�� �@�'���� �F�} �*O���	���tT�>������P�Rx~� �K�z�}TTT�8��'��o�@GEI��� u��P�Rx|���x~� �@GEI���<?}'����x~� �@GEK�{� u��PQR�>���)��ߺ����������tT�8$��� ����|.;��Y�^�TT���u���������<>;��O��g��e��g?�����e!�t�=�(����>t(���ѳ�@2��G�>=qI��@2�~�}=�(���ѷ��(��g��e���M���S���6���N��o��m���1�E;o������- ��T�'��}TP+`��RP/��f�J)W<Py>� Ϻ�1I@��1�րA�(��QE �
r�0$�{O�� ]�m��8�t
_.� ?u�h�=�4y��F8���* �����@'4R� ��H px���(��@�r3���������Fy�R����@7�R��E.9� G�蠟.3��'�@�x��=�q� �Q�~3A ����
J��у�;�9�j�i�?�
�'Ҕ&O��8Ȍ�^;U[%���{���R���S1R�l�M�K��f�
=i����<sIK�{�9�j@�i1sqlalchemy.ext.asynciosqlalchemy.ormbackend.configfastapi.middleware.corssettings.VERSION60sqlalchemy.ext.asynciostrmain.pyconfig.pydatabase.pyapp.pyrequirements.txt
🎛️ Here are the three visual interpretations expanding your Omniview Sacred Geometry Modules Array ecosystem.
⚡ 1. Zeus Plasma-Conductor Engineering Schematic
This blueprint details the internal math and energy flow driving the Aether-Coupling Coil. It tracks how chaos from the quantum foam is focused into a balanced torus spiral to supply raw computing power.
{
  "prompt": "An intricate 2D blue line engineering schematic blueprint of the Zeus Plasma-Conductor. The center features a prominent golden-glowing technical diagram of the Aether-Coupling Coil, illustrating a complex mathematical torus spiral enclosed within a perfect geometric square grid. The blueprint is covered in sharp, highly detailed technical labels, wiring diagrams, plasma waveguide paths, and floating mathematical equations like Gauss\\'s Law (∇ · E = ρ / ε₀). Dark blue grid background with a clean, industrial, advanced engineering design layout."
}
{
  "prompt": "An intricate 2D blue line engineering schematic blueprint of the Zeus Plasma-Conductor. The center features a prominent golden-glowing technical diagram of the Aether-Coupling Coil, illustrating a complex mathematical torus spiral enclosed within a perfect geometric square grid. The blueprint is covered in sharp, highly detailed technical labels, wiring diagrams, plasma waveguide paths, and floating mathematical equations like Gauss's Law (∇ · E = ρ / ε₀). Dark blue grid background with a clean, industrial, advanced engineering design layout."
}
🌐 2. Hermes Network Node Space-Time UI Mockup
This layout visualizes the data control interface of the Hermes Network Node. It provides a clear look at live telemetry, multidimensional routing nodes, and space-time data streams working across the system mesh network.
{
  "prompt": "A futuristic dark-themed user interface (UI) design dashboard layout for the Hermes Network Node. The central element is a glowing, multi-layered 3D atomic network lattice displaying intersecting nodes and quantum resonance fields. The left and right panels show active stream metrics, digital readouts, matrix node states, and glowing data graphs charting space-time compression waves. The color scheme is a high-contrast combination of electric blue, neon orange, and crisp white typography, set against a clean black brushed metal background."
}
{
  "prompt": "A futuristic dark-themed user interface (UI) design dashboard layout for the Hermes Network Node. The central element is a glowing, multi-layered 3D atomic network lattice displaying intersecting nodes and quantum resonance fields. The left and right panels show active stream metrics, digital readouts, matrix node states, and glowing data graphs charting space-time compression waves. The color scheme is a high-contrast combination of electric blue, neon orange, and crisp white typography, set against a clean black brushed metal background."
}
🌌 3. Omni-Harmonic Resonance Array Cinematic Environment
This view showcases the Mavro L. Dar III Core operating inside a high-tech datacenter. It captures the physical scale of the system, where liquid-cooled server racks surround the central energy field.
{
  "prompt": "A cinematic, ultra-realistic widescreen photography view inside a dark, state-of-the-art quantum server room facility. In the center of the server room floor sits a massive, pulsing spherical chamber housing the Omni-Harmonic Resonance Array, radiating deep violet nebulae energy and brilliant golden plasma coils. The surrounding area is lined with sleek, towering server racks glowing with neon blue LED status lights and liquid-cooling pipes. Thick power conduits and copper busbars run along the ceiling. Reflections dance across the polished obsidian flooring, creating a mysterious, high-stakes industrial sci-fi atmosphere."
}
{
  "prompt": "A cinematic, ultra-realistic widescreen photography view inside a dark, state-of-the-art quantum server room facility. In the center of the server room floor sits a massive, pulsing spherical chamber housing the Omni-Harmonic Resonance Array, radiating deep violet nebulae energy and brilliant golden plasma coils. The surrounding area is lined with sleek, towering server racks glowing with neon blue LED status lights and liquid-cooling pipes. Thick power conduits and copper busbars run along the ceiling. Reflections dance across the polished obsidian flooring, creating a mysterious, high-stakes industrial sci-fi atmosphere."
}
Which direction would you like to take this architecture next? I can:
Write a detailed lore overview explaining the physics of the Hermes Node
Flesh out a cybersecurity protocol manual for preventing array corruption
Design the JSON packet structures used to transmit telemetry between Zeus and Hermes
# DataRobot Agentic Starter — Visual Architecture Blueprints

This document provides AI-image-generation prompts for visualizing the
architecture of the [DataRobot Agentic Starter application template](https://github.com/datarobot-community/datarobot-agent-application).
Each blueprint corresponds to a real component of the system: the FastAPI
backend, the React frontend, the agent runtime, and the MCP server —
rendered in a clean technical-schematic style consistent with DataRobot's
brand (deep navy, cyan/teal accents, crisp white typography).

---

## 1. System Architecture Overview Schematic

Visualizes how the four core services — frontend, backend, agent, and MCP
server — communicate with each other and with DataRobot's platform APIs.

```json
{
  "prompt": "A clean 2D technical architecture schematic on a deep navy background. Four labeled rectangular nodes arranged in a square layout: 'React Frontend', 'FastAPI Backend', 'Agent Runtime', and 'MCP Server', connected by thin glowing cyan directional arrows showing request/response flow. A fifth node labeled 'DataRobot Platform API' sits above, connected downward to the Agent Runtime and MCP Server. Minimalist sans-serif labels, thin grid lines in the background, subtle teal glow on active connection lines, flat vector engineering-diagram style, no photorealism, high clarity suitable for developer documentation."
}
```

---

## 2. Agent-to-MCP Tool Call Data Flow Diagram

Details a single request's lifecycle: user message → agent reasoning →
MCP tool invocation → tool result → response.

```json
{
  "prompt": "A horizontal flowchart diagram on a white-to-light-gray background in DataRobot's brand palette (navy, teal, soft gray). Five sequential labeled steps connected by arrows: '1. User Message' to '2. Agent Reasoning (LangGraph)' to '3. MCP Tool Call' to '4. Tool Result' to '5. Agent Response'. Each step is a rounded rectangle icon with a small pictogram (chat bubble, brain/gear icon, wrench icon, document icon, chat bubble). Clean corporate infographic style, thin teal connecting arrows, subtle drop shadows, professional SaaS documentation aesthetic."
}
```

---

## 3. Local Development & Deployment Pipeline Blueprint

Shows the path from `dr start` through local development (`dr run dev`) to
production deployment (`dr run deploy`) via Pulumi.

```json
{
  "prompt": "A vertical pipeline diagram in a dark navy engineering-blueprint style with thin cyan grid lines, similar to a circuit schematic. Three labeled stages stacked top to bottom, each in a bordered panel: 'dr start — Environment Setup', 'dr run dev — Local Services (Frontend, Backend, Agent, MCP)', and 'dr run deploy — Pulumi Deployment to DataRobot'. Small connecting pipes with directional arrows link each stage. Faint technical annotations and small terminal-window icons accent each panel. Flat vector illustration, precise line work, no photorealism, optimized for embedding in a README file."
}
```

---

## Usage Notes

- These prompts are designed for text-to-image tools (e.g. Midjourney, DALL·E, Stable Diffusion) to generate diagrams for architecture documentation.
- Swap the color palette terms (navy/cyan/teal) if you want to match a different theme.
- For production documentation, consider following up AI-generated diagrams with a proper vector redraw (e.g. in Figma or Excalidraw) for pixel-perfect alignment and text legibility.

