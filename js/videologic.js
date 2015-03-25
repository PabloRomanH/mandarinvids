
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

    var verySoonView = {
        _id: '_design/verysoon',
        views: {
            'verysoon': {
                map: function(doc) {
                    if(doc.state == 'verysoon') {
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
        .chain(function() {
            return window.db.put(verySoonView);
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
        window.video = video;
        $('.playerbutton').unbind('click');
        $('.playerbutton').click(buttonPressed);
        $(".dropdown-menu .playerbutton").click(function() {
            $(this).closest(".dropdown-menu").prev().dropdown("toggle");
        });

        $(document).unbind('keypress');
        $(document).keypress(keyPressed);

        if (!firstVideo) {
            parent.history.pushState('data', '', '/' + video.source + '/' + video._id);
        }

        window.video = video;

        applySubsState(video);
        loadPlayer(video);
    }
}

function keyPressed (event) {
    if (event.which == 49) {
        $('#verysoonbutton').click();
        $('#verysoonbutton').focus();
    } else if(event.which == 50) {
        $('#soonbutton').click();
        $('#soonbutton').focus();
    } else if(event.which == 51) {
        $('#skipbutton').click();
        $('#skipbutton').focus();
    } else if(event.which == 52) {
        $('#hardbutton').click();
    } else if(event.which == 53) {
        $('#neverbutton').click();
        $('#neverbutton').focus();
    }

    return true;
}

function buttonPressed(event) {
    clearTimeout(window.idleTimeout);

    unloadPlayer();

    $('.playerbutton').unbind('click', buttonPressed);
    $('.playerbutton').click(buttonPressedDummy);

    $(document).unbind('keypress');
    $(document).keypress(buttonPressedDummy);

    if (window.video !== null) {
        var video = window.video;
        window.video = null;
        var button = event.currentTarget.id;

        if (button == 'verysoonbutton') {
            video.state = 'verysoon';
        } else if (button == 'soonbutton') {
            video.state = 'soon';
        } else if (button == 'skipbutton') {
            video.state = 'skipped';
        } else if (button == '20hours') {
            video.state = 'future';
            video.afterTotalSeconds = 20 * 60 * 60;
            if(window.totalUserTime) {
                video.afterTotalSeconds += window.totalUserTime; // save the watched time to watch video again in N hours
            }
        } else if (button == '50hours') {
            video.state = 'future';
            video.afterTotalSeconds = 50 * 60 * 60;
            if(window.totalUserTime) {
                video.afterTotalSeconds += window.totalUserTime; // save the watched time to watch video again in N hours
            }
        } else if (button == '100hours') {
            video.state = 'future';
            video.afterTotalSeconds = 100 * 60 * 60;
            if(window.totalUserTime) {
                video.afterTotalSeconds += window.totalUserTime; // save the watched time to watch video again in N hours
            }
        } else if (button == 'neverbutton') {
            video.state = 'never';
        } else {
            console.log('Error: This should never happen.');
            return;
        }
        video.date = (new Date()).toISOString();
        video = includeSubsState(video);

        video = normalizeId(video);

        window.db.put(video)
            .catch(errorHandler('inserting skipped video to database'))
            .chain(function() {
                playNext();
            });
    } else {
        playNext();
    }

    var twentyMinutes = 1000 * 60 * 20;
    window.idleTimeout = setTimeout(showIdlePopup, twentyMinutes);

    return false; // prevents browser from scrolling back to top when pressing the button
}

var PLAYER_CONTROLS_HEIGHT = 30;

function includeSubsState(video) {
    if($('#subtitleblock').is(':visible')) {
        video.subsVisible = true;
        video.subsTop = window.subsTop / (PLAYER_HEIGHT - PLAYER_CONTROLS_HEIGHT);
        video.subsHeight = window.subsHeight / (PLAYER_HEIGHT - PLAYER_CONTROLS_HEIGHT);
    } else {
        video.subsVisible = false;
        video.subsTop = undefined;
        video.subsHeight = undefined;
    }

    return video;
}

function applySubsState(video) {
    if(video.subsVisible) {
        window.subsTop = video.subsTop * (PLAYER_HEIGHT - PLAYER_CONTROLS_HEIGHT);
        window.subsHeight = video.subsHeight * (PLAYER_HEIGHT - PLAYER_CONTROLS_HEIGHT);

        $('#subBlockSetting').prop('checked', true);
        $("#subtitleblock").css("display", "flex");
        $('#subtitleblock').css('top', window.subsTop);
        $('#subtitleblock').css('height', window.subsHeight);
    } else if (video.subsVisible == false) {
        $('#subBlockSetting').prop('checked', false);
        $('#subtitleblock').hide();
    }
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

function getNumVideos(callback) {
    var numSoon = 0;
    var numSkipped = 0;
    var numVerySoon = 0;

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

            return window.db.query('verysoon', { reduce: true });
        })
        .then(function (response) {
            if(response.rows.length) {
                numVerySoon = response.rows[0].value;
            }

            callback(numVerySoon, numSoon, numSkipped);
        });
}

function pickNext(donePicking) {
    var MINIMUM_WATCHED_BEFORE_REPEATING = 10;
    var WATCHED_MAX_REPEAT_PROBABILITY = 50;
    var MAX_PROBABILITY_NEW = window.newProbability / 100;
    var VERYSOON_SOON_FACTOR = 3;
    var SOON_SKIPPED_FACTOR = 3;

    var i = 0;

    var pickers;

    getNumVideos(function (numVerySoon, numSoon, numSkipped)
        {
            var totalWatched = numVerySoon + numSoon + numSkipped;
            totalWatched -= MINIMUM_WATCHED_BEFORE_REPEATING;
            if (totalWatched < 0) totalWatched = 0;
            if (totalWatched > WATCHED_MAX_REPEAT_PROBABILITY) totalWatched = WATCHED_MAX_REPEAT_PROBABILITY;

            var newProbability = totalWatched / WATCHED_MAX_REPEAT_PROBABILITY * MAX_PROBABILITY_NEW;

            var verysoonProbability = VERYSOON_SOON_FACTOR * SOON_SKIPPED_FACTOR * numVerySoon;
            var soonProbability = SOON_SKIPPED_FACTOR * numSoon;

            var totalProbability = verysoonProbability + soonProbability + numSkipped;

            verysoonProbability /= totalProbability;

            soonProbability /= soonProbability + numSkipped;

            // list of ordered criteria to choose next video to play
            pickers = [
                futurePicker,
                probabilityRun(newProbability, newPicker),
                probabilityRun(verysoonProbability, verySoonPicker),
                probabilityRun(soonProbability, soonPicker),
                skippedPicker,
                newPicker,
                verySoonPicker,
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

// chooses videos that have been postponed because of being too difficult
function futurePicker(callback) {
    var totalTime = window.totalUserTime ? window.totalUserTime : 0;

    window.db.query('future', { limit: 1, endkey: totalTime, include_docs: true })
        .then(function (response) {
            if (response.rows.length > 0) {
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
    pickFirst('skipped', callback);
}

// chooses videos that have been chosen by the user to play soon
function soonPicker(callback) {
    pickFirst('soon', callback);
}

// chooses videos that have been chosen by the user to play very soon
function verySoonPicker(callback) {
    pickFirst('verysoon', callback);
}

// chooses videos that have been chosen by the user to play very soon
function pickFirst(view, callback) {
    window.db.query(view, { limit: 1, include_docs: true, reduce: false })
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
