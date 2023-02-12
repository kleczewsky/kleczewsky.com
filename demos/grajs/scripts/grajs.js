/*
////////////////////////////////////
//  Autor:        Eryk            //
\\                                \\
//  Muzyka:      Hubczak          //
\\                                \\
//  Grafika:      Piciu           //
////////////////////////////////////
*/

const canvas = document.getElementById("grajs"),
    ctx = canvas.getContext("2d"),
    astImg = new Image();

contentDOM = document.getElementsByClassName("content");

canvas.width = contentDOM[0].clientWidth - 220;
canvas.height = contentDOM[0].clientHeight - 100;

const canWidth = canvas.width;
const canHeight = canvas.height;

astImg.src = "./assets/grafika/asteroida64.png";
astNapImg = new Image();
astNapImg.src = "./assets/grafika/asteroidaNap64.png";

alienImg = new Image();
alienImg.src = "./assets/grafika/alien.png";

statekImg = new Image();
statekImg.src = "./assets/grafika/statek.png";

menuMusic = new Audio("./assets/wstp.mp3");
gameMusic = new Audio("./assets/game.mp3");

let grajs = {};

function petlaGry() {
    if (grajs.stanGry) {
        menuMusic.pause();
        if (gameMusic.paused) gameMusic.play();

        render();
        przeksztalcenie();
    } else {
        gameMusic.pause();
        menu();
    }
}

function przeksztalcenie() {
    grajs.poziom.godnosc = Math.random();

    ustawPoziom();
    kontrolaGracza();
    sprawdzKolizjeArray();
    spawnAsteroid();
    filturjTTL();
}

function render() {
    ctx.clearRect(0, 0, canWidth, canHeight);

    ctx.beginPath();
    ctx.fillStyle = "#111111";
    ctx.fillRect(0, 0, canWidth, canHeight);
    ctx.closePath();

    renderUI();
    renderPociskow();
    renderAsteroid();
    renderPowerupow();
    grajs.player.renderGracz();
}

function renderUI() {
    ctx.fillStyle = "#efefef";
    ctx.font = "20px Arial";
    ctx.fillText("TimesHit " + grajs.player.hit, 10, 50);
    ctx.fillText("TimesShot " + grajs.player.timesShot, 10, 75);
    ctx.fillText("Score " + grajs.player.score, 10, 100);

    ctx.fillStyle = "#ee1111";
    ctx.fillRect(canWidth / 2 - canWidth / 2 / 2, 50, canWidth / 2, 25);
    ctx.fillStyle = "#11ee11";
    if (grajs.player.health > 0 && grajs.player.health <= 100) {
        ctx.fillRect(
            canWidth / 2 - canWidth / 2 / 2,
            50,
            (canWidth / 2) * (grajs.player.health / 100),
            25
        );
    } else if (grajs.player.health > 100 && grajs.player.health <= 200) {
        ctx.fillRect(
            canWidth / 2 - canWidth / 2 / 2,
            50,
            (canWidth / 2) * 1,
            25
        );
        ctx.fillStyle = "#fcba03";
        ctx.fillRect(
            canWidth / 2 - canWidth / 2 / 2,
            50,
            (canWidth / 2) * ((grajs.player.health - 100) / 100),
            25
        );
    } else if (grajs.player.health > 200) {
        ctx.fillStyle = "#fcba03";
        ctx.fillRect(
            canWidth / 2 - canWidth / 2 / 2,
            50,
            (canWidth / 2) * 1,
            25
        );
    } else if (grajs.player.health <= 0) {
        grajs.stanGry = 0;
        grajs.player.health = 100;
        reset();
    }
}

function menu() {
    ctx.clearRect(0, 0, canWidth, canHeight);

    ctx.beginPath();
    ctx.fillStyle = "#111111";
    ctx.fillRect(0, 0, canWidth, canHeight);
    ctx.closePath();

    ctx.fillStyle = "#223488";

    ctx.fillRect(100, 200, 400, 50);

    ctx.fillStyle = "#229911";
    ctx.font = "45px Arial";

    ctx.fillText("Hello Player ", 300, 100);

    ctx.fillText("Start ", 150, 240);
}

