const dotenv = require('dotenv');
require('dotenv').config();

const express = require('express');
const createError = require('http-errors');
const path = require('path');
const fs = require('fs');
const cookieParser = require('cookie-parser');
const logger = require('morgan');
const Queue = require('bull');
const Arena = require('bull-arena');

const converter = require('./converter');

const app = express();

// REDIS Initialize --------------------------------------------------------------
const redis = process.env.REDIS_URL;

// REDIS Bull Queue Initialize ---------------------------------------------------
const audioQueue = new Queue('Audio_Conversion', redis);

const arena = Arena({
  queues: [
    {
      // Name of the bull queue, this name must match up exactly with what you've defined in bull.
      name: 'Audio_Conversion',

      // Hostname or queue prefix, you can put whatever you want.
      hostId: 'Audio Queues'
    }
  ]
});

// View engine setup -------------------------------------------------------------
app.set('view engine', 'ejs');

app.use(logger('dev'));
app.use(express.json());
app.use(express.urlencoded({ extended: false }));
app.use(express.static('public'));
app.use(cookieParser());
app.use('/arena', arena)

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
  const timeStamp = Math.floor(Date.now());

  // Add to the Bull Queue --------------------------------------------------------
  try {
    audioQueue.add('Converting', audio, { 
      attempts: 3,
      jobId: timeStamp
    });
    return res.status(200).send({
      title: imageTitle
    });
  } catch (error) {
    res.sendStatus(500);
  }
});

// Processing the Queue -----------------------------------------------------------
audioQueue.process('*', (job) => {
  // Object that is passed to the job is in job.data
  converter(job, job.data.vidurl)
    .then((res) => {
      console.log(res);
    })
    .catch(err => {
      console.log(err);
    });
});

// Get Status ---------------------------------------------------------------------
app.get('/status/:job', function (req, res) {
  const jobID = req.body.job;
});

// Playing from HTML player -------------------------------------------------------
app.get('/player', function (req, res) {
  res.render('pages/player');
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