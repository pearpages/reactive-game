'use strict';

(function () {
    var SPEED = 10;
    var STAR_NUMBER = 250;
    var SPACE_COLOR = '#000000';
    var STARS_COLOR = '#ffffff';
    var MAX_STAR_SIZE = 3;
    var HERO_Y =  30;

    init(SPEED, STAR_NUMBER, SPACE_COLOR, STARS_COLOR, MAX_STAR_SIZE, HERO_Y);

    function init(SPEED, STAR_NUMBER, SPACE_COLOR, STARS_COLOR, MAX_STAR_SIZE, HERO_Y) {
        var canvas = document.createElement('canvas');
        var ctx = canvas.getContext("2d");
        attachCanvas(canvas, ctx);
        var StarStream = getStarStream(canvas, ctx, SPEED, STAR_NUMBER, MAX_STAR_SIZE)
        var SpaceShip = getPlayerSpaceship(canvas.height - HERO_Y,canvas);

        var Game = Rx.Observable.combineLatest(
            StarStream, SpaceShip, function (stars, spaceship) {
                return { stars: stars, spaceship: spaceship };
            });
        Game.subscribe(renderScene);

        function renderScene(actors) {
            paintStars(actors.stars,canvas, ctx, SPACE_COLOR, STARS_COLOR);
            paintSpaceShip(ctx, actors.spaceship.x, actors.spaceship.y);
        }
    }

    function attachCanvas(canvas, ctx) {
        document.body.appendChild(canvas);
        canvas.width = window.innerWidth;
        canvas.height = window.innerHeight;
    }

    function getStarStream(canvas, ctx, SPEED, STAR_NUMBER, MAX_STAR_SIZE) {
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

    function paintSpaceShip(ctx, x, y) {
        drawTriangle(ctx, x, y, 20, '#ff0000', 'up');
    }

    function drawTriangle(ctx, x, y, width, color, direction) {
        ctx.fillStyle = color;
        ctx.beginPath();
        ctx.moveTo(x - width, y);
        ctx.lineTo(x, direction === 'up' ? y - width : y + width); ctx.lineTo(x + width, y);
        ctx.lineTo(x - width, y);
        ctx.fill();
    }

    function getPlayerSpaceship(HERO_Y,canvas) {
        var mouseMove = Rx.Observable.fromEvent(canvas, 'mousemove');
        var observable = mouseMove
            .map(function (event) {
                return {
                    x: event.clientX,
                    y: HERO_Y
                };
            })
            .startWith({
                x: canvas.width / 2,
                y: HERO_Y
            });
        return observable;
    }

})();




