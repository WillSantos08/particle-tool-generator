const canvas = document.getElementById('canvas');
    const ctx = canvas.getContext('2d');
    
    let particles = [];
    let trails = [];
    let isPaused = false;
    let lastTime = performance.now();
    
    const config = {
      rate: 50,
      size: 8,
      speed: 100,
      direction: 0,
      radius: 50,
      emitX: 256,
      emitY: 256,
      colorStart: '#ffffff',
      colorEnd: '#ff0000',
      shape: 'circle',
      blend: 'additive',
      emitterType: 'point',
      gravity: 0,
      drag: 0,
      rotation: 0,
      scaleOverLife: true,
      fadeIn: false,
      trail: false,
      lifeTime: 1.0,
      lifeVariation: 0.5
    };
    
    class Particle {
      constructor(x, y, vx, vy, size, colorStart, colorEnd, life, shape) {
        this.x = x;
        this.y = y;
        this.vx = vx;
        this.vy = vy;
        this.life = life;
        this.lifeMax = life;
        this.size = size;
        this.colorStart = colorStart;
        this.colorEnd = colorEnd;
        this.color = colorStart;
        this.alpha = 1;
        this.shape = shape;
        this.rotation = Math.random() * Math.PI * 2;
        this.rotationSpeed = (Math.random() - 0.5) * 5;
      }
    }
    
    function hexToRgb(hex) {
      const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
      return result ? {
        r: parseInt(result[1], 16),
        g: parseInt(result[2], 16),
        b: parseInt(result[3], 16)
      } : null;
    }
    
    function lerp(a, b, t) {
      return a + (b - a) * t;
    }
    
    function lerpColor(color1, color2, t) {
      const c1 = hexToRgb(color1);
      const c2 = hexToRgb(color2);
      const r = Math.round(lerp(c1.r, c2.r, t));
      const g = Math.round(lerp(c1.g, c2.g, t));
      const b = Math.round(lerp(c1.b, c2.b, t));
      return `rgb(${r}, ${g}, ${b})`;
    }
    
    function emit(dt) {
      if (isPaused) return;
      
      const count = Math.floor(config.rate * dt);
      for (let i = 0; i < count; i++) {
        let px = config.emitX;
        let py = config.emitY;
        let angle = (config.direction * Math.PI) / 180 + Math.random() * Math.PI * 2;
        let speed = config.speed * (0.5 + Math.random() * 0.5);
        
        if (config.emitterType === 'circle') {
          const a = Math.random() * Math.PI * 2;
          px = config.emitX + Math.cos(a) * config.radius;
          py = config.emitY + Math.sin(a) * config.radius;
        } else if (config.emitterType === 'area') {
          px = config.emitX + (Math.random() - 0.5) * config.radius * 2;
          py = config.emitY + (Math.random() - 0.5) * config.radius * 2;
        } else if (config.emitterType === 'line') {
          const t = Math.random();
          const lineAngle = (config.rotation * Math.PI) / 180;
          px = config.emitX + Math.cos(lineAngle) * config.radius * (t * 2 - 1);
          py = config.emitY + Math.sin(lineAngle) * config.radius * (t * 2 - 1);
        }
        
        const vx = Math.cos(angle) * speed;
        const vy = Math.sin(angle) * speed;
        const life = config.lifeTime + (Math.random() * 2 - 1) * config.lifeVariation;
        
        particles.push(new Particle(px, py, vx, vy, config.size, config.colorStart, config.colorEnd, life, config.shape));
      }
    }
    
    function updateParticles(dt) {
      if (isPaused) return;
      
      particles = particles.filter(p => {
        p.x += p.vx * dt;
        p.y += p.vy * dt;
        
        p.vy += config.gravity * dt * 100;
        
        p.vx *= config.drag;
        p.vy *= config.drag;
        
        p.rotation += p.rotationSpeed * dt;
        
        p.life -= dt;
        const t = 1 - p.life / p.lifeMax;
        
        if (config.fadeIn && t < 0.2) {
          p.alpha = t / 0.2;
        } else {
          p.alpha = 1 - t;
        }
        
        if (config.scaleOverLife) {
          p.currentSize = p.size * (1 - t * 0.5);
        } else {
          p.currentSize = p.size;
        }
        
        p.color = lerpColor(p.colorStart, p.colorEnd, t);
        
        if (config.trail && Math.random() < 0.3) {
          trails.push({
            x: p.x,
            y: p.y,
            color: p.color,
            alpha: p.alpha * 0.3,
            size: p.currentSize * 0.5,
            life: 0.1
          });
        }
        
        return p.life > 0;
      });
      
      if (config.trail) {
        trails = trails.filter(t => {
          t.life -= dt;
          t.alpha *= 0.95;
          return t.life > 0;
        });
      }
      
      document.getElementById('particle-count').textContent = `Particles: ${particles.length}`;
    }
    
    function drawParticle(context, p) {
      context.save();
      context.globalAlpha = p.alpha;
      context.fillStyle = p.color;
      context.translate(p.x, p.y);
      context.rotate(p.rotation);
      
      context.beginPath();
      const size = p.currentSize || p.size;
      switch (p.shape) {
        case 'square':
          context.rect(-size, -size, size * 2, size * 2);
          break;
        case 'triangle':
          context.moveTo(0, -size);
          context.lineTo(size, size);
          context.lineTo(-size, size);
          context.closePath();
          break;
        case 'star':
          const spikes = 5;
          const outerRadius = size;
          const innerRadius = size * 0.5;
          for (let i = 0; i < spikes * 2; i++) {
            const radius = i % 2 === 0 ? outerRadius : innerRadius;
            const angle = (Math.PI / spikes) * i;
            const x = Math.cos(angle) * radius;
            const y = Math.sin(angle) * radius;
            if (i === 0) context.moveTo(x, y);
            else context.lineTo(x, y);
          }
          context.closePath();
          break;
        default:
          context.arc(0, 0, size, 0, Math.PI * 2);
      }
      context.fill();
      context.restore();
    }
    
    function draw(hideEmitter = false) {
      ctx.clearRect(0, 0, 512, 512);
      ctx.globalCompositeOperation = config.blend === 'additive' ? 'lighter' : 'source-over';
      
      if (config.trail) {
        trails.forEach(t => {
          ctx.globalAlpha = t.alpha;
          ctx.fillStyle = t.color;
          ctx.beginPath();
          ctx.arc(t.x, t.y, t.size, 0, Math.PI * 2);
          ctx.fill();
        });
      }
      
      particles.forEach(p => drawParticle(ctx, p));
      
      if (!hideEmitter) {
        ctx.globalAlpha = 0.5;
        ctx.strokeStyle = '#00ff00';
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.arc(config.emitX, config.emitY, 8, 0, Math.PI * 2);
        ctx.stroke();
        
        if (config.radius > 0) {
          ctx.globalAlpha = 0.2;
          ctx.strokeStyle = '#00ff00';
          ctx.lineWidth = 1;
          ctx.beginPath();
          if (config.emitterType === 'circle' || config.emitterType === 'area') {
            ctx.arc(config.emitX, config.emitY, config.radius, 0, Math.PI * 2);
          } else if (config.emitterType === 'line') {
            const angle = (config.rotation * Math.PI) / 180;
            const x1 = config.emitX - Math.cos(angle) * config.radius;
            const y1 = config.emitY - Math.sin(angle) * config.radius;
            const x2 = config.emitX + Math.cos(angle) * config.radius;
            const y2 = config.emitY + Math.sin(angle) * config.radius;
            ctx.moveTo(x1, y1);
            ctx.lineTo(x2, y2);
          }
          ctx.stroke();
        }
      }
      
      ctx.globalAlpha = 1;
    }
    
    function loop() {
      const now = performance.now();
      const dt = Math.min((now - lastTime) / 1000, 0.1);
      lastTime = now;
      
      emit(dt);
      updateParticles(dt);
      draw();
      
      requestAnimationFrame(loop);
    }
    
    async function exportFlipbook() {
      const exportBtn = document.getElementById('export-btn');
      exportBtn.disabled = true;
      exportBtn.textContent = 'Exporting...';
      
      const wasPaused = isPaused;
      isPaused = true;
      
      const savedParticles = [...particles];
      const savedTrails = [...trails];
      
      const FPS = parseInt(document.getElementById('export-fps').value) || 30;
      const DURATION = parseFloat(document.getElementById('export-duration').value) || 2;
      const LOOP_MODE = document.getElementById('export-loop').checked;
      const FRAME_COUNT = Math.ceil(FPS * DURATION);
      const dt = 1 / FPS;
      
      particles = [];
      trails = [];
      
      const frames = [];
      const tempCanvas = document.createElement('canvas');
      tempCanvas.width = 512;
      tempCanvas.height = 512;
      const tempCtx = tempCanvas.getContext('2d');
      
      const totalFrames = LOOP_MODE ? FRAME_COUNT * 2 : FRAME_COUNT;
      
      for (let frame = 0; frame < totalFrames; frame++) {
        const count = Math.floor(config.rate * dt);
        for (let i = 0; i < count; i++) {
          let px = config.emitX;
          let py = config.emitY;
          let angle = (config.direction * Math.PI) / 180 + Math.random() * Math.PI * 2;
          let speed = config.speed * (0.5 + Math.random() * 0.5);
          
          if (config.emitterType === 'circle') {
            const a = Math.random() * Math.PI * 2;
            px = config.emitX + Math.cos(a) * config.radius;
            py = config.emitY + Math.sin(a) * config.radius;
          } else if (config.emitterType === 'area') {
            px = config.emitX + (Math.random() - 0.5) * config.radius * 2;
            py = config.emitY + (Math.random() - 0.5) * config.radius * 2;
          } else if (config.emitterType === 'line') {
            const t = Math.random();
            const lineAngle = (config.rotation * Math.PI) / 180;
            px = config.emitX + Math.cos(lineAngle) * config.radius * (t * 2 - 1);
            py = config.emitY + Math.sin(lineAngle) * config.radius * (t * 2 - 1);
          }
          
          const vx = Math.cos(angle) * speed;
          const vy = Math.sin(angle) * speed;
          const life = config.lifeTime + (Math.random() * 2 - 1) * config.lifeVariation;
          
          particles.push(new Particle(px, py, vx, vy, config.size, config.colorStart, config.colorEnd, life, config.shape));
        }
        
        particles = particles.filter(p => {
          p.x += p.vx * dt;
          p.y += p.vy * dt;
          p.vy += config.gravity * dt * 100;
          p.vx *= config.drag;
          p.vy *= config.drag;
          p.rotation += p.rotationSpeed * dt;
          p.life -= dt;
          
          const t = 1 - p.life / p.lifeMax;
          
          if (config.fadeIn && t < 0.2) {
            p.alpha = t / 0.2;
          } else {
            p.alpha = 1 - t;
          }
          
          if (config.scaleOverLife) {
            p.currentSize = p.size * (1 - t * 0.5);
          } else {
            p.currentSize = p.size;
          }
          
          p.color = lerpColor(p.colorStart, p.colorEnd, t);
          
          if (config.trail && Math.random() < 0.3) {
            trails.push({
              x: p.x,
              y: p.y,
              color: p.color,
              alpha: p.alpha * 0.3,
              size: p.currentSize * 0.5,
              life: 0.1
            });
          }
          
          return p.life > 0;
        });
        
        if (config.trail) {
          trails = trails.filter(t => {
            t.life -= dt;
            t.alpha *= 0.95;
            return t.life > 0;
          });
        }
        
        tempCtx.clearRect(0, 0, 512, 512);
        tempCtx.globalCompositeOperation = config.blend === 'additive' ? 'lighter' : 'source-over';
        
        if (config.trail) {
          trails.forEach(t => {
            tempCtx.globalAlpha = t.alpha;
            tempCtx.fillStyle = t.color;
            tempCtx.beginPath();
            tempCtx.arc(t.x, t.y, t.size, 0, Math.PI * 2);
            tempCtx.fill();
          });
        }
        
        particles.forEach(p => drawParticle(tempCtx, p));
        tempCtx.globalAlpha = 1;
        
        if (!LOOP_MODE || frame < FRAME_COUNT) {
          frames.push(tempCanvas.toDataURL('image/png'));
        }
        
        exportBtn.textContent = `⏳ ${frame + 1}/${totalFrames}`;
        await new Promise(resolve => setTimeout(resolve, 0));
      }
      
      exportBtn.textContent = 'Creating flipbook...';
      const cols = 8;
      const rows = Math.ceil(frames.length / cols);
      const flipCanvas = document.createElement('canvas');
      flipCanvas.width = 512 * cols;
      flipCanvas.height = 512 * rows;
      const flipCtx = flipCanvas.getContext('2d');
      flipCtx.fillStyle = '#000';
      flipCtx.fillRect(0, 0, flipCanvas.width, flipCanvas.height);
      
      const images = await Promise.all(
        frames.map(src => new Promise((resolve) => {
          const img = new Image();
          img.onload = () => resolve(img);
          img.onerror = () => resolve(null);
          img.src = src;
        }))
      );
      
      images.forEach((img, i) => {
        if (img) {
          const x = (i % cols) * 512;
          const y = Math.floor(i / cols) * 512;
          flipCtx.drawImage(img, x, y, 512, 512);
        }
      });
      
      const a = document.createElement('a');
      a.href = flipCanvas.toDataURL('image/png');
      const loopSuffix = LOOP_MODE ? '-loop' : '';
      a.download = `particle-flipbook-${FPS}fps-${DURATION}s${loopSuffix}-${Date.now()}.png`;
      a.click();
      
      particles = savedParticles;
      trails = savedTrails;
      isPaused = wasPaused;
      
      exportBtn.disabled = false;
      exportBtn.textContent = 'Export Flipbook';
    }
    
    function applyPreset(preset) {
      const presets = {
        fire: {
          rate: 80, size: 10, speed: 80, direction: 270, gravity: -0.5, colorStart: '#ffff00', colorEnd: '#ff0000',
          shape: 'circle', blend: 'additive', emitterType: 'area', radius: 30, scaleOverLife: true, trail: false
        },
        snow: {
          rate: 40, size: 5, speed: 30, direction: 90, gravity: 0.2, colorStart: '#ffffff', colorEnd: '#aaaaff',
          shape: 'circle', blend: 'normal', emitterType: 'line', radius: 250, rotation: 0, scaleOverLife: false, trail: false
        },
        explosion: {
          rate: 200, size: 6, speed: 200, direction: 0, gravity: 0.8, colorStart: '#ffaa00', colorEnd: '#ff0000',
          shape: 'star', blend: 'additive', emitterType: 'point', radius: 0, scaleOverLife: true, trail: true
        },
        sparkles: {
          rate: 60, size: 8, speed: 50, direction: 0, gravity: 0, colorStart: '#ffffff', colorEnd: '#00ffff',
          shape: 'star', blend: 'additive', emitterType: 'circle', radius: 80, scaleOverLife: true, trail: false
        }
      };
      
      Object.assign(config, presets[preset]);
      particles = [];
      trails = [];
      updateUI();
    }
    
    function updateUI() {
      document.getElementById('rate').value = config.rate;
      document.getElementById('rate-value').textContent = config.rate;
      document.getElementById('size').value = config.size;
      document.getElementById('size-value').textContent = config.size;
      document.getElementById('speed').value = config.speed;
      document.getElementById('speed-value').textContent = config.speed;
      document.getElementById('lifetime').value = config.lifeTime;
      document.getElementById('lifetime-value').textContent = config.lifeTime.toFixed(1);
      document.getElementById('life-variation').value = config.lifeVariation;
      document.getElementById('life-variation-value').textContent = config.lifeVariation.toFixed(1);
      document.getElementById('direction').value = config.direction;
      document.getElementById('direction-value').textContent = config.direction;
      document.getElementById('gravity').value = config.gravity;
      document.getElementById('gravity-value').textContent = config.gravity.toFixed(1);
      document.getElementById('drag').value = config.drag;
      document.getElementById('drag-value').textContent = config.drag.toFixed(2);
      document.getElementById('radius').value = config.radius;
      document.getElementById('radius-value').textContent = config.radius;
      document.getElementById('rotation').value = config.rotation;
      document.getElementById('rotation-value').textContent = config.rotation;
      document.getElementById('pos-x').value = config.emitX;
      document.getElementById('pos-x-value').textContent = config.emitX;
      document.getElementById('pos-y').value = config.emitY;
      document.getElementById('pos-y-value').textContent = config.emitY;
      document.getElementById('color-start').value = config.colorStart;
      document.getElementById('color-end').value = config.colorEnd;
      document.getElementById('shape').value = config.shape;
      document.getElementById('blend').value = config.blend;
      document.getElementById('emitter-type').value = config.emitterType;
      document.getElementById('scale-life').checked = config.scaleOverLife;
      document.getElementById('fade-in').checked = config.fadeIn;
      document.getElementById('trail').checked = config.trail;
    }
    
    document.getElementById('rate').addEventListener('input', e => {
      config.rate = Number(e.target.value);
      document.getElementById('rate-value').textContent = config.rate;
    });
    
    document.getElementById('size').addEventListener('input', e => {
      config.size = Number(e.target.value);
      document.getElementById('size-value').textContent = config.size;
    });
    
    document.getElementById('speed').addEventListener('input', e => {
      config.speed = Number(e.target.value);
      document.getElementById('speed-value').textContent = config.speed;
    });
    
    document.getElementById('lifetime').addEventListener('input', e => {
      config.lifeTime = Number(e.target.value);
      document.getElementById('lifetime-value').textContent = config.lifeTime.toFixed(1);
    });
    
    document.getElementById('life-variation').addEventListener('input', e => {
      config.lifeVariation = Number(e.target.value);
      document.getElementById('life-variation-value').textContent = config.lifeVariation.toFixed(1);
    });
    
    document.getElementById('direction').addEventListener('input', e => {
      config.direction = Number(e.target.value);
      document.getElementById('direction-value').textContent = config.direction;
    });
    
    document.getElementById('gravity').addEventListener('input', e => {
      config.gravity = Number(e.target.value);
      document.getElementById('gravity-value').textContent = config.gravity.toFixed(1);
    });
    
    document.getElementById('drag').addEventListener('input', e => {
      config.drag = Number(e.target.value);
      document.getElementById('drag-value').textContent = config.drag.toFixed(2);
    });
    
    document.getElementById('radius').addEventListener('input', e => {
      config.radius = Number(e.target.value);
      document.getElementById('radius-value').textContent = config.radius;
    });
    
    document.getElementById('rotation').addEventListener('input', e => {
      config.rotation = Number(e.target.value);
      document.getElementById('rotation-value').textContent = config.rotation;
    });
    
    document.getElementById('pos-x').addEventListener('input', e => {
      config.emitX = Number(e.target.value);
      document.getElementById('pos-x-value').textContent = config.emitX;
    });
    
    document.getElementById('pos-y').addEventListener('input', e => {
      config.emitY = Number(e.target.value);
      document.getElementById('pos-y-value').textContent = config.emitY;
    });
    
    document.getElementById('color-start').addEventListener('input', e => {
      config.colorStart = e.target.value;
    });
    
    document.getElementById('color-end').addEventListener('input', e => {
      config.colorEnd = e.target.value;
    });
    
    document.getElementById('shape').addEventListener('change', e => {
      config.shape = e.target.value;
    });
    
    document.getElementById('blend').addEventListener('change', e => {
      config.blend = e.target.value;
    });
    
    document.getElementById('emitter-type').addEventListener('change', e => {
      config.emitterType = e.target.value;
    });
    
    document.getElementById('scale-life').addEventListener('change', e => {
      config.scaleOverLife = e.target.checked;
    });
    
    document.getElementById('fade-in').addEventListener('change', e => {
      config.fadeIn = e.target.checked;
    });
    
    document.getElementById('trail').addEventListener('change', e => {
      config.trail = e.target.checked;
    });
    
    document.getElementById('pause-btn').addEventListener('click', () => {
      isPaused = !isPaused;
      document.getElementById('pause-btn').textContent = isPaused ? 'Play Animation' : 'Pause Animation';
    });
    
    document.getElementById('clear-btn').addEventListener('click', () => {
      particles = [];
      trails = [];
    });
    
    document.getElementById('export-btn').addEventListener('click', exportFlipbook);
    
    window.applyPreset = applyPreset;
    
    requestAnimationFrame(loop);