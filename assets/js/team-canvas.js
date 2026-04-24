/**
 * team-canvas.js — Reuses the same firefly particle animation from the cover
 * for the Our Team page, maintaining visual consistency.
 */
// OUR TEAM PAGE START
(function () {
  var canvas = document.getElementById("teamCanvas");
  if (!canvas) return;
  var ctx = canvas.getContext("2d");

  var W, H, dpr;
  var particles = [];
  var PARTICLE_COUNT = 45;

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

  function createParticle() {
    var size = rand(0.5, 3.5);
    var bright = size > 2;
    return {
      x: rand(0, W),
      y: rand(0, H),
      r: size,
      blur: bright ? rand(16, 40) : rand(5, 16),
      opacity: bright ? rand(0.2, 0.45) : rand(0.06, 0.2),
      vx: rand(-0.12, 0.12),
      vy: rand(-0.08, 0.08),
      drift: rand(0.3, 1.0),
      phase: rand(0, Math.PI * 2),
      pulseSpeed: rand(0.3, 0.8),
      hue: rand(30, 50)
    };
  }

  function initParticles() {
    particles = [];
    for (var i = 0; i < PARTICLE_COUNT; i++) {
      particles.push(createParticle());
    }
  }

  function drawParticle(p, time) {
    var pulse = 0.7 + 0.3 * Math.sin(time * p.pulseSpeed + p.phase);
    var alpha = p.opacity * pulse;

    var glow = ctx.createRadialGradient(p.x, p.y, 0, p.x, p.y, p.blur);
    glow.addColorStop(0, "hsla(" + p.hue + ", 90%, 75%, " + (alpha * 0.6) + ")");
    glow.addColorStop(0.4, "hsla(" + p.hue + ", 85%, 55%, " + (alpha * 0.2) + ")");
    glow.addColorStop(1, "hsla(" + p.hue + ", 80%, 40%, 0)");
    ctx.beginPath();
    ctx.arc(p.x, p.y, p.blur, 0, Math.PI * 2);
    ctx.fillStyle = glow;
    ctx.fill();

    var coreAlpha = alpha * 1.2;
    if (coreAlpha > 1) coreAlpha = 1;
    ctx.beginPath();
    ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2);
    ctx.fillStyle = "hsla(" + p.hue + ", 100%, 88%, " + coreAlpha + ")";
    ctx.fill();
  }

  function updateParticle(p, time) {
    p.x += p.vx + Math.sin(time * 0.4 + p.phase) * p.drift * 0.12;
    p.y += p.vy + Math.cos(time * 0.3 + p.phase) * p.drift * 0.08;

    if (p.x < -p.blur) p.x = W + p.blur;
    if (p.x > W + p.blur) p.x = -p.blur;
    if (p.y < -p.blur) p.y = H + p.blur;
    if (p.y > H + p.blur) p.y = -p.blur;
  }

  var time = 0;

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
    window.addEventListener("resize", resize);
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init);
  } else {
    init();
  }
})();
// OUR TEAM PAGE END
