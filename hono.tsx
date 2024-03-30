import { Hono } from 'hono'
import { serveStatic } from 'hono/bun'
import { $ } from 'bun'
import * as Diff2Html from 'diff2html'
import { ColorSchemeType } from 'diff2html/lib/types' // using auto color scheme for now, but one can choose light/dark

const app = new Hono()

const Layout = (props: { children?: any }) => {
  return (
    <html>
      <body>{props.children}</body>
    </html>
  )
}

/*

document.addEventListener('DOMContentLoaded', () => {
            const targetElement = document.getElementById('diff');
            const diff2htmlUi = new Diff2HtmlUI(targetElement);
            diff2htmlUi.fileListToggle(false);
            diff2htmlUi.fileContentToggle();
            diff2htmlUi.synchronisedScroll();
            diff2htmlUi.highlightCode();
        });
    */
   //             <script type="text/javascript" src="https://cdn.jsdelivr.net/npm/diff2html/lib/ui/js/diff2html-ui.js"></script>

   //            <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/highlight.js/9.9.0/styles/github.min.css" />   
            //<link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/highlight.js/11.9.0/styles/github-dark.min.css" />

            // full ui:             <script type="text/javascript" src="https://cdn.jsdelivr.net/npm/diff2html/bundles/js/diff2html-ui.min.js"></script>

            // diff2html-ui-slim.js - slim gjorde ingen skillnad på highlighting
            // https://cdn.jsdelivr.net/npm/diff2html/bundles/js/diff2html-ui-slim.min.js
            //     slim ui:<script type="text/javascript" src="https://cdn.jsdelivr.net/npm/diff2html/bundles/js/diff2html-ui-slim.min.js"></script>


const Head = () => {
    return (
        <PHP54_HEADER>
            <link rel="stylesheet" href="quickstyle.css" />
            <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/highlight.js/9.9.0/styles/github.min.css" />

            <link rel="stylesheet" type="text/css" href="https://cdn.jsdelivr.net/npm/diff2html/bundles/css/diff2html.min.css" />
            <script type="text/javascript" src="https://cdn.jsdelivr.net/npm/diff2html/bundles/js/diff2html-ui.min.js"></script>

            <script type="text/javascript" src="ui.js"></script>
            

        </PHP54_HEADER>
    )
}


const PHP54_HEADER = (props: { children?: any }) => {
    return (<head>
        {props.children}
    </head>)
}

const Top = (props: { messages: string[] }) => {
  return (
    <Layout>
      <h1>Hello Hono!</h1>
      <ul>
        {props.messages.map((message) => {
          return <li>{message}!!</li>
        })}
      </ul>
    </Layout>
  )
}

const DiffSection = (props: { children?: any }) => {
    return (
    <div id="diff">
        {props.children}
    </div>)
}
// <DiffSection children={props.diffContent} />
const OWebOo = (props: { diffContent?: any }) => {
     // spawn an element for the code diffs
     // this is the element that the UI js code monitors
     return (
        <html>
        <Head />
        <body>
            <div id="diff" dangerouslySetInnerHTML={createHtml (props.diffContent)} />
        </body>
        </html>
     )
    
}

function createHtml (text: string) {
    return {__html: text};
  }

const diffPumper = async () => {
    const test = await $`git -C ../dps/ diff HEAD~3`.text (); // this just prints the output
  // need to pipe the text from the command
  const test2 = await $`diff2html -cs="dark" --style="side" -i="file" --output="stdout" -- commitdifftest.txt`.text ();
  const codeDiff = Diff2Html.html (test) // det här är html i form av en sträng
  return codeDiff
}

app.use ('/ui.js', serveStatic ({path: './ui.js'}))
app.use ('/quickstyle.css', serveStatic ({path: './quickstyle.css'}))

app.get('/', async (c) => {

  const test = await $`git -C ../dps/ diff HEAD~3`.text (); // this just prints the output

  const customConfig = Diff2Html.defaultDiff2HtmlConfig
  //customConfig.colorScheme = ColorSchemeType.DARK // have to set color scheme to generate correct types of elements ...
  // TODO: använd custom syntax highlighter som inte lika gärna väljer fel ...

  // need to pipe the text from the command
  const test2 = await $`diff2html --style="side" -i="file" --output="stdout" -- commitdifftest.txt`.text ();
  const codeDiff = Diff2Html.html (test) // det här är html i form av en sträng

  const ooweb = <OWebOo diffContent={codeDiff} /> // här blir allt stringified
  return c.html(ooweb)
})




const port = parseInt(process.env.PORT!) || 3000
console.log(`Running at http://localhost:${port}`)

export default {
  port,
  fetch: app.fetch
};