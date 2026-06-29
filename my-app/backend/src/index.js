import express from 'express';
const app = express();
const PORT = 3000;
import cors from 'cors'
import { GoogleGenAI } from '@google/genai';
import * as fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url';
import { exec, execSync } from 'child_process';
import dotenv from 'dotenv'

app.use(express.json())
app.use(cors())

dotenv.config()

//const client = new GoogleGenAI({ apiKey: JSON.stringify(process.env.GEMINI_API_KEY) })

const client = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const SANDBOX_ROOT = path.resolve(__dirname, '../../../sandbox/');

function sandboxPath(relativePath = '') {
  const fullPath = path.resolve(SANDBOX_ROOT, relativePath);

  if (!fullPath.startsWith(path.resolve(SANDBOX_ROOT))) {
    throw new Error('Path escapes sandbox');
  }

  return fullPath;
}

async function askGemini(prompt) {
  const response = await client.models.generateContent({
    model: process.env.MODEL,
    contents: prompt
  })
  console.log(response.text)
  return response;
}

function ReadDirectoryFunction(filePath) {
  const fullPath = sandboxPath(filePath)
  try {
    const files = fs.readdirSync(fullPath)
    return files
  } catch (error) {
    return error
  }
}

const readDirectoryTool = {
  type: "function",
  name: "read_directory",
  description: "List files and folders inside a sandbox directory",
  parameters: {
    type: "OBJECT",
    properties: {
      folderPath: {
        type: "string",
      }
    },
    required: ["folderPath"]
  }
};

const readFileTool = {
  type: "function",
  name: "read_file",
  description: "Read contents of a file inside sandbox",
  parameters: {
    type: "OBJECT",
    properties: {
      filePath: {
        type: "STRING",
        description: "Path and name of file inside sandbox"
      },
    },
    required: ["filePath"]
  }
};

function WriteFileFunction(filePath, data) {
  const fullPath = sandboxPath(filePath)
  const dir = path.dirname(fullPath)
  fs.mkdirSync(dir, { recursive: true })
  fs.writeFileSync(fullPath, data, 'utf-8');
  return `wrote file ${filePath}`
}

const writeFileTool = {
  type: "function",
  name: "write_file",
  description: "Create or overwrite a file inside sandbox",
  parameters: {
    type: "OBJECT",
    properties: {
      filePath: {
        type: "STRING",
        description: "path of the file inside sandbox"
      },
      content: {
        type: "STRING",
        description: "content of the file that is been written in sandbox"
      },
    },
    required: ["filePath", "content"]
  }
};

function bashCommandCallTool(bashCommand, folderPath = '') {
  const fullPath = sandboxPath(folderPath)
  const cleanedCommand = bashCommand.trim();

  if (cleanedCommand.includes('npm run dev') || cleanedCommand.includes('pnpm dev')) {
    exec(cleanedCommand, { cwd: fullPath })
    return "Development server startup sequence initialized on background port."
  }

  try {
    const output = execSync(cleanedCommand, {
      cwd: fullPath,
      encoding: 'utf-8',
      timeout: 30000
    })
    return output || "command executed successfully with no output"
  } catch (err) {
    return `Command failed: ${err.message}. Stderr: ${err.stderr || ''}`
  }

}

const createFolderTool = {
  type: "function",
  name: "create_folder",
  description: "Create a directory inside sandbox",
  parameters: {
    type: "OBJECT",
    properties: {
      folderPath: {
        type: "STRING",
        description: "folderPath and name of the folder to be created"
      }
    },
    required: ["folderPath"]
  }
};

const deleteFileTool = {
  type: "function",
  name: "delete_file",
  description: "Delete a file inside sandbox",
  parameters: {
    type: "OBJECT",
    properties: {
      filePath: {
        type: "STRING",
        description: "Path and name of the file to be deleted and it should and only be of paths inside sandbox"
      },
    },
    required: ["filePath"]
  }
};

const runBashTool = {
  type: "function",
  name: "run_bash",
  description: "Run a bash command inside sandbox folder only",
  parameters: {
    type: "OBJECT",
    properties: {
      command: {
        type: "STRING",
        description: "Shell command to run"
      },
      cwd: {
        type: "STRING",
        description: "Working directory inside sandbox, defaults to sandbox/"
      }
    },
    required: ["command"]
  }
};

const initNodeProject = {
  type: "function",
  name: "init_node_project",
  description: "run npm init -y on sandbox folder",
  parameters: {
    type: "OBJECT",
    properties: {
      folderPath: {
        type: "STRING"
      }
    },
    required: ["folderPath"]
  }
};

