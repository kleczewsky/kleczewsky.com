import { selectNextPlanet } from "./index.js";

let selectedCard = 0;
let shownCard = 0;
let lastShownCard, animPlaying;
let isScrolling = false;
let isOnContact = false;
let wantedCard = 0;

const cards = document.getElementsByClassName("card");
const dots = document.getElementsByClassName("slider-dot");
const contact = document.getElementById("contact-anchor");
const landing = document.getElementById("landing-anchor");

// animating and displaying selected card uses global ""selectedCard" todo: change it so it takes it from arguments
function setShownCard() {
    if (animPlaying) {
        selectedCard = shownCard;
        return;
    }

    if (selectedCard > shownCard) {
        animPlaying = true;
        lastShownCard = shownCard;
        // forward anim
        cards[selectedCard].style.display = "block";
        cards[selectedCard].classList.add("fromleft");
        cards[shownCard].classList.add("toright");

        setTimeout(() => {
            cards[lastShownCard].style.display = "none";
            cards[lastShownCard].classList.remove("toright");
            cards[selectedCard].classList.remove("fromleft");
            animPlaying = false;
        }, 1300);
    } else if (selectedCard < shownCard) {
        animPlaying = true;
        lastShownCard = shownCard;
        // backward anim
        cards[shownCard].classList.add("toleft");
        cards[selectedCard].style.display = "block";
        cards[selectedCard].classList.add("fromright");

        setTimeout(() => {
            cards[lastShownCard].style.display = "none";
            cards[lastShownCard].classList.remove("toleft");
            cards[selectedCard].classList.remove("fromright");
            animPlaying = false;
        }, 1300);
    }
    shownCard = selectedCard;
}

// switch wanted card based on scroll up or down, additionally show contact info, cards between 0-3
function setWantedCardOnScroll(e) {
    if (isScrolling) return;
    isScrolling = true;

    setTimeout(() => {
        isScrolling = false;
    }, 1500);

    if (window.scrollY) {
        window.scrollTo(0, contact.offsetTop);
        isOnContact = true;
    }

    //Scroll to contact info
    if (e.deltaY > 0 && wantedCard == 3 && !isOnContact) {
        window.scrollTo(0, contact.offsetTop);
        isOnContact = true;
    }
    //Scroll back
    if (isOnContact && e.deltaY < 0) {
        window.scrollTo(0, landing.offsetTop);
        isOnContact = false;
        return;
    }

    //Switch Cards
    if (e.deltaY > 0 && wantedCard < 3) {
        wantedCard++;
    } else if (e.deltaY < 0 && wantedCard > 0) {
        wantedCard--;
    }

    selectedCard = wantedCard;

    setActiveSlide(selectedCard);
}

function setWantedCardOnArrows(e) {
    if (isScrolling) return;
    isScrolling = true;

    setTimeout(() => {
        isScrolling = false;
    }, 1500);

    if (e.code == "ArrowRight" && wantedCard < 3) {
        wantedCard++;

        preventArrows(e);
    } else if (e.code == "ArrowLeft" && wantedCard > 0) {
        wantedCard--;

        preventArrows(e);
    } else if (e.code == "ArrowUp" && wantedCard < 3) {
        wantedCard++;

        preventArrows(e);
    } else if (e.code == "ArrowDown" && wantedCard > 0) {
        wantedCard--;

        preventArrows(e);
    }

    function preventArrows(e) {
        e.preventDefault();
    }

    selectedCard = wantedCard;

    setActiveSlide(selectedCard);
}

// runs functions that display right planet, card and dot
export function setActiveSlide(num) {
    // set shown planet in three js
    switch (num) {
        case 0:
            selectNextPlanet(0);
            selectedCard = 0;
            break;
        case 1:
            selectNextPlanet(1);
            selectedCard = 1;
            break;
        case 2:
            selectNextPlanet(1);
            selectedCard = 2;
            break;
        case 3:
            selectNextPlanet(2);
            selectedCard = 3;
            break;
    }

    // Set Active Dot
    setActiveSliderDot(num);
    //Set card that is shown
    setShownCard();
}

function setActiveSliderDot(num) {
    [...dots].forEach((dot) => {
        dot.classList.remove("active");
    });
    switch (num) {
        case 0:
            dots[0].classList.add("active");
            break;
        case 1:
            dots[1].classList.add("active");
            break;
        case 2:
            dots[2].classList.add("active");
            break;
        case 3:
            dots[3].classList.add("active");
            break;
    }
}

document.addEventListener("wheel", setWantedCardOnScroll);
document.addEventListener("keydown", setWantedCardOnArrows);
