const express = require("express");
const app = express();
const multer = require("multer");
const fs = require("fs");

const path = require('path');
const pos = require('pos');
const natural = require('natural');
const language = "EN";
const defaultCategory = 'NN';
const defaultCategoryCapitalized = 'NNP';
var lexicon = new natural.Lexicon(language, defaultCategory, defaultCategoryCapitalized);
var ruleSet = new natural.RuleSet('EN');
var tagger = new natural.BrillPOSTagger(lexicon, ruleSet);
const cookieParser = require('cookie-parser');
const bodyParser = require('body-parser');
const fileUpload = require('express-fileupload');
const cors = require('cors');
var lemmatize = require('wink-lemmatizer');

const upload = multer();
const table = require('./modules/table');
const revertedTable = require('./modules/revertedTable');
//const bodyParser = require("body-parser");
// app.use(express.static(__dirname + "/public"));
//
// app.listen("3040", () => {
//     console.log("Server is running");
// });
const Map = require('sorted-map');
const SortedMap = require("collections/sorted-map");


const dictionary = new SortedMap();
const port = process.env.PORT || 5000;
let pool;

app.use(cors());
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({extended: false}));
app.use(cookieParser());
app.use(fileUpload());
app.use('/public', express.static(__dirname + '/public'));


const oracledb = require('oracledb');
oracledb.autoCommit = true;
oracledb.getConnection(
    {
        user: "HR",
        password: "hr",
        connectString: "localhost:1521/orclpdb"
    },
    function (err, connection) {
        if (err) {
            console.error(err);
            return;
        }
        connection.execute(
            "SELECT * FROM corpus",
            function (err, result) {
                if (err) {
                    console.error(err);
                    return;
                }
                console.log(result.rows);
            });
    });


app.listen(port, async () => {
    pool = await oracledb.createPool(
        {
            user: "HR",
            password: "hr",
            connectString: "localhost:1521/orclpdb"
        }
    )
    console.log(`Listening on port ${port}`);
});

// create a GET route
app.get('/express_backend', (req, res) => {
    res.send({express: 'YOUR EXPRESS BACKEND IS CONNECTED TO REACT'});
});

app.post('/uploadFile', (req, res, next) => {
    let imageFile = req.files.file;
    const name = `${__dirname}/corpus/${req.files.file.name}`;
    imageFile.mv(name, function (err) {
        if (err) {
            return res.status(500).send(err);
        }

        fs.readFile(name, 'utf8', function (err, data) {
            if (err) throw err;
            res.json({text: data, name: req.files.file.name});
        });
    });
});

app.get('/readFile', (req, res, next) => {
    let filename = req.query.filename;
    const name = `${__dirname}/corpus/${filename}`;

    fs.readFile(name, 'utf8', function (err, data) {
        if (err) throw err;

        let array = data.match(/[A-Za-z\-/]+/g);
        const map = new SortedMap();

        array.forEach(word => {
            word = word.toLowerCase();
            let newWord = word.match(/-([A-Za-z]+)/);
            if (newWord) {
                word = newWord[1];
            }
            newWord = word.match(/([A-Za-z]+)-/);
            if (newWord) {
                word = newWord[1];
            }

            let num = map.get(word);
            if (num) {
                map.set(word, {amount: num.amount + 1, code: num.code});
            } else {
                const codes = lexicon.tagWord(word);
                const code = codes.join(';');
                map.set(word, {amount: 1, code: code});
            }

        });

        res.json({text: data, map: map, textLength: array.length});
    });


});

app.get('/readAnnotateFile', (req, res, next) => {
    let filename = req.query.filename;
    let name = `${__dirname}/annotate/${filename}`;
    let text = '';

    fs.readFile(name, 'utf8', function (err, data) {
        if (err) {
            name = `${__dirname}/corpus/${filename}`;

            fs.readFile(name, 'utf8', function (err, data2) {
                if (err) throw err;
                else {

                    let sentenceTokenizer = new natural.SentenceTokenizer();
                    let wordTokenizer = new natural.WordTokenizer();
                    let sentences = sentenceTokenizer.tokenize(data2);
                    sentences.forEach(sentence => {

                            let words = wordTokenizer.tokenize(sentence);
                            let taggedWords = tagger.tag(words).taggedWords;

                            taggedWords.forEach(taggedWord => {
                                let word = taggedWord.token;
                                let tag = taggedWord.tag;
                                let num = 0;
                                let reg = new RegExp(`${word}`, "g");
                                sentence = sentence.replace(reg, (match, offset, input) => {
                                    if (offset - 1 > 0) {
                                        if (sentence[offset - 1].match(/[\w>]{1}/))
                                            return match;
                                    }
                                    if (offset + word.length < sentence.length) {
                                        if (sentence[offset + word.length].match(/[\w<]{1}/))
                                            return match;
                                    }
                                    num++;
                                    if (num == 1) return `<${tag}>${match}</${tag}>`;
                                    else return match;
                                });
                            });
                            text += sentence;
                        }
                    );
                    res.json({text});
                }
            });
        } else {
            text = data;
            res.json({text});

        }

    });


});


