import { unified } from "unified";
//import rehypeStringify from 'rehype-stringify'
import rehypeShiki from "@shikijs/rehype";
import { Hono } from "hono";
import { serveStatic } from "hono/bun";
import * as fs from "fs";
import { $ } from "bun";
import * as Diff2Html from "diff2html";
import { codeToHtml, ShikiTransformer } from "shiki";

// new stuff
import rehypeParse from "rehype-parse";
import rehypeStringify from "rehype-stringify";
import { visit } from "unist-util-visit";

// use helpers to make the code cleaner
import * as HelperTypes from "./jtypes";
import * as GitUtils from "./GitUtils";

import { DiffFile } from "diff2html/lib/types";
import { open } from "node:fs/promises";
import * as FileUtils from "./FileUtils";
import { getDiffPairsForCurrentDiff } from "./MultiFileHighlighter";

import {
  transformerNotationDiff,
  // ...
} from "@shikijs/transformers";

import {
  DiffPair,
  FileWithDeletions,
  FileWithInsertions,
  FileWithDiff,
  FileType,
} from "./types/difftypes";

import { Pair } from "./types/common";

const getGitDiff = async () => {
  return await $`git -C ../dps/ diff`.text();
};

const getDiffFilesFromDiff = (commitDiff: string): DiffFile[] => {
  return Diff2Html.parse(commitDiff);
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

const decorateWithDiffTransformer2 = async (
  codeContent: string,
  lang: string
): Promise<string> => {
  const html = await codeToHtml(codeContent, {
    lang: lang,
    theme: "nord",
    // use a custom transformer // ???????? or not

    //transformers: [transformerNotationDiff()],
  });
  return html;
};

const addDiffInsertedTransformer = (
  insertedLines: Set<number>
): ShikiTransformer => {
  return {
    name: "diff add transformer",
    line(hast, line) {
      // 1 indexed lines for some reason, this is a recurring theme
      if (insertedLines.has(line)) {
        this.addClassToHast(hast, "diff add");
      }
    },
  };
};

const addDiffDeletedTransformer = (
  insertedLines: Set<number>
): ShikiTransformer => {
  return {
    name: "diff remove transformer",
    line(hast, line) {
      // 1 indexed lines for some reason, this is a recurring theme
      if (insertedLines.has(line)) {
        this.addClassToHast(hast, "diff remove");
      }
    },
  };
};

// inspired by https://shiki.style/packages/transformers
const decorateInsertions = async (
  codeFileContent: string,
  insertLineNumbers: Number[],
  lang: string
) => {
  const code = await codeToHtml(codeFileContent, {
    lang: lang,
    theme: "vitesse-light",
    transformers: [
      {
        pre(hast) {
          // should mark it as "has diff": has-diff
          // only if it has a diff
        },

        code(node) {},

        line(node, line) {
          node.properties["data-line"] = line;
          if (insertLineNumbers.includes(line)) {
            this.addClassToHast(node, "diff add"); // mark ++
          }
        },

        span(node, line, col) {
          node.properties["data-token"] = `token:${line}:${col}`;
        },
      },
    ],
  });

  return code; // this is html
};

// inspired by https://shiki.style/packages/transformers
const decorateDeletions = async (
  codeFileContent: string,
  deletedLineNumbers: Number[],
  lang: string
) => {
  const code = await codeToHtml(codeFileContent, {
    lang: lang,
    theme: "monokai",
    transformers: [
      {
        pre(hast) {
          // should mark it as "has diff": has-diff
          // only if it has a diff
        },

        code(node) {},

        line(node, line) {
          node.properties["data-line"] = line;
          if (deletedLineNumbers.includes(line)) {
            const tokensAtLine = this.tokens.at(line);
            console.log("tokens at line " + line + ": "); // may be empty (whitespace)
            console.log(tokensAtLine);
            if (tokensAtLine) {
              for (const token of tokensAtLine) {
                console.log(token.bgColor);
                console.log(token.color);
                //token.color = '#00FF00';
                token.bgColor = "#550000";
              }
            }
            this.addClassToHast(node, "diff remove"); // mark -- // just adds a class
          }
        },

        span(node, line, col) {
          node.properties["data-token"] = `token:${line}:${col}`;
        },
      },
    ],
  });

  return code; // this is html
};

const app = new Hono();

function createHtml(text: string) {
  return { __html: text };
}

const getJavaFileString = async () => {
  const codeText = fs.readFileSync("./KdTree.java", "utf8");

  return codeText;
};

app.use("/diffStyles.css", serveStatic({ path: "./diffStyles.css" }));

// TODO: encapsulate StringCache in a class
// and probably just call it Cache<T>
type StringCache = {
  content: string;
  timestamp: number;
};

const stringCache: StringCache = { content: "", timestamp: 0 };

const getSiteContent2 = async (): Promise<Pair<string, string>[]> => {
  // run git diff and collect all files and pair them with their inserted/deleted lines
  const diffPairs: DiffPair<FileWithDeletions, FileWithInsertions>[] =
    await getDiffPairsForCurrentDiff();
  console.log("watcher?");
  //console.log(diffPairs);
  const htmlPairs: Pair<string, string>[] = [];
  for (const diffPair of diffPairs) {
    const fileWithDeletions: FileWithDeletions = diffPair.old;
    const fileWithInsertions: FileWithInsertions = diffPair.new;

    const [oldFileDecorated, newFileDecorated] = await Promise.all([
      //getDecoratedFileHTML(fileWithDeletions, fileWithDeletions.language),
      //getDecoratedFileHTML(fileWithInsertions, fileWithInsertions.language),
      getManuallyTransformedFileHtml(
        fileWithDeletions,
        fileWithDeletions.language
      ),
      getManuallyTransformedFileHtml(
        fileWithInsertions,
        fileWithInsertions.language
      ),
    ]);

    htmlPairs.push({
      first: oldFileDecorated,
      second: newFileDecorated,
    });
  }
  //console.log(htmlPairs);
  return htmlPairs;
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

const getInsertionOrDeletionTransformer = async (
  fileWithDiff: FileWithDiff
): Promise<ShikiTransformer> => {
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
  const diffTransformer = await getInsertionOrDeletionTransformer(fileWithDiff);

  const html = await codeToHtml(codeContent, {
    lang: lang,
    theme: "nord",
    transformers: [diffTransformer],
  });
  return html;
};

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

// FullDiffPage
app.get("/", async (c) => {
  const content: Pair<string, string>[] = await getSiteContent2();

  const fullPage = <FullDiffPage diffPairs={content} />;
  return c.html(fullPage);
});
/*
app.get("/", async (c) => {
  const customConfig = Diff2Html.defaultDiff2HtmlConfig;

  const timestamp = Date.now();
  const duration = 30000;
  const timeSinceLastRun = timestamp - stringCache.timestamp;

  let content: string;
  if (timeSinceLastRun < duration) {
    content = stringCache.content;
  } else {
    content = await getSiteContent();
    stringCache.timestamp = Date.now();
    stringCache.content = content;
  }

  const fullPage = <FullPage diffContent={content} />;
  return c.html(fullPage);
});*/

const Head = () => {
  return (
    <head>
      <link rel="stylesheet" href="diffStyles.css" />
      <link
        rel="stylesheet"
        href="https://cdn.jsdelivr.net/npm/@picocss/pico@2/css/pico.min.css"
      />
    </head>
  );
};

const DiffHolder = (props: { old: string; new: string }) => {
  return (
    <div class="grid">
      <div dangerouslySetInnerHTML={createHtml(props.old)}></div>
      <div dangerouslySetInnerHTML={createHtml(props.new)}></div>
    </div>
  );
};

const FullDiffPage = (props: { diffPairs: Pair<string, string>[] }) => {
  return (
    <html>
      <Head />
      <body>
        <div id="main">
          {props.diffPairs.map((pair: Pair<string, string>) => (
            <DiffHolder old={pair.first} new={pair.second} />
          ))}
        </div>
      </body>
    </html>
  );
};

const FullPage = (props: { diffContent?: any }) => {
  return (
    <html>
      <Head />
      <body>
        <div
          id="main"
          dangerouslySetInnerHTML={createHtml(props.diffContent)} // beako
        />
      </body>
    </html>
  );
};

const port = parseInt(process.env.PORT!) || 8080 || 3000;
console.log(`Running at http://localhost:${port}`);

export default {
  port,
  fetch: app.fetch,
};
