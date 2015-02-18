
$(document).ready(function() {
	window.db = new PouchDB('history', { auto_compaction: true });
	window.db.viewCleanup();

	xxx();
	// createDbViews(downloadDataAndPlay);
	//
	// $(document).on('visibilitychange', handleVisibilityChange);
	// $('#resetbutton').click(resetDB);
	//
	// $(parent).on("popstate", function() {
	// 	unloadPlayer();
	// 	var match = /\/([^\/]+)\/(.+)/.exec(parent.location.pathname);
	// 	var video = {
	// 		source: match[1],
	// 		_id: match[2]
	// 	};
	//
	// 	playNext(video);
	// });
	//
	// insertContactLink();
	//
	// setupSubsBlocker();
});

function xxx() {
	console.log('xxxx');
	window.db.query('soon', { include_docs: true })
		.then(function (response) {
			console.log('shuffling ' + response.rows.length + 'videos');
			console.log(response);
			if (response.rows.length > 0) {
				for(var i = 0; i < response.rows.length; i++) {
					var randDate = new Date();
					randDate.setMinutes(-Math.random()*15*24*60);
					response.rows[i].doc.date = randDate;
					console.log(response.rows[i].doc);
					window.db.put(response.rows[i].doc)
						.then(function() {
							console.log('inserted video');
						})
						.catch(errorHandler('inserting skipped video to database'));
				}
			}
		//	downloadDataAndPlay();
		});
}

function resetDB () {
	if(confirm("Are you sure? All your progress will be reset.")) {
		unloadPlayer();
		window.db.destroy(function(err, info) {
			window.db = new PouchDB('history', { auto_compaction: true }) ;
			createDbViews(downloadDataAndPlay);
		});
	}
}

function insertContactLink() {
	var aaaa = "pabloromanh";
	var bbbb = "gmail.com";
	$('#contact').append('<a href="' + 'mail' + 'to:' + aaaa + '@' + bbbb + '">Contact us</a>');
}

function setupSubsBlocker() {
	$("#subtitleblock").resizable({
		containment: ".playerband",
		autoHide: true,
		handles: "ne,se,nw,sw",
		minHeight: 50
	});
	$('#subsblockclosebutton').click(function(e) {
		$("#subtitleblock").hide();
		$('#subBlockSetting').prop('checked', false);
		return false;
	});
	$('#subtitleblock').hover(
		function(e) {
			$("#subsblockclosebutton").show();
			return false;
		},
		function(e) {
			$("#subsblockclosebutton").hide();
			return false;
		});
	$('#subBlockSetting').click(function() {
		if (this.checked) {
			$("#subtitleblock").css("display", "flex");
		} else {
			$("#subtitleblock").hide();
		}
	});
}

function handleVisibilityChange() {
	if (document['hidden']) {
		stopCountingTime();
	} else {
		startCountingTime();
	}
}

function downloadDataAndPlay() {
	var match = /\/([^\/]+)\/(.+)/.exec(parent.location.pathname);
	var video = null;
	if (match != null) {
		video = {
			source: match[1],
			_id: match[2]
		};
	}

	$.ajax({
		url: "/data/videos.json",
		dataType: "json",
		success: function(response) {
			window.videos = response;
		},
		complete: function() {
			playNext(video);
		}
	});
}

function unloadPlayer() {
	stopCountingTime();
	$('#player').empty();
}

function loadPlayer(video) {
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
	clone.children().attr('height', 510);
	clone.children().attr('frameborder', 0);
	clone.children().attr('allowfullscreen', true);

	$('#player').append(clone);
	startCountingTime();
}

function startCountingTime() {
	if(!window.lastStart) {
		window.lastStart = new Date();
	}
}

function stopCountingTime() {
	var lastStart = window.lastStart ? window.lastStart.getTime() : null;
	window.lastStart = null;

	window.db.get('totalUserTime')
		.then(function(doc) {
			if (lastStart) {
				doc.time += ((new Date()).getTime() - lastStart) / 1000;
				console.log('Watched ' + ((new Date()).getTime() - lastStart) + 'ms this time.');
				window.db.put(doc);
			}
			window.totalUserTime = doc.time;
		}).catch(function(err) {
			if (err.status == 404) {
				window.db.put({ _id: 'totalUserTime', time: ((new Date()).getTime() - lastStart) / 1000 });
			}
		});
}

function pad (number) {
	var str = '00' + String(number);

	return str.substr(str.length - 2);
}

function secToTimeString(seconds) {
	if (typeof seconds === "undefined") return '';
	if (seconds < 0) return '';

	seconds = Math.round(seconds);

	var hours = Math.floor(seconds / 3600);
	var minutes = Math.floor((seconds % 3600) / 60);

	minutes = pad(minutes);
	return hours + 'h' + minutes + 'm';
};
