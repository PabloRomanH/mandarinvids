$(document).ready(function() {
	var db = new PouchDB('watched');

	$.ajax({
		url: "data/videos.json",
		dataType: "json",
		success: function(response) {
			videos = response;
			playNext();
		}
	});

	$('#nextbutton').click(playNext);

	function playNext() {
		if (typeof playNext.idx === "undefined") {
			playNext.idx = 0;
		} else {
			playNext.idx++;
		}

		db.get(videos[playNext.idx]._id, function(err, doc) {
			if (err) {
				if (err.status == 404) {
					db.put(videos[playNext.idx], function(err, response) {
						if (err) {
							console.log('Error adding to database: ' + err.status + ' ' + error.message);
						}
					});
				} else {
					console.log('Unknown error searching in database: ' + err.status + ' ' + error.message);
				}

				loadPlayer(videos[playNext.idx]);
			} else {
				setTimeout(playNext); // prevent stack overflow
			}
		});
	}

	function loadPlayer(video) {
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

		$('#player').empty();
		$('#player').append(clone);
	}
});
