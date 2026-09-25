import { MarkdownTextSplitter, RecursiveCharacterTextSplitter, TokenTextSplitter } from "@langchain/textsplitters";
import { Document } from "@langchain/core/documents";
import { defaultRagSettings, type RagSettings } from "./settings";

export async function splitKnowledgeDocuments(
  documents: Document[], sourceId: string, sourceName: string, sourceVersion: number,
  settings: RagSettings = defaultRagSettings
): Promise<Document[]> {
  const options = { chunkSize: settings.chunkSize, chunkOverlap: settings.overlap };
  const splitter = settings.strategy === "markdown" ? new MarkdownTextSplitter(options)
    : settings.strategy === "token" ? new TokenTextSplitter(options)
    : new RecursiveCharacterTextSplitter(options);
  const inputs = settings.strategy === "paragraph" ? documents.flatMap((document) =>
    document.pageContent.split(/\n\s*\n+/u).map((paragraph) => paragraph.trim()).filter(Boolean)
      .map((paragraph) => new Document({ pageContent: paragraph, metadata: document.metadata }))) : documents;
  const pieces = await splitter.splitDocuments(inputs);
  return pieces.map((document, chunkIndex) => new Document({
    pageContent: document.pageContent,
    metadata: { ...document.metadata, sourceId, sourceName, sourceVersion, chunkIndex },
  }));
}

export async function splitKnowledge(text: string, sourceId: string, sourceName: string, sourceVersion: number): Promise<Document[]> {
  return splitKnowledgeDocuments([new Document({ pageContent: text, metadata: {} })], sourceId, sourceName, sourceVersion);
}
