import { BaseCallbackHandler } from "@langchain/core/callbacks/base";
import { Response } from "express";

export class StreamHandler extends BaseCallbackHandler {
  name = "stream_handler";
  private res: Response;
  private predecessor: string;

  constructor(res: Response, predecessor: string) {
    super();
    this.res = res;
    this.predecessor = predecessor;
  }

  async handleLLMNewToken(token: string) {
    this.res.write(`${this.predecessor}: ${token}\u001D`);
  }
}
