#!/usr/bin/env node

var fs = require('fs');

if (process.argv.length != 3) {
    console.log('Error, one and only one parameter accepted.');
    return;
}

fs.readFile(process.argv[2], processCSV);

function processCSV(err,data) {
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
    for (var i = 0; i < csvlines.length; i++) {
        var line = csvlines[i].split(',');
        if (line.length != 3) {
            console.log('Invalid file format in line ' + i + '. Expected format: timestamp,source,videoId');
            return;
        }

        var d = new Date(line[0]);
        output.push({
            "source": line[1],
            "_id": line[2],
            "date": d.toISOString()
        });
    }

    var outputFilePath = __dirname + '/../data/videos.json';
    fs.readFile(outputFilePath, addToJSON);

    function addToJSON(err, data) {
        var oldarr = JSON.parse(data.toString());

        var outarr = output.concat(oldarr);

        fs.writeFile(outputFilePath, JSON.stringify(outarr, null, 4), function (err) {
            if (err) {
                throw err;
            }
            console.log('Entries correctly added to data/videos.json');
        });
    }
}
