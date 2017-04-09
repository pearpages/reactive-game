'use strict';

(function () {
    var SPEED = 10;
    var STAR_NUMBER = 250;

    init();

    function init() {
        var canvas = document.createElement('canvas');
        var ctx = canvas.getContext("2d");
        attachCanvas(canvas,ctx);
        var StarStream = getStarStream(canvas, ctx, SPEED, STAR_NUMBER)
        .subscribe(function (starArray) {
            paintStars(starArray, canvas, ctx);
        });
    }

    function attachCanvas(canvas, ctx) {
        document.body.appendChild(canvas);
        canvas.width = window.innerWidth;
        canvas.height = window.innerHeight;
    }

    function getStarStream(canvas, ctx, speed, starNumber) {
        return Rx.Observable.range(1, STAR_NUMBER)
            .map(function () {
                return {
                    x: parseInt(Math.random() * canvas.width),
                    y: parseInt(Math.random() * canvas.height),
                    size: Math.random() * 1 + 1
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

    function paintStars(stars, canvas, ctx) {
        ctx.fillStyle = '#000000';
        ctx.fillRect(0, 0, canvas.width, canvas.height);
        ctx.fillStyle = '#ffffff';
        stars.forEach(function (star) {
            ctx.fillRect(star.x, star.y, star.size, star.size);
        });
    }

})();




