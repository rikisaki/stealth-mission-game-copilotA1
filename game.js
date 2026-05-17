// ==================== GAME CONTROLLER ====================

class SteathMissionGame {
    constructor(canvasId) {
        this.canvas = document.getElementById(canvasId);
        this.ctx = this.canvas.getContext('2d');
        this.width = this.canvas.width;
        this.height = this.canvas.height;

        // Game entities
        this.player = new Player(100, this.height / 2);
        this.weapon = new Weapon(this.player.weapon);
        this.enemies = [];
        this.obstacles = [];
        this.gameState = new GameState();

        // Input handling
        this.keys = {};
        this.setupInputHandlers();

        // Initialize map
        this.initializeMap();

        // Game loop
        this.frameCount = 0;
        this.gameLoop = this.update.bind(this);
    }

    setupInputHandlers() {
        document.addEventListener('keydown', (e) => {
            this.keys[e.key] = true;

            // Special keys
            if (e.key === ' ' || e.code === 'Space') {
                e.preventDefault();
                this.playerMeleeAttack();
            }
            if (e.key === 'e' || e.key === 'E') {
                this.player.switchWeapon();
                this.weapon = new Weapon(this.player.weapon);
                this.updateUI();
            }
        });

        document.addEventListener('keyup', (e) => {
            this.keys[e.key] = false;
        });

        // Mouse click for shooting
        this.canvas.addEventListener('click', (e) => {
            if (this.player.weapon === 'suppressed') {
                this.playerShoot(e);
            }
        });
    }

    initializeMap() {
        // Create obstacles (basic shapes)
        this.obstacles = [
            new Obstacle(200, 150, 100, 30),
            new Obstacle(500, 200, 30, 150),
            new Obstacle(350, 400, 150, 30),
            new Obstacle(100, 400, 30, 100),
            new Obstacle(650, 350, 80, 80),
        ];

        // Create enemies with patrol points
        this.enemies = [
            new Enemy(400, 100, [{ x: 350, y: 100 }, { x: 450, y: 100 }]),
            new Enemy(550, 250, [{ x: 500, y: 250 }, { x: 600, y: 250 }]),
            new Enemy(300, 450, [{ x: 250, y: 450 }, { x: 350, y: 450 }]),
            new Enemy(650, 450, [{ x: 600, y: 450 }, { x: 700, y: 450 }]),
            new Enemy(150, 200, [{ x: 100, y: 150 }, { x: 200, y: 200 }]),
        ];
    }

    update() {
        if (!this.gameState.isRunning) {
            this.draw();
            requestAnimationFrame(this.gameLoop);
            return;
        }

        this.frameCount++;

        // Update player
        this.player.update(this.keys, this.width, this.height);
        this.weapon.update();

        // Update enemies
        this.enemies.forEach((enemy) => {
            if (enemy.isAlive()) {
                enemy.update(this.player, this.obstacles);

                // Enemy detection of player
                const dx = this.player.x - enemy.x;
                const dy = this.player.y - enemy.y;
                const distance = Math.hypot(dx, dy);

                if (distance < enemy.detectionRange && enemy.alertLevel > 50) {
                    this.player.detectionLevel = Math.min(100, this.player.detectionLevel + 2);

                    // Enemy shoots back if detected
                    if (this.frameCount % 30 === 0 && enemy.shootCooldown <= 0) {
                        enemy.shootCooldown = 60;
                        this.enemyShoot(enemy);
                    }
                }

                // Collision with player (melee range)
                if (distance < 30) {
                    this.player.takeDamage(5);
                }
            }
        });

        // Remove dead enemies
        this.enemies = this.enemies.filter((enemy) => enemy.isAlive());

        // Check win condition
        if (this.enemies.length === 0 && !this.gameState.missionComplete) {
            this.gameState.missionComplete = true;
            this.gameState.isRunning = false;
            console.log('Mission Complete!');
        }

        // Check lose condition
        if (!this.player.isAlive()) {
            this.gameState.gameOver = true;
            this.gameState.isRunning = false;
            console.log('Game Over!');
        }

        this.updateUI();
        this.draw();

        requestAnimationFrame(this.gameLoop);
    }

    playerShoot(event) {
        if (this.player.weapon !== 'suppressed' || !this.weapon.fire()) return;

        const rect = this.canvas.getBoundingClientRect();
        const mouseX = event.clientX - rect.left;
        const mouseY = event.clientY - rect.top;

        const dx = mouseX - this.player.x;
        const dy = mouseY - this.player.y;
        const distance = Math.hypot(dx, dy);
        const angle = Math.atan2(dy, dx);

        // Draw bullet
        this.drawBullet(this.player.x, this.player.y, mouseX, mouseY);

        // Check hits on enemies
        this.enemies.forEach((enemy) => {
            const edx = enemy.x - this.player.x;
            const edy = enemy.y - this.player.y;
            const eDist = Math.hypot(edx, edy);

            if (eDist < this.weapon.range) {
                // Check if bullet hits
                const dotProduct = (dx * edx + dy * edy) / (distance * eDist);
                if (dotProduct > 0.95) {
                    enemy.takeDamage(this.weapon.damage);
                    this.gameState.score += 10;
                }
            }
        });

        // Suppressed weapon causes detection
        this.player.detectionLevel += this.weapon.detectionLevel;
    }

