$(document).ready(function() {
	// PouchDB.destroy('history'); // FIXME: reset for testing
	// PouchDB.on('destroyed', function (dbName) {
	// 	window.watcheddb = new PouchDB('watched');
	// 	downloadDataAndPlay();
	// });
	//
	window.db = new PouchDB('history');
	window.db.viewCleanup();

	createDbViews(downloadDataAndPlay);
});

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

	window.db.put(skippedView)
		.then(function() {
			return window.db.put(soonView);
		})
		.catch(function(){}) // this generates error 409 if it's not the first time, we ignore it
		.chain(callback);
}

//
//			 2. Move logic to the query params
//
//			 Don't do:
//
//			 function (doc) {
//			 if (doc.highScore >= 1000) {
//			 	emit(doc.highScore);
//			 }
//			 }
//			 Instead, do:
//
//			 function (doc) {
//			 emit(doc.highScore);
//			 }
//			 And then query with {startkey: 1000}.
//
// function futureView(doc) {
// 	if(doc.state == 'future') {
// 		emit(doc.afterTotalHours, doc.title);
// 	}
// }


function downloadDataAndPlay() {
	$.ajax({
		url: "data/videos.json",
		dataType: "json",
		success: function(response) {
			window.videos = response;
			playNext();
		}
	});
}

function playNext() {
	console.log('playing next');
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

// this generates error 409 if it's not the first time, we ignore it

function pickNext(donePicking) {
	var pickers = [
		probabilityRun(0.5, soonPicker),
		newPicker,
		skippedPicker
	];

	var i = 0;
	console.log('choosing what to play next');
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

function newPicker(callback) {
	var videos = window.videos;

	if (typeof videos.idx === "undefined") {
		videos.idx = 0;
	} else {
		videos.idx++;
	}

	if (videos.idx >= videos.length) {
		console.log('no new videos found');
		callback(null);
	} else {
		window.db.get(videos[videos.idx]._id)
		 	.then(function(doc) {
				console.log('skipping watched video');
				setTimeout(newPicker, 0, callback); // prevent stack overflow
			}).catch(function(err) {
				if (err.status != 404) {
					console.log('Unknown error searching in database: ' + err.status + ' ' + err.message);
					console.log('This shouldn\'t happen. Please contact us.');
				}
				console.log('found not watched video');
				callback(videos[videos.idx]);
			});
	}
}

function skippedPicker(callback) {
	window.db.query('skipped', { limit: 1, include_docs: true })
		.then(function (response) {
			if (response.total_rows > 0) {
				callback(response.rows[0].doc);
			} else {
				console.log('no skipped videos found');
				callback(null);
			}
		});
}

function soonPicker(callback) {
	window.db.query('soon', { limit: 1, include_docs: true })
		.then(function (response) {
			if (response.total_rows > 0) {
				callback(response.rows[0].doc);
			} else {
				console.log('no skipped videos found');
				callback(null);
			}
		});
}

function loadPlayer(video) {
	$('#player').empty();

	if(video === null) {
		return;
	}

	var link = $('#templates');

	var templates = link[0].import;
	var template;

	template = $(templates).find('#' + video.source + '-template')[0];

	var clone = $(template.content).clone();

	var url = clone.children().attr('src');

	url = url.replace('{{ id }}', video._id);

	clone.children().attr('src', url);
	clone.children().attr('width', 853);
	clone.children().attr('height', 480);
	clone.children().attr('frameborder', 0);
	clone.children().attr('allowfullscreen', true);

	$('#player').append(clone);
}

function errorHandler(err) {
	var customString = null;
	if (typeof err == 'string') {
		customString = err;
		return function(err) {
			console.log('DB error ' + customString + ': ' + err.status + ' ' + err.message);
			console.log('This shouldn\'t happen. Please contact us.');
		}
	}

	console.log('DB error: ' + err.status + ' ' + error.message);
	console.log('This shouldn\'t happen. Please contact us.');
}
