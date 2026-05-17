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
        this.rng = new SeededRandom(this.gameState.seed);

        // Input handling
        this.keys = {};
        this.mouseX = 0;
        this.mouseY = 0;
        this.setupInputHandlers();

        // Initialize map
        this.initializeMap();

        // Game loop
        this.frameCount = 0;
        this.gameLoop = this.update.bind(this);

        // Display seed
        console.log('Game Seed:', this.gameState.seed);
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
            if (e.key === 'r' || e.key === 'R') {
                this.resetGame();
            }
        });

        document.addEventListener('keyup', (e) => {
            this.keys[e.key] = false;
        });

        // Mouse move for aim line
        document.addEventListener('mousemove', (e) => {
            const rect = this.canvas.getBoundingClientRect();
            this.mouseX = e.clientX - rect.left;
            this.mouseY = e.clientY - rect.top;
            this.player.lastMouseX = this.mouseX;
            this.player.lastMouseY = this.mouseY;
        });

        // Mouse click for shooting
        this.canvas.addEventListener('click', (e) => {
            if (this.player.weapon === 'suppressed') {
                this.playerShoot(e);
            }
        });
    }

    initializeMap() {
        // Generate random obstacles
        this.obstacles = [];
        const numObstacles = 5;
        const minDistance = 100;

        for (let i = 0; i < numObstacles; i++) {
            let x, y, width, height;
            let validPosition = false;

            while (!validPosition) {
                x = this.rng.nextInt(100, this.width - 150);
                y = this.rng.nextInt(100, this.height - 150);
                width = this.rng.nextInt(50, 150);
                height = this.rng.nextInt(30, 150);

                // Check if position is valid (not too close to edges or other obstacles)
                validPosition = true;
                for (let obstacle of this.obstacles) {
                    const dist = Math.hypot(x - obstacle.x, y - obstacle.y);
                    if (dist < minDistance) {
                        validPosition = false;
                        break;
                    }
                }
            }

            this.obstacles.push(new Obstacle(x, y, width, height));
        }

        // Generate random enemies
        this.enemies = [];
        const numEnemies = 5;

        for (let i = 0; i < numEnemies; i++) {
            let enemyX, enemyY;
            let validEnemyPos = false;

            while (!validEnemyPos) {
                enemyX = this.rng.nextInt(150, this.width - 150);
                enemyY = this.rng.nextInt(150, this.height - 150);

                // Check if not colliding with obstacles and away from player
                validEnemyPos = true;
                const distToPlayer = Math.hypot(enemyX - this.player.x, enemyY - this.player.y);
                if (distToPlayer < 150) {
                    validEnemyPos = false;
                    continue;
                }

                for (let obstacle of this.obstacles) {
                    if (obstacle.checkCollision(enemyX, enemyY, 20)) {
                        validEnemyPos = false;
                        break;
                    }
                }
            }

            // Generate random patrol points
            const patrolX1 = Math.max(50, Math.min(this.width - 50, enemyX + this.rng.nextInt(-100, 100)));
            const patrolY1 = Math.max(50, Math.min(this.height - 50, enemyY + this.rng.nextInt(-100, 100)));
            const patrolX2 = Math.max(50, Math.min(this.width - 50, enemyX + this.rng.nextInt(-100, 100)));
            const patrolY2 = Math.max(50, Math.min(this.height - 50, enemyY + this.rng.nextInt(-100, 100)));

            const patrolPoints = [
                { x: patrolX1, y: patrolY1 },
                { x: patrolX2, y: patrolY2 },
            ];

            this.enemies.push(new Enemy(enemyX, enemyY, patrolPoints));
        }
    }

    resetGame() {
        console.log('Game reset! Old seed:', this.gameState.seed);
        this.gameState.reset();
        this.rng = new SeededRandom(this.gameState.seed);
        this.player = new Player(100, this.height / 2);
        this.weapon = new Weapon(this.player.weapon);
        this.enemies = [];
        this.obstacles = [];
        this.frameCount = 0;
        this.initializeMap();
        console.log('New seed:', this.gameState.seed);
    }

    update() {
        if (!this.gameState.isRunning) {
            this.draw();
            requestAnimationFrame(this.gameLoop);
            return;
        }

        this.frameCount++;

        // Update player
        this.player.update(this.keys, this.width, this.height, this.obstacles);
        this.weapon.update();

        // Update enemies
        this.enemies.forEach((enemy) => {
            if (enemy.isAlive()) {
                enemy.update(this.player, this.obstacles, this.enemies, this.frameCount);

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

    isBackShot(enemy) {
        // Calculate enemy facing direction
        const dx = this.player.x - enemy.x;
        const dy = this.player.y - enemy.y;
        const angleToPlayer = Math.atan2(dy, dx);

        // Enemy facing is based on where it's moving (patrol or chase direction)
        // For simplicity, assume enemy faces direction of movement
        let enemyFacing = Math.atan2(enemy.speed, 0); // Default
        if (enemy.movingToLastSeen && enemy.lastSeenPlayerPos) {
            const edx = enemy.lastSeenPlayerPos.x - enemy.x;
            const edy = enemy.lastSeenPlayerPos.y - enemy.y;
            enemyFacing = Math.atan2(edy, edx);
        } else if (enemy.alertLevel > 50) {
            enemyFacing = angleToPlayer;
        }

        // Check if angle difference is > 90 degrees (back shot)
        let angleDiff = Math.abs(enemyFacing - angleToPlayer);
        // Normalize angle difference
        while (angleDiff > Math.PI) angleDiff = Math.abs(angleDiff - Math.PI * 2);
        
        return angleDiff > Math.PI / 2; // 90 degrees
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

        // Check if bullet path is blocked by obstacles
        let bulletBlocked = false;
        for (let obstacle of this.obstacles) {
            if (obstacle.lineIntersects(this.player.x, this.player.y, mouseX, mouseY)) {
                bulletBlocked = true;
                break;
            }
        }

        // Draw bullet
        this.drawBullet(this.player.x, this.player.y, mouseX, mouseY);

        // Check hits on enemies (only if not blocked)
        if (!bulletBlocked) {
            this.enemies.forEach((enemy) => {
                const edx = enemy.x - this.player.x;
                const edy = enemy.y - this.player.y;
                const eDist = Math.hypot(edx, edy);

                if (eDist < this.weapon.range) {
                    // Check if bullet hits
                    const dotProduct = (dx * edx + dy * edy) / (distance * eDist);
                    if (dotProduct > 0.95) {
                        // Check if it's a back shot
                        const isBackShot = this.isBackShot(enemy);
                        enemy.takeDamage(this.weapon.damage, isBackShot);
                        
                        if (isBackShot) {
                            this.gameState.score += 25; // Bonus for back shot
                            this.gameState.backShotBonus = 30; // Display bonus for 30 frames
                        } else {
                            this.gameState.score += 10;
                        }
                    }
                }
            });
        }

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
                const isBackStab = this.isBackShot(enemy);
                enemy.takeDamage(this.player.meleeDamage, isBackStab);
                
                if (isBackStab) {
                    this.gameState.score += 50; // Bonus for back stab
                    this.gameState.backShotBonus = 30;
                } else {
                    this.gameState.score += 25;
                }
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
            // Check if bullet path is blocked
            let bulletBlocked = false;
            for (let obstacle of this.obstacles) {
                if (obstacle.lineIntersects(enemy.x, enemy.y, this.player.x, this.player.y)) {
                    bulletBlocked = true;
                    break;
                }
            }

            if (!bulletBlocked) {
                // Check hit
                if (Math.random() > 0.5) {
                    this.player.takeDamage(10);
                }
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

    drawAimLine() {
        // Draw line from player to cursor
        const dx = this.mouseX - this.player.x;
        const dy = this.mouseY - this.player.y;
        const distance = Math.hypot(dx, dy);

        if (distance === 0) return;

        // Check if path is blocked by obstacle
        let isBlocked = false;
        for (let obstacle of this.obstacles) {
            if (obstacle.lineIntersects(this.player.x, this.player.y, this.mouseX, this.mouseY)) {
                isBlocked = true;
                break;
            }
        }

        // Draw aim line with different colors based on whether it's blocked
        if (this.player.weapon === 'suppressed') {
            this.ctx.strokeStyle = isBlocked ? 'rgba(255, 100, 100, 0.5)' : 'rgba(0, 255, 100, 0.5)';
            this.ctx.lineWidth = 2;
            this.ctx.setLineDash([5, 5]); // Dashed line
            this.ctx.beginPath();
            this.ctx.moveTo(this.player.x, this.player.y);
            this.ctx.lineTo(this.mouseX, this.mouseY);
            this.ctx.stroke();
            this.ctx.setLineDash([]); // Reset line dash
        }
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

        // Draw last seen locations
        this.enemies.forEach((enemy) => {
            if (enemy.lastSeenPlayerPos && enemy.alertLevel > 20) {
                this.ctx.fillStyle = 'rgba(255, 100, 100, 0.3)';
                this.ctx.beginPath();
                this.ctx.arc(enemy.lastSeenPlayerPos.x, enemy.lastSeenPlayerPos.y, 30, 0, Math.PI * 2);
                this.ctx.fill();
                
                this.ctx.strokeStyle = 'rgba(255, 100, 100, 0.6)';
                this.ctx.lineWidth = 2;
                this.ctx.stroke();
            }
        });

        // Draw enemies
        this.enemies.forEach((enemy) => enemy.draw(this.ctx));

        // Draw aim line
        this.drawAimLine();

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

        this.ctx.fillStyle = '#ffaa00';
        this.ctx.font = '16px Arial';
        this.ctx.fillText('Press R to restart', this.width / 2, this.height / 2 + 70);
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

        this.ctx.fillStyle = '#ffaa00';
        this.ctx.font = '16px Arial';
        this.ctx.fillText('Press R to restart', this.width / 2, this.height / 2 + 70);
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

        // Update seed
        document.getElementById('seedStat').textContent = `🌱 Seed: ${this.gameState.seed}`;

        // Update back shot bonus display
        if (this.gameState.backShotBonus > 0) {
            document.getElementById('bonusStat').textContent = `💥 BACK SHOT! +25 BONUS!`;
            document.getElementById('bonusStat').style.display = 'block';
            this.gameState.backShotBonus--;
        } else {
            document.getElementById('bonusStat').style.display = 'none';
        }
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
