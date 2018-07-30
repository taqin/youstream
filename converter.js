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
          console.log(`Job ${job.id} - ${progStatus}kb downloaded - Video Timeline ${frames}`);
        })
        .on('end', () => {
          console.log(`\nSuccess! Completed Job ${job.id} - Time taken ${(Date.now() - start) / 1000}s`);
          resolve('Successfully Converted - ' + url );
        })
        .output(__dirname + '/public/music/music.mp3')
        .run();
    } catch (err) {
      console.log('Stream create error', err);
      reject();
    }
  })
}

module.exports = Converter;