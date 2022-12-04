const Runner = (() => {

  let run = async (code) => {
    let result = await runImpl(code);
    if (result.error) {
      console.error("ERROR!", result);
    }
  }

  let runImpl = async (code) => {
    let tokens = Tokens.tokenize(code);
    if (tokens.error) return tokens;
    return;
    let bundle = Parser.parse(tokens);
    return Interpreter.interpret(bundle).then(() => { true });
  };
  return Object.freeze({
    run,
  });
})();
