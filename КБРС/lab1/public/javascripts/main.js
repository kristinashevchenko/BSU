const Main = (function () {
    let action;

    return {

        start: function () {
            document.querySelector("[name='encode']").addEventListener("click", this.openFileDialog);
            document.querySelector("[name='decode']").addEventListener("click", this.openFileDialog);
            document.querySelector("[name='test']").addEventListener("click", this.openFileDialog);

            document.getElementById("file-input").addEventListener("change", this.readFile);
        },
        openFileDialog: function (event) {
            action = event.target.name;
            document.getElementById('file-input').click();
        },
        readFile: function (event) {
            const textFile = event.target.files[0];
            const word = document.getElementById('word').value;
            if (action === 'test') {

                Main.testFile(textFile.name, word).then((result) => {
                    document.getElementById("keys").innerText="Keys: " + result.words.toString();
                }).catch(() => {
                    alert("Error");
                });
            } else {
                Main.loadFile(textFile, word).then(() => {
                    alert('File encoded');
                });
            }
        },
        loadFile: function (file, word) {
            return new Promise(((resolve, reject) => {
                const formData = new FormData();
                console.log(action);
                formData.append("file", file);
                formData.append("word", word);
                formData.append("action", action);
                const xmlhttp = new XMLHttpRequest();
                xmlhttp.open("POST", "http://localhost:6005/uploadFile", true);
                xmlhttp.onload = function () {
                    if (xmlhttp.status === 200) {
                        resolve();
                    } else {
                        reject();
                    }
                };
                xmlhttp.send(formData);
            }));
        },
        testFile: function (filename, len) {
            return new Promise(((resolve, reject) => {
                const formData = new FormData();
                formData.append("filename", filename);
                formData.append('len', len);
                const xmlhttp = new XMLHttpRequest();
                xmlhttp.open("POST", "http://localhost:6005/kasiski", true);
                xmlhttp.onload = function () {
                    if (xmlhttp.status === 200) {
                        resolve(JSON.parse(xmlhttp.response));
                    } else {
                        reject();
                    }
                };
                xmlhttp.send(formData);
            }));
        }
    }

})();