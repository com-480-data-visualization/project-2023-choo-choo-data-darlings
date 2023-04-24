import './style.css';

document.addEventListener("DOMContentLoaded", () => {
    const colors = ["red", "orange", "yellow", "green", "blue", "indigo", "violet"];
    let colorIndex = 0;
  
    const app = document.querySelector("body");
    
    setInterval(() => {
        colorIndex = (colorIndex + 1) % colors.length;
        app!.style.transition = "background-color 2s ease";
        app!.style.backgroundColor = colors[colorIndex];
    }, 1000);
  });