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

const logger = require('morgan');
const cookieParser = require('cookie-parser');
const bodyParser = require('body-parser');
const fileUpload = require('express-fileupload');
const cors = require('cors');

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
                const code = codes.reduce(function (str, elem) {
                    if (elem && elem !== '.') return str + (elem + ';');
                    return str;
                }, '');
                map.set(word, {amount: 1, code: code});
            }

        });

        res.json({text: data, map: map, textLength: array.length});
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

            const code = codes.reduce(function (str, elem) {
                if (elem && elem !== '.') return str + (elem + ';');
                return str;
            }, '');
            map.set(word, {amount: 1, code: code});
        }
    });
    const timest = Date.now();
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

    const result = await connection.execute(
        "SELECT amount FROM dictionary WHERE word= :1", [key]);
    //connection.close();
    //let connection3 = await pool.getConnection();
    if (!result.rows.length) {

        const result3 = await connection.execute(
            `INSERT INTO dictionary (word,code,amount) VALUES(:key,:code,:item)`, {
                key: key,
                code: code,
                item: item
            });
        //connection3.close();
        //console.log(result3);
    } else {
        console.log(result.rows[0]);
        const result3 = await connection.execute(
            `UPDATE dictionary SET amount= :1 WHERE word= :2`, [result.rows[0][0] + item, key]);
        //connection3.close();

    }

    //let connection2 = await pool.getConnection();
    const result2 = await connection.execute(
        `INSERT INTO WORDS (word,amount,corpus_id) VALUES(:key,:item,:id)`,
        {key: key, item: item, id: id});
    connection.close();


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
    const result2 = await connection.execute(
        "DELETE FROM words WHERE word= :1", [word]);
    const result = await connection.execute(
        "DELETE FROM dictionary WHERE word= :1", [word]);
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
        "UPDATE dictionary SET code= :1 WHERE word= :2", [newCode, word]);
    connection.close();
    res.end();
});

app.get('/selectWord', async (req, res, next) => {
    let connection = await pool.getConnection();
    const word = req.query.word;
    const result = await connection.execute(
        "SELECT corpus.name FROM words JOIN corpus ON(words.corpus_id=corpus.id) WHERE word= :1", [word]);
    connection.close();
    res.json({corpus: result.rows});
});

app.get('/addWord', async (req, res, next) => {
    let connection = await pool.getConnection();
    const word = req.query.word;
    const result = await connection.execute(
        "SELECT * FROM dictionary WHERE word= :1", [word]);
    if (!result.rows.length) {
        // var words = new pos.Lexer().lex(word);
        // var tagger = new pos.Tagger();
        // var taggedWords = tagger.tag(words);
        //
        // var taggedWord = taggedWords[0];
        // var tag = taggedWord[1];
        const codes = lexicon.tagWord(word);
        const code = codes.reduce(function (str, elem) {
            if (elem && elem !== '.') return str + (elem + ';');
            return str;
        }, '');
        const result2 = await connection.execute(
            `INSERT INTO DICTIONARY (word,amount,code) VALUES(:key,:item,:code)`,
            {key: word, item: 0, code: code});
        connection.close();
        res.sendStatus(200);
    } else {
        res.sendStatus(404);
    }
});


app.get('/dictionary', async (req, res, next) => {

    let connection = await pool.getConnection();
    const result = await connection.execute(
        `SELECT * FROM dictionary`, [],
        {
            resultSet: true // return a ResultSet (default is false)
        });

    const rs = result.resultSet;
    let row;
    const map = new SortedMap();
    while ((row = await rs.getRow())) {
        map.set(row[1], {amount: row[4], code: row[3]});
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



