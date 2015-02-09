
function createDbViews(callback) {
    var skippedView = {
        _id: '_design/skipped',
        views: {
            'skipped': {
                map: function(doc) {
                    if(doc.state == 'skipped') {
                        emit(doc.date);
                    }
                }.toString()
            }
        }
    };

    var soonView = {
        _id: '_design/soon',
        views: {
            'soon': {
                map: function(doc) {
                    if(doc.state == 'soon') {
                        emit(doc.date);
                    }
                }.toString()
            }
        }
    };

    var futureView = {
        _id: '_design/future',
        views: {
            'future': {
                map: function(doc) {
                    if(doc.state == 'future') {
                        emit(doc.afterTotalSeconds);
                    }
                }.toString()
            }
        }
    };

    window.db.put(skippedView)
        .then(function() {
            return window.db.put(soonView);
        })
        .then(function() {
            return window.db.put(futureView);
        })
        .catch(function(){}) // this generates error 409 if it's not the first time, we ignore it
        .chain(callback);
}

function playNext() {
    pickNext(donePicking);

    function donePicking(video) {
        $('.playerbutton').unbind('click', buttonPressed);
        $('.playerbutton').click(video, buttonPressed);

        loadPlayer(video);
    }
}

function buttonPressed(event) {
    if (event.data !== null) {
        var video = event.data;
        var button = event.currentTarget.id;

        if (button == 'skipbutton') {
            video.state = 'skipped';
        } else if (button == 'neverbutton') {
            video.state = 'never';
        } else if (button == 'soonbutton') {
            video.state = 'soon';
        } else if (button == 'hardbutton') {
            video.state = 'future';
            video.afterTotalSeconds = 0;
            if(window.totalUserTime) {
                video.afterTotalSeconds += window.totalUserTime; // save the watched time to watch video again in N hours
            }
            console.log('video posted with '+video.afterTotalSeconds+'s delay');
        } else {
            console.log('Error: This should never happen.');
            return;
        }
        video.date = (new Date()).toISOString();

        window.db.put(video)
            .catch(errorHandler('inserting skipped video to database'))
            .chain(playNext);
    } else {
        playNext();
    }
}

function pickNext(donePicking) {
    // list of ordered criteria to choose next video to play
    var pickers = [
        futurePicker,
        probabilityRun(0.1, soonPicker),
        newPicker,
        probabilityRun(0.5, skippedPicker),
        soonPicker
    ];

    var i = 0;

    nextPicker();

    function nextPicker() {
        if (i >= pickers.length) {
            donePicking(null);
        } else {
            pickers[i](pickerDone);
        }
    }

    function pickerDone(video) {
        if (video === null) {
            i++;
            nextPicker();
        } else {
            donePicking(video);
        }
    }
}

function probabilityRun(p, f) {
    return function (callback) {
        if (Math.random() < p) {
            f(callback);
        } else {
            callback(null); // not executed with probability 1-p
        }
    }
}

var N_FUTURE_SECONDS = 20 * 60 * 60; // 50 hours

// chooses videos that have been postponed because of being too difficult
function futurePicker(callback) {
    var totalTime = window.totalUserTime ? window.totalUserTime : 0;

    window.db.query('future', { limit: 1, endkey: totalTime - N_FUTURE_SECONDS, include_docs: true })
        .then(function (response) {
            if (response.rows.length > 0) {
                console.log('Future video picked with less than ' + (totalTime - N_FUTURE_SECONDS) + 's time');
                callback(response.rows[0].doc);
            } else {
                callback(null);
            }
        })
        .catch(errorHandler('querying future database'));
}

// chooses videos that have never been watched
function newPicker(callback) {
    var video = nextRandomNew();

    if (video == null) {
        callback(null);
    } else {
        window.db.get(videos[videos.idx]._id)
             .then(function(doc) {
                setTimeout(newPicker, 0, callback); // prevent stack overflow
            }).catch(function(err) {
                if (err.status != 404) {
                }
                callback(videos[videos.idx]);
            });
    }
}

function nextRandomNew() {
    var videos = window.videos;

    if (typeof videos.idx === "undefined") {
        videos.idx = 0;
    } else if (videos.idx >= videos.length - 1) {
        return null;
    } else {
        videos.idx++;
    }

    var randomIndex = Math.floor(Math.random() * (videos.length - videos.idx) + videos.idx);

    var tmpVal = videos[videos.idx];
    videos[videos.idx] = videos[randomIndex];
    videos[randomIndex] = tmpVal;

    return videos[videos.idx]
}

// chooses videos that have been watched and skipped
function skippedPicker(callback) {
    window.db.query('skipped', { limit: 1, include_docs: true })
        .then(function (response) {
            if (response && response.rows.length > 0) {
                callback(response.rows[0].doc);
            } else {
                callback(null);
            }
        });
}

// chooses videos that have been chosen by the user to play soon
function soonPicker(callback) {
    window.db.query('soon', { limit: 1, include_docs: true })
        .then(function (response) {
            if (response.rows.length > 0) {
                callback(response.rows[0].doc);
            } else {
                callback(null);
            }
        });
}

function errorHandler(err) {
    var customString = err;
    return function(err) {
        console.log('DB error ' + customString + ': ' + err.status + ' ' + err.message);
        console.log('This shouldn\'t happen. Please contact us.');
    }
}