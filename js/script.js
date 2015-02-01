$(document).ready(function() {

	var videos = [
		{
			source: 'youtube',
			id: 'nIji3qgEFsc',
			date: '2015-02-01T08:06:57.718Z'
		},
		{
			source: 'youtube',
			id: 'QRZ5TfMGMAE',
			date: '2015-02-01T08:06:57.718Z'
		},
		{
			source: 'youtube',
			id: 'I1_hdPqRA_Q',
			date: '2015-02-01T08:06:57.718Z'
		},
		{
			source: 'iqiyi',
			id: 'b6d23fec3c24ae0a61dba33eb34a5202/0/0/w_19rrepgucl',
			date: '2015-02-01T08:06:57.718Z'
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
