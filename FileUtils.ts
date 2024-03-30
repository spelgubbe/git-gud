import { open } from 'node:fs/promises';

export interface Consumer<T> {
    (x: T): void;
}

export const consumeFileLines = async (filePath: string, lineConsumer: Consumer<string>): Promise<void> => {
    const file = await open (filePath);
    for await (const line of file.readLines()) {
        lineConsumer (line)
    }
}

export const getFileLines = async (filePath: string): Promise<string[]> => {
    const file = await open (filePath);
    const fileLines: string[] = []
    for await (const line of file.readLines()) {
        fileLines.push (line)
    }
    return fileLines
}

export const joinFileLines = (fileLines: string[]): string => {
    return fileLines.join ('\n')
}