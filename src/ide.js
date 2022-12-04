const IDE = (() => {

  let editorUi = null;
  let code = window.localStorage.getItem('emoji_code') || '';
  let init = () => {
    editorUi = document.getElementById('editor');
    editorUi.value = code;
    
    let applyEditorChanges = () => {
      if (editorUi.value !== code) {
        code = editorUi.value || '';
        window.localStorage.setItem('emoji_code', code);
      }
    };
    editorUi.addEventListener('change', applyEditorChanges);
    editorUi.addEventListener('keydown', applyEditorChanges);

    document.getElementById('run-btn').addEventListener('click', () => {
      run(editorUi.value);
    });
  };

  let run = (code) => {
    console.log("You clicked run");
    console.log("Run this code:", code);
  };

  return Object.freeze({
    init,
  });
})();
