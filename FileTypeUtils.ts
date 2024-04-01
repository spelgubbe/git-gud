export const getFileExtension = (filename: string) => {
  if (filename.includes(".")) {
    const lastDotIndex = filename.lastIndexOf(".");
    return filename.substring(lastDotIndex + 1);
  }
  // maybe Makefile and similar end up here
  return filename;
};