// KLASA GRACZA
class Gracz {
    constructor(name) {
        this.name = name;
        this.x = canWidth / 2;
        this.y = canHeight / 2;
        this.r = 10;

        this.pedx = 0;
        this.pedy = 0;

        this.health = 100;
        this.rot = 0;
        this.timesShot = 0;
        this.hit = 0;
        this.score = 0;
    }
    renderGracz() {
        ctx.save();
        ctx.translate(this.x, this.y);
        ctx.rotate((this.rot * Math.PI) / 180);
        ctx.beginPath();

        ctx.drawImage(statekImg, 0, 0, 64, 64, -40, -40, 80, 80);
        //  ctx.arc(0, 0, this.r, 0, 2 * Math.PI);
        //  ctx.fillStyle = getRandomColor();
        //   ctx.fill();
        // let relx = 0,
        //     rely = 0;
        // ctx.moveTo(relx, rely - 25);
        // ctx.lineTo(relx - 10, rely + 12.5);
        // ctx.lineTo(relx + 10, rely + 12.5);
        // ctx.fillStyle = "#444412";

        // ctx.fill();
        ctx.restore();
    }

    stworzTarcza() {
        for (let i = 0; i < 36; i++) {
            grajs.pociski.push(
                new Pocisk(grajs.player.x, grajs.player.y, i * 10, 400, 10)
            );
        }
    }
}

// KLASA POCISK
class Pocisk {
    constructor(x, y, rot, timetolive = 50, predkosc = 20) {
        this.timetolive = timetolive;
        this.x = x;
        this.y = y;
        this.r = 5;
        this.rot = rot;

        this.predkosc = predkosc;
    }
    renderPocisk() {
        ctx.save();
        ctx.translate(this.x, this.y);
        ctx.rotate((this.rot * Math.PI) / 180);
        ctx.beginPath();
        let relx = 0,
            rely = 0;
        ctx.arc(relx, rely, this.r, 0, 2 * Math.PI);

        ctx.fillStyle = "#768822";
        ctx.fill();

        ctx.restore();
    }
}
// FUNKCJA RENDERUJACA WSZYSTKIE POCISKI W TABLICY
function renderPociskow() {
    let TTLDel = 0;

    grajs.pociski.forEach(function (pocisk) {
        pocisk.timetolive -= 1;
        if (pocisk.timetolive < 0) {
        } else {
            // PRZESUNIECIE W KIERUNKU ZGODNIE Z PREDKOSCIA
            pocisk.x +=
                pocisk.predkosc * Math.sin((pocisk.rot * Math.PI) / 180);
            pocisk.y -=
                pocisk.predkosc * Math.cos((pocisk.rot * Math.PI) / 180);
            pocisk.renderPocisk();
        }
    });
}

