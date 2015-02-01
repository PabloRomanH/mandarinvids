$(document).ready(function() {

	var videos = [
		{
			source: 'youtube',
			id: 'r2PoBAZeWPo',
			date: '2015-02-02T08:06:57.718Z'
		},
		{
			source: 'youtube',
			id: 'g1na24Bd5Rs',
			date: '2015-02-02T08:06:57.718Z'
		},
		{
			source: 'iqiyi',
			id: 'b6d23fec3c24ae0a61dba33eb34a5202/0/0/w_19rrepgucl.swf-albumId=897022409-tvId=897022409-isPurchase=0-cnId=2',
			date: '2015-02-01T08:06:57.718Z'
		},
		{
			source: 'youtube',
			id: 'DIPGLKZ76xk',
			date: '2015-02-02T08:06:57.718Z'
		},
		{
			source: 'youtube',
			id: 'NdzGQInkg-w',
			date: '2015-02-02T08:06:57.718Z'
		},
		{
			source: 'youtube',
			id: 'kypaX1ch7g0',
			date: '2015-02-02T08:06:57.718Z'
		},
		{
			source: 'youtube',
			id: 'kBADhKRujdM',
			date: '2015-02-02T08:06:57.718Z'
		},
		{
			source: 'youtube',
			id: 'yelfxueMlvc',
			date: '2015-02-02T08:06:57.718Z'
		},
		{
			source: 'youtube',
			id: 'mDHIAY1h-3M',
			date: '2015-02-02T08:06:57.718Z'
		},
		{
			source: 'youtube',
			id: 'QRZ5TfMGMAE',
			date: '2015-02-01T08:06:57.718Z'
		},
		{
			source: 'youtube',
			id: 'nIji3qgEFsc',
			date: '2015-02-01T08:06:57.718Z'
		},
		{
			source: 'youtube',
			id: 'I1_hdPqRA_Q',
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
