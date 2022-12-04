const Serializer = (() => {

  let encodeToByteCode = (bundle) => {
    let buffer = [];
    for (let funcDef of bundle) {
      serializeFunctionDefinition(buffer, funcDef);
    }
    buffer.push({
      op: 'INVOKE',
      isBuiltIn: false,
      name: Tokens.canonicalizeEmoji("▶️"),
      argc: 0,
    });

    buffer.push({ op: 'RETURN' });

    return buffer;
  };

  let serializeFunctionInvocation = (buffer, invocation) => {
    for (let i = 0; i < invocation.args.length; i++) {
      let arg = invocation.args[i];
      serializeExpression(buffer, arg);
    }
    buffer.push({
      op: 'INVOKE',
      token: invocation.firstToken,
      argc: invocation.args.length,
      name: invocation.name,
      isBuiltIn: invocation.isBuiltIn,
    });
  };

  let serializeFunctionDefinition = (buffer, funcDef) => {
    
    buffer.push({
      op: 'FUNCTION_DEF',
      token: funcDef.firstToken,
      name: funcDef.name,
      argc: funcDef.args.length,
    });

    let innerBuffer = [];

    for (let i = 0; i < funcDef.args.length; i++) {
      let arg = funcDef.args[i];
      innerBuffer.push({ op: 'POP_ARG', name: arg[i] });
    }

    for (let i = 0; i < funcDef.code.length; i++) {
      serializeStatement(innerBuffer, funcDef.code[i]);
    }
    innerBuffer.push({ op: 'NULL' });
    innerBuffer.push({ op: 'RETURN' });

    buffer.push({
      op: 'JUMP',
      offset: innerBuffer.length,
    });
    buffer.push(...innerBuffer);
  };

  let serializeStatement = (buffer, stmt) => {
    switch (stmt.type) {
      case 'RETURN': return serializeReturn(buffer, stmt);
      case 'ASSIGN-VAR': return serializeAssignVar(buffer, stmt);
      case 'CONDITIONAL': return serializeConditional(buffer, stmt);
      case 'LOOP': return serializeLoop(buffer, stmt);
      case 'EXPR': 
        serializeExpression(buffer, stmt.expression);
        buffer.push({ op: 'POP' });
        return;
      default: throw new Error("NYI: " + stmt.type);
    }
  };

  let serializeReturn = (buffer, ret) => {
    serializeExpression(buffer, ret.expression);
    buffer.push({ op: 'RETURN', token: ret.firstToken });
  };

  let serializeAssignVar = (buffer, asgn) => {
    serializeExpression(buffer, asgn.expression);
    buffer.push({ op: 'ASSIGN-VAR', name: asgn.name, token: asgn.firstToken });
  };

  let serializeConditional = (buffer, cond) => {
    let trueBuffer = [];
    let falseBuffer = [];
    for (let item of cond.trueCode) {
      serializeStatement(trueBuffer, item);
    }
    for (let item of cond.falseCode) {
      serializeStatement(falseBuffer, item);
    }
    trueBuffer.push({ op: 'JUMP', offset: falseBuffer.length });
    serializeExpression(buffer, cond.condition);
    buffer.push({ op: 'POP_AND_JUMP_IF_FALSE', offset: trueBuffer.length });
    buffer.push(...trueBuffer);
    buffer.push(...falseBuffer);
  };

  let serializeLoop = (buffer, loop) => {
    let loopBody = [];
    for (let item of loop.code) {
      serializeStatement(loopBody, item);
    }
    let conditionBuffer = [];
    serializeExpression(conditionBuffer, loop.condition);
    conditionBuffer.push({ op: 'POP_AND_JUMP_IF_FALSE', offset: loopBody.length + 1 });
    loopBody.push({ op: 'JUMP', offset: -conditionBuffer.length - loopBody.length - 1 });
    buffer.push(...conditionBuffer, ...loopBody);
  };

  let serializeExpression = (buffer, expr) => {
    switch (expr.type) {
      case 'OPS': return serializeOps(buffer, expr);
      case 'NEGATIVE': return serializeNegative(buffer, expr);
      case 'NOT': return serializeNot(buffer, expr);
      case 'KEY': return serializeDictKey(buffer, expr);
      case 'INDEX': return serializeArrayIndex(buffer, expr);
      case 'STRING': return serializeStringLiteral(buffer, expr);
      case 'FLOAT': return serializeFloatLiteral(buffer, expr);
      case 'INT': return serializeIntegerLiteral(buffer, expr);
      case 'BOOL': return serializeBooleanLiteral(buffer, expr);
      case 'NULL': return serializeNullLiteral(buffer, expr);
      case 'FUNCTION': return serializeFunctionInvocation(buffer, expr);
      case 'VARIABLE': return serializeVariable(buffer, expr);
      default: throw new Error("NYI: " + expr.type);
    }
  };

  let serializeStringLiteral = (buffer, str) => {
    buffer.push({ op: 'STRING', token: str.firstToken, value: str.value });
  };

  let serializeFloatLiteral = (buffer, float) => {
    buffer.push({ op: 'FLOAT', token: float.firstToken, value: float.value });
  };

  let serializeIntegerLiteral = (buffer, int) => {
    buffer.push({ op: 'INTEGER', token: int.firstToken, value: int.value });
  };

  let serializeBooleanLiteral = (buffer, bool) => {
    buffer.push({ op: 'BOOLEAN', token: bool.firstToken, value: bool.value });
  };

  let serializeNullLiteral = (buffer, n) => {
    buffer.push({ op: 'NULL', token: n.firstToken });
  };

  let serializeNegative = (buffer, neg) => {
    serializeExpression(buffer, neg.root);
    buffer.push({ op: 'NEGATIVE', token: neg.firstToken });
  };

  let serializeNot = (buffer, notUnary) => {
    serializeExpression(buffer, notUnary.root);
    buffer.push({ op: 'NOT', token: notUnary.firstToken });
  };

  let serializeDictKey = (buffer, dictKey) => {
    serializeExpression(buffer, dictKey.root);
    serializeExpression(buffer, dictKey.key);
    buffer.push({ op: 'DICT_KEY', token: dictKey.keyToken });
  };

  let serializeArrayIndex = (buffer, arrIndex) => {
    serializeExpression(buffer, arrIndex.root);
    serializeExpression(buffer, arrIndex.index);
    buffer.push({ op: 'ARRAY_INDEX', token: arrIndex.indexToken });
  };

  let serializeOps = (buffer, opChain) => {
    if (opChain.ops[0] === '🎎' || opChain.ops[0] === '🎏') throw new Error("NYI: && and || short-circuiting");

    serializeExpression(buffer, opChain.expressions[0]);
    for (let i = 0; i < opChain.ops.length; i++) {
      let op = opChain.ops[i];
      let expr = opChain.expressions[i + 1];
      serializeExpression(buffer, expr);
      buffer.push({ op: 'OP', opop: op, token: expr.firstToken });
    }
  };

  return Object.freeze({
    encodeToByteCode,
  });
})();
