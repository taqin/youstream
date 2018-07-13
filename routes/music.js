var express = require('express');
var router = express.Router();

const fs = require('fs');
const ytdl = require('ytdl-core');

/* GET users listing. */
router.get('/player', function(req, res, next) {
  ytdl('http://www.youtube.com/watch?v=A02s8omM_hI')
    .pipe(fs.createWriteStream(__dirname + '../public/music/music.mp3'));
});

module.exports = router;
