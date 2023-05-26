const SCROLL_DURATION = 1000;

document.addEventListener("DOMContentLoaded", () => {
  // Go back to top of the page
  const titleContainer = document.getElementById("title-container");
  if (titleContainer) {
    smoothScrollTo(titleContainer, 0);
  }

  let startY: any;  // Variable to store Y position at touchstart
  // In scroll-buttons, add a listener when ckick on a button, scroll to the corresponding section
  const scrollButtons = document.getElementById("scroll-buttons");
  // Set the last selected button to the first button
  let lastSelectedButton = scrollButtons?.getElementsByTagName("li")[0] as HTMLElement;

  function isElementInViewport(el: any) {
    const rect = el.getBoundingClientRect();
    const windowHeight = (window.innerHeight || document.documentElement.clientHeight);
    const windowWidth = (window.innerWidth || document.documentElement.clientWidth);

    return (
      rect.top >= 0 &&
      rect.left >= 0 &&
      rect.bottom <= (windowHeight + 1) &&  // Allow for rounding errors in Chrome
      rect.right <= (windowWidth + 1)  // Allow for rounding errors in Chrome
    );
  }

  function smoothScrollTo(element: any, duration: any) {
    const start = window.pageYOffset;
    const target = element.getBoundingClientRect().top;
    const startTime = performance.now();

    function step(currentTime: any) {
      const elapsed = currentTime - startTime;
      const progress = Math.min(elapsed / duration, 1);

      window.scrollTo({
        top: start + target * easeInOutQuad(progress),
      });

      if (elapsed < duration) {
        window.requestAnimationFrame(step);
      }
    }

    window.requestAnimationFrame(step);
  }

  function easeInOutQuad(t: any) {
    return t < 0.5 ? 2 * t * t : -1 + (4 - 2 * t) * t;
  }

  function getScrollDirection(event: any) {
    return event.deltaY > 0 ? "down" : "up";
  }

  function scrollDirection(event: any) {
    event.preventDefault();
    const containers = [
      "title-container",
      "p1-container",
      "p2-container",
      "p3-container",
      "p4-container",
      "p5-container",
      "p6-container",
      "p7-container",
      "p8-container",
      "p9-container",
      "final-container"
    ];
    
    let direction = null;
    
    // Get direction from deltaY for wheel events
    if (event.type === "wheel") {
      direction = getScrollDirection(event);
    } 
    
    // Get direction from touchmove event
    if (event.type === "touchmove") {
      const touch = event.touches[0];
      direction = touch.pageY > startY ? "up" : "down";
    }
    
    for (let i = 0; i < containers.length; i++) {
      const upContainer = i >= 1 ? document.getElementById(containers[i - 1]) : null;
      const currentContainer = document.getElementById(containers[i]);
      const downContainer = i < containers.length - 1 ? document.getElementById(containers[i + 1]) : null;

      // Get next container
      let nextContainer: any = null;
      if (upContainer && isElementInViewport(currentContainer) && direction === "up") {
        nextContainer = upContainer;
      } else if (downContainer && isElementInViewport(currentContainer) && direction === "down") {
        nextContainer = downContainer;
      } else {
        continue;
      }

      // Remove "current" class from lastSelectedButton
      if (!scrollButtons) continue;
      lastSelectedButton = scrollButtons.getElementsByClassName("current")[0] as HTMLElement;
      if (!lastSelectedButton) continue;
      lastSelectedButton.classList.remove("current");
      lastSelectedButton.classList.remove("unclickable");

      // Add "current" class to the corresponding button
      const button = scrollButtons.querySelector(`li[value="${nextContainer.id}"]`);
      if (!button) continue;
      button.classList.add("current");
      lastSelectedButton = button as HTMLElement;

      smoothScrollTo(nextContainer, SCROLL_DURATION);
      break;
    }
  }
  
  // Save Y position at touchstart
  document.addEventListener("touchstart", (event) => {
    startY = event.touches[0].pageY;
  });
  
  document.addEventListener("wheel", scrollDirection, { passive: false });
  document.addEventListener("touchmove", scrollDirection, { passive: false });

  if (scrollButtons) {
    scrollButtons.addEventListener("click", (event) => {
      // Only do something if the clicked element is an element of type li
      if (event.target instanceof Element && event.target.tagName !== "LI") return;

      // Remove "current" class from lastSelectedButton
      if (lastSelectedButton) {
        lastSelectedButton.classList.remove("current");
        lastSelectedButton.classList.remove("unclickable");
      }

      const target = event.target as HTMLElement;
      lastSelectedButton = target;

      // Add "current" class to the clicked button
      target.classList.add("current");

      const containers = [
        "title-container",
        "p1-container",
        "p2-container",
        "p3-container",
        "p4-container",
        "p5-container",
        "p6-container",
        "p7-container",
        "p8-container",
        "p9-container",
        "final-container"
      ];
      const index = containers.indexOf(target.getAttribute("value")!);
      const container = document.getElementById(containers[index]);
      smoothScrollTo(container, SCROLL_DURATION);
    });
  }
});