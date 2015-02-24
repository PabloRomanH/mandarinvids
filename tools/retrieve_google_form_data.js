#!/usr/bin/env node

var fs = require('fs');
var async = require('async');
var flatten = require('flatten');
var google = require('googleapis');

youtube = google.youtube('v3');

var API_KEY = 'AIzaSyB53eOcfiDxRuIr-kakVIl1vIzBa9rQHD8';

if (process.argv.length != 3) {
    console.log('Error, one and only one parameter accepted.');
    return;
}

fs.readFile(process.argv[2], processCSV);

function processCSV(err, data) {
    if (err) {
        return console.log('Error reading file chinesevids.csv: ' + err);
    }
    var csvstring = data.toString();
    var csvlines = csvstring.split('\n');
    if(csvlines.length == 1) {
        console.log('Error: empty file.');
        return;
    }
    csvlines.shift(); // removes first element of CSV file, column names

    var output = [];
    async.map(csvlines, processLine, allDone);
}

function processLine(linestr, done) {
    var line = linestr.split(',');
    if (line.length != 3) {
        console.log('Invalid file format in line ' + i + '. Expected format: timestamp,source,videoId');
        return;
    }

    var source = line[1];
    var id = line[2];
    var date = new Date(line[0]).toISOString();

    if (source == 'youtubePlaylist') {
        retrievePlaylist(id, function(ids) {
            var arr = ids.map(function (e) { return {source: 'youtube', _id: e, date: date};});
            done(null, arr);
        });
    }
    else if (source == 'youtubeChannel') {
        retrieveChannel(id, function(ids) {
            done(null, ids.map(function (e) { return {source: 'youtube', _id: e, date: date};}));
        });
    } else {
        done(null, {
            source: source,
            _id: id,
            date: date
        });
    }
}

function allDone(err, results) {
    var outputFilePath = __dirname + '/../data/videos.json';
    fs.readFile(outputFilePath, addToJSON);

    function addToJSON(err, data) {
        var oldarr = JSON.parse(data.toString());

        var outarr = flatten(results).concat(oldarr);

        fs.writeFile(outputFilePath, JSON.stringify(outarr, null, 4), function (err) {
            if (err) {
                throw err;
            }
            console.log(outarr.length + ' entries correctly added to data/videos.json');
        });
    }
}

function retrievePlaylist(playlistId, callback) {
    youtube.playlistItems.list({part:'snippet, id', maxResults:'50', playlistId:playlistId, key:API_KEY}, getVideoIds);
	var videos = [];

    function getVideoIds(err, resp) {
    	if(err) {
    		console.log(err);
    		return;
    	}
    	var nitems = resp.items.length;
    	for(var i = 0; i < nitems; i++) {
    		videos.push(resp.items[i].snippet.resourceId.videoId);
    	}

    	if(resp.nextPageToken) {
    		youtube.playlistItems.list({part:'snippet, id', maxResults:'50', playlistId:playlistId,
    			pageToken: resp.nextPageToken, key:API_KEY}, getVideoIds);
    	} else {
     		callback(videos);
     	}
    }
}

function retrieveChannel(channelId, callback) {
    youtube.channels.list({part:'contentDetails', maxResults:'50', forUsername:channelId, key:API_KEY}, getPlaylistId);

    function getPlaylistId2(err2, resp) {
    	if(err2) {
    		console.log(err1);
    		console.log(err2);
    		return;
    	}
    	if (resp.items.length > 0) {
    		playlistId = resp.items[0].contentDetails.relatedPlaylists.uploads;
    		youtube.playlistItems.list({part:'snippet, id', maxResults:'50', playlistId:playlistId, key:API_KEY}, getVideoIds);
    	}
    }

    function getPlaylistId(err, resp) {
    	err1 = err;
    	if (resp.items.length > 0) {
    		playlistId = resp.items[0].contentDetails.relatedPlaylists.uploads;
    		youtube.playlistItems.list({part:'snippet, id', maxResults:'50', playlistId:playlistId, key:API_KEY}, getVideoIds);
    	} else {
    		youtube.channels.list({part:'contentDetails', maxResults:'50', id:channelId, key:API_KEY}, getPlaylistId2);
    	}
    }

	var videos = [];

    function getVideoIds(err, resp) {
    	if(err) {
    		console.log(err);
    		return;
    	}
    	var nitems = resp.items.length;
    	for(var i = 0; i < nitems; i++) {
    		videos.push(resp.items[i].snippet.resourceId.videoId);
    	}

    	if(resp.nextPageToken) {
    		youtube.playlistItems.list({part:'snippet, id', maxResults:'50', playlistId:playlistId,
    			pageToken: resp.nextPageToken, key:API_KEY}, getVideoIds);
    	} else {
     		callback(videos);
     	}
    }
}
