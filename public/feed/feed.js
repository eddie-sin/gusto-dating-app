const images = [
  "img/mmainpageImage.png",
  "img/mmainpageImage.png",
  "/img/bgimg.jpg",
];

let currentIndex = 0;

function showImage(i) {
  currentIndex = i;
  const img = document.getElementById("slideImage");
  const bars = document.querySelectorAll("#bars div");

  bars.forEach((bar, idx) => {
    bar.classList.remove("bg-white", "bg-black/40");
    bar.classList.add(idx === i ? "bg-white" : "bg-black/40");
  });

  img.style.opacity = "0";
  setTimeout(() => {
    img.src = images[i];
    img.style.opacity = "1";
  }, 200);
}

// ===== Swipe functionality =====
const slideImage = document.getElementById("slideImage");
let startX = 0;

slideImage.addEventListener("touchstart", (e) => {
  startX = e.touches[0].clientX;
});

slideImage.addEventListener("touchend", (e) => {
  const endX = e.changedTouches[0].clientX;
  const diffX = endX - startX;

  if (Math.abs(diffX) > 50) {
    // minimum swipe distance
    if (diffX < 0) {
      // swipe left → next image
      currentIndex = (currentIndex + 1) % images.length;
    } else {
      // swipe right → previous image
      currentIndex = (currentIndex - 1 + images.length) % images.length;
    }
    showImage(currentIndex);
  }
});
tailwind.config = {
  theme: {
    extend: {
      fontFamily: {
        rufina: ["Rufina", "serif"],
        jomolhari: ["Jomolhari", "serif"],
      },
    },
  },
};
