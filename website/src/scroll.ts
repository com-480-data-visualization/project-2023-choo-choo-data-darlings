const SCROLL_DURATION = 1000;

document.addEventListener("DOMContentLoaded", () => {
  let startY: any;  // Variable to store Y position at touchstart

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

  function scrollDown(event: any) {
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
      
      if (upContainer && isElementInViewport(currentContainer) && direction === "up") {
        smoothScrollTo(upContainer, SCROLL_DURATION);
      }
      
      if (downContainer && isElementInViewport(currentContainer) && direction === "down") {
        smoothScrollTo(downContainer, SCROLL_DURATION);
      }
    }
  }
  
  // Save Y position at touchstart
  document.addEventListener("touchstart", (event) => {
    startY = event.touches[0].pageY;
  });
  
  document.addEventListener("wheel", scrollDown, { passive: false });
  document.addEventListener("touchmove", scrollDown, { passive: false });
  
  // In scroll-buttons, add a listener when ckick on a button, scroll to the corresponding section
  // The buttons are in li elements as:
  /* <div id="scroll-buttons" class="dotstyle dotstyle-fillup">
      <ul>
        <li class="current" value="title-container"></li>
        <li value="p1-container"></li>
        <li value="p2-container"></li>
        <li value="p3-container"></li>
        <li value="p4-container"></li>
        <li value="p5-container"></li>
        <li value="p7-container"></li>
        <li value="p8-container"></li>
        <li value="final-container"></li>
      </ul>
    </div> */
  const scrollButtons = document.getElementById("scroll-buttons");
  if (scrollButtons) {
    scrollButtons.addEventListener("click", (event) => {
      const target = event.target as HTMLElement;
      console.log(target)
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