const Cryptoanalyz = (function () {

    const frequency = [{key: 'a', value: 0.08167}, {key: 'b', value: 0.01492}, {key: 'c', value: 0.02782}, {
        key: 'd',
        value: 0.04253
    }, {key: 'e', value: 0.12702},
        {key: 'f', value: 0.0228}, {key: 'g', value: 0.02015}, {key: 'h', value: 0.06094}, {
            key: 'i',
            value: 0.06966
        }, {key: 'j', value: 0.00152},
        {key: 'k', value: 0.00772}, {key: 'l', value: 0.04025}, {key: 'm', value: 0.02406}, {
            key: 'n',
            value: 0.06749
        }, {key: 'o', value: 0.07507},
        {key: 'p', value: 0.01929}, {key: 'q', value: 0.00095}, {key: 'r', value: 0.05987}, {
            key: 's',
            value: 0.06237
        }, {key: 't', value: 0.09056},
        {key: 'u', value: 0.02758}, {key: 'v', value: 0.00978}, {key: 'w', value: 0.0236}, {
            key: 'x',
            value: 0.0015
        }, {key: 'y', value: 0.01974},
        {key: 'z', value: 0.00074}];
    const alphabet = ["a", "b", "c", "d", "e", "f", "g", "h", "i", "j", "k", "l", "m", "n", "o", "p",
        "q", "r", "s", "t", "u", "v", "w", "x", "y", "z"];
    return {
        nod: function (a, b) {
            let i;
            for (i = a; i > 1; --i)
                if ((a % i == 0) && (b % i == 0)) return i;
            return 1;
        },
        kasiski: function (len, text) {
            let str1 = '', str2 = '';
            let map = new Map();

            for (let i = 0; i < text.length; i++) {
                let m = 0, k = i;
                str1 = '';
                while (m != len && k < text.length) {
                    if (text[k].match(/[a-z]/i)) {
                        str1 += text[k];
                        m++;
                    }
                    k++;
                }

                for (let j = i + 1; j < text.length; j++) {
                    m = 0;
                    k = j;
                    str2 = '';
                    while (m != len && k < text.length) {
                        if (text[k].match(/[a-z]/i)) {
                            str2 += text[k];
                            m++;
                        }
                        k++;
                    }

                    if (str1 === str2) {
                        let i2, a = j - i;
                        if (!map.get(a)) {
                            for (i2 = a; i2 > 1; i2--)
                                if ((a % i2 == 0)) {
                                    let val = map.get(i2);
                                    if (val) {
                                        map.set(i2, val + 1);
                                    } else {
                                        map.set(i2, 1);
                                    }
                                }
                        }
                        continue;
                    }

                }
            }
            const keyMap = new Map(Array.from(map).sort((a, b) => {
                return b[1] - a[1];
            }));

            let keylen = [];

            for (let key of keyMap.keys()) {
                if (keylen.length < 4) {
                    keylen.push({len: key});
                }
            }
            let words = [];
            keylen.forEach((obj) => {
                let word = Cryptoanalyz.analyze(obj.len, text);
                words.push(word);
            });
            console.log(words);
            return words;

        },
        analyze: function (len, text) {
            let mapArray = [];
            for (let i = 0; i < len; i++) {
                let map = new Map();
                mapArray.push(map);
            }
            let m = 0;
            for (let i = 0; i < text.length; i++) {
                let char = text[i];
                if (char.match(/[a-z]/i)) {
                    let index = m % len;
                    let val = mapArray[index].get(char);
                    if (val) {
                        mapArray[index].set(char, val + 1);
                    } else {
                        mapArray[index].set(char, 1);
                    }
                    m++;
                }
            }
            let chars = [];
            mapArray.forEach(map => {
                let maxFreq = 0, char, length = 0;
                for (let obj of map) {
                    length += obj[1];
                    if (obj[1] > maxFreq) {
                        maxFreq = obj[1];
                        char = obj[0];
                    }
                }
                let eps = 1000000, decryptChar;
                maxFreq = maxFreq / length;
                frequency.forEach((obj) => {
                    if (eps > Math.abs(maxFreq - obj.value)) {
                        eps = Math.abs(maxFreq - obj.value);
                        decryptChar = obj.key;

                    }
                });
                chars.push({char: char, decryptChar: decryptChar});
            });
            console.log(chars);

            return Cryptoanalyz.findWord(chars);


        },
        findWord(chars) {
            let word = '';
            chars.forEach(charObj => {
                let beforeIndex = alphabet.indexOf((charObj.decryptChar));
                let afterIndex = alphabet.indexOf((charObj.char));
                let pos = afterIndex - beforeIndex;
                if (pos < 0) pos += 26;
                word += alphabet[pos];

            });
            return word;
        }
    }
})();

module.exports = Cryptoanalyz;