app.post('/saveAnnotateFile', async (req, res, next) => {
    const name = `${__dirname}/annotate/${req.body.file}`;
    fs.writeFile(name, req.body.text, function (err, data) {
        if (err) throw err;
        res.sendStatus(200);
    });
});

app.post('/saveFile', async (req, res, next) => {

    const name = `${__dirname}/corpus/${req.body.file}`;
    fs.writeFile(name, req.body.text, function (err, data) {
        if (err) throw err;

    });
    const map = new SortedMap();
    let array = req.body.text.match(/[A-Za-z\-/]+/g);

    let id = await insertCorpus(req.body.file, array.length);
    let clear = await clearCorpus(id[0]);
    array.forEach(word => {
        word = word.toLowerCase();
        let newWord = word.match(/-([A-Za-z]+)/);
        if (newWord) {
            word = newWord[1];
        }
        newWord = word.match(/([A-Za-z]+)-/);
        if (newWord) {
            word = newWord[1];
        }

        let num = map.get(word);
        if (num) {
            map.set(word, {amount: num.amount + 1, code: num.code});
        } else {
            const codes = lexicon.tagWord(word);
            // const code = codes.reduce(function (str, elem) {
            //     if (table.get(elem)) return str + (table.get(elem) + ';');
            //     if (elem && elem !== '.') return str + (elem + ';');
            //     return str;
            // }, '');

            const code = codes.join(';');
            map.set(word, {amount: 1, code: code});
        }
    });

    map.forEach(async function (item, key) {
        console.log(key, item.amount, id);
        let t = await insertWord(key, item.amount, id[0], item.code);

    });
    res.json({map: map, textLength: array.length});

});

async function insertCorpus(name, wordNumber) {
    let connection = await pool.getConnection();
    const result = await connection.execute(
        "SELECT id FROM corpus WHERE name= :1", [name]);
    connection.close();
    if (!result.rows.length) {
        let connection2 = await pool.getConnection();
        const result = await connection2.execute(
            `INSERT INTO corpus (name,wordNumber) VALUES (:name,:wordNumber) RETURN id INTO :id`,
            {name: name, wordNumber: wordNumber, id: {type: oracledb.NUMBER, dir: oracledb.BIND_OUT}});
        connection2.close();
        return result.outBinds.id;
    } else {
        return result.rows[0];
    }
}

async function insertWord(key, item, id, code) {
    let connection = await pool.getConnection();
    let canon_word = canonWord(key, code);


    const result = await connection.execute(
        "SELECT amount FROM dictionary WHERE word= :1", [key]);
    const result1 = await connection.execute(
        "SELECT amount FROM canon WHERE word= :1", [canon_word]);
    let amount = item;
    const codes = lexicon.tagWord(canon_word);
    const canon_code = codes.join(';');
    console.log(9, key, canon_word);

    if (!result.rows.length) {

        const result3 = await connection.execute(
            `INSERT INTO dictionary (word,code,amount,canon_word) VALUES(:key,:code,:item,:canon_word)`, {
                key: key,
                code: code,
                item: item,
                canon_word: canon_word
            });

    } else {
        console.log(result.rows[0]);
        const result3 = await connection.execute(
            `UPDATE dictionary SET amount= :1 WHERE word= :2`, [result.rows[0][0] + item, key]);


    }

    const result2 = await connection.execute(
        `INSERT INTO WORDS (word,amount,corpus_id) VALUES(:key,:item,:id)`,
        {key: key, item: item, id: id});


    if (!result1.rows.length) {

        const result3 = await connection.execute(
            `INSERT INTO canon (word,code,amount) VALUES(:key,:code,:item)`, {
                key: canon_word,
                code: canon_code,
                item: amount
            });

    } else {
        amount += result1.rows[0][0];
        console.log(123, result.rows[0]);
        const result3 = await connection.execute(
            `UPDATE canon SET amount= :1 WHERE word= :2`, [amount, canon_word]);

    }
    connection.close();
}

function canonWord(key, codes) {
    codes = codes.split(';');
    if (isVerb(codes)) {
        return lemmatize.verb(key);
    } else if (isNoun(codes)) {
        return lemmatize.noun(key);
    } else if (isAdjective(codes)) {
        return lemmatize.adjective(key);
    } else {
        if (key != lemmatize.verb(key)) return lemmatize.verb(key);
        if (key != lemmatize.noun(key)) return lemmatize.noun(key);
        if (key != lemmatize.adjective(key)) return lemmatize.adjective(key);
        return key;
    }
}

function isAdjective(codes) {
    return codes.some(elem => ['JJR', 'JJ', 'JJS'].includes(elem));
}

