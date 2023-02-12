import { setActiveSlide } from "./cards.js";

let isScrolling = false;

// MENU TRANSITION DATA / FUNCTION - BEGIN
const menucontent = document.getElementById("menucontent");

const menubutton = document.getElementById("burger");

const buttonexit = document.getElementById("brg-close");

const innercontent = document.getElementById("innercontent");

const onasButton = document.getElementById("onas-button");
const ofertaButton = document.getElementById("oferta-button");

menubutton.addEventListener("click", function () {
    menucontent.classList.toggle("on");
    buttonexit.classList.toggle("on");
    menubutton.classList.toggle("on");
    innercontent.classList.toggle("on");
});

buttonexit.addEventListener("click", function () {
    menucontent.classList.toggle("on");
    buttonexit.classList.toggle("on");
    menubutton.classList.toggle("on");
    innercontent.classList.toggle("on");
});

ofertaButton.addEventListener("click", () => {
    if (isScrolling) return;
    isScrolling = true;

    setTimeout(() => {
        isScrolling = false;
    }, 1500);

    setActiveSlide(1);
});

onasButton.addEventListener("click", () => {
    if (isScrolling) return;
    isScrolling = true;

    setTimeout(() => {
        isScrolling = false;
    }, 1500);

    setActiveSlide(0);
});
