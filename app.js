const dotenv = require('dotenv');
require('dotenv').config();

const createError = require('http-errors');
const express = require('express');
const path = require('path');
const cookieParser = require('cookie-parser');
const logger = require('morgan');
const fs = require('fs');
const readline = require('readline');
const ytdl = require('ytdl-core');
const ffmpeg_static = require('ffmpeg-static');
const ffmpeg = require('ffmpeg');
const fluentFfmpeg = require('fluent-ffmpeg');
const Queue = require('bull');

const app = express();

// REDIS Initialize
const redis = process.env.REDIS_URL;

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
  
  // REDIS Bull Queue Initialize
  let audioQueue = new Queue('Audio Conversion', redis);


  // Add to the Bull Queue ---------------------------------------------------------
  audioQueue.add('Converting Audio', { attempts: 3 });
  // Process the Bull Queue --------------------------------------------------------
  audioQueue.process('Converting Audio', 5, function (job) {
    convertAudio({ 
      url: audio.vidurl,
      job
     });
    res.send({
      jobID: job.id,
      title: imageTitle
    });
  });
  // Remove job from Queue --------------------------------------------------------
  audioQueue.on('completed', function (job, jobDone) {
    audioQueue.close();
    jobDone();
    console.log('Done');
  });
});
// Function to pipe audio and save it as an mp3 ------------------------------------
function convertAudio(audio) {
  const url = audio.url;
  const start = Date.now();
  const stream = ytdl(url, {
    quality: 'highestaudio'
  });
  let streamer
  try {
      console.log(`\nJob ${audio.job.id} is being processed`);
      streamer = fluentFfmpeg(stream)
        .setFfmpegPath(ffmpeg_static.path)
        .audioBitrate(128)
        .on('progress', p => {
          let progStatus = p.targetSize;
          let frames = p.timemark;
          readline.cursorTo(process.stdout, 0);
          process.stdout.write(`Job ${audio.job.id} - ${progStatus}kb downloaded - Video Timeline ${frames}`);
          // transcode audio asynchronously and report progress
        })
        .on('end', () => {
          console.log(`\nSuccess! Completed Job ${audio.job.id} - Time taken ${(Date.now() - start) / 1000}s`);
        })
        .save(__dirname + '/public/music/music.mp3');
      } catch (err) {
    console.log('Stream create error', err)
    return res.status(500).send()
  } 
};

// Get Status ---------------------------------------------------------------------
app.post('/status', function (req, res) {
  const jobID = req.body.job;
  let status = 'Convertion';
  // console.log(jobID + 'from API');
  kue.Job.get(jobID, function(err, job) {
    if (job){
      console.log(job.log());
    }
  });
  res.send(jobID + ' from API');
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

// catch 404 and forward to error handler
// app.use(function(req, res, next) {
//   next(createError(404));
// });

// error handler
// app.use(function(err, req, res, next) {
//   // set locals, only providing error in development
//   res.locals.message = err.message;
//   res.locals.error = req.app.get('env') === 'development' ? err : {};
//   // render the error page
//   res.status(err.status || 500);
//   res.send('error');
// });

app.listen(4000);
console.log('4000 is the magic port');

module.exports = app;