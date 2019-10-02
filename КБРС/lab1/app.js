var express = require('express');
var path = require('path');
var cookieParser = require('cookie-parser');
const fs = require("fs");
const fileUpload = require('express-fileupload');

const port = process.env.PORT || 6005;

const encode = require('./modules/encode');
const cryptoanalyze = require('./modules/cryptoanalyze');

var app = express();


app.use(express.json());
app.use(express.urlencoded({extended: false}));
app.use(cookieParser());
app.use(fileUpload());
app.use(express.static(path.join(__dirname, 'public')));


app.listen(port, async () => {
    console.log(encode.encode("hi how are you", "abc"));
    console.log(`Listening on port ${port}`);
});


app.post('/uploadFile', (req, res, next) => {
    let imageFile = req.files.file;
    const name = `${__dirname}/text/${req.files.file.name}`;
    const word = req.body.word;
    console.log(word, req.body.action);
    imageFile.mv(name, function (err) {
        if (err) {
            return res.status(500).send(err);
        }

        fs.readFile(name, 'utf8', function (err, data) {
            if (err) throw err;

            let cryptText, cryptName;
            if (req.body.action === 'decode') {
                cryptText = encode.decode(data, word);
                cryptName = `${__dirname}/text/decrypt_${req.files.file.name}`;
            } else {
                cryptText = encode.encode(data, word);
                cryptName = `${__dirname}/text/crypt_${req.files.file.name}`;
            }


            fs.writeFile(cryptName, cryptText, function (err, data) {
                if (err) throw err;

                res.sendStatus(200);

            });
            //console.log('OK: ' + name);

        });


    });

});

app.post('/kasiski', (req, res, next) => {
    const name = `${__dirname}/text/${req.body.filename}`;
    const len = req.body.len;

    fs.readFile(name, 'utf8', function (err, data) {
        if (err) throw err;
        let words = cryptoanalyze.kasiski(len,data);
        res.json({words:words});
    });
});

module.exports = app;
