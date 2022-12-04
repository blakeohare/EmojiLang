const Parser = (() => {

  let parse = (tokens) => {
    let functionLookup = {};
    while (tokens.hasMore()) {
      let func = parseFunction(tokens);
      if (functionLookup[func.name]) Util.throwParseError(func, "Duplicate functions named " + func.name);
      functionLookup[func.name] = func;
    }
    return {
      functionsByName: functionLookup,
    };
  };

  let parseFunction = (tokens) => {
    let first = tokens.popExpected("🤸🏻‍♂️", true);
    let name = tokens.popEmoji();
    tokens.popExpected("🚦");
    let args = [];
    while (tokens.isNext("🤬")) {
      tokens.popExpected("🤬");
      args.push(tokens.popEmoji());
      tokens.popExpected("🗄️");
    }
    let code = [];
    while (!tokens.popIfPresent("🙍🏻‍♂️", true)) {
      code.push(parseLine(tokens));
    }

    return {
      firstToken: first,
      name,
      args,
      code,
    };
  };

  let parseLine = (tokens) => {
    tokens.ensureMore();
    if (tokens.isNext("📢")) return parseAssignment(tokens);
    if (tokens.isNext("🤷‍♂️")) return parseConditional(tokens);
    if (tokens.isNext("🎠")) return parseWhileLoop(tokens);
    if (tokens.isNext("🤮")) return parseReturn(tokens);
    return parseExpressionAsExec(tokens)
  };

  let parseWhileLoop = (tokens) => {
    let firstToken = tokens.popExpected("🎠");
    let condition = parseExpression(tokens);
    tokens.popExpected("🎱");
    let code = [];
    while (!tokens.popIfPresent("🐴")) {
      code.push(parseLine(tokens));
    }

    return {
      firstToken,
      type: 'LOOP',
      condition,
      code,
    };
  };

  let parseReturn = (tokens) => {
    let firstToken = tokens.popExpected("🤮");
    let expr = parseExpression(tokens);
    tokens.popExpected("😷");
    return {
      firstToken,
      type: 'RETURN',
      expression: expr,
    };
  };

  let parseAssignment = (tokens) => {
    let firstToken = tokens.popExpected("📢");
    if (tokens.isNext("🎭")) {
      throw new Error("NYI"); // assign to dictionaries and array expressions
    }
    let varName = tokens.popEmoji();
    tokens.popExpected("⬅️");
    let expr = parseExpression(tokens);
    tokens.popExpected("🗄️");

    return {
      firstToken,
      type: 'ASSIGN-VAR',
      name: varName,
      expression: expr,
    };
  };

  let parseConditional = (tokens) => {
    let firstToken = tokens.popExpected("🤷‍♂️", true);
    let condition = parseExpression(tokens);
    tokens.popExpected("🎱");
    let trueCode = [];
    let falseCode = [];
    while (!tokens.isNext("🙅‍♂️", true) && !tokens.isNext("🤦‍♂️", true)) {
      trueCode.push(parseStatement(tokens));
    }

    if (tokens.popIfPresent("🙅‍♂️", true)) {
      while (!tokens.isNext("🤦‍♂️", true)) {
        falseCode.push(parseStatement(tokens));
      }
    }
    tokens.popExpected("🤦‍♂️", true);
    return {
      firstToken,
      type: 'CONDITIONAL',
      condition,
      trueCode,
      falseCode,
    };
  };

  let parseExpressionAsExec = (tokens) => {
    let expr = parseExpression(tokens);
    return {
      firstToken: expr.firstToken,
      type: 'EXPR',
      expression: expr,
    };
  };

  let parseExpression = (tokens) => {
    return parseBooleanCombination(tokens);
  }

  let createSimpleOpParse = (opChoices, nextParser) => {
    let isNext = (tokens) => {
      for (let i = 0; i < opChoices.length; i++) {
        if (tokens.isNext(opChoices[i], true)) return true;
      }
      return false;
    };
    return (tokens) => {
      let first = nextParser(tokens);
      if (isNext(tokens)) {
        let expressions = [first];
        let ops = [];
        while (isNext(tokens)) {
          ops.push(tokens.popEmoji());
          expressions.push(nextParser(tokens));
        }
        return {
          firstToken: first.firstToken,
          type: 'OPS',
          expressions,
          ops,
        }
      }
      return first;
    };
  };

  let parseEquality = (tokens) => {
    let left = parseComparison(tokens);
    let op = null;
    let right = null;
    if (tokens.isNext("⚖️")) {
      op = tokens.popEmoji();
      right = parseComparison(tokens);
    } else if (tokens.areNext("🙃", "⚖️")) {
      op = tokens.popEmoji() + tokens.popEmoji();
      right = parseComparison(tokens);
    } else {
      return left;
    }
    return {
      type: 'OPS',
      firstToken: left.firstToken,
      expressions: [left, right],
      ops: [op],
    };
  };

  let parseBooleanCombination = createSimpleOpParse(["🎎", "🎏"], parseEquality);
  
  let parseUnary = (tokens) => {
    if (tokens.isNext("🙃") || tokens.isNext("➖")) {
      let firstToken = token.pop();
      let root = parseUnary(tokens);
      return {
        firstToken,
        type: firstToken.value === "➖" ? 'NEGATIVE' : 'NOT',
        expression: root,
      };
    }
    return parseEntityChain(tokens);
  };

  let parseExponent = createSimpleOpParse(["⚡"], parseUnary);
  let parseMultiplication = createSimpleOpParse(["✖️", "➗"], parseExponent);
  let parseAddition = createSimpleOpParse(["➕", "➖"], parseMultiplication);

  let parseComparison = (tokens) => {
    let first = parseAddition(tokens);
    if (tokens.isNext("👆") || tokens.isNext("👇")) {
      let expressions = [first];
      let ops = [];
      while (tokens.isNext("👆") || tokens.isNext("👇")) {
        let op = tokens.popEmoji();
        if (tokens.isNext("⚖️")) {
          op += tokens.popEmoji();
        }
        ops.push(op);
        expressions.push(parseAddition(tokens));
      }
      return {
        type: 'OPS',
        firstToken: first.firstToken,
        expressions,
        ops,
      }
    }
    return first;
  };

  let parseEntityChain = (tokens) => {
    let root = null;
    if (tokens.isNext("🤜")) {
      tokens.pop();
      root = parseExpression(tokens);
      tokens.popExpected("🤛");
    } else {
      root = parseEntity(tokens);
    }

    let keepChecking = true;
    while (keepChecking && tokens.hasMore()) {
      if (tokens.isNext("🔑")) {
        let keyOp = tokens.pop();
        let keyExpr = parseExpression(tokens);
        tokens.popExpected("🔒");
        root = {
          firstToken: root.firstToken,
          type: 'KEY',
          root,
          keyToken: keyOp,
          key: keyExpr,
        };
      } else if (tokens.isNext("📑")) {
        let indexOp = tokens.pop();
        let indexExpr = parseExpression(tokens);
        tokens.popExpected("🔍");
        root = {
          firstToken: root.firstToken,
          type: 'INDEX',
          root,
          indexToken: indexOp,
          index: indexExpr,
        };
      } else {
        keepChecking = false;
      }
    }

    return root;
  };

  let numList = ["0️⃣", "1️⃣", "2️⃣", "3️⃣", "4️⃣", "5️⃣", "6️⃣", "7️⃣", "8️⃣", "9️⃣"];
  let nums = {};
  for (let i = 0; i < 10; i++) {
    nums[numList[i]] = i + "";
  }
  nums["⏺"] = ".";

  let parseEntity = (tokens) => {
    tokens.ensureMore();
    let firstToken = tokens.peek();
    if (tokens.peek().type === 'STRING') {
      tokens.pop();
      return {
        firstToken,
        type: 'STRING',
        value: firstToken.value,
      };
    }
    if (tokens.isNext("✂️")) {
      tokens.pop();
      return {
        firstToken,
        type: 'STRING',
        value: '✂️',
      };
    }
    if (nums[tokens.peekValue()] !== undefined) {
      let sb = [];
      while (nums[tokens.peekValue()] !== undefined) {
        sb.push(nums[tokens.popValue()]);
      }
      let numValueStr = sb.join("");
      if (numValueStr.indexOf(".") !== -1) {
        let floatValue = parseFloat(numValueStr);
        if (isNaN(floatValue)) throw Util.throwParseError(firstToken, "Invalid float value: " + numValueStr);
        return {
          firstToken,
          type: 'FLOAT',
          value: floatValue,
        };
      }
      let intValue = parseInt(numValueStr);
      if (isNaN(intValue)) throw Util.throwParseError(firstToken, "Invalid integer value: " + numValueStr);
      return {
        firstToken,
        type: 'INT',
        value: intValue,
      };
    }

    if (tokens.isNext("☂️") || tokens.isNext("🌂")) {
      tokens.pop();
      return { 
        firstToken,
        type: 'BOOL',
        value: firstToken.value === "☂️",
      };
    }

    if (tokens.isNext("📭")) {
      tokens.pop();
      return {
        firstToken,
        type: 'NULL',
        value: null,
      };
    }

    if (tokens.isNext("📦") || tokens.isNext("👉")) {
      let isBuiltIn = tokens.isNext("📦");
      tokens.pop();
      let funcName = tokens.popEmoji();
      let args = [];
      while (tokens.isNext("⚪")) {
        tokens.popExpected("⚪");
        args.push(parseExpression(tokens));
      }
      tokens.popExpected("🏁");
      return {
        firstToken,
        type: 'FUNCTION',
        isBuiltIn,
        name: funcName,
        args,
      };
    }

    let emojiVar = tokens.popEmoji();
    return {
      firstToken,
      type: 'VARIABLE',
      name: emojiVar,
    };
  };

  return Object.freeze({
    parse,
  });
})();
