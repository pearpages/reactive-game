'use strict';

var game = new MyGame({
    SPEED: 40,
    STAR_NUMBER: 250,
    SPACE_COLOR: '#000000',
    STARS_COLOR: '#ffffff',
    MAX_STAR_SIZE: 3,
    HERO_Y: 30,
    HERO_COLOR: '#ff0000',
    ENEMY_FREQ: 1500,
    ENEMY_SHOOTING_FREQ: 750,
    ENEMY_SHOOTING_SPEED: 15,
    ENEMIES_COLOR: '#00ff00',
    PLAYER_FIRING_SPEED: 200,
    HERO_SHOOTING_SPEED: 15,
    SHOOT_COLOR: '#ffff00',
    ENEMIES_SHOOT_COLOR: '#FF00BF',
    SCORE_COLOR: '#ffffff',
    SCORE_INCREASE: 10
},
    MyUtils(Rx) // Rx is loaded Globally in the index.html
).init();

function MyGame(options, myUtils) {

    return {
        init: init
    };

    function init() {
        var SPEED = options.SPEED;
        var STAR_NUMBER = options.STAR_NUMBER;
        var SPACE_COLOR = options.SPACE_COLOR;
        var STARS_COLOR = options.STARS_COLOR;
        var MAX_STAR_SIZE = options.MAX_STAR_SIZE;
        var HERO_Y = options.HERO_Y;
        var HERO_COLOR = options.HERO_COLOR;
        var ENEMY_FREQ = options.ENEMY_FREQ;
        var ENEMY_SHOOTING_FREQ = options.ENEMY_SHOOTING_FREQ;
        var ENEMY_SHOOTING_SPEED = options.ENEMY_SHOOTING_SPEED;
        var ENEMIES_COLOR = options.ENEMIES_COLOR;
        var PLAYER_FIRING_SPEED = options.PLAYER_FIRING_SPEED;
        var HERO_SHOOTING_SPEED = options.HERO_SHOOTING_SPEED;
        var SHOOT_COLOR = options.SHOOT_COLOR;
        var ENEMIES_SHOOT_COLOR = options.ENEMIES_SHOOT_COLOR;
        var SCORE_COLOR = options.SCORE_COLOR;
        var SCORE_INCREASE = options.SCORE_INCREASE;

        var canvas = document.createElement('canvas');
        var ctx = canvas.getContext("2d");
        // attach canvas
        document.body.appendChild(canvas);
        canvas.width = window.innerWidth;
        canvas.height = window.innerHeight;

        var StarStream = myUtils.getStarStream(canvas, ctx, SPEED, STAR_NUMBER, MAX_STAR_SIZE);
        var SpaceShipStream = myUtils.getPlayerSpaceship(canvas.height - HERO_Y, canvas);
        var EnemiesStream = myUtils.getEnemiesStream(ENEMY_FREQ, ENEMY_SHOOTING_FREQ, canvas);
        var PlayerFiringStream = myUtils.getPlayerFiringStream(PLAYER_FIRING_SPEED, canvas);
        var HeroShotsStream = myUtils.getHeroShots(PlayerFiringStream, SpaceShipStream, canvas.height - HERO_Y);
        var ScoreSubject = new Rx.Subject();
        var score = myUtils.getScore(ScoreSubject);

        var Game = Rx.Observable.combineLatest(
            StarStream,
            SpaceShipStream,
            EnemiesStream,
            HeroShotsStream,
            score,
            function (stars, spaceship, enemies, heroShots, score) {
                return {
                    stars: stars,
                    spaceship: spaceship,
                    enemies: enemies,
                    heroShots: heroShots,
                    score: score
                };
            })
            .sample(SPEED)
            .takeWhile(function (actors) {
                return myUtils.gameOver(actors.spaceship, actors.enemies) === false;
            });
        Game.subscribe(renderScene);

        function renderScene(actors) {
            myUtils.paintStars(actors.stars, canvas, ctx, SPACE_COLOR, STARS_COLOR);
            myUtils.paintSpaceShip(ctx, actors.spaceship.x, actors.spaceship.y, HERO_COLOR);
            myUtils.paintEnemies(actors.enemies, ctx, ENEMIES_COLOR, ENEMIES_SHOOT_COLOR, ENEMY_SHOOTING_SPEED);
            myUtils.paintHeroShots(actors.heroShots, actors.enemies, ctx, HERO_SHOOTING_SPEED, SHOOT_COLOR, ScoreSubject, SCORE_INCREASE);
            myUtils.paintScore(ctx, actors.score, SCORE_COLOR);
        }
    }

}

