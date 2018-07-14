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
// const indexRouter = require('./routes/index');
// const musicRouter = require('./routes/music');

const app = express();
// view engine setup
app.set('view engine', 'ejs');

app.use(logger('dev'));
app.use(express.json());
app.use(express.urlencoded({ extended: false }));
app.use(cookieParser());

// app.use('/', indexRouter);
// app.use('/player', musicRouter);

// index page 
app.get('/', function (req, res) {
  if (req.query.title !== 'undefined') {
    const title = req.query.title;
    res.render('pages/index', { thumbnail: title });
  } else {
    res.render('pages/index');
  }
});

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

app.post('/create', async function(req, res) {
  const url = req.body.vidurl;
  const title = url.substr(32);
  const start = Date.now();
  const stream = ytdl(url, {
    quality: 'highestaudio'
    //filter: 'audioonly',
  });
  // Function to pipe audio and save it as an mp3
  let streamer
  try {
    streamer = await fluentFfmpeg(stream)
      .setFfmpegPath(ffmpeg_static.path)
      .audioBitrate(128)
      .save(__dirname + '/public/music/music.mp3')
      .on('progress', p => {
        readline.cursorTo(process.stdout, 0);
        process.stdout.write(`${p.targetSize}kb downloaded`);
      })
      .on('end', () => {
        console.log(`\ndone, thanks - ${(Date.now() - start) / 1000}s`);
        res.redirect('./?title=' + title);
      });
  } catch (err) {
    console.log('Stream create error', err)
    return res.status(500).send()
  }
});

app.post('/stream', async function (req, res) {
  const url = req.body.vidurl;
  const stream = ytdl(url, {
    quality: 'highestaudio'
  });
  let streamer;
  try {
    streamer = await fluentFfmpeg(stream)
      .setFfmpegPath(ffmpeg_static.path)
      .audioBitrate(128)
      .on('progress', p => {
        pipe(res);
      })
      .on('end', () => {
        console.log(`\ndone, thanks - ${(Date.now() - start) / 1000}s`);
      });
  } catch (err) {
    console.log('Stream create error', err);
    return res.status(500).send();
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