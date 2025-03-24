import { MemorySaver } from "@langchain/langgraph";
import { createReactAgent } from "@langchain/langgraph/prebuilt";
import { ChatOllama } from "@langchain/ollama";
import chatAssistantTemplate from "../prompts/chatAssistant.js";

const agentCheckpointer = new MemorySaver();
const agent = new ChatOllama({
  model: "gemma2:2b",
  temperature: 0.5,
  streaming: true,
});

const llmAgent = createReactAgent({
  llm: agent,
  tools: [],
  checkpointSaver: agentCheckpointer,
  prompt: chatAssistantTemplate,
});

export default llmAgent;
