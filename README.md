# 💖 Loveable Clone

An interactive AI-powered web development workspace that allows you to build, preview, and iterate on web applications using natural language. Under the hood, it harnesses the power of the Gemini API and custom agentic tools to write, modify, and host static websites dynamically.

---

## 📂 Repository Structure

The project is structured into three main parts:

```
├── my-app/                # The main application codebase (Frontend & Backend)
│   ├── backend/           # Express server that interfaces with Gemini API and runs system commands
│   ├── frontend/          # React + Vite chat interface and live preview iframe
│   └── package.json       # App configuration and startup scripts
│
├── sandbox/               # The dynamic execution environment (Where the AI builds code)
│   └── .gitkeep           # Keeps the sandbox directory tracked in Git
│
└── README.md              # This documentation file
```

---

## ❓ Why was the `sandbox/` folder missing from the Git repository?

In Git, **empty directories are not tracked**. 

Because the `sandbox/` directory is designed to be a clean, blank slate where the AI dynamically writes `index.html`, `style.css`, and `script.js` files at runtime, it starts completely empty. As a result, it was not tracked or pushed to the remote repository. 

### 🔧 The Solution
We have added a `.gitkeep` file inside the `sandbox/` directory. This allows Git to track the directory outline while keeping it ready for the AI to use.

---

## 🚀 Setup and Installation

### Prerequisites
- [Node.js](https://nodejs.org/) (v18 or higher recommended)
- [pnpm](https://pnpm.io/) (used for package management)
- A **Gemini API Key** from Google AI Studio

### 1. Configuration
Navigate to the `my-app/` directory and configure your environment variables:
1. Open `my-app/.env`.
2. Add your Gemini API key:
   ```env
   GEMINI_API_KEY="your-gemini-api-key-here"
   MODEL="gemini-2.5-flash"
   ```

### 2. Install Dependencies
From the root directory, install all required dependencies:
```bash
cd my-app
pnpm install
```

### 3. Run the Application
You will need to run both the backend server and the frontend client.

- **Start the Backend Server (Port 3000):**
  ```bash
  pnpm server
  ```
- **Start the Frontend App (Vite Dev Server):**
  ```bash
  pnpm dev
  ```

---

## 🧠 How it Works

1. **User Prompt:** The user types a request in the frontend (e.g., *"Create a dashboard with a dark mode toggle"*).
2. **Gemini Agent Processing:** The request is sent to the Express backend, which wraps it in system instructions and exposes a set of custom tools to Gemini:
   - `read_directory` / `read_file`
   - `write_file` / `delete_file`
   - `create_folder`
   - `run_bash`
   - `install_package` / `init_node_project`
   - `start_development_server`
3. **Sandbox Generation:** The Gemini model uses the `write_file` tool to create vanilla web files (`index.html`, `style.css`, `script.js`) inside the `sandbox/` directory.
4. **Live Preview:** The agent starts a local static server on port `5170` inside the `sandbox/` folder. The React frontend automatically refreshes and displays the running site in an `iframe` side-by-side with the chat.
