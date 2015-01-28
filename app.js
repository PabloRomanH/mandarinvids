(function() {
    var app = angular.module('mandarinvids', ['youtube-embed']);

    app.controller('TvController', function($analytics, $scope, videos, levelNames) {
        var controller = this;
        var playlistRetrieved = false;

        controller.videos = [];

        controller.levelNames = levelNames.names;

        controller.isLevelSelected = false;

        controller.idx = 0;
        controller.videoId = null;
        controller.playerVars = { autoplay: 1, autohide: 3, iv_load_policy: 3 };
        controller.player = null;

        function shuffle(array) {
            var currentIndex = array.length, temporaryValue, randomIndex ;
            // While there remain elements to shuffle...
            while (0 !== currentIndex) {
                // Pick a remaining element...
                randomIndex = Math.floor(Math.random() * currentIndex);
                currentIndex -= 1;
                // And swap it with the current element.
                temporaryValue = array[currentIndex];
                array[currentIndex] = array[randomIndex];
                array[randomIndex] = temporaryValue;
            }
            return array;
        }

        controller.playLevel = function (level) {
            videos.getByLevel(level).success(function (data) {
                controller.videos = shuffle(data);

                controller.videoId = controller.videos[controller.idx].videoId;

                controller.isLevelSelected = true;
            });
        }

        controller.playNext = function () {
            controller.idx = controller.idx + 1;

            if (controller.idx == controller.videos.length) {
                controller.player.seekTo(controller.player.getDuration(), true);
            } else {
                var videoId = controller.videos[controller.idx].videoId;
                controller.player.loadVideoById(videoId);
            }
        }

        $scope.$on('youtube.player.ended', function ($event, player) {
            if (controller.idx < controller.videos.length - 1) {
                controller.playNext();
            }
        });
    });

    app.directive('levelCard', function() {
        return {
            restrict: 'E',
            templateUrl: '/babelbooapp/tv/level-card.html'
        }
    });

    app.directive('tvCard', function() {
        return {
            restrict: 'E',
            templateUrl: '/babelbooapp/tv/tv-card.html'
        }
    });
})();
