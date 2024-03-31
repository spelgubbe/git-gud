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

interface MultiFileHighligher {
  /**
   * Line up all the file contents associated with a git diff.
   * Expects pair.first to be the file before (at commit A),
   * and expects pair.second to be the file after (at commit B).
   * @param diffFiles Array of DiffFile representing the result
   * of a git diff on a per-file basis
   */
  contentForDiffs(
    diffFiles: DiffFile[],
    commitA: string,
    commitB: string
  ): Pair<string, string>[];
}

/**
 * Get file contents for the files associated with a diff.
 *
 * @param diffFile diff object associated with the diff between commitA and commitB
 * @param commitA
 * @param commitB
 * @returns Pair of strings where first string is the file at commitA, the second string is the file at commitB
 */
const contentForDiff = async (
  diffFile: DiffFile,
  commitA: string,
  commitB: string
): Promise<Pair<string, string>> => {
  const filePathA: string = getNewFileForDiff(diffFile);
  const filePathB: string = getOldFileForDiff(diffFile);

  const gitUtils: GitUtils = new GitUtils();
  const fileAContent: string = await gitUtils.getFileContentsAtCommit(
    filePathA,
    commitA
  );
  const fileBContent: string = await gitUtils.getFileContentsAtCommit(
    filePathB,
    commitB
  );

  return { first: fileAContent, second: fileBContent };
};

const fileIdToContentMap = async (
  diffFiles: DiffFile[],
  commitA: string,
  commitB: string
): Promise<Map<DiffFileName, Pair<string, string>>> => {
  // use a simple data structure for key
  const fileToContentMap: Map<DiffFileName, Pair<string, string>> = new Map();
  diffFiles.forEach((diffFile: DiffFile) => {
    const contentPair: Promise<Pair<string, string>> = contentForDiff(
      diffFile,
      commitA,
      commitB
    );
    const diffFn: DiffFileName = {
      oldName: diffFile.oldName,
      newName: diffFile.newName,
    };
    contentPair.then((pair) => fileToContentMap.set(diffFn, pair));
  });
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
