import { ShikiTransformer } from "shiki";

export const addDiffInsertedTransformer = (
  insertedLines: Set<number>
): ShikiTransformer => {
  return {
    name: "diff add transformer",
    line(hast, line) {
      // 1 indexed lines for some reason, this is a recurring theme
      if (insertedLines.has(line)) {
        this.addClassToHast(hast, "diff add");
      }
    },
  };
};

export const addDiffDeletedTransformer = (
  insertedLines: Set<number>
): ShikiTransformer => {
  return {
    name: "diff remove transformer",
    line(hast, line) {
      // 1 indexed lines for some reason, this is a recurring theme
      if (insertedLines.has(line)) {
        this.addClassToHast(hast, "diff remove");
      }
    },
  };
};
