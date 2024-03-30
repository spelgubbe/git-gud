import { unified } from 'unified'
//import rehypeStringify from 'rehype-stringify'
import rehypeShiki from '@shikijs/rehype'
import { Hono } from 'hono'
import { serveStatic } from 'hono/bun'
import * as fs from 'fs'
import { $ } from 'bun'
import * as Diff2Html from 'diff2html'
import {
    codeToHtml,
  } from 'shiki'

// new stuff
import rehypeParse from 'rehype-parse'
import rehypeStringify from 'rehype-stringify'
import {visit} from 'unist-util-visit'

// use helpers to make the code cleaner
import * as HelperTypes from './jtypes'
import * as GitUtils from './GitUtils'

import { DiffFile } from 'diff2html/lib/types'

  

const getGitDiff = async () => {
    return await $`git -C ../dps/ diff`.text ();
}

const diffPumper = async () => {
    const gitDiff = await $`git -C ../dps/ diff`.text (); // this just prints the output
    // need to pipe the text from the command
    return Diff2Html.html (gitDiff) // det här är html i form av en sträng
}

// actually this is json, who knows what happens here?
const jsonDiffHtml = async () => {
    return await $`diff2html -i="file" --format="json" --output="stdout" -- commitdifftest.txt`.json ()

}

const jsonDiffHtmlInText = async () => {
    return await $`diff2html -i="file" --format="json" --output="stdout" -- commitdifftest.txt`.text ()

}


const hasty = async () => {

    const code = await codeToHtml( await getGitDiff (), {
    lang: 'diff',
    theme: 'vitesse-light',
    transformers: [
        {
        code(node) {
            this.addClassToHast(node, 'language-js')
            console.log (JSON.stringify (node))
        },
        line(node, line) {
            /*node.properties['data-line'] = line
            if ([1, 3, 4].includes(line))
            this.addClassToHast(node, 'highlight')*/
        },
        span(node, line, col) {
            /*console.log ()
            node.properties['data-token'] = `token:${line}:${col}`*/
        },
        },
    ]
    })

    return code // this is html
}

const hastyjson = async () => {

    const code = await codeToHtml (await jsonDiffHtmlInText (), {
    lang: 'diff',
    theme: 'vitesse-light',
    transformers: [
        {
        code(node) {
            //this.addClassToHast(node, 'language-js')
            //console.log (JSON.stringify (node))
        },
        line(node, line) {
            /*node.properties['data-line'] = line
            if ([1, 3, 4].includes(line))
            this.addClassToHast(node, 'highlight')*/
        },
        span(node, line, col) {
            /*console.log ()
            node.properties['data-token'] = `token:${line}:${col}`*/
        },
        },
    ]
    })

    return code // this is html
}

  
  // try to decorate code lines
  function addCodeFormatting () {
    /**
     * @param {import('hast').Root} tree
     */
    return function (tree) {
      visit(tree, 'element', function (node) {

        // dive into children
        /*

        {"type":"element","tagName":"br","properties":{},"children":[],"position":{"start":{"line":17280,"column":45,"offset":609668},"end":{"line":17280,"column":49,"offset":609672}}}

        */
        goHighlightSyntax (node)
        
      })
    }
  }

  function goHighlightSyntax (node) {
    const children = node.children
    if (children && children.length > 0) {
        for (const child of children) {
            goHighlightSyntax (child)
        }
    }

    /*
    {"type":"text","value":"\tif (ret == null || ret.isEmpty ()) {"

    */

    const nodeProps = node.properties
    if (nodeProps && nodeProps.className) {
        //console.log (JSON.stringify (node))
        //console.log (JSON.stringify (nodeProps))
        if (nodeProps.className.includes ('d2h-code-line-ctn')) {
            const codeText = node.innerHTML // grab some text, probably its raw code inside the container
            console.log (JSON.stringify (node))
            
            if (codeText && codeText.length && codeText.length > 0) {
                const htmlPromise = codeToHtml(codeText, {
                lang: 'java', // assume java for now
                theme: 'vitesse-dark'
                })
    
                console.log ("This if-statement was actually true") // never
                htmlPromise.then ( (htmlFromText) => {
                    node.innerHTML = htmlFromText
                    // try to change innerHTML to whatever shiki spits out
                })
            }
            
        }
    }
    
  }



const getJavaFileString = async () => {
    const codeText = fs.readFileSync('./KdTree.java', 'utf8')

    return codeText
}




/**
 * Expected inside the array is DiffFile from Diff2Html
 * @param diffArray Expect an array that holds diff information for each file in a git diff
 * @returns non-null array of file mappings
 */
const getFilePathMappingsFromJson = (diffArray: DiffFile[]): HelperTypes.FilePathMapping[] => {
    // we expect a json array here, should be one element per file in the diff string
    let resultArray: HelperTypes.FilePathMapping[] = []
    if (diffArray) {
        for (const fileDiffs of diffArray) {
            if (fileDiffs.oldName && fileDiffs.newName) {
                const oldName: string = fileDiffs.oldName
                const newName: string = fileDiffs.newName
                const fileIdentifier: HelperTypes.FilePathMapping = 
                    {oldFilePath: oldName, newFilePath: newName}

                resultArray.push (fileIdentifier)
            } else {
                console.log ("unexpected json structure of file diff (expects new and old name)")
            }
        }
    } else {
        console.log ("unexpected input to getFilePathMappingsFromJson")
    }

    return resultArray
}

const app = new Hono ()

function createHtml (text: string) {
    return {__html: text};
  }

const tryRehype = async () => {
    const file = await unified()
    .use(rehypeParse, {fragment: true})
    .use(addCodeFormatting)
    .use(rehypeStringify)
    .process(await diffPumper ())
  
    return String (file) // this is in html probably? or maybe its a text due to stringify
  //console.log(String(file))
}


app.get('/', async (c) => {

  const customConfig = Diff2Html.defaultDiff2HtmlConfig


  //return c.html(getKdTreeHtml ())
  return c.html (hastyjson ())
})




const port = parseInt(process.env.PORT!) || 3000
console.log(`Running at http://localhost:${port}`)

export default {
  port,
  fetch: app.fetch
};