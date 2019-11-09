import RSA from './rsa';
const Client = (function(){

    let privateKey;
    return {
        postFetch:function(url,data){
            return fetch(url, {
                method: 'POST',
                mode: 'cors', // no-cors, cors, *same-origin
                cache: 'no-cache', // *default, no-cache, reload, force-cache, only-if-cached
                credentials: 'same-origin',
                headers: {
                    'Content-Type': 'application/json',
                },
                redirect: 'follow',
                referrer: 'no-referrer',
                body: JSON.stringify(data),
            })
                //.then(response => response.json());
            //

        },
        submitClick:function(){
            const login = document.querySelector('#login').value;
            const password = document.querySelector('#password').value;
            Client.postFetch('http://localhost:4290/login', {login,password})
                .then(()=>{
                    let publicKey = RSA.genPublicKey();
                    privateKey = RSA.genPrivateKey(publicKey.p,publicKey.q,publicKey.e);
                    return Client.postFetch('http://localhost:4290/session_key',{publicKey,login});
                })
                .then(data=>{
                    console.log(data);
                })
                .catch(error => console.error(error));
        },
        start:async function(){
            document.querySelector('#submit').addEventListener('click',Client.submitClick);
        },

    }
})();