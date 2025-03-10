import { Annotation } from "@langchain/langgraph";
import { ChatOllama } from "@langchain/ollama";
import { ChatPromptTemplate } from "@langchain/core/prompts";
import { RunnableConfig } from "@langchain/core/runnables";
import { END, START, StateGraph } from "@langchain/langgraph";
import { MemorySaver } from "@langchain/langgraph";
import { Response } from "express";
import tools from "../Neuron/tools.js";
import { StreamHandler } from "../utils/streamHandler.js";
import toolExecutionTemplate from "../prompts/toolExecution.js";
import solverTemplate from "../prompts/solver.js";

const regexPattern = new RegExp(
  /(?:##\s*Plan\s*\d*:?|Plan\s*\d*:)?\s*(?:\*\*)?(?:Plan:)?(?:\*\*)?\s*([^#\n]*?)(?:\n|\s*\*\*)*\s*(?:\*\*)?(#E\d+)?\s*=?\s*(\w+)\s*\[\s*(\{(?:[^{}]|(?:\{[^{}]*\}))*\})\s*\]/gm
);

const agentCheckpointer = new MemorySaver();

const GraphState = Annotation.Root({
  task: Annotation<string>({
    reducer: (x, y) => y ?? x,
    default: () => "",
  }),
  userId: Annotation<string>({
    reducer: (x, y) => y ?? x,
    default: () => "",
  }),
  planString: Annotation<string>({
    reducer: (x, y) => y ?? x,
    default: () => "",
  }),
  steps: Annotation<string[][]>({
    reducer: (x, y) => x.concat(y),
    default: () => [],
  }),
  results: Annotation<Record<string, any>>({
    reducer: (x, y) => ({ ...x, ...y }),
    default: () => ({}),
  }),
  result: Annotation<string>({
    reducer: (x, y) => y ?? x,
    default: () => "",
  }),
  responseObject: Annotation<Response | null>({
    reducer: (x, y) => y ?? x,
    default: () => null,
  }),
});

const model = new ChatOllama({
  model: "gemma2:2b",
  temperature: 0,
});

const promptTemplate = ChatPromptTemplate.fromMessages([
  ["human", toolExecutionTemplate],
]);

const planner = promptTemplate.pipe(model);

async function getPlan(
  state: typeof GraphState.State,
  config?: RunnableConfig
) {
  console.log("---GET PLAN---");
  const task = state.task;
  const userId = state.userId;

  try {
    const result = await planner.invoke({ task, userId }, config);
    const matches = Array.from(
      result.content.toString().matchAll(regexPattern)
    );

    if (matches.length === 0) {
      throw new Error(
        "No valid steps found in the generated plan. Plan parsing failed."
      );
    }

    let steps: string[][] = matches.map((match) => {
      const item = [
        match[1].trim(), // Plan Title
        match[2]?.trim() || "", // Step ID (e.g., #E1)
        match[3], // Function Name (e.g., SearchUserByName)
        match[4], // Parameters (JSON string)
      ];

      if (item.some((i) => i === undefined)) {
        throw new Error("Invalid plan step format detected during parsing.");
      }
      return item;
    });

    return {
      steps,
      planString: result.content.toString(),
    };
  } catch (error) {
    // console.error("Plan Generation Error:", error);
    throw new Error(`Failed to generate plan: ${(error as Error).message}`);
  }
}

const _getCurrentTask = (state: typeof GraphState.State) => {
  if (!state.results) {
    return 1;
  }
  if (Object.entries(state.results).length === state.steps.length) {
    return null;
  }
  return Object.entries(state.results).length + 1;
};

const _parseResult = (input: unknown) => {
  if (input && typeof input === "object" && "content" in input) {
    const { content } = input;
    return content;
  }

  return input;
};

const toolMap = new Map(tools.map((tool) => [tool.name, tool]));

async function toolExecution(
  state: typeof GraphState.State,
  config?: RunnableConfig
) {
  console.log("---EXECUTE TOOL---");

  try {
    const _step = _getCurrentTask(state);
    if (_step === null) {
      throw new Error("Workflow execution failed: No current task found");
    }

    const [_, stepName, toolName, toolInputTemplate] = state.steps[_step - 1];
    let toolInput = toolInputTemplate;
    const _results = state.results || {};

    for (const [k, v] of Object.entries(_results)) {
      toolInput = toolInput.replace(k, v);
    }

    let result;
    if (toolName === "LLM") {
      result = await model.invoke(toolInput, config);
    } else if (toolMap.has(toolName)) {
      let parsedInput;
      try {
        parsedInput = JSON.parse(toolInput);
      } catch (e) {
        throw new Error(
          `Tool execution failed: Invalid JSON input for tool ${toolName}. Input: ${toolInput}`
        );
      }

      const tool = toolMap.get(toolName);
      if (!tool) {
        throw new Error(`Tool execution failed: Tool not found - ${toolName}`);
      }

      try {
        result = await tool.invoke(parsedInput, config);
      } catch (error) {
        throw new Error(
          `Tool execution failed for ${toolName}: ${(error as Error).message}`
        );
      }
    } else {
      throw new Error(`Tool execution failed: Unsupported tool - ${toolName}`);
    }

    _results[stepName] = JSON.stringify(_parseResult(result), null, 2);
    return { results: _results };
  } catch (error) {
    // console.error("Tool Execution Error:", error);
    throw error;
  }
}

const solvePrompt = ChatPromptTemplate.fromTemplate(solverTemplate);

async function solve(state: typeof GraphState.State, config?: RunnableConfig) {
  console.log("---SOLVE---");
  const _results = state.results || {};

  const lastKey = Object.keys(_results)[Object.keys(_results).length - 1];
  const lastResult = _results[lastKey];

  const solverModel = new ChatOllama({
    temperature: 0,
    model: "gemma2:2b",
  });

  const callbacks = [];
  if (state.responseObject) {
    callbacks.push(new StreamHandler(state.responseObject, "data"));
  }

  const invokeConfig = {
    ...(config || {}),
    ...(callbacks.length > 0 ? { callbacks } : {}),
  };

  const result = await solvePrompt
    .pipe(solverModel)
    .invoke({ task: state.task, agent_response: lastResult }, invokeConfig);

  return {
    result: result.content.toString(),
  };
}

const _route = (state: typeof GraphState.State) => {
  console.log("---ROUTE TASK---");

  try {
    const _step = _getCurrentTask(state);
    if (_step === null) {
      return "solve";
    }
    return "tool";
  } catch (error) {
    // console.error("Routing Error:", error);
    throw new Error(`Workflow routing failed: ${(error as Error).message}`);
  }
};

const workflow = new StateGraph(GraphState)
  .addNode("plan", getPlan)
  .addNode("tool", toolExecution)
  .addNode("solve", solve)
  .addEdge("plan", "tool")
  .addEdge("solve", END)
  .addConditionalEdges("tool", _route)
  .addEdge(START, "plan");

const toolAgent = workflow.compile();

export default toolAgent;