function spawnAsteroid() {
    let randomnum = Math.random();
    let randomoff = Math.random() * grajs.poziom.astRozstrzal;

    if (randomnum > 0.39 && randomnum < 0.4) {
        if (randomnum < 0.3915) {
            grajs.asteroidy.push(
                new Asteroida(
                    canWidth + 100,
                    canHeight / 2 - grajs.poziom.astRozstrzal / 2 + randomoff,
                    1,
                    0,
                    1000
                )
            ); // ASTEROIDA TYP = 1
        } else {
            grajs.asteroidy.push(
                new Asteroida(
                    canWidth + 100,
                    canHeight / 2 - grajs.poziom.astRozstrzal / 2 + randomoff
                )
            ); // ASTEROIDA TYP = 0
        } // PRAWO
    }
    if (randomnum > 0.12 && randomnum < 0.13) {
        if (randomnum < 0.1215) {
            grajs.asteroidy.push(
                new Asteroida(
                    -100,
                    canHeight / 2 - grajs.poziom.astRozstrzal / 2 + randomoff,
                    1,
                    0,
                    1000
                )
            ); // ASTEROIDA TYP = 1
        } else {
            grajs.asteroidy.push(
                new Asteroida(
                    -100,
                    canHeight / 2 - grajs.poziom.astRozstrzal / 2 + randomoff
                )
            ); // ASTEROIDA TYP = 0
        } // LEWO
    }
    if (randomnum > 0.77 && randomnum < 0.78) {
        if (randomnum < 0.7715) {
            grajs.asteroidy.push(
                new Asteroida(
                    canWidth / 2 - grajs.poziom.astRozstrzal / 2 + randomoff,
                    -100,
                    1,
                    0,
                    1000
                )
            ); // ASTEROIDA TYP = 1
        } else {
            grajs.asteroidy.push(
                new Asteroida(
                    canWidth / 2 - grajs.poziom.astRozstrzal / 2 + randomoff,
                    -100
                )
            ); // ASTEROIDA TYP = 0
        } // GORA
    }
    if (randomnum > 0.98 && randomnum < 0.99) {
        if (randomnum < 0.9815) {
            grajs.asteroidy.push(
                new Asteroida(
                    canWidth / 2 - grajs.poziom.astRozstrzal / 2 + randomoff,
                    canHeight + 100,
                    1,
                    0,
                    1000
                )
            ); // ASTEROIDA TYP = 1
        } else {
            grajs.asteroidy.push(
                new Asteroida(
                    canWidth / 2 - grajs.poziom.astRozstrzal / 2 + randomoff,
                    canHeight + 100
                )
            );
        } // DOL   // ASTEROIDA TYP = 0
    }
    if (randomnum > 0.5 && randomnum < 0.501) {
        grajs.powerupy.push(
            new Powerup(grajs.poziom.godnosc * canWidth, randomoff * 2)
        ); // POWERUP
    }
}

// KLASA ASTEROIDA
class Asteroida {
    constructor(x, y, typ = 0, podanyVect = 0, ttl = 250) {
        this.timetolive = ttl;
        this.x = x;
        this.y = y;
        this.r = 10;
        this.vect = [grajs.player.x - x, grajs.player.y - y];
        this.podanyVect = podanyVect;
        this.magnit = 0;

        this.typ = typ;
        if (this.podanyVect) {
            this.vect = this.podanyVect;
        }
    }
    renderAsteroida() {
        ctx.save();
        ctx.translate(this.x, this.y);
        ctx.rotate((this.rot * Math.PI) / 180);
        ctx.beginPath();

        this.typ
            ? ctx.drawImage(alienImg, 0, 0, 64, 64, -30, -30, 60, 60)
            : ctx.drawImage(astImg, 0, 0, 64, 64, -16, -16, 32, 32);
        //  ctx.fillText("TTL " + this.timetolive, 10, 10);
        // ctx.fillText("vextX "+this.vect[0], 25, 25);

        //KOLO
        //ctx.arc(relx, rely, this.r, 0, 2 * Math.PI);
        //ctx.fillStyle = "#126677";
        //ctx.fill();

        ctx.restore();
    }

    obliczWektordogracza() {
        this.vect = [grajs.player.x - this.x, grajs.player.y - this.y];
        // DLUGOSC WEKTORA
        this.magnit = Math.sqrt(
            this.vect[0] * this.vect[0] + this.vect[1] * this.vect[1]
        );
    }
    obliczDlugoscWektoradogracza() {
        this.magnit = Math.sqrt(
            this.vect[0] * this.vect[0] + this.vect[1] * this.vect[1]
        );
    }
}

