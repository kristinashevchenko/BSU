"use strict";

const Encode = (function () {
    // const alphabet = new Map([["a",0], ["b",1], ["c",2], ["d", 3], ["e",4 ], ["f",5], ["g",6], ["h",7],
    //     ["i",8], ["j",9], ["k",10], ["l",11], ["m",12], ["n",13], ["o",14], ["p",15],
    //     ["q",16], ["r",17], ["s",18], ["t",19], ["u",20], ["v",21], ["w",22], ["x",23], ["y",24], ["z",25]]);
    const alphabet = ["a", "b", "c", "d", "e", "f", "g", "h", "i", "j", "k", "l", "m", "n", "o", "p",
        "q", "r", "s", "t", "u", "v", "w", "x", "y", "z"];
    return {
        encode: function (text, word) {
            let newText = '';
            let index = 0;

            for (let i = 0; i < text.length; i++) {
                if (text[i].toLowerCase().match(/[a-z]/i)) {
                    let wordPosition = index % word.length;
                    let startChar = word[wordPosition];
                    let char = text[i].toLowerCase();
                    let charPos = alphabet.indexOf(char);
                    let pos = (charPos + alphabet.indexOf(startChar)) % 26;
                    newText += alphabet[pos];
                    index++;
                } else {
                    newText += text[i];
                }
            }
            return newText;
        },
        decode: function (text, word) {
            let newText = '';
            let index = 0;

            for (let i = 0; i < text.length; i++) {
                if (text[i].toLowerCase().match(/[a-z]/i)) {
                    let wordPosition = index % word.length;
                    let startSecret = word[wordPosition];
                    let char = text[i].toLowerCase();
                    let charPos = alphabet.indexOf(char);
                    let pos = charPos - alphabet.indexOf(startSecret);
                    if (pos < 0) pos += 26;
                    newText += alphabet[pos];
                    index++;
                } else {
                    newText += text[i];
                }
            }
            return newText;
        }
    }

})();

module.exports = Encode;