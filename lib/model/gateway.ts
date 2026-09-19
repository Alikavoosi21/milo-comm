export interface ModelInput { role: "system" | "user" | "assistant"; content: string }
export interface ModelGateway { stream(messages: ModelInput[], signal?: AbortSignal): AsyncIterable<string>; complete(messages: ModelInput[]): Promise<string> }
