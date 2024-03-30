import { $ } from 'bun'


/**
 * Encapsulate functionality in a class as the git path will be constant
 */
export class GitUtils {
    gitPath: string;
   
    constructor(gitPath?: string) {
        // assume current directory is git path unless specified
        this.gitPath = gitPath || "."
    }

    _getGitCmd = () => {
        return `git -C ${this.gitPath}`
    }

    /**
     * @param filePath File path relative to repository root
     * @param commitHash 
     * @returns 
     */
    getFileContentsAtCommit = async (filePath: string, commitHash: string): Promise<string> => {
        // Use a git command to view the file as it was at a specific commit
        //`git cat-file -p 621a4747758013c590ef95314e8ea756e656b8d1:src/bios/plugin/web/wfs/WFS.java`
        return await $`${this._getGitCmd ()} cat-file -p ${commitHash}:${filePath}`.text ()
    }

    getFileContents = async (filePath: string): Promise<string> => {
        // Use a git command to view the file as it was at a specific commit
        //`git cat-file -p 621a4747758013c590ef95314e8ea756e656b8d1:src/bios/plugin/web/wfs/WFS.java`
        const cmd = await $`${this._getGitCmd ()} cat-file -p :${filePath}`
        if (cmd.exitCode !== 0) {
            console.log ("encontered unexpected return code in getFileContents")
            console.log (cmd.text ())
            return "" // no point in exposing the error string
        }
        return cmd.text ()
    }

    /**
     * Get the git diff between two commits in a repository
     * @param commitHashA commit that happened before
     * @param commitHashB commit that happened after commitHashA
     * @returns 
     */
    getGitDiffAB = async (commitHashA: string, commitHashB: string): Promise<string> => {
        return await $`${this._getGitCmd ()} diff ${commitHashA} ${commitHashB}`.text ()
    }

    getGitDiff = async (): Promise<string> => {
        return await $`${this._getGitCmd ()} diff`.text ()
    }

  }

