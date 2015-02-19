#!/usr/bin/env node

var fs = require('fs');

if (process.argv.length != 2) {
    console.log('Error, no parameters accepted.');
    return;
}

var outputFilePath = __dirname + '/../data/videos.json';
fs.readFile(outputFilePath, cb);

function cb(err, data) {
    var videos = JSON.parse(data.toString());

    for(var cur = 0; cur < videos.length - 1; cur++) {
        for(var check = cur + 1; check < videos.length; check++) {
            while(videos[cur].source == videos[check].source && videos[cur]._id == videos[check]._id) {
                videos.splice(check, 1);
                console.log('Removed duplicate: ' + videos[cur].source + ' ' + videos[cur]._id);
            }
        }
    }

    fs.writeFile(outputFilePath, JSON.stringify(videos, null, 4), function (err) {
        if (err) {
            throw err;
        }
        console.log('Entries correctly added to data/videos.json');
    });
}
