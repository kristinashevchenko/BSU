const RSA = (function () {


    return {
        evklid: function (a, b) {// это расширеный алгоритм евклида
            if (a == 0)
                return {nod: b, d: 0, q: 1};
            let res = RSA.evklid(b % a, a);
            return {nod: res.nod, d: res.q - res.d * Math.floor(b / a), q: res.d};
        },
        fast_pow: function (value, n, module) { // быстрое возведение в степень на всякий случай
            if (n == 0) {
                return 1;
            } else if (n % 2) {
                return (RSA.fast_pow(value, n - 1, module) * value) % module;
            } else {
                let _value = RSA.fast_pow(value, n / 2, module);
                return (_value * _value) % module;
            }
        },
        get_simple_numbers: function (n) {// получение всех простых чисел от 2 до n  (set это контейнер в котором все элементы уникальные)
            let numbers = [];
            for (let i = 0; i < n + 1; i++) {
                numbers[i] = i;
            }
            for (let i = 2; i < numbers.length; i++) {
                if (numbers[i] == 0) {
                    continue;
                }
                for (let j = Math.pow(numbers[i], 2); j < numbers.length; j += numbers[i]) {
                    numbers[j] = 0
                }
            }
            let numberSet = new Set(numbers.slice(2));
            numberSet.delete(0);
            return numberSet;
        },

        randomElement: function (arr) {
            return arr[Math.floor(Math.random() * arr.length)];
        },
        rsa: function () {
            let simple_numbers = Array.from(RSA.get_simple_numbers(1000));     // будем брать p и q до 1000, иначе крайне долго !!! Мб даже до 100 возьмём !!
            let p = RSA.randomElement(simple_numbers), q = RSA.randomElement(simple_numbers);

            let n = p * q;
            let fi = (p - 1) * (q - 1);

            let sample = Array.from(RSA.get_simple_numbers(fi));
            const e = 65537;
            // let e = random.choice(sample)
            // while evklid(e, fi)[0] != 1:
            // e = random.choice(sample)

            let nod = RSA.evklid(e, fi);
            if (nod.d < 0) {
                nod.d += fi;
                nod.q -= e;
            }
            const d = nod.d;
        },
        genPublicKey: function (key_len) {
            let simple_numbers = Array.from(RSA.get_simple_numbers(1000));     // будем брать p и q до 1000, иначе крайне долго !!! Мб даже до 100 возьмём !!
            let p = RSA.randomElement(simple_numbers), q = RSA.randomElement(simple_numbers);
            let n = p * q;
            const fi = (p - 1) * (q - 1);
            let sample = Array.from(RSA.get_simple_numbers(fi));

            let e = 65537;
            // while (RSA.evklid(e, fi)[0] != 1) {
            //     e = RSA.randomElement(sample);
            // }
            return {e, n, p, q};
        },
        genPrivateKey: function (p, q, e) {
            let fi = (p - 1) * (q - 1);
            let nod = RSA.evklid(e, fi);
            console.log(nod);
            if (nod.d < 0) {
                nod.d += fi;
                nod.q -= e;
            }
            const d = nod.d;
            let n = p * q;
            console.log(d, n);
            return {d, n};
        },
        testRM: function (num) {
            let s = num - 1;
            let t = 0;
            while (s % 2 == 0) {
                s = Math.trunc(s / 2);
                t += 1;
            }
            for (let j = 0; j < 20; j++) {
                let a = Math.floor(Math.random() * (num - 3)) + num - 1; // 2,num-1
                let v = Math.pow(a, s) % num;
                if (v != 1) {
                    let i = 0;
                    while (v != num - 1) {
                        if (i == t - 1)
                            return false;
                        else {
                            i++;
                            v = (v * v) % num;
                        }
                    }
                }

            }
            return true;
        },


    }

})();

module.exports = RSA;