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
  return Object.freeze({
    throwParseError,
  });
})();
