const dotenv = require('dotenv');
require('dotenv').config();

const createError = require('http-errors');
const express = require('express');
const path = require('path');
const cookieParser = require('cookie-parser');
const logger = require('morgan');
const Queue = require('bull');
const fs = require('fs');

const converter = require('./converter');

const app = express();

// REDIS Initialize
const redis = process.env.REDIS_URL;

// REDIS Bull Queue Initialize
const audioQueue = new Queue('Audio Conversion', redis);

// view engine setup
app.set('view engine', 'ejs');

app.use(logger('dev'));
app.use(express.json());
app.use(express.urlencoded({ extended: false }));
app.use(cookieParser());

// Index page 
app.get('/', function (req, res) {
  if (req.query.title !== 'undefined') {
    const title = req.query.title;
    res.render('pages/index', { thumbnail: title });
  } else {
    res.render('pages/index');
  }
});

// Creating the MP3 ---------------------------------------------------------------
app.post('/create', (req, res) => {
  const audio = req.body;
  // Get the unique URL of the video for thumbnail generation
  const imageTitle = audio.vidurl.substr(32);

  // Add to the Bull Queue ---------------------------------------------------------
  audioQueue.add('Converting Audio - ' + imageTitle,
  { attempts: 3, 
    removeOnFail: true, 
    removeOnComplete: true, 
  });

  audioQueue.process('Converting Audio - ' + imageTitle, (job) => {    
    converter(job, audio)
    .then(() => {
      console.log('Resolved');
      // done();
    })
    .catch(err => {
      res.status(500).send();
    });
  });

  res.send({
    // jobID: job.id,
    title: imageTitle
  });
});

// Get Status ---------------------------------------------------------------------
app.get('/status/:job', function (req, res) {
  const jobID = req.body.job;
});

// Playing from HTML player -------------------------------------------------------
app.get('/player', function (req, res) {
  res.render('pages/player')
});

// Reading from MP3 ---------------------------------------------------------------
app.get('/music', function(req, res) {
  const filePath = __dirname + '/public/music/music.mp3';
  const stat = fs.statSync(filePath);
  const total = stat.size;
  if (req.headers.range) {
    const range = req.headers.range;
    const parts = range.replace(/bytes=/, "").split("-");
    const partialstart = parts[0];
    const partialend = parts[1];
    const start = parseInt(partialstart, 10);
    const end = partialend ? parseInt(partialend, 10) : total - 1;
    const chunksize = (end - start) + 1;
    const readStream = fs.createReadStream(filePath, { start: start, end: end });
    res.writeHead(206, {
      'Content-Range': 'bytes ' + start + '-' + end + '/' + total,
      'Accept-Ranges': 'bytes', 'Content-Length': chunksize,
      'Content-Type': 'audio/mpeg'
    });
    readStream.pipe(res);
  } else {
    res.writeHead(200, { 'Content-Length': total, 'Content-Type': 'audio/mpeg' });
    fs.createReadStream(path).pipe(res);
  }  
});


app.listen(4000);
console.log('4000 is the magic port');

module.exports = app;