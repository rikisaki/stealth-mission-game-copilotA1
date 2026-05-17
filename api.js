// ==================== GAME API / MODELS ====================

// ==================== PLAYER MODEL ====================
class Player {
    constructor(x, y) {
        this.x = x;
        this.y = y;
        this.width = 20;
        this.height = 20;
        this.health = 100;
        this.detectionLevel = 0;
        this.weapon = 'suppressed'; // 'suppressed' or 'melee'
        this.speed = 3;
        this.meleeRange = 40;
        this.meleeDamage = 50;
        this.meleeAttackCooldown = 0;
        this.baseDetectionReduction = 0.5; // Stealth reduction per frame when still
    }

    update(keys, canvasWidth, canvasHeight) {
        const oldX = this.x;
        const oldY = this.y;

        // Movement
        if (keys['ArrowUp'] || keys['w'] || keys['W']) this.y -= this.speed;
        if (keys['ArrowDown'] || keys['s'] || keys['S']) this.y += this.speed;
        if (keys['ArrowLeft'] || keys['a'] || keys['A']) this.x -= this.speed;
        if (keys['ArrowRight'] || keys['d'] || keys['D']) this.x += this.speed;

        // Boundary check
        this.x = Math.max(10, Math.min(canvasWidth - 10, this.x));
        this.y = Math.max(10, Math.min(canvasHeight - 10, this.y));

        // If moving, increase detection; if still, decrease it
        if (this.x !== oldX || this.y !== oldY) {
            this.detectionLevel += 1; // Movement increases detection
        } else {
            this.detectionLevel = Math.max(0, this.detectionLevel - this.baseDetectionReduction);
        }

        this.detectionLevel = Math.max(0, Math.min(100, this.detectionLevel));

        // Cooldown management
        if (this.meleeAttackCooldown > 0) this.meleeAttackCooldown--;
    }

    attack() {
        if (this.weapon === 'melee' && this.meleeAttackCooldown <= 0) {
            this.meleeAttackCooldown = 30; // 30 frame cooldown
            return true;
        }
        return false;
    }

    switchWeapon() {
        this.weapon = this.weapon === 'suppressed' ? 'melee' : 'suppressed';
        console.log('Switched to:', this.weapon);
    }

    takeDamage(damage) {
        this.health -= damage;
        if (this.health <= 0) {
            this.health = 0;
        }
    }

    isAlive() {
        return this.health > 0;
    }

    draw(ctx) {
        // Draw player
        ctx.fillStyle = '#00ff00';
        ctx.fillRect(this.x - this.width / 2, this.y - this.height / 2, this.width, this.height);

        // Draw detection radius indicator
        ctx.strokeStyle = `rgba(255, ${255 - this.detectionLevel * 2}, 0, 0.3)`;
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.arc(this.x, this.y, 100, 0, Math.PI * 2);
        ctx.stroke();

        // Draw health bar above player
        const barWidth = 30;
        const barHeight = 4;
        ctx.fillStyle = '#ff0000';
        ctx.fillRect(this.x - barWidth / 2, this.y - 20, barWidth, barHeight);
        ctx.fillStyle = '#00ff00';
        ctx.fillRect(this.x - barWidth / 2, this.y - 20, (this.health / 100) * barWidth, barHeight);
    }
}

// ==================== ENEMY MODEL ====================
class Enemy {
    constructor(x, y, patrolPoints = []) {
        this.x = x;
        this.y = y;
        this.width = 20;
        this.height = 20;
        this.health = 50;
        this.maxHealth = 50;
        this.detectionRange = 150;
        this.alertLevel = 0;
        this.patrolPoints = patrolPoints.length > 0 ? patrolPoints : [{ x, y }];
        this.currentPatrolIndex = 0;
        this.speed = 1.5;
        this.shootCooldown = 0;
        this.visionAngle = Math.PI * 0.8; // 144 degrees
    }

    update(player, obstacles) {
        if (!this.isAlive()) return;

        // Calculate distance to player
        const dx = player.x - this.x;
        const dy = player.y - this.y;
        const distance = Math.hypot(dx, dy);

        // Check if player is in detection range
        const playerDetected = this.canSeePlayer(player);

        if (playerDetected && distance < this.detectionRange) {
            this.alertLevel = Math.min(100, this.alertLevel + 5);
            this.chasePlayer(player);
        } else {
            this.alertLevel = Math.max(0, this.alertLevel - 1);
            this.patrol();
        }

        this.shootCooldown = Math.max(0, this.shootCooldown - 1);
    }

