import { open } from "node:fs/promises";
import * as fs from "fs";

export interface Consumer<T> {
  (x: T): void;
}

// Unsupported in bun
const consumeFileLines = async (
  filePath: string,
  lineConsumer: Consumer<string>
): Promise<void> => {
  const file = await open(filePath);
  for await (const line of file.readLines()) {
    lineConsumer(line);
  }
};

// Unsupported in bun
/*const getFileLines = async (filePath: string): Promise<string[]> => {
  const file = await open(filePath);
  const fileLines: string[] = [];
  for await (const line of file.readLines()) {
    fileLines.push(line);
  }
  return fileLines;
};*/

export const readFileSync = (filePath: string): string => {
  // assuming UTF-8 should be okay
  return fs.readFileSync(filePath, "utf8");
};

export const getFileLines = (filePath: string): string[] => {
  return splitLines(readFileSync(filePath));
};

export const splitLines = (fileContent: string): string[] => {
  return fileContent.split("\n");
};

export const joinFileLines = (fileLines: string[]): string => {
  return fileLines.join("\n");
};
