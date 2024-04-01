//import rehypeStringify from 'rehype-stringify'
import { codeToHtml } from "shiki";

// new stuff

// use helpers to make the code cleaner

import * as FileUtils from "../FileUtils";

import {
  transformerNotationDiff,
  // ...
} from "@shikijs/transformers";

import { FileWithDiff, FileType } from "../types/difftypes";

const getDecoratedFileHTML = async (
  fileWithDiff: FileWithDiff,
  lang: string
): Promise<string> => {
  console.log("Language is: " + lang);
  const codeContent = fileWithDiff.content;
  const fileLines: string[] = FileUtils.splitLines(codeContent);

  let diffDecoratedFileLines: string[] = await decorateInsertionsOrDeletions(
    fileLines,
    fileWithDiff
  );

  //console.log("diff decorated lines:", diffDecoratedFileLines);

  // collect lines into one string
  const diffDecoratedFileContent = FileUtils.joinFileLines(
    diffDecoratedFileLines
  );

  const transformedHtml = await decorateWithDiffTransformer(
    diffDecoratedFileContent,
    lang
  );

  return transformedHtml;
};

// decorate inserted lines with comments at the end "// [!code ++]"
const decorateLineDeletions = async (
  fileLines: string[],
  lineNumbers: number[]
): Promise<string[]> => {
  const suffix = "/* [!code --] */";
  return suffixLines(fileLines, lineNumbers, suffix, true);
};

// decorate deleted lines with comments at the end "// [!code --]"
const decorateLineInsertions = async (
  fileLines: string[],
  lineNumbers: number[]
): Promise<string[]> => {
  const suffix = "/* [!code ++] */";
  return suffixLines(fileLines, lineNumbers, suffix, true);
};

const suffixLines = async (
  fileLines: string[],
  lineNumbers: number[],
  suffix: string,
  oneIndexed: boolean
): Promise<string[]> => {
  //for (codeFileContent)
  //const fileLines: string[] = await FileUtils.getFileLines (codeFileContent)
  const newFileLines: string[] = [];
  const offset: number = oneIndexed ? 1 : 0;
  for (
    let lineNumber: number = 0;
    lineNumber < fileLines.length;
    lineNumber++
  ) {
    // TODO: Set<number> is better time complexity here
    const oldLineContent: string = fileLines[lineNumber];
    if (lineNumbers.includes(lineNumber + offset)) {
      const newLineContent: string = oldLineContent + suffix;
      newFileLines.push(newLineContent);
    } else {
      newFileLines.push(oldLineContent);
    }
    // this loop is unnecessary copying
  }
  return newFileLines;
};

// this fails in nested comments and similar
const decorateWithDiffTransformer = async (
  codeContent: string,
  // ska handla!
  lang: string
): Promise<string> => {
  const html = await codeToHtml(codeContent, {
    lang: lang,
    theme: "nord",
    transformers: [transformerNotationDiff()],
  });
  return html;
};

const decorateInsertionsOrDeletions = async (
  fileLines: string[],
  fileWithDiff: FileWithDiff
): Promise<string[]> => {
  switch (fileWithDiff.fileType) {
    case FileType.HAS_DELETIONS: {
      return await decorateLineDeletions(fileLines, fileWithDiff.deletedLines);
    }
    case FileType.HAS_INSERTIONS: {
      return await decorateLineInsertions(
        fileLines,
        fileWithDiff.insertedLines
      );
    }
  }
  console.log("No case was hit");
  console.log("fileWithDiff: ");
  console.log(fileWithDiff);
};
