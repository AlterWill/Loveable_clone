# Loveable Clone

An interactive, AI-powered web development workspace that enables developers to design, preview, and iterate on web applications in real time using natural language. The system coordinates file manipulation, dependency installation, and static server hosting by exposing system tools directly to a stateful Google Gemini model.

> A self-contained agentic web workspace executing LLM-generated code in isolated live previews.

[![Node.js Version](https://img.shields.io/badge/node-%3E%3D%2018.0.0-blue.svg)](https://nodejs.org/)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
[![Tailwind CSS v4](https://img.shields.io/badge/Tailwind_CSS-v4.0-38bdf8.svg)](https://tailwindcss.com/)
[![React Version](https://img.shields.io/badge/React-19.0.0-61dafb.svg)](https://react.dev/)
[![Vite Version](https://img.shields.io/badge/Vite-8.0.0-646cff.svg)](https://vite.dev/)

---

## Demo

* **Workspace UI**: `assets/workspace_preview.png`
* **Interactive Generation Cycle**: `assets/generation_cycle.gif`

---

## Features

| Feature | Description | Why it matters |
| :--- | :--- | :--- |
| **Real-time SSE Streaming** | Streams step-by-step tool executions and LLM outputs to the browser using Server-Sent Events. | Keeps the UI responsive and provides immediate progress feedback during long-running tasks. |
| **Isolated Execution Sandbox** | Directs the model's filesystem writes to a dedicated `sandbox/` directory outside the app workspace. | Prevents file contamination and keeps the generated project separate from the application workspace. |
| **Agentic Tool Loop** | Exposes system-level tools (file writes, directory indexing, server control) to a stateful Gemini model interaction loop. | Enables the model to execute commands, read its own output, and self-correct errors during setup. |
| **Active Port Recycling** | Automatically kills previous active server instances before spawning a new one. | Avoids process conflicts and socket bind errors during iteration cycles. |
| **Watch-State Isolation** | Excludes the `sandbox/` directory from client (Vite) and backend (Nodemon) watch configurations. | Stops the development toolchain from reloading the workspace during rapid file writes. |

---

## Tech Stack

* **React 19**: Chosen to manage workspace state, render execution logs in real-time, and handle dynamic iframe reload triggers.
* **Express 5.x**: Used as the backend gateway to interface with the LLM API and establish a unidirectional Server-Sent Events (SSE) stream to the client.
* **Vite 8**: Serves as the dev server and bundler, selected for its fast Hot Module Replacement (HMR) and custom directory watcher configurations.
* **Tailwind CSS v4**: Selected for utility-first styling with a high-performance build engine to maintain rapid development cycles.
* **Google GenAI SDK**: Integrates the stateful Gemini model natively using conversation-based interactions for seamless multi-turn tool use.

---

## Architecture

This project is organized into three primary architectural boundaries: the React client workspace, the Express backend gateway, and an isolated sandbox directory. The frontend interface runs on port `5173`, the backend control server runs on port `3000`, and the generated static assets are served from within the sandbox on port `5170`.

The workspace uses a unidirectional event loop driven by Server-Sent Events (SSE). When the user submits a text prompt, the client sends a `POST` request to the backend. The backend constructs a stateful agent session utilizing the Google GenAI SDK and initiates the conversation.

As the Gemini model executes its instruction steps, it calls tools to write files, read directory contents, or spin up servers. The backend executes these file operations inside the sandbox, captures the results, streams the execution logs to the frontend via SSE, and feeds the outputs back to the Gemini model to continue the loop. Once the server starts, the client reloads the preview iframe to display the newly built site.

---

## Project Structure

```
.
├── my-app/
│   ├── backend/
│   │   └── src/
│   │       └── index.js         # Express server, SSE endpoint, and Gemini tool execution
│   ├── frontend/
│   │   └── src/
│   │       ├── App.jsx          # Chat workspace UI, SSE consumer, and preview iframe
│   │       └── index.css        # Tailwind directives
│   ├── nodemon.json             # Excludes sandbox from backend reload watches
│   ├── package.json             # Workspace dependencies and start scripts
│   └── vite.config.js           # Excludes sandbox from HMR file watches
└── sandbox/
    └── .gitkeep                 # Isolated destination directory for LLM-generated sites
```

---

## Installation

### Prerequisites

* **Node.js**: `v18.0.0` or higher
* **pnpm**: `v9.0.0` or higher
* **Gemini API Key**: Obtain a key from [Google AI Studio](https://aistudio.google.com/)

### Environment Variables

Create a `.env` file in the `my-app/` directory:

```env
GEMINI_API_KEY="YOUR_GEMINI_API_KEY"
MODEL="gemini-2.5-flash"
```

### Installation Steps

```bash
# Clone the repository
git clone https://github.com/your-username/loveable-clone.git
cd loveable-clone

# Install dependencies
cd my-app
pnpm install
```

### Run Commands

Start the backend server and frontend client in separate terminal windows:

```bash
# Terminal 1: Start Backend (localhost:3000)
pnpm server

# Terminal 2: Start Frontend (localhost:5173)
pnpm dev
```

---

## Interesting Implementation Details

### Path Traversal Mitigation

To prevent the agentic LLM from reading or writing files outside the workspace, the backend validates all file operations against a strict sandbox root boundary. By resolving requested paths to absolute paths and checking that they prefix-match the sandbox root, any unauthorized filesystem escapes are immediately blocked with an error. This secures the host machine from path traversal vulnerabilities during automated execution.

### Watch-Loop Prevention

Writing generated files to the sandbox folder triggers filesystem events that would ordinarily cause Vite and Nodemon to restart. To prevent infinite reload loops and maintain session state, the `sandbox/` directory is explicitly ignored in the watcher configurations of both dev tools. This isolates the runtime environment from the application development lifecycle.

### Decoupled Port Recycling

The backend recycles development servers by programmatically terminating active socket bindings on port `5170` before spawning new instances. Static servers are launched as detached child processes with standard streams ignored to prevent the Node event loop from blocking or hanging on child process logs. This allows the backend to return tool execution results instantly without waiting for the server to exit.

### Reactive Client-Side Iframe Remounting

Because security policies prevent the parent React application from detecting when an iframe's port becomes responsive, the client forces a remount of the viewport component. A state key is incremented after a fixed timeout following a server restart, forcing the browser to fetch fresh assets. This guarantees that the live preview stays synchronized with the agent's filesystem updates.

---

## Future Improvements

* **Containerized Sandboxing**: Run the generated apps in isolated, secure Docker containers instead of a local filesystem directory.
* **WebSocket Gateway**: Migrate from Server-Sent Events to full-duplex WebSockets to stream stdout/stderr logs dynamically from running child processes.
* **Dynamic Package Management**: Allow the LLM to inspect, install, and update required npm packages programmatically during the generation loop.

---

## Contributing

1. Fork the repository.
2. Create a feature branch (`git checkout -b feature/cool-feature`).
3. Commit your changes (`git commit -m "feat: add cool feature"`).
4. Push to the branch and open a Pull Request.

---

## License

This project is licensed under the MIT License - see the `LICENSE` file for details.
