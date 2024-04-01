import { GitUtils } from "./GitUtils";
import { Pair } from "./types/common";

export const getGrepResults = async (
  pattern: string
): Promise<Pair<string, string>[]> => {
  const gitUtils: GitUtils = new GitUtils();
  const grepResult = await gitUtils.getGitGrep(pattern);
  const resultLines: string[] = grepResult.split("\n");

  return resultLines
    .map(splitGrepResult)
    .filter(filterOutPairsWithEmptyComponent);
};

const filterOutPairsWithEmptyComponent = (
  pair: Pair<string, string>
): boolean => {
  if (
    pair &&
    pair.first &&
    pair.first.length !== 0 &&
    pair.second &&
    pair.second.length !== 0
  ) {
    return true;
  }
  return false;
};

const splitGrepResult = (grepResult: string): Pair<string, string> => {
  const splitLine = grepResult.split(":");
  const fileName = splitLine.at(0);
  let first = "";
  let second = "";
  if (fileName) {
    const fileNameLength = fileName.length;
    first = fileName;
    second = splitLine.slice(1).join();
  }

  return { first, second };
};