function isNoun(codes) {
    return codes.some(elem => ['NN', 'NNP', 'NNPS', 'NNS', 'PP$', 'PRP', 'WP'].includes(elem));
}

function isVerb(codes) {
    return codes.some(elem => ['RB', 'RBR', 'RBS', 'VB', 'VBD', 'VBG', 'VBN', 'VBP', 'VBZ', 'WRB'].includes(elem));
}


app.get('/corpuse', async (req, res, next) => {
    let connection = await pool.getConnection();
    const result = await connection.execute(
        `SELECT * FROM corpus`);
    connection.close();
    res.json({corpuse: result.rows});
});

app.get('/deleteWord', async (req, res, next) => {
    let connection = await pool.getConnection();
    const word = req.query.word;
    const result = await connection.execute(
        "DELETE FROM words WHERE word= :1", [word]);
    const result2 = await connection.execute(
        "DELETE FROM dictionary WHERE word= :1", [word]);
    const result3 = await connection.execute(
        "DELETE FROM canon WHERE word= :1", [word]);
    connection.close();
    res.end();
});

app.get('/changeWord', async (req, res, next) => {
    let connection = await pool.getConnection();
    const word = req.query.word;
    const codes = req.query.code.split(';');
    let newCode = '';
    let newCodes = [];
    codes.forEach(code => {
        newCode += (revertedTable.get(code) + ';');
        newCodes.push(code);
    });
    lexicon.addWord(word, newCodes);

    const result = await connection.execute(
        "UPDATE dictionary SET code= :1 WHERE word= :2", [req.query.code, word]);
    connection.close();
    res.end();
});

app.get('/selectWord', async (req, res, next) => {
    let connection = await pool.getConnection();
    const word = req.query.word;
    const result = await connection.execute(
        "SELECT DISTINCT corpus.name FROM words JOIN corpus ON(words.corpus_id=corpus.id) WHERE word= :1", [word]);
    connection.close();
    res.json({corpus: result.rows});
});

app.get('/getWord', async (req, res, next) => {
    let connection = await pool.getConnection();
    const word = req.query.word;
    const result = await connection.execute(
        "SELECT * FROM dictionary WHERE canon_word= :1", [word]);
    connection.close();
    console.log('word', result.rows);
    res.json({words: result.rows});
});

app.get('/addWord', async (req, res, next) => {
    let connection = await pool.getConnection();
    const word = req.query.word;
    const result = await connection.execute(
        "SELECT * FROM dictionary WHERE word= :1", [word]);
    if (!result.rows.length) {
        const codes = lexicon.tagWord(word);
        const code = codes.join(';');
        let canon_word = canonWord(word, code);
        const result1 = await connection.execute(
            "SELECT * FROM canon WHERE word= :1", [canon_word]);

        if (!result1.rows.length) {

            const canon_codes = lexicon.tagWord(canon_word);
            const canon_code = canon_codes.join(';');

            const result2 = await connection.execute(
                `INSERT INTO canon (word,amount,code) VALUES(:key,:item,:code)`,
                {key: canon_word, item: 0, code: canon_code});
        }

        const result3 = await connection.execute(
            `INSERT INTO DICTIONARY (word,amount,code,canon_word) VALUES(:key,:item,:code,:canon_word)`,
            {key: word, item: 0, code: code, canon_word: canon_word});
        connection.close();
        res.sendStatus(200);
    } else {
        res.sendStatus(404);
    }
});


app.get('/addForm', async (req, res, next) => {
    let connection = await pool.getConnection();
    const word = req.query.word;
    const formW = req.query.form;
    const codeW = req.query.code;
    const result = await connection.execute(
        "SELECT * FROM dictionary WHERE word= :1", [formW]);
    if (!result.rows.length) {

        const result2 = await connection.execute(
            `INSERT INTO dictionary (word,amount,code,canon_word) VALUES(:key,:item,:code,:canon_word)`,
            {key: formW, item: 0, code: codeW, canon_word: word});
        connection.close();
        res.sendStatus(200);
    } else {
        res.sendStatus(404);
    }
});


app.get('/dictionary', async (req, res, next) => {

    let connection = await pool.getConnection();
    const result = await connection.execute(
        `SELECT * FROM canon`, [],
        {
            resultSet: true // return a ResultSet (default is false)
        });

    const rs = result.resultSet;
    let row;
    const map = new SortedMap();
    while ((row = await rs.getRow())) {
        map.set(row[1], {amount: row[3], code: row[2]});
    }
    await rs.close();
    connection.close();

    res.json({map: map});

});

async function clearCorpus(id, timest) {
    // let connection = await pool.getConnection();
    //
    // const result = await connection.execute(
    //     "DELETE FROM words WHERE corpus_id= :1 AND timest < :2", [id, timest]);
    // connection.close();
    let connection = await pool.getConnection();

    const result = await connection.execute(
        "DELETE FROM words WHERE corpus_id= :1", [id]);
    connection.close();
}



