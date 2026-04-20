/**
 * cover-canvas.js — Firefly-style particle animation for the cover page.
 * Renders soft, warm glowing dots that drift across a dark background,
 * creating an ambient "city lights at night" atmosphere.
 */
(function () {
  var canvas = document.getElementById("coverCanvas");
  if (!canvas) return;
  var ctx = canvas.getContext("2d");

  var W, H, dpr;
  var particles = [];
  var PARTICLE_COUNT = 60;

  // Match canvas resolution to its CSS size, respecting device pixel ratio
  function resize() {
    dpr = Math.min(window.devicePixelRatio || 1, 2);
    var rect = canvas.parentElement.getBoundingClientRect();
    W = rect.width;
    H = rect.height;
    canvas.width = W * dpr;
    canvas.height = H * dpr;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  }

  function rand(min, max) {
    return min + Math.random() * (max - min);
  }

  // Each particle has a position, velocity, glow radius, and colour hue
  function createParticle() {
    var size = rand(0.5, 4);
    var bright = size > 2.5; // larger dots glow more
    return {
      x: rand(0, W),
      y: rand(0, H),
      r: size,
      blur: bright ? rand(18, 45) : rand(6, 18),
      opacity: bright ? rand(0.25, 0.55) : rand(0.08, 0.25),
      vx: rand(-0.15, 0.15),
      vy: rand(-0.1, 0.1),
      drift: rand(0.3, 1.2),        // sine/cosine wandering amplitude
      phase: rand(0, Math.PI * 2),
      pulseSpeed: rand(0.3, 0.9),
      hue: rand(30, 50)             // warm amber/yellow tones
    };
  }

  function initParticles() {
    particles = [];
    for (var i = 0; i < PARTICLE_COUNT; i++) {
      particles.push(createParticle());
    }
  }

  // Draw a single particle: outer radial glow + bright core dot
  function drawParticle(p, time) {
    var pulse = 0.7 + 0.3 * Math.sin(time * p.pulseSpeed + p.phase);
    var alpha = p.opacity * pulse;

    // Outer glow gradient
    var glow = ctx.createRadialGradient(p.x, p.y, 0, p.x, p.y, p.blur);
    glow.addColorStop(0, "hsla(" + p.hue + ", 90%, 75%, " + (alpha * 0.6) + ")");
    glow.addColorStop(0.4, "hsla(" + p.hue + ", 85%, 55%, " + (alpha * 0.2) + ")");
    glow.addColorStop(1, "hsla(" + p.hue + ", 80%, 40%, 0)");
    ctx.beginPath();
    ctx.arc(p.x, p.y, p.blur, 0, Math.PI * 2);
    ctx.fillStyle = glow;
    ctx.fill();

    // Bright inner core
    var coreAlpha = alpha * 1.2;
    if (coreAlpha > 1) coreAlpha = 1;
    ctx.beginPath();
    ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2);
    ctx.fillStyle = "hsla(" + p.hue + ", 100%, 88%, " + coreAlpha + ")";
    ctx.fill();
  }

  // Move the particle, adding gentle sine-wave drift for organic motion
  function updateParticle(p, time) {
    p.x += p.vx + Math.sin(time * 0.4 + p.phase) * p.drift * 0.12;
    p.y += p.vy + Math.cos(time * 0.3 + p.phase) * p.drift * 0.08;

    // Wrap around edges seamlessly
    if (p.x < -p.blur) p.x = W + p.blur;
    if (p.x > W + p.blur) p.x = -p.blur;
    if (p.y < -p.blur) p.y = H + p.blur;
    if (p.y > H + p.blur) p.y = -p.blur;
  }

  var time = 0;

  // Main render loop — runs every frame via requestAnimationFrame
  function frame() {
    time += 0.016;
    ctx.clearRect(0, 0, W, H);

    for (var i = 0; i < particles.length; i++) {
      updateParticle(particles[i], time);
      drawParticle(particles[i], time);
    }

    requestAnimationFrame(frame);
  }

  function init() {
    resize();
    initParticles();
    frame();
    window.addEventListener("resize", function () {
      resize();
    });
  }

  // Start as soon as the DOM is ready
  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init);
  } else {
    init();
  }
})();
