$(document).ready(function() {
	window.watcheddb = new PouchDB('watched');
	window.soondb = new PouchDB('soon');
	// var futuredb = new PouchDB('future');
	// var neverdb = new PouchDB('never');

	$.ajax({
		url: "data/videos.json",
		dataType: "json",
		success: function(response) {
			videos = response;
			playNext();
		}
	});
});

function playNext() {
	console.log('playing next');
	pickNext(pickedReady);

	function pickedReady(playObject) {
		$('#skipbutton').unbind('click', nextButtonPressed);
		$('#skipbutton').click(playObject, nextButtonPressed);
		// $('#skipbutton').unbind('click', soonButtonPressed);
		// $('#skipbutton').click(playObject, soonButtonPressed);

		loadPlayer(playObject.video);
	}
}

function nextButtonPressed(event) {
	if (event.data !== null) {
		if (event.data.dbname == 'new') {
			console.log('finished watching new video, adding to database');
			console.log(event.data.video);
			window.watcheddb.put(event.data.video, errorHandler);
		} else if (event.data.dbname == 'soon') {
			//removeFirst(soon);
		} else if (event.data.dbname == 'future') {
			//removeFirst(future);
		}
	}

	playNext();
}

function pickNext(callback) {
	var video;
	console.log('choosing what to play next');

	pickNextNew(function(playObject) {
		if (playObject !== null) {
			console.log('picked a new video');
			callback(playObject);
		} else {
			console.log('NO MORE VIDEOS FOUND!');
			// search somewhere else
			callback({ video: null });
		}
	});
}

function pickNextNew(callback) {
	if (typeof videos.idx === "undefined") {
		videos.idx = 0;
	} else {
		videos.idx++;
	}

	if (videos.idx >= videos.length) {
		callback(null);
	} else {
		window.watcheddb.get(videos[videos.idx]._id, function(err, doc) {
			if (err) {
				if (err.status != 404) {
					console.log('Unknown error searching in database: ' + err.status + ' ' + error.message);
					console.log('This shouldn\'t happen. Please contact us.');
				}
				console.log('found not watched video');
				callback({ video: videos[videos.idx], dbname: 'new' });
			} else {
				console.log('skipping watched video');
				setTimeout(pickNextNew, 0, callback); // prevent stack overflow
			}
		});
	}
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

function errorHandler(err, response) {
	if (err) {
		console.log('Error adding to database: ' + err.status + ' ' + error.message);
		console.log('This shouldn\'t happen. Please contact us.');
	}
}
