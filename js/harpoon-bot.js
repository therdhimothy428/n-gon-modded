(function() {
	console.log("Loading harpoon-bot mod...");
	let addBot = {
		harpoonBot(position, isKeep) {
			if (!isKeep) {
				let bot = {
					position: { x: position.x, y: position.y },
					velocity: { x: 0, y: 0 },
					radius: 40,
					maxHealth: 100,
					health: 100,
					isBadTarget: true,
					isInvulnerable: false,
					damageReduction: 0.1,
					isBot: true,
					botType: "harpoon",
					cannonAngleRNG: 0,
					lastAngleRNG: 0,
					fireCycle: 0,
					fireRate: 90,
					do() {
						let x = this.position.x;
						let y = this.position.y;
						let dx = player.position.x - x;
						let dy = player.position.y - y;
						let distance = Math.sqrt(dx * dx + dy * dy);
						const orbitRadius = 500;
						const maxDistance = orbitRadius + 200;
						if (distance > maxDistance) {
							let moveAngle = Math.atan2(dy, dx);
							let moveSpeed = 2;
							this.velocity.x = Math.cos(moveAngle) * moveSpeed * (1 - maxDistance / distance);
							this.velocity.y = Math.sin(moveAngle) * moveSpeed * (1 - maxDistance / distance);
						} else if(distance < orbitRadius - 200) {
							let moveAngle = Math.atan2(dy, dx) + Math.PI;
							let moveSpeed = 1;
							this.velocity.x = Math.cos(moveAngle) * moveSpeed;
							this.velocity.y = Math.sin(moveAngle) * moveSpeed;
						} else {
							this.velocity.x *= 0.95;
							this.velocity.y *= 0.95;
						}
						this.position.x += this.velocity.x;
						this.position.y += this.velocity.y;
						this.fireCycle++;
						if (this.fireCycle > this.fireRate && mob.length > 0) {
							let closestMob = undefined;
							let closestDistance = 2000;
							for (let i = 0; i < mob.length; i++) {
								if (mob[i].alive && (!mob[i].isBadTarget || mob[i].isMobBullet)) {
									let dist = Vector.magnitude(Vector.sub(this.position, mob[i].position));
									if (dist < closestDistance) {
										closestDistance = dist;
										closestMob = mob[i];
									}
								}
							}
							if (closestMob) {
								let harpoonAngle = Math.atan2(closestMob.position.y - this.position.y, closestMob.position.x - this.position.x);
								b.botHarpoon(Vector.clone(this.position), harpoonAngle, false, this);
								this.fireCycle = 0;
							}
						}
						ctx.beginPath();
						ctx.arc(this.position.x, this.position.y, this.radius, 0, 2 * Math.PI);
						ctx.fillStyle = "rgba(100, 100, 255, 0.7)";
						ctx.fill();
						ctx.strokeStyle = "rgba(150, 150, 255, 1)";
						ctx.lineWidth = 3;
						ctx.stroke();
					},
					damage(amount) {
						this.health -= amount;
						if (this.health <= 0) {
							const index = mob.indexOf(this);
							if (index !== -1) {
								mob.splice(index, 1);
							}
						}
					}
				};
				mob.push(bot);
				return bot;
			}
		},
		botHarpoon(position, angle, isSmall) {
			let harpoon = {
				position: { x: position.x, y: position.y },
				velocity: { x: Math.cos(angle) * 8, y: Math.sin(angle) * 8 },
				angle: angle,
				radius: isSmall ? 15 : 25,
				maxHealth: 50,
				health: 50,
				alive: true,
				isBot: true,
				parentBot: undefined,
				grabRadius: 300,
				damageDone: m.damageDone ? m.damageDone : m.dmgScale,
				rebar: tech.isRebarHarpoon ? true : false,
				ropes: [],
				do() {
					if (this.parentBot && !this.parentBot.alive) {
						this.parentBot = undefined;
					}
					this.position.x += this.velocity.x;
					this.position.y += this.velocity.y;
					this.velocity.x *= 0.98;
					this.velocity.y *= 0.98;
					let closestObstacle = undefined;
					let closestDistance = Infinity;
					let closestFamily = undefined;
					const query = Matter.Bodies.circle(this.position.x, this.position.y, this.radius);
					query.collisionFilter.category = cat.mobBullet;
					query.collisionFilter.mask = cat.bullet | cat.mob | cat.powerup | cat.body | cat.map | cat.mobBullet;
					for (let k = 0; k < map.length; k++) {
						if (Matter.SAT.collides(query, map[k]).collided) {
							this.health = 0;
							return;
						}
					}
					let foamFragmentCount = 0;
					for (let k = 0; k < mob.length; k++) {
						if (mol[k].alive && mol[k] !== this) {
							if (Matter.SAT.collides(query, mol[k]).collided && (!mol[k].isBadTarget || mol[k].isMobBullet) && !mol[k].isInvulnerable && mol[k].damageReduction >= 0) {
								let dmg = (this.damageDone * 0.05) * (m.health > 0.01 ? 2 : 1) * (this.rebar ? 1.5 : 1);
								mol[k].damage(dmg, true);
								mol[k].locatePlayer();
								foamFragmentCount = 10;
								this.health = 0;
								if (tech.isFoamBall) {
									for (let i = 0; i < foamFragmentCount; i++) {
										let angle = (i / foamFragmentCount) * 2 * Math.PI;
										let bounceBullet = {
											position: { x: this.position.x, y: this.position.y },
											velocity: { x: Math.cos(angle) * 3, y: Math.sin(angle) * 3 },
											angle: angle,
											radius: 5,
											alive: true,
											dmgScale: this.damageDone * 0.02,
											do() {
												this.position.x += this.velocity.x;
												this.position.y += this.velocity.y;
												this.velocity.x *= 0.98;
												this.velocity.y *= 0.98;
												if (this.velocity.x * this.velocity.x + this.velocity.y * this.velocity.y < 0.01) {
													this.alive = false;
												}
												for (let k = 0; k < mob.length; k++) {
													if (mob[k].alive && mob[k] !== this) {
														if (Math.pow(this.position.x - mob[k].position.x, 2) + Math.pow(this.position.y - mob[k].position.y, 2) < Math.pow(this.radius + mob[k].radius, 2)) {
															mob[k].damage(this.dmgScale);
															this.alive = false;
														}
													}
												}
												ctx.beginPath();
												ctx.arc(this.position.x, this.position.y, this.radius, 0, 2 * Math.PI);
												ctx.fillStyle = "rgba(255, 192, 203, 0.5)";
												ctx.fill();
												ctx.strokeStyle = "rgba(255, 160, 200, 0.8)";
												ctx.lineWidth = 2;
												ctx.stroke();
											},
											remove() {
												const index = bullet.indexOf(this);
												if (index !== -1) {
													bullet.splice(index, 1);
												}
											}
										};
										bullet.push(bounceBullet);
									}
								}
								return;
							}
						}
					}
					for (let k = 0; k < powerUps.active.length; k++) {
						if (Math.pow(this.position.x - powerUps.active[k].position.x, 2) + Math.pow(this.position.y - powerUps.active[k].position.y, 2) < Math.pow(this.grabRadius, 2)) {
							powerUps.active[k].position = this.position;
							let grabAngle = Math.atan2(player.position.y - this.position.y, player.position.x - this.position.x);
							this.velocity.x = Math.cos(grabAngle) * 5;
							this.velocity.y = Math.sin(grabAngle) * 5;
							this.ropes.push({
								targetPowerUp: powerUps.active[k]
							});
						}
					}
					let x = this.position.x;
					let y = this.position.y;
					let numSides = this.rebar ? 8 : 6;
					ctx.beginPath();
					for (let i = 0; i < numSides; i++) {
						let angle = (i / numSides) * 2 * Math.PI + (Math.PI / numSides);
						let px = x + this.radius * Math.cos(angle);
						let py = y + this.radius * Math.sin(angle);
						if (i === 0) {
							ctx.moveTo(px, py);
						} else {
							ctx.lineTo(px, py);
						}
					}
					ctx.closePath();
					ctx.fillStyle = this.rebar ? "rgba(100, 100, 100, 0.8)" : "rgba(100, 150, 255, 0.8)";
					ctx.fill();
					ctx.strokeStyle = this.rebar ? "rgba(150, 150, 150, 1)" : "rgba(200, 200, 255, 1)";
					ctx.lineWidth = 3;
					ctx.stroke();
					if (this.parentBot) {
						ctx.beginPath();
						ctx.moveTo(this.position.x, this.position.y);
						ctx.lineTo(this.parentBot.position.x, this.parentBot.position.y);
						ctx.strokeStyle = "rgba(100, 150, 255, 0.5)";
						ctx.lineWidth = 2;
						ctx.stroke();
					}
					for (let i = 0; i < this.ropes.length; i++) {
						if (this.ropes[i].targetPowerUp && this.ropes[i].targetPowerUp].alive) {
							ctx.beginPath();
							ctx.moveTo(this.position.x, this.position.y);
							ctx.lineTo(this.ropes[i].targetPowerUp.position.x, this.ropes[i].targetPowerUp.position.y);
							ctx.strokeStyle = "rgba(255, 150, 100, 0.7)";
							ctx.lineWidth = 3;
							ctx.stroke();
						} else {
							this.ropes.splice(i, 1);
							i--;
						}
					}
					if (Math.pow(this.velocity.x, 2) + Math.pow(this.velocity.y, 2) < 0.1) {
						if (this.parentBot) {
							this.velocity.x = Math.cos(this.angle + Math.PI) * 3;
							this.velocity.y = Math.sin(this.angle + Math.PI) * 3;
							this.returnToPlayer = true;
						}
					}
					if (this.returnToPlayer) {
						let grabAngle = Math.atan2(this.parentBot.position.y - this.position.y, this.parentBot.position.x - this.position.x);
						this.velocity.x += Math.cos(grabAngle) * 0.5;
						this.velocity.y += Math.sin(grabAngle) * 0.5;
						let distToParent = Math.hypot(this.parentBot.position.x - this.position.x, this.parentBot.position.y - this.position.y);
						if (distToParent < 50) {
							this.health = 0;
						}
					}
					if (this.health <= 0) {
						this.alive = false;
						return;
					}
				},
				remove() {
					const index = bullet.indexOf(this);
					if (index !== -1) {
						bullet.splice(index, 1);
					}
				}
			};
			bullet.push(harpoon);
			return harpoon;
		}
	};
	Object.assign(b, addBot);
	const t = [
		{
			name: "harpoon-bot",
			descriptionFunction() {
				return `spawn a friendly <b style="color: rgb(100, 150, 255);">harpoon bot</b><br>it <b>fires returning harpoons</b> at nearby mobs`
			},
			maxCount: 9,
			count: 0,
			frequency: 2,
			frequencyDefault: 2,
			allowed() {
				return true;
			},
			effect() {
				tech.harpoonBotUpgrade = this.count;
				b.harpoonBot(player.position, false);
			},
			remove() {
				tech.harpoonBotUpgrade = this.count;
			}
		},
		{
			name: "harpoon-bot upgrade",
			descriptionFunction() {
				return `<b>harpoon bots</b> fire <b class="color-d">rebar harpoons</b><br><b>1.5x</b> <b class="color-d">damage</b>`
			},
			maxCount: 1,
			count: 0,
			frequency: 2,
			frequencyDefault: 2,
			allowed() {
				return tech.harpoonBotUpgrade > 0;
			},
			effect() {
				tech.isRebarHarpoon = true;
			},
			remove() {
				tech.isRebarHarpoon = false;
			}
		}
	];
	t.reverse();
	for(let i = 0; i < tech.tech.length; i++) {
		if(tech.tech[i].name === 'perimeter defense') {
			for(let j = 0; j < t.length; j++) {
				tech.tech.splice(i, 0, t[j]);
			}
			break;
		}
	}
	const techArray = tech.tech.filter(
		(obj, index, self) =>
			index === self.findIndex((item) => item.name === obj.name)
		);
	tech.tech = techArray;
	console.log("%cHarpoon bot mod successfully installed", "color: crimson");
})();
