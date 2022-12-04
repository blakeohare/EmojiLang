const Util = (() => {

  let throwParseError = (item, msg) => {
    let token = item;
    if (item && item.firstToken) {
      token = item.firstToken;
    }

    let sb = [];
    if (item) {
      sb.push("Line ", item.line, ", Column ", item.col, ": ");
    }
    sb.push(msg);

    throw new Error(sb.join(""));
  };

  let plural = (n, singular, plural) => {
    return n + " " + (n === 1 ? singular : plural);
  };

  let clearChildren = (e) => {
    while (e.firstChild) {
      e.removeChild(e.firstChild);
    }
  };

  return Object.freeze({
    clearChildren,
    plural,
    throwParseError,
  });
})();
