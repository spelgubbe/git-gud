export type DiffPair<L, R> = {
  old: L;
  new: R;
};

export enum FileType {
  HAS_INSERTIONS,
  HAS_DELETIONS,
}

export interface FileContent {
  content: string;
  language: string;
}

export interface FileWithDeletions extends FileContent {
  filePath: string;
  fileType: FileType.HAS_DELETIONS;
  deletedLines: number[];
}

export interface FileWithInsertions extends FileContent {
  filePath: string;
  fileType: FileType.HAS_INSERTIONS;
  insertedLines: number[];
}

export type FileWithDiff = FileWithInsertions | FileWithDeletions;