// RENDER ASTEROIDY WRAZ Z KOLIZJA Z GRACZEM
function renderAsteroid() {
    let TTLDel = 0;

    grajs.asteroidy.forEach(function (pocisk) {
        if (pocisk.typ == 1) {
            pocisk.obliczWektordogracza();
            pocisk.vect[0] = pocisk.vect[0] / pocisk.magnit; // WEKTOR JEDNOSTKOWY
            pocisk.vect[1] = pocisk.vect[1] / pocisk.magnit;

            if (pocisk.magnit >= 230) {
                pocisk.x += pocisk.vect[0] * 3;
                pocisk.y += pocisk.vect[1] * 3;
            } else if (pocisk.magnit < 190) {
                pocisk.x += pocisk.vect[0] * -3;
                pocisk.y += pocisk.vect[1] * -3;
            } else {
                if (Math.random() < 0.03) {
                    pocisk.obliczWektordogracza();
                    pocisk.vect[0] = pocisk.vect[0] * 1.5;
                    pocisk.vect[1] = pocisk.vect[1] * 1.5;
                    grajs.asteroidy.push(
                        new Asteroida(pocisk.x, pocisk.y, 0, pocisk.vect)
                    );
                }
            }
        } else if (pocisk.typ == 0) {
            pocisk.x += pocisk.vect[0] * 0.01;
            pocisk.y += pocisk.vect[1] * 0.01;
        }

        pocisk.timetolive -= 1;

        if (pocisk.timetolive < 0) {
            TTLDel = 1;
        } else {
            pocisk.renderAsteroida();
        }
        if (sprawdzKolizjeOkrag(pocisk, grajs.player)) {
            pocisk.x = 7000;
            TTLDel = 1;
            grajs.player.hit += 1;
            grajs.player.health -= 5;
            playSound("hit");
        }
    });
}

class Powerup {
    constructor(x, y) {
        this.timetolive = 800;
        this.x = x;
        this.y = y;
        this.r = 10;
    }
    renderPowerup() {
        ctx.save();
        ctx.translate(this.x, this.y);
        ctx.rotate((this.rot * Math.PI) / 180);
        ctx.beginPath();
        let relx = 0,
            rely = 0;

        //ctx.fillText("timetolive "+this.timetolive, 10, 10);

        //KOLO
        ctx.arc(relx, rely, this.r, 0, 2 * Math.PI);
        ctx.fillStyle = getRandomColor();
        ctx.fill();

        ctx.restore();
    }
}

function renderPowerupow() {
    let TTLDel = 0;

    grajs.powerupy.forEach(function (powerup) {
        powerup.timetolive -= 1;

        if (powerup.timetolive < 0) {
            TTLDel = 1;
        } else {
            powerup.renderPowerup();
        }
        if (sprawdzKolizjeOkrag(powerup, grajs.player)) {
            powerup.x = 7000;
            TTLDel = 1;

            grajs.player.health += 10;
            grajs.player.stworzTarcza();
            playSound("powerup");
        }
    });
}

