$(document).ready(function() {

	var videos = [
		{
			source: 'iqiyi',
			id: 'eff86e16cb1c48658ff675db57e5748c/0/0/yinyue/20110426/4845a9895fc99773'
		},
		{
			source: 'youku',
			id: 'XODgwMjQ2MTE2'
		},
		{
			source: 'tudou',
			id: 'q00jq0WdlN4/&iid=221758577'
		},
		{
			source: '56',
			id: 'MTM0NDU1NDk3'
		},
		{
			source: 'sina',
			id: '202598574'
		},
		{
			source: 'letv',
			id: '21798378'
		},
		{
			source: 'youtube',
			id: 'XGSy3_Czz8k'
		},
		{
			source: 'qq',
			id: 'l00152s4scd'
		},
		{
			source: 'sohu',
			id: '2217243'
		}
	];

	var videoIdx = 0;

	loadPlayer();

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
