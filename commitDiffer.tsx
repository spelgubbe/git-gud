//import rehypeStringify from 'rehype-stringify'
import { Hono } from "hono";
import { serveStatic } from "hono/bun";
import { codeToHtml, ShikiTransformer } from "shiki";
import {
  addDiffInsertedTransformer,
  addDiffDeletedTransformer,
} from "./shiki-transformers";

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

import {
  Head,
  DiffHolder,
  FullDiffPage,
  FullGitGrepPage,
  GitGrepResultHolder,
  GitGrepLineHolder,
} from "./components";

// TODO: handle when files are renamed (atm previous file is 1 empty line)

function createHtml(text: string) {
  return { __html: text };
}

const getCodeBlocksForDiffPairs = async (
  diffPairs: DiffPair<FileWithDeletions, FileWithInsertions>[]
) => {
  const htmlPairs: Pair<CodeBlock, CodeBlock>[] = [];
  for (const diffPair of diffPairs) {
    const fileWithDeletions: FileWithDeletions = diffPair.old;
    const fileWithInsertions: FileWithInsertions = diffPair.new;
    const oldFilePath: string = fileWithDeletions.filePath;
    const newFilePath: string = fileWithInsertions.filePath;

    // TODO: for now deleted files will point to /dev/null and give an emtpy string
    // yet it will be rendered as a file with 1 line. Probably it's better to just
    // mark a file as deleted instead.

    const [oldFileDecorated, newFileDecorated] = [
      await getManuallyTransformedFileHtml(
        fileWithDeletions,
        fileWithDeletions.language
      ),
      await getManuallyTransformedFileHtml(
        fileWithInsertions,
        fileWithInsertions.language
      ),
    ];

    htmlPairs.push({
      first: { title: oldFilePath, codeHtml: oldFileDecorated },
      second: { title: newFilePath, codeHtml: newFileDecorated },
    });
  }
  return htmlPairs;
};

const getSiteContent = async (): Promise<Pair<CodeBlock, CodeBlock>[]> => {
  // run git diff and collect all files and pair them with their inserted/deleted lines
  const diffPairs: DiffPair<FileWithDeletions, FileWithInsertions>[] =
    await getDiffPairsForCurrentDiff();

  return getCodeBlocksForDiffPairs(diffPairs);
};

const getContentForDiffs = async (
  commitA: string,
  commitB: string
): Promise<Pair<CodeBlock, CodeBlock>[]> => {
  const diffPairs: DiffPair<FileWithDeletions, FileWithInsertions>[] =
    await getDiffPairsForDiff(commitA, commitB);
  //console.log("we got here!!!!");
  return getCodeBlocksForDiffPairs(diffPairs);
};

const getInsertionOrDeletionTransformer = (
  fileWithDiff: FileWithDiff
): ShikiTransformer => {
  switch (fileWithDiff.fileType) {
    case FileType.HAS_DELETIONS: {
      const deletedLineSet: Set<number> = new Set<number>(
        fileWithDiff.deletedLines
      );
      return addDiffDeletedTransformer(deletedLineSet);
    }
    case FileType.HAS_INSERTIONS: {
      const insertedLineSet: Set<number> = new Set<number>(
        fileWithDiff.insertedLines
      );
      return addDiffInsertedTransformer(insertedLineSet);
    }
  }
  console.log("No case was hit");
  console.log("fileWithDiff: ");
  console.log(fileWithDiff);
};

const getManuallyTransformedFileHtml = async (
  fileWithDiff: FileWithDiff,
  lang: string
): Promise<string> => {
  const codeContent = fileWithDiff.content;
  const diffTransformer = getInsertionOrDeletionTransformer(fileWithDiff);

  const html = await codeToHtml(codeContent, {
    lang: lang,
    theme: "monokai",
    transformers: [diffTransformer, transformerRenderWhitespace()],
  });
  return html;
};

// Endpoints zone

const app = new Hono();

app.use("/diffStyles.css", serveStatic({ path: "./diffStyles.css" }));

app.get("/", async (c) => {
  const content: Pair<CodeBlock, CodeBlock>[] = await getSiteContent();

  const fullPage = <FullDiffPage diffPairs={content} />;
  return c.html(fullPage);
});

app.get("/diff", async (c) => {
  const { commitA, commitB } = c.req.query();

  if (commitA && commitB) {
    const content: Pair<CodeBlock, CodeBlock>[] = await getContentForDiffs(
      commitA,
      commitB
    );
    const fullPage = <FullDiffPage diffPairs={content} />;
    return c.html(fullPage);
  }
  return c.html("");
});

app.get("/search", async (c) => {
  const fullPage = <FullGitGrepPage />;
  return c.html(fullPage);
});

app.get("/grep", async (c) => {
  const { pattern } = c.req.query();

  if (pattern) {
    console.log("we gt pattern");
    const content: Pair<string, string>[] = await getGrepResults(pattern);

    //const fullPage = <FullDiffPage diffPairs={content} />;
    console.log("we got pairs: ");
    console.log(content);
    const grepResultElement = <GitGrepResultHolder resultPairs={content} />;
    return c.html(grepResultElement);
  }
  return c.html("");
});

const port = parseInt(process.env.PORT!) || 8080 || 3000;
console.log(`Running at http://localhost:${port}`);

export default {
  port,
  fetch: app.fetch,
};
