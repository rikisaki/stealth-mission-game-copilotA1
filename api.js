// ==================== GAME API / MODELS ====================

// ==================== SEEDED RANDOM NUMBER GENERATOR ====================
class SeededRandom {
    constructor(seed) {
        this.seed = seed;
    }

    next() {
        this.seed = (this.seed * 9301 + 49297) % 233280;
        return this.seed / 233280;
    }

    nextInt(min, max) {
        return Math.floor(this.next() * (max - min + 1)) + min;
    }

    nextFloat(min, max) {
        return this.next() * (max - min) + min;
    }
}

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
        this.lastMouseX = 0;
        this.lastMouseY = 0;
        this.lastFacingAngle = 0; // For back-shoot detection
    }

    update(keys, canvasWidth, canvasHeight, obstacles) {
        const oldX = this.x;
        const oldY = this.y;

        // Movement
        if (keys['ArrowUp'] || keys['w'] || keys['W']) this.y -= this.speed;
        if (keys['ArrowDown'] || keys['s'] || keys['S']) this.y += this.speed;
        if (keys['ArrowLeft'] || keys['a'] || keys['A']) this.x -= this.speed;
        if (keys['ArrowRight'] || keys['d'] || keys['D']) this.x += this.speed;

        // Update facing angle based on mouse position
        const dx = this.lastMouseX - this.x;
        const dy = this.lastMouseY - this.y;
        this.lastFacingAngle = Math.atan2(dy, dx);

        // Boundary check
        this.x = Math.max(10, Math.min(canvasWidth - 10, this.x));
        this.y = Math.max(10, Math.min(canvasHeight - 10, this.y));

        // Collision with obstacles
        for (let obstacle of obstacles) {
            if (obstacle.checkCollision(this.x, this.y, this.width / 2)) {
                this.x = oldX;
                this.y = oldY;
                break;
            }
        }

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
        this.suspicionRange = 200; // Extended range for suspicion
        this.alertLevel = 0; // 0 = relaxed, 1-50 = suspicious, 51-100 = alert
        this.suspiciousTime = 0; // Time spent suspicious
        this.patrolPoints = patrolPoints.length > 0 ? patrolPoints : [{ x, y }];
        this.currentPatrolIndex = 0;
        this.speed = 0.8; // Reduced from 1.5 to 0.8
        this.shootCooldown = 0;
        this.visionAngle = Math.PI * 0.8; // 144 degrees
        this.facingAngle = 0; // Direction enemy is facing
        this.lastSeenPlayerPos = null; // Last known player position
        this.lastSeenPlayerTime = 0; // When player was last seen
        this.reinforcementWaitTime = 0; // Time until this enemy goes to last seen location
        this.movingToLastSeen = false; // Currently moving to last seen location
        this.corpseDecayTime = 0; // For drawing this corpse
    }

    update(player, obstacles, allEnemies, frameCount) {
        if (!this.isAlive()) return;

        const oldX = this.x;
        const oldY = this.y;

        // Calculate distance to player
        const dx = player.x - this.x;
        const dy = player.y - this.y;
        const distance = Math.hypot(dx, dy);

        // Update facing angle based on movement direction
        if (this.movingToLastSeen && this.lastSeenPlayerPos) {
            const tdx = this.lastSeenPlayerPos.x - this.x;
            const tdy = this.lastSeenPlayerPos.y - this.y;
            this.facingAngle = Math.atan2(tdy, tdx);
        } else if (this.alertLevel > 50) {
            this.facingAngle = Math.atan2(dy, dx);
        } else if (this.patrolPoints.length > 0) {
            const targetPoint = this.patrolPoints[this.currentPatrolIndex];
            const pdx = targetPoint.x - this.x;
            const pdy = targetPoint.y - this.y;
            const pdist = Math.hypot(pdx, pdy);
            if (pdist > 0) {
                this.facingAngle = Math.atan2(pdy, pdx);
            }
        }

        // Check if player is in vision cone
        const playerDetected = this.canSeePlayer(player);
        const playerSuspicious = this.canSuspectPlayer(player);

        // Update alert level based on detection
        if (playerDetected && distance < this.detectionRange) {
            // Full alert - enemy sees player clearly
            this.alertLevel = Math.min(100, this.alertLevel + 5);
            this.lastSeenPlayerPos = { x: player.x, y: player.y };
            this.lastSeenPlayerTime = frameCount;
            this.suspiciousTime = 0;
            this.chasePlayer(player);
        } else if (playerSuspicious && distance < this.suspicionRange) {
            // Suspicious - might be player
            if (this.alertLevel < 50) {
                this.alertLevel = Math.min(50, this.alertLevel + 2);
                this.suspiciousTime++;
            }
            // Mark last seen location when becoming suspicious
            if (this.alertLevel >= 40 && !this.lastSeenPlayerPos) {
                this.lastSeenPlayerPos = { x: player.x, y: player.y };
                this.lastSeenPlayerTime = frameCount;
            }
        } else {
            // Relaxed state
            this.alertLevel = Math.max(0, this.alertLevel - 0.5);
            this.suspiciousTime = 0;
        }

        // Check if should go to last seen location (Sniper Elite mechanic)
        if (this.lastSeenPlayerPos && frameCount - this.lastSeenPlayerTime > 1800) { // 30 seconds at 60fps
            this.reinforcementWaitTime = 0;
            this.movingToLastSeen = true;
        }

        // AI behavior based on alert level
        if (this.alertLevel > 50) {
            this.chasePlayer(player);
        } else if (this.movingToLastSeen && this.lastSeenPlayerPos) {
            this.moveToLocation(this.lastSeenPlayerPos);
        } else if (this.alertLevel > 20) {
            // Suspicious - search around
            this.patrol();
        } else {
            // Normal patrol
            this.patrol();
        }

        // Collision with obstacles
        for (let obstacle of obstacles) {
            if (obstacle.checkCollision(this.x, this.y, this.width / 2)) {
                this.x = oldX;
                this.y = oldY;
                break;
            }
        }

        // Check for nearby corpses and become alert
        this.checkForCorpses(allEnemies);

        this.shootCooldown = Math.max(0, this.shootCooldown - 1);
    }

    canSeePlayer(player) {
        const dx = player.x - this.x;
        const dy = player.y - this.y;
        const distance = Math.hypot(dx, dy);

        if (distance > this.detectionRange) return false;

        // Check if player is in front of enemy (vision cone)
        const angleToPlayer = Math.atan2(dy, dx);
        let angleDiff = angleToPlayer - this.facingAngle;
        
        // Normalize angle difference to [-PI, PI]
        while (angleDiff > Math.PI) angleDiff -= Math.PI * 2;
        while (angleDiff < -Math.PI) angleDiff += Math.PI * 2;

        // Check if within vision cone (120 degrees = PI * 2/3)
        const visionHalfAngle = Math.PI / 3; // 60 degrees on each side
        return Math.abs(angleDiff) < visionHalfAngle;
    }

    canSuspectPlayer(player) {
        const dx = player.x - this.x;
        const dy = player.y - this.y;
        const distance = Math.hypot(dx, dy);

        if (distance > this.suspicionRange) return false;
        return true;
    }

    checkForCorpses(allEnemies) {
        // Check nearby enemies for corpses
        allEnemies.forEach((other) => {
            if (other !== this && !other.isAlive() && other.corpseDecayTime > 0) {
                const dx = other.x - this.x;
                const dy = other.y - this.y;
                const distance = Math.hypot(dx, dy);

                // If corpse is nearby and recently died, become alert
                if (distance < 150) {
                    this.alertLevel = Math.min(100, this.alertLevel + 3);
                    this.lastSeenPlayerPos = { x: other.x, y: other.y }; // Investigate corpse location
                    this.lastSeenPlayerTime = Date.now();
                }
            }
        });
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

    moveToLocation(location) {
        const dx = location.x - this.x;
        const dy = location.y - this.y;
        const distance = Math.hypot(dx, dy);

        if (distance < 15) {
            // Reached location, look around
            this.movingToLastSeen = false;
            return;
        }

        if (distance > 0) {
            this.x += (dx / distance) * this.speed;
            this.y += (dy / distance) * this.speed;
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

    takeDamage(damage, isBackShot = false) {
        const finalDamage = isBackShot ? damage * 2 : damage; // Double damage for back shots
        this.health -= finalDamage;
        this.alertLevel = 100; // Alert on damage
    }

    isAlive() {
        return this.health > 0;
    }

    draw(ctx) {
        // Draw enemy based on alert level
        let color = '#ffaa00'; // Orange - relaxed
        if (this.alertLevel >= 50) {
            color = '#ff0000'; // Red - alert
        } else if (this.alertLevel >= 20) {
            color = '#ff6600'; // Dark orange - suspicious
        }

        ctx.fillStyle = color;
        ctx.fillRect(this.x - this.width / 2, this.y - this.height / 2, this.width, this.height);

        // Draw facing direction indicator
        const arrowLength = 12;
        ctx.strokeStyle = color;
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.moveTo(this.x, this.y);
        ctx.lineTo(
            this.x + Math.cos(this.facingAngle) * arrowLength,
            this.y + Math.sin(this.facingAngle) * arrowLength
        );
        ctx.stroke();

        // Draw vision cone when alert
        if (this.alertLevel > 30) {
            const visionHalfAngle = Math.PI / 3; // 60 degrees
            const visionRange = this.detectionRange;
            ctx.strokeStyle = `rgba(255, 100, 100, ${this.alertLevel / 100 * 0.4})`;
            ctx.lineWidth = 1;
            ctx.beginPath();
            ctx.arc(this.x, this.y, visionRange, this.facingAngle - visionHalfAngle, this.facingAngle + visionHalfAngle);
            ctx.stroke();
            ctx.beginPath();
            ctx.moveTo(this.x, this.y);
            ctx.lineTo(
                this.x + Math.cos(this.facingAngle - visionHalfAngle) * visionRange,
                this.y + Math.sin(this.facingAngle - visionHalfAngle) * visionRange
            );
            ctx.stroke();
            ctx.beginPath();
            ctx.moveTo(this.x, this.y);
            ctx.lineTo(
                this.x + Math.cos(this.facingAngle + visionHalfAngle) * visionRange,
                this.y + Math.sin(this.facingAngle + visionHalfAngle) * visionRange
            );
            ctx.stroke();
        }

        // Draw health bar
        const barWidth = 20;
        const barHeight = 3;
        ctx.fillStyle = '#ff0000';
        ctx.fillRect(this.x - barWidth / 2, this.y - 15, barWidth, barHeight);
        ctx.fillStyle = '#00ff00';
        ctx.fillRect(this.x - barWidth / 2, this.y - 15, (this.health / this.maxHealth) * barWidth, barHeight);

        // Draw suspicion indicator (!) when suspicious
        if (this.alertLevel >= 20 && this.alertLevel < 50) {
            ctx.fillStyle = '#ffff00';
            ctx.font = 'bold 14px Arial';
            ctx.textAlign = 'center';
            ctx.fillText('?', this.x, this.y - 25);
        }

        // Draw alert indicator (!) when fully alert
        if (this.alertLevel >= 50) {
            ctx.fillStyle = '#ff0000';
            ctx.font = 'bold 14px Arial';
            ctx.textAlign = 'center';
            ctx.fillText('!', this.x, this.y - 25);
        }

        // Draw moving to last seen indicator
        if (this.movingToLastSeen && this.lastSeenPlayerPos) {
            ctx.strokeStyle = 'rgba(255, 100, 100, 0.5)';
            ctx.lineWidth = 1;
            ctx.setLineDash([3, 3]);
            ctx.beginPath();
            ctx.moveTo(this.x, this.y);
            ctx.lineTo(this.lastSeenPlayerPos.x, this.lastSeenPlayerPos.y);
            ctx.stroke();
            ctx.setLineDash([]);
        }
    }
}

// ==================== CORPSE MODEL ====================
class Corpse {
    constructor(x, y) {
        this.x = x;
        this.y = y;
        this.width = 20;
        this.height = 20;
        this.decayTime = 300; // Frames until corpse disappears (5 seconds at 60fps)
        this.maxDecayTime = 300;
    }

    update() {
        this.decayTime--;
    }

    isDecayed() {
        return this.decayTime <= 0;
    }

    draw(ctx) {
        const alpha = this.decayTime / this.maxDecayTime;
        ctx.fillStyle = `rgba(139, 69, 19, ${alpha * 0.8})`; // Brown with fading alpha
        ctx.fillRect(this.x - this.width / 2, this.y - this.height / 2, this.width, this.height);

        // Draw X pattern on corpse
        ctx.strokeStyle = `rgba(100, 40, 10, ${alpha})`;
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.moveTo(this.x - this.width / 2, this.y - this.height / 2);
        ctx.lineTo(this.x + this.width / 2, this.y + this.height / 2);
        ctx.stroke();
        ctx.beginPath();
        ctx.moveTo(this.x + this.width / 2, this.y - this.height / 2);
        ctx.lineTo(this.x - this.width / 2, this.y + this.height / 2);
        ctx.stroke();
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

    // Line-to-rectangle intersection (for bullet collision)
    lineIntersects(x1, y1, x2, y2) {
        // Check if line from (x1,y1) to (x2,y2) intersects this rectangle
        const dx = x2 - x1;
        const dy = y2 - y1;
        const length = Math.hypot(dx, dy);
        
        if (length === 0) return false;

        for (let t = 0; t <= 1; t += 0.1) {
            const px = x1 + dx * t;
            const py = y1 + dy * t;
            
            if (px > this.x && px < this.x + this.width &&
                py > this.y && py < this.y + this.height) {
                return true;
            }
        }
        return false;
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
        this.seed = Math.floor(Math.random() * 1000000);
        this.backShotBonus = 0; // Track recent back shot bonus
    }

    reset() {
        this.isRunning = true;
        this.gameOver = false;
        this.missionComplete = false;
        this.score = 0;
        this.seed = Math.floor(Math.random() * 1000000); // New seed for next game
        this.backShotBonus = 0;
    }

    addScore(points) {
        this.score += points;
    }
}