    canSeePlayer(player) {
        const dx = player.x - this.x;
        const dy = player.y - this.y;
        const distance = Math.hypot(dx, dy);

        if (distance > this.detectionRange) return false;

        // Check line of sight (simple: no obstacles for now)
        // In a real game, you'd check for obstacles blocking vision
        return true;
    }

    chasePlayer(player) {
        const dx = player.x - this.x;
        const dy = player.y - this.y;
        const distance = Math.hypot(dx, dy);

        if (distance > 0) {
            this.x += (dx / distance) * this.speed * 1.5;
            this.y += (dy / distance) * this.speed * 1.5;
        }
    }

    patrol() {
        if (this.patrolPoints.length === 0) return;

        const targetPoint = this.patrolPoints[this.currentPatrolIndex];
        const dx = targetPoint.x - this.x;
        const dy = targetPoint.y - this.y;
        const distance = Math.hypot(dx, dy);

        if (distance < 10) {
            this.currentPatrolIndex = (this.currentPatrolIndex + 1) % this.patrolPoints.length;
        } else {
            this.x += (dx / distance) * this.speed;
            this.y += (dy / distance) * this.speed;
        }
    }

    takeDamage(damage) {
        this.health -= damage;
        this.alertLevel = 100; // Alert on damage
    }

    isAlive() {
        return this.health > 0;
    }

    draw(ctx) {
        // Draw enemy based on alert level
        if (this.alertLevel < 33) {
            ctx.fillStyle = '#ffaa00'; // Orange - relaxed
        } else if (this.alertLevel < 66) {
            ctx.fillStyle = '#ff6600'; // Dark orange - alert
        } else {
            ctx.fillStyle = '#ff0000'; // Red - combat
        }

        ctx.fillRect(this.x - this.width / 2, this.y - this.height / 2, this.width, this.height);

        // Draw health bar
        const barWidth = 20;
        const barHeight = 3;
        ctx.fillStyle = '#ff0000';
        ctx.fillRect(this.x - barWidth / 2, this.y - 15, barWidth, barHeight);
        ctx.fillStyle = '#00ff00';
        ctx.fillRect(this.x - barWidth / 2, this.y - 15, (this.health / this.maxHealth) * barWidth, barHeight);

        // Draw detection range when alerted
        if (this.alertLevel > 50) {
            ctx.strokeStyle = `rgba(255, 0, 0, ${this.alertLevel / 100 * 0.3})`;
            ctx.lineWidth = 1;
            ctx.beginPath();
            ctx.arc(this.x, this.y, this.detectionRange, 0, Math.PI * 2);
            ctx.stroke();
        }
    }
}

// ==================== WEAPON MODEL ====================
class Weapon {
    constructor(type = 'suppressed') {
        this.type = type; // 'suppressed' or 'melee'

        if (type === 'suppressed') {
            this.damage = 25;
            this.range = 500;
            this.detectionLevel = 15; // Suppressed weapon causes less detection
            this.fireRate = 10; // Frames between shots
        } else {
            this.damage = 50;
            this.range = 40;
            this.detectionLevel = 0; // Silent melee
            this.fireRate = 30;
        }

        this.lastFireFrame = 0;
        this.currentFrame = 0;
    }

    update() {
        this.currentFrame++;
    }

    fire() {
        if (this.currentFrame - this.lastFireFrame >= this.fireRate) {
            this.lastFireFrame = this.currentFrame;
            return true;
        }
        return false;
    }

    getStats() {
        return {
            type: this.type,
            damage: this.damage,
            range: this.range,
            detectionLevel: this.detectionLevel,
        };
    }
}

// ==================== OBSTACLE MODEL ====================
class Obstacle {
    constructor(x, y, width, height) {
        this.x = x;
        this.y = y;
        this.width = width;
        this.height = height;
    }

    checkCollision(x, y, radius = 10) {
        return (
            x + radius > this.x &&
            x - radius < this.x + this.width &&
            y + radius > this.y &&
            y - radius < this.y + this.height
        );
    }

    draw(ctx) {
        ctx.fillStyle = '#666666';
        ctx.fillRect(this.x, this.y, this.width, this.height);

        // Draw border
        ctx.strokeStyle = '#888888';
        ctx.lineWidth = 2;
        ctx.strokeRect(this.x, this.y, this.width, this.height);
    }
}

// ==================== GAME STATE MODEL ====================
class GameState {
    constructor() {
        this.isRunning = true;
        this.gameOver = false;
        this.missionComplete = false;
        this.score = 0;
        this.level = 1;
        this.totalEnemiesEliminated = 0;
    }

    reset() {
        this.isRunning = true;
        this.gameOver = false;
        this.missionComplete = false;
        this.score = 0;
    }

    addScore(points) {
        this.score += points;
    }
}
