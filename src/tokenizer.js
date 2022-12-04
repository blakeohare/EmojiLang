const Tokens = (() => {

  const ZWJ = 8205;
  const ZWJ_CHAR = String.fromCharCode(ZWJ);
  const SKIN_TONES = new Set([
    0x1F3FB,
    0x1F3FC,
    0x1F3FD,
    0x1F3FE,
    0x1F3FF,
  ]);
  const SCISSORS = 9986;

  let isEmojiString = (str) => {
    let a = str[0].codePointAt(0);
    let b = str.length === 1 ? 0 : str[1].codePointAt(0);
    if (a >= 0x2000 && a <= 0x3300 && b === 0) return true;
    if (a >= 0xD83C && a <= 0xD83E && b >= 0xD000 && b <= 0xDFFF) return true;
    if (a === 0xA9 && b === 0) return true;
    if (a === 0xAE && b === 0) return true;
    if ((a === 0x2640 || a === 0x2642) && b === 0) return true;
    return false;
  };

  let isVariationSelector = (cp) => {
    return (0xFFF0 & cp) === 0xFE00; 
  }

  let canonicalizeEmoji = (v) => {
    let parts = unicodeSplit(v).filter(c => !isVariationSelector(c) && !SKIN_TONES.has(c));
    return parts.join("");
  };

  let unicodeSplit = (str) => {
    let output = [];
    let i = 0;
    while (i < str.length) {
      let char = String.fromCodePoint(str.codePointAt(i));
      output.push(char);
      i += char.length;
    }
    return output;
  };

  let tokenize = (str) => {
    let code = str.split("\r\n").join("\n").split("\r").join("\n").trimEnd() + "\n";
    let chars = unicodeSplit(code);

    let lines = [];
    let cols = [];
    let line = 1;
    let col = 1;
    for (let i = 0; i < chars.length; i++) {
      lines.push(line);
      cols.push(line);
      if (chars[i] === '\n') {
        col = 1;
        line++;
      } else {
        col++;
      }
    }

    let mode = 'NORMAL'; // NORMAL | COMMENT | EMOJI | STRING
    let tokenStart = -1;
    let emojiBuilder = [];
    let tokens = [];
    for (let i = 0; i < chars.length; i++) {
      let c = chars[i];
      let cp = c.codePointAt(0);
      switch (mode) {
        case 'NORMAL':
          if (c === ' ' || c === '\n' || c === '\t' || cp === 12288) {
            // skip whitespace
          } else if (cp === 129525) {
            mode = 'TEXT-STRING';
            tokenStart = i;
          } else if (cp === 128488) {
            mode = 'COMMENT';
          } else if (isVariationSelector(c)) {
            // omit variation selectors
          } else if (isEmojiString(c)) {
            mode = 'EMOJI';
            tokenStart = i;
            emojiBuilder = [c];
          } else if (cp === SCISSORS) {
            tokens.push({
              type: 'STRING',
              line: lines[i],
              col: cols[i],
              value: String.fromCodePoint(SCISSORS),
            });
          } else {
            return { error: true, line: lines[i], col: cols[i], message: "Unexpected character: " + c };
          }
          break;
        
        case 'EMOJI':
          if (isVariationSelector(cp)) {
            // skip!
          } else if (SKIN_TONES.has(cp)) {
            // EmojiLang does not see race
          } else if (cp === ZWJ) {
            if (i + 1 < chars.length && isEmojiString(chars[i + 1])) {
              // this is a multi-character emoji
              emojiBuilder.push(ZWJ_CHAR, chars[++i]);
            } else {
              return {
                error: true,
                message: "Invalid emoji",
                line: lines[i],
                col: cols[i],
              };
            }
          } else {
            // not a continuation of the same emoji. Repeat this character and push what you have.
            --i;
            tokens.push({
              type: 'EMOJI',
              lines: lines[tokenStart],
              col: cols[tokenStart],
              value: canonicalizeEmoji(emojiBuilder.join("")),
            });
            mode = 'NORMAL';
          }
          break;

        case 'COMMENT':
          if (c === '\n') {
            mode = 'NORMAL';
          }
          break;

        case 'STRING':
          if (cp === SCISSORS) { // scissors
            let literalValue = chars.slice(tokenStart, i + 1);
            let value = literalValue.slice(1, literalValue.length - 1).join("");
            tokens.push({
              type: 'STRING',
              line: lines[tokenStart],
              col: cols[tokenStart],
              literalValue: literalValue.join(""),
              value: value.join(""),
            });
            mode = 'NORMAL';
          }
          break;
        
        default:
          throw new Error("Invalid state");
      }
    }

    if (mode !== 'NORMAL') {
      return { error: true, line: lines.pop(), col: cols.pop(), error: "Encountered EOF but there is an unterminated string." };
    }

    return Object.freeze((() => {
      let i = 0;
      let len = tokens.length;

      let tokenStream = {
        error: false,
        hasMore: () => i < len,
        peek: () => i < len ? tokens[i] : null,
        pop: () => i < len ? tokens[i++] : null,
        peekValue: () => i < len ? tokens[i].value : null,
        isNext: (v) => {
          if (i < len) {
            let next = tokens[i];
            if (next.value === v || (next.type === 'EMOJI' && canonicalizeEmoji(v) === next.value)) {
              return true;
            }
          }
          return false;
        },
      };
      tokenStream.popIfPresent = (v) => {
        if (tokenStream.isNext(v)) {
          i++;
          return true;
        }
        return false;
      };
      return tokenStream;
    })());
  };

  return Object.freeze({
    tokenize,
    emojiCompare: (a, b) => canonicalizeEmoji(a) === canonicalizeEmoji(b),
  });
})();
