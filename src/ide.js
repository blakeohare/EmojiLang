const IDE = (() => {

  let editorUi = null;
  let code = window.localStorage.getItem('emoji_code') || '';
  let init = () => {
    editorUi = document.getElementById('editor');
    editorUi.value = code;

    let applyEditorChanges = () => {
      if (editorUi.value !== code) {
        code = editorUi.value || '';
        window.localStorage.setItem('emoji_code', code);
      }
    };
    editorUi.addEventListener('change', applyEditorChanges);
    editorUi.addEventListener('keydown', applyEditorChanges);

    document.getElementById('run-btn').addEventListener('click', () => {
      let oc = document.getElementById('output-console');
      Util.clearChildren(oc);
      Runner.run(code);
    });

    let inject = (newCode) => {
      let left = code.substring(0, editorUi.selectionStart);
      let right = code.substring(editorUi.selectionEnd);
      let parts = newCode.split('|');
      if (parts.length === 1) {
        left += newCode;
      } else if (parts.length === 2) {
        left += parts[0];
        right = parts[1] + right;
      } else {
        throw new Error();
      }
      editorUi.value = left + right;
      editorUi.selectionStart = left.length;
      editorUi.selectioEnd = right.length;
      applyEditorChanges();
      editorUi.focus();
    };

    let explainerHost = document.getElementById('explainer');
    for (let item of paletteButtons) {
      if (typeof item !== 'object') continue;
      let buttons = item.buttons;
      let codePattern = item.code;
      if (item.btn) {
        buttons = [item.btn];
      }
      let li = document.createElement('li');
      for (let button of buttons) {
        let btn = document.createElement('button');
        btn.append(button);
        btn.addEventListener('click', () => {
          inject(codePattern.split('%').join(button));
        });
        li.append(btn);
      }
      li.append(' ', item.label);
      explainerHost.append(li);
    }
    updateIcon();
    setInterval(updateIcon, 12 * 1000);
  };

  let allEmojis = null;
  let updateIcon = () => {
    let host = document.getElementById('title-icon');
    if (!allEmojis) {
      allEmojis = [];
      // anything used for sexual innuendo, religious, or just kind of weird as the first impression
      // are ommitted from the title roulette.
      let notThese = new Set("🍆 🍑 🦪 🌽 ⛪ 🕋 🕌 🛕 🕍 🏩 🚬".split(" "));
      for (let pb of paletteButtons) {
        if (pb.btn) allEmojis.push(pb.btn);
        else allEmojis.push(...pb.buttons);
      }
      allEmojis = allEmojis.filter(e => !notThese.has(e));
    }
    let emoji = allEmojis[Math.floor(Math.random() * allEmojis.length)];
    host.innerText = emoji;
  };

  let emitToConsole = (msg, isError) => {
    let oc = document.getElementById('output-console');
    if (oc.children.length > 300) {
      oc.removeChild(oc.firstChild);
    }
    let wrapper = document.createElement('div');
    wrapper.innerText = msg;
    if (isError) {
      wrapper.style.backgroundColor = '#f8b';
    }
    wrapper.style.borderBottom = '1px solid #aaa';
    oc.append(wrapper);
    oc.scrollTop = oc.scrollHeight;
  };

  let paletteButtons = [
    { 
      btn: "🤸‍♂️",
      code: "🤸‍♂️name|🚦\n  body\n🙍‍♂️", 
      label: "Function Definition",
    },
    {
      btn: "🤬",
      code: "🤬argName|🗄️",
      label: "Function argument declaration",
    },
    {
      btn: "📢",
      code: "📢var name⬅️value🗄️",
      label: "Variable assignment",
    },
    {
      btn: "🎠",
      code: "🎠cond🎱code🐴",
      label: "While loop",
    },
    {
      btn: "📦",
      code: "📦func name⚪arg1⚪arg2⚪etc🏁",
      label: "built-in function",
    },
    {
      btn: "👉",
      code: "👉func name⚪arg1⚪arg2⚪etc🏁",
      label: "user-def function",
    },
    {
      btn: "🤮",
      code: "🤮value😷",
      label: "Return",
    },
    {
      btn: "🤷‍♂️",
      code: "🤷‍♂️condition🎱code🤦‍♂️",
      label: "If statement",
    },
    {
      btn: "🙅‍♂️",
      code: "🤷‍♂️condition🎱code🙅‍♂️code🤦‍♂️",
      label: "If/Else statement",
    },
    {
      btn: "⚖️",
      code: "exp1⚖️exp2",
      label: "conditional: equal",
    },
    {
      btn: "🙃⚖️",
      code: "exp1🙃⚖️exp2",
      label: "conditional: not equal",
    },
    {
      btn: "👇",
      code: "exp1👇exp2",
      label: "conditional: less than",
    },
    {
      btn: "👇⚖️",
      code: "exp1👇⚖️exp2",
      label: "conditional: less than or equal",
    },
    {
      btn: "👆",
      code: "exp1👆exp2",
      label: "conditional: greater than",
    },
    {
      btn: "👆⚖️",
      code: "exp1👆⚖️exp2",
      label: "conditional: greater than or equal",
    },
    {
      btn: "🙃",
      code: "🙃value",
      label: "boolean not operator",
    },
    {
      buttons: ["➕", "➖", "✖️", "➗"],
      code: "num1%num2",
      label: "Math operators",
    },
    {
      buttons: ["0️⃣", "1️⃣", "2️⃣", "3️⃣", "4️⃣", "5️⃣", "6️⃣", "7️⃣", "8️⃣", "9️⃣"],
      code: "%",
      label: "Numbers",
    },
    {
      btn: "⏺",
      code: "⏺",
      label: "Decimal",
    },
    {
      btn: "⚡",
      code: "num1⚡num2",
      label: "Exponent",
    },
    {
      btn: "🧶",
      code: "🧶value✂️",
      label: "Text String",
    },
    {
      btn: "🧵",
      code: "🧵value✂️",
      label: "Emoji String",
    },
    {
      btn: "✂️",
      code: "✂️",
      label: "Scissor String Literal",
    },
    { 
      btn: "☂️",
      code: "☂️", 
      label: "TRUE boolean literal",
    },
    { 
      btn: "🌂",
      code: "🌂", 
      label: "FALSE boolean literal",
    },
    { 
      btn: "📭",
      code: "📭", 
      label: "NULL literal",
    },
    { 
      btn: "▶️",
      code: "🤸‍♂️▶️🚦\n  body\n🙍‍♂️", 
      label: "Main Function",
    },
    { 
      btn: "🤜",
      code: "🤜expression🤛", 
      label: "Parentheses",
    },
    { 
      buttons: ["🎎", "🎏"],
      code: "%", 
      label: "Boolean AND and NOT",
    },
    { 
      btn: "🔑",
      code: "dictionary🔑key🔒", 
      label: "Dictionary key access",
    },
    { 
      btn: "📑",
      code: "array📑num🔍", 
      label: "Array index access",
    },
    {
      buttons: "🍕 🍔 🍟 🌭 🍿 🧂 🥓 🥚 🍳 🧇 🥞 🧈 🍞 🥐 🥨 🥯 🥖 🧀 🥗 🥙 🥪 🌮 🌯 🥫 🍖 🍗 🥩 🍠 🥟 🥠 🥡 🍱 🍘 🍙 🍚 🍛 🍜 🦪 🍣 🍤 🍥 🥮 🍢 🧆 🥘 🍲 🍝 🥣 🥧 🍦 🍧 🍨 🍩 🍪 🎂 🍰 🧁 🍫 🍬 🍭 🍡 🍮 🍯 🍼 🥛 🧃 ☕ 🍵 🧉 🍶 🍾 🍷 🍸 🍹 🍺 🍻 🥂 🥃 🧊 🥤 🥢 🍽️ 🍴 🥄 🏺 🥝 🥥 🍇 🍈 🍉 🍊 🍋 🍌 🍍 🥭 🍎 🍏 🍐 🍑 🍒 🍓 🍅 🍆 🌽 🌶️ 🍄 🥑 🥒 🥬 🥦 🥔 🧄 🧅 🥕 🌰 🥜".split(" "),
      code: "%",
      label: "Available emojis for naming"
    },
    {
      buttons: "💐 🌸 🏵️ 🌹 🌺 🌻 🌼 🌷 🥀 ☘️ 🌱 🌲 🌳 🌴 🌵 🌾 🌿 🍀 🍁 🍂 🍃".split(" "),
      code: "%",
      label: "Available emojis for naming"
    },
    {
      buttons: "🎈 🎆 🎇 🧨 ✨ 🎉 🎊 🎃 🎄 🎋 🎍 🎐 🎑 🧧 🎀 🎁 🎗️ 🎞️ 🎟️ 🎫 🎡 🎢 🎪 🎭 🖼️ 🎨 🛒".split(" "),
      code: "%",
      label: "Available emojis for naming"
    },
    {
      buttons: "👓 🕶️ 🦺 🥽 🥼 🧥 👔 👕 👖 🩳 🧣 🧤 🧦 👗 🥻 👘 👚 🩲 🩱 👙 👛 👜 👝 🛍️ 🎒 👞 👟 🥾 🥿 👠 👡 👢 🩰 👑 🧢 ⛑️ 👒 🎩 🎓 💋 💄 💍 💎".split(" "),
      code: "%",
      label: "Available emojis for naming",
    },
    {
      buttons: "⚽ ⚾ 🥎 🏀 🏐 🏈 🏉 🎱 🎳 🥌 ⛳ ⛸️ 🎣 🤿 🎽 🛶 🎿 🛷 🥅 🏒 🥍 🏏 🏑 🏓 🏸 🎾 🥏 🪁 🎯 🥊 🥋 🥇 🥈 🥉 🏅 🎖️ 🏆 🎮 🕹️ 🎰 🎲 🔮 🧿 🧩 🧸 🪀 🎴 🃏 🀄 ♟️".split(" "),
      code: "%",
      label: "Available emojis for naming",
    },
    {
      buttons: "🔈 🔉 🔊 📣 🔔 🎼 🎵 🎶 🎙️ 🎤 🎚️ 🎛️ 🎧 📯 🥁 🎷 🎺 🎸 🪕 🎻 🎹 📻 🎥 🎬 📽️ 📡 📺 📷 📸 📹 📼".split(" "), 
      code: "%",
      label: "Available emojis for naming",
    },
    {
      buttons: "🔓 🔏 🔐 🗝️ 🪓 🔨 ⛏️ ⚒️ 🛠️ 🔧 🔩 🧱 ⚙️ 🗜️ 🛢️ ⚗️ 🧪 🧫 🧬 🩺 💉 🩸 🩹 💊 🔬 🔭 📿 🔗 ⛓️ 🧰 🧲 🦯 🛡️ 🏹 🗡️ ⚔️ 🔪 💣 🔫 ⚰️ ⚱️ 🗿 🕯️ 🪔 💡 🔦 🏮".split(" "), 
      code: "%",
      label: "Available emojis for naming",
    },
    {
      buttons: "☎️ 📞 📟 📠 📱 📲 📳 📴 🚬 🔋 🔌 💻 🖥️ ⌨️ 🖱️ 🖲️ 💽 💾 💿 📀 🧮 🔎 📔 📕 📖 📗 📘 📙 📚 📓 📒 📃 📜 📄 📰 🗞️ 🔖 🏷️ 💰 💴 💵 💶 💷 💸 💳 🧾 🏧 ✉️ 📧 📨 📩 📤 📥 📫 📪 📬 📮 🗳️ ✏️ ✒️ 🖋️ 🖊️ 🖌️ 🖍️ 📝 🗒️ 💼 📁 📂 🗂️ 📅 📆 🗓️ 📇 📈 📉 📊 📋 📌 📍 📎 🖇️ 📏 📐 🗃️ 🗄️ 🗑️ ⌛ ⏳ ⌚ ⏰ ⏱ ⏲ 🕰".split(" "),
      code: "%",
      label: "Available emojis for naming",
    }
  ];

  return Object.freeze({
    init,
    emitToConsole,
  });
})();
