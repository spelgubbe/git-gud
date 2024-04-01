import { DiffFile } from "diff2html/lib/types";
import { GitUtils } from "./GitUtils";
import {
  getInsertedLineNumbersForFile,
  getDeletedLineNumbersForFile,
} from "./DiffFileUtils";
import { Pair } from "./types/common";
import * as Diff2Html from "diff2html";
import { contentForDiff } from "./FileContentHelper";
import {
  FileWithDeletions,
  FileWithInsertions,
  DiffPair,
  FileType,
} from "./types/difftypes";

export const getFilesWithDiffsFromDiff = async (
  diffFile: DiffFile,
  commitA: string,
  commitB: string
): Promise<DiffPair<FileWithDeletions, FileWithInsertions>> => {
  const fileNameBefore = diffFile.oldName;
  const fileNameAfter = diffFile.newName;

  const fileLangType = diffFile.language;

  const insertedLines: number[] = getInsertedLineNumbersForFile(diffFile);
  const deletedLines: number[] = getDeletedLineNumbersForFile(diffFile);

  // these line numbers are one indexed
  //console.log("Filename: " + fileNameBefore + "(at " + commitA + ")");
  //console.log("Deleted: " + deletedLines);

  //console.log("Filename: " + fileNameAfter + "(at " + commitB + ")");
  //console.log("Inserted: " + insertedLines);

  const fileContentBeforeAfter: Pair<string, string> = await contentForDiff(
    diffFile,
    commitA,
    commitB
  );

  let newFileWithDiff: FileWithInsertions = {
    filePath: fileNameAfter,
    language: fileLangType,
    fileType: FileType.HAS_INSERTIONS,
    content: fileContentBeforeAfter.second,
    insertedLines: insertedLines,
  };
  let oldFileWithDiff: FileWithDeletions = {
    filePath: fileNameBefore,
    language: fileLangType,
    fileType: FileType.HAS_DELETIONS,
    content: fileContentBeforeAfter.first,
    deletedLines: deletedLines,
  };

  return { old: oldFileWithDiff, new: newFileWithDiff };
};

// this takes the Diff2Html.parse product (that is a product of a diff string)
//
export const getFilesAndDiffsFromDiff = async (
  diffFiles: DiffFile[],
  commitA: string,
  commitB: string
): Promise<DiffPair<FileWithDeletions, FileWithInsertions>[]> => {
  const diffPairs: DiffPair<FileWithDeletions, FileWithInsertions>[] = [];

  // do everything synchronous to not hang ??
  for (const diffFile of diffFiles) {
    diffPairs.push(await getFilesWithDiffsFromDiff(diffFile, commitA, commitB));
  }

  return diffPairs;

  /*return Promise.all(
    diffFiles.map((diffFile: DiffFile) =>
      getFilesWithDiffsFromDiff(diffFile, commitA, commitB)
    )
  );*/
};

export const getDiffPairsForDiff = async (
  commitA: string,
  commitB: string
): Promise<DiffPair<FileWithDeletions, FileWithInsertions>[]> => {
  const diffString: string = await new GitUtils(".").getGitDiffAB(
    commitA,
    commitB
  );
  const diffFiles: DiffFile[] = Diff2Html.parse(diffString);
  return getFilesAndDiffsFromDiff(diffFiles, commitA, commitB);
};

export const getDiffPairsForCurrentDiff = async (): Promise<
  DiffPair<FileWithDeletions, FileWithInsertions>[]
> => {
  const diffString: string = await new GitUtils(".").getGitDiff();
  //console.log("git diff string: \n");
  //console.log(diffString);
  const diffFiles: DiffFile[] = Diff2Html.parse(diffString);
  return getFilesAndDiffsFromDiff(diffFiles, "HEAD", "");
};
