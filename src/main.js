'use strict';

(function () {
    var SPEED = 40;
    var STAR_NUMBER = 250;
    var SPACE_COLOR = '#000000';
    var STARS_COLOR = '#ffffff';
    var MAX_STAR_SIZE = 3;
    var HERO_Y = 30;
    var HERO_COLOR = '#ff0000';
    var ENEMY_FREQ = 1500;
    var ENEMY_SHOOTING_FREQ = 750;
    var ENEMY_SHOOTING_SPEED = 15;
    var ENEMIES_COLOR = '#00ff00';
    var PLAYER_FIRING_SPEED = 200;
    var HERO_SHOOTING_SPEED = 15;
    var SHOOT_COLOR = '#ffff00';
    var ENEMIES_SHOOT_COLOR = '#FF00BF';
    var SCORE_COLOR = '#ffffff';
    var SCORE_INCREASE = 10;

    init(SPEED, STAR_NUMBER, SPACE_COLOR, STARS_COLOR, MAX_STAR_SIZE, HERO_Y, HERO_COLOR, ENEMY_FREQ, ENEMIES_COLOR, PLAYER_FIRING_SPEED, HERO_SHOOTING_SPEED, SHOOT_COLOR, ENEMY_SHOOTING_FREQ, SCORE_COLOR,SCORE_INCREASE);

    function init(SPEED, STAR_NUMBER, SPACE_COLOR, STARS_COLOR, MAX_STAR_SIZE, HERO_Y, HERO_COLOR, ENEMY_FREQ, ENEMIES_COLOR, PLAYER_FIRING_SPEED, HERO_SHOOTING_SPEED, SHOOT_COLOR, ENEMY_SHOOTING_FREQ, SCORE_COLOR,SCORE_INCREASE) {
        var canvas = document.createElement('canvas');
        var ctx = canvas.getContext("2d");
        attachCanvas(canvas, ctx);
        var StarStream = getStarStream(canvas, ctx, SPEED, STAR_NUMBER, MAX_STAR_SIZE);
        var SpaceShipStream = getPlayerSpaceship(canvas.height - HERO_Y, canvas);
        var EnemiesStream = getEnemiesStream(ENEMY_FREQ, ENEMY_SHOOTING_FREQ, canvas);
        var PlayerFiringStream = getPlayerFiringStream(PLAYER_FIRING_SPEED, canvas);
        var HeroShotsStream = getHeroShots(PlayerFiringStream, SpaceShipStream, canvas.height - HERO_Y);
        var ScoreSubject = new Rx.Subject();
        var score = getScore(ScoreSubject);

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
                return gameOver(actors.spaceship, actors.enemies) === false;
            });
        Game.subscribe(renderScene);

        function renderScene(actors) {
            paintStars(actors.stars, canvas, ctx, SPACE_COLOR, STARS_COLOR);
            paintSpaceShip(ctx, actors.spaceship.x, actors.spaceship.y, HERO_COLOR);
            paintEnemies(actors.enemies, ctx, ENEMIES_COLOR, ENEMIES_SHOOT_COLOR, ENEMY_SHOOTING_SPEED);
            paintHeroShots(actors.heroShots, actors.enemies, ctx, HERO_SHOOTING_SPEED, SHOOT_COLOR, ScoreSubject,SCORE_INCREASE);
            paintScore(ctx, actors.score, SCORE_COLOR);
        }
    }

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

    function paintHeroShots(heroShots, enemies, ctx, HERO_SHOOTING_SPEED, SHOOT_COLOR, ScoreSubject,SCORE_INCREASE) {
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

})();



