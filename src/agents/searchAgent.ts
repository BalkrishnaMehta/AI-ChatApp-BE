import { TavilySearchResults } from "@langchain/community/tools/tavily_search";
import { ChatOllama } from "@langchain/ollama";
import { MemorySaver } from "@langchain/langgraph";
import { createReactAgent } from "@langchain/langgraph/prebuilt";
const tools = [new TavilySearchResults({ maxResults: 3 })];

const model = new ChatOllama({
  model: "llama3.2:1b",
  temperature: 0.5,
  streaming: true,
});

const agentCheckpointer = new MemorySaver();

const searchAgent = createReactAgent({
  llm: model,
  tools,
  checkpointSaver: agentCheckpointer,
});

export default searchAgent;
