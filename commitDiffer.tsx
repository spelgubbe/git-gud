import { unified } from "unified";
//import rehypeStringify from 'rehype-stringify'
import rehypeShiki from "@shikijs/rehype";
import { Hono } from "hono";
import { serveStatic } from "hono/bun";
import * as fs from "fs";
import { $ } from "bun";
import * as Diff2Html from "diff2html";
import { codeToHtml } from "shiki";

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

import {
  transformerNotationDiff,
  // ...
} from "@shikijs/transformers";

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
  const suffix = "// [!code --]";
  return suffixLines(fileLines, lineNumbers, suffix);
};

// decorate deleted lines with comments at the end "// [!code --]"
const decorateLineInsertions = async (
  fileLines: string[],
  lineNumbers: number[]
): Promise<string[]> => {
  const suffix = "// [!code ++]";
  return suffixLines(fileLines, lineNumbers, suffix);
};

const suffixLines = async (
  fileLines: string[],
  lineNumbers: number[],
  suffix: string
): Promise<string[]> => {
  //for (codeFileContent)
  //const fileLines: string[] = await FileUtils.getFileLines (codeFileContent)
  const newFileLines: string[] = [];
  for (
    let lineNumber: number = 0;
    lineNumber < fileLines.length;
    lineNumber++
  ) {
    // TODO: Set<number> is better time complexity here
    const oldLineContent: string = fileLines[lineNumber];
    if (lineNumbers.includes(lineNumber)) {
      const newLineContent: string = oldLineContent + suffix;
      newFileLines.push(newLineContent);
    } else {
      newFileLines.push(oldLineContent);
    }
    // this loop is unnecessary copying
  }
  return newFileLines;
};

const decorateWithDiffTransformer = async (
  codeContent: string,
  lang: string
): Promise<string> => {
  const html = await codeToHtml(codeContent, {
    lang: lang,
    theme: "nord",
    transformers: [transformerNotationDiff()],
  });
  return html;
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

const getSiteContent = async (): Promise<string> => {
  const javaFileContent: string = await getJavaFileString();
  const javaFileLines: string[] = javaFileContent.split("\n");
  //const javaFileLines: string[] = await FileUtils.getFileLines ('./KdTree.java')

  const deletedLines: number[] = [1, 4, 5, 6, 7]; // lines to mark as -
  const insertedLines: number[] = [2, 3, 8]; // lines to mark as +
  // works but needs custom css rules

  // mark lines as deleted according to transformer's expected format
  let diffDecoratedFileLines: string[] = await decorateLineDeletions(
    javaFileLines,
    deletedLines
  );

  // mark lines as added according to transformer's expected format
  diffDecoratedFileLines = await decorateLineInsertions(
    diffDecoratedFileLines,
    insertedLines
  );

  // collect lines into one string
  const diffDecoratedFileContent = FileUtils.joinFileLines(
    diffDecoratedFileLines
  );

  const transformedHtml = await decorateWithDiffTransformer(
    diffDecoratedFileContent,
    "java"
  );
  return transformedHtml;
};

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
});

const Head = () => {
  return (
    <head>
      <link rel="stylesheet" href="diffStyles.css" />
    </head>
  );
};

const FullPage = (props: { diffContent?: any }) => {
  return (
    <html>
      <Head />
      <body>
        <div
          id="main"
          dangerouslySetInnerHTML={createHtml(props.diffContent)}
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
