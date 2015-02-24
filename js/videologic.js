
function createDbViews(callback) {
    var skippedView = {
        _id: '_design/skipped',
        views: {
            'skipped': {
                map: function(doc) {
                    if(doc.state == 'skipped') {
                        emit(doc.date);
                    }
                }.toString(),
                reduce: '_count'
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
                }.toString(),
                reduce: '_count'
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

    window.db.get('_design/skipped')
        .then(function(doc) {
            if(!doc.views.skipped.reduce) {
                doc.views.skipped.reduce = '_count';
                return window.db.put(doc);
            }
        })
        .catch(function(err) {
            if (err.status == 404) {
                return window.db.put(skippedView);
            }
        })
        .catch(function(err){})
        .chain(function() {
            return window.db.get('_design/soon');
        })
        .then(function(doc) {
            if(!doc.views.soon.reduce) {
                doc.views.soon.reduce = '_count';
                return window.db.put(doc);
            }
        })
        .catch(function(err) {
            if (err.status == 404) {
                return window.db.put(soonView);
            }
        })
        .catch(function(err){})
        .chain(function() {
            return window.db.put(futureView);
        })
        .catch(function(err){}) // this generates error 409 if it's not the first time, we ignore it
        .chain(callback);
}

function playNext(firstVideo) {
    if (firstVideo) {
        pickThis(firstVideo, donePicking);
    } else {
        pickNext(donePicking);
    }

    function donePicking(video) {
        $('.playerbutton').unbind('click', buttonPressed);
        $('.playerbutton').click(video, buttonPressed);

        if (!firstVideo) {
            parent.history.pushState('data', '', '/' + video.source + '/' + video._id);
        }

        loadPlayer(video);
    }
}

function buttonPressed(event) {
    unloadPlayer();
    $('.playerbutton').unbind('click', buttonPressed);
    $('.playerbutton').click(buttonPressedDummy);

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

        video = normalizeId(video);

        window.db.put(video)
            .catch(errorHandler('inserting skipped video to database'))
            .chain(function() {
                playNext();
            });
    } else {
        playNext();
    }
    return false; // prevents browser from scrolling back to top when pressing the button
}

function buttonPressedDummy() {
    return false;
}

function normalizeId(video) {
    if (video._id[0] == '_') {
        video._id = '*' + video._id;
    }
    return video;
}

function denormalizeId(video) {
    if (video._id[0] == '*') {
        video._id = video._id.substring(1);
    }
    return video;
}

function pickThis(video, callback) {
    window.db.get(normalizeId(video)._id)
        .then(function(doc) {
            callback(denormalizeId(doc));
        })
        .catch(function(err) {
            if (err.status != 404) {
            }
            callback(denormalizeId(video));
        });
}

function getNumSoonSkipped(callback) {
    var numSoon = 0;
    var numSkipped = 0;

    window.db.query('soon', { reduce: true })
        .then(function (response) {
            if(response.rows.length) {
                numSoon = response.rows[0].value;
            }

            return window.db.query('skipped', { reduce: true });
        })
        .then(function (response) {
            if(response.rows.length) {
                numSkipped = response.rows[0].value;
            }

            callback(numSoon, numSkipped);
        });
}

function pickNext(donePicking) {
    var START_PROBABILITY_NUMSOON = 10;
    var MAX_PROBABILITY_NUMSOON = 40;
    var MAX_PROBABILITY_SOON = 0.5;
    var SKIPPED_SOON_RATIO = 0.3;

    var i = 0;

    var pickers;

    getNumSoonSkipped(function (numSoon, numSkipped)
        {
            var soonProbability;

            if(numSoon > START_PROBABILITY_NUMSOON)
                soonProbability = (numSoon - START_PROBABILITY_NUMSOON) / MAX_PROBABILITY_NUMSOON * MAX_PROBABILITY_SOON;
            else
                soonProbability = 0;

            if (soonProbability > MAX_PROBABILITY_SOON) soonProbability = MAX_PROBABILITY_SOON;

            var equivalentProbability;

            if (numSoon > 0)
                equivalentProbability = soonProbability / numSoon * numSkipped;
            else
                equivalentProbability = 0;

            var skippedProbability = equivalentProbability * SKIPPED_SOON_RATIO;

            // list of ordered criteria to choose next video to play
            pickers = [
                futurePicker,
                probabilityRun(soonProbability, soonPicker),
                newPicker,
                probabilityRun(skippedProbability, skippedPicker),
                soonPicker
            ];

            nextPicker();
        });

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
            donePicking(denormalizeId(video));
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
        window.db.get(video._id)
             .then(function(doc) {
                setTimeout(newPicker, 0, callback); // prevent stack overflow
            }).catch(function(err) {
                if (err.status != 404) {
                }
                callback(video);
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

    return normalizeId(videos[videos.idx]);
}

// chooses videos that have been watched and skipped
function skippedPicker(callback) {
    window.db.query('skipped', { limit: 1, include_docs: true, reduce: false })
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
    window.db.query('soon', { limit: 1, include_docs: true, reduce: false })
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
