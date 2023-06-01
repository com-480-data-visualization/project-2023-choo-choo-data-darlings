document.addEventListener("DOMContentLoaded", () => {
    const particleContainer: HTMLElement = document.getElementById("particle-container") as HTMLElement
    const train: HTMLElement = document.getElementById("train") as HTMLElement;

    function createParticle(left_shift=0) {
    const particle: HTMLElement = document.createElement("div");
    particle.classList.add("particle");
    particle.style.left = train.getBoundingClientRect().left + left_shift + (0.5 - Math.random()) * 5 + "px";
    particleContainer?.appendChild(particle);

    setTimeout(() => {
        const randomY = (0.8 - Math.random()) * 20;
        const randomX = (0.5 - Math.random()) * 20 + 20;
        particle.style.opacity = '1';
        particle.style.transform = `translateY(${randomY}vh) translateX(${randomX}vw)`;
        particle.style.transition = `transform 5s ease-out, opacity 2s linear`;
        console.log(randomX, randomY);
    }, 0);

    setTimeout(() => {
        particle.style.opacity = '0';
    }, 3000);

    setTimeout(() => {
        particleContainer.removeChild(particle);
    }, 5000);
    }

    setInterval(() => {
    const trainRect: DOMRect = train.getBoundingClientRect();
    const bridgeRect = document.getElementById("bridge")?.getBoundingClientRect()

    if (bridgeRect && trainRect.left <= bridgeRect.right && trainRect.right >= bridgeRect.left) {
        createParticle(train.getBoundingClientRect().width);
        createParticle(train.getBoundingClientRect().width / 2);
        createParticle(0);
    }
    }, 100);

    // Recalculate particle positions when the window is resized
    window.addEventListener("resize", () => {
        Array.from(document.getElementsByClassName("particle")).forEach((particle) => {
            const randomY = (0.8 - Math.random()) * 20;
            const randomX = (0.5 - Math.random()) * 20 + 20;
            particle.style.transform = `translateY(${randomY}vh) translateX(${randomX}vw)`;
        });
    });
});