const Interpreter = (() => {

  const NULL = { type: 'N', internalValue: null };
  const TRUE = { type: 'B', internalValue: true };
  const FALSE = { type: 'B', internalValue: false };
  const ZERO = { type: 'I', internalValue: 0 };
  const POSITIVE_NUMS = [ZERO];
  const NEGATIVE_NUMS = [ZERO];
  for (let i = 1; i <= 1000; i++) {
    POSITIVE_NUMS.push({ type: 'I', internalValue: i });
    NEGATIVE_NUMS.push({ type: 'I', internalValue: -i });
  }
  const EMPTY_STRING = { type: 'S', internalValue: "" };
  const COMMON_STRINGS = {};
  COMMON_STRINGS[""] = EMPTY_STRING;
  
  let getInt = (n) => {
    if (n >= -1000 && n <= 1000) {
      if (n >= 0) return POSITIVE_NUMS[n];
      return NEGATIVE_NUMS[-n];
    }
    return { type: 'I', internalValue: n };
  };

  let getString = (s) => {
    if (s.length <= 1) {
      let str = COMMON_STRINGS[s];
      if (!str) {
        str = { type: 'S', internalValue: s };
        COMMON_STRINGS[s] = str;
      }
      return str;
    }
    return { type: 'S', internalValue: s };
  };

  let createStackFrame = (targetPc) => {
    return {
      pc: targetPc,
      locals: {},
      values: [],
      args: [],
    };
  };

  let now = () => new Date().getTime() / 1000;
  let pause = async (seconds) => {
    let millis = Math.floor(seconds * 1000);
    return new Promise(res => {
      setTimeout(() => res(true), millis);
    });
  };

  let toString = (value) => {
    switch (value.type) {
      case 'S': return value.internalValue;
      case 'I': return value.internalValue + "";
      case 'F': return value.internalValue + "";
      case 'B': return value.internalValue ? "☂️(true)" : "🌂(false)";
      case 'N': return "📭(null)";
      default: throw new Error("toString not defined for " + value.type);
    }
  };

  let errorResult = (token, msg) => {
    return {
      error: true,
      message: (token ? ("Line " + token.line + " Column " + token.col + ": ") : "") + msg,
    };
  };

  let builtinLookupUncanonicalized = {
    "🖨️": {
      handler: (msg) => { console.log(toString(msg)); }, // TODO: use the IDE logger
      argc: 1,
    }
  };
  let builtinLookup = {};
  Object.keys(builtinLookupUncanonicalized).forEach(k => {
    builtinLookup[Tokens.canonicalizeEmoji(k)] = builtinLookupUncanonicalized[k];
  });

  let interpret = async (byteCode) => {
    let stack = [createStackFrame(0)];
    let frame = null;
    let newFrame = null;
    let instruction = null;
    let funcDef = null;
    let value = null;

    let functionLookup = {};

    let lastBreak = now();
    let checkBreak = false;
    let args = [];

    while (stack.length) {
      frame = stack[stack.length - 1];
      instruction = byteCode[frame.pc];
      switch (instruction.op) {

        case 'FUNCTION_DEF':
          functionLookup[instruction.name] = { pc: frame.pc + 1, argc: instruction.argc };
          break;

        case 'INVOKE':
          if (instruction.isBuiltIn) {
            funcDef = builtinLookup[instruction.name];
          } else {
            funcDef = functionLookup[instruction.name];
            if (!funcDef) {
              return errorResult(instruction.token, "Now function defined by the name of " + instruction.name);
            }
            newFrame = createStackFrame(funcDef.pc);
          }

          if (funcDef.argc !== instruction.argc) {
            return errorResult(
              instruction.token, 
              "The function " + instruction.name + " expects " + Util.plural(funcDef.argc, "argument", "arguments") + " but received " + instruction.argc + ".");
          }

          for (let i = 0; i < instruction.argc; i++) {
            let arg = frame.values.pop();
            if (instruction.isBuiltIn) {
              args.push(arg);
            } else {
              newFrame.args.push(arg);
            }
          }

          if (instruction.isBuiltIn) {
            let output = funcDef.handler(...args);
            args = [];
            if (!output) output = NULL;
            else frame.values.push(output);
          } else {
            stack.push(newFrame);
            frame = newFrame;
          }
          break;

        case 'JUMP':
          frame.pc += instruction.offset;
          break;

        case 'NULL':
          frame.values.push(NULL);
          break;

        case 'POP':
          frame.values.pop();
          break;

        case 'RETURN':
          value = frame.values.pop();
          stack.pop();
          if (!stack.length) {
            return { isDone: true };
          }
          frame = stack[stack.length - 1];
          frame.values.push(value);
          break;

        case 'STRING':
          {
            let s = COMMON_STRINGS[instruction.value];
            if (!s) {
              s = getString(instruction.value);
              COMMON_STRINGS[instruction.value] = s;
            }
            frame.values.push(s);
          }
          break;

        default: 
          throw new Error("Op code behavior not implemented: " + instruction.op);
      }

      frame.pc++;

      if (checkBreak) {
        // Every 5 milliseconds, yield 3 milliseconds to the event loop to prevent the browser from hanging from infinite loops
        if (now() - lastBreak > 0.005) {
          await pause(0.003);
          lastBreak = now();
        }
        checkBreak = false;
      }
    }
  };

  return Object.freeze({
    interpret,
  });
})();
