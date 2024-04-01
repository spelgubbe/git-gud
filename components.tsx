import { Pair, CodeBlock } from "./types/common";

export const Head = () => {
  return (
    <head>
      <link rel="stylesheet" href="diffStyles.css" />
      <link
        rel="stylesheet"
        href="https://cdn.jsdelivr.net/npm/@picocss/pico@2/css/pico.min.css"
      />
      <script
        src="https://unpkg.com/htmx.org@1.9.11"
        integrity="sha384-0gxUXCCR8yv9FM2b+U3FDbsKthCI66oH5IA9fHppQq9DDMHuMauqq1ZHBpJxQ0J0"
        crossorigin="anonymous"
      ></script>
    </head>
  );
};

export const DiffHolder = (props: { old: CodeBlock; new: CodeBlock }) => {
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

export const FullDiffPage = (props: {
  diffPairs: Pair<CodeBlock, CodeBlock>[];
}) => {
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

export const FullGitGrepPage = (props: {}) => {
  // TODO: syntax highlight grep results :P
  return (
    <html>
      <Head />
      <body>
        <div id="main">
          <h3>
            Search repository (grep)
            <span class="htmx-indicator">
              <img src="/img/bars.svg" /> Searching...
            </span>
          </h3>
          <input
            class="form-control"
            type="search"
            name="pattern"
            placeholder="Begin Typing To Search Repository..."
            hx-get="/grep"
            hx-trigger="input changed delay:500ms, search"
            hx-target="#search-results"
            hx-indicator=".htmx-indicator"
          />

          <table class="table">
            <thead>
              <tr>
                <th>Filename</th>
                <th>Matched line</th>
              </tr>
            </thead>
            <tbody id="search-results"></tbody>
          </table>
        </div>
      </body>
    </html>
  );
};

export const GitGrepResultHolder = (props: {
  resultPairs: Pair<string, string>[];
}) => {
  return (
    <>
      {props.resultPairs.map((pair: Pair<string, string>) => (
        <GitGrepLineHolder resultPair={pair} />
      ))}
    </>
  );
};

export const GitGrepLineHolder = (props: {
  resultPair: Pair<string, string>;
}) => {
  return (
    <tr>
      <td>{props.resultPair.first}</td>
      <td>{props.resultPair.second}</td>
    </tr>
  );
};
