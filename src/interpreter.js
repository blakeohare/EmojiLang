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
    n = Math.floor(n);
    if (n >= -1000 && n <= 1000) {
      if (n >= 0) return POSITIVE_NUMS[n];
      return NEGATIVE_NUMS[-n];
    }
    return { type: 'I', internalValue: n };
  };

  let getFloat = (v) => {
    return { type: 'F', internalValue: v };
  };

  let getBool = (v) => v ? TRUE : FALSE;

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
    let value2 = null;
    let result = null;
    let leftType = null;
    let rightType = null;
    let effectiveLeftType = null;
    let effectiveRightType = null;
    let leftValue = null;
    let rightValue = null;

    let functionLookup = {};

    let lastBreak = now();
    let args = [];

    let prevPc = -1;

    while (stack.length) {
      frame = stack[stack.length - 1];
      instruction = byteCode[frame.pc];
      switch (instruction.op) {

        case 'ASSIGN-VAR': 
          frame.locals[instruction.name] = frame.values.pop();
          break;

        case 'FLOAT':
          frame.values.push(getFloat(instruction.value));
          break;

        case 'FUNCTION_DEF':
          functionLookup[instruction.name] = { pc: frame.pc + 1, argc: instruction.argc };
          break;

        case 'INTEGER':
          frame.values.push(getInt(instruction.value));
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

        case 'OP':
          value2 = frame.values.pop();
          value = frame.values.pop();
          leftType = value.type;
          rightType = value2.type;
          leftValue = value.internalValue;
          rightValue = value2.internalValue;
          targetTypeBuilder = leftType === 'I' && rightType === 'I' ? getInt : getFloat;
          effectiveLeftType = leftType === 'I' || leftType === 'F' ? '#' : leftType;
          effectiveRightType = rightType === 'I' || rightType === 'F' ? '#' : rightType;
          if (instruction.opop === "⚖" || instruction.opop === "🙃⚖") {
            // TODO: reference types
            let bool = value.internalValue === value2.internalValue;

            if (instruction.opop === "⚖") result = bool ? TRUE : FALSE;
            else result = bool ? FALSE : TRUE;

          } else {

            switch (effectiveLeftType + instruction.opop + effectiveRightType) {
              case "#➕#": result = targetTypeBuilder(leftValue + rightValue); break;
              case "#➖#": result = targetTypeBuilder(leftValue - rightValue); break;
              case "#✖#": result = targetTypeBuilder(leftValue * rightValue); break;
              case "#➗#": if (rightValue === 0) return errorResult(instruction.token, "Division by 0"); result = targetTypeBuilder(leftValue / rightValue); break;
              case "#⚡#": result = targetTypeBuilder(leftValue ** rightValue); break;
              case "#👇#": result = getBool(leftValue < rightValue); break;
              case "#👆#": result = getBool(leftValue > rightValue); break;
              case "#👇⚖#": result = getBool(leftValue <= rightValue); break;
              case "#👆⚖#": result = getBool(leftValue >= rightValue); break;
              default: 
                if (instruction.opop === "➕" && (leftType === 'S' || rightType === 'S')) {
                  result = getString(toString(value) + toString(value2));
                } else {
                  return errorResult(instruction.token, "Operator not defined for " + value.type + instruction.opop + value2.type);
                }
                break;
            }
          }
          frame.values.push(result);
          break;

        case 'POP':
          frame.values.pop();
          break;

        case 'POP_AND_JUMP_IF_FALSE':
          value = frame.values.pop();
          if (value.type !== 'B') return errorResult(instruction.token, "A 🎠 loop expects a boolean condition");
          if (!value.internalValue) {
            frame.pc += instruction.offset;
          }
          break;

        case 'POP_ARG':
          frame.locals[instruction.name] = frame.args.pop();
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

        case 'VAR':
          value = frame.locals[instruction.name];
          if (!value) return errorResult(instruction.token, "Variable is not defined: " + instruction.name);
          frame.values.push(value);
          break;

        default: 
          throw new Error("Op code behavior not implemented: " + instruction.op);
      }

      frame.pc++;

      if (frame.pc < prevPc) {
        // Every 5 milliseconds, yield 3 milliseconds to the event loop to prevent the browser from hanging from infinite loops
        // Perform this check anytime the PC goes backwards.
        if (now() - lastBreak > 0.005) {
          await pause(0.003);
          lastBreak = now();
        }
      }
      prevPc = frame.pc;
    }
  };

  return Object.freeze({
    interpret,
  });
})();
