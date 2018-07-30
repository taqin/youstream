const fs = require('fs');
const readline = require('readline');
const ytdl = require('ytdl-core');
const ffmpeg_static = require('ffmpeg-static');
const ffmpeg = require('ffmpeg');
const fluentFfmpeg = require('fluent-ffmpeg');

function Converter(job, vidURL) {
  // Must declare as promise in order for the process to work.
  return new Promise((resolve, reject) => {
    const url = vidURL;
    const start = Date.now();
    const stream = ytdl(url, {
      quality: 'highestaudio'
    });
    let streamer;

    try {
      console.log(`\nJob ${job.id} is being processed`);
      streamer = fluentFfmpeg(stream)
        .setFfmpegPath(ffmpeg_static.path)
        .audioChannels(2)
        .audioBitrate(128)
        .on('progress', p => {
          let progStatus = p.targetSize;
          let frames = p.timemark;
          // readline.cursorTo(process.stdout, 0);
          // process.stdout.write(`Job ${audio.job.id} - ${progStatus}kb downloaded - Video Timeline ${frames}`);
          console.log(`Job ${job.id} - ${progStatus}kb downloaded - Video Timeline ${frames}`);
          // console.log(`Job - ${progStatus}kb downloaded - Video Timeline ${frames}`);
          // transcode audio asynchronously and report progress
        })
        .on('end', () => {
          console.log(`\nSuccess! Completed Job ${job.id} - Time taken ${(Date.now() - start) / 1000}s`);
          // console.log(`\nSuccess! Completed Job - Time taken ${(Date.now() - start) / 1000}s`);
          // job.remove();
          resolve('Successfully Converted - ' + url );
        })
        .output(__dirname + '/public/music/music.mp3')
        .run();
      // return Promise.resolve();      
    } catch (err) {
      console.log('Stream create error', err);
      reject();
    }
  })

}
module.exports = Converter;

// Function to pipe audio and save it as an mp3 ------------------------------------
/*
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
      .audioChannels(2)
      .audioBitrate(128)
      .on('progress', p => {
        let progStatus = p.targetSize;
        let frames = p.timemark;
        // readline.cursorTo(process.stdout, 0);
        // process.stdout.write(`Job ${audio.job.id} - ${progStatus}kb downloaded - Video Timeline ${frames}`);
        console.log(`Job ${audio.job.id} - ${progStatus}kb downloaded - Video Timeline ${frames}`);
        // transcode audio asynchronously and report progress
      })
      .on('end', () => {
        console.log(`\nSuccess! Completed Job ${audio.job.id} - Time taken ${(Date.now() - start) / 1000}s`);
        // console.log(audio.job);
      })
      .output(__dirname + '/public/music/music.mp3')
      .run();
  } catch (err) {
    console.log('Stream create error', err)
    return res.status(500).send()
  }
};
*/
