'use strict';

(function () {
    var SPEED = 10;
    var STAR_NUMBER = 250;
    var SPACE_COLOR = '#000000';
    var STARS_COLOR = '#ffffff';
    var MAX_STAR_SIZE = 3;

    init(SPEED,STAR_NUMBER,SPACE_COLOR,STARS_COLOR,MAX_STAR_SIZE);

    function init(SPEED, STAR_NUMBER, SPACE_COLOR, STARS_COLOR,MAX_STAR_SIZE) {
        var canvas = document.createElement('canvas');
        var ctx = canvas.getContext("2d");
        attachCanvas(canvas, ctx);
        getStarStream(canvas, ctx, SPEED, STAR_NUMBER,MAX_STAR_SIZE)
            .subscribe(function (starArray) {
                paintStars(starArray, canvas, ctx, SPACE_COLOR, STARS_COLOR);
            });
    }

    function attachCanvas(canvas, ctx) {
        document.body.appendChild(canvas);
        canvas.width = window.innerWidth;
        canvas.height = window.innerHeight;
    }

    function getStarStream(canvas, ctx, SPEED, STAR_NUMBER,MAX_STAR_SIZE) {
        return Rx.Observable.range(1, STAR_NUMBER)
            .map(function () {
                return {
                    x: parseInt(Math.random() * canvas.width),
                    y: parseInt(Math.random() * canvas.height),
                    size: Math.random() * MAX_STAR_SIZE + 1
                };
            })
            .toArray()
            .flatMap(function (starArray) {
                return Rx.Observable.interval(SPEED)
                    .map(function () {
                        starArray.forEach(function (star) {
                            if (star.y >= canvas.height) {
                                star.y = 0; // Reset star to top of the screen
                            }
                            star.y += 3; // Move star });
                        });
                        return starArray;
                    })
            })
    }

    function paintStars(stars, canvas, ctx, spaceColor, starsColor) {
        ctx.fillStyle = spaceColor;
        ctx.fillRect(0, 0, canvas.width, canvas.height);
        ctx.fillStyle = starsColor;
        stars.forEach(function (star) {
            ctx.fillRect(star.x, star.y, star.size, star.size);
        });
    }

})();




