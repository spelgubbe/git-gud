import * as HelperTypes from "./jtypes";
import * as Diff2Html from "diff2html";
import { DiffFile, DiffBlock, DiffLine, LineType } from "diff2html/lib/types";

export const getNewFileForDiff = (fileDiff: DiffFile): string => {
  return fileDiff.newName;
};

export const getOldFileForDiff = (fileDiff: DiffFile): string => {
  return fileDiff.oldName;
};

const getDiffLinesForDiffFile = (fileDiff: DiffFile): DiffLine[] => {
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
const getInsertedLineNumbersForFile = (fileDiff: DiffFile): number[] => {
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
const getDeletedLineNumbersForFile = (fileDiff: DiffFile): number[] => {
  const deletedLineNumbers: number[] = [];
  const diffLines: DiffLine[] = getDiffLinesForDiffFile(fileDiff);
  for (const diffLine of diffLines) {
    if (diffLine.type == LineType.DELETE) {
      deletedLineNumbers.push(diffLine.oldNumber);
    }
  }
  return deletedLineNumbers;
};

/**
 * Expected inside the array is DiffFile from Diff2Html
 * @param diffArray Expect an array that holds diff information for each file in a git diff
 * @returns non-null array of file mappings
 */
const getFilePathMappingsDiffFiles = (
  diffArray: DiffFile[]
): HelperTypes.FilePathMapping[] => {
  // we expect a json array here, should be one element per file in the diff string
  let resultArray: HelperTypes.FilePathMapping[] = [];
  if (diffArray) {
    for (const fileDiffs of diffArray) {
      if (fileDiffs.oldName && fileDiffs.newName) {
        const oldName: string = fileDiffs.oldName;
        const newName: string = fileDiffs.newName;
        const fileIdentifier: HelperTypes.FilePathMapping = {
          oldFilePath: oldName,
          newFilePath: newName,
        };

        resultArray.push(fileIdentifier);
      } else {
        console.log(
          "unexpected json structure of file diff (expects new and old name)"
        );
      }
    }
  } else {
    console.log("unexpected input to getFilePathMappingsFromJson");
  }

  return resultArray;
};
