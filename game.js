class HandWizardGame {
    constructor() {
        this.canvas = document.getElementById('gameCanvas');
        this.ctx = this.canvas.getContext('2d');
        this.video = document.getElementById('videoElement');
        this.startButton = document.getElementById('startButton');
        
        this.canvas.width = window.innerWidth;
        this.canvas.height = window.innerHeight;
        
        this.score = 0;
        this.level = 1;
        this.coins = 0;
        this.combo = 0;
        this.lastKillTime = 0;
        this.comboTimeout = 3000;
        this.currentGesture = 'None';
        this.handPosition = { x: 0, y: 0 };
        this.lastSpellTime = 0;
        this.spellCooldown = 300;
        
        this.enemies = [];
        this.spells = [];
        this.particles = [];
        
        this.hands = null;
        this.camera = null;
        
        this.init();
    }
    
    init() {
        this.startButton.addEventListener('click', () => this.startGame());
        this.spawnEnemies();
        this.gameLoop();
    }
    
    async startGame() {
        this.startButton.style.display = 'none';
        this.video.style.display = 'block';
        
        this.hands = new Hands({
            locateFile: (file) => `https://cdn.jsdelivr.net/npm/@mediapipe/hands/${file}`
        });
        
        this.hands.setOptions({
            maxNumHands: 1,
            modelComplexity: 1,
            minDetectionConfidence: 0.5,
            minTrackingConfidence: 0.5
        });
        
        this.hands.onResults((results) => this.onResults(results));
        
        this.camera = new Camera(this.video, {
            onFrame: async () => {
                await this.hands.send({ image: this.video });
            },
            width: 640,
            height: 480
        });
        
        this.camera.start();
    }
    
    onResults(results) {
        if (results.multiHandLandmarks && results.multiHandLandmarks.length > 0) {
            const landmarks = results.multiHandLandmarks[0];
            
            // Get hand position (index finger tip)
            this.handPosition.x = (1 - landmarks[8].x) * this.canvas.width;
            this.handPosition.y = landmarks[8].y * this.canvas.height;
            
            // Detect gesture
            this.currentGesture = this.detectGesture(landmarks);
            document.getElementById('currentGesture').textContent = this.currentGesture;
            
            // Cast spell based on gesture
            if (this.currentGesture !== 'None' && Date.now() - this.lastSpellTime > this.spellCooldown) {
                this.castSpell(this.currentGesture);
                this.lastSpellTime = Date.now();
            }
        }
    }
    
    detectGesture(landmarks) {
        const fingerTips = [4, 8, 12, 16, 20];
        const fingerPips = [3, 6, 10, 14, 18];
        
        let fingersUp = [];
        
        // Thumb
        if (landmarks[fingerTips[0]].x > landmarks[fingerPips[0]].x) {
            fingersUp.push(1);
        } else {
            fingersUp.push(0);
        }
        
        // Other fingers
        for (let i = 1; i < 5; i++) {
            if (landmarks[fingerTips[i]].y < landmarks[fingerPips[i]].y) {
                fingersUp.push(1);
            } else {
                fingersUp.push(0);
            }
        }
        
        const totalFingers = fingersUp.reduce((a, b) => a + b, 0);
        
        if (totalFingers === 5) return 'Fire';
        if (totalFingers === 0) return 'Ice';
        if (totalFingers === 1 && fingersUp[1] === 1) return 'Lightning';
        if (totalFingers === 2 && fingersUp[1] === 1 && fingersUp[2] === 1) return 'Nature';
        
        return 'None';
    }
    
    castSpell(type) {
        const spell = {
            x: this.handPosition.x,
            y: this.handPosition.y,
            type: type,
            size: 20,
            speed: 8,
            life: 100,
            angle: Math.atan2(this.canvas.height / 2 - this.handPosition.y, this.canvas.width / 2 - this.handPosition.x)
        };
        
        this.spells.push(spell);
        
        // Show spell emoji
        this.showSpellEmoji(type, this.handPosition.x, this.handPosition.y);
        
        // Create particles
        for (let i = 0; i < 10; i++) {
            this.particles.push({
                x: this.handPosition.x,
                y: this.handPosition.y,
                vx: (Math.random() - 0.5) * 10,
                vy: (Math.random() - 0.5) * 10,
                life: 30,
                color: this.getSpellColor(type)
            });
        }
    }
    
    getSpellColor(type) {
        switch (type) {
            case 'Fire': return '#ff4444';
            case 'Ice': return '#44aaff';
            case 'Lightning': return '#ffff44';
            case 'Nature': return '#44ff44';
            default: return '#ffffff';
        }
    }
    
    getSpellEmoji(type) {
        switch (type) {
            case 'Fire': return '🔥';
            case 'Ice': return '❄️';
            case 'Lightning': return '⚡';
            case 'Nature': return '🌿';
            default: return '✨';
        }
    }
    
    getEnemyEmoji(type) {
        switch (type) {
            case 'Fire': return '🔥';
            case 'Ice': return '❄️';
            case 'Lightning': return '⚡';
            case 'Earth': return '🌍';
            default: return '👾';
        }
    }
    
    showSpellEmoji(type, x, y) {
        const emoji = document.createElement('div');
        emoji.textContent = this.getSpellEmoji(type);
        emoji.style.position = 'absolute';
        emoji.style.left = x + 'px';
        emoji.style.top = y + 'px';
        emoji.style.fontSize = '24px';
        emoji.style.pointerEvents = 'none';
        emoji.style.zIndex = '20';
        emoji.style.animation = 'spellCast 1s ease-out forwards';
        document.body.appendChild(emoji);
        setTimeout(() => emoji.remove(), 1000);
    }
    
    spawnEnemies() {
        setInterval(() => {
            if (this.enemies.length < 8) {
                const side = Math.floor(Math.random() * 4);
                let x, y;
                
                switch (side) {
                    case 0: x = Math.random() * this.canvas.width; y = -50; break;
                    case 1: x = this.canvas.width + 50; y = Math.random() * this.canvas.height; break;
                    case 2: x = Math.random() * this.canvas.width; y = this.canvas.height + 50; break;
                    case 3: x = -50; y = Math.random() * this.canvas.height; break;
                }
                
                const types = ['Fire', 'Ice', 'Lightning', 'Earth'];
                const enemyType = types[Math.floor(Math.random() * types.length)];
                
                this.enemies.push({
                    x: x,
                    y: y,
                    size: 30 + Math.random() * 20,
                    speed: 1 + Math.random() * 2,
                    health: 3,
                    maxHealth: 3,
                    type: enemyType,
                    color: this.getEnemyColor(enemyType)
                });
            }
        }, Math.max(1000, 2500 - this.level * 100));
    }
    
    update() {
        // Update spells
        this.spells = this.spells.filter(spell => {
            spell.x += Math.cos(spell.angle) * spell.speed;
            spell.y += Math.sin(spell.angle) * spell.speed;
            spell.life--;
            
            return spell.life > 0 && 
                   spell.x > -50 && spell.x < this.canvas.width + 50 &&
                   spell.y > -50 && spell.y < this.canvas.height + 50;
        });
        
        // Update enemies
        this.enemies.forEach(enemy => {
            const dx = this.canvas.width / 2 - enemy.x;
            const dy = this.canvas.height / 2 - enemy.y;
            const distance = Math.sqrt(dx * dx + dy * dy);
            
            enemy.x += (dx / distance) * enemy.speed;
            enemy.y += (dy / distance) * enemy.speed;
        });
        
        // Check collisions
        this.spells.forEach((spell, spellIndex) => {
            this.enemies.forEach((enemy, enemyIndex) => {
                const dx = spell.x - enemy.x;
                const dy = spell.y - enemy.y;
                const distance = Math.sqrt(dx * dx + dy * dy);
                
                if (distance < spell.size + enemy.size) {
                    const damage = this.calculateDamage(spell.type, enemy.type);
                    enemy.health -= damage;
                    this.spells.splice(spellIndex, 1);
                    
                    if (enemy.health <= 0) {
                        this.enemies.splice(enemyIndex, 1);
                        const reward = this.calculateReward(spell.type, enemy.type);
                        this.score += reward.score;
                        this.coins += reward.coins;
                        this.updateCombo();
                        this.updateUI();
                        
                        // Explosion particles
                        for (let i = 0; i < 15; i++) {
                            this.particles.push({
                                x: enemy.x,
                                y: enemy.y,
                                vx: (Math.random() - 0.5) * 15,
                                vy: (Math.random() - 0.5) * 15,
                                life: 40,
                                color: enemy.color
                            });
                        }
                    }
                }
            });
        });
        
        // Update particles
        this.particles = this.particles.filter(particle => {
            particle.x += particle.vx;
            particle.y += particle.vy;
            particle.vx *= 0.98;
            particle.vy *= 0.98;
            particle.life--;
            return particle.life > 0;
        });
        
        // Update combo timeout
        if (Date.now() - this.lastKillTime > this.comboTimeout) {
            this.combo = 0;
            document.getElementById('combo').textContent = this.combo;
        }
        
        // Level up system
        const newLevel = Math.floor(this.score / 100) + 1;
        if (newLevel > this.level) {
            this.level = newLevel;
            this.coins += this.level * 5;
            this.updateUI();
        }
    }
    
    draw() {
        this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
        
        // Draw wizard cursor
        if (this.handPosition.x && this.handPosition.y) {
            this.ctx.font = '32px Arial';
            this.ctx.textAlign = 'center';
            this.ctx.textBaseline = 'middle';
            this.ctx.fillText('🧙‍♂️', this.handPosition.x, this.handPosition.y);
        }
        
        // Draw spells
        this.spells.forEach(spell => {
            this.ctx.beginPath();
            this.ctx.arc(spell.x, spell.y, spell.size, 0, Math.PI * 2);
            this.ctx.fillStyle = this.getSpellColor(spell.type);
            this.ctx.fill();
            this.ctx.shadowBlur = 20;
            this.ctx.shadowColor = this.getSpellColor(spell.type);
            this.ctx.fill();
            this.ctx.shadowBlur = 0;
        });
        
        // Draw enemies
        this.enemies.forEach(enemy => {
            this.ctx.beginPath();
            this.ctx.arc(enemy.x, enemy.y, enemy.size, 0, Math.PI * 2);
            this.ctx.fillStyle = enemy.color;
            this.ctx.fill();
            this.ctx.strokeStyle = '#fff';
            this.ctx.lineWidth = 2;
            this.ctx.stroke();
            
            // Health bar
            this.ctx.fillStyle = 'red';
            this.ctx.fillRect(enemy.x - enemy.size, enemy.y - enemy.size - 10, enemy.size * 2, 5);
            this.ctx.fillStyle = 'green';
            this.ctx.fillRect(enemy.x - enemy.size, enemy.y - enemy.size - 10, (enemy.size * 2) * (enemy.health / enemy.maxHealth), 5);
        });
        
        // Draw particles
        this.particles.forEach(particle => {
            this.ctx.beginPath();
            this.ctx.arc(particle.x, particle.y, 3, 0, Math.PI * 2);
            this.ctx.fillStyle = particle.color;
            this.ctx.globalAlpha = particle.life / 40;
            this.ctx.fill();
            this.ctx.globalAlpha = 1;
        });
        
        // Draw enemy type indicators
        this.enemies.forEach(enemy => {
            this.ctx.font = '16px Arial';
            this.ctx.textAlign = 'center';
            this.ctx.fillStyle = '#fff';
            this.ctx.fillText(this.getEnemyEmoji(enemy.type), enemy.x, enemy.y - enemy.size - 20);
        });
    }
    
    getEnemyColor(type) {
        switch (type) {
            case 'Fire': return '#ff6b6b';
            case 'Ice': return '#74c0fc';
            case 'Lightning': return '#ffd43b';
            case 'Earth': return '#8ce99a';
            default: return '#868e96';
        }
    }
    
    calculateDamage(spellType, enemyType) {
        const effectiveness = {
            'Fire': { 'Ice': 2, 'Fire': 0.5, 'Lightning': 1, 'Earth': 1 },
            'Ice': { 'Fire': 2, 'Ice': 0.5, 'Lightning': 1, 'Earth': 1 },
            'Lightning': { 'Earth': 2, 'Lightning': 0.5, 'Fire': 1, 'Ice': 1 },
            'Nature': { 'Lightning': 2, 'Earth': 0.5, 'Fire': 1, 'Ice': 1 }
        };
        
        const multiplier = effectiveness[spellType]?.[enemyType] || 1;
        return Math.ceil(1 * multiplier);
    }
    
    calculateReward(spellType, enemyType) {
        const baseDamage = this.calculateDamage(spellType, enemyType);
        const isEffective = baseDamage > 1;
        
        return {
            score: isEffective ? 20 + (this.combo * 5) : 10 + (this.combo * 2),
            coins: isEffective ? 3 + Math.floor(this.combo / 2) : 1
        };
    }
    
    updateCombo() {
        this.combo++;
        this.lastKillTime = Date.now();
    }
    
    updateUI() {
        document.getElementById('score').textContent = this.score;
        document.getElementById('level').textContent = this.level;
        document.getElementById('coins').textContent = this.coins;
        document.getElementById('combo').textContent = this.combo;
    }
    
    gameLoop() {
        this.update();
        this.draw();
        requestAnimationFrame(() => this.gameLoop());
    }
}

// Start the game
window.addEventListener('load', () => {
    new HandWizardGame();
});