// OBSLUGA PRZYCISKOW & RUCH GRACZA
function kontrolaGracza() {
    // NAPEDZANIE
    if (grajs.player.napedzap && grajs.player.pedy > -5) {
        grajs.player.pedy -= 0.3;
    }
    if (grajs.player.napedzat && grajs.player.pedy < 5) {
        grajs.player.pedy += 0.3;
    }
    if (grajs.player.skrecap && grajs.player.pedx < 5) {
        grajs.player.pedx += 0.3;

        //grajs.player.x += 2 * Math.sin((grajs.player.rot + 90) * (Math.PI/180)   );
        //grajs.player.y -= 2 * Math.cos((grajs.player.rot + 90) * (Math.PI/180)  );
    }
    if (grajs.player.skrecal && grajs.player.pedx > -5) {
        grajs.player.pedx -= 0.3;

        //grajs.player.x += 2 * Math.sin((grajs.player.rot - 90) * (Math.PI/180)  );
        //grajs.player.y -= 2 * Math.cos((grajs.player.rot - 90) * (Math.PI/180)  );
    }

    // OBROT W KIERUNKU MYSZKI
    grajs.vektordomyszki = [
        grajs.mousex - grajs.player.x,
        grajs.mousey - grajs.player.y,
    ];
    let katdomyszki =
        (Math.atan2(grajs.vektordomyszki[1], grajs.vektordomyszki[0]) * 180) /
        Math.PI;
    if (!isNaN(katdomyszki)) grajs.player.rot = katdomyszki + 90;

    // PRZESUNIECIE W KIERUNKU ZGODNIE Z PREDKOSCIA

    //grajs.player.x += grajs.player.pedx * Math.sin(grajs.player.rot * Math.PI/180)
    // grajs.player.y -= grajs.player.pedx * Math.cos(grajs.player.rot * Math.PI/180)

    grajs.player.x += grajs.player.pedx;
    grajs.player.y += grajs.player.pedy;

    // SPRAWDZENIE CZY GRACZ JEST W POLU
    poleRozgrywki(grajs.player);

    // WYHAMOWANIE
    if (grajs.player.pedy < 0 && !grajs.player.napedzap) {
        grajs.player.pedy += 0.3;
    }
    if (grajs.player.pedy > 0 && !grajs.player.napedzat) {
        grajs.player.pedy -= 0.3;
    }
    if (grajs.player.pedx < 0 && !grajs.player.skrecal) {
        grajs.player.pedx += 0.3;
    }
    if (grajs.player.pedx > 0 && !grajs.player.skrecap) {
        grajs.player.pedx -= 0.3;
    }

    // STOP
    if (
        grajs.player.pedx < 0.5 &&
        grajs.player.pedx > -0.5 &&
        !grajs.player.napedzap &&
        !grajs.player.napedzat &&
        grajs.player.pedy < 0.5 &&
        grajs.player.pedy > -0.5 &&
        !grajs.player.skrecap &&
        !grajs.player.skrecal
    ) {
        grajs.player.pedx = 0;
        grajs.player.pedy = 0;
    }
}
// OBSLUGA POLA ROZGRYWKI
function poleRozgrywki(obiekt) {
    // PRAWA SCIANA
    if (obiekt.x >= canWidth + 10) obiekt.x = -5;
    // LEWA SCIANA
    if (obiekt.x <= -10) obiekt.x = canWidth + 5;
    // GORA
    if (obiekt.y >= canHeight + 10) obiekt.y = -5;
    // DOL
    if (obiekt.y <= -10) obiekt.y = canHeight + 5;
}

//FUNKCJA DLA SPRAWDZENIA KOLEZJI MIEDZY DWOMA OKREGAMI
function sprawdzKolizjeOkrag(OkragA, OkragB) {
    let vektorobiektow = [OkragA.x - OkragB.x, OkragA.y - OkragB.y];
    let wielkoscvectora = Math.sqrt(
        vektorobiektow[0] * vektorobiektow[0] +
            vektorobiektow[1] * vektorobiektow[1]
    );
    if (wielkoscvectora < OkragA.r + OkragB.r) {
        return true;
    }
}
// FUNKCJA SPRAWDZAJACA DWIE TABLICE POCISK I ASTEROIDA
function sprawdzKolizjeArray() {
    grajs.pociski.forEach(function (pocisk) {
        grajs.asteroidy.forEach(function (asteroida) {
            if (sprawdzKolizjeOkrag(pocisk, asteroida)) {
                if (pocisk.timetolive > 0 && asteroida.timetolive > 0) {
                    pocisk.timetolive = -1;
                    asteroida.timetolive = -1;

                    asteroida.x = 7000;
                    grajs.player.score += 100;
                    pocisk.x = -5000;
                    pocisk.predkosc = 0;
                }
            }
        });
    });
}

// FUNCKJA FILTRUJACA OBIEKTY KTORYCH TTL JEST PONIZEJ 0
function filturjTTL() {
    grajs.pociski = grajs.pociski.filter(function (obj, indx, arr) {
        if (obj.timetolive > 0) return true;
    });
    grajs.asteroidy = grajs.asteroidy.filter(function (obj, indx, arr) {
        if (obj.timetolive > 0) return true;
    });
    grajs.powerupy = grajs.powerupy.filter(function (obj, indx, arr) {
        if (obj.timetolive > 0) return true;
    });
}

function getRandomColor() {
    let znaki = "0123456789abcdef";
    let kolor = "#";
    for (let i = 0; i < 6; i++) {
        kolor += znaki[Math.floor(Math.random() * 16)];
    }
    return kolor;
}

// EVENTY PRZYCISKOW
function wcisniecie(przycisk) {
    if (przycisk.keyCode == 39)
        // strzalka w prawo
        grajs.player.skrecap = true;

    if (przycisk.keyCode == 37)
        //strzalka w lewo
        grajs.player.skrecal = true;

    if (przycisk.keyCode == 38)
        // gora
        grajs.player.napedzap = true;

    if (przycisk.keyCode == 40) {
        // dol
        grajs.player.napedzat = true;
    }

    if (przycisk.keyCode == 32) {
        // spacja

        grajs.pociski.push(
            new Pocisk(grajs.player.x, grajs.player.y, grajs.player.rot)
        );
        grajs.player.timesShot += 1;
    }

    if (przycisk.keyCode == 68) {
        // d

        grajs.powerupy.push(new Powerup(grajs.mousex, grajs.mousey));
    }
    if (przycisk.keyCode == 70) {
        // f

        grajs.player.stworzTarcza();
    }

    przycisk.preventDefault();
}
function odpuszczenie(przycisk) {
    switch (przycisk.keyCode) {
        case 39: // strzalka w prawo
            grajs.player.skrecap = false;
            break;
        case 37: //strzalka w lewo
            grajs.player.skrecal = false;
            break;
        case 38: // gora
            grajs.player.napedzap = false;
            break;
        case 40: // dol
            grajs.player.napedzat = false;
            break;
    }
}

function updateMouseObj(e) {
    let mouseobj = getCanvasMousePos(canvas, e);
    grajs.mousex = mouseobj.x;
    grajs.mousey = mouseobj.y;

    let promise;
    if (!menuMusic.ended && grajs.stanGry == 0) {
        promise = menuMusic.play();
    }
    if (promise !== undefined) {
        promise.then(() => {}).catch(() => {});
    }
}

function getCanvasMousePos(canvas, evt) {
    var rect = canvas.getBoundingClientRect();
    return {
        x:
            ((evt.clientX - rect.left) / (rect.right - rect.left)) *
            canvas.width,
        y:
            ((evt.clientY - rect.top) / (rect.bottom - rect.top)) *
            canvas.height,
    };
}

document.addEventListener("keydown", wcisniecie);
document.addEventListener("keyup", odpuszczenie);
document.addEventListener("mousemove", updateMouseObj, false);

canvas.addEventListener(
    "click",
    () => {
        grajs.pociski.push(
            new Pocisk(grajs.player.x, grajs.player.y, grajs.player.rot)
        );
        grajs.player.timesShot += 1;
        grajs.pociski.push(
            new Pocisk(grajs.player.x, grajs.player.y, grajs.player.rot + 5)
        );
        grajs.player.timesShot += 1;
        grajs.pociski.push(
            new Pocisk(grajs.player.x, grajs.player.y, grajs.player.rot - 5)
        );
        grajs.player.timesShot += 1;

        if (grajs.poziom.godnosc < 0.3) {
            playSound("strzal1");
        } else if (grajs.poziom.godnosc > 0.6) {
            playSound("strzal2");
        } else {
            playSound("strzal3");
        }
        grajs.stanGry = 1;
    },
    false
);

// RESET
function reset() {
    grajs.pociski = [];
    grajs.asteroidy = [];
    grajs.powerupy = [];
}

//POZIOM
function ustawPoziom() {
    grajs.poziom.astRozstrzal = 300;
}

// INIT
function init() {
    grajs.player = new Gracz("Player");
    grajs.pociski = [];
    grajs.asteroidy = [];
    grajs.powerupy = [];
    grajs.vektordomyszki = 0;
    grajs.poziom = {};
    grajs.stanGry = 0;

    menuMusic.loop = "true";
    menuMusic.volume = 0.09;
    gameMusic.loop = "true";
    gameMusic.volume = 0.09;

    setInterval(() => {
        petlaGry();
    }, 1000 / 60);
}

let isMobile = /iPhone|iPad|iPod|Android/i.test(navigator.userAgent);
if (isMobile) {
    window.location.href = "./gra-mobile.html";
} else {
    init();
}
