$(document).ready(function() {
	var videoIdx = 0;

	$.ajax({
		url: "data/videos.json",
		dataType: "json",
		success: function(response) {
			videos = response;
			loadPlayer();
		}
		});

	$('#nextbutton').click(function() {
		videoIdx++;
		loadPlayer();
	});

	function loadPlayer() {
		var link = $('#templates');

		var templates = link[0].import;
		var template;

		template = $(templates).find('#' + videos[videoIdx].source + '-template')[0];

		var clone = $(template.content).clone();

		var url = clone.children().attr('src');

		url = url.replace('{{ id }}', videos[videoIdx].id);

		clone.children().attr('src', url);
		clone.children().attr('width', 853);
		clone.children().attr('height', 480);
		clone.children().attr('frameborder', 0);
		clone.children().attr('allowfullscreen', true);

		$('#player').empty();
		$('#player').append(clone);
	}
});