    playerMeleeAttack() {
        if (!this.player.attack()) return;

        // Check enemies in melee range
        this.enemies.forEach((enemy) => {
            const dx = enemy.x - this.player.x;
            const dy = enemy.y - this.player.y;
            const distance = Math.hypot(dx, dy);

            if (distance < this.player.meleeRange) {
                enemy.takeDamage(this.player.meleeDamage);
                this.gameState.score += 25;
            }
        });

        // Draw melee attack effect
        this.drawMeleeEffect();
    }

    enemyShoot(enemy) {
        const dx = this.player.x - enemy.x;
        const dy = this.player.y - enemy.y;
        const distance = Math.hypot(dx, dy);

        if (distance < 200) {
            // Check hit
            if (Math.random() > 0.5) {
                this.player.takeDamage(10);
            }
        }
    }

    drawBullet(fromX, fromY, toX, toY) {
        this.ctx.strokeStyle = '#ffff00';
        this.ctx.lineWidth = 2;
        this.ctx.beginPath();
        this.ctx.moveTo(fromX, fromY);
        this.ctx.lineTo(toX, toY);
        this.ctx.stroke();
    }

    drawMeleeEffect() {
        // Simple melee effect circle
        this.ctx.strokeStyle = 'rgba(255, 100, 100, 0.5)';
        this.ctx.lineWidth = 2;
        this.ctx.beginPath();
        this.ctx.arc(this.player.x, this.player.y, this.player.meleeRange, 0, Math.PI * 2);
        this.ctx.stroke();
    }

    draw() {
        // Clear canvas
        this.ctx.fillStyle = '#2a2a2a';
        this.ctx.fillRect(0, 0, this.width, this.height);

        // Draw grid background
        this.drawGrid();

        // Draw obstacles
        this.obstacles.forEach((obstacle) => obstacle.draw(this.ctx));

        // Draw enemies
        this.enemies.forEach((enemy) => enemy.draw(this.ctx));

        // Draw player
        this.player.draw(this.ctx);

        // Draw game over / mission complete
        if (this.gameState.gameOver) {
            this.drawGameOver();
        }
        if (this.gameState.missionComplete) {
            this.drawMissionComplete();
        }
    }

    drawGrid() {
        this.ctx.strokeStyle = 'rgba(255, 255, 255, 0.05)';
        this.ctx.lineWidth = 0.5;
        const gridSize = 50;

        for (let x = 0; x <= this.width; x += gridSize) {
            this.ctx.beginPath();
            this.ctx.moveTo(x, 0);
            this.ctx.lineTo(x, this.height);
            this.ctx.stroke();
        }

        for (let y = 0; y <= this.height; y += gridSize) {
            this.ctx.beginPath();
            this.ctx.moveTo(0, y);
            this.ctx.lineTo(this.width, y);
            this.ctx.stroke();
        }
    }

    drawGameOver() {
        this.ctx.fillStyle = 'rgba(0, 0, 0, 0.7)';
        this.ctx.fillRect(0, 0, this.width, this.height);

        this.ctx.fillStyle = '#ff0000';
        this.ctx.font = 'bold 48px Arial';
        this.ctx.textAlign = 'center';
        this.ctx.fillText('GAME OVER', this.width / 2, this.height / 2 - 20);

        this.ctx.fillStyle = '#ffffff';
        this.ctx.font = '24px Arial';
        this.ctx.fillText(`Final Score: ${this.gameState.score}`, this.width / 2, this.height / 2 + 40);
    }

    drawMissionComplete() {
        this.ctx.fillStyle = 'rgba(0, 0, 0, 0.7)';
        this.ctx.fillRect(0, 0, this.width, this.height);

        this.ctx.fillStyle = '#00ff00';
        this.ctx.font = 'bold 48px Arial';
        this.ctx.textAlign = 'center';
        this.ctx.fillText('MISSION COMPLETE!', this.width / 2, this.height / 2 - 20);

        this.ctx.fillStyle = '#ffffff';
        this.ctx.font = '24px Arial';
        this.ctx.fillText(`Score: ${this.gameState.score}`, this.width / 2, this.height / 2 + 40);
    }

    updateUI() {
        // Update health
        document.getElementById('healthStat').textContent = `❤️ Health: ${Math.max(0, this.player.health)}`;

        // Update stealth status
        let stealthStatus = '🟢 Safe';
        let stealthClass = '';
        if (this.player.detectionLevel > 66) {
            stealthStatus = '🔴 Detected!';
            stealthClass = 'danger';
        } else if (this.player.detectionLevel > 33) {
            stealthStatus = '🟡 Caution';
            stealthClass = 'warning';
        }
        const stealthStat = document.getElementById('stealthStat');
        stealthStat.textContent = `🤫 Stealth: ${stealthStatus}`;
        stealthStat.className = `stat-item ${stealthClass}`;

        // Update enemies count
        document.getElementById('enemiesStat').textContent = `👾 Enemies: ${this.enemies.length}`;

        // Update weapon
        const weaponName = this.player.weapon === 'suppressed' ? 'Suppressed Rifle' : 'Melee (Knife)';
        document.getElementById('weaponStat').textContent = `🔫 Weapon: ${weaponName}`;
    }

    start() {
        console.log('Game started!');
        requestAnimationFrame(this.gameLoop);
    }
}

// Initialize and start game
document.addEventListener('DOMContentLoaded', () => {
    const game = new SteathMissionGame('gameCanvas');
    game.start();
});
