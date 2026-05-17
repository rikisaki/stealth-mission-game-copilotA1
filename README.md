# 🎮 Stealth Mission Game

A DIY stealth-focused game built with HTML5 Canvas and JavaScript. Eliminate all enemies using stealth tactics, suppressed weapons, and melee takedowns without being detected!

## 🎯 Objective
Eliminate all enemies while maintaining your cover. Get detected and it's game over!

## 🎮 Controls

| Action | Keys |
|--------|------|
| **Move Up** | Arrow Up / W |
| **Move Down** | Arrow Down / S |
| **Move Left** | Arrow Left / A |
| **Move Right** | Arrow Right / D |
| **Melee Attack** | Spacebar |
| **Switch Weapon** | E |
| **Shoot (Suppressed)** | Click on target |

## 🎪 Game Features

### Player Mechanics
- **Stealth System**: Detection level increases when enemies see you
- **Health System**: Limited health - avoid direct combat
- **Dual Weapons**:
  - 🔫 **Suppressed Rifle**: Ranged attack with minimal detection
  - 🔪 **Melee Knife**: Silent takedowns with short range
- **Movement**: Stay still to reduce detection level

### Enemy AI
- **Patrol Behavior**: Enemies follow patrol routes when relaxed
- **Detection System**: Visual range-based enemy detection
- **Alert Levels**: 
  - 🟢 Relaxed: Patrolling normally
  - 🟡 Alert: Suspicious, searching
  - 🔴 Combat: Full alert, attacking

### Game Mechanics
- **Detection Meter**: Shows your current detection status
- **Score System**: Earn points for eliminating enemies
- **Map Obstacles**: Use environment for cover and stealth
- **Mission Complete**: Eliminate all 5 enemies to win

## 📁 File Structure

```
stealth-mission-game-copilotA1/
├── index.html          # Main game HTML
├── api.js              # Game models (Player, Enemy, Weapon, etc.)
├── game.js             # Game controller and game loop
└── README.md           # This file
```

## 🔧 API Models

### Player Model
```javascript
player.x, player.y              // Position
player.health                   // Current health (0-100)
player.detectionLevel          // Detection level (0-100)
player.weapon                  // Current weapon: 'suppressed' | 'melee'
player.attack()                // Perform melee attack
player.switchWeapon()          // Toggle weapon
player.takeDamage(damage)      // Take damage
```

### Enemy Model
```javascript
enemy.x, enemy.y               // Position
enemy.health                   // Current health
enemy.alertLevel               // Alert state (0-100)
enemy.isDetected               // Is player detected?
enemy.detectionRange           // Range of vision (150 pixels)
enemy.takeDamage(damage)       // Deal damage to enemy
```

### Weapon Model
```javascript
weapon.type                    // 'suppressed' | 'melee'
weapon.damage                  // Damage per shot
weapon.range                   // Effective range
weapon.detectionLevel          // How much detection it causes
```

### Obstacle Model
```javascript
obstacle.x, obstacle.y         // Position
obstacle.width, obstacle.height // Dimensions
obstacle.checkCollision()      // Collision detection
```

## 🎨 Color Coding

| Color | Meaning |
|-------|----------|
| 🟢 Green | Player / Safe stealth status |
| 🟠 Orange | Enemy (relaxed) |
| 🔴 Red | Enemy (alerted) |
| ⚫ Gray | Obstacles |
| 🟡 Yellow | Bullets (suppressed rifle) |

## 🏆 Scoring

- **Melee Takedown**: +25 points
- **Suppressed Rifle Shot**: +10 points
- **Mission Complete Bonus**: +100 points

## 💡 Tips & Tricks

1. **Use Stealth**: Stay behind enemies and approach from the shadows
2. **Melee Takedowns**: Silent and clean - no detection increase
3. **Suppressed Weapons**: Quieter than loud weapons (if implemented)
4. **Environment**: Use obstacles to break line of sight
5. **Movement**: Stay still when enemies are near to reduce detection
6. **Patrol Routes**: Learn enemy patrol patterns and strike when they're isolated

## 🚀 How to Play

1. Open `index.html` in a web browser
2. Use arrow keys or WASD to move your character (green square)
3. Click to shoot with suppressed rifle OR press Spacebar for melee attacks
4. Press E to switch between weapons
5. Avoid being detected by enemies (orange/red squares)
6. Eliminate all 5 enemies to complete the mission!

## 🔮 Future Enhancements

- [ ] Sound effects and audio warnings
- [ ] Difficulty levels (Easy, Normal, Hard)
- [ ] More complex missions and maps
- [ ] NPC dialogue and audio cues
- [ ] Power-ups (health, ammo, etc.)
- [ ] Multiple mission levels
- [ ] Leaderboard system
- [ ] Better graphics and animations
- [ ] Mobile touch controls

## 📝 License

Free to use and modify for educational and entertainment purposes.

---

**Enjoy your stealth mission! Stay quiet, stay hidden, and complete your objective! 🎮**
