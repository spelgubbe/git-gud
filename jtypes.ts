/**
 * Expected use case is to uniquely identify a file associated with a git diff
 */
export interface FilePathMapping {
    oldFilePath: string;
    newFilePath: string;
}
