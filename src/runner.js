const Runner = (() => {

  let run = async (code) => {
    let result = await runImpl(code);
    if (result.error) {
      IDE.emitToConsole(result.message, true);
    }
  }

  let runImpl = async (code) => {
    let tokens = Tokens.tokenize(code);
    if (tokens.error) return tokens;
    let bundle = Parser.parse(tokens);
    let byteCode = Serializer.encodeToByteCode(Object.values(bundle.functionsByName));
    return Interpreter.interpret(byteCode);
  };
  return Object.freeze({
    run,
  });
})();
