document.addEventListener('DOMContentLoaded', () => {
const targetElement = document.getElementById('diff');
const diff2htmlUi = new Diff2HtmlUI(targetElement);
diff2htmlUi.fileListToggle(true);
diff2htmlUi.fileContentToggle();
diff2htmlUi.synchronisedScroll();
diff2htmlUi.highlightCode();
});