function MyUtils(Rx) {

    return {
        getScore: getScore,
        paintScore: paintScore,
        paintHeroShots: paintHeroShots,
        gameOver: gameOver,
        getHeroShots: getHeroShots,
        collision: collision,
        getPlayerFiringStream: getPlayerFiringStream,
        getEnemiesStream: getEnemiesStream,
        isVisible: isVisible,
        paintEnemies: paintEnemies,
        getRandomInt: getRandomInt,
        getStarStream: getStarStream,
        paintStars: paintStars,
        paintSpaceShip: paintSpaceShip,
        drawTriangle: drawTriangle,
        getPlayerSpaceship: getPlayerSpaceship
    };

    function getScore(ScoreSubject) {
        return ScoreSubject.scan(function (prev, cur) {
            return prev + cur;
        }, 0).startWith(0);
    }

    function paintScore(ctx, score, SCORE_COLOR) {
        ctx.fillStyle = SCORE_COLOR;
        ctx.font = 'bold 26px sans-serif';
        ctx.fillText('Score: ' + score, 40, 43);
    }

    function paintHeroShots(heroShots, enemies, ctx, HERO_SHOOTING_SPEED, SHOOT_COLOR, ScoreSubject, SCORE_INCREASE) {
        heroShots.forEach(function (shot, i) {
            for (var l = 0; l < enemies.length; l++) {
                var enemy = enemies[l];
                if (!enemy.isDead && collision(shot, enemy)) {
                    ScoreSubject.onNext(SCORE_INCREASE)
                    enemy.isDead = true;
                    shot.x = shot.y = -100;
                    break;
                }
            }
            shot.y -= HERO_SHOOTING_SPEED;
            drawTriangle(ctx, shot.x, shot.y, 5, SHOOT_COLOR, 'up');
        });
    }

    function gameOver(ship, enemies) {
        return enemies.some(function (enemy) {
            if (collision(ship, enemy)) {
                return true;
            }

            return enemy.shots.some(function (shot) {
                return collision(ship, shot);
            });
        });
    }

    function getHeroShots(PlayerFiringStream, SpaceShipStream, HERO_Y) {
        return Rx.Observable.combineLatest(
            PlayerFiringStream,
            SpaceShipStream,
            function (shotEvents, spaceShip) {
                return {
                    timestamp: shotEvents.timestamp,
                    x: spaceShip.x
                };
            })
            .distinctUntilChanged(function (shot) { return shot.timestamp; })
            .scan(function (shotArray, shot) {
                shotArray.push({ x: shot.x, y: HERO_Y });
                return shotArray;
            }, []);
    }

    function collision(target1, target2) {
        return (target1.x > target2.x - 20 && target1.x < target2.x + 20) &&
            (target1.y > target2.y - 20 && target1.y < target2.y + 20);
    }

    function getPlayerFiringStream(PLAYER_FIRING_SPEED, canvas) {
        return Rx.Observable.fromEvent(canvas, 'click')
            .sample(PLAYER_FIRING_SPEED)
            .timestamp()
            .startWith({ timestamp: null });
    }

    function getEnemiesStream(ENEMY_FREQ, ENEMY_SHOOTING_FREQ, canvas) {
        return Rx.Observable.interval(ENEMY_FREQ)
            .scan(function (enemyArray) {
                var enemy = {
                    x: parseInt(Math.random() * canvas.width),
                    y: -30,
                    shots: [],
                    canvas: canvas
                };

                Rx.Observable.interval(ENEMY_SHOOTING_FREQ)
                    .subscribe(function () {
                        if (!enemy.isDead) {
                            enemy.shots.push({ x: enemy.x, y: enemy.y, canvas: canvas });
                        }
                        enemy.shots = enemy.shots.filter(isVisible);
                    });

                enemyArray.push(enemy);
                return enemyArray
                    .filter(isVisible)
                    .filter(function (enemy) {
                        return !(enemy.isDead && enemy.shots.length === 0);
                    })
            }, []);
    }

    function isVisible(obj) {
        return obj.x > -40 && obj.x < obj.canvas.width + 40 &&
            obj.y > -40 && obj.y < obj.canvas.height + 40;
    }

    function paintEnemies(enemies, ctx, ENEMIES_COLOR, ENEMIES_SHOOT_COLOR, ENEMY_SHOOTING_SPEED) {
        enemies.forEach(function (enemy) {
            enemy.y += 5;
            enemy.x += getRandomInt(-15, 15);

            if (!enemy.isDead) {
                drawTriangle(ctx, enemy.x, enemy.y, 20, ENEMIES_COLOR, 'down');
            }

            enemy.shots.forEach(function (shot) {
                shot.y += ENEMY_SHOOTING_SPEED;
                drawTriangle(ctx, shot.x, shot.y, 5, ENEMIES_SHOOT_COLOR, 'down');
            });
        });
    }

    function getRandomInt(min, max) {
        return Math.floor(Math.random() * (max - min + 1)) + min;
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

    function paintSpaceShip(ctx, x, y, HERO_COLOR) {
        drawTriangle(ctx, x, y, 20, HERO_COLOR, 'up');
    }

    function drawTriangle(ctx, x, y, width, color, direction) {
        ctx.fillStyle = color;
        ctx.beginPath();
        ctx.moveTo(x - width, y);
        ctx.lineTo(x, direction === 'up' ? y - width : y + width); ctx.lineTo(x + width, y);
        ctx.lineTo(x - width, y);
        ctx.fill();
    }

    function getPlayerSpaceship(HERO_Y, canvas) {
        var mouseMove = Rx.Observable.fromEvent(canvas, 'mousemove')
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
        return mouseMove;
    }
}




