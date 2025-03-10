import { MemorySaver } from "@langchain/langgraph";
import { createReactAgent } from "@langchain/langgraph/prebuilt";
import { ChatOllama } from "@langchain/ollama";

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
});

export default llmAgent;
