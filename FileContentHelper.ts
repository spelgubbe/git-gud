import {
  DiffFile,
  DiffBlock,
  DiffLine,
  LineType,
  DiffFileName,
} from "diff2html/lib/types";
import { GitUtils } from "./GitUtils";
import { getNewFileForDiff, getOldFileForDiff } from "./DiffFileUtils";

type Pair<L, R> = {
  first: L;
  second: R;
};

/**
 * Get file contents for the files associated with a diff.
 *
 * @param diffFile diff object associated with the diff between commitA and commitB
 * @param commitA
 * @param commitB
 * @returns Pair of strings where first string is the file at commitA, the second string is the file at commitB
 */
export const contentForDiff = async (
  diffFile: DiffFile,
  commitA: string,
  commitB: string
): Promise<Pair<string, string>> => {
  const filePathA: string = getOldFileForDiff(diffFile);
  const filePathB: string = getNewFileForDiff(diffFile);

  const gitUtils: GitUtils = new GitUtils();
  const fileAContent: string = await gitUtils.getFileContentsAtCommit(
    filePathA,
    commitA
  );

  const fileBContent: string = await gitUtils.getFileContentsAtCommit(
    filePathB,
    commitB
  );

  console.log("File A content length: " + fileAContent.length);
  console.log(fileAContent);

  console.log("File B content length: " + fileBContent.length);
  console.log(fileBContent);

  return { first: fileAContent, second: fileBContent };
};

const fileIdToContentMap = async (
  diffFiles: DiffFile[],
  commitA: string,
  commitB: string
): Promise<Map<DiffFileName, Pair<string, string>>> => {
  // use a simple data structure for key
  const fileToContentMap: Map<DiffFileName, Pair<string, string>> = new Map();

  for (const diffFile of diffFiles) {
    const contentPair: Pair<string, string> = await contentForDiff(
      diffFile,
      commitA,
      commitB
    );
    // this is our identifying key (given that we are fixated on one diff result)
    const diffFn: DiffFileName = {
      oldName: diffFile.oldName,
      newName: diffFile.newName,
    };
    // block so we can set values in a map without non-determinism
    fileToContentMap.set(diffFn, contentPair);
  }

  return fileToContentMap;
};

const contentForDiffs = async (
  diffFiles: DiffFile[],
  commitA: string,
  commitB: string
): Promise<Pair<string, string>[]> => {
  return Promise.all(
    diffFiles.map((diffFile: DiffFile) =>
      contentForDiff(diffFile, commitA, commitB)
    )
  );
};

export const contentPerDiffMap = async (
  diffFiles: DiffFile[],
  commitA: string,
  commitB: string
): Promise<Map<DiffFileName, Pair<string, string>>> => {
  return fileIdToContentMap(diffFiles, commitA, commitB);
};
