//import rehypeStringify from 'rehype-stringify'
import { Hono } from "hono";
import { serveStatic } from "hono/bun";
import { codeToHtml, ShikiTransformer } from "shiki";

// new stuff

// use helpers to make the code cleaner

import {
  getDiffPairsForCurrentDiff,
  getDiffPairsForDiff,
} from "./MultiFileHighlighter";

import {
  transformerRenderWhitespace,
  // ...
} from "@shikijs/transformers";

import {
  DiffPair,
  FileWithDeletions,
  FileWithInsertions,
  FileWithDiff,
  FileType,
} from "./types/difftypes";

import { Pair, CodeBlock } from "./types/common";

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

const app = new Hono();

function createHtml(text: string) {
  return { __html: text };
}

app.use("/diffStyles.css", serveStatic({ path: "./diffStyles.css" }));

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

    const [oldFileDecorated, newFileDecorated] = await Promise.all([
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
      first: { title: oldFilePath, codeHtml: oldFileDecorated },
      second: { title: newFilePath, codeHtml: newFileDecorated },
    });
  }
  return htmlPairs;
};

const getSiteContent2 = async (): Promise<Pair<CodeBlock, CodeBlock>[]> => {
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
  console.log("we got here!!!!");
  return getCodeBlocksForDiffPairs(diffPairs);
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
    theme: "monokai",
    transformers: [diffTransformer, transformerRenderWhitespace()],
  });
  return html;
};

// Endpoints zone

app.get("/", async (c) => {
  const content: Pair<CodeBlock, CodeBlock>[] = await getSiteContent2();

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

/// JSX Zone
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

const DiffHolder = (props: { old: CodeBlock; new: CodeBlock }) => {
  return (
    <div class="grid">
      <div>
        <h4>{props.old.title}</h4>
        <div dangerouslySetInnerHTML={createHtml(props.old.codeHtml)}></div>
      </div>
      <div>
        <h4>{props.new.title}</h4>
        <div dangerouslySetInnerHTML={createHtml(props.new.codeHtml)}></div>
      </div>
    </div>
  );
};

const FullDiffPage = (props: { diffPairs: Pair<CodeBlock, CodeBlock>[] }) => {
  return (
    <html>
      <Head />
      <body>
        <div id="main">
          {props.diffPairs.map((pair: Pair<CodeBlock, CodeBlock>) => (
            <DiffHolder old={pair.first} new={pair.second} />
          ))}
        </div>
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