const installPackageTool = {
  type: "function",
  name: "install_package",
  description: "Install npm packages inside sandbox project using pnpm",
  parameters: {
    type: "OBJECT",
    properties: {
      packageName: {
        type: "STRING"
      }
    },
    required: ["packageName"]
  }
};

/*
const scaffoldViteProjectTool = {
  type: "function",
  name: "scaffold_vite_project",
  description: "Scaffolds a fresh React + Vite project directly in the root sandbox folder automatically.",
  parameters: { type: "OBJECT", properties: {} }
};
*/

const startDevServerTool = {
  type: "function",
  name: "start_development_server",
  description: "Starts the Vite development server on port 5170 in the background.",
  parameters: { type: "OBJECT", properties: {} }
};

function execFunctions(toolName, args) {
  switch (toolName) {
    case "install_package":
      return bashCommandCallTool(`pnpm i ${args.packageName}`, '')
    case "init_node_project":
      return bashCommandCallTool(`cd ${args.folderPath} && npm init -y`, '')
    case "run_bash":
      return bashCommandCallTool(args.command, args.cwd || '')
    case "delete_file":
      fs.unlinkSync(sandboxPath(args.filePath))
      return `Deleted ${args.filePath}`
    case "create_folder":
      fs.mkdirSync(
        sandboxPath(args.folderPath)
        , { recursive: true }
      );
      return `Created folder ${args.folderPath}`
    case "write_file":
      return WriteFileFunction(args.filePath, args.content);
    case "read_file":
      return fs.readFileSync(
        sandboxPath(args.filePath),
        "utf-8"
      );
    case "read_directory":
      return ReadDirectoryFunction(args.folderPath);
    case "start_development_server":
      try {
        execSync('npx --yes kill-port 5170', { stdio: 'ignore' })
      } catch (e) {
        // ignore
      }

      exec('npx --yes serve . -l 5170', {
        cwd: SANDBOX_ROOT,
        detached: true,
        stdio: 'ignore'
      })
      return "Static server running on port 5170"
    default:
      return "not a tool call" + toolName
  }
}

const geminiTools = [readDirectoryTool, readFileTool, writeFileTool, createFolderTool, deleteFileTool, runBashTool,
  initNodeProject, installPackageTool, startDevServerTool]

const systemInstruction = `
You are an expert web developer. Your goal is to build simple, beautiful websites using ONLY plain HTML, CSS, and JavaScript. 
CRITICAL RULES:
1. DO NOT use React, Vite, or any build tools/frameworks.
2. Build the website by creating an 'index.html', 'style.css', and 'script.js' file in the sandbox root.
3. Serve the website using the 'start_development_server' tool.
4. Ensure your server maps to port 5170.
5. You are responsible for writing valid, clean HTML5, CSS3, and modern Vanilla JS.
`;

app.post('/', async (req, res) => {
  const prompt = req.body.prompt
  console.log(prompt)
  const GeminiModel = 'gemini-3.1-flash-lite'

  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache');
  res.setHeader('Connection', 'keep-alive');

  try {
    let interaction = await client.interactions.create({
      model: GeminiModel,
      input: `${systemInstruction}\n\n${prompt}`,
      tools: geminiTools,
      generation_config: { tool_choice: 'auto' }
    });

    let keepLooping = true;
    let iteration = 0;
    const maxIteration = 10;

    while (keepLooping && iteration < maxIteration) {
      iteration++;
      let toolCall = false

      if (interaction && interaction.steps) {
        for (const step of interaction.steps) {
          console.log(step)
          res.write(`data: ${JSON.stringify({ type: 'step', step })}\n\n`);
          if (step.type === 'function_call') {
            toolCall = true;
            let result = execFunctions(step.name, step.arguments)

            const functionResult = typeof result === 'object' ? JSON.stringify(result) : String(result)
            res.write(`data: ${JSON.stringify({ type: 'tool_output', name: step.name, result: functionResult })}\n\n`);

            interaction = await client.interactions.create({
              model: GeminiModel,
              previous_interaction_id: interaction.id,
              tools: geminiTools,
              input: {
                type: 'function_result',
                name: step.name,
                call_id: step.id,
                result: functionResult
              }
            });
            break;
          }
        }
      }

      if (!toolCall) {
        keepLooping = false
      }

    }
    res.write(`data: ${JSON.stringify({ type: 'final', text: interaction.output_text || "Done!" })}\n\n`);
    res.end();
  } catch (error) {
    console.log(error)
    res.write(`data: ${JSON.stringify({ type: 'error', message: error.message })}\n\n`);
    res.end();
  }
});


app.listen(PORT, () => {
  console.log(`Server running at http://localhost:${PORT}`);
});   
