import { ChatOllama } from "@langchain/ollama";
import { ChatPromptTemplate } from "@langchain/core/prompts";
import smartReplierTemplate from "../prompts/smartReplier.js";

const model = new ChatOllama({
  model: "gemma2:2b",
  temperature: 0.9,
  format: "json",
});

export default async function generateSmartReplies(
  conversation: { sender: string; message: string }[],
  userId: string
) {
  try {
    const promptTemplate = ChatPromptTemplate.fromMessages([
      ["system", smartReplierTemplate],
    ]);

    const smartReplier = promptTemplate.pipe(model);

    const response = await smartReplier.invoke(
      { conversation },
      { configurable: { threadId: userId } }
    );

    let parsedResponse;

    try {
      parsedResponse = JSON.parse(response.content.toString());
      parsedResponse["replies"];
    } catch (error) {
      throw Error(`Error parsing json: ${error}`);
    }

    return parsedResponse.replies;
  } catch (error) {
    console.error("Error generating smart replies:", error);
    return ["Vibe check failed", "Tea’s cold now", "You good, fam?"];
  }
}
