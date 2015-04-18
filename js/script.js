
$(document).ready(function() {
	window.db = new PouchDB('history', { auto_compaction: true });
	window.db.viewCleanup();

	initUser(updateFuture);

	createDbViews(downloadDataAndPlay);

	$(document).on('visibilitychange', handleVisibilityChange);
	$('#resetbutton').click(resetDB);

	insertContactLink();

	setupSubsBlocker();

	$(parent).on("popstate", function() {
		unloadPlayer();
		var match = /\/([^\/]+)\/(.+)/.exec(parent.location.pathname);
		var video = {
			source: match[1],
			_id: match[2]
		};

		playNext(video);
	});
});

function setupSlider() {
	$('.slider').slider({
		formater: function (number) { return number + '%'; },
		value: window.newProbability
	})
		.on('slideStop', function(event){
			window.db.get('newProbability')
				.then(function (doc) {
					window.newProbability = event.value;
					doc.value = event.value;
					window.db.put(doc);
				})
				.catch(function (err) {
					window.db.put({_id: 'newProbability', value: event.value});
				});
		});
}

// temporary code to fix entries using old time specification (submitted time instead of play-again time)
function updateFuture()
{
	window.db.query('future', { include_docs: true })
		.then(function (response) {
			for(var i = 0; i < response.rows.length; i++) {
				if(response.rows[i].doc.afterTotalSeconds < window.totalUserTime) {
					response.rows[i].doc.afterTotalSeconds += 20 * 60 * 60;
					window.db.put(response.rows[i].doc);
				}
			}
		})
		.catch(errorHandler('listing future to fix them'));
}

function showWatchedTime(seconds) {
	$('#watched-time').empty();
	var h = Math.floor(seconds / 60 / 60);
	var m = Math.floor(seconds % (60 * 60) / 60);
	m = m < 10 ? "0" + m : m;
	$('#watched-time').append('Watched: ' + h + ':' + m);
}

function initUser(callback) {
	window.db.get('totalUserTime')
		.then(function(doc) {
			window.totalUserTime = doc.time;
			showWatchedTime(doc.time);
		})
		.catch(function(err) {
			window.totalUserTime = 0;
			showWatchedTime(0);
		})
		.chain(function() {
			return window.db.get('newProbability');
		})
		.then(function (doc) {
			window.newProbability = doc.value;
		})
		.catch(function (err) {
			window.newProbability = 10;
		})
		.chain(setupSlider)
		.chain(callback);
}

function resetDB () {
	if(confirm("Are you sure? All your progress will be reset.")) {
		unloadPlayer();
		window.db.destroy(function(err, info) {
			window.db = new PouchDB('history', { auto_compaction: true }) ;
			createDbViews(downloadDataAndPlay);
		});
	}
	return false;
}

function insertContactLink() {
	var aaaa = "pabloromanh";
	var bbbb = "gmail.com";
	$('#contact').append('<a href="' + 'mail' + 'to:' + aaaa + '@' + bbbb + '">Contact us</a>');
}

function setupSubsBlocker() {
	window.subsTop = 380;
	window.subsHeight = 50;

	$("#subtitledrag").mousedown(function(event) {
		var startY = event.pageY;
		var top = parseInt($('#subtitleblock').css('top').match(/(.*)px/)[1]);
		var height = parseInt($('#subtitleblock').css('height').match(/(.*)px/)[1]);
		var playerHeight = parseInt($('.playerband').css('height').match(/(.*)px/)[1]);

		$('#subtitleblock').removeClass('notmoved');

	    $(window).mousemove(function(event) {
			var newTop = top + event.pageY - startY;
			if (newTop < 0) newTop = 0;
			if (newTop + height > playerHeight) newTop = playerHeight - height;

			$('#subtitleblock').css('top', newTop);

			window.subsTop = newTop;
	    });
	});

	$("#subtitleresize").mousedown(function(event) {
		var startY = event.pageY;
		var top = parseInt($('#subtitleblock').css('top').match(/(.*)px/)[1]);
		var height = parseInt($('#subtitleblock').css('height').match(/(.*)px/)[1]);
		var playerHeight = parseInt($('.playerband').css('height').match(/(.*)px/)[1]);

		$('#subtitleblock').removeClass('notmoved');

		$(window).mousemove(function(event) {
			var newTop = top + event.pageY - startY;
			if (newTop < 0) newTop = 0;

			var newHeight = height + 2 * (-event.pageY + startY);

			if (newHeight < 30) {
				newHeight = 30;
				newTop = top + height / 2 - newHeight / 2;
			}

			if (newTop + newHeight > playerHeight) newHeight = playerHeight - newTop;

			$('#subtitleblock').css('top', newTop);
			$('#subtitleblock').css('height', newHeight);

			window.subsTop = newTop;
			window.subsHeight = newHeight;
		});
	});

	$(window).mouseup(function() {
		$(window).unbind("mousemove");
	});

	$('#subsblockclosebutton').click(function(e) {
		$("#subtitleblock").hide();
		$('#subBlockSetting').prop('checked', false);
		return false;
	});

	$('#subtitleblock').hover(
		function(e) {
			$("#subtitlebuttons").show();
			return false;
		},
		function(e) {
			$("#subtitlebuttons").hide();
			return false;
		});

	$('#subBlockSetting').click(function() {
		if (this.checked) {
			$("#subtitleblock").css("display", "flex");
			$('#subtitleblock').removeClass('notmoved');
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

window.PLAYER_WIDTH = 853;
window.PLAYER_HEIGHT = 510;

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
	clone.children().attr('width', PLAYER_WIDTH);
	clone.children().attr('height', PLAYER_HEIGHT);
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
				window.db.put(doc);
			}
			window.totalUserTime = doc.time;
			showWatchedTime(doc.time);
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
