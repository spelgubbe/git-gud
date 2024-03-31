import { DiffFile, DiffBlock, DiffLine, LineType } from "diff2html/lib/types";

export const getNewFileForDiff = (fileDiff: DiffFile): string => {
  return fileDiff.newName;
};

export const getOldFileForDiff = (fileDiff: DiffFile): string => {
  return fileDiff.oldName;
};

export const getDiffLinesForDiffFile = (fileDiff: DiffFile): DiffLine[] => {
  const allDiffLines: DiffLine[] = [];
  // get the array of inserted lines indicated by the git diff
  const diffBlocks: DiffBlock[] = fileDiff.blocks;
  for (const diffBlock of diffBlocks) {
    // list of lines that have diffs or are relevant as context
    const diffLines: DiffLine[] = diffBlock.lines;
    for (const diffLine of diffLines) {
      allDiffLines.push(diffLine);
    }
  }
  return allDiffLines;
};

/**
 * Collect all line numbers for a diff that were inserted.
 * These belong to the new file pointed to by DiffFile.newName
 * @param fileDiff
 * @returns line numbers for the diff that correspond to inserted lines
 */
export const getInsertedLineNumbersForFile = (fileDiff: DiffFile): number[] => {
  const insertedLineNumbers: number[] = [];
  const diffLines: DiffLine[] = getDiffLinesForDiffFile(fileDiff);
  for (const diffLine of diffLines) {
    if (diffLine.type == LineType.INSERT) {
      insertedLineNumbers.push(diffLine.newNumber);
    }
  }
  return insertedLineNumbers;
};

/**
 * Collect all line numbers for a diff that were deleted.
 * These belong to the new file pointed to by DiffFile.oldName
 * @param fileDiff DiffFile object
 * @returns line numbers for the diff that correspond to deleted lines
 */
export const getDeletedLineNumbersForFile = (fileDiff: DiffFile): number[] => {
  const deletedLineNumbers: number[] = [];
  const diffLines: DiffLine[] = getDiffLinesForDiffFile(fileDiff);
  for (const diffLine of diffLines) {
    if (diffLine.type == LineType.DELETE) {
      deletedLineNumbers.push(diffLine.oldNumber);
    }
  }
  return deletedLineNumbers;
};
