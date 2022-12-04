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
  const SKIN_TONE_CHARS = new Set([...SKIN_TONES].map(cp => String.fromCodePoint(cp)));
  const SCISSORS = 9986;
  const YARN_BALL = 129526;
  const SPEECH_BUBBLE = 128488;
  const FULL_WIDTH_SPACE = 12288;
  const GENDER_MALE = 0x2640;
  const GENDER_FEMALE = 0x2642;
  const GENDER_MALE_STR = String.fromCharCode(GENDER_MALE);
  const GENDER_FEMALE_STR = String.fromCharCode(GENDER_FEMALE);
  const ASCII_0 = '0'.charCodeAt(0);
  const ASCII_9 = ASCII_0 + 9;
  const NUMBER_BOX = 0x20e3;

  let isEmojiString = (str) => {
    let a = str[0].codePointAt(0);
    let b = str.length === 1 ? 0 : str[1].codePointAt(0);
    if (a >= 0x2000 && a <= 0x3300) return true;
    if (a >= 0xD83C && a <= 0xD83E && b >= 0xD000 && b <= 0xDFFF) return true;
    if (a === 0xA9 && b === 0) return true;
    if (a === 0xAE && b === 0) return true;
    return false;
  };

  let isVariationSelector = (cp) => {
    return (0xFFF0 & cp) === 0xFE00; 
  }

  let canonicalizeEmoji = (v, ignoreGender) => {
    let charCode = v.codePointAt(0);
    if (charCode >= ASCII_0 && charCode <= ASCII_9) return v; // leave number blocks alone!

    let parts = unicodeSplit(v)
      .filter(str => !isVariationSelector(str.codePointAt(0)) && !SKIN_TONE_CHARS.has(str));
    if (ignoreGender) {
      for (let i = 1; i < parts.length; i++) {
        let part = parts[i];
        if ((part === GENDER_MALE_STR || part === GENDER_FEMALE_STR) && parts[i - 1] === ZWJ_CHAR) {
          parts.splice(i - 1, 2);
          i -= 2;
        }
      }
    }
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
          if (c === ' ' || c === '\n' || c === '\t' || cp === FULL_WIDTH_SPACE) {
            // skip whitespace
          } else if (cp === YARN_BALL) {
            mode = 'STRING';
            tokenStart = i;
          } else if (cp === SPEECH_BUBBLE) {
            mode = 'COMMENT';
          } else if (isVariationSelector(cp)) {
            // omit variation selectors
          } else if (isEmojiString(c)) {
            mode = 'EMOJI';
            tokenStart = i;
            emojiBuilder = [c];
          } else if (cp === SCISSORS) {
            let scissorEmoji = String.fromCodePoint(SCISSORS);
            tokens.push({
              type: 'STRING',
              line: lines[i],
              col: cols[i],
              value: scissorEmoji,
              literalValue: scissorEmoji,
            });
          } else if (cp >= ASCII_0 && cp <= ASCII_9 && 
              i + 1 < chars.length && isVariationSelector(chars[i + 1].codePointAt(0)) &&
              i + 2 < chars.length && chars[i + 2].codePointAt(0) === NUMBER_BOX) {
            // This is the boxed number emojis. They use the ASCII number as the root character.
            let numChar = chars.slice(i, i + 3).join("")
            tokens.push({
              type: 'EMOJI',
              line: lines[i],
              col: cols[i],
              value: numChar,
              literalValue: numChar,
            });
            i += 2;
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
            let value = canonicalizeEmoji(emojiBuilder.join(""));
            tokens.push({
              type: 'EMOJI',
              line: lines[tokenStart],
              col: cols[tokenStart],
              value: value,
              literalValue: value,
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
              value,
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
        isNext: (v, ignoreGender) => {
          if (i < len) {
            let next = tokens[i];
            if (next.value === v || (next.type === 'EMOJI' && emojiCompare(v, next.value, ignoreGender))) {
              return true;
            }
          }
          return false;
        },
      };

      tokenStream.areNext = (a, b, ignoreGender) => {
        if (tokenStream.isNext(a, ignoreGender)) {
          let oldIndex = i;
          tokenStream.pop();
          let result = tokenStream.isNext(b, ignoreGender);
          i = oldIndex;
          return result;
        }
        return false;
      };

      tokenStream.ensureMore = () => {
        if (i >= len) Util.throwParseError(null, "Unexpected end of file");
      };

      tokenStream.popEmoji = () => {
        tokenStream.ensureMore();
        let token = tokenStream.pop();
        if (token.type !== 'EMOJI') Util.throwParseError(token, "Expected an emoji but found " + token.literalValue);
        return token.value;
      };

      tokenStream.popIfPresent = (v, ignoreGender) => {
        if (tokenStream.isNext(v, ignoreGender)) {
          i++;
          return true;
        }
        return false;
      };

      tokenStream.popExpected = (v, ignoreGender) => {
        let next = tokenStream.peek();
        if (!tokenStream.popIfPresent(v, ignoreGender)) {
          let nextValue = next ? next.literalValue : "<EOF>";
          if (nextValue.length > 30) {
            nextValue = unicodeSplit(nextValue).slice(0, 30).join("") + "...";
          }
          throw Util.throwParseError(next, "Unexpected token. Expected " + v + " but found " + nextValue + " instead.");
        }
        return next;
      };

      tokenStream.popValue = () => {
        let token = tokenStream.pop();
        if (token) return token.value;
        return null;
      };

      return tokenStream;
    })());
  };

  let emojiCompare = (a, b, ignoreGender) => { 
    return canonicalizeEmoji(a, ignoreGender) === canonicalizeEmoji(b, ignoreGender);
  };

  return Object.freeze({
    tokenize,
    emojiCompare,
    canonicalizeEmoji,
  });
})();
