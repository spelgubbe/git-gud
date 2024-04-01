import { codeToHtml, ShikiTransformer } from "shiki";

import {
  getDiffPairsForCurrentDiff,
  getDiffPairsForDiff,
} from "./DiffPairProducer";

import { transformerRenderWhitespace } from "@shikijs/transformers";

import {
  DiffPair,
  FileWithDeletions,
  FileWithInsertions,
  FileWithDiff,
  FileType,
} from "./types/difftypes";

import { Pair, CodeBlock } from "./types/common";

import { getGrepResults } from "./GitSearchUtil";

export const highlightLine = async (
  lang: string,
  lineContent: string
): Promise<string> => {
  // this may be slow as codeToHtml might not work if called in parallel
  return await codeToHtml(lineContent, {
    lang: lang,
    theme: "monokai",
    transformers: [],
  });
};
