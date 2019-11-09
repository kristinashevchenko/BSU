//import RSA from './rsa';
const Client = (function () {
    const RSA = require('./rsa');
    const aesjs = require('aes-js');
    let sessionKey;
    return {
        postFetch: function (url, data) {
            return new Promise(((resolve, reject) => {
                const xmlhttp = new XMLHttpRequest();
                xmlhttp.open("POST", url, true);
                xmlhttp.setRequestHeader("Content-Type", "application/json;charset=UTF-8");
                xmlhttp.onload = function () {
                    if (xmlhttp.status === 200) {
                        console.log(xmlhttp.response);
                        resolve(xmlhttp.response);
                    } else {
                        reject();
                    }
                };
                console.log(data);
                xmlhttp.send(JSON.stringify(data));
            }));
            // return fetch(url, {
            //     method: 'POST',
            //     mode: 'cors', // no-cors, cors, *same-origin
            //     cache: 'no-cache', // *default, no-cache, reload, force-cache, only-if-cached
            //     credentials: 'same-origin',
            //     headers: {
            //         'Content-Type': 'application/json',
            //     },
            //     redirect: 'follow',
            //     referrer: 'no-referrer',
            //     body: JSON.stringify(data),
            // })
            //     .then(response => JSON.parse(response.body));
            //

        },
        submitClick: function () {
            const login = document.querySelector('#login').value;
            const password = document.querySelector('#password').value;
            Client.postFetch('http://localhost:4290/login', {login, password})
                .then((data) => {
                    data = JSON.parse(data);
                    let publicKey;
                    if (!data.publicKey) {

                        let publicHoleKey = RSA.genPublicKey();
                        publicKey = {n: publicHoleKey.n, e: publicHoleKey.e};
                        let privateKey = RSA.genPrivateKey(publicHoleKey.p, publicHoleKey.q, publicHoleKey.e);
                        window.localStorage.setItem('privateKey', JSON.stringify(privateKey));
                    } else {
                        publicKey = data.publicKey;
                    }
                    window.localStorage.setItem('id', JSON.stringify(data.id));
                    console.log('id', data.id);
                    document.querySelector('#formContent').classList.add('isHidden');
                    document.querySelector('#fileContent').classList.remove('isHidden');
                    return Client.postFetch('http://localhost:4290/session_key', {publicKey, id: data.id});
                })
                .then(data => {
                    data = JSON.parse(data);
                    sessionKey = data.key;
                    const privateKey = window.localStorage.getItem('privateKey');
                    console.log(1, sessionKey);
                    // sessionKey.map(elem => {
                    //     return Math.pow(elem, privateKey.d) % privateKey.n;
                    // });
                    console.log(1, sessionKey);
                })
                .catch(error => console.error(error));
        },
        readFile: function () {
            const filename = document.querySelector('#filename').value;
            const id = JSON.parse(window.localStorage.getItem('id'));
            Client.postFetch('http://localhost:4290/encryptFile', {filename, id})
                .then((data) => {
                    console.log(data);
                    data = JSON.parse(data);
                    const aesOfb = new aesjs.ModeOfOperation.ofb(sessionKey, data.iv);
                    var decryptedBytes = aesOfb.decrypt(data.encryptedText);

// Convert our bytes back into text
                    var decryptedText = aesjs.utils.utf8.fromBytes(decryptedBytes);
                    console.log(decryptedText);
                })
                .catch(error => console.error(error));
        },
        start: async function () {
            document.querySelector('#submit').addEventListener('click', Client.submitClick);
            document.querySelector('#file').addEventListener('click', Client.readFile);
        },

    }
})();