var canvas = document.getElementById("Giera"),
    ctx = canvas.getContext("2d"),
    canwidth = canvas.width,
    canheight = canvas.height,
    pong = {};
pong.ogon = 1;
var beep1 = new Audio("beep1.mp3");
var beepbad = new Audio("beepbad.mp3");
// ----------------------------

//FUNKCJA RENDERUJACA
function render() {
    // Tło
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.beginPath();
    ctx.fillStyle = "#141414";
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    // Siatka
    ctx.lineWidth = 10;
    ctx.setLineDash([10, 10]);
    ctx.strokeStyle = "#fff";
    ctx.moveTo(canvas.width / 2, 0);
    ctx.lineTo(canvas.width / 2, canvas.height);
    ctx.stroke();

    // Napisy
    ctx.fillStyle = "#884488aa";
    ctx.font = "200px Arial";
    ctx.textAlign = "center";
    ctx.fillText(pong.graczl.punkty, 150, canvas.height / 2);
    ctx.fillText(pong.graczp.punkty, canvas.width - 150, canvas.height / 2);
    ctx.closePath();
    // Cień
    ctx.shadowColor = "cyan";
    ctx.shadowBlur = 10;
    // Obiekty
    pong.paletkal.maluj();
    pong.paletkap.maluj();
    ctx.shadowBlur = 0;
    pong.kula.maluj();
}

// KONSTRUKTOR PALETKI
function paletka(x) {
    this.szer = 10;
    this.wys = 50;
    this.x = x;
    this.y = canvas.height / 2 - this.wys / 2;
    this.maluj = function () {
        this.kolor = "#cccccc"; //+ Math.floor(Math.random() * 109) + Math.floor(Math.random() * 109);
        ctx.beginPath;
        ctx.fillStyle = this.kolor;
        ctx.fillRect(this.x, this.y, this.szer, this.wys);
        ctx.closePath;
    };
}

class Gracz {
    constructor() {
        this.kolorpaletki;
        this.predkosc;
        this.punkty = 0;
        this.ruszawgore;
        this.ruszawdol;
    }
}

// FUNKCJA ODPOWADAJACA ZA PALETKE KOMPUTER
function ai() {
    //pong.paletkap.y = pong.kula.y -pong.paletkap.wys/2;

    this.roznica = pong.kula.y - pong.paletkap.y - pong.paletkap.wys / 2;

    if (roznica > 2) {
        // Ruch paletki w dol
        pong.paletkap.y += 1;
        pong.graczp.ruszawdol = true;
    }
    if (roznica < -2) {
        // Ruch paletki w gore
        pong.paletkap.y -= 1;
        pong.graczp.ruszawgore = true;
    } else {
        pong.paletkap.y += 0;
    }

    //pong.paletkal.y = pong.kula.y -pong.paletkap.wys/2;
}

// KONSTRUKTOR PILKI
function pilka(promien, xoffst, yoffst) {
    (this.x = canvas.width / 2), (this.y = canvas.height / 2);
    this.xoffst = xoffst;
    this.yoffst = yoffst;
    this.promien = promien;
    this.trailx = [];
    this.traily = [];
    this.maluj = function () {
        {
            if (pong.ogon <= 51) pong.ogon++;
            else pong.ogon = 0;
            if (pong.ogon == 48) console.log("ogon");

            this.trailx[pong.ogon] = this.x - this.xoffst;
            this.traily[pong.ogon] = this.y - this.yoffst;
            for (this.j = 0; this.j <= 52; this.j++) {
                ctx.beginPath();
                ctx.arc(
                    this.trailx[this.j],
                    this.traily[this.j],
                    this.promien / 3,
                    0,
                    Math.PI * 2
                );
                ctx.fillStyle = "#dd6611";
                ctx.fill();
                ctx.closePath();
            }
        }
        ctx.beginPath();
        this.x += this.xoffst;
        this.y += this.yoffst;
        ctx.arc(this.x, this.y, this.promien, 0, Math.PI * 2);
        ctx.fillStyle = "#dd3311";
        ctx.fill();
        ctx.closePath();
    };
}

// FUNKCJA INICJUJACA
function init() {
    canvas.width = canwidth;
    canvas.height = canheight;

    pong.paletkal = new paletka(25);
    pong.paletkap = new paletka(canvas.width - 35); //szerokosc plotna - 25px -10px szerpaletki
    pong.kula = new pilka(10, -3, 0); // promien, xoffst, yoffst
    pong.graczp = new Gracz();
    pong.graczl = new Gracz();
    pong.petlarender = setInterval(petlarysowania, 1000 / 120);
}

// GLOWNA PETLA RYSOWANIA
function petlarysowania() {
    render();
    przeksztalc();
}

// PETLA PRZEKSZTALCEN GRY
function przeksztalc() {
    // Odbicie góra = dół
    if (
        pong.kula.y - pong.kula.promien <= 0 ||
        pong.kula.y + pong.kula.promien >= canvas.height
    ) {
        pong.kula.yoffst *= -1;
    }

    // Odbicie paletkal lewo
    if (
        pong.kula.x - pong.kula.promien <=
        pong.paletkal.x + pong.paletkal.szer
    ) {
        if (
            pong.kula.y - pong.kula.promien <=
                pong.paletkal.y + pong.paletkal.wys &&
            pong.kula.y + pong.kula.promien >= pong.paletkal.y
        ) {
            odbicie();
        }
    }
    // odbicie plaetkap prawo
    if (pong.kula.x >= pong.paletkap.x - pong.paletkap.szer) {
        if (
            pong.kula.y - pong.kula.promien <=
                pong.paletkap.y + pong.paletkap.wys &&
            pong.kula.y + pong.kula.promien >= pong.paletkap.y
        ) {
            odbicie();
        }
    }

    // Odbicie lewo prawo
    if (pong.kula.x + pong.kula.promien >= canvas.width - 20) {
        punkt("l");
    }
    if (pong.kula.x - pong.kula.promien <= 20) {
        punkt("p");
    }

    //poruszanie paletkami
    if (pong.graczl.ruszawgore && pong.paletkal.y >= 0) {
        pong.paletkal.y -= 3;
    }
    if (
        pong.graczl.ruszawdol &&
        pong.paletkal.y + pong.paletkal.wys < canvas.height
    ) {
        pong.paletkal.y += 3;
    }
    pong.graczp.ruszawgore = false;
    pong.graczp.ruszawdol = false;
    ai();
}

// FUNKCJA ZYSKANIA PUNKTU PRZEZ STRACONA PILKE
function punkt(strona) {
    if (strona == "l") {
        pong.graczl.punkty += 1;
        pong.kula.xoffst = 2;
    } else {
        pong.kula.xoffst = -2;
        pong.graczp.punkty += 1;
    }
    pong.kula.x = canvas.width / 2;
    pong.kula.y = canvas.height / 2;
    pong.kula.yoffst = 0;
    pong.paletkal.y = canvas.height / 2 - pong.paletkal.wys / 2;
    pong.paletkap.y = canvas.height / 2 - pong.paletkal.wys / 2;
    // Odpowiada za ogon pilki
    pong.kula.trailx = [];
    pong.kula.traily = [];
    pong.kula.j = 0;
    beepbad.play();
}

// FUNKCJA ODBICIA OD PALETKI
function odbicie() {
    pong.kula.xoffst *= -1;
    //odsuniecie piłki od paletki po odbiciu
    if (pong.kula.x < canvas.width / 2) pong.kula.x += 5;
    else pong.kula.x -= 5;
    //"podrkecenie" pilki
    if (pong.kula.x < canvas.width / 2) {
        if (pong.graczl.ruszawgore || pong.graczp.ruszawdol)
            pong.kula.yoffst += 0.5 + Math.random();
        if (pong.graczl.ruszawdol || pong.graczp.ruszawdol)
            pong.kula.yoffst -= 0.5 + Math.random();
    }
    //pseudoprzypadkowe odbicie
    var plusminus = Math.random() > 0.5 ? 1 : -1;
    pong.kula.yoffst += (Math.random() / 5) * plusminus;
    //przyspieszenie pilki do granicy
    if (Math.abs(pong.kula.xoffst) < 3) pong.kula.xoffst *= 1.1;
    //
    if (Math.abs(pong.kula.yoffst) > 4) {
        if (pong.kula.yoffst < 0) pong.kula.yoffst = -3;
        else pong.kula.yoffst = 3;
    }
    beep1.play();
}

// EVENTY PRZYCISKOW
function wcisniecie(przycisk) {
    switch (przycisk.keyCode) {
        case 39: // strzalka w prawo
            pong.paletkal.x += 10;
            break;
        case 37: //strzalka w lewo
            pong.paletkal.x -= 10;
            break;
        case 38: // gora
            pong.graczl.ruszawgore = true;
            break;
        case 40: // dol
            pong.graczl.ruszawdol = true;
            przycisk.preventDefault();
            break;
    }
}
function odpuszczenie(przycisk) {
    switch (przycisk.keyCode) {
        case 39: // strzalka w prawo
            pong.paletkal.x += 10;
            break;
        case 37: //strzalka w lewo
            pong.paletkal.x -= 10;
            break;
        case 38: // gora
            pong.graczl.ruszawgore = false;
            break;
        case 40: // dol
            pong.graczl.ruszawdol = false;
            break;
    }
}

let isMobile = /iPhone|iPad|iPod|Android/i.test(navigator.userAgent);
if (isMobile) {
    window.location.href = "./gra-mobile.html";
} else {
    init();
}

document.addEventListener("keydown", wcisniecie);
document.addEventListener("keyup", odpuszczenie);
