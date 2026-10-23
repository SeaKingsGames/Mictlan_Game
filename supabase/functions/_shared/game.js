/* @ts-self-types="./game.d.ts" */ // GENERADO por 'npm run build:server'. No lo edites a mano.

// src/core/rng.ts
function createRng(seed) {
  let a = seed >>> 0;
  return () => {
    a = a + 1831565813 >>> 0;
    let t = a;
    t = Math.imul(t ^ t >>> 15, t | 1);
    t ^= t + Math.imul(t ^ t >>> 7, t | 61);
    return ((t ^ t >>> 14) >>> 0) / 4294967296;
  };
}
function shuffle(items, rng) {
  for (let i = items.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    [items[i], items[j]] = [items[j], items[i]];
  }
  return items;
}

// src/data/cards.json
var cards_default = [
  { id: 1, name: "Ocelote joven", description: "Cachorro de la selva. Con 3 copias asciende a Ocelote cazador.", type: "monster", attribute: "tierra", tags: ["jaguar", "bestia"], atk: 800, def: 600, rarity: "N", art: "/cards/1.webp", ascendsTo: 79 },
  { id: 2, name: "Macehual con macuahuitl", description: "Guerrero del pueblo armado con obsidiana. Con 3 copias asciende a Macehual veterano.", type: "monster", attribute: "tierra", tags: ["guerrero"], atk: 900, def: 700, rarity: "N", art: "/cards/2.webp", ascendsTo: 80 },
  { id: 3, name: "Guerrero Jaguar", description: "Orden de los guerreros jaguar. De noche gana +300 ATK al atacar.", type: "monster", attribute: "tierra", tags: ["guerrero", "jaguar"], atk: 1800, def: 1400, rarity: "R", art: "/cards/3.webp", effects: [{ trigger: "onAttack", conditions: [{ type: "isNight" }], actions: [{ type: "modifyAtk", amount: 300, target: "self", untilEndOfTurn: true }] }] },
  { id: 4, name: "Guerrero \xC1guila", description: "\xC9lite del sol. Si sale por fusi\xF3n, robas 1 carta.", type: "monster", attribute: "sol", tags: ["guerrero", "ave", "sol"], atk: 1700, def: 1500, rarity: "R", art: "/cards/4.webp", effects: [{ trigger: "onFusionSummon", actions: [{ type: "draw", amount: 1 }] }] },
  { id: 5, name: "Xiuhc\xF3atl", description: "Serpiente de fuego, arma de Huitzilopochtli. Al ser invocada, hace 600 de da\xF1o al rival.", type: "monster", attribute: "sol", tags: ["serpiente", "fuego", "sol"], atk: 2400, def: 1700, rarity: "SR", art: "/cards/5.webp", effects: [{ trigger: "onSummon", actions: [{ type: "damage", amount: 600, who: "opponent" }] }] },
  { id: 6, name: "Tl\xE1loc", description: "Se\xF1or de la lluvia y el rayo. Al ser invocado destruye a un monstruo rival al azar. Tus otros monstruos de agua ganan +500 ATK.", type: "monster", attribute: "agua", tags: ["deidad", "agua"], atk: 3500, def: 3e3, rarity: "UR", art: "/cards/6.webp", effects: [{ trigger: "onSummon", actions: [{ type: "destroy", target: "randomEnemy" }] }, { trigger: "continuous", actions: [{ type: "modifyAtk", amount: 500, target: "otherAlliesWithTag", tag: "agua" }] }], noFusion: true, recipes: [[52, 45], [56, 45]] },
  { id: 7, name: "Mictlantecuhtli", description: "Se\xF1or del Mictl\xE1n. Tus otros monstruos de muerte ganan +300 ATK. Al ser destruido, regresa tu monstruo de muerte m\xE1s fuerte.", type: "monster", attribute: "tierra", tags: ["deidad", "muerte"], atk: 3600, def: 3e3, rarity: "UR", art: "/cards/7.webp", effects: [{ trigger: "continuous", actions: [{ type: "modifyAtk", amount: 300, target: "otherAlliesWithTag", tag: "muerte" }] }, { trigger: "onDestroyed", actions: [{ type: "revive", tag: "muerte" }] }], noFusion: true, recipes: [[55, 17], [57, 82]] },
  { id: 8, name: "Quetzalc\xF3atl", description: "Serpiente emplumada. Al ser invocada destruye al monstruo rival m\xE1s fuerte y robas 1 carta.", type: "monster", attribute: "viento", tags: ["deidad", "serpiente", "ave", "viento"], atk: 3700, def: 3200, rarity: "UR", art: "/cards/8.webp", effects: [{ trigger: "onSummon", actions: [{ type: "destroy", target: "highestAtkEnemy" }, { type: "draw", amount: 1 }] }], noFusion: true, recipes: [[51, 15], [54, 5]] },
  { id: 9, name: "Colibr\xED guerrero", description: "Mensajero veloz. Al ser invocado, robas 1 carta.", type: "monster", attribute: "viento", tags: ["ave"], atk: 500, def: 400, rarity: "N", art: "/cards/9.webp", effects: [{ trigger: "onSummon", actions: [{ type: "draw", amount: 1 }] }], ascendsTo: 81 },
  { id: 10, name: "Serpiente de lago", description: "Habita los canales de Tenochtitlan. De noche gana +300 ATK.", type: "monster", attribute: "agua", tags: ["serpiente", "agua"], atk: 700, def: 900, rarity: "N", art: "/cards/10.webp", effects: [{ trigger: "continuous", conditions: [{ type: "isNight" }], actions: [{ type: "modifyAtk", amount: 300, target: "self" }] }] },
  { id: 11, name: "Xoloitzcuintle", description: "Gu\xEDa de las almas rumbo al Mictl\xE1n. Al ser destruido, recuperas 300 PV.", type: "monster", attribute: "tierra", tags: ["bestia", "muerte"], atk: 1e3, def: 800, rarity: "N", art: "/cards/11.webp", effects: [{ trigger: "onDestroyed", actions: [{ type: "heal", amount: 300 }] }], ascendsTo: 82 },
  { id: 12, name: "Sacerdote del Fuego Nuevo", description: "Guardi\xE1n del Fuego Nuevo. Al ser invocado, recuperas 500 PV.", type: "monster", attribute: "sol", tags: ["fuego"], atk: 600, def: 1200, rarity: "N", art: "/cards/12.webp", effects: [{ trigger: "onSummon", actions: [{ type: "heal", amount: 500 }] }] },
  { id: 13, name: "Cipactli", description: "Caim\xE1n primordial. Cuando destruye a un monstruo en batalla, recuperas 500 PV.", type: "monster", attribute: "agua", tags: ["bestia", "agua"], atk: 1600, def: 1300, rarity: "R", art: "/cards/13.webp", effects: [{ trigger: "onBattleDestroy", actions: [{ type: "heal", amount: 500 }] }] },
  { id: 14, name: "Ahu\xEDzotl", description: "Bestia de los lagos. Si la invocas de noche, destruye al monstruo rival m\xE1s d\xE9bil.", type: "monster", attribute: "agua", tags: ["bestia", "agua", "muerte"], atk: 2200, def: 1600, rarity: "SR", art: "/cards/14.webp", effects: [{ trigger: "onSummon", conditions: [{ type: "isNight" }], actions: [{ type: "destroy", target: "lowestAtkEnemy" }] }] },
  { id: 15, name: "Serpiente de plumas", description: "Cubierta de plumas de quetzal. Si tienes otra ave en el campo, gana +300 ATK.", type: "monster", attribute: "viento", tags: ["serpiente", "ave", "viento"], atk: 1600, def: 1200, rarity: "R", art: "/cards/15.webp", effects: [{ trigger: "continuous", conditions: [{ type: "hasTagOnField", tag: "ave" }], actions: [{ type: "modifyAtk", amount: 300, target: "self" }] }] },
  { id: 16, name: "Tecolote del Mictl\xE1n", description: "Su canto anuncia la muerte. Al ser destruido, hace 500 de da\xF1o al rival.", type: "monster", attribute: "viento", tags: ["ave", "muerte"], atk: 1300, def: 900, rarity: "R", art: "/cards/16.webp", effects: [{ trigger: "onDestroyed", actions: [{ type: "damage", amount: 500, who: "opponent" }] }] },
  { id: 17, name: "Guerrero del Mictl\xE1n", description: "Guerrero ca\xEDdo que regres\xF3 del inframundo. De noche gana +500 ATK.", type: "monster", attribute: "tierra", tags: ["guerrero", "muerte"], atk: 2200, def: 1700, rarity: "SR", art: "/cards/17.webp", effects: [{ trigger: "continuous", conditions: [{ type: "isNight" }], actions: [{ type: "modifyAtk", amount: 500, target: "self" }] }] },
  { id: 18, name: "Temazcal", description: "Ba\xF1o de vapor sagrado. Recuperas 1000 PV.", type: "spell", attribute: "agua", tags: [], atk: 0, def: 0, rarity: "N", art: "/cards/18.webp", effects: [{ trigger: "onActivate", actions: [{ type: "heal", amount: 1e3 }] }] },
  { id: 19, name: "Juego de pelota", description: "Tlachtli. Tus monstruos ganan +500 ATK hasta el final del turno.", type: "spell", attribute: "sol", tags: [], atk: 0, def: 0, rarity: "R", art: "/cards/19.webp", effects: [{ trigger: "onActivate", actions: [{ type: "modifyAtk", amount: 500, target: "allAllies", untilEndOfTurn: true }] }] },
  { id: 20, name: "Lluvia de obsidiana", description: "Hace 800 de da\xF1o al rival.", type: "spell", attribute: "tierra", tags: [], atk: 0, def: 0, rarity: "R", art: "/cards/20.webp", effects: [{ trigger: "onActivate", actions: [{ type: "damage", amount: 800, who: "opponent" }] }] },
  { id: 21, name: "Chimalli", description: "Escudo de guerra. El monstruo equipado gana +200 ATK y +600 DEF.", type: "equip", attribute: "tierra", tags: [], atk: 0, def: 0, rarity: "N", art: "/cards/21.webp", effects: [{ trigger: "onActivate", actions: [{ type: "modifyDef", amount: 600, target: "equipTarget" }, { type: "modifyAtk", amount: 200, target: "equipTarget" }] }] },
  { id: 22, name: "Macuahuitl de obsidiana", description: "El monstruo equipado gana +600 ATK.", type: "equip", attribute: "tierra", tags: [], atk: 0, def: 0, rarity: "R", art: "/cards/22.webp", effects: [{ trigger: "onActivate", actions: [{ type: "modifyAtk", amount: 600, target: "equipTarget" }] }] },
  { id: 23, name: "Fosa de estacas", description: "Cuando el rival ataca, destruye al monstruo atacante.", type: "trap", attribute: "tierra", tags: [], atk: 0, def: 0, rarity: "SR", art: "/cards/23.webp", effects: [{ trigger: "onOpponentAttack", actions: [{ type: "destroy", target: "attacker" }] }] },
  { id: 24, name: "Niebla de Tl\xE1loc", description: "Trampa. Cuando el rival ataca, la niebla detiene el ataque.", type: "trap", attribute: "agua", tags: [], atk: 0, def: 0, rarity: "R", art: "/cards/24.webp", effects: [{ trigger: "onOpponentAttack", actions: [{ type: "negateAttack" }] }] },
  { id: 25, name: "Espejo humeante", description: "Trampa de Tezcatlipoca. Cuando el rival ataca, el atacante pierde 800 ATK este turno.", type: "trap", attribute: "viento", tags: [], atk: 0, def: 0, rarity: "R", art: "/cards/25.webp", effects: [{ trigger: "onOpponentAttack", actions: [{ type: "modifyAtk", amount: -800, target: "attacker", untilEndOfTurn: true }] }] },
  { id: 26, name: "Tlacuache ladr\xF3n", description: "Rob\xF3 el fuego a los dioses. Al ser destruido, robas 1 carta.", type: "monster", attribute: "tierra", tags: ["bestia"], atk: 400, def: 300, rarity: "N", art: "/cards/26.webp", effects: [{ trigger: "onDestroyed", actions: [{ type: "draw", amount: 1 }] }] },
  { id: 27, name: "Ajolote del lago", description: "X\xF3lotl escondido en Xochimilco. Al ser destruido, invoca de tu mazo un monstruo de agua con 800 ATK o menos.", type: "monster", attribute: "agua", tags: ["agua", "bestia"], atk: 300, def: 500, rarity: "N", art: "/cards/27.webp", effects: [{ trigger: "onDestroyed", actions: [{ type: "summonFromDeck", maxAtk: 800, tag: "agua" }] }] },
  { id: 28, name: "Chapul\xEDn de Chapultepec", description: "Salta entre los ahuehuetes: puede atacar directo aunque haya monstruos.", type: "monster", attribute: "tierra", tags: ["bestia"], atk: 500, def: 200, rarity: "N", art: "/cards/28.webp", effects: [{ trigger: "continuous", actions: [{ type: "grantKeyword", keyword: "directAttack", target: "self" }] }] },
  { id: 29, name: "Guacamaya roja", description: "Sus plumas se ofrecen al sol. De d\xEDa gana +300 ATK.", type: "monster", attribute: "sol", tags: ["ave", "sol"], atk: 700, def: 500, rarity: "N", art: "/cards/29.webp", effects: [{ trigger: "continuous", conditions: [{ type: "isDay" }], actions: [{ type: "modifyAtk", amount: 300, target: "self" }] }] },
  { id: 30, name: "Tortuga de r\xEDo", description: "Lenta pero dif\xEDcil de romper.", type: "monster", attribute: "agua", tags: ["agua", "bestia"], atk: 500, def: 1400, rarity: "N", art: "/cards/30.webp" },
  { id: 31, name: "Venado sagrado", description: "Animal del sol y de la cacer\xEDa.", type: "monster", attribute: "tierra", tags: ["bestia", "sol"], atk: 900, def: 700, rarity: "N", art: "/cards/31.webp" },
  { id: 32, name: "Pescador de Texcoco", description: "Defiende su canoa con lanza y red.", type: "monster", attribute: "agua", tags: ["guerrero", "agua"], atk: 800, def: 700, rarity: "N", art: "/cards/32.webp" },
  { id: 33, name: "Aprendiz de tlacuilo", description: "Pinta c\xF3dices y conoce los nombres de los dioses. Al ser invocado, robas 1 carta.", type: "monster", attribute: "viento", tags: ["viento"], atk: 400, def: 800, rarity: "N", art: "/cards/33.webp", effects: [{ trigger: "onSummon", actions: [{ type: "draw", amount: 1 }] }] },
  { id: 34, name: "Murci\xE9lago de Tzinacan", description: "Vuela en la casa de los murci\xE9lagos. De noche gana +300 ATK.", type: "monster", attribute: "viento", tags: ["ave", "muerte"], atk: 800, def: 500, rarity: "N", art: "/cards/34.webp", effects: [{ trigger: "continuous", conditions: [{ type: "isNight" }], actions: [{ type: "modifyAtk", amount: 300, target: "self" }] }] },
  { id: 35, name: "Coyote astuto", description: "Nunca cae en la misma trampa dos veces.", type: "monster", attribute: "tierra", tags: ["bestia"], atk: 1e3, def: 700, rarity: "N", art: "/cards/35.webp" },
  { id: 36, name: "Halc\xF3n mensajero", description: "Lleva noticias de una ciudad a otra.", type: "monster", attribute: "viento", tags: ["ave", "viento"], atk: 900, def: 600, rarity: "N", art: "/cards/36.webp" },
  { id: 37, name: "Lagartija de obsidiana", description: "Su piel brilla como vidrio volc\xE1nico.", type: "monster", attribute: "tierra", tags: ["serpiente", "fuego"], atk: 700, def: 500, rarity: "N", art: "/cards/37.webp" },
  { id: 38, name: "Guerrero cuext\xE9catl", description: "Guerrero huasteco de gorro c\xF3nico.", type: "monster", attribute: "tierra", tags: ["guerrero"], atk: 1100, def: 900, rarity: "N", art: "/cards/38.webp" },
  { id: 39, name: "Arquero chichimeca", description: "Cazador del norte. Al ser invocado, hace 400 de da\xF1o al rival.", type: "monster", attribute: "viento", tags: ["guerrero", "viento"], atk: 1300, def: 800, rarity: "N", art: "/cards/39.webp", effects: [{ trigger: "onSummon", actions: [{ type: "damage", amount: 400, who: "opponent" }] }] },
  { id: 40, name: "Guerrero coyote", description: "Viste la piel del coyote. De noche gana +300 ATK.", type: "monster", attribute: "tierra", tags: ["guerrero", "bestia"], atk: 1500, def: 1100, rarity: "R", art: "/cards/40.webp", effects: [{ trigger: "continuous", conditions: [{ type: "isNight" }], actions: [{ type: "modifyAtk", amount: 300, target: "self" }] }] },
  { id: 41, name: "Serpiente de cascabel", description: "Avisa antes de morder: quien la ataca pierde 500 ATK ese turno.", type: "monster", attribute: "tierra", tags: ["serpiente", "muerte"], atk: 1400, def: 900, rarity: "R", art: "/cards/41.webp", effects: [{ trigger: "onAttacked", actions: [{ type: "modifyAtk", amount: -500, target: "attacker", untilEndOfTurn: true }] }] },
  { id: 42, name: "\xC1guila real", description: "La que se pos\xF3 sobre el nopal. De d\xEDa gana +300 ATK.", type: "monster", attribute: "sol", tags: ["ave", "sol"], atk: 1600, def: 1e3, rarity: "R", art: "/cards/42.webp", effects: [{ trigger: "continuous", conditions: [{ type: "isDay" }], actions: [{ type: "modifyAtk", amount: 300, target: "self" }] }] },
  { id: 43, name: "Jaguar negro", description: "Sombra de la selva, animal de Tezcatlipoca. De noche gana +400 ATK.", type: "monster", attribute: "tierra", tags: ["jaguar", "bestia", "muerte"], atk: 1700, def: 1200, rarity: "R", art: "/cards/43.webp", effects: [{ trigger: "continuous", conditions: [{ type: "isNight" }], actions: [{ type: "modifyAtk", amount: 400, target: "self" }] }] },
  { id: 44, name: "Sacerdotisa de la luna", description: "Cuenta los d\xEDas del calendario lunar. Si la invocas de noche, recuperas 800 PV.", type: "monster", attribute: "agua", tags: ["agua"], atk: 1e3, def: 1500, rarity: "N", art: "/cards/44.webp", effects: [{ trigger: "onSummon", conditions: [{ type: "isNight" }], actions: [{ type: "heal", amount: 800 }] }] },
  { id: 45, name: "Tlaloque de la lluvia", description: "Ayudante de Tl\xE1loc que rompe las jarras del cielo. Tus otros monstruos de agua ganan +200 ATK.", type: "monster", attribute: "agua", tags: ["agua"], atk: 1400, def: 1400, rarity: "R", art: "/cards/45.webp", effects: [{ trigger: "continuous", actions: [{ type: "modifyAtk", amount: 200, target: "otherAlliesWithTag", tag: "agua" }] }] },
  { id: 46, name: "Capit\xE1n tequihua", description: "Veterano que captur\xF3 a cuatro enemigos. Cuando destruye a un monstruo en batalla, robas 1 carta.", type: "monster", attribute: "tierra", tags: ["guerrero"], atk: 1700, def: 1300, rarity: "R", art: "/cards/46.webp", effects: [{ trigger: "onBattleDestroy", actions: [{ type: "draw", amount: 1 }] }] },
  { id: 47, name: "Sapo de la lluvia", description: "Canta para llamar a Tl\xE1loc.", type: "monster", attribute: "agua", tags: ["agua", "bestia"], atk: 1e3, def: 1300, rarity: "N", art: "/cards/47.webp" },
  { id: 48, name: "Colibr\xED de Huitzilopochtli", description: "Alma de un guerrero ca\xEDdo que volvi\xF3 como colibr\xED. Si lo invocas de d\xEDa, robas 1 carta.", type: "monster", attribute: "sol", tags: ["ave", "sol", "guerrero"], atk: 1700, def: 900, rarity: "R", art: "/cards/48.webp", effects: [{ trigger: "onSummon", conditions: [{ type: "isDay" }], actions: [{ type: "draw", amount: 1 }] }] },
  { id: 49, name: "Guerrera cihuateteo", description: "Acompa\xF1a al sol al atardecer. En el Ocaso gana +700 ATK y ataca dos veces.", type: "monster", attribute: "viento", tags: ["guerrero", "muerte"], atk: 2e3, def: 1500, rarity: "SR", art: "/cards/49.webp", effects: [{ trigger: "continuous", conditions: [{ type: "isPhase", phase: "ocaso" }], actions: [{ type: "modifyAtk", amount: 700, target: "self" }, { type: "grantKeyword", keyword: "doubleAttack", target: "self" }] }] },
  { id: 50, name: "Cent\xE9otl, se\xF1or del ma\xEDz", description: "Dios del ma\xEDz tierno que alimenta al pueblo. Al empezar tu turno recuperas 500 PV.", type: "monster", attribute: "sol", tags: ["deidad", "sol"], atk: 3e3, def: 2600, rarity: "SR", art: "/cards/50.webp", effects: [{ trigger: "onTurnStart", actions: [{ type: "heal", amount: 500 }] }], noFusion: true, recipes: [[12, 42], [31, 4]] },
  { id: 51, name: "Xochiquetzal", description: "Diosa de las flores y la belleza. Al ser invocada, recuperas 1000 PV y robas 1 carta.", type: "monster", attribute: "viento", tags: ["deidad", "ave"], atk: 3e3, def: 2800, rarity: "SR", art: "/cards/51.webp", effects: [{ trigger: "onSummon", actions: [{ type: "heal", amount: 1e3 }, { type: "draw", amount: 1 }] }], noFusion: true, recipes: [[15, 44], [9, 81]] },
  { id: 52, name: "Chalchiuhtlicue", description: "Se\xF1ora de la falda de jade. Al ser invocada, la corriente regresa a la mano al monstruo rival m\xE1s fuerte.", type: "monster", attribute: "agua", tags: ["deidad", "agua"], atk: 3200, def: 2800, rarity: "SR", art: "/cards/52.webp", effects: [{ trigger: "onSummon", actions: [{ type: "returnToHand", target: "highestAtkEnemy" }] }], noFusion: true, recipes: [[44, 45], [13, 45]] },
  { id: 53, name: "Huehuec\xF3yotl", description: "El coyote viejo, dios del enga\xF1o. Al ser invocado, tomas el control del monstruo rival m\xE1s fuerte hasta el final del turno.", type: "monster", attribute: "tierra", tags: ["deidad", "bestia"], atk: 3e3, def: 2400, rarity: "SR", art: "/cards/53.webp", effects: [{ trigger: "onSummon", actions: [{ type: "takeControl", target: "highestAtkEnemy" }] }], noFusion: true, recipes: [[35, 40], [78, 40]] },
  { id: 54, name: "Mixc\xF3atl", description: "Serpiente de nubes, dios de la caza. Ataca dos veces por turno.", type: "monster", attribute: "viento", tags: ["deidad", "serpiente", "guerrero"], atk: 3100, def: 2300, rarity: "SR", art: "/cards/54.webp", effects: [{ trigger: "continuous", actions: [{ type: "grantKeyword", keyword: "doubleAttack", target: "self" }] }], noFusion: true, recipes: [[39, 15], [39, 91]] },
  { id: 55, name: "X\xF3lotl", description: "Hermano de Quetzalc\xF3atl, gu\xEDa de los muertos. Al ser destruido, regresa tu monstruo de muerte m\xE1s fuerte.", type: "monster", attribute: "tierra", tags: ["deidad", "muerte", "bestia"], atk: 3e3, def: 2500, rarity: "SR", art: "/cards/55.webp", effects: [{ trigger: "onDestroyed", actions: [{ type: "revive", tag: "muerte" }] }], noFusion: true, recipes: [[11, 16], [27, 82]] },
  { id: 56, name: "Teccizt\xE9catl", description: "Se volvi\xF3 la luna al dudar ante la hoguera. De noche gana +500 ATK; si lo invocas de noche, pone en defensa a todos los monstruos rivales.", type: "monster", attribute: "agua", tags: ["deidad"], atk: 3e3, def: 3e3, rarity: "SR", art: "/cards/56.webp", effects: [{ trigger: "continuous", conditions: [{ type: "isNight" }], actions: [{ type: "modifyAtk", amount: 500, target: "self" }] }, { trigger: "onSummon", conditions: [{ type: "isNight" }], actions: [{ type: "forceDefense", target: "allEnemies" }] }], noFusion: true, recipes: [[44, 16], [44, 77]] },
  { id: 57, name: "Tzitzimitl", description: "Estrella demonio que baja en los eclipses. Al ser invocada, destruye a un monstruo rival al azar y hace 500 de da\xF1o.", type: "monster", attribute: "viento", tags: ["deidad", "muerte", "viento"], atk: 3200, def: 2200, rarity: "SR", art: "/cards/57.webp", effects: [{ trigger: "onSummon", actions: [{ type: "destroy", target: "randomEnemy" }, { type: "damage", amount: 500, who: "opponent" }] }], noFusion: true, recipes: [[92, 16], [92, 34]] },
  { id: 58, name: "Cihuac\xF3atl", description: "Mujer serpiente; su llanto anuncia desgracias. Al ser invocada, el rival no puede atacar en su siguiente turno.", type: "monster", attribute: "tierra", tags: ["deidad", "serpiente", "muerte"], atk: 3100, def: 2600, rarity: "SR", art: "/cards/58.webp", effects: [{ trigger: "onSummon", actions: [{ type: "preventAttack" }] }], noFusion: true, recipes: [[41, 49], [93, 41]] },
  { id: 59, name: "Coyolxauhqui", description: "Diosa de la luna que gui\xF3 a los cuatrocientos guerreros del sur. Tus otros guerreros ganan +300 ATK; de noche ella gana +500.", type: "monster", attribute: "viento", tags: ["deidad", "guerrero"], atk: 3300, def: 2700, rarity: "UR", art: "/cards/59.webp", effects: [{ trigger: "continuous", actions: [{ type: "modifyAtk", amount: 300, target: "otherAlliesWithTag", tag: "guerrero" }] }, { trigger: "continuous", conditions: [{ type: "isNight" }], actions: [{ type: "modifyAtk", amount: 500, target: "self" }] }], noFusion: true, recipes: [[49, 56], [17, 56]] },
  { id: 60, name: "Huitzilopochtli", description: "Colibr\xED del sur, dios de la guerra. Hace da\xF1o de sobra a los monstruos en defensa; de d\xEDa gana +500 ATK.", type: "monster", attribute: "sol", tags: ["deidad", "guerrero", "sol", "ave"], atk: 3800, def: 3e3, rarity: "UR", art: "/cards/60.webp", effects: [{ trigger: "continuous", actions: [{ type: "grantKeyword", keyword: "piercing", target: "self" }] }, { trigger: "continuous", conditions: [{ type: "isDay" }], actions: [{ type: "modifyAtk", amount: 500, target: "self" }] }], noFusion: true, recipes: [[48, 59], [4, 59]] },
  { id: 61, name: "Tezcatlipoca", description: "Espejo humeante, se\xF1or de la noche. Al ser invocado destruye todas las trampas y m\xE1gicas del rival; de noche gana +500 ATK.", type: "monster", attribute: "viento", tags: ["deidad", "jaguar", "muerte"], atk: 3700, def: 3e3, rarity: "UR", art: "/cards/61.webp", effects: [{ trigger: "onSummon", actions: [{ type: "destroySupport", who: "opponent" }] }, { trigger: "continuous", conditions: [{ type: "isNight" }], actions: [{ type: "modifyAtk", amount: 500, target: "self" }] }], noFusion: true, recipes: [[43, 53], [76, 57]] },
  { id: 62, name: "Xipe T\xF3tec", description: "Nuestro se\xF1or el desollado, dios de la renovaci\xF3n. Al empezar tu turno recuperas 500 PV; al ser destruido, regresa tu monstruo m\xE1s fuerte.", type: "monster", attribute: "tierra", tags: ["deidad", "sol"], atk: 3300, def: 2800, rarity: "UR", art: "/cards/62.webp", effects: [{ trigger: "onTurnStart", actions: [{ type: "heal", amount: 500 }] }, { trigger: "onDestroyed", actions: [{ type: "revive" }] }], noFusion: true, recipes: [[50, 46], [50, 3]] },
  { id: 63, name: "Tonatiuh", description: "El Quinto Sol. Al ser invocado hace 1000 de da\xF1o al rival; al Mediod\xEDa gana +700 ATK.", type: "monster", attribute: "sol", tags: ["deidad", "sol", "fuego"], atk: 3800, def: 3300, rarity: "UR", art: "/cards/63.webp", effects: [{ trigger: "onSummon", actions: [{ type: "damage", amount: 1e3, who: "opponent" }] }, { trigger: "continuous", conditions: [{ type: "isPhase", phase: "mediodia" }], actions: [{ type: "modifyAtk", amount: 700, target: "self" }] }], noFusion: true, recipes: [[64, 50], [5, 50]] },
  { id: 64, name: "Xiuhtecuhtli", description: "Se\xF1or del fuego y del a\xF1o. Al ser invocado destruye al monstruo rival m\xE1s d\xE9bil; al empezar tu turno hace 300 de da\xF1o.", type: "monster", attribute: "sol", tags: ["deidad", "fuego"], atk: 3500, def: 2800, rarity: "UR", art: "/cards/64.webp", effects: [{ trigger: "onSummon", actions: [{ type: "destroy", target: "lowestAtkEnemy" }] }, { trigger: "onTurnStart", actions: [{ type: "damage", amount: 300, who: "opponent" }] }], noFusion: true, recipes: [[5, 12]] },
  { id: 65, name: "Tlaltecuhtli", description: "Se\xF1ora de la tierra que devora a los muertos. Da\xF1o de sobra contra defensa; cada vez que destruye a un monstruo recuperas 800 PV.", type: "monster", attribute: "tierra", tags: ["deidad", "bestia"], atk: 3400, def: 3600, rarity: "UR", art: "/cards/65.webp", effects: [{ trigger: "continuous", actions: [{ type: "grantKeyword", keyword: "piercing", target: "self" }] }, { trigger: "onBattleDestroy", actions: [{ type: "heal", amount: 800 }] }], noFusion: true, recipes: [[13, 53], [53, 55]] },
  { id: 66, name: "Ofrenda de cacao", description: "Recuperas 500 PV y robas 1 carta.", type: "spell", attribute: "tierra", tags: [], atk: 0, def: 0, rarity: "N", art: "/cards/66.webp", effects: [{ trigger: "onActivate", actions: [{ type: "heal", amount: 500 }, { type: "draw", amount: 1 }] }] },
  { id: 67, name: "Danza del venado", description: "Tus monstruos ganan +300 ATK hasta el final del turno y robas 1 carta.", type: "spell", attribute: "sol", tags: [], atk: 0, def: 0, rarity: "R", art: "/cards/67.webp", effects: [{ trigger: "onActivate", actions: [{ type: "modifyAtk", amount: 300, target: "allAllies", untilEndOfTurn: true }, { type: "draw", amount: 1 }] }] },
  { id: 68, name: "Ceremonia del Fuego Nuevo", description: "Hace 1000 de da\xF1o al rival y recuperas 1000 PV.", type: "spell", attribute: "sol", tags: [], atk: 0, def: 0, rarity: "SR", art: "/cards/68.webp", effects: [{ trigger: "onActivate", actions: [{ type: "damage", amount: 1e3, who: "opponent" }, { type: "heal", amount: 1e3 }] }] },
  { id: 69, name: "C\xF3dice sagrado", description: "Robas 2 cartas.", type: "spell", attribute: "viento", tags: [], atk: 0, def: 0, rarity: "SR", art: "/cards/69.webp", effects: [{ trigger: "onActivate", actions: [{ type: "draw", amount: 2 }] }] },
  { id: 70, name: "Rodela de plumas", description: "El monstruo equipado gana +300 ATK y +300 DEF.", type: "equip", attribute: "viento", tags: [], atk: 0, def: 0, rarity: "N", art: "/cards/70.webp", effects: [{ trigger: "onActivate", actions: [{ type: "modifyAtk", amount: 300, target: "equipTarget" }, { type: "modifyDef", amount: 300, target: "equipTarget" }] }] },
  { id: 71, name: "\xC1tlatl", description: "Lanzadardos. El monstruo equipado gana +800 ATK y hace da\xF1o de sobra contra defensa.", type: "equip", attribute: "viento", tags: [], atk: 0, def: 0, rarity: "SR", art: "/cards/71.webp", effects: [{ trigger: "onActivate", actions: [{ type: "modifyAtk", amount: 800, target: "equipTarget" }, { type: "grantKeyword", keyword: "piercing", target: "equipTarget" }] }] },
  { id: 72, name: "Penacho de quetzal", description: "El monstruo equipado gana +500 ATK y +500 DEF.", type: "equip", attribute: "sol", tags: [], atk: 0, def: 0, rarity: "R", art: "/cards/72.webp", effects: [{ trigger: "onActivate", actions: [{ type: "modifyAtk", amount: 500, target: "equipTarget" }, { type: "modifyDef", amount: 500, target: "equipTarget" }] }] },
  { id: 73, name: "Red de pescador", description: "Cuando el rival ataca, el atacante pierde 1000 ATK este turno y queda en defensa.", type: "trap", attribute: "agua", tags: [], atk: 0, def: 0, rarity: "R", art: "/cards/73.webp", effects: [{ trigger: "onOpponentAttack", actions: [{ type: "modifyAtk", amount: -1e3, target: "attacker", untilEndOfTurn: true }, { type: "forceDefense", target: "attacker" }] }] },
  { id: 74, name: "Eclipse", description: "Cuando el rival ataca, la oscuridad detiene el ataque y no podr\xE1 atacar en su siguiente turno.", type: "trap", attribute: "viento", tags: [], atk: 0, def: 0, rarity: "R", art: "/cards/74.webp", effects: [{ trigger: "onOpponentAttack", actions: [{ type: "negateAttack" }, { type: "preventAttack" }] }] },
  { id: 75, name: "Furia de Tl\xE1loc", description: "Cuando el rival ataca, destruye a todos sus monstruos.", type: "trap", attribute: "agua", tags: [], atk: 0, def: 0, rarity: "UR", art: "/cards/75.webp", effects: [{ trigger: "onOpponentAttack", actions: [{ type: "destroy", target: "allEnemies" }] }] },
  { id: 76, name: "Brujo nahualli", description: "Hechicero de la sierra. De noche camina en cuatro patas.", type: "monster", attribute: "tierra", tags: ["guerrero", "jaguar"], atk: 1200, def: 1500, rarity: "SR", art: "/cards/76.webp", effects: [{ trigger: "onSummon", conditions: [{ type: "isNight" }], actions: [{ type: "draw", amount: 1 }] }], nahual: { name: "Jaguar nahual", atk: 2500, def: 1e3, description: "La forma de noche del brujo: un jaguar de ojos humanos." } },
  { id: 77, name: "Anciana del pueblo", description: "Curandera que sabe los nombres de todas las hierbas. De noche se vuelve tecolote.", type: "monster", attribute: "viento", tags: ["ave", "muerte"], atk: 500, def: 1300, rarity: "R", art: "/cards/77.webp", effects: [{ trigger: "onSummon", actions: [{ type: "heal", amount: 500 }] }], nahual: { name: "Tecolote nahual", atk: 1800, def: 1e3, description: "Cuando canta el tecolote, alguien va a morir." } },
  { id: 78, name: "Comerciante viajero", description: "Pochteca que recorre los caminos con su carga de cacao. De noche se vuelve coyote.", type: "monster", attribute: "tierra", tags: ["bestia"], atk: 900, def: 900, rarity: "N", art: "/cards/78.webp", nahual: { name: "Coyote nahual", atk: 1600, def: 1100, description: "Astuto y veloz: nadie lo ve llegar a la caravana." } },
  { id: 79, name: "Ocelote cazador", description: "El cachorro creci\xF3. De noche gana +400 ATK al atacar.", type: "monster", attribute: "tierra", tags: ["jaguar", "bestia"], atk: 1600, def: 1100, rarity: "R", art: "/cards/79.webp", effects: [{ trigger: "onAttack", conditions: [{ type: "isNight" }], actions: [{ type: "modifyAtk", amount: 400, target: "self", untilEndOfTurn: true }] }] },
  { id: 80, name: "Macehual veterano", description: "Sobrevivi\xF3 a cien batallas floridas. Tus otros guerreros ganan +200 ATK.", type: "monster", attribute: "tierra", tags: ["guerrero"], atk: 1600, def: 1300, rarity: "R", art: "/cards/80.webp", effects: [{ trigger: "continuous", actions: [{ type: "modifyAtk", amount: 200, target: "otherAlliesWithTag", tag: "guerrero" }] }] },
  { id: 81, name: "Colibr\xED mensajero del sol", description: "Lleva noticias a Huitzilopochtli. Al ser invocado, robas 1 carta y recuperas 300 PV.", type: "monster", attribute: "viento", tags: ["ave", "sol"], atk: 1300, def: 900, rarity: "R", art: "/cards/81.webp", effects: [{ trigger: "onSummon", actions: [{ type: "draw", amount: 1 }, { type: "heal", amount: 300 }] }] },
  { id: 82, name: "Xoloitzcuintle guardi\xE1n", description: "Guardi\xE1n del umbral del Mictl\xE1n. Al ser destruido, recuperas 800 PV y regresa tu monstruo de muerte m\xE1s fuerte.", type: "monster", attribute: "tierra", tags: ["bestia", "muerte"], atk: 1900, def: 1600, rarity: "SR", art: "/cards/82.webp", effects: [{ trigger: "onDestroyed", actions: [{ type: "heal", amount: 800 }, { type: "revive", tag: "muerte" }] }] },
  { id: 83, name: "Tormenta de Tl\xE1loc", description: "Rayos y granizo destruyen a todos los monstruos del rival.", type: "spell", attribute: "agua", tags: [], atk: 0, def: 0, rarity: "UR", art: "/cards/83.webp", effects: [{ trigger: "onActivate", actions: [{ type: "destroy", target: "allEnemies" }] }] },
  { id: 84, name: "Soplo de Eh\xE9catl", description: "El viento barre todas las m\xE1gicas y trampas colocadas del rival.", type: "spell", attribute: "viento", tags: [], atk: 0, def: 0, rarity: "R", art: "/cards/84.webp", effects: [{ trigger: "onActivate", actions: [{ type: "destroySupport", who: "opponent" }] }] },
  { id: 85, name: "Fauces de Tlaltecuhtli", description: "La tierra abre la boca y se traga a TODOS los monstruos del campo, tuyos y del rival.", type: "spell", attribute: "tierra", tags: [], atk: 0, def: 0, rarity: "SR", art: "/cards/85.webp", effects: [{ trigger: "onActivate", actions: [{ type: "destroy", target: "allMonsters" }] }] },
  { id: 86, name: "Hechizo de Malinalx\xF3chitl", description: "Tomas el control del monstruo rival m\xE1s fuerte hasta el final del turno.", type: "spell", attribute: "viento", tags: [], atk: 0, def: 0, rarity: "SR", art: "/cards/86.webp", effects: [{ trigger: "onActivate", actions: [{ type: "takeControl", target: "highestAtkEnemy" }] }] },
  { id: 87, name: "Aliento del Mictl\xE1n", description: "Un viento fr\xEDo regresa a la mano al monstruo que el rival acaba de invocar.", type: "trap", attribute: "viento", tags: [], atk: 0, def: 0, rarity: "R", art: "/cards/87.webp", effects: [{ trigger: "onOpponentSummon", actions: [{ type: "returnToHand", target: "summoned" }] }] },
  { id: 88, name: "Red de obsidiana", description: "Cuando el rival invoca por fusi\xF3n, destruye al monstruo que sali\xF3.", type: "trap", attribute: "tierra", tags: [], atk: 0, def: 0, rarity: "SR", art: "/cards/88.webp", effects: [{ trigger: "onOpponentFusion", actions: [{ type: "destroy", target: "summoned" }] }] },
  { id: 89, name: "Grito de la Llorona", description: "Su lamento detiene el ataque, deja al atacante en defensa y el rival no puede atacar en su siguiente turno.", type: "trap", attribute: "agua", tags: [], atk: 0, def: 0, rarity: "SR", art: "/cards/89.webp", effects: [{ trigger: "onOpponentAttack", actions: [{ type: "negateAttack" }, { type: "forceDefense", target: "attacker" }, { type: "preventAttack" }] }] },
  { id: 90, name: "Jaguar de obsidiana", description: "Sus garras atraviesan escudos: da\xF1o de sobra contra monstruos en defensa.", type: "monster", attribute: "tierra", tags: ["jaguar", "bestia"], atk: 2100, def: 1300, rarity: "SR", art: "/cards/90.webp", effects: [{ trigger: "continuous", actions: [{ type: "grantKeyword", keyword: "piercing", target: "self" }] }], noFusion: true },
  { id: 91, name: "Guerrero \xE1guila veloz", description: "Baja del cielo dos veces antes de que el rival reaccione.", type: "monster", attribute: "sol", tags: ["guerrero", "ave"], atk: 1400, def: 800, rarity: "R", art: "/cards/91.webp", effects: [{ trigger: "continuous", actions: [{ type: "grantKeyword", keyword: "doubleAttack", target: "self" }] }], noFusion: true },
  { id: 92, name: "Tzitzimitl del eclipse", description: "Estrella menor que baja en los eclipses. Al ser invocada, destruye a un monstruo rival al azar.", type: "monster", attribute: "viento", tags: ["muerte", "viento"], atk: 2100, def: 1500, rarity: "SR", art: "/cards/92.webp", effects: [{ trigger: "onSummon", actions: [{ type: "destroy", target: "randomEnemy" }] }], noFusion: true },
  { id: 93, name: "Madre serpiente", description: "Al morir, de su cuerpo nace otra serpiente (de tu mazo, 1500 ATK o menos).", type: "monster", attribute: "tierra", tags: ["serpiente"], atk: 1300, def: 1300, rarity: "R", art: "/cards/93.webp", effects: [{ trigger: "onDestroyed", actions: [{ type: "summonFromDeck", maxAtk: 1500, sameTag: true }] }], noFusion: true },
  { id: 94, name: "Mensajero de la noche", description: "De noche se cuela entre las l\xEDneas enemigas: ataca directo.", type: "monster", attribute: "viento", tags: ["ave", "muerte"], atk: 1e3, def: 700, rarity: "N", art: "/cards/94.webp", effects: [{ trigger: "continuous", conditions: [{ type: "isNight" }], actions: [{ type: "grantKeyword", keyword: "directAttack", target: "self" }] }], noFusion: true },
  { id: 95, name: "Escudo de Chimalli", description: "Una vez por duelo detiene el golpe que deb\xEDa destruirlo.", type: "monster", attribute: "tierra", tags: ["guerrero"], atk: 1300, def: 1900, rarity: "R", art: "/cards/95.webp", effects: [{ trigger: "continuous", actions: [{ type: "grantKeyword", keyword: "battleImmune", target: "self" }] }], noFusion: true },
  { id: 96, name: "Quetzalc\xF3atl y Tezcatlipoca", description: "Los dos creadores, rivales y hermanos, unidos para destruir el sol anterior. Al ser invocados destruyen TODOS los monstruos, m\xE1gicas y trampas del rival.", type: "monster", attribute: "viento", tags: ["deidad", "serpiente", "jaguar"], atk: 5e3, def: 5e3, rarity: "UR", art: "/cards/96.webp", effects: [{ trigger: "onSummon", actions: [{ type: "destroy", target: "allEnemies" }, { type: "destroySupport", who: "opponent" }] }], noFusion: true, recipes: [[8, 61]] },
  { id: 97, name: "Omet\xE9otl, se\xF1or de la dualidad", description: "El sol y la luna en un solo dios, origen de todo. No puede ser destruido en batalla una vez por duelo y al empezar tu turno recuperas 1000 PV.", type: "monster", attribute: "sol", tags: ["deidad", "sol"], atk: 4800, def: 4800, rarity: "UR", art: "/cards/97.webp", effects: [{ trigger: "continuous", actions: [{ type: "grantKeyword", keyword: "battleImmune", target: "self" }] }, { trigger: "onTurnStart", actions: [{ type: "heal", amount: 1e3 }] }], noFusion: true, recipes: [[63, 59]] },
  { id: 98, name: "Huitzilopochtli con la Xiuhc\xF3atl", description: "El dios de la guerra empu\xF1a a la serpiente de fuego. Ataca dos veces y hace da\xF1o de sobra contra defensa.", type: "monster", attribute: "sol", tags: ["deidad", "guerrero", "fuego"], atk: 4600, def: 3800, rarity: "UR", art: "/cards/98.webp", effects: [{ trigger: "continuous", actions: [{ type: "grantKeyword", keyword: "doubleAttack", target: "self" }, { type: "grantKeyword", keyword: "piercing", target: "self" }] }], noFusion: true, recipes: [[60, 64]] },
  { id: 99, name: "Se\xF1ores del Mictl\xE1n", description: "Mictlantecuhtli y la mujer serpiente gobiernan juntos el inframundo. Al ser invocados destruyen al monstruo rival m\xE1s fuerte y regresa tu monstruo de muerte m\xE1s fuerte.", type: "monster", attribute: "tierra", tags: ["deidad", "muerte"], atk: 4500, def: 4500, rarity: "UR", art: "/cards/99.webp", effects: [{ trigger: "onSummon", actions: [{ type: "destroy", target: "highestAtkEnemy" }, { type: "revive", tag: "muerte" }] }], noFusion: true, recipes: [[7, 58]] },
  { id: 100, name: "Se\xF1ores de Tlalocan", description: "Tl\xE1loc y Chalchiuhtlicue inundan el mundo. Al ser invocados regresan a la mano TODOS los monstruos rivales; tus otros monstruos de agua ganan +500 ATK.", type: "monster", attribute: "agua", tags: ["deidad", "agua"], atk: 4500, def: 4600, rarity: "UR", art: "/cards/100.webp", effects: [{ trigger: "onSummon", actions: [{ type: "returnToHand", target: "allEnemies" }] }, { trigger: "continuous", actions: [{ type: "modifyAtk", amount: 800, target: "otherAlliesWithTag", tag: "agua" }] }], noFusion: true, recipes: [[6, 52]] }
];

// src/data/duelists.json
var duelists_default = [
  {
    id: "tianguis",
    name: "Macehual del tianguis",
    title: "Mercado de Tlatelolco",
    level: 1,
    glyph: "\u2618",
    intro: "Un comerciante que aprendi\xF3 a pelear entre puestos de cacao y obsidiana.",
    deck: [
      1,
      1,
      1,
      2,
      2,
      2,
      78,
      9,
      9,
      10,
      10,
      10,
      11,
      11,
      11,
      12,
      12,
      12,
      13,
      13,
      13,
      16,
      16,
      16,
      3,
      3,
      15,
      15,
      18,
      18,
      18,
      19,
      19,
      19,
      21,
      21,
      21,
      22,
      22,
      22
    ],
    signature: 3,
    rewards: [
      {
        card: 1,
        weight: 6
      },
      {
        card: 2,
        weight: 6
      },
      {
        card: 9,
        weight: 6
      },
      {
        card: 11,
        weight: 6
      },
      {
        card: 13,
        weight: 3
      },
      {
        card: 19,
        weight: 3
      },
      {
        card: 21,
        weight: 3
      },
      {
        card: 3,
        weight: 1
      },
      {
        card: 78,
        weight: 3
      },
      {
        card: 94,
        weight: 2
      }
    ]
  },
  {
    id: "chalchiuhtlicue",
    name: "Sacerdotisa de Chalchiuhtlicue",
    title: "Lago de Texcoco",
    level: 2,
    glyph: "\u2248",
    intro: "Guardiana de las aguas. Sus criaturas del lago se fortalecen con Tl\xE1loc.",
    deck: [
      10,
      10,
      10,
      13,
      13,
      13,
      14,
      14,
      6,
      11,
      11,
      11,
      1,
      1,
      1,
      16,
      16,
      16,
      9,
      9,
      9,
      15,
      15,
      18,
      18,
      18,
      24,
      24,
      24,
      21,
      21,
      21,
      20,
      20,
      20,
      25,
      25,
      25,
      12,
      12
    ],
    signature: 14,
    rewards: [
      {
        card: 10,
        weight: 6
      },
      {
        card: 13,
        weight: 6
      },
      {
        card: 18,
        weight: 6
      },
      {
        card: 24,
        weight: 6
      },
      {
        card: 14,
        weight: 3
      },
      {
        card: 6,
        weight: 1
      },
      {
        card: 77,
        weight: 2
      },
      {
        card: 87,
        weight: 2
      },
      {
        card: 89,
        weight: 2
      }
    ]
  },
  {
    id: "jaguar",
    name: "Capit\xE1n Jaguar",
    title: "Casa de los guerreros",
    level: 2,
    glyph: "\u2694",
    intro: "L\xEDder de la orden jaguar. De noche sus guerreros son m\xE1s peligrosos.",
    deck: [
      2,
      2,
      2,
      1,
      1,
      1,
      3,
      3,
      3,
      4,
      4,
      76,
      76,
      9,
      16,
      16,
      16,
      17,
      17,
      11,
      11,
      11,
      22,
      22,
      22,
      21,
      21,
      21,
      19,
      19,
      19,
      23,
      23,
      23,
      20,
      20,
      20,
      13,
      13,
      13
    ],
    signature: 17,
    rewards: [
      {
        card: 2,
        weight: 6
      },
      {
        card: 1,
        weight: 6
      },
      {
        card: 22,
        weight: 6
      },
      {
        card: 23,
        weight: 6
      },
      {
        card: 3,
        weight: 3
      },
      {
        card: 4,
        weight: 3
      },
      {
        card: 17,
        weight: 1
      },
      {
        card: 76,
        weight: 2
      },
      {
        card: 90,
        weight: 2
      },
      {
        card: 95,
        weight: 2
      }
    ]
  },
  {
    id: "xiuhtecuhtli",
    name: "Sacerdote de Xiuhtecuhtli",
    title: "Templo del fuego",
    level: 3,
    glyph: "\u2739",
    intro: "Se\xF1or del fuego nuevo. Quema con serpientes de fuego y lluvia de obsidiana.",
    deck: [
      12,
      12,
      12,
      10,
      10,
      10,
      5,
      5,
      15,
      15,
      15,
      9,
      9,
      9,
      4,
      4,
      2,
      2,
      2,
      13,
      13,
      13,
      20,
      20,
      20,
      19,
      19,
      19,
      23,
      23,
      23,
      25,
      25,
      25,
      18,
      18,
      18,
      22,
      22,
      22
    ],
    signature: 5,
    rewards: [
      {
        card: 12,
        weight: 6
      },
      {
        card: 20,
        weight: 6
      },
      {
        card: 25,
        weight: 6
      },
      {
        card: 15,
        weight: 3
      },
      {
        card: 5,
        weight: 1
      },
      {
        card: 91,
        weight: 2
      },
      {
        card: 84,
        weight: 1
      },
      {
        card: 92,
        weight: 1
      }
    ]
  },
  {
    id: "mictlantecuhtli",
    name: "Mictlantecuhtli",
    title: "Se\xF1or del Mictl\xE1n",
    level: 3,
    glyph: "\u2620",
    intro: "El se\xF1or de los muertos. Lo que destruyes, \xE9l lo trae de regreso.",
    deck: [
      11,
      11,
      11,
      16,
      16,
      16,
      17,
      17,
      17,
      14,
      14,
      14,
      7,
      7,
      13,
      13,
      13,
      2,
      2,
      2,
      1,
      1,
      1,
      77,
      77,
      10,
      24,
      24,
      24,
      23,
      23,
      23,
      25,
      25,
      25,
      20,
      20,
      20,
      21,
      21
    ],
    signature: 7,
    rewards: [
      {
        card: 16,
        weight: 6
      },
      {
        card: 25,
        weight: 6
      },
      {
        card: 24,
        weight: 6
      },
      {
        card: 17,
        weight: 3
      },
      {
        card: 14,
        weight: 3
      },
      {
        card: 7,
        weight: 1
      },
      {
        card: 8,
        weight: 1
      },
      {
        card: 77,
        weight: 3
      },
      {
        card: 93,
        weight: 2
      },
      {
        card: 85,
        weight: 1
      },
      {
        card: 86,
        weight: 1
      },
      {
        card: 88,
        weight: 1
      },
      {
        card: 83,
        weight: 1
      }
    ]
  }
];

// src/data/fusions.json
var fusions_default = {
  notes: "Reglas gen\xE9ricas: etiqueta + etiqueta = la carta m\xE1s d\xE9bil con TODAS las etiquetas de 'result' cuyo ATK supere a ambos materiales. Las recetas exactas (carta + carta) ahora se guardan en cada carta (campo 'recipes', editor de cartas). Las de 'recipes' de este archivo siguen funcionando, pero si una pareja se repite gana la de la carta.",
  recipeOnly: [],
  recipes: [],
  rules: [
    {
      a: "guerrero",
      b: "jaguar",
      result: [
        "guerrero",
        "jaguar"
      ]
    },
    {
      a: "guerrero",
      b: "ave",
      result: [
        "guerrero",
        "ave"
      ]
    },
    {
      a: "guerrero",
      b: "muerte",
      result: [
        "guerrero",
        "muerte"
      ]
    },
    {
      a: "guerrero",
      b: "bestia",
      result: [
        "guerrero",
        "bestia"
      ]
    },
    {
      a: "guerrero",
      b: "viento",
      result: [
        "guerrero",
        "viento"
      ]
    },
    {
      a: "serpiente",
      b: "fuego",
      result: [
        "serpiente",
        "fuego"
      ]
    },
    {
      a: "serpiente",
      b: "ave",
      result: [
        "serpiente",
        "ave"
      ]
    },
    {
      a: "serpiente",
      b: "muerte",
      result: [
        "serpiente",
        "muerte"
      ]
    },
    {
      a: "bestia",
      b: "agua",
      result: [
        "bestia",
        "agua"
      ]
    },
    {
      a: "bestia",
      b: "muerte",
      result: [
        "bestia",
        "muerte"
      ]
    },
    {
      a: "jaguar",
      b: "muerte",
      result: [
        "jaguar",
        "muerte"
      ]
    },
    {
      a: "jaguar",
      b: "bestia",
      result: [
        "jaguar",
        "bestia"
      ]
    },
    {
      a: "ave",
      b: "muerte",
      result: [
        "ave",
        "muerte"
      ]
    },
    {
      a: "ave",
      b: "sol",
      result: [
        "ave",
        "sol"
      ]
    },
    {
      a: "ave",
      b: "viento",
      result: [
        "ave",
        "viento"
      ]
    },
    {
      a: "agua",
      b: "agua",
      result: [
        "agua"
      ]
    }
  ]
};

// src/data/signs.json
var signs_default = [
  {
    id: "cipactli",
    name: "Cipactli",
    meaning: "Lagarto",
    glyph: "\u{1F40A}",
    text: "Monstruos de Tierra +200 ATK",
    rules: [
      {
        kind: "stat",
        attribute: "tierra",
        atk: 200
      }
    ]
  },
  {
    id: "ehecatl",
    name: "Eh\xE9catl",
    meaning: "Viento",
    glyph: "\u{1F32C}",
    text: "Monstruos de Viento +300 ATK",
    rules: [
      {
        kind: "stat",
        attribute: "viento",
        atk: 300
      }
    ]
  },
  {
    id: "calli",
    name: "Calli",
    meaning: "Casa",
    glyph: "\u{1F3E0}",
    text: "Todos los monstruos +300 DEF",
    rules: [
      {
        kind: "stat",
        def: 300
      }
    ]
  },
  {
    id: "cuetzpalin",
    name: "Cuetzpalin",
    meaning: "Lagartija",
    glyph: "\u{1F98E}",
    text: "Ambos roban 1 carta extra al empezar",
    rules: [
      {
        kind: "extraDraw",
        amount: 1
      }
    ]
  },
  {
    id: "coatl",
    name: "C\xF3atl",
    meaning: "Serpiente",
    glyph: "\u{1F40D}",
    text: "Serpientes +300 ATK",
    rules: [
      {
        kind: "stat",
        tag: "serpiente",
        atk: 300
      }
    ]
  },
  {
    id: "miquiztli",
    name: "Miquiztli",
    meaning: "Muerte",
    glyph: "\u{1F480}",
    text: "Si destruyen tu monstruo, recibes 300 de da\xF1o",
    rules: [
      {
        kind: "destroyBurn",
        amount: 300
      }
    ]
  },
  {
    id: "mazatl",
    name: "M\xE1zatl",
    meaning: "Venado",
    glyph: "\u{1F98C}",
    text: "Bestias +200 ATK",
    rules: [
      {
        kind: "stat",
        tag: "bestia",
        atk: 200
      }
    ]
  },
  {
    id: "tochtli",
    name: "Tochtli",
    meaning: "Conejo",
    glyph: "\u{1F407}",
    text: "Al empezar tu turno recuperas 200 de vida",
    rules: [
      {
        kind: "turnHeal",
        amount: 200
      }
    ]
  },
  {
    id: "atl",
    name: "Atl",
    meaning: "Agua",
    glyph: "\u{1F4A7}",
    text: "Monstruos de Agua +300 ATK",
    rules: [
      {
        kind: "stat",
        attribute: "agua",
        atk: 300
      }
    ]
  },
  {
    id: "itzcuintli",
    name: "Itzcuintli",
    meaning: "Perro",
    glyph: "\u{1F415}",
    text: "Cartas de muerte +300 ATK",
    rules: [
      {
        kind: "stat",
        tag: "muerte",
        atk: 300
      }
    ]
  },
  {
    id: "ozomatli",
    name: "Ozomatli",
    meaning: "Mono",
    glyph: "\u{1F412}",
    text: "Los monstruos de fusi\xF3n salen con +300 ATK",
    rules: [
      {
        kind: "fusionBonus",
        atk: 300
      }
    ]
  },
  {
    id: "malinalli",
    name: "Malinalli",
    meaning: "Hierba",
    glyph: "\u{1F33F}",
    text: "Ambos empiezan con 6000 de vida",
    rules: [
      {
        kind: "startLife",
        amount: 6e3
      }
    ]
  },
  {
    id: "acatl",
    name: "\xC1catl",
    meaning: "Ca\xF1a",
    glyph: "\u{1F38B}",
    text: "Los ataques directos hacen 400 de da\xF1o extra",
    rules: [
      {
        kind: "directBonus",
        amount: 400
      }
    ]
  },
  {
    id: "ocelotl",
    name: "Oc\xE9lotl",
    meaning: "Jaguar",
    glyph: "\u{1F406}",
    text: "Jaguares +400 ATK",
    rules: [
      {
        kind: "stat",
        tag: "jaguar",
        atk: 400
      }
    ]
  },
  {
    id: "cuauhtli",
    name: "Cuauhtli",
    meaning: "\xC1guila",
    glyph: "\u{1F985}",
    text: "Aves +300 ATK",
    rules: [
      {
        kind: "stat",
        tag: "ave",
        atk: 300
      }
    ]
  },
  {
    id: "cozcacuauhtli",
    name: "Cozcacuauhtli",
    meaning: "Zopilote",
    glyph: "\u{1FAB6}",
    text: "Si destruyes un monstruo rival, recuperas 300 de vida",
    rules: [
      {
        kind: "destroyHeal",
        amount: 300
      }
    ]
  },
  {
    id: "ollin",
    name: "Ollin",
    meaning: "Movimiento",
    glyph: "\u{1F300}",
    text: "Todos los monstruos +300 ATK y \u2212300 DEF",
    rules: [
      {
        kind: "stat",
        atk: 300,
        def: -300
      }
    ]
  },
  {
    id: "tecpatl",
    name: "T\xE9cpatl",
    meaning: "Pedernal",
    glyph: "\u{1F52A}",
    text: "Guerreros +300 ATK",
    rules: [
      {
        kind: "stat",
        tag: "guerrero",
        atk: 300
      }
    ]
  },
  {
    id: "quiahuitl",
    name: "Qui\xE1huitl",
    meaning: "Lluvia",
    glyph: "\u{1F327}",
    text: "Deidades +200 ATK y +200 DEF",
    rules: [
      {
        kind: "stat",
        tag: "deidad",
        atk: 200,
        def: 200
      }
    ]
  },
  {
    id: "xochitl",
    name: "X\xF3chitl",
    meaning: "Flor",
    glyph: "\u{1F338}",
    text: "Ambos empiezan con 10000 de vida",
    rules: [
      {
        kind: "startLife",
        amount: 1e4
      }
    ]
  }
];

// src/data/packs.json
var packs_default = [
  {
    id: "quinto-sol",
    name: "Sobre del Quinto Sol",
    glyph: "\u2600",
    color: "#e0a526",
    description: "Guerreros \xE1guila y jaguar, aves de Huitzilopochtli y el fuego del Sol.",
    price: 150,
    monsters: { tags: ["guerrero", "jaguar", "sol", "fuego"], attributes: ["sol"] },
    support: ["sol", "tierra"],
    include: [],
    exclude: [96, 97, 98, 99, 100]
  },
  {
    id: "tlalocan",
    name: "Sobre de Tlalocan",
    glyph: "\u2248",
    color: "#3fa7c9",
    description: "El para\xEDso de Tl\xE1loc: criaturas del lago, serpientes emplumadas y el viento de Eh\xE9catl.",
    price: 150,
    monsters: { tags: ["agua", "serpiente", "viento"], attributes: ["agua", "viento"] },
    support: ["agua", "viento"],
    include: [],
    exclude: [96, 97, 98, 99, 100]
  },
  {
    id: "mictlan",
    name: "Sobre del Mictl\xE1n",
    glyph: "\u2620",
    color: "#9b6bd6",
    description: "El inframundo: xolos, bestias de la noche y los se\xF1ores de la muerte.",
    price: 150,
    monsters: { tags: ["muerte", "bestia"], attributes: [] },
    support: ["tierra", "viento"],
    include: [],
    exclude: [96, 97, 98, 99, 100]
  }
];

// src/data/jade.json
var jade_default = [
  { id: "punado", name: "Pu\xF1ado de Jade", price: 29, jade: 300, ur: 0, gold: 0, glyph: "\u25C6", color: "#3f9a6b" },
  { id: "bolsa", name: "Bolsa de Jade", price: 59, jade: 650, ur: 0, gold: 0, glyph: "\u2756", color: "#2f8f8a" },
  { id: "cofre", name: "Cofre de Jade", price: 99, jade: 1150, ur: 0, gold: 0, glyph: "\u25A3", color: "#c9862e" },
  { id: "tlaloc", name: "Ofrenda de Tl\xE1loc", price: 199, jade: 2400, ur: 1, gold: 1, glyph: "\u2248", color: "#2f7fc0" },
  { id: "quetzalcoatl", name: "Ofrenda de Quetzalc\xF3atl", price: 349, jade: 4400, ur: 2, gold: 3, glyph: "\u223F", color: "#2fa36b" },
  { id: "moctezuma", name: "Tributo de Moctezuma", price: 499, jade: 6500, ur: 3, gold: 5, glyph: "\u265B", color: "#8a55c9" },
  { id: "tenochtitlan", name: "Tesoro de Tenochtitlan", price: 799, jade: 11e3, ur: 4, gold: 7, glyph: "\u25B2", color: "#c94a4a" },
  { id: "quinto-sol", name: "Trono del Quinto Sol", price: 1499, jade: 22e3, ur: 5, gold: 10, glyph: "\u2600", color: "#d9a520" }
];

// src/data/sets/guerra-florida.json
var guerra_florida_default = {
  id: "guerra-florida",
  name: "La Guerra Florida",
  chapter: 2,
  cards: [
    {
      id: 101,
      name: "Telpochtli aprendiz",
      description: "Joven de la casa de la juventud. Sue\xF1a con vestir la piel del jaguar.",
      type: "monster",
      attribute: "tierra",
      tags: [
        "guerrero"
      ],
      atk: 900,
      def: 700,
      rarity: "N",
      set: "guerra-florida"
    },
    {
      id: 102,
      name: "Ocelote de la maleza",
      description: "Caza entre las sombras. De noche gana +300 ATK al atacar.",
      type: "monster",
      attribute: "tierra",
      tags: [
        "jaguar",
        "bestia"
      ],
      atk: 1e3,
      def: 600,
      rarity: "N",
      set: "guerra-florida",
      effects: [
        {
          trigger: "onAttack",
          actions: [
            {
              type: "modifyAtk",
              amount: 300,
              target: "self",
              untilEndOfTurn: true
            }
          ],
          conditions: [
            {
              type: "isNight"
            }
          ]
        }
      ],
      noFusion: true
    },
    {
      id: 103,
      name: "Explorador de la selva",
      description: "Abre camino con el machete de obsidiana.",
      type: "monster",
      attribute: "tierra",
      tags: [
        "guerrero",
        "bestia"
      ],
      atk: 1100,
      def: 800,
      rarity: "N",
      set: "guerra-florida",
      noFusion: true
    },
    {
      id: 104,
      name: "Cachorro de jaguar negro",
      description: "Hijo de la noche. Cuando es destruido, robas 1 carta.",
      type: "monster",
      attribute: "tierra",
      tags: [
        "jaguar",
        "bestia",
        "muerte"
      ],
      atk: 800,
      def: 700,
      rarity: "N",
      set: "guerra-florida",
      effects: [
        {
          trigger: "onDestroyed",
          actions: [
            {
              type: "draw",
              amount: 1
            }
          ]
        }
      ],
      noFusion: true
    },
    {
      id: 105,
      name: "Tamborilero del teponaztli",
      description: "Su tambor marca el paso de la orden. Tus otros jaguares ganan +200 ATK.",
      type: "monster",
      attribute: "viento",
      tags: [
        "guerrero"
      ],
      atk: 600,
      def: 900,
      rarity: "N",
      set: "guerra-florida",
      effects: [
        {
          trigger: "continuous",
          actions: [
            {
              type: "modifyAtk",
              amount: 200,
              target: "otherAlliesWithTag",
              tag: "jaguar"
            }
          ]
        }
      ]
    },
    {
      id: 106,
      name: "Mono aullador",
      description: "Su grito anuncia a los guerreros que se acercan.",
      type: "monster",
      attribute: "viento",
      tags: [
        "bestia",
        "viento"
      ],
      atk: 900,
      def: 500,
      rarity: "N",
      set: "guerra-florida"
    },
    {
      id: 107,
      name: "Vig\xEDa nocturno",
      description: "Nunca duerme. De noche gana +200 ATK.",
      type: "monster",
      attribute: "tierra",
      tags: [
        "guerrero",
        "muerte"
      ],
      atk: 1200,
      def: 900,
      rarity: "N",
      set: "guerra-florida",
      effects: [
        {
          trigger: "continuous",
          actions: [
            {
              type: "modifyAtk",
              amount: 200,
              target: "self"
            }
          ],
          conditions: [
            {
              type: "isNight"
            }
          ]
        }
      ],
      noFusion: true
    },
    {
      id: 108,
      name: "Tapir de la selva",
      description: "Pesado y tranquilo, dif\xEDcil de derribar.",
      type: "monster",
      attribute: "agua",
      tags: [
        "bestia",
        "agua"
      ],
      atk: 700,
      def: 1500,
      rarity: "N",
      set: "guerra-florida",
      noFusion: true
    },
    {
      id: 109,
      name: "Guerrero con tepoztopilli",
      description: "Su lanza de hojas de obsidiana alcanza lejos.",
      type: "monster",
      attribute: "tierra",
      tags: [
        "guerrero"
      ],
      atk: 1300,
      def: 800,
      rarity: "N",
      set: "guerra-florida"
    },
    {
      id: 110,
      name: "Murci\xE9lago de la cueva sagrada",
      description: "Vuela de la cueva al Mictl\xE1n. Cuando hace da\xF1o directo, recuperas 300 PV.",
      type: "monster",
      attribute: "viento",
      tags: [
        "ave",
        "muerte",
        "viento"
      ],
      atk: 1e3,
      def: 600,
      rarity: "N",
      set: "guerra-florida",
      effects: [
        {
          trigger: "onDirectDamage",
          actions: [
            {
              type: "heal",
              amount: 300
            }
          ]
        }
      ],
      noFusion: true
    },
    {
      id: 111,
      name: "Rugido en la noche",
      description: "Tus jaguares ganan +500 ATK hasta el final del turno.",
      type: "spell",
      attribute: "tierra",
      tags: [],
      atk: 0,
      def: 0,
      rarity: "N",
      set: "guerra-florida",
      effects: [
        {
          trigger: "onActivate",
          actions: [
            {
              type: "modifyAtk",
              amount: 500,
              target: "alliesWithTag",
              tag: "jaguar",
              untilEndOfTurn: true
            }
          ]
        }
      ]
    },
    {
      id: 112,
      name: "Piel de jaguar",
      description: "El monstruo equipado gana +400 ATK y +200 DEF.",
      type: "equip",
      attribute: "tierra",
      tags: [],
      atk: 0,
      def: 0,
      rarity: "N",
      set: "guerra-florida",
      effects: [
        {
          trigger: "onActivate",
          actions: [
            {
              type: "modifyAtk",
              amount: 400,
              target: "equipTarget"
            },
            {
              type: "modifyDef",
              amount: 200,
              target: "equipTarget"
            }
          ]
        }
      ]
    },
    {
      id: 113,
      name: "Emboscada en la selva",
      description: "Cuando el rival ataca, su atacante pierde 600 ATK este turno.",
      type: "trap",
      attribute: "tierra",
      tags: [],
      atk: 0,
      def: 0,
      rarity: "N",
      set: "guerra-florida",
      effects: [
        {
          trigger: "onOpponentAttack",
          actions: [
            {
              type: "modifyAtk",
              amount: -600,
              target: "attacker",
              untilEndOfTurn: true
            }
          ]
        }
      ]
    },
    {
      id: 114,
      name: "Copal de la selva",
      description: "Humo que cura las heridas. Recuperas 800 PV.",
      type: "spell",
      attribute: "tierra",
      tags: [],
      atk: 0,
      def: 0,
      rarity: "N",
      set: "guerra-florida",
      effects: [
        {
          trigger: "onActivate",
          actions: [
            {
              type: "heal",
              amount: 800
            }
          ]
        }
      ]
    },
    {
      id: 115,
      name: "Guerrero Ocelotl",
      description: "Caballero jaguar de pleno derecho. De noche gana +400 ATK al atacar.",
      type: "monster",
      attribute: "tierra",
      tags: [
        "guerrero",
        "jaguar"
      ],
      atk: 1900,
      def: 1400,
      rarity: "R",
      set: "guerra-florida",
      effects: [
        {
          trigger: "onAttack",
          actions: [
            {
              type: "modifyAtk",
              amount: 400,
              target: "self",
              untilEndOfTurn: true
            }
          ],
          conditions: [
            {
              type: "isNight"
            }
          ]
        }
      ],
      recipes: [
        [
          101,
          102
        ]
      ]
    },
    {
      id: 116,
      name: "Jaguar de la luna",
      description: "Su pelaje refleja la luna. De noche gana +500 ATK.",
      type: "monster",
      attribute: "viento",
      tags: [
        "jaguar",
        "bestia",
        "viento"
      ],
      atk: 1700,
      def: 1200,
      rarity: "R",
      set: "guerra-florida",
      effects: [
        {
          trigger: "continuous",
          actions: [
            {
              type: "modifyAtk",
              amount: 500,
              target: "self"
            }
          ],
          conditions: [
            {
              type: "isNight"
            }
          ]
        }
      ],
      recipes: [
        [
          102,
          104
        ]
      ]
    },
    {
      id: 117,
      name: "Captor de prisioneros",
      description: "En la Guerra Florida no se mata: se captura. Cuando destruye a un monstruo en batalla, robas 1 carta.",
      type: "monster",
      attribute: "tierra",
      tags: [
        "guerrero",
        "muerte"
      ],
      atk: 1800,
      def: 1300,
      rarity: "R",
      set: "guerra-florida",
      effects: [
        {
          trigger: "onBattleDestroy",
          actions: [
            {
              type: "draw",
              amount: 1
            }
          ]
        }
      ],
      noFusion: true
    },
    {
      id: 118,
      name: "Ocelote acechador",
      description: "De noche salta sobre la l\xEDnea enemiga: puede atacar directo.",
      type: "monster",
      attribute: "tierra",
      tags: [
        "jaguar",
        "bestia"
      ],
      atk: 1600,
      def: 900,
      rarity: "R",
      set: "guerra-florida",
      effects: [
        {
          trigger: "continuous",
          actions: [
            {
              type: "grantKeyword",
              keyword: "directAttack",
              target: "self"
            }
          ],
          conditions: [
            {
              type: "isNight"
            }
          ]
        }
      ],
      noFusion: true
    },
    {
      id: 119,
      name: "Cuachic de la noche",
      description: "Los rapados no retroceden. Cuando es destruido, hace 500 de da\xF1o al rival.",
      type: "monster",
      attribute: "tierra",
      tags: [
        "guerrero"
      ],
      atk: 2e3,
      def: 1e3,
      rarity: "R",
      set: "guerra-florida",
      effects: [
        {
          trigger: "onDestroyed",
          actions: [
            {
              type: "damage",
              amount: 500,
              who: "opponent"
            }
          ]
        }
      ],
      recipes: [
        [
          109,
          105
        ]
      ]
    },
    {
      id: 120,
      name: "Cham\xE1n del espejo negro",
      description: "Mira el futuro en la obsidiana. De noche, al ser invocado, pone en defensa al monstruo m\xE1s fuerte del rival.",
      type: "monster",
      attribute: "viento",
      tags: [
        "muerte",
        "viento"
      ],
      atk: 1300,
      def: 1700,
      rarity: "R",
      set: "guerra-florida",
      effects: [
        {
          trigger: "onSummon",
          actions: [
            {
              type: "forceDefense",
              target: "highestAtkEnemy"
            }
          ],
          conditions: [
            {
              type: "isNight"
            }
          ]
        }
      ]
    },
    {
      id: 121,
      name: "Serpiente de la selva oscura",
      description: "Silenciosa entre las ra\xEDces. De noche gana +300 ATK.",
      type: "monster",
      attribute: "tierra",
      tags: [
        "serpiente",
        "muerte"
      ],
      atk: 1500,
      def: 1100,
      rarity: "R",
      set: "guerra-florida",
      effects: [
        {
          trigger: "continuous",
          actions: [
            {
              type: "modifyAtk",
              amount: 300,
              target: "self"
            }
          ],
          conditions: [
            {
              type: "isNight"
            }
          ]
        }
      ]
    },
    {
      id: 122,
      name: "Jaguar del cenote",
      description: "Nada en las aguas sagradas sin hacer ruido.",
      type: "monster",
      attribute: "agua",
      tags: [
        "jaguar",
        "bestia",
        "agua"
      ],
      atk: 1700,
      def: 1500,
      rarity: "R",
      set: "guerra-florida",
      noFusion: true
    },
    {
      id: 123,
      name: "Escudero de la orden jaguar",
      description: "Cuando lo atacan, gana +500 DEF este turno.",
      type: "monster",
      attribute: "tierra",
      tags: [
        "guerrero"
      ],
      atk: 1400,
      def: 2e3,
      rarity: "R",
      set: "guerra-florida",
      effects: [
        {
          trigger: "onAttacked",
          actions: [
            {
              type: "modifyDef",
              amount: 500,
              target: "self",
              untilEndOfTurn: true
            }
          ]
        }
      ]
    },
    {
      id: 124,
      name: "Tecolote de Tezcatlipoca",
      description: "Mensajero del espejo humeante. De noche, al ser invocado, destruye las m\xE1gicas y trampas colocadas del rival.",
      type: "monster",
      attribute: "viento",
      tags: [
        "ave",
        "muerte",
        "viento"
      ],
      atk: 1600,
      def: 1e3,
      rarity: "R",
      set: "guerra-florida",
      effects: [
        {
          trigger: "onSummon",
          actions: [
            {
              type: "destroySupport",
              who: "opponent"
            }
          ],
          conditions: [
            {
              type: "isNight"
            }
          ]
        }
      ]
    },
    {
      id: 125,
      name: "Tlahuiztli de jaguar",
      description: "El traje de la orden. El monstruo equipado gana +700 ATK y +300 DEF.",
      type: "equip",
      attribute: "tierra",
      tags: [],
      atk: 0,
      def: 0,
      rarity: "R",
      set: "guerra-florida",
      effects: [
        {
          trigger: "onActivate",
          actions: [
            {
              type: "modifyAtk",
              amount: 700,
              target: "equipTarget"
            },
            {
              type: "modifyDef",
              amount: 300,
              target: "equipTarget"
            }
          ]
        }
      ]
    },
    {
      id: 126,
      name: "Noche de cacer\xEDa",
      description: "Tus jaguares ganan +700 ATK hasta el final del turno y robas 1 carta.",
      type: "spell",
      attribute: "tierra",
      tags: [],
      atk: 0,
      def: 0,
      rarity: "R",
      set: "guerra-florida",
      effects: [
        {
          trigger: "onActivate",
          actions: [
            {
              type: "modifyAtk",
              amount: 700,
              target: "alliesWithTag",
              tag: "jaguar",
              untilEndOfTurn: true
            },
            {
              type: "draw",
              amount: 1
            }
          ]
        }
      ]
    },
    {
      id: 127,
      name: "Garras en la oscuridad",
      description: "De noche, cuando el rival ataca, su atacante es destruido.",
      type: "trap",
      attribute: "tierra",
      tags: [],
      atk: 0,
      def: 0,
      rarity: "R",
      set: "guerra-florida",
      effects: [
        {
          trigger: "onOpponentAttack",
          actions: [
            {
              type: "destroy",
              target: "attacker"
            }
          ],
          conditions: [
            {
              type: "isNight"
            }
          ]
        }
      ]
    },
    {
      id: 128,
      name: "Capit\xE1n Ocelotl",
      description: "Gu\xEDa de la casa de los jaguares. Tus otros jaguares ganan +300 ATK; de noche \xE9l gana +400.",
      type: "monster",
      attribute: "tierra",
      tags: [
        "guerrero",
        "jaguar"
      ],
      atk: 2600,
      def: 1900,
      rarity: "SR",
      set: "guerra-florida",
      effects: [
        {
          trigger: "continuous",
          actions: [
            {
              type: "modifyAtk",
              amount: 300,
              target: "otherAlliesWithTag",
              tag: "jaguar"
            }
          ]
        },
        {
          trigger: "continuous",
          actions: [
            {
              type: "modifyAtk",
              amount: 400,
              target: "self"
            }
          ],
          conditions: [
            {
              type: "isNight"
            }
          ]
        }
      ],
      recipes: [
        [
          115,
          116
        ]
      ]
    },
    {
      id: 129,
      name: "Jaguar de Tezcatlipoca",
      description: "La forma animal del dios. Hace da\xF1o de sobra a los monstruos en defensa; de noche gana +500 ATK.",
      type: "monster",
      attribute: "tierra",
      tags: [
        "jaguar",
        "bestia",
        "muerte"
      ],
      atk: 2500,
      def: 1800,
      rarity: "SR",
      set: "guerra-florida",
      effects: [
        {
          trigger: "continuous",
          actions: [
            {
              type: "grantKeyword",
              keyword: "piercing",
              target: "self"
            }
          ]
        },
        {
          trigger: "continuous",
          actions: [
            {
              type: "modifyAtk",
              amount: 500,
              target: "self"
            }
          ],
          conditions: [
            {
              type: "isNight"
            }
          ]
        }
      ],
      recipes: [
        [
          116,
          121
        ]
      ]
    },
    {
      id: 130,
      name: "Nahual del jaguar negro",
      description: "Hechicero de la orden. De noche se vuelve jaguar y, al ser invocado, robas 1 carta.",
      type: "monster",
      attribute: "tierra",
      tags: [
        "guerrero",
        "jaguar"
      ],
      atk: 1500,
      def: 1500,
      rarity: "SR",
      set: "guerra-florida",
      effects: [
        {
          trigger: "onSummon",
          actions: [
            {
              type: "draw",
              amount: 1
            }
          ],
          conditions: [
            {
              type: "isNight"
            }
          ]
        }
      ],
      nahual: {
        name: "Jaguar de la noche eterna",
        atk: 2800,
        def: 1600,
        description: "El hechicero ya no es hombre: es la noche con colmillos."
      }
    },
    {
      id: 131,
      name: "Cuachicqueh, los rapados",
      description: "Juraron no dar un paso atr\xE1s. Una vez por duelo sobreviven a un golpe que los destruir\xEDa.",
      type: "monster",
      attribute: "tierra",
      tags: [
        "guerrero"
      ],
      atk: 2700,
      def: 1600,
      rarity: "SR",
      set: "guerra-florida",
      effects: [
        {
          trigger: "continuous",
          actions: [
            {
              type: "grantKeyword",
              keyword: "battleImmune",
              target: "self"
            }
          ]
        }
      ]
    },
    {
      id: 132,
      name: "Se\xF1or de la cueva",
      description: "Guardi\xE1n de la entrada a la tierra. Cuando destruye a un monstruo en batalla, recuperas 500 PV.",
      type: "monster",
      attribute: "tierra",
      tags: [
        "jaguar",
        "bestia"
      ],
      atk: 2400,
      def: 2400,
      rarity: "SR",
      set: "guerra-florida",
      effects: [
        {
          trigger: "onBattleDestroy",
          actions: [
            {
              type: "heal",
              amount: 500
            }
          ]
        }
      ]
    },
    {
      id: 133,
      name: "Hechicera de la luna negra",
      description: "De noche, al ser invocada, regresa a la mano del rival su monstruo m\xE1s fuerte.",
      type: "monster",
      attribute: "viento",
      tags: [
        "muerte",
        "viento"
      ],
      atk: 2e3,
      def: 2600,
      rarity: "SR",
      set: "guerra-florida",
      effects: [
        {
          trigger: "onSummon",
          actions: [
            {
              type: "returnToHand",
              target: "highestAtkEnemy"
            }
          ],
          conditions: [
            {
              type: "isNight"
            }
          ]
        }
      ],
      recipes: [
        [
          117,
          120
        ]
      ]
    },
    {
      id: 134,
      name: "Espejo de obsidiana",
      description: "Tezcatlipoca muestra su destino: destruye al monstruo m\xE1s fuerte del rival.",
      type: "spell",
      attribute: "viento",
      tags: [],
      atk: 0,
      def: 0,
      rarity: "SR",
      set: "guerra-florida",
      effects: [
        {
          trigger: "onActivate",
          actions: [
            {
              type: "destroy",
              target: "highestAtkEnemy"
            }
          ]
        }
      ]
    },
    {
      id: 135,
      name: "Cacer\xEDa nocturna",
      description: "De noche, cuando el rival invoca un monstruo boca arriba, lo destruye.",
      type: "trap",
      attribute: "tierra",
      tags: [],
      atk: 0,
      def: 0,
      rarity: "SR",
      set: "guerra-florida",
      effects: [
        {
          trigger: "onOpponentSummon",
          actions: [
            {
              type: "destroy",
              target: "summoned"
            }
          ],
          conditions: [
            {
              type: "isNight"
            }
          ]
        }
      ]
    },
    {
      id: 136,
      name: "Macuahuitl del capit\xE1n",
      description: "La espada de obsidiana de la orden. El monstruo equipado gana +1000 ATK.",
      type: "equip",
      attribute: "tierra",
      tags: [],
      atk: 0,
      def: 0,
      rarity: "SR",
      set: "guerra-florida",
      effects: [
        {
          trigger: "onActivate",
          actions: [
            {
              type: "modifyAtk",
              amount: 1e3,
              target: "equipTarget"
            }
          ]
        }
      ]
    },
    {
      id: 137,
      name: "Tepey\xF3llotl, coraz\xF3n del monte",
      description: "El jaguar que hace temblar los cerros. Al ser invocado destruye a un monstruo rival al azar; de noche gana +600 ATK.",
      type: "monster",
      attribute: "tierra",
      tags: [
        "deidad",
        "jaguar",
        "bestia"
      ],
      atk: 3600,
      def: 3200,
      rarity: "UR",
      set: "guerra-florida",
      effects: [
        {
          trigger: "onSummon",
          actions: [
            {
              type: "destroy",
              target: "randomEnemy"
            }
          ]
        },
        {
          trigger: "continuous",
          actions: [
            {
              type: "modifyAtk",
              amount: 600,
              target: "self"
            }
          ],
          conditions: [
            {
              type: "isNight"
            }
          ]
        }
      ],
      noFusion: true
    },
    {
      id: 138,
      name: "Ocelotl Tecuhtli, se\xF1or jaguar",
      description: "El m\xE1s grande de la orden. Tus otros jaguares ganan +500 ATK; de noche ataca dos veces.",
      type: "monster",
      attribute: "tierra",
      tags: [
        "guerrero",
        "jaguar"
      ],
      atk: 3400,
      def: 2600,
      rarity: "UR",
      set: "guerra-florida",
      effects: [
        {
          trigger: "continuous",
          actions: [
            {
              type: "modifyAtk",
              amount: 500,
              target: "otherAlliesWithTag",
              tag: "jaguar"
            }
          ]
        },
        {
          trigger: "continuous",
          actions: [
            {
              type: "grantKeyword",
              keyword: "doubleAttack",
              target: "self"
            }
          ],
          conditions: [
            {
              type: "isNight"
            }
          ]
        }
      ],
      noFusion: true
    },
    {
      id: 139,
      name: "Yohualli, el viento nocturno",
      description: "Tezcatlipoca como viento de la noche. Puede atacar directo; de noche gana +300 ATK.",
      type: "monster",
      attribute: "viento",
      tags: [
        "deidad",
        "muerte",
        "viento"
      ],
      atk: 3300,
      def: 2900,
      rarity: "UR",
      set: "guerra-florida",
      effects: [
        {
          trigger: "continuous",
          actions: [
            {
              type: "grantKeyword",
              keyword: "directAttack",
              target: "self"
            }
          ]
        },
        {
          trigger: "continuous",
          actions: [
            {
              type: "modifyAtk",
              amount: 300,
              target: "self"
            }
          ],
          conditions: [
            {
              type: "isNight"
            }
          ]
        }
      ],
      noFusion: true
    },
    {
      id: 140,
      name: "Noche de Tezcatlipoca",
      description: "La oscuridad se lo traga todo: todos los monstruos del rival regresan a su mano.",
      type: "spell",
      attribute: "viento",
      tags: [],
      atk: 0,
      def: 0,
      rarity: "UR",
      set: "guerra-florida",
      effects: [
        {
          trigger: "onActivate",
          actions: [
            {
              type: "returnToHand",
              target: "allEnemies"
            }
          ]
        }
      ]
    },
    {
      id: 141,
      name: "Telpochtli del sol",
      description: "Joven guerrero que saluda al sol cada ma\xF1ana.",
      type: "monster",
      attribute: "sol",
      tags: [
        "guerrero",
        "sol"
      ],
      atk: 900,
      def: 700,
      rarity: "N",
      set: "guerra-florida"
    },
    {
      id: 142,
      name: "Aguilucho",
      description: "Todav\xEDa no vuela alto. De d\xEDa gana +200 ATK.",
      type: "monster",
      attribute: "sol",
      tags: [
        "ave",
        "sol"
      ],
      atk: 800,
      def: 600,
      rarity: "N",
      set: "guerra-florida",
      effects: [
        {
          trigger: "continuous",
          actions: [
            {
              type: "modifyAtk",
              amount: 200,
              target: "self"
            }
          ],
          conditions: [
            {
              type: "isDay"
            }
          ]
        }
      ],
      noFusion: true
    },
    {
      id: 143,
      name: "Halc\xF3n de Huitzilopochtli",
      description: "Cuando hace da\xF1o directo, hace 300 de da\xF1o extra.",
      type: "monster",
      attribute: "viento",
      tags: [
        "ave",
        "viento"
      ],
      atk: 1e3,
      def: 500,
      rarity: "N",
      set: "guerra-florida",
      effects: [
        {
          trigger: "onDirectDamage",
          actions: [
            {
              type: "damage",
              amount: 300,
              who: "opponent"
            }
          ]
        }
      ],
      noFusion: true
    },
    {
      id: 144,
      name: "Arquero del amanecer",
      description: "Dispara con la primera luz. En el Alba gana +400 ATK.",
      type: "monster",
      attribute: "viento",
      tags: [
        "guerrero",
        "viento"
      ],
      atk: 1200,
      def: 700,
      rarity: "N",
      set: "guerra-florida",
      effects: [
        {
          trigger: "continuous",
          actions: [
            {
              type: "modifyAtk",
              amount: 400,
              target: "self"
            }
          ],
          conditions: [
            {
              type: "isPhase",
              phase: "alba"
            }
          ]
        }
      ],
      noFusion: true
    },
    {
      id: 145,
      name: "Portaestandarte \xE1guila",
      description: "Lleva el estandarte de plumas. Tus otras aves ganan +200 ATK.",
      type: "monster",
      attribute: "sol",
      tags: [
        "guerrero",
        "ave"
      ],
      atk: 700,
      def: 1e3,
      rarity: "N",
      set: "guerra-florida",
      effects: [
        {
          trigger: "continuous",
          actions: [
            {
              type: "modifyAtk",
              amount: 200,
              target: "otherAlliesWithTag",
              tag: "ave"
            }
          ]
        }
      ]
    },
    {
      id: 146,
      name: "Colibr\xED de fuego",
      description: "Alma de guerrero ca\xEDdo. Cuando es destruido, hace 400 de da\xF1o al rival.",
      type: "monster",
      attribute: "sol",
      tags: [
        "ave",
        "fuego",
        "sol"
      ],
      atk: 600,
      def: 400,
      rarity: "N",
      set: "guerra-florida",
      effects: [
        {
          trigger: "onDestroyed",
          actions: [
            {
              type: "damage",
              amount: 400,
              who: "opponent"
            }
          ]
        }
      ]
    },
    {
      id: 147,
      name: "Paynani, corredor",
      description: "Lleva noticias de la batalla. Si se usa como material de fusi\xF3n, robas 1 carta.",
      type: "monster",
      attribute: "viento",
      tags: [
        "guerrero"
      ],
      atk: 1100,
      def: 600,
      rarity: "N",
      set: "guerra-florida",
      effects: [
        {
          trigger: "onFusionMaterial",
          actions: [
            {
              type: "draw",
              amount: 1
            }
          ]
        }
      ]
    },
    {
      id: 148,
      name: "Zopilote del campo de batalla",
      description: "Limpia el campo. Cuando destruye a un monstruo en batalla, recuperas 300 PV.",
      type: "monster",
      attribute: "viento",
      tags: [
        "ave",
        "muerte"
      ],
      atk: 1e3,
      def: 800,
      rarity: "N",
      set: "guerra-florida",
      effects: [
        {
          trigger: "onBattleDestroy",
          actions: [
            {
              type: "heal",
              amount: 300
            }
          ]
        }
      ],
      noFusion: true
    },
    {
      id: 149,
      name: "Hondero tlatelolca",
      description: "Sus piedras zumban como avispas.",
      type: "monster",
      attribute: "tierra",
      tags: [
        "guerrero"
      ],
      atk: 1300,
      def: 600,
      rarity: "N",
      set: "guerra-florida"
    },
    {
      id: 150,
      name: "Venado del sol",
      description: "Corre con el sol en los cuernos.",
      type: "monster",
      attribute: "sol",
      tags: [
        "bestia",
        "sol"
      ],
      atk: 1e3,
      def: 1e3,
      rarity: "N",
      set: "guerra-florida"
    },
    {
      id: 151,
      name: "Rodela del sol",
      description: "Escudo de plumas doradas. El monstruo equipado gana +200 ATK y +500 DEF.",
      type: "equip",
      attribute: "sol",
      tags: [],
      atk: 0,
      def: 0,
      rarity: "N",
      set: "guerra-florida",
      effects: [
        {
          trigger: "onActivate",
          actions: [
            {
              type: "modifyAtk",
              amount: 200,
              target: "equipTarget"
            },
            {
              type: "modifyDef",
              amount: 500,
              target: "equipTarget"
            }
          ]
        }
      ]
    },
    {
      id: 152,
      name: "Grito de guerra",
      description: "Todos tus monstruos ganan +300 ATK hasta el final del turno.",
      type: "spell",
      attribute: "sol",
      tags: [],
      atk: 0,
      def: 0,
      rarity: "N",
      set: "guerra-florida",
      effects: [
        {
          trigger: "onActivate",
          actions: [
            {
              type: "modifyAtk",
              amount: 300,
              target: "allAllies",
              untilEndOfTurn: true
            }
          ]
        }
      ]
    },
    {
      id: 153,
      name: "Lluvia de dardos",
      description: "Cuando el rival ataca, su atacante pierde 700 ATK este turno.",
      type: "trap",
      attribute: "viento",
      tags: [],
      atk: 0,
      def: 0,
      rarity: "N",
      set: "guerra-florida",
      effects: [
        {
          trigger: "onOpponentAttack",
          actions: [
            {
              type: "modifyAtk",
              amount: -700,
              target: "attacker",
              untilEndOfTurn: true
            }
          ]
        }
      ]
    },
    {
      id: 154,
      name: "Agua de ch\xEDa",
      description: "Bebida de los guerreros. Recuperas 700 PV.",
      type: "spell",
      attribute: "agua",
      tags: [],
      atk: 0,
      def: 0,
      rarity: "N",
      set: "guerra-florida",
      effects: [
        {
          trigger: "onActivate",
          actions: [
            {
              type: "heal",
              amount: 700
            }
          ]
        }
      ]
    },
    {
      id: 155,
      name: "Guerrero Cuauhtli",
      description: "Caballero \xE1guila de pleno derecho. De d\xEDa gana +300 ATK.",
      type: "monster",
      attribute: "sol",
      tags: [
        "guerrero",
        "ave",
        "sol"
      ],
      atk: 1900,
      def: 1500,
      rarity: "R",
      set: "guerra-florida",
      effects: [
        {
          trigger: "continuous",
          actions: [
            {
              type: "modifyAtk",
              amount: 300,
              target: "self"
            }
          ],
          conditions: [
            {
              type: "isDay"
            }
          ]
        }
      ],
      recipes: [
        [
          141,
          142
        ]
      ]
    },
    {
      id: 156,
      name: "\xC1guila del Templo",
      description: "Anida en lo alto del Templo Mayor. De d\xEDa, al ser invocada, robas 1 carta.",
      type: "monster",
      attribute: "sol",
      tags: [
        "ave",
        "sol"
      ],
      atk: 1700,
      def: 1100,
      rarity: "R",
      set: "guerra-florida",
      effects: [
        {
          trigger: "onSummon",
          actions: [
            {
              type: "draw",
              amount: 1
            }
          ],
          conditions: [
            {
              type: "isDay"
            }
          ]
        }
      ],
      recipes: [
        [
          143,
          146
        ]
      ]
    },
    {
      id: 157,
      name: "Noble cuauhpilli",
      description: "Gan\xF3 su rango en el campo. Hace da\xF1o de sobra a los monstruos en defensa.",
      type: "monster",
      attribute: "sol",
      tags: [
        "guerrero",
        "ave"
      ],
      atk: 1800,
      def: 1300,
      rarity: "R",
      set: "guerra-florida",
      effects: [
        {
          trigger: "continuous",
          actions: [
            {
              type: "grantKeyword",
              keyword: "piercing",
              target: "self"
            }
          ]
        }
      ]
    },
    {
      id: 158,
      name: "Otomitl, guerrero otom\xED",
      description: "Orden de los otom\xEDes. Cuando es destruido, invoca de tu mazo un guerrero con ATK de 1500 o menos.",
      type: "monster",
      attribute: "viento",
      tags: [
        "guerrero",
        "viento"
      ],
      atk: 2e3,
      def: 1200,
      rarity: "R",
      set: "guerra-florida",
      effects: [
        {
          trigger: "onDestroyed",
          actions: [
            {
              type: "summonFromDeck",
              maxAtk: 1500,
              tag: "guerrero"
            }
          ]
        }
      ]
    },
    {
      id: 159,
      name: "Sacerdotisa del sol naciente",
      description: "Canta para que el sol vuelva a salir. Al ser invocada, recuperas 800 PV.",
      type: "monster",
      attribute: "sol",
      tags: [
        "sacerdote",
        "sol"
      ],
      atk: 1200,
      def: 1800,
      rarity: "R",
      set: "guerra-florida",
      effects: [
        {
          trigger: "onSummon",
          actions: [
            {
              type: "heal",
              amount: 800
            }
          ]
        }
      ]
    },
    {
      id: 160,
      name: "Quetzal sagrado",
      description: "Sus plumas valen m\xE1s que el oro. Tus otras aves ganan +300 ATK.",
      type: "monster",
      attribute: "viento",
      tags: [
        "ave",
        "viento"
      ],
      atk: 1500,
      def: 1300,
      rarity: "R",
      set: "guerra-florida",
      effects: [
        {
          trigger: "continuous",
          actions: [
            {
              type: "modifyAtk",
              amount: 300,
              target: "otherAlliesWithTag",
              tag: "ave"
            }
          ]
        }
      ],
      noFusion: true
    },
    {
      id: 161,
      name: "Halc\xF3n peregrino",
      description: "De d\xEDa cae en picada: puede atacar directo.",
      type: "monster",
      attribute: "viento",
      tags: [
        "ave",
        "viento"
      ],
      atk: 1800,
      def: 700,
      rarity: "R",
      set: "guerra-florida",
      effects: [
        {
          trigger: "continuous",
          actions: [
            {
              type: "grantKeyword",
              keyword: "directAttack",
              target: "self"
            }
          ],
          conditions: [
            {
              type: "isDay"
            }
          ]
        }
      ]
    },
    {
      id: 162,
      name: "Guerrero de la Triple Alianza",
      description: "M\xE9xico, Texcoco y Tlacopan pelean juntos.",
      type: "monster",
      attribute: "tierra",
      tags: [
        "guerrero"
      ],
      atk: 1700,
      def: 1700,
      rarity: "R",
      set: "guerra-florida",
      recipes: [
        [
          149,
          144
        ]
      ]
    },
    {
      id: 163,
      name: "Serpiente solar",
      description: "Cuando hace da\xF1o directo, hace 300 de da\xF1o extra.",
      type: "monster",
      attribute: "sol",
      tags: [
        "serpiente",
        "fuego",
        "sol"
      ],
      atk: 1600,
      def: 1200,
      rarity: "R",
      set: "guerra-florida",
      effects: [
        {
          trigger: "onDirectDamage",
          actions: [
            {
              type: "damage",
              amount: 300,
              who: "opponent"
            }
          ]
        }
      ],
      noFusion: true
    },
    {
      id: 164,
      name: "Cihuateteo del ocaso",
      description: "Acompa\xF1a al sol cuando baja. En el Ocaso gana +600 ATK.",
      type: "monster",
      attribute: "viento",
      tags: [
        "guerrero",
        "muerte",
        "viento"
      ],
      atk: 1600,
      def: 1400,
      rarity: "R",
      set: "guerra-florida",
      effects: [
        {
          trigger: "continuous",
          actions: [
            {
              type: "modifyAtk",
              amount: 600,
              target: "self"
            }
          ],
          conditions: [
            {
              type: "isPhase",
              phase: "ocaso"
            }
          ]
        }
      ],
      noFusion: true
    },
    {
      id: 165,
      name: "Plumaje de \xE1guila",
      description: "El monstruo equipado gana +400 ATK y puede atacar directo.",
      type: "equip",
      attribute: "viento",
      tags: [],
      atk: 0,
      def: 0,
      rarity: "R",
      set: "guerra-florida",
      effects: [
        {
          trigger: "onActivate",
          actions: [
            {
              type: "modifyAtk",
              amount: 400,
              target: "equipTarget"
            },
            {
              type: "grantKeyword",
              keyword: "directAttack",
              target: "equipTarget"
            }
          ]
        }
      ]
    },
    {
      id: 166,
      name: "Sol en el cenit",
      description: "Tus monstruos de sol ganan +600 ATK hasta el final del turno.",
      type: "spell",
      attribute: "sol",
      tags: [],
      atk: 0,
      def: 0,
      rarity: "R",
      set: "guerra-florida",
      effects: [
        {
          trigger: "onActivate",
          actions: [
            {
              type: "modifyAtk",
              amount: 600,
              target: "alliesWithTag",
              tag: "sol",
              untilEndOfTurn: true
            }
          ]
        }
      ]
    },
    {
      id: 167,
      name: "Vuelo en picada",
      description: "Cuando el rival invoca un monstruo boca arriba, regresa a su mano.",
      type: "trap",
      attribute: "viento",
      tags: [],
      atk: 0,
      def: 0,
      rarity: "R",
      set: "guerra-florida",
      effects: [
        {
          trigger: "onOpponentSummon",
          actions: [
            {
              type: "returnToHand",
              target: "summoned"
            }
          ]
        }
      ]
    },
    {
      id: 168,
      name: "Capit\xE1n Cuauhtli",
      description: "Gu\xEDa de la casa de las \xE1guilas. Tus otras aves ganan +300 ATK; de d\xEDa \xE9l gana +300.",
      type: "monster",
      attribute: "sol",
      tags: [
        "guerrero",
        "ave",
        "sol"
      ],
      atk: 2600,
      def: 2e3,
      rarity: "SR",
      set: "guerra-florida",
      effects: [
        {
          trigger: "continuous",
          actions: [
            {
              type: "modifyAtk",
              amount: 300,
              target: "otherAlliesWithTag",
              tag: "ave"
            }
          ]
        },
        {
          trigger: "continuous",
          actions: [
            {
              type: "modifyAtk",
              amount: 300,
              target: "self"
            }
          ],
          conditions: [
            {
              type: "isDay"
            }
          ]
        }
      ],
      recipes: [
        [
          155,
          156
        ]
      ]
    },
    {
      id: 169,
      name: "\xC1guila de fuego",
      description: "Baja del sol envuelta en llamas. Al ser invocada hace 600 de da\xF1o al rival.",
      type: "monster",
      attribute: "sol",
      tags: [
        "ave",
        "fuego",
        "sol"
      ],
      atk: 2500,
      def: 1500,
      rarity: "SR",
      set: "guerra-florida",
      effects: [
        {
          trigger: "onSummon",
          actions: [
            {
              type: "damage",
              amount: 600,
              who: "opponent"
            }
          ]
        }
      ],
      recipes: [
        [
          156,
          146
        ]
      ]
    },
    {
      id: 170,
      name: "Guerrero del Quinto Sol",
      description: "Pelea para que el sol no se apague. Hace da\xF1o de sobra contra defensa; de d\xEDa gana +300 ATK.",
      type: "monster",
      attribute: "sol",
      tags: [
        "guerrero",
        "sol"
      ],
      atk: 2700,
      def: 2100,
      rarity: "SR",
      set: "guerra-florida",
      effects: [
        {
          trigger: "continuous",
          actions: [
            {
              type: "grantKeyword",
              keyword: "piercing",
              target: "self"
            }
          ]
        },
        {
          trigger: "continuous",
          actions: [
            {
              type: "modifyAtk",
              amount: 300,
              target: "self"
            }
          ],
          conditions: [
            {
              type: "isDay"
            }
          ]
        }
      ]
    },
    {
      id: 171,
      name: "Tlacochc\xE1lcatl, general",
      description: "Se\xF1or de la casa de los dardos. Cuando destruye a un monstruo en batalla, invoca de tu mazo un guerrero con ATK de 2000 o menos.",
      type: "monster",
      attribute: "tierra",
      tags: [
        "guerrero"
      ],
      atk: 2400,
      def: 2400,
      rarity: "SR",
      set: "guerra-florida",
      effects: [
        {
          trigger: "onBattleDestroy",
          actions: [
            {
              type: "summonFromDeck",
              maxAtk: 2e3,
              tag: "guerrero"
            }
          ]
        }
      ]
    },
    {
      id: 172,
      name: "Guerrera del mediod\xEDa",
      description: "Vuela con el sol en lo m\xE1s alto. Al Mediod\xEDa ataca dos veces.",
      type: "monster",
      attribute: "viento",
      tags: [
        "guerrero",
        "ave",
        "viento"
      ],
      atk: 2300,
      def: 1800,
      rarity: "SR",
      set: "guerra-florida",
      effects: [
        {
          trigger: "continuous",
          actions: [
            {
              type: "grantKeyword",
              keyword: "doubleAttack",
              target: "self"
            }
          ],
          conditions: [
            {
              type: "isPhase",
              phase: "mediodia"
            }
          ]
        }
      ],
      recipes: [
        [
          157,
          161
        ]
      ]
    },
    {
      id: 173,
      name: "Gran quetzal de Tamoanchan",
      description: "Ave del para\xEDso de los dioses. Al ser invocado destruye las m\xE1gicas y trampas colocadas del rival.",
      type: "monster",
      attribute: "viento",
      tags: [
        "ave",
        "viento"
      ],
      atk: 2200,
      def: 2500,
      rarity: "SR",
      set: "guerra-florida",
      effects: [
        {
          trigger: "onSummon",
          actions: [
            {
              type: "destroySupport",
              who: "opponent"
            }
          ]
        }
      ]
    },
    {
      id: 174,
      name: "Flechas del sol",
      description: "Destruye al monstruo m\xE1s d\xE9bil del rival y le hace 500 de da\xF1o.",
      type: "spell",
      attribute: "sol",
      tags: [],
      atk: 0,
      def: 0,
      rarity: "SR",
      set: "guerra-florida",
      effects: [
        {
          trigger: "onActivate",
          actions: [
            {
              type: "destroy",
              target: "lowestAtkEnemy"
            },
            {
              type: "damage",
              amount: 500,
              who: "opponent"
            }
          ]
        }
      ]
    },
    {
      id: 175,
      name: "Escudo del sol",
      description: "Cuando el rival ataca, el ataque no sucede y recuperas 1000 PV.",
      type: "trap",
      attribute: "sol",
      tags: [],
      atk: 0,
      def: 0,
      rarity: "SR",
      set: "guerra-florida",
      effects: [
        {
          trigger: "onOpponentAttack",
          actions: [
            {
              type: "negateAttack"
            },
            {
              type: "heal",
              amount: 1e3
            }
          ]
        }
      ]
    },
    {
      id: 176,
      name: "Lanza de Huitzilopochtli",
      description: "El monstruo equipado gana +600 ATK y ataca dos veces.",
      type: "equip",
      attribute: "sol",
      tags: [],
      atk: 0,
      def: 0,
      rarity: "SR",
      set: "guerra-florida",
      effects: [
        {
          trigger: "onActivate",
          actions: [
            {
              type: "modifyAtk",
              amount: 600,
              target: "equipTarget"
            },
            {
              type: "grantKeyword",
              keyword: "doubleAttack",
              target: "equipTarget"
            }
          ]
        }
      ]
    },
    {
      id: 177,
      name: "Cuauht\xE9moc, \xE1guila que desciende",
      description: "El \xFAltimo tlatoani, que nunca se rindi\xF3. Al ser invocado destruye al monstruo m\xE1s fuerte del rival.",
      type: "monster",
      attribute: "sol",
      tags: [
        "guerrero",
        "ave",
        "sol"
      ],
      atk: 3500,
      def: 2700,
      rarity: "UR",
      set: "guerra-florida",
      effects: [
        {
          trigger: "onSummon",
          actions: [
            {
              type: "destroy",
              target: "highestAtkEnemy"
            }
          ]
        }
      ],
      noFusion: true
    },
    {
      id: 178,
      name: "Cuauhtli Tonatiuh, \xE1guila del sol",
      description: "El sol con alas de \xE1guila. Tus otros guerreros ganan +400 ATK; de d\xEDa hace da\xF1o de sobra contra defensa.",
      type: "monster",
      attribute: "sol",
      tags: [
        "deidad",
        "ave",
        "sol"
      ],
      atk: 3700,
      def: 3e3,
      rarity: "UR",
      set: "guerra-florida",
      effects: [
        {
          trigger: "continuous",
          actions: [
            {
              type: "modifyAtk",
              amount: 400,
              target: "otherAlliesWithTag",
              tag: "guerrero"
            }
          ]
        },
        {
          trigger: "continuous",
          actions: [
            {
              type: "grantKeyword",
              keyword: "piercing",
              target: "self"
            }
          ],
          conditions: [
            {
              type: "isDay"
            }
          ]
        }
      ],
      noFusion: true
    },
    {
      id: 179,
      name: "Painal, mensajero de la guerra",
      description: "El veloz de Huitzilopochtli. Puede atacar directo; cuando hace da\xF1o directo, robas 1 carta.",
      type: "monster",
      attribute: "viento",
      tags: [
        "deidad",
        "guerrero",
        "viento"
      ],
      atk: 3300,
      def: 2600,
      rarity: "UR",
      set: "guerra-florida",
      effects: [
        {
          trigger: "continuous",
          actions: [
            {
              type: "grantKeyword",
              keyword: "directAttack",
              target: "self"
            }
          ]
        },
        {
          trigger: "onDirectDamage",
          actions: [
            {
              type: "draw",
              amount: 1
            }
          ]
        }
      ],
      noFusion: true
    },
    {
      id: 180,
      name: "Amanecer del Quinto Sol",
      description: "El sol vuelve a nacer: todos tus monstruos ganan +1000 ATK este turno, recuperas 1500 PV y robas 1 carta.",
      type: "spell",
      attribute: "sol",
      tags: [],
      atk: 0,
      def: 0,
      rarity: "UR",
      set: "guerra-florida",
      effects: [
        {
          trigger: "onActivate",
          actions: [
            {
              type: "modifyAtk",
              amount: 1e3,
              target: "allAllies",
              untilEndOfTurn: true
            },
            {
              type: "heal",
              amount: 1500
            },
            {
              type: "draw",
              amount: 1
            }
          ]
        }
      ]
    },
    {
      id: 181,
      name: "Novicio del calm\xE9cac",
      description: "Aprende los cantos y el calendario. Al ser invocado, recuperas 300 PV.",
      type: "monster",
      attribute: "sol",
      tags: [
        "sacerdote"
      ],
      atk: 600,
      def: 1e3,
      rarity: "N",
      set: "guerra-florida",
      effects: [
        {
          trigger: "onSummon",
          actions: [
            {
              type: "heal",
              amount: 300
            }
          ]
        }
      ]
    },
    {
      id: 182,
      name: "Portador de copal",
      description: "Su incensario nunca se apaga. Cuando es destruido, recuperas 500 PV.",
      type: "monster",
      attribute: "sol",
      tags: [
        "sacerdote",
        "fuego"
      ],
      atk: 700,
      def: 900,
      rarity: "N",
      set: "guerra-florida",
      effects: [
        {
          trigger: "onDestroyed",
          actions: [
            {
              type: "heal",
              amount: 500
            }
          ]
        }
      ]
    },
    {
      id: 183,
      name: "Serpiente de la escalinata",
      description: "Cabeza de piedra que cobra vida al pie del templo.",
      type: "monster",
      attribute: "tierra",
      tags: [
        "serpiente"
      ],
      atk: 1e3,
      def: 1100,
      rarity: "N",
      set: "guerra-florida"
    },
    {
      id: 184,
      name: "Guardi\xE1n del tzompantli",
      description: "Vigila el muro de los cr\xE1neos.",
      type: "monster",
      attribute: "tierra",
      tags: [
        "guerrero",
        "muerte"
      ],
      atk: 1200,
      def: 900,
      rarity: "N",
      set: "guerra-florida",
      noFusion: true
    },
    {
      id: 185,
      name: "M\xFAsico de la caracola",
      description: "Su caracola llama a los dioses. Tus otros sacerdotes ganan +200 ATK.",
      type: "monster",
      attribute: "viento",
      tags: [
        "sacerdote",
        "viento"
      ],
      atk: 500,
      def: 800,
      rarity: "N",
      set: "guerra-florida",
      effects: [
        {
          trigger: "continuous",
          actions: [
            {
              type: "modifyAtk",
              amount: 200,
              target: "otherAlliesWithTag",
              tag: "sacerdote"
            }
          ]
        }
      ]
    },
    {
      id: 186,
      name: "Coyote de brasas",
      description: "Ronda el fuego del altar.",
      type: "monster",
      attribute: "tierra",
      tags: [
        "bestia",
        "fuego"
      ],
      atk: 1100,
      def: 600,
      rarity: "N",
      set: "guerra-florida"
    },
    {
      id: 187,
      name: "Lagarto del altar",
      description: "Duerme sobre las piedras calientes.",
      type: "monster",
      attribute: "sol",
      tags: [
        "serpiente",
        "fuego"
      ],
      atk: 900,
      def: 900,
      rarity: "N",
      set: "guerra-florida",
      noFusion: true
    },
    {
      id: 188,
      name: "Escultor de piedra",
      description: "Talla a los dioses en basalto. Duro como su obra.",
      type: "monster",
      attribute: "tierra",
      tags: [
        "sacerdote"
      ],
      atk: 400,
      def: 1600,
      rarity: "N",
      set: "guerra-florida"
    },
    {
      id: 189,
      name: "Lechuza del templo",
      description: "Canta cuando alguien va a morir. De noche gana +200 ATK.",
      type: "monster",
      attribute: "viento",
      tags: [
        "ave",
        "muerte"
      ],
      atk: 1e3,
      def: 700,
      rarity: "N",
      set: "guerra-florida",
      effects: [
        {
          trigger: "continuous",
          actions: [
            {
              type: "modifyAtk",
              amount: 200,
              target: "self"
            }
          ],
          conditions: [
            {
              type: "isNight"
            }
          ]
        }
      ],
      noFusion: true
    },
    {
      id: 190,
      name: "Cautivo de guerra",
      description: "Capturado en la Guerra Florida. Cuando es destruido, robas 1 carta.",
      type: "monster",
      attribute: "tierra",
      tags: [
        "guerrero"
      ],
      atk: 800,
      def: 800,
      rarity: "N",
      set: "guerra-florida",
      effects: [
        {
          trigger: "onDestroyed",
          actions: [
            {
              type: "draw",
              amount: 1
            }
          ]
        }
      ]
    },
    {
      id: 191,
      name: "Humo de copal",
      description: "Hace 500 de da\xF1o al rival y recuperas 500 PV.",
      type: "spell",
      attribute: "sol",
      tags: [],
      atk: 0,
      def: 0,
      rarity: "N",
      set: "guerra-florida",
      effects: [
        {
          trigger: "onActivate",
          actions: [
            {
              type: "damage",
              amount: 500,
              who: "opponent"
            },
            {
              type: "heal",
              amount: 500
            }
          ]
        }
      ]
    },
    {
      id: 192,
      name: "T\xE9cpatl, cuchillo de pedernal",
      description: "El monstruo equipado gana +500 ATK.",
      type: "equip",
      attribute: "tierra",
      tags: [],
      atk: 0,
      def: 0,
      rarity: "N",
      set: "guerra-florida",
      effects: [
        {
          trigger: "onActivate",
          actions: [
            {
              type: "modifyAtk",
              amount: 500,
              target: "equipTarget"
            }
          ]
        }
      ]
    },
    {
      id: 193,
      name: "Coatepantli, muro de serpientes",
      description: "Cuando el rival ataca, su atacante pierde 500 ATK este turno y queda en defensa.",
      type: "trap",
      attribute: "tierra",
      tags: [],
      atk: 0,
      def: 0,
      rarity: "N",
      set: "guerra-florida",
      effects: [
        {
          trigger: "onOpponentAttack",
          actions: [
            {
              type: "modifyAtk",
              amount: -500,
              target: "attacker",
              untilEndOfTurn: true
            },
            {
              type: "forceDefense",
              target: "attacker"
            }
          ]
        }
      ]
    },
    {
      id: 194,
      name: "Danza ritual",
      description: "Todos tus monstruos ganan +300 ATK este turno y recuperas 300 PV.",
      type: "spell",
      attribute: "sol",
      tags: [],
      atk: 0,
      def: 0,
      rarity: "N",
      set: "guerra-florida",
      effects: [
        {
          trigger: "onActivate",
          actions: [
            {
              type: "modifyAtk",
              amount: 300,
              target: "allAllies",
              untilEndOfTurn: true
            },
            {
              type: "heal",
              amount: 300
            }
          ]
        }
      ]
    },
    {
      id: 195,
      name: "Tlamacazqui del fuego",
      description: "Guarda el fuego del templo. Al ser invocado hace 400 de da\xF1o al rival.",
      type: "monster",
      attribute: "sol",
      tags: [
        "sacerdote",
        "fuego"
      ],
      atk: 1500,
      def: 1600,
      rarity: "R",
      set: "guerra-florida",
      effects: [
        {
          trigger: "onSummon",
          actions: [
            {
              type: "damage",
              amount: 400,
              who: "opponent"
            }
          ]
        }
      ],
      recipes: [
        [
          181,
          182
        ]
      ]
    },
    {
      id: 196,
      name: "Sacerdote serpiente",
      description: "Habla con Cihuac\xF3atl. Al ser invocado pone en defensa al monstruo m\xE1s fuerte del rival.",
      type: "monster",
      attribute: "tierra",
      tags: [
        "sacerdote",
        "serpiente"
      ],
      atk: 1600,
      def: 1400,
      rarity: "R",
      set: "guerra-florida",
      effects: [
        {
          trigger: "onSummon",
          actions: [
            {
              type: "forceDefense",
              target: "highestAtkEnemy"
            }
          ]
        }
      ]
    },
    {
      id: 197,
      name: "Guardi\xE1n de la piedra lunar",
      description: "Cuida la piedra de Coyolxauhqui. Cuando es destruido, hace 500 de da\xF1o al rival.",
      type: "monster",
      attribute: "tierra",
      tags: [
        "guerrero",
        "muerte"
      ],
      atk: 1800,
      def: 1500,
      rarity: "R",
      set: "guerra-florida",
      effects: [
        {
          trigger: "onDestroyed",
          actions: [
            {
              type: "damage",
              amount: 500,
              who: "opponent"
            }
          ]
        }
      ],
      recipes: [
        [
          184,
          190
        ]
      ],
      noFusion: true
    },
    {
      id: 198,
      name: "Xiuhc\xF3atl menor",
      description: "Cr\xEDa de la serpiente de fuego. Hace da\xF1o de sobra a los monstruos en defensa.",
      type: "monster",
      attribute: "sol",
      tags: [
        "serpiente",
        "fuego"
      ],
      atk: 1900,
      def: 1100,
      rarity: "R",
      set: "guerra-florida",
      effects: [
        {
          trigger: "continuous",
          actions: [
            {
              type: "grantKeyword",
              keyword: "piercing",
              target: "self"
            }
          ]
        }
      ],
      recipes: [
        [
          183,
          187
        ]
      ],
      noFusion: true
    },
    {
      id: 199,
      name: "Sacerdotisa de Cihuac\xF3atl",
      description: "Cuando es destruida, el guerrero m\xE1s fuerte de tu Mictl\xE1n vuelve al campo.",
      type: "monster",
      attribute: "tierra",
      tags: [
        "sacerdote",
        "muerte"
      ],
      atk: 1400,
      def: 1800,
      rarity: "R",
      set: "guerra-florida",
      effects: [
        {
          trigger: "onDestroyed",
          actions: [
            {
              type: "revive",
              tag: "guerrero"
            }
          ]
        }
      ]
    },
    {
      id: 200,
      name: "Guardi\xE1n del fuego eterno",
      description: "Al empezar tu turno, recuperas 300 PV.",
      type: "monster",
      attribute: "sol",
      tags: [
        "sacerdote",
        "fuego",
        "sol"
      ],
      atk: 1700,
      def: 1300,
      rarity: "R",
      set: "guerra-florida",
      effects: [
        {
          trigger: "onTurnStart",
          actions: [
            {
              type: "heal",
              amount: 300
            }
          ]
        }
      ]
    },
    {
      id: 201,
      name: "Cipactli de piedra",
      description: "El monstruo de la tierra tallado en la base del templo.",
      type: "monster",
      attribute: "tierra",
      tags: [
        "bestia",
        "muerte"
      ],
      atk: 1900,
      def: 1600,
      rarity: "R",
      set: "guerra-florida",
      noFusion: true
    },
    {
      id: 202,
      name: "Serpiente de obsidiana",
      description: "Corta como navaja. Cuando destruye a un monstruo en batalla, robas 1 carta.",
      type: "monster",
      attribute: "tierra",
      tags: [
        "serpiente",
        "muerte"
      ],
      atk: 1700,
      def: 1e3,
      rarity: "R",
      set: "guerra-florida",
      effects: [
        {
          trigger: "onBattleDestroy",
          actions: [
            {
              type: "draw",
              amount: 1
            }
          ]
        }
      ]
    },
    {
      id: 203,
      name: "Danzante del fuego",
      description: "Baila sobre las brasas. A Medianoche ataca dos veces.",
      type: "monster",
      attribute: "sol",
      tags: [
        "sacerdote",
        "fuego"
      ],
      atk: 1600,
      def: 900,
      rarity: "R",
      set: "guerra-florida",
      effects: [
        {
          trigger: "continuous",
          actions: [
            {
              type: "grantKeyword",
              keyword: "doubleAttack",
              target: "self"
            }
          ],
          conditions: [
            {
              type: "isPhase",
              phase: "medianoche"
            }
          ]
        }
      ]
    },
    {
      id: 204,
      name: "Mujer de la ofrenda",
      description: "Lleva flores y ma\xEDz al altar. Al ser invocada, recuperas 1000 PV.",
      type: "monster",
      attribute: "agua",
      tags: [
        "sacerdote",
        "agua"
      ],
      atk: 1200,
      def: 2e3,
      rarity: "R",
      set: "guerra-florida",
      effects: [
        {
          trigger: "onSummon",
          actions: [
            {
              type: "heal",
              amount: 1e3
            }
          ]
        }
      ],
      noFusion: true
    },
    {
      id: 205,
      name: "Ofrenda al Sol",
      description: "Hace 1200 de da\xF1o al rival, pero pierdes 500 PV.",
      type: "spell",
      attribute: "sol",
      tags: [],
      atk: 0,
      def: 0,
      rarity: "R",
      set: "guerra-florida",
      effects: [
        {
          trigger: "onActivate",
          actions: [
            {
              type: "damage",
              amount: 1200,
              who: "opponent"
            },
            {
              type: "damage",
              amount: 500,
              who: "self"
            }
          ]
        }
      ]
    },
    {
      id: 206,
      name: "M\xE1scara de turquesa",
      description: "El monstruo equipado gana +600 ATK y +400 DEF.",
      type: "equip",
      attribute: "agua",
      tags: [],
      atk: 0,
      def: 0,
      rarity: "R",
      set: "guerra-florida",
      effects: [
        {
          trigger: "onActivate",
          actions: [
            {
              type: "modifyAtk",
              amount: 600,
              target: "equipTarget"
            },
            {
              type: "modifyDef",
              amount: 400,
              target: "equipTarget"
            }
          ]
        }
      ]
    },
    {
      id: 207,
      name: "Fuego del altar",
      description: "Cuando el rival invoca un monstruo boca arriba, ese monstruo pierde 700 ATK.",
      type: "trap",
      attribute: "sol",
      tags: [],
      atk: 0,
      def: 0,
      rarity: "R",
      set: "guerra-florida",
      effects: [
        {
          trigger: "onOpponentSummon",
          actions: [
            {
              type: "modifyAtk",
              amount: -700,
              target: "summoned"
            }
          ]
        }
      ]
    },
    {
      id: 208,
      name: "Huey Tlamacazqui, sumo sacerdote",
      description: "Habla en nombre de los dioses. Tus otros sacerdotes ganan +400 ATK.",
      type: "monster",
      attribute: "sol",
      tags: [
        "sacerdote",
        "fuego",
        "sol"
      ],
      atk: 2400,
      def: 2600,
      rarity: "SR",
      set: "guerra-florida",
      effects: [
        {
          trigger: "continuous",
          actions: [
            {
              type: "modifyAtk",
              amount: 400,
              target: "otherAlliesWithTag",
              tag: "sacerdote"
            }
          ]
        }
      ],
      recipes: [
        [
          195,
          196
        ]
      ]
    },
    {
      id: 209,
      name: "Xiuhc\xF3atl del Templo",
      description: "La serpiente de fuego que guarda a Huitzilopochtli. Al ser invocada destruye al monstruo m\xE1s d\xE9bil del rival.",
      type: "monster",
      attribute: "sol",
      tags: [
        "serpiente",
        "fuego",
        "sol"
      ],
      atk: 2700,
      def: 1800,
      rarity: "SR",
      set: "guerra-florida",
      effects: [
        {
          trigger: "onSummon",
          actions: [
            {
              type: "destroy",
              target: "lowestAtkEnemy"
            }
          ]
        }
      ],
      recipes: [
        [
          198,
          202
        ]
      ]
    },
    {
      id: 210,
      name: "Guerrero de la Piedra del Sol",
      description: "Su escudo es el calendario. De d\xEDa gana +500 ATK al atacar.",
      type: "monster",
      attribute: "sol",
      tags: [
        "guerrero",
        "sol"
      ],
      atk: 2600,
      def: 2e3,
      rarity: "SR",
      set: "guerra-florida",
      effects: [
        {
          trigger: "onAttack",
          actions: [
            {
              type: "modifyAtk",
              amount: 500,
              target: "self",
              untilEndOfTurn: true
            }
          ],
          conditions: [
            {
              type: "isDay"
            }
          ]
        }
      ]
    },
    {
      id: 211,
      name: "Sacerdote de Mictlantecuhtli",
      description: "Abre la puerta del Mictl\xE1n. Al ser invocado, el monstruo de muerte m\xE1s fuerte de tu Mictl\xE1n vuelve al campo.",
      type: "monster",
      attribute: "tierra",
      tags: [
        "sacerdote",
        "muerte"
      ],
      atk: 2200,
      def: 2300,
      rarity: "SR",
      set: "guerra-florida",
      effects: [
        {
          trigger: "onSummon",
          actions: [
            {
              type: "revive",
              tag: "muerte"
            }
          ]
        }
      ],
      recipes: [
        [
          199,
          189
        ]
      ]
    },
    {
      id: 212,
      name: "Serpiente de Coatepec",
      description: "Del cerro donde naci\xF3 Huitzilopochtli. Una vez por duelo sobrevive a un golpe que la destruir\xEDa.",
      type: "monster",
      attribute: "tierra",
      tags: [
        "serpiente",
        "muerte"
      ],
      atk: 2500,
      def: 2200,
      rarity: "SR",
      set: "guerra-florida",
      effects: [
        {
          trigger: "continuous",
          actions: [
            {
              type: "grantKeyword",
              keyword: "battleImmune",
              target: "self"
            }
          ]
        }
      ]
    },
    {
      id: 213,
      name: "Guardiana de las brasas",
      description: "Cuando es destruida, hace 1000 de da\xF1o al rival.",
      type: "monster",
      attribute: "sol",
      tags: [
        "sacerdote",
        "fuego"
      ],
      atk: 2300,
      def: 1700,
      rarity: "SR",
      set: "guerra-florida",
      effects: [
        {
          trigger: "onDestroyed",
          actions: [
            {
              type: "damage",
              amount: 1e3,
              who: "opponent"
            }
          ]
        }
      ]
    },
    {
      id: 214,
      name: "T\xE9chcatl, piedra del sacrificio",
      description: "Destruye al monstruo m\xE1s fuerte del rival, pero pierdes 500 PV.",
      type: "spell",
      attribute: "tierra",
      tags: [],
      atk: 0,
      def: 0,
      rarity: "SR",
      set: "guerra-florida",
      effects: [
        {
          trigger: "onActivate",
          actions: [
            {
              type: "destroy",
              target: "highestAtkEnemy"
            },
            {
              type: "damage",
              amount: 500,
              who: "self"
            }
          ]
        }
      ]
    },
    {
      id: 215,
      name: "Ira de Coatlicue",
      description: "Cuando el rival ataca, su atacante es destruido y el rival recibe 500 de da\xF1o.",
      type: "trap",
      attribute: "tierra",
      tags: [],
      atk: 0,
      def: 0,
      rarity: "SR",
      set: "guerra-florida",
      effects: [
        {
          trigger: "onOpponentAttack",
          actions: [
            {
              type: "destroy",
              target: "attacker"
            },
            {
              type: "damage",
              amount: 500,
              who: "opponent"
            }
          ]
        }
      ]
    },
    {
      id: 216,
      name: "Collar de jade del sacerdote",
      description: "El monstruo equipado gana +700 ATK y +700 DEF.",
      type: "equip",
      attribute: "agua",
      tags: [],
      atk: 0,
      def: 0,
      rarity: "SR",
      set: "guerra-florida",
      effects: [
        {
          trigger: "onActivate",
          actions: [
            {
              type: "modifyAtk",
              amount: 700,
              target: "equipTarget"
            },
            {
              type: "modifyDef",
              amount: 700,
              target: "equipTarget"
            }
          ]
        }
      ]
    },
    {
      id: 217,
      name: "Coatlicue, madre de los dioses",
      description: "La de la falda de serpientes. Al ser invocada, el monstruo m\xE1s fuerte de tu Mictl\xE1n vuelve al campo; tus otras serpientes ganan +400 ATK.",
      type: "monster",
      attribute: "tierra",
      tags: [
        "deidad",
        "serpiente",
        "muerte"
      ],
      atk: 3600,
      def: 3400,
      rarity: "UR",
      set: "guerra-florida",
      effects: [
        {
          trigger: "onSummon",
          actions: [
            {
              type: "revive"
            }
          ]
        },
        {
          trigger: "continuous",
          actions: [
            {
              type: "modifyAtk",
              amount: 400,
              target: "otherAlliesWithTag",
              tag: "serpiente"
            }
          ]
        }
      ],
      noFusion: true
    },
    {
      id: 218,
      name: "Quetzalc\xF3atl Tlamacazqui",
      description: "El sacerdote supremo lleva el nombre del dios. Al ser invocado robas 2 cartas; tus otros sacerdotes ganan +300 ATK.",
      type: "monster",
      attribute: "viento",
      tags: [
        "sacerdote",
        "serpiente",
        "fuego"
      ],
      atk: 3300,
      def: 3e3,
      rarity: "UR",
      set: "guerra-florida",
      effects: [
        {
          trigger: "onSummon",
          actions: [
            {
              type: "draw",
              amount: 2
            }
          ]
        },
        {
          trigger: "continuous",
          actions: [
            {
              type: "modifyAtk",
              amount: 300,
              target: "otherAlliesWithTag",
              tag: "sacerdote"
            }
          ]
        }
      ],
      noFusion: true
    },
    {
      id: 219,
      name: "Itztlacoliuhqui, obsidiana curva",
      description: "El dios de la helada y del castigo. Al ser invocado pone en defensa a todos los monstruos del rival; hace da\xF1o de sobra contra defensa.",
      type: "monster",
      attribute: "viento",
      tags: [
        "deidad",
        "muerte",
        "viento"
      ],
      atk: 3500,
      def: 2800,
      rarity: "UR",
      set: "guerra-florida",
      effects: [
        {
          trigger: "onSummon",
          actions: [
            {
              type: "forceDefense",
              target: "allEnemies"
            }
          ]
        },
        {
          trigger: "continuous",
          actions: [
            {
              type: "grantKeyword",
              keyword: "piercing",
              target: "self"
            }
          ]
        }
      ],
      noFusion: true
    },
    {
      id: 220,
      name: "Atadura de los a\xF1os",
      description: "Termina el ciclo de 52 a\xF1os: cuando el rival ataca, el ataque no sucede, todos sus monstruos regresan a su mano y no puede atacar en su siguiente turno.",
      type: "trap",
      attribute: "sol",
      tags: [],
      atk: 0,
      def: 0,
      rarity: "UR",
      set: "guerra-florida",
      effects: [
        {
          trigger: "onOpponentAttack",
          actions: [
            {
              type: "negateAttack"
            },
            {
              type: "returnToHand",
              target: "allEnemies"
            },
            {
              type: "preventAttack"
            }
          ]
        }
      ]
    }
  ],
  duelists: [
    {
      id: "ocelotl",
      name: "Ocelotl, capit\xE1n jaguar",
      title: "Ocelocalli, casa de los jaguares",
      level: 3,
      glyph: "\u263E",
      intro: "Abre la Guerra Florida bajo la luna. Sus jaguares son el doble de peligrosos de noche.",
      deck: [
        101,
        101,
        102,
        102,
        102,
        104,
        105,
        105,
        107,
        109,
        111,
        112,
        113,
        115,
        115,
        115,
        116,
        116,
        117,
        117,
        118,
        118,
        119,
        120,
        121,
        124,
        125,
        126,
        127,
        128,
        128,
        129,
        130,
        131,
        132,
        133,
        134,
        136,
        137,
        138
      ],
      signature: 128,
      rewards: [
        {
          card: 101,
          weight: 6
        },
        {
          card: 102,
          weight: 6
        },
        {
          card: 103,
          weight: 6
        },
        {
          card: 104,
          weight: 6
        },
        {
          card: 105,
          weight: 6
        },
        {
          card: 106,
          weight: 6
        },
        {
          card: 107,
          weight: 6
        },
        {
          card: 108,
          weight: 6
        },
        {
          card: 109,
          weight: 6
        },
        {
          card: 110,
          weight: 6
        },
        {
          card: 111,
          weight: 6
        },
        {
          card: 112,
          weight: 6
        },
        {
          card: 113,
          weight: 6
        },
        {
          card: 114,
          weight: 6
        },
        {
          card: 115,
          weight: 3
        },
        {
          card: 116,
          weight: 3
        },
        {
          card: 117,
          weight: 3
        },
        {
          card: 118,
          weight: 3
        },
        {
          card: 119,
          weight: 3
        },
        {
          card: 120,
          weight: 3
        },
        {
          card: 121,
          weight: 3
        },
        {
          card: 122,
          weight: 3
        },
        {
          card: 123,
          weight: 3
        },
        {
          card: 124,
          weight: 3
        },
        {
          card: 125,
          weight: 3
        },
        {
          card: 126,
          weight: 3
        },
        {
          card: 127,
          weight: 3
        },
        {
          card: 128,
          weight: 1
        },
        {
          card: 130,
          weight: 1
        },
        {
          card: 131,
          weight: 1
        },
        {
          card: 132,
          weight: 1
        },
        {
          card: 133,
          weight: 1
        },
        {
          card: 135,
          weight: 1
        },
        {
          card: 136,
          weight: 1
        }
      ]
    },
    {
      id: "cuauhtli",
      name: "Cuauhtli, se\xF1or de las \xE1guilas",
      title: "Cuauhcalli, casa de las \xE1guilas",
      level: 3,
      glyph: "\u2736",
      intro: "Baja del cielo con el sol a la espalda. Sus \xE1guilas atacan directo y queman de d\xEDa.",
      deck: [
        141,
        141,
        142,
        142,
        142,
        143,
        145,
        146,
        146,
        149,
        152,
        153,
        155,
        155,
        155,
        156,
        156,
        157,
        157,
        158,
        160,
        161,
        161,
        163,
        164,
        165,
        166,
        167,
        168,
        168,
        169,
        170,
        171,
        172,
        173,
        174,
        175,
        176,
        177,
        178
      ],
      signature: 168,
      rewards: [
        {
          card: 141,
          weight: 6
        },
        {
          card: 142,
          weight: 6
        },
        {
          card: 143,
          weight: 6
        },
        {
          card: 144,
          weight: 6
        },
        {
          card: 145,
          weight: 6
        },
        {
          card: 146,
          weight: 6
        },
        {
          card: 147,
          weight: 6
        },
        {
          card: 148,
          weight: 6
        },
        {
          card: 149,
          weight: 6
        },
        {
          card: 150,
          weight: 6
        },
        {
          card: 151,
          weight: 6
        },
        {
          card: 152,
          weight: 6
        },
        {
          card: 153,
          weight: 6
        },
        {
          card: 154,
          weight: 6
        },
        {
          card: 155,
          weight: 3
        },
        {
          card: 156,
          weight: 3
        },
        {
          card: 157,
          weight: 3
        },
        {
          card: 158,
          weight: 3
        },
        {
          card: 159,
          weight: 3
        },
        {
          card: 160,
          weight: 3
        },
        {
          card: 161,
          weight: 3
        },
        {
          card: 162,
          weight: 3
        },
        {
          card: 163,
          weight: 3
        },
        {
          card: 164,
          weight: 3
        },
        {
          card: 165,
          weight: 3
        },
        {
          card: 166,
          weight: 3
        },
        {
          card: 167,
          weight: 3
        },
        {
          card: 168,
          weight: 1
        },
        {
          card: 169,
          weight: 1
        },
        {
          card: 171,
          weight: 1
        },
        {
          card: 172,
          weight: 1
        },
        {
          card: 173,
          weight: 1
        },
        {
          card: 174,
          weight: 1
        },
        {
          card: 175,
          weight: 1
        }
      ]
    },
    {
      id: "tlamacazqui",
      name: "Tlamacazqui, gran sacerdote",
      title: "Huey Teocalli, Templo Mayor",
      level: 3,
      glyph: "\u25B2",
      intro: "En lo alto del Templo Mayor espera el fin de la Guerra Florida. Sus sacerdotes vuelven del Mictl\xE1n.",
      deck: [
        181,
        181,
        182,
        182,
        183,
        185,
        185,
        187,
        190,
        191,
        193,
        195,
        195,
        195,
        196,
        196,
        197,
        198,
        198,
        199,
        199,
        202,
        203,
        205,
        206,
        207,
        208,
        208,
        209,
        209,
        210,
        211,
        212,
        213,
        214,
        215,
        216,
        217,
        218,
        219
      ],
      signature: 208,
      rewards: [
        {
          card: 181,
          weight: 6
        },
        {
          card: 182,
          weight: 6
        },
        {
          card: 183,
          weight: 6
        },
        {
          card: 184,
          weight: 6
        },
        {
          card: 185,
          weight: 6
        },
        {
          card: 186,
          weight: 6
        },
        {
          card: 187,
          weight: 6
        },
        {
          card: 188,
          weight: 6
        },
        {
          card: 189,
          weight: 6
        },
        {
          card: 190,
          weight: 6
        },
        {
          card: 191,
          weight: 6
        },
        {
          card: 192,
          weight: 6
        },
        {
          card: 193,
          weight: 6
        },
        {
          card: 194,
          weight: 6
        },
        {
          card: 195,
          weight: 3
        },
        {
          card: 196,
          weight: 3
        },
        {
          card: 197,
          weight: 3
        },
        {
          card: 198,
          weight: 3
        },
        {
          card: 199,
          weight: 3
        },
        {
          card: 200,
          weight: 3
        },
        {
          card: 201,
          weight: 3
        },
        {
          card: 202,
          weight: 3
        },
        {
          card: 203,
          weight: 3
        },
        {
          card: 204,
          weight: 3
        },
        {
          card: 205,
          weight: 3
        },
        {
          card: 206,
          weight: 3
        },
        {
          card: 207,
          weight: 3
        },
        {
          card: 208,
          weight: 1
        },
        {
          card: 209,
          weight: 1
        },
        {
          card: 210,
          weight: 1
        },
        {
          card: 212,
          weight: 1
        },
        {
          card: 213,
          weight: 1
        },
        {
          card: 215,
          weight: 1
        },
        {
          card: 216,
          weight: 1
        }
      ]
    }
  ],
  packs: [
    {
      id: "ocelomeh",
      name: "Sobre de los Guerreros Jaguar",
      glyph: "\u263E",
      color: "#8a6a2e",
      description: "Guerra Florida \xB7 La orden jaguar y la noche de Tezcatlipoca.",
      price: 150,
      monsters: {
        tags: [],
        attributes: []
      },
      support: [],
      include: [
        101,
        102,
        103,
        104,
        105,
        106,
        107,
        108,
        109,
        110,
        111,
        112,
        113,
        114,
        115,
        116,
        117,
        118,
        119,
        120,
        121,
        122,
        123,
        124,
        125,
        126,
        127,
        128,
        129,
        130,
        131,
        132,
        133,
        134,
        135,
        136,
        137,
        138,
        139,
        140
      ],
      exclude: [],
      set: "guerra-florida"
    },
    {
      id: "cuauhmeh",
      name: "Sobre de los Guerreros \xC1guila",
      glyph: "\u2736",
      color: "#d97a1e",
      description: "Guerra Florida \xB7 La orden \xE1guila y el sol de Huitzilopochtli.",
      price: 150,
      monsters: {
        tags: [],
        attributes: []
      },
      support: [],
      include: [
        141,
        142,
        143,
        144,
        145,
        146,
        147,
        148,
        149,
        150,
        151,
        152,
        153,
        154,
        155,
        156,
        157,
        158,
        159,
        160,
        161,
        162,
        163,
        164,
        165,
        166,
        167,
        168,
        169,
        170,
        171,
        172,
        173,
        174,
        175,
        176,
        177,
        178,
        179,
        180
      ],
      exclude: [],
      set: "guerra-florida"
    },
    {
      id: "templo-mayor",
      name: "Sobre del Templo Mayor",
      glyph: "\u25B2",
      color: "#a33a2a",
      description: "Guerra Florida \xB7 Sacerdotes, serpientes de fuego y el poder del Mictl\xE1n.",
      price: 150,
      monsters: {
        tags: [],
        attributes: []
      },
      support: [],
      include: [
        181,
        182,
        183,
        184,
        185,
        186,
        187,
        188,
        189,
        190,
        191,
        192,
        193,
        194,
        195,
        196,
        197,
        198,
        199,
        200,
        201,
        202,
        203,
        204,
        205,
        206,
        207,
        208,
        209,
        210,
        211,
        212,
        213,
        214,
        215,
        216,
        217,
        218,
        219,
        220
      ],
      exclude: [],
      set: "guerra-florida"
    }
  ],
  rules: [
    {
      a: "sacerdote",
      b: "fuego",
      result: [
        "sacerdote",
        "fuego"
      ]
    },
    {
      a: "sacerdote",
      b: "serpiente",
      result: [
        "sacerdote",
        "serpiente"
      ]
    },
    {
      a: "sacerdote",
      b: "muerte",
      result: [
        "sacerdote",
        "muerte"
      ]
    }
  ]
};

// src/data/sets/index.ts
var SETS = [guerra_florida_default];
function withSetCards(base) {
  const have = new Set(base.map((c) => c.id));
  const out = [...base];
  for (const s of SETS) for (const c of s.cards) if (!have.has(c.id)) {
    out.push(c);
    have.add(c.id);
  }
  return out;
}
function withSetRules(data) {
  return { ...data, rules: [...data.rules, ...SETS.flatMap((s) => s.rules)] };
}

// src/data/types.ts
var CARD_TAGS = [
  "jaguar",
  "guerrero",
  "bestia",
  "serpiente",
  "deidad",
  "ave",
  "agua",
  "muerte",
  "sol",
  "fuego",
  "viento",
  "sacerdote"
];
var RARITIES = ["N", "R", "SR", "UR"];
var EFFECT_TRIGGERS = [
  "onSummon",
  // al quedar boca arriba en el campo (normal o por fusión)
  "onFusionSummon",
  // solo si salió por fusión
  "onAttack",
  // al declarar un ataque (antes de calcular el daño)
  "onDestroyed",
  // al ser destruido
  "onTurnStart",
  // al empezar el turno de su dueño, si está en el campo
  "continuous",
  // mientras esté boca arriba en el campo (auras)
  "onActivate",
  // mágicas y equipos: al jugarlas
  "onOpponentAttack",
  // trampas: cuando el rival declara un ataque contra ti
  "onOpponentSummon",
  // trampas: cuando el rival invoca un monstruo boca arriba
  "onOpponentFusion",
  // trampas: cuando el rival invoca por fusión
  "onBattleDestroy",
  // al destruir a un monstruo rival en batalla
  "onDirectDamage",
  // al hacer daño con un ataque directo
  "onAttacked",
  // al ser atacado (antes del combate)
  "onFusionMaterial"
  // al usarse como material de fusión
];
var EFFECT_TARGETS = [
  "self",
  "equipTarget",
  "allAllies",
  "otherAllies",
  "alliesWithTag",
  "otherAlliesWithTag",
  "allEnemies",
  "highestAtkEnemy",
  "lowestAtkEnemy",
  "attacker",
  "randomEnemy",
  // un monstruo rival al azar
  "randomMonster",
  // cualquier monstruo del campo al azar (¡puede ser tuyo!)
  "allMonsters",
  // TODOS los monstruos del campo (Agujero Negro)
  "summoned"
  // trampas de invocación: el monstruo que el rival acaba de invocar
];
var KEYWORDS = ["piercing", "doubleAttack", "directAttack", "battleImmune"];
var isSupportCard = (card) => card.type === "spell" || card.type === "equip" || card.type === "trap";
var needsEquipTarget = (card) => card.type === "equip" || (card.effects ?? []).some((e) => e.actions.some((a) => "target" in a && a.target === "equipTarget"));
var DECK_SIZE = 40;
var MAX_COPIES = 3;
var HAND_SIZE = 5;
var START_LIFE = 8e3;
var rarityOf = (card) => card.rarity ?? "N";

// src/data/cardDatabase.ts
var CardDatabase = class {
  byId = /* @__PURE__ */ new Map();
  constructor(cards) {
    for (const raw of cards) {
      const problems = validateCard(raw);
      if (problems.length) throw new Error(`Carta inv\xE1lida "${raw.name}" (id ${raw.id}): ${problems.join("; ")}`);
      if (this.byId.has(raw.id)) {
        throw new Error(`ID duplicado ${raw.id}: "${raw.name}" y "${this.byId.get(raw.id).name}"`);
      }
      this.byId.set(raw.id, Object.freeze({ ...raw, tags: Object.freeze([...raw.tags]), effects: raw.effects ? Object.freeze([...raw.effects]) : void 0, recipes: raw.recipes ? Object.freeze(raw.recipes.map((r) => Object.freeze([r[0], r[1]]))) : void 0 }));
    }
    for (const c of this.byId.values()) {
      if (c.ascendsTo !== void 0 && !this.byId.has(c.ascendsTo)) {
        throw new Error(`Carta inv\xE1lida "${c.name}" (id ${c.id}): asciende a la carta ${c.ascendsTo}, que no existe`);
      }
      for (const pair of c.recipes ?? []) {
        for (const id of pair) {
          const m = this.byId.get(id);
          if (!m) throw new Error(`Carta inv\xE1lida "${c.name}" (id ${c.id}): su receta usa la carta ${id}, que no existe`);
          if (m.type !== "monster") throw new Error(`Carta inv\xE1lida "${c.name}" (id ${c.id}): su receta usa "${m.name}", que no es monstruo`);
        }
      }
    }
  }
  get size() {
    return this.byId.size;
  }
  all() {
    return [...this.byId.values()].sort((a, b) => a.id - b.id);
  }
  tryGet(id) {
    return this.byId.get(id);
  }
  get(id) {
    const card = this.byId.get(id);
    if (!card) throw new Error(`No existe la carta con id ${id}`);
    return card;
  }
  /** Lista de problemas del mazo (vacía = mazo válido). */
  validateDeck(deck) {
    const errors = [];
    if (deck.cards.length > DECK_SIZE) errors.push(`tiene ${deck.cards.length} cartas (m\xE1ximo ${DECK_SIZE})`);
    const counts = /* @__PURE__ */ new Map();
    for (const id of deck.cards) {
      if (!this.byId.has(id)) errors.push(`id ${id} no existe`);
      counts.set(id, (counts.get(id) ?? 0) + 1);
    }
    for (const [id, n] of counts) {
      if (n > MAX_COPIES) errors.push(`${n} copias de "${this.tryGet(id)?.name ?? id}" (m\xE1ximo ${MAX_COPIES})`);
    }
    return errors;
  }
};
function validateCard(c) {
  const p = [];
  if (!Number.isInteger(c.id) || c.id <= 0) p.push("id debe ser entero > 0");
  if (!c.name?.trim()) p.push("falta nombre");
  if (c.atk < 0 || c.def < 0) p.push("ATK/DEF no pueden ser negativos");
  for (const t of c.tags) if (!CARD_TAGS.includes(t)) p.push(`etiqueta desconocida "${t}"`);
  if (c.rarity !== void 0 && !RARITIES.includes(c.rarity)) p.push(`rareza desconocida "${c.rarity}" (usa N, R, SR o UR)`);
  const actionTypes = [
    "modifyAtk",
    "modifyDef",
    "damage",
    "heal",
    "draw",
    "destroy",
    "revive",
    "negateAttack",
    "returnToHand",
    "forceDefense",
    "takeControl",
    "preventAttack",
    "grantKeyword",
    "destroySupport",
    "summonFromDeck"
  ];
  const conditionTypes = ["isNight", "isDay", "isPhase", "lifeBelow", "hasTagOnField", "opponentHasMoreMonsters"];
  const phases = ["alba", "mediodia", "ocaso", "medianoche"];
  for (const e of c.effects ?? []) {
    if (!EFFECT_TRIGGERS.includes(e.trigger)) p.push(`efecto con trigger desconocido "${e.trigger}"`);
    if (!Array.isArray(e.actions) || e.actions.length === 0) p.push("efecto sin acciones");
    for (const cond of e.conditions ?? []) {
      if (!conditionTypes.includes(cond.type)) p.push(`condici\xF3n desconocida "${cond.type}"`);
      if (cond.type === "isPhase" && !phases.includes(cond.phase)) p.push(`fase desconocida "${cond.phase}" (usa alba, mediodia, ocaso o medianoche)`);
    }
    for (const a of e.actions ?? []) {
      if (!actionTypes.includes(a.type)) p.push(`acci\xF3n desconocida "${a.type}"`);
      if ("target" in a && !EFFECT_TARGETS.includes(a.target)) p.push(`objetivo desconocido "${a.target}"`);
      if ("tag" in a && a.tag && !CARD_TAGS.includes(a.tag)) p.push(`etiqueta desconocida "${a.tag}" en un efecto`);
      if (a.type === "grantKeyword" && !KEYWORDS.includes(a.keyword)) p.push(`habilidad desconocida "${a.keyword}"`);
      if (a.type === "summonFromDeck" && !(Number.isInteger(a.maxAtk) && a.maxAtk >= 0)) p.push('"invocar desde tu mazo" necesita un ATK m\xE1ximo');
      if (a.type === "destroySupport" && a.who !== "opponent" && a.who !== "all") p.push('"destruir trampas" debe ser del rival o de todos');
    }
    if (e.trigger === "onActivate" && c.type === "monster") p.push("un monstruo no puede tener efecto onActivate");
  }
  if ((c.type === "spell" || c.type === "equip") && !(c.effects ?? []).some((e) => e.trigger === "onActivate")) {
    p.push("las m\xE1gicas y equipos necesitan un efecto onActivate");
  }
  if (c.ascendsTo !== void 0 && (!Number.isInteger(c.ascendsTo) || c.ascendsTo === c.id)) p.push('"asciende a" debe ser el id de OTRA carta');
  if (c.recipes !== void 0) {
    if (c.type !== "monster") p.push("solo los monstruos pueden tener recetas de fusi\xF3n");
    if (!Array.isArray(c.recipes) || c.recipes.some((r) => !Array.isArray(r) || r.length !== 2 || !r.every((x) => Number.isInteger(x) && x > 0))) {
      p.push("cada receta debe ser una pareja de ids, ej. [15, 4]");
    } else if (c.recipes.some((r) => r.includes(c.id))) p.push("una receta no puede usar la misma carta que crea");
  }
  if (c.nahual) {
    if (c.type !== "monster") p.push("solo los monstruos pueden ser nahuales");
    if (!c.nahual.name?.trim()) p.push("al nahual le falta el nombre de su forma de noche");
    if (!Number.isInteger(c.nahual.atk) || !Number.isInteger(c.nahual.def) || c.nahual.atk < 0 || c.nahual.def < 0) p.push("ATK/DEF del nahual deben ser enteros \u2265 0");
  }
  const trapTriggers = ["onOpponentAttack", "onOpponentSummon", "onOpponentFusion"];
  if (c.type === "trap" && !(c.effects ?? []).some((e) => trapTriggers.includes(e.trigger))) {
    p.push("las trampas necesitan un efecto que se active con el rival (al atacar, invocar o fusionar)");
  }
  return p;
}

// src/core/fusion.ts
var noFusions = { fusionOptions: () => [] };
var bestFusion = (r, a, b) => r.fusionOptions(a, b)[0] ?? null;
function planChain(resolver, chain, choices = []) {
  if (chain.length === 0) return { ok: false, error: "Cadena vac\xEDa" };
  let current = chain[0];
  let choiceIdx = 0;
  const steps = [];
  for (const next of chain.slice(1)) {
    const options = resolver.fusionOptions(current, next);
    let result = options[0] ?? null;
    if (options.length > 1) {
      const wanted = choices[choiceIdx++];
      if (wanted !== void 0) {
        const picked = options.find((o) => o.id === wanted);
        if (!picked) return { ok: false, error: "Esa fusi\xF3n no puede dar esa carta" };
        result = picked;
      }
    }
    steps.push({ a: current, b: next, options, result });
    current = result ?? next;
  }
  return { ok: true, result: current, steps };
}

// src/data/fusionDatabase.ts
var pairKey = (x, y) => x < y ? `${x}+${y}` : `${y}+${x}`;
var FusionDatabase = class {
  recipes = /* @__PURE__ */ new Map();
  rules = [];
  recipesByResult = /* @__PURE__ */ new Map();
  recipeOnlyIds = /* @__PURE__ */ new Set();
  /** Problemas encontrados (solo se llenan con strict = false; con strict = true lanzan error). */
  problems = [];
  /** Avisos que no impiden jugar (por ejemplo, una receta que da una carta más débil). */
  warnings = [];
  constructor(data, db, strict = true) {
    const problems = this.problems;
    const recipeOnly = new Set(data.recipeOnly ?? []);
    for (const c of db.all()) if (c.ascendsTo) recipeOnly.add(c.ascendsTo);
    for (const id of recipeOnly) this.recipeOnlyIds.add(id);
    for (const res of db.all()) {
      for (const [x, y] of res.recipes ?? []) {
        const [a, b] = [db.get(x), db.get(y)];
        const key = pairKey(x, y);
        const prev = this.recipes.get(key);
        if (prev) {
          problems.push(`${a.name} + ${b.name} da dos cartas distintas: ${prev.name} y ${res.name}`);
          continue;
        }
        if (res.atk <= a.atk || res.atk <= b.atk) this.warnings.push(`Receta ${a.name} + ${b.name} = ${res.name}: el resultado no es m\xE1s fuerte que los materiales.`);
        this.recipes.set(key, res);
        this.byResult(res.id).push([a, b]);
      }
    }
    for (const r of data.recipes) {
      const [a, b, res] = [db.tryGet(r.a), db.tryGet(r.b), db.tryGet(r.result)];
      if (!a || !b || !res) {
        problems.push(`receta ${r.a}+${r.b}=${r.result}: id inexistente`);
        continue;
      }
      const key = pairKey(r.a, r.b);
      const prev = this.recipes.get(key);
      if (prev && prev.id === res.id) continue;
      if (prev) {
        this.warnings.push(`fusions.json: ${a.name} + ${b.name} = ${res.name} se ignora; la carta ${prev.name} ya usa esa pareja.`);
        continue;
      }
      if (res.atk <= a.atk || res.atk <= b.atk) this.warnings.push(`Receta ${a.name} + ${b.name} = ${res.name}: el resultado no es m\xE1s fuerte que los materiales.`);
      this.recipes.set(key, res);
      this.byResult(res.id).push([a, b]);
    }
    for (const r of data.rules) {
      for (const t of [r.a, r.b, ...r.result]) {
        if (!CARD_TAGS.includes(t)) problems.push(`regla ${r.a}+${r.b}: etiqueta desconocida "${t}"`);
      }
      const candidates = db.all().filter((c) => c.type === "monster" && !recipeOnly.has(c.id) && !c.nahual && !c.noFusion && r.result.every((t) => c.tags.includes(t))).sort((x, y) => x.atk - y.atk);
      if (candidates.length === 0) problems.push(`regla ${r.a}+${r.b}: ninguna carta tiene [${r.result.join(", ")}]`);
      this.rules.push({ a: r.a, b: r.b, candidates });
    }
    if (strict && problems.length) throw new Error("fusions.json tiene problemas:\n- " + problems.join("\n- "));
  }
  /**
   * Todas las cartas que puede dar A + B, de mejor a peor.
   * Receta exacta = única opción. Si no, cada regla que aplique aporta su resultado
   * (la carta más débil de ese tipo que supere a ambos materiales) y el jugador elige.
   */
  fusionOptions(a, b) {
    if (a.type !== "monster" || b.type !== "monster") return [];
    const exact = this.recipes.get(pairKey(a.id, b.id));
    if (exact) return [exact];
    const found = /* @__PURE__ */ new Map();
    for (const rule of this.rules) {
      const matches2 = a.tags.includes(rule.a) && b.tags.includes(rule.b) || a.tags.includes(rule.b) && b.tags.includes(rule.a);
      if (!matches2) continue;
      const result = rule.candidates.find((c) => c.atk > a.atk && c.atk > b.atk);
      if (result) found.set(result.id, result);
    }
    return [...found.values()].sort((x, y) => y.atk - x.atk);
  }
  /** Parejas exactas que dan esta carta (de la carta y de fusions.json). */
  recipesFor(cardId) {
    return this.recipesByResult.get(cardId) ?? [];
  }
  /** Reglas por etiqueta que PUEDEN dar esta carta (si no es solo-receta). */
  rulesFor(card) {
    if (card.type !== "monster" || card.noFusion || card.nahual || this.recipeOnlyIds.has(card.id)) return [];
    return this.rules.filter((r) => r.candidates.some((c) => c.id === card.id)).map((r) => ({ a: r.a, b: r.b }));
  }
  byResult(id) {
    let list = this.recipesByResult.get(id);
    if (!list) {
      list = [];
      this.recipesByResult.set(id, list);
    }
    return list;
  }
  /** La mejor opción (la que usa la IA y la que se juega si no eliges). */
  tryFuse(a, b) {
    return this.fusionOptions(a, b)[0] ?? null;
  }
  /** Simula una cadena completa (vista previa, editor, IA). No toca el duelo. */
  previewChain(chain, choices = []) {
    const plan = planChain(this, chain, choices);
    return plan.ok ? plan : null;
  }
};

// src/data/index.ts
var cardDb = new CardDatabase(withSetCards(cards_default));
var fusionDb = new FusionDatabase(withSetRules(fusions_default), cardDb);
var daySigns = signs_default;
var ENGINE_VERSION = 5;
var DATA_VERSION = fnv1a(`v${ENGINE_VERSION}` + JSON.stringify(cards_default) + JSON.stringify(fusions_default) + JSON.stringify(duelists_default) + JSON.stringify(signs_default) + JSON.stringify(packs_default) + JSON.stringify(jade_default) + JSON.stringify(SETS));
function fnv1a(text) {
  let h = 2166136261;
  for (let i = 0; i < text.length; i++) {
    h ^= text.charCodeAt(i);
    h = Math.imul(h, 16777619) >>> 0;
  }
  return h.toString(16).padStart(8, "0");
}

// src/game/config.ts
var DUPLICATE_VALUE = {
  N: { cacao: 1, jade: 0 },
  R: { cacao: 2, jade: 1 },
  SR: { cacao: 3, jade: 2 },
  UR: { cacao: 5, jade: 5 }
};

// src/game/duelists.ts
var duelists = [...duelists_default, ...SETS.flatMap((s) => s.duelists)];
function getDuelist(id) {
  return duelists.find((d) => d.id === id);
}
function isUnlocked(id, defeated) {
  const i = duelists.findIndex((d) => d.id === id);
  if (i <= 0) return i === 0;
  return defeated.includes(duelists[i - 1].id);
}

// src/game/economy.ts
var WIN_CACAO = { 1: 10, 2: 10, 3: 10 };
var WIN_TICKETS = 1;

// src/game/packs.ts
var packs = [...packs_default, ...SETS.flatMap((s) => s.packs)];
var getPack = (id) => packs.find((p) => p.id === id);
var PACK_SIZE = 5;
var PACK_ODDS = { N: 60, R: 28, SR: 10, UR: 2 };
var PACK_PITY = 10;
var START_JADE = 300;
var PACK_COUNTS = [1, 10];
function packPool(pack, db) {
  const ascensionOnly = new Set(db.all().map((c) => c.ascendsTo).filter((x) => !!x));
  const pool = { N: [], R: [], SR: [], UR: [] };
  for (const c of db.all()) {
    if (ascensionOnly.has(c.id) || pack.exclude.includes(c.id)) continue;
    const sameSet = (c.set ?? "") === (pack.set ?? "");
    const fits = pack.include.includes(c.id) || sameSet && (c.type === "monster" ? c.tags.some((t) => pack.monsters.tags.includes(t)) || pack.monsters.attributes.includes(c.attribute) : pack.support.includes(c.attribute));
    if (fits) pool[rarityOf(c)].push(c);
  }
  return pool;
}
function fallbackRarity(pool, wanted) {
  const order = [...RARITIES];
  for (let i = order.indexOf(wanted); i >= 0; i--) if (pool[order[i]].length) return order[i];
  for (const r of order) if (pool[r].length) return r;
  return null;
}
function rollRarity(rng) {
  let x = rng() * 100;
  for (const r of [...RARITIES].reverse()) {
    x -= PACK_ODDS[r];
    if (x < 0) return r;
  }
  return "N";
}
function openPack(pack, db, rng, sinceUr) {
  const pool = packPool(pack, db);
  const pick = (r) => {
    const target = fallbackRarity(pool, r);
    if (!target) return null;
    const list = pool[target];
    return list[Math.floor(rng() * list.length)];
  };
  const cards = [];
  for (let i = 0; i < PACK_SIZE; i++) {
    const c = pick(rollRarity(rng));
    if (c) cards.push(c);
  }
  let pity = false;
  const hasUr = () => cards.some((c) => rarityOf(c) === "UR");
  if (!hasUr() && sinceUr + 1 >= PACK_PITY && pool.UR.length) {
    cards.sort((a, b) => RARITIES.indexOf(rarityOf(a)) - RARITIES.indexOf(rarityOf(b)));
    cards[0] = pool.UR[Math.floor(rng() * pool.UR.length)];
    pity = true;
  }
  const got = hasUr();
  cards.sort((a, b) => RARITIES.indexOf(rarityOf(a)) - RARITIES.indexOf(rarityOf(b)) || a.id - b.id);
  return { cards: cards.map((c) => c.id), sinceUr: got ? 0 : sinceUr + 1, pity };
}
function openPacks(pack, db, rng, sinceUr, count) {
  const out = [];
  let since = sinceUr;
  for (let i = 0; i < count; i++) {
    const o = openPack(pack, db, rng, since);
    out.push(o);
    since = o.sinceUr;
  }
  return { packs: out, sinceUr: since };
}

// src/game/roulette.ts
var GOLD_TICKET_PRICE = 3e3;
var GOLD_BUY_COUNTS = [1, 5];
var ROULETTE_PRIZES = [
  { id: "cacao1000", kind: "cacao", amount: 1e3, weight: 26, label: "1000 cacao", color: "#8a5a26" },
  { id: "jade50", kind: "jade", amount: 50, weight: 18, label: "50 jade", color: "#2f8a66" },
  { id: "tickets25", kind: "tickets", amount: 25, weight: 16, label: "25 tickets", color: "#3a5f9a" },
  { id: "cacao1500", kind: "cacao", amount: 1500, weight: 14, label: "1500 cacao", color: "#b8702a" },
  { id: "jade100", kind: "jade", amount: 100, weight: 8, label: "100 jade", color: "#1fae7a" },
  { id: "tickets50", kind: "tickets", amount: 50, weight: 8, label: "50 tickets", color: "#4f7fd0" },
  { id: "gold", kind: "gold", amount: 1, weight: 6, label: "Ticket oro", color: "#d9a21b" },
  { id: "card", kind: "card", amount: 1, weight: 4, label: "La carta", color: "#7b2fd6" }
];
function featuredPool(db) {
  const ascensionOnly = new Set(db.all().map((c) => c.ascendsTo).filter((x) => !!x));
  const banned = new Set(packs.length ? packs.map((p) => p.exclude).reduce((a, b) => a.filter((x) => b.includes(x))) : []);
  return db.all().filter((c) => (rarityOf(c) === "R" || rarityOf(c) === "SR") && !ascensionOnly.has(c.id) && !banned.has(c.id));
}
function pickFeatured(db, rng, avoid) {
  const pool = featuredPool(db).filter((c) => c.id !== avoid);
  const list = pool.length ? pool : featuredPool(db);
  return list[Math.floor(rng() * list.length)].id;
}
function spinIndex(rng) {
  const total = ROULETTE_PRIZES.reduce((n, p) => n + p.weight, 0);
  let x = rng() * total;
  for (let i = 0; i < ROULETTE_PRIZES.length; i++) {
    x -= ROULETTE_PRIZES[i].weight;
    if (x < 0) return i;
  }
  return 0;
}

// src/game/cardShop.ts
var SHOP_SLOTS = 6;
var SHOP_ODDS = { N: 50, R: 33, SR: 14, UR: 3 };
var SHOP_PRICES = { N: 300, R: 800, SR: 2e3, UR: 1e4 };
var SHOP_REFRESH_TICKETS = 25;
function shopPool(db) {
  const ascensionOnly = new Set(db.all().map((c) => c.ascendsTo).filter((x) => !!x));
  const banned = new Set(packs.length ? packs.map((p) => p.exclude).reduce((a, b) => a.filter((x) => b.includes(x))) : []);
  const pool = { N: [], R: [], SR: [], UR: [] };
  for (const c of db.all()) if (!ascensionOnly.has(c.id) && !banned.has(c.id)) pool[rarityOf(c)].push(c);
  return pool;
}
function rollRarity2(rng) {
  let x = rng() * 100;
  for (const r of [...RARITIES].reverse()) {
    x -= SHOP_ODDS[r];
    if (x < 0) return r;
  }
  return "N";
}
function rollShop(db, rng) {
  const pool = shopPool(db);
  const chosen = [];
  for (let i = 0; i < SHOP_SLOTS; i++) {
    let r = rollRarity2(rng);
    while (!pool[r].length && r !== "N") r = RARITIES[RARITIES.indexOf(r) - 1];
    const options = pool[r].filter((c) => !chosen.includes(c));
    const list = options.length ? options : pool[r];
    if (!list.length) continue;
    chosen.push(list[Math.floor(rng() * list.length)]);
  }
  return chosen.sort((a, b) => RARITIES.indexOf(rarityOf(a)) - RARITIES.indexOf(rarityOf(b)) || a.id - b.id).map((c) => ({ card: c.id, price: SHOP_PRICES[rarityOf(c)], sold: false }));
}
function shopDay(now = Date.now()) {
  return new Date(now - 6 * 36e5).toISOString().slice(0, 10);
}

// src/core/progression.ts
var ASCEND_COPIES = 3;
var MAX_LEVEL = 5;
var LEVEL_STAT_BONUS = 100;
var EFFECT_BOOST_LEVEL = 3;
var EFFECT_BOOST = 1.25;
var LEVEL_COST_BASE = { N: 150, R: 300, SR: 600, UR: 1200 };
var levelBonus = (level) => (clampLevel(level) - 1) * LEVEL_STAT_BONUS;
function clampLevel(level) {
  return Math.min(MAX_LEVEL, Math.max(1, Math.floor(level ?? 1)));
}
function levelUpCost(card, level) {
  const l = clampLevel(level);
  if (l >= MAX_LEVEL) return null;
  return LEVEL_COST_BASE[rarityOf(card)] * l;
}
function scaleEffectAmount(amount, level) {
  if (clampLevel(level) < EFFECT_BOOST_LEVEL || amount === 0) return amount;
  return Math.sign(amount) * Math.ceil(Math.abs(amount) * EFFECT_BOOST / 50) * 50;
}
function checkAscend(card, result, haveBase, haveResult) {
  if (!card) return { ok: false, error: "Esa carta no existe" };
  if (!card.ascendsTo || !result) return { ok: false, error: `${card.name} no puede ascender` };
  if (haveBase < ASCEND_COPIES) return { ok: false, error: `Necesitas ${ASCEND_COPIES} copias de ${card.name} (tienes ${haveBase})` };
  if (haveResult >= MAX_COPIES) return { ok: false, error: `Ya tienes ${MAX_COPIES} de ${result.name}` };
  return { ok: true, cost: 0, result: result.id };
}
function checkLevelUp(card, have, level, cacao) {
  if (!card) return { ok: false, error: "Esa carta no existe" };
  if (have <= 0) return { ok: false, error: `No tienes ${card.name}` };
  const cost = levelUpCost(card, level);
  if (cost === null) return { ok: false, error: `${card.name} ya est\xE1 en nivel ${MAX_LEVEL}` };
  if (cacao < cost) return { ok: false, error: `Te faltan ${cost - cacao} de cacao` };
  return { ok: true, cost };
}
function trimDeckToCollection(deck, owned2) {
  const used = /* @__PURE__ */ new Map();
  return deck.filter((id) => {
    const n = (used.get(id) ?? 0) + 1;
    used.set(id, n);
    return n <= owned2(id);
  });
}

// src/game/profile.ts
var owned = (p, cardId) => p.collection[cardId] ?? 0;
var countIn = (list, cardId) => list.filter((x) => x === cardId).length;
function validatePlayerDeck(p, deck, db) {
  const errors = [];
  if (deck.length !== DECK_SIZE) errors.push(`El mazo debe tener ${DECK_SIZE} cartas (tiene ${deck.length})`);
  for (const id of new Set(deck)) {
    const card = db.tryGet(id);
    const n = countIn(deck, id);
    if (!card) {
      errors.push(`La carta ${id} no existe`);
      continue;
    }
    if (n > MAX_COPIES) errors.push(`M\xE1ximo ${MAX_COPIES} copias de ${card.name}`);
    if (n > owned(p, id)) errors.push(`Solo tienes ${owned(p, id)} de ${card.name}`);
  }
  return errors;
}

// src/core/CardInstance.ts
var CardInstance = class {
  instanceId;
  owner;
  def;
  zone = "deck";
  fieldSlot = -1;
  // 0-4 cuando está en el campo
  position = "attack";
  faceDown = false;
  hasAttackedThisTurn = false;
  positionChangedThisTurn = false;
  summonedThisTurn = false;
  /** Nahual en forma de noche (lo decide el motor según el Reloj Solar). */
  nightForm = false;
  /** Nivel de la carta en la colección de su dueño (1-5). Las fusiones nacen en nivel 1. */
  level = 1;
  /** Ataques hechos este turno (con "ataca dos veces" puede ser 2). */
  attacksThisTurn = 0;
  /** "No puede ser destruido en batalla (una vez)": ya se usó. */
  battleImmuneUsed = false;
  /** Robado con "tomar el control": regresa a su dueño al final del turno. */
  borrowed = false;
  keywords = [];
  modifiers = [];
  constructor(instanceId, owner, def) {
    this.instanceId = instanceId;
    this.owner = owner;
    this.def = def;
  }
  /** Stats base de la forma actual (de noche, la del nahual). */
  get baseAtk() {
    return (this.nightForm && this.def.nahual ? this.def.nahual.atk : this.def.atk) + this.levelStats;
  }
  get baseDef() {
    return (this.nightForm && this.def.nahual ? this.def.nahual.def : this.def.def) + this.levelStats;
  }
  /** +100 ATK/DEF por nivel arriba del 1 (solo monstruos). */
  get levelStats() {
    return this.def.type === "monster" ? levelBonus(clampLevel(this.level)) : 0;
  }
  /** Nombre que se ve (de noche, el del nahual). */
  get name() {
    return this.nightForm && this.def.nahual ? this.def.nahual.name : this.def.name;
  }
  get atk() {
    return Math.max(0, this.modifiers.reduce((sum, m) => sum + m.atk, this.baseAtk));
  }
  get defense() {
    return Math.max(0, this.modifiers.reduce((sum, m) => sum + m.def, this.baseDef));
  }
  get activeModifiers() {
    return this.modifiers;
  }
  addModifier(mod) {
    this.modifiers.push(mod);
  }
  removeModifiersFrom(sourceId) {
    this.modifiers = this.modifiers.filter((m) => m.sourceId !== sourceId);
  }
  clearAuraModifiers() {
    this.modifiers = this.modifiers.filter((m) => !m.aura);
    this.keywords = this.keywords.filter((k) => !k.aura);
  }
  clearEndOfTurnModifiers() {
    this.modifiers = this.modifiers.filter((m) => !m.untilEndOfTurn);
    this.keywords = this.keywords.filter((k) => !k.untilEndOfTurn);
  }
  addKeyword(keyword, untilEndOfTurn = false, aura = false) {
    this.keywords.push({ keyword, untilEndOfTurn, aura });
  }
  hasKeyword(keyword) {
    return this.keywords.some((k) => k.keyword === keyword);
  }
  get activeKeywords() {
    return [...new Set(this.keywords.map((k) => k.keyword))];
  }
  /** Cuántas veces puede atacar por turno. */
  get maxAttacks() {
    return this.hasKeyword("doubleAttack") ? 2 : 1;
  }
  /** Al salir del campo pierde buffs y estado de batalla. */
  resetForZoneChange() {
    this.modifiers = [];
    this.keywords = [];
    this.attacksThisTurn = 0;
    this.battleImmuneUsed = false;
    this.borrowed = false;
    this.fieldSlot = -1;
    this.faceDown = false;
    this.hasAttackedThisTurn = false;
    this.positionChangedThisTurn = false;
    this.summonedThisTurn = false;
    this.nightForm = false;
    this.position = "attack";
  }
  toString() {
    return `#${this.instanceId} ${this.name} ${this.atk}/${this.defense} [${this.zone}]`;
  }
};

// src/core/deck.ts
var InstanceIdCounter = class {
  next = 1;
  take() {
    return this.next++;
  }
};
function buildShuffledDeck(cardIds, owner, db, ids, rng) {
  const instances = cardIds.map((id) => new CardInstance(ids.take(), owner, db.get(id)));
  return shuffle(instances, rng);
}

// src/core/time.ts
var TIME_PHASES = ["alba", "mediodia", "ocaso", "medianoche"];
var TURNS_PER_PHASE = 2;
var PHASE_INFO = {
  alba: { name: "Alba", icon: "\u{1F305}", night: false, bonuses: [{ attribute: "tierra", atk: 200 }] },
  mediodia: { name: "Mediod\xEDa", icon: "\u2600", night: false, bonuses: [{ attribute: "sol", atk: 300 }] },
  ocaso: { name: "Ocaso", icon: "\u{1F307}", night: true, bonuses: [{ attribute: "viento", atk: 200 }] },
  medianoche: { name: "Medianoche", icon: "\u263E", night: true, bonuses: [{ attribute: "agua", atk: 300 }, { tag: "muerte", atk: 300 }, { attribute: "sol", atk: -200 }] }
};
function phaseOf(turn) {
  return TIME_PHASES[Math.floor((Math.max(1, turn) - 1) / TURNS_PER_PHASE) % TIME_PHASES.length];
}
var isNightTurn = (turn) => PHASE_INFO[phaseOf(turn)].night;
function phaseAtkBonus(phase, card) {
  return PHASE_INFO[phase].bonuses.reduce((sum, b) => sum + (matches(card, b) ? b.atk : 0), 0);
}
function matches(card, b) {
  if (b.attribute && card.attribute !== b.attribute) return false;
  if (b.tag && !card.tags.includes(b.tag)) return false;
  return true;
}

// src/core/DuelState.ts
var FIELD_SLOTS = 5;
var opponentOf = (p) => p === 0 ? 1 : 0;

// src/core/daySign.ts
var signRules = (sign, kind) => (sign?.rules ?? []).filter((r) => r.kind === kind);
function signTotal(sign, kind) {
  let n = 0;
  for (const r of sign?.rules ?? []) {
    if (r.kind !== kind) continue;
    n += r.kind === "fusionBonus" ? r.atk : "amount" in r ? r.amount : 0;
  }
  return n;
}

// src/core/DuelEngine.ts
var SOURCE_ENVIRONMENT = -1;
var SOURCE_FUSION_SIGN = -2;
var FIRST_TURN_CAN_ATTACK = false;
function pickDaySign(seed, signs) {
  if (!signs || signs.length === 0) return null;
  const rng = createRng((seed ^ 5351397) >>> 0);
  return signs[Math.floor(rng() * signs.length)] ?? null;
}
var isChainEquip = (def) => def.type !== "trap" && def.type !== "monster" && needsEquipTarget(def);
var DuelEngine = class {
  state;
  db;
  fusion;
  ids = new InstanceIdCounter();
  cards = /* @__PURE__ */ new Map();
  started = false;
  effectDepth = 0;
  // evita cadenas infinitas de efectos
  attackNegated = false;
  /** Azar de los efectos ("al azar"): sale de la semilla, así el servidor lo repite igual. */
  effectRng;
  constructor(opts) {
    this.db = opts.db;
    this.fusion = opts.fusion ?? noFusions;
    const rng = createRng(opts.seed);
    this.effectRng = createRng((opts.seed ^ 10558693) >>> 0);
    const daySign = pickDaySign(opts.seed, opts.signs);
    const startLife = signRules(daySign, "startLife").at(-1)?.amount ?? START_LIFE;
    const makePlayer = (p) => {
      const deck = buildShuffledDeck(opts.decks[p], p, this.db, this.ids, rng);
      const levels = opts.levels?.[p];
      deck.forEach((c) => {
        this.cards.set(c.instanceId, c);
        c.level = levels?.[c.def.id] ?? 1;
      });
      return { life: startLife, deck, hand: [], field: Array(FIELD_SLOTS).fill(null), support: Array(FIELD_SLOTS).fill(null), mictlan: [] };
    };
    this.state = {
      players: [makePlayer(0), makePlayer(1)],
      turnPlayer: opts.firstPlayer ?? 0,
      turn: 1,
      phase: "main",
      supportUsedThisTurn: false,
      monsterPlayedThisTurn: false,
      winner: null,
      daySign,
      attackLockUntil: [0, 0]
    };
  }
  /** Reparte las manos y empieza el turno 1. */
  start() {
    if (this.started) return [];
    this.started = true;
    const events = [];
    for (const p of [0, 1]) this.refillHand(p, events);
    const extra = signTotal(this.state.daySign, "extraDraw");
    if (extra > 0) for (const p of [0, 1]) this.drawCards(p, extra, events);
    events.push({ type: "turnStarted", player: this.state.turnPlayer, turn: 1 });
    this.recomputeAuras();
    return events;
  }
  getCard(instanceId) {
    return this.cards.get(instanceId);
  }
  apply(intent) {
    const s = this.state;
    if (!this.started) return fail("El duelo no ha empezado");
    if (s.winner !== null) return fail("El duelo ya termin\xF3");
    if (intent.type === "surrender") {
      const events2 = [];
      this.finish(opponentOf(intent.player), "surrender", events2);
      return { ok: true, events: events2 };
    }
    if (intent.player !== s.turnPlayer) return fail("No es tu turno");
    const events = [];
    let error = null;
    switch (intent.type) {
      case "play":
        error = this.play(intent, events);
        break;
      case "activate":
        error = this.activate(intent, events);
        break;
      case "changePosition":
        error = this.changePosition(intent, events);
        break;
      case "attack":
        error = this.attack(intent, events);
        break;
      case "endTurn":
        error = this.endTurn(events);
        break;
    }
    if (error) return fail(error);
    this.recomputeAuras();
    return { ok: true, events };
  }
  // ---------------------------------------------------------------- jugar cartas
  play(intent, events) {
    const s = this.state;
    const me = s.players[intent.player];
    if (s.phase !== "main") return "Solo puedes jugar cartas en la fase principal";
    if (s.monsterPlayedThisTurn) return "Ya bajaste un monstruo este turno";
    if (intent.handIds.length === 0) return "Elige al menos una carta";
    if (new Set(intent.handIds).size !== intent.handIds.length) return "Carta repetida en la cadena";
    if (!Number.isInteger(intent.slot) || intent.slot < 0 || intent.slot >= FIELD_SLOTS) return "Zona inv\xE1lida";
    const fromHand = [];
    const equips = [];
    for (const id of intent.handIds) {
      const card = me.hand.find((c) => c.instanceId === id);
      if (!card) return "Esa carta no est\xE1 en tu mano";
      if (card.def.type === "monster") fromHand.push(card);
      else if (isChainEquip(card.def)) equips.push(card);
      else return "Solo monstruos y equipos van en la cadena de fusi\xF3n; las m\xE1gicas y trampas van en tu fila de apoyo";
    }
    const occupant = me.field[intent.slot];
    const firstHand = me.hand.find((c) => c.instanceId === intent.handIds[0]);
    if (!occupant && firstHand && firstHand.def.type !== "monster") return "La cadena empieza con un monstruo; los equipos van despu\xE9s";
    if (!occupant && fromHand.length === 0) return "Elige un monstruo para equiparlo";
    const chain = occupant ? [occupant, ...fromHand] : fromHand;
    const plan = planChain(this.fusion, chain.map((c) => c.def), intent.fusionChoices ?? []);
    if (!plan.ok) return plan.error;
    s.monsterPlayedThisTurn = true;
    me.hand = me.hand.filter((c) => !fromHand.includes(c) && !equips.includes(c));
    if (occupant && fromHand.length === 0) {
      this.equipFromChain(occupant, equips, intent.player, events);
      return null;
    }
    me.field[intent.slot] = null;
    let current = chain[0];
    let fused = false;
    plan.steps.forEach((step, i) => {
      const next = chain[i + 1];
      if (step.result) {
        const fusedCard = new CardInstance(this.ids.take(), intent.player, step.result);
        this.cards.set(fusedCard.instanceId, fusedCard);
        events.push({ type: "fusion", player: intent.player, materialIds: [current.instanceId, next.instanceId], resultId: fusedCard.instanceId });
        this.sendToMictlan(current, "material", events);
        this.sendToMictlan(next, "material", events);
        this.runEffects(current, "onFusionMaterial", events);
        this.runEffects(next, "onFusionMaterial", events);
        current = fusedCard;
        fused = true;
      } else {
        events.push({ type: "fusionFailed", player: intent.player, discardedId: current.instanceId });
        this.sendToMictlan(current, "fusionFailed", events);
        current = next;
      }
    });
    if (current !== occupant) current.resetForZoneChange();
    current.zone = "field";
    current.fieldSlot = intent.slot;
    current.position = intent.position;
    current.faceDown = !fused && equips.length === 0 && current !== occupant && (intent.faceDown ?? false);
    current.summonedThisTurn = true;
    me.field[intent.slot] = current;
    events.push({
      type: "cardPlayed",
      player: intent.player,
      instanceId: current.instanceId,
      slot: intent.slot,
      position: current.position,
      faceDown: current.faceDown
    });
    const fusionBonus = signTotal(s.daySign, "fusionBonus");
    if (fused && fusionBonus) current.addModifier({ atk: fusionBonus, def: 0, sourceId: SOURCE_FUSION_SIGN, untilEndOfTurn: false });
    this.equipFromChain(current, equips, intent.player, events);
    if (!current.faceDown) {
      if (fused) this.runEffects(current, "onFusionSummon", events);
      this.runEffects(current, "onSummon", events);
      if (current.zone === "field" && s.winner === null) {
        this.springTrap(opponentOf(intent.player), fused ? ["onOpponentFusion", "onOpponentSummon"] : ["onOpponentSummon"], { summoned: current }, current.instanceId, events);
      }
    }
    return null;
  }
  /** Equipos de la cadena de fusión: se le ponen al monstruo que quedó (X + equipo + equipo). */
  equipFromChain(target, equips, player, events) {
    for (const eq of equips) {
      if (target.zone !== "field" || this.state.winner !== null) {
        this.sendToMictlan(eq, "used", events);
        continue;
      }
      events.push({ type: "activated", player, instanceId: eq.instanceId, targetId: target.instanceId });
      this.runEffects(eq, "onActivate", events, { equipTarget: target });
      this.sendToMictlan(eq, "used", events);
    }
  }
  /** Activa la primera trampa boca abajo de `defender` que responda a alguno de esos disparadores. */
  springTrap(defender, triggers, ctx, againstId, events) {
    const side = this.state.players[defender];
    for (const trap of side.support) {
      if (!trap) continue;
      const trigger = triggers.find((t) => (trap.def.effects ?? []).some((e) => e.trigger === t && this.conditionsMet(trap, e.conditions ?? [])));
      if (!trigger) continue;
      side.support[side.support.indexOf(trap)] = null;
      trap.faceDown = false;
      events.push({ type: "trapActivated", player: defender, instanceId: trap.instanceId, attackerId: againstId });
      this.runEffects(trap, trigger, events, ctx);
      this.sendToMictlan(trap, "used", events);
      return true;
    }
    return false;
  }
  // ---------------------------------------------------------------- mágicas y equipos
  activate(intent, events) {
    const s = this.state;
    const me = s.players[intent.player];
    if (s.phase !== "main") return "Solo puedes usar m\xE1gicas y trampas en la fase principal";
    if (s.monsterPlayedThisTurn) return "Despu\xE9s de bajar un monstruo ya no puedes usar m\xE1gicas ni trampas";
    if (s.supportUsedThisTurn) return "Ya usaste una m\xE1gica o trampa este turno";
    const setSlot = me.support.findIndex((c) => c?.instanceId === intent.handId);
    const fromField = setSlot >= 0 ? me.support[setSlot] : null;
    const card = fromField ?? me.hand.find((c) => c.instanceId === intent.handId);
    if (!card) return "Esa carta no est\xE1 en tu mano";
    if (!isSupportCard(card.def)) return "Los monstruos se invocan en tus zonas de monstruo";
    if (fromField && fromField.def.type === "trap") return "Las trampas se activan solas cuando el rival hace algo";
    if (fromField && intent.set) return "Esa carta ya est\xE1 colocada";
    if (!fromField && (card.def.type === "trap" || intent.set)) {
      const slot = intent.slot ?? me.support.findIndex((c) => c === null);
      if (!Number.isInteger(slot) || slot < 0 || slot >= FIELD_SLOTS) return "No tienes zonas de apoyo libres";
      if (me.support[slot]) return "Esa zona ya tiene una carta";
      s.supportUsedThisTurn = true;
      me.hand = me.hand.filter((c) => c !== card);
      card.zone = "field";
      card.faceDown = true;
      card.fieldSlot = slot;
      me.support[slot] = card;
      events.push({ type: "trapSet", player: intent.player, slot, instanceId: card.instanceId });
      return null;
    }
    let target;
    if (needsEquipTarget(card.def)) {
      target = me.field.find((c) => c !== null && c.instanceId === intent.targetId);
      if (!target) return "Elige uno de tus monstruos para equiparlo";
    }
    s.supportUsedThisTurn = true;
    me.hand = me.hand.filter((c) => c !== card);
    if (fromField) {
      me.support[setSlot] = null;
      card.faceDown = false;
    }
    events.push({ type: "activated", player: intent.player, instanceId: card.instanceId, targetId: target?.instanceId ?? null });
    this.runEffects(card, "onActivate", events, { equipTarget: target });
    this.sendToMictlan(card, "used", events);
    return null;
  }
  // ---------------------------------------------------------------- posición
  changePosition(intent, events) {
    const s = this.state;
    const card = s.players[intent.player].field.find((c) => c?.instanceId === intent.instanceId);
    if (!card) return "Ese monstruo no est\xE1 en tu campo";
    if (card.attacksThisTurn > 0) return "Un monstruo que ya atac\xF3 no puede cambiar de posici\xF3n";
    card.positionChangedThisTurn = true;
    card.position = card.position === "attack" ? "defense" : "attack";
    const flipped = card.faceDown;
    card.faceDown = false;
    events.push({ type: "positionChanged", instanceId: card.instanceId, position: card.position, flipped });
    if (flipped) this.runEffects(card, "onSummon", events);
    return null;
  }
  // ---------------------------------------------------------------- batalla
  attack(intent, events) {
    const s = this.state;
    const me = s.players[intent.player];
    const foePlayer = opponentOf(intent.player);
    const foe = s.players[foePlayer];
    if (s.turn === 1 && !FIRST_TURN_CAN_ATTACK) return "No se puede atacar en el primer turno";
    if (s.turn <= s.attackLockUntil[intent.player]) return "Un efecto te impide atacar este turno";
    const attacker = me.field.find((c) => c?.instanceId === intent.attackerId);
    if (!attacker) return "Ese monstruo no est\xE1 en tu campo";
    if (attacker.position !== "attack") return "Solo atacan los monstruos en posici\xF3n de ataque";
    if (attacker.attacksThisTurn >= attacker.maxAttacks) return "Ese monstruo ya atac\xF3 este turno";
    const foeMonsters = foe.field.filter((c) => c !== null);
    let target = null;
    if (intent.targetId === null) {
      if (foeMonsters.length > 0 && !attacker.hasKeyword("directAttack")) return "No puedes atacar directo si el rival tiene monstruos";
    } else {
      target = foeMonsters.find((c) => c.instanceId === intent.targetId) ?? null;
      if (!target) return "Ese objetivo no est\xE1 en el campo rival";
    }
    if (s.phase !== "battle") {
      s.phase = "battle";
      events.push({ type: "phaseChanged", phase: "battle" });
    }
    attacker.attacksThisTurn += 1;
    attacker.hasAttackedThisTurn = attacker.attacksThisTurn >= attacker.maxAttacks;
    events.push({ type: "attackDeclared", attackerId: attacker.instanceId, targetId: target?.instanceId ?? null });
    if (attacker.faceDown) {
      attacker.faceDown = false;
      events.push({ type: "flipped", instanceId: attacker.instanceId });
    }
    this.attackNegated = false;
    this.springTrap(foePlayer, ["onOpponentAttack"], { attacker }, attacker.instanceId, events);
    if (this.attackNegated) {
      events.push({ type: "attackNegated", attackerId: attacker.instanceId });
      return null;
    }
    if (s.winner !== null || attacker.zone !== "field") return null;
    this.runEffects(attacker, "onAttack", events);
    if (target && target.zone === "field" && !target.faceDown && s.winner === null) this.runEffects(target, "onAttacked", events, { attacker });
    this.recomputeAuras();
    if (s.winner !== null || attacker.zone !== "field") return null;
    if (target && target.zone !== "field") return null;
    if (!target) {
      this.damage(foePlayer, attacker.atk + signTotal(s.daySign, "directBonus"), events);
      if (attacker.zone === "field") this.runEffects(attacker, "onDirectDamage", events);
      return null;
    }
    if (target.faceDown) {
      target.faceDown = false;
      events.push({ type: "flipped", instanceId: target.instanceId });
      this.recomputeAuras();
    }
    let killed = false;
    if (target.position === "attack") {
      const diff = attacker.atk - target.atk;
      if (diff > 0) {
        killed = this.battleDestroy(target, events);
        this.damage(foePlayer, diff, events);
      } else if (diff < 0) {
        this.battleDestroy(attacker, events);
        this.damage(intent.player, -diff, events);
      } else {
        this.battleDestroy(attacker, events);
        killed = this.battleDestroy(target, events);
      }
    } else {
      const diff = attacker.atk - target.defense;
      if (diff > 0) {
        killed = this.battleDestroy(target, events);
        if (attacker.hasKeyword("piercing")) this.damage(foePlayer, diff, events);
      } else if (diff < 0) this.damage(intent.player, -diff, events);
    }
    if (killed && attacker.zone === "field" && s.winner === null) this.runEffects(attacker, "onBattleDestroy", events);
    return null;
  }
  /** Destruir en batalla, salvo que tenga "no puede ser destruido en batalla" sin usar. */
  battleDestroy(card, events) {
    if (card.zone !== "field") return false;
    if (card.hasKeyword("battleImmune") && !card.battleImmuneUsed) {
      card.battleImmuneUsed = true;
      events.push({ type: "battleSaved", instanceId: card.instanceId });
      return false;
    }
    this.destroy(card, events);
    return true;
  }
  // ---------------------------------------------------------------- turnos
  endTurn(events) {
    const s = this.state;
    const wasPhase = phaseOf(s.turn);
    this.returnBorrowed(events);
    for (const p of s.players) {
      for (const c of p.field) {
        if (!c) continue;
        c.clearEndOfTurnModifiers();
        c.hasAttackedThisTurn = false;
        c.attacksThisTurn = 0;
        c.positionChangedThisTurn = false;
        c.summonedThisTurn = false;
      }
    }
    s.turnPlayer = opponentOf(s.turnPlayer);
    s.turn += 1;
    s.phase = "main";
    s.supportUsedThisTurn = false;
    s.monsterPlayedThisTurn = false;
    events.push({ type: "turnStarted", player: s.turnPlayer, turn: s.turn });
    const phase = phaseOf(s.turn);
    if (phase !== wasPhase) {
      events.push({ type: "timeChanged", phase, night: PHASE_INFO[phase].night });
      if (PHASE_INFO[phase].night !== PHASE_INFO[wasPhase].night) {
        const nahuales = s.players.flatMap((p) => p.field).filter((c) => !!c && !!c.def.nahual);
        if (nahuales.length) events.push({ type: "nahualShift", instanceIds: nahuales.map((c) => c.instanceId), night: PHASE_INFO[phase].night });
      }
    }
    const heal = signTotal(s.daySign, "turnHeal");
    if (heal > 0) this.heal(s.turnPlayer, heal, events);
    this.refillHand(s.turnPlayer, events);
    for (const c of [...s.players[s.turnPlayer].field]) {
      if (c && !c.faceDown && c.zone === "field") this.runEffects(c, "onTurnStart", events);
    }
    return null;
  }
  /** Roba hasta tener 5 en mano. Si necesita robar y el mazo está vacío, pierde. */
  refillHand(player, events) {
    const me = this.state.players[player];
    const need = HAND_SIZE - me.hand.length;
    if (need <= 0) return;
    if (me.deck.length === 0) {
      this.finish(opponentOf(player), "deckOut", events);
      return;
    }
    const drawn = me.deck.splice(0, need);
    for (const c of drawn) {
      c.zone = "hand";
      me.hand.push(c);
    }
    events.push({ type: "cardsDrawn", player, instanceIds: drawn.map((c) => c.instanceId) });
  }
  // ---------------------------------------------------------------- utilidades
  destroy(card, events, reason = "battle") {
    if (card.zone !== "field") return;
    this.removeFromField(card);
    const wasFaceUp = !card.faceDown;
    this.sendToMictlan(card, reason, events);
    if (wasFaceUp) this.runEffects(card, "onDestroyed", events);
    const burn = signTotal(this.state.daySign, "destroyBurn");
    if (burn > 0) this.damage(card.owner, burn, events);
    const heal = signTotal(this.state.daySign, "destroyHeal");
    if (heal > 0 && this.state.winner === null) this.heal(opponentOf(card.owner), heal, events);
  }
  /** Quita una carta del campo de quien la controle (puede estar "prestada" al rival). */
  removeFromField(card) {
    for (const p of this.state.players) {
      const i = p.field.indexOf(card);
      if (i >= 0) p.field[i] = null;
      const j = p.support.indexOf(card);
      if (j >= 0) p.support[j] = null;
    }
  }
  /** Quién controla una carta del campo. */
  controllerOf(card) {
    return this.state.players[0].field.includes(card) ? 0 : this.state.players[1].field.includes(card) ? 1 : card.owner;
  }
  /** Al final del turno, los monstruos "prestados" regresan con su dueño (o al Mictlán si no caben). */
  returnBorrowed(events) {
    for (const p of [0, 1]) {
      const field = this.state.players[p].field;
      field.forEach((c, i) => {
        if (!c || !c.borrowed) return;
        field[i] = null;
        c.borrowed = false;
        const home = this.state.players[c.owner].field;
        const slot = home.findIndex((x) => x === null);
        if (slot < 0) {
          this.sendToMictlan(c, "effect", events);
          return;
        }
        home[slot] = c;
        c.fieldSlot = slot;
        events.push({ type: "controlChanged", instanceId: c.instanceId, player: c.owner, slot });
      });
    }
  }
  sendToMictlan(card, reason, events) {
    card.resetForZoneChange();
    card.zone = "mictlan";
    this.state.players[card.owner].mictlan.push(card);
    events.push({ type: "sentToMictlan", instanceId: card.instanceId, reason });
  }
  heal(player, amount, events) {
    if (amount <= 0) return;
    const p = this.state.players[player];
    p.life += amount;
    events.push({ type: "healed", player, amount, lifeAfter: p.life });
  }
  /** Robar por efecto: si el mazo se acaba no se pierde. */
  drawCards(player, amount, events) {
    const me = this.state.players[player];
    const drawn = me.deck.splice(0, Math.max(0, amount));
    for (const c of drawn) {
      c.zone = "hand";
      me.hand.push(c);
    }
    if (drawn.length) events.push({ type: "cardsDrawn", player, instanceIds: drawn.map((c) => c.instanceId) });
  }
  damage(player, amount, events) {
    if (amount <= 0) return;
    const p = this.state.players[player];
    p.life = Math.max(0, p.life - amount);
    events.push({ type: "damage", player, amount, lifeAfter: p.life });
    if (p.life === 0) this.finish(opponentOf(player), "life", events);
  }
  // ---------------------------------------------------------------- efectos
  /** Corre los efectos de `card` con ese trigger (si se cumplen sus condiciones). */
  runEffects(card, trigger, events, ctx = {}) {
    const effects = (card.def.effects ?? []).filter((e) => e.trigger === trigger);
    if (effects.length === 0 || this.state.winner !== null || this.effectDepth > 8) return;
    this.effectDepth++;
    try {
      for (const effect of effects) {
        if (!this.conditionsMet(card, effect.conditions ?? [])) continue;
        events.push({ type: "effect", instanceId: card.instanceId, trigger });
        for (const action of effect.actions) {
          if (this.state.winner !== null) return;
          this.runAction(card, action, events, ctx);
        }
      }
    } finally {
      this.effectDepth--;
    }
  }
  conditionsMet(card, conditions) {
    const s = this.state;
    const me = s.players[card.owner];
    const foe = s.players[opponentOf(card.owner)];
    const count = (field) => field.filter((c) => c !== null).length;
    return conditions.every((c) => {
      switch (c.type) {
        case "isNight":
          return isNightTurn(s.turn);
        case "isDay":
          return !isNightTurn(s.turn);
        case "isPhase":
          return phaseOf(s.turn) === c.phase;
        case "lifeBelow":
          return me.life < c.amount;
        case "hasTagOnField":
          return me.field.some((o) => o && o !== card && !o.faceDown && o.def.tags.includes(c.tag));
        case "opponentHasMoreMonsters":
          return count(foe.field) > count(me.field);
      }
    });
  }
  resolveTargets(card, target, tag, ctx = {}) {
    const side = card.zone === "field" ? this.controllerOf(card) : card.owner;
    const mine = this.state.players[side].field.filter((c) => c !== null);
    const theirs = this.state.players[opponentOf(side)].field.filter((c) => c !== null);
    const pick = (list) => list.length ? [list[Math.floor(this.effectRng() * list.length)]] : [];
    const withTag = (list) => tag ? list.filter((c) => c.def.tags.includes(tag)) : list;
    const byAtk = [...theirs].sort((a, b) => b.atk - a.atk);
    switch (target) {
      case "self":
        return card.zone === "field" ? [card] : [];
      case "equipTarget":
        return ctx.equipTarget && ctx.equipTarget.zone === "field" ? [ctx.equipTarget] : [];
      case "attacker":
        return ctx.attacker && ctx.attacker.zone === "field" ? [ctx.attacker] : [];
      case "allAllies":
        return withTag(mine);
      case "otherAllies":
        return withTag(mine.filter((c) => c !== card));
      case "alliesWithTag":
        return withTag(mine);
      case "otherAlliesWithTag":
        return withTag(mine.filter((c) => c !== card));
      case "allEnemies":
        return withTag(theirs);
      case "highestAtkEnemy":
        return byAtk.slice(0, 1);
      case "lowestAtkEnemy":
        return byAtk.slice(-1);
      case "randomEnemy":
        return pick(withTag(theirs));
      case "randomMonster":
        return pick(withTag([...mine, ...theirs]));
      case "allMonsters":
        return withTag([...mine, ...theirs]);
      case "summoned":
        return ctx.summoned && ctx.summoned.zone === "field" ? [ctx.summoned] : [];
    }
  }
  runAction(card, a, events, ctx) {
    const owner = card.owner;
    const me = this.state.players[owner];
    switch (a.type) {
      case "modifyAtk":
      case "modifyDef": {
        const amount = scaleEffectAmount(a.amount, card.level);
        for (const t of this.resolveTargets(card, a.target, a.tag, ctx)) {
          t.addModifier({
            atk: a.type === "modifyAtk" ? amount : 0,
            def: a.type === "modifyDef" ? amount : 0,
            sourceId: card.instanceId,
            untilEndOfTurn: a.untilEndOfTurn ?? false
          });
          events.push({ type: "statChanged", instanceId: t.instanceId, atk: t.atk, def: t.defense });
        }
        return;
      }
      case "damage":
        this.damage(a.who === "self" ? owner : opponentOf(owner), scaleEffectAmount(a.amount, card.level), events);
        return;
      case "heal":
        this.heal(owner, scaleEffectAmount(a.amount, card.level), events);
        return;
      case "draw":
        this.drawCards(owner, a.amount, events);
        return;
      case "destroy":
        for (const t of this.resolveTargets(card, a.target, a.tag, ctx)) this.destroy(t, events, "effect");
        return;
      case "revive": {
        const slot = me.field.findIndex((c) => c === null);
        const pick = me.mictlan.filter((c) => c !== card && c.def.type === "monster" && (!a.tag || c.def.tags.includes(a.tag))).sort((x, y) => y.atk - x.atk)[0];
        if (slot < 0 || !pick) return;
        me.mictlan = me.mictlan.filter((c) => c !== pick);
        pick.resetForZoneChange();
        pick.zone = "field";
        pick.fieldSlot = slot;
        me.field[slot] = pick;
        events.push({ type: "revived", instanceId: pick.instanceId, slot });
        return;
      }
      case "negateAttack":
        this.attackNegated = true;
        return;
      case "returnToHand":
        for (const t of this.resolveTargets(card, a.target, a.tag, ctx)) {
          this.removeFromField(t);
          t.resetForZoneChange();
          t.zone = "hand";
          this.state.players[t.owner].hand.push(t);
          events.push({ type: "returnedToHand", instanceId: t.instanceId, player: t.owner });
        }
        return;
      case "forceDefense":
        for (const t of this.resolveTargets(card, a.target, a.tag, ctx)) {
          if (t.position === "defense") continue;
          t.position = "defense";
          events.push({ type: "positionChanged", instanceId: t.instanceId, position: "defense", flipped: false });
        }
        return;
      case "takeControl": {
        const ctrl = card.zone === "field" ? this.controllerOf(card) : owner;
        for (const t of this.resolveTargets(card, a.target, a.tag, ctx)) {
          if (this.controllerOf(t) === ctrl) continue;
          const mySide = this.state.players[ctrl].field;
          const slot = mySide.findIndex((x) => x === null);
          if (slot < 0) return;
          this.removeFromField(t);
          mySide[slot] = t;
          t.fieldSlot = slot;
          t.borrowed = t.owner !== ctrl;
          t.attacksThisTurn = 0;
          t.hasAttackedThisTurn = false;
          events.push({ type: "controlChanged", instanceId: t.instanceId, player: ctrl, slot });
        }
        return;
      }
      case "preventAttack": {
        const foe = opponentOf(owner);
        const until = this.state.turnPlayer === foe ? this.state.turn + 2 : this.state.turn + 1;
        this.state.attackLockUntil[foe] = Math.max(this.state.attackLockUntil[foe], until);
        events.push({ type: "attackLocked", player: foe, untilTurn: until });
        return;
      }
      case "grantKeyword":
        for (const t of this.resolveTargets(card, a.target, a.tag, ctx)) t.addKeyword(a.keyword, a.untilEndOfTurn ?? false);
        return;
      case "destroySupport": {
        const sides = a.who === "all" ? [0, 1] : [opponentOf(owner)];
        for (const p of sides) {
          for (const trap of [...this.state.players[p].support]) if (trap) {
            this.removeFromField(trap);
            this.sendToMictlan(trap, "effect", events);
          }
        }
        return;
      }
      case "summonFromDeck": {
        const slot = me.field.findIndex((c) => c === null);
        if (slot < 0) return;
        const pickCard = me.deck.filter((c) => c.def.type === "monster" && c.def.atk <= a.maxAtk && c.def.id !== card.def.id).filter((c) => !a.tag || c.def.tags.includes(a.tag)).filter((c) => !a.sameTag || c.def.tags.some((t) => card.def.tags.includes(t))).sort((x, y) => y.def.atk - x.def.atk)[0];
        if (!pickCard) return;
        me.deck = me.deck.filter((c) => c !== pickCard);
        pickCard.resetForZoneChange();
        pickCard.zone = "field";
        pickCard.fieldSlot = slot;
        me.field[slot] = pickCard;
        events.push({ type: "specialSummoned", instanceId: pickCard.instanceId, player: owner, slot, from: "deck" });
        this.runEffects(pickCard, "onSummon", events);
        return;
      }
    }
  }
  /** Recalcula los efectos continuos (auras) de todo el campo. Se llama después de cada cambio. */
  recomputeAuras() {
    const field = this.state.players.flatMap((p) => p.field).filter((c) => c !== null);
    field.forEach((c) => c.clearAuraModifiers());
    const phase = phaseOf(this.state.turn);
    const night = PHASE_INFO[phase].night;
    for (const c of field) {
      c.nightForm = night && !!c.def.nahual;
      let atk = phaseAtkBonus(phase, c.def);
      let def = 0;
      for (const r of signRules(this.state.daySign, "stat")) {
        if (!matches(c.def, r)) continue;
        atk += r.atk ?? 0;
        def += r.def ?? 0;
      }
      if (atk || def) c.addModifier({ atk, def, sourceId: SOURCE_ENVIRONMENT, untilEndOfTurn: false, aura: true });
    }
    for (const source of field) {
      if (source.faceDown) continue;
      for (const effect of source.def.effects ?? []) {
        if (effect.trigger !== "continuous" || !this.conditionsMet(source, effect.conditions ?? [])) continue;
        for (const a of effect.actions) {
          if (a.type === "grantKeyword") {
            for (const t of this.resolveTargets(source, a.target, a.tag)) t.addKeyword(a.keyword, false, true);
            continue;
          }
          if (a.type !== "modifyAtk" && a.type !== "modifyDef") continue;
          const amount = scaleEffectAmount(a.amount, source.level);
          for (const t of this.resolveTargets(source, a.target, a.tag)) {
            t.addModifier({
              atk: a.type === "modifyAtk" ? amount : 0,
              def: a.type === "modifyDef" ? amount : 0,
              sourceId: source.instanceId,
              untilEndOfTurn: false,
              aura: true
            });
          }
        }
      }
    }
  }
  finish(winner, reason, events) {
    if (this.state.winner !== null) return;
    this.state.winner = winner;
    this.state.phase = "ended";
    events.push({ type: "gameOver", winner, reason });
  }
};
var fail = (error) => ({ ok: false, error });

// src/ai/aiPlayer.ts
function nextAiIntent(state, me, fusion) {
  const mine = state.players[me];
  const foe = state.players[opponentOf(me)];
  const foeMonsters = foe.field.filter((c) => c !== null);
  const strongestFoeAtk = Math.max(0, ...foeMonsters.filter((c) => !c.faceDown && c.position === "attack").map((c) => c.atk));
  if (state.phase === "main" && mine.hand.length > 0) {
    const myMonsters = mine.field.filter((c) => c !== null);
    const monsterPlay = state.monsterPlayedThisTurn ? null : chooseMonsterPlay(mine.hand, mine.field, strongestFoeAtk, me, fusion);
    if (!state.supportUsedThisTurn && !state.monsterPlayedThisTurn) {
      const support = chooseSupportPlay(state, me, myMonsters, monsterPlay !== null);
      if (support) return support;
    }
    if (monsterPlay) return monsterPlay.intent;
  }
  const canAttackThisTurn = (state.turn > 1 || FIRST_TURN_CAN_ATTACK) && state.turn > state.attackLockUntil[me];
  if (canAttackThisTurn) {
    const attackers = mine.field.filter((c) => c !== null && c.position === "attack" && !c.hasAttackedThisTurn).sort((a, b) => b.atk - a.atk);
    for (const attacker of attackers) {
      if (foeMonsters.length === 0) {
        return { type: "attack", player: me, attackerId: attacker.instanceId, targetId: null };
      }
      const target = pickTarget(attacker, foeMonsters);
      if (target) return { type: "attack", player: me, attackerId: attacker.instanceId, targetId: target.instanceId };
      if (attacker.hasKeyword("directAttack")) return { type: "attack", player: me, attackerId: attacker.instanceId, targetId: null };
    }
  }
  return { type: "endTurn", player: me };
}
function pickTarget(attacker, targets) {
  const beatable = targets.filter((t) => !t.faceDown).filter((t) => t.position === "attack" ? t.atk < attacker.atk : t.defense < attacker.atk).sort((a, b) => (b.position === "attack" ? 1 : 0) - (a.position === "attack" ? 1 : 0) || b.atk - a.atk);
  if (beatable[0]) return beatable[0];
  const hidden = targets.find((t) => t.faceDown);
  if (hidden && attacker.atk >= 1500) return hidden;
  return null;
}
function chooseMonsterPlay(hand, field, strongestFoeAtk, me, fusion) {
  const monsters = hand.filter((c) => c.def.type === "monster");
  const strongest = [...monsters].sort((a, b) => b.atk - a.atk)[0];
  if (!strongest) return null;
  let play = { ids: [strongest.instanceId], atk: strongest.atk, fused: false };
  if (fusion) {
    for (const a of monsters) {
      for (const b of monsters) {
        if (a === b) continue;
        const result = bestFusion(fusion, a.def, b.def);
        if (result && result.atk > play.atk) play = { ids: [a.instanceId, b.instanceId], atk: result.atk, fused: true };
      }
    }
  }
  let slot = field.findIndex((c) => c === null);
  if (slot < 0) {
    play = { ids: [strongest.instanceId], atk: strongest.atk, fused: false };
    const weakest = field.reduce((w, c, i) => c && c.atk < (field[w]?.atk ?? Infinity) ? i : w, 0);
    if ((field[weakest]?.atk ?? 0) < play.atk) slot = weakest;
  }
  if (slot < 0) return null;
  const position = play.atk >= strongestFoeAtk ? "attack" : "defense";
  return {
    atk: play.atk,
    intent: { type: "play", player: me, handIds: play.ids, slot, position, faceDown: position === "defense" && !play.fused }
  };
}
function chooseSupportPlay(state, me, myMonsters, hasMonsterPlay) {
  const mine = state.players[me];
  const cards = mine.hand.filter((c) => c.def.type !== "monster");
  if (cards.length === 0) return null;
  const activate = (c, targetId) => ({ type: "activate", player: me, handId: c.instanceId, targetId });
  const strongest = [...myMonsters].sort((a, b) => b.atk - a.atk)[0];
  const canAttack = state.turn > 1 || FIRST_TURN_CAN_ATTACK;
  const find = (k) => cards.find((c) => spellKind(c) === k);
  const trap = find("trap");
  if (trap && mine.support.some((c) => c === null)) return activate(trap);
  const equip = find("equip");
  if (equip && strongest) return activate(equip, strongest.instanceId);
  const spells = cards.filter((c) => c.def.type === "spell").map((c) => ({ c, v: spellValue(c, state, me, canAttack) })).sort((a, b) => b.v - a.v);
  if (spells[0] && spells[0].v > 0) return activate(spells[0].c);
  if (!hasMonsterPlay) {
    const harmless = spells.find((x) => x.v >= 0)?.c;
    const any = harmless ?? cards.find((c) => spellKind(c) === "trap" && mine.support.some((z) => z === null)) ?? (strongest ? equip : void 0);
    if (any) return activate(any, spellKind(any) === "equip" ? strongest?.instanceId : void 0);
  }
  return null;
}
function spellValue(card, state, me, canAttack) {
  const mine = state.players[me];
  const foe = state.players[opponentOf(me)];
  const myMon = mine.field.filter((c) => c !== null);
  const foeMon = foe.field.filter((c) => c !== null);
  const power = (list) => list.reduce((n, c) => n + Math.max(c.atk, c.defense), 0);
  const freeSlot = mine.field.some((c) => c === null);
  const enemyTargets = ["allEnemies", "highestAtkEnemy", "lowestAtkEnemy", "randomEnemy"];
  let v = 0;
  for (const a of (card.def.effects ?? []).flatMap((e) => e.actions)) {
    switch (a.type) {
      case "damage":
        v += a.who === "self" ? -a.amount / 200 : a.amount / 100;
        break;
      case "heal":
        v += mine.life < 6e3 ? a.amount / 200 : 0;
        break;
      case "draw":
        v += 2 * a.amount;
        break;
      case "modifyAtk":
      case "modifyDef":
        if (enemyTargets.includes(a.target)) v += foeMon.length && a.amount < 0 ? 2 : 0;
        else v += canAttack && myMon.some((c) => c.position === "attack") ? Math.max(0, a.amount) / 100 : 0;
        break;
      case "destroy":
      case "returnToHand":
      case "takeControl":
      case "forceDefense":
        if (enemyTargets.includes(a.target)) v += foeMon.length ? 2 + power(foeMon) / (a.target === "allEnemies" ? 400 : 1200) : 0;
        else if (a.target === "allMonsters") v += (power(foeMon) - power(myMon)) / 400;
        else if (a.target === "randomMonster") v += (foeMon.length - myMon.length) * 1.5;
        break;
      case "destroySupport": {
        const theirs = foe.support.filter(Boolean).length, ours = mine.support.filter(Boolean).length;
        v += 3 * (a.who === "all" ? theirs - ours : theirs);
        break;
      }
      case "preventAttack":
        v += foeMon.some((c) => c.position === "attack") ? 3 : 0;
        break;
      case "summonFromDeck":
        v += freeSlot ? 2 : 0;
        break;
      case "revive":
        v += freeSlot && mine.mictlan.some((c) => c.def.type === "monster") ? 3 : 0;
        break;
      case "grantKeyword":
        v += myMon.length ? 1 : 0;
        break;
      default:
        break;
    }
  }
  return v;
}
function spellKind(card) {
  if (card.def.type === "equip") return "equip";
  if (card.def.type === "trap") return "trap";
  const actions = (card.def.effects ?? []).flatMap((e) => e.actions);
  if (actions.some((a) => a.type === "damage" || a.type === "destroy")) return "damage";
  if (actions.some((a) => a.type === "heal")) return "heal";
  if (actions.some((a) => a.type === "modifyAtk")) return "buff";
  return "other";
}

// src/game/replay.ts
var HUMAN = 0;
var AI = 1;
function aiFusionFor(opponent, fusion) {
  return opponent.level >= 2 ? fusion : void 0;
}
function aiStep(engine, opponent, fusion) {
  let result = engine.apply(nextAiIntent(engine.state, AI, aiFusionFor(opponent, fusion)));
  if (!result.ok) result = engine.apply({ type: "endTurn", player: AI });
  return result;
}
function createDuel(seed, playerDeck, opponent, db, fusion, levels) {
  return new DuelEngine({ db, decks: [playerDeck, opponent.deck], seed, firstPlayer: HUMAN, fusion, signs: daySigns, levels: [levels] });
}
function replayDuel(input, db, fusion) {
  if (input.intents.some((i) => i?.type === "surrender")) return { ok: true, winner: AI, turns: 0 };
  const engine = createDuel(input.seed, input.playerDeck, input.opponent, db, fusion, input.levels);
  engine.start();
  let next = 0;
  let guard = 0;
  while (engine.state.winner === null && guard++ < 2e4) {
    if (engine.state.turnPlayer === AI) {
      aiStep(engine, input.opponent, fusion);
      continue;
    }
    const intent = input.intents[next];
    if (!intent) break;
    next++;
    if (intent.player !== HUMAN) return { ok: false, error: `La jugada ${next} no es del jugador` };
    const result = engine.apply(intent);
    if (!result.ok) return { ok: false, error: `La jugada ${next} no es v\xE1lida: ${result.error}` };
  }
  if (engine.state.winner !== null && next < input.intents.length) {
    return { ok: false, error: "Hay jugadas despu\xE9s de que termin\xF3 el duelo" };
  }
  return { ok: true, winner: engine.state.winner, turns: engine.state.turn };
}
var pvpFirstPlayer = (seed) => seed >>> 3 & 1;
function createPvpDuel(setup, db, fusion) {
  return new DuelEngine({
    db,
    decks: setup.decks,
    seed: setup.seed,
    firstPlayer: pvpFirstPlayer(setup.seed),
    fusion,
    signs: daySigns,
    levels: setup.levels
  });
}
function replayPvp(setup, intents, db, fusion) {
  const engine = createPvpDuel(setup, db, fusion);
  engine.start();
  for (let i = 0; i < intents.length; i++) {
    const intent = intents[i];
    if (engine.state.winner !== null) return { ok: false, error: "El duelo ya termin\xF3", at: i };
    if (!intent || intent.player !== 0 && intent.player !== 1) return { ok: false, error: "Jugada inv\xE1lida", at: i };
    const r = engine.apply(intent);
    if (!r.ok) return { ok: false, error: r.error, at: i };
  }
  return { ok: true, engine, winner: engine.state.winner };
}

// src/game/rewards.ts
function rollRewards(duelist, firstWin, rng) {
  const total = duelist.rewards.reduce((n, r) => n + r.weight, 0);
  let pick = rng() * total;
  let card = duelist.rewards[0].card;
  for (const r of duelist.rewards) {
    pick -= r.weight;
    if (pick < 0) {
      card = r.card;
      break;
    }
  }
  return firstWin ? [card, duelist.signature] : [card];
}

// src/game/jadeStore.ts
var JADE_PACKAGES = jade_default;
var getJadePackage = (id) => JADE_PACKAGES.find((p) => p.id === id);
var FIRST_PURCHASE_MULTIPLIER = 2;
var CURRENCY_CODE = "MXN";
function giftableUrs(db) {
  const ids = /* @__PURE__ */ new Set();
  for (const pack of packs) for (const c of packPool(pack, db).UR) ids.add(c.id);
  return [...ids].sort((a, b) => a - b);
}
function pickUrs(db, owned2, count, rng) {
  const pool = giftableUrs(db).filter((id) => rarityOf(db.get(id)) === "UR");
  const out = [];
  const tiers = [pool.filter((id) => owned2(id) === 0), pool.filter((id) => owned2(id) > 0 && owned2(id) < 3), pool.filter((id) => owned2(id) >= 3)];
  for (const tier of tiers) {
    const left = [...tier];
    while (out.length < count && left.length) out.push(left.splice(Math.floor(rng() * left.length), 1)[0]);
  }
  return out;
}
var CODE_ABC = "ABCDEFGHJKMNPQRTUVWXYZ2346789";
function newGiftCode(random) {
  const part = () => Array.from({ length: 4 }, () => CODE_ABC[Math.floor(random() * CODE_ABC.length)]).join("");
  return `QS-${part()}-${part()}`;
}
function normalizeCode(input) {
  return input.trim().toUpperCase().replace(/[\s_]+/g, "").replace(/[—–]/g, "-");
}
var isPlausibleCode = (code) => /^[A-Z0-9-]{4,24}$/.test(code);

// src/game/pvpView.ts
var MASK_RANGE = 1024;
function idMask(seed) {
  const perm = shuffle(Array.from({ length: MASK_RANGE }, (_, i) => i + 1), createRng((seed ^ 1924769) >>> 0));
  return (iid) => iid >= 1 && iid <= MASK_RANGE ? perm[iid - 1] : iid + MASK_RANGE;
}
function cardView(c, visible, pub) {
  const base = { i: pub(c.instanceId), c: 0, o: c.owner, z: c.zone, s: c.fieldSlot, p: c.position, f: c.faceDown };
  if (!visible) return base;
  const flags = (c.hasAttackedThisTurn ? 1 : 0) | (c.positionChangedThisTurn ? 2 : 0) | (c.summonedThisTurn ? 4 : 0) | (c.battleImmuneUsed ? 8 : 0) | (c.borrowed ? 16 : 0);
  const keywords = c.activeKeywords;
  return {
    ...base,
    c: c.def.id,
    a: c.atk,
    d: c.defense,
    ...c.nightForm ? { n: true } : {},
    ...c.level > 1 ? { l: c.level } : {},
    ...keywords.length ? { k: keywords } : {},
    ...c.attacksThisTurn ? { t: c.attacksThisTurn } : {},
    ...flags ? { b: flags } : {}
  };
}
function canSee(c, area, holder, viewer) {
  if (area === "mictlan") return true;
  if (area === "field") return !c.faceDown || holder === viewer;
  return holder === viewer;
}
function viewFor(engine, viewer, pub) {
  const s = engine.state;
  const pv = (p, holder) => ({
    life: p.life,
    deck: p.deck.length,
    hand: p.hand.map((c) => cardView(c, canSee(c, "hand", holder, viewer), pub)),
    field: p.field.map((c) => c ? cardView(c, canSee(c, "field", holder, viewer), pub) : null),
    support: p.support.map((c) => c ? cardView(c, canSee(c, "support", holder, viewer), pub) : null),
    mictlan: p.mictlan.map((c) => cardView(c, true, pub))
  });
  return {
    players: [pv(s.players[0], 0), pv(s.players[1], 1)],
    turnPlayer: s.turnPlayer,
    turn: s.turn,
    phase: s.phase,
    supportUsedThisTurn: s.supportUsedThisTurn,
    monsterPlayedThisTurn: s.monsterPlayedThisTurn,
    winner: s.winner,
    daySign: s.daySign,
    attackLockUntil: [...s.attackLockUntil]
  };
}
function maskEvents(events, view, pub) {
  const hidden = /* @__PURE__ */ new Set();
  for (const p of view.players) {
    for (const c of [...p.hand, ...p.field, ...p.support]) if (c && c.c === 0) hidden.add(c.i);
  }
  const out = [];
  for (const e of events) {
    const m = remapEvent(e, pub);
    if (m.type === "statChanged" && hidden.has(m.instanceId)) continue;
    if (m.type === "effect" && hidden.has(m.instanceId)) continue;
    if (m.type === "nahualShift") {
      const ids = m.instanceIds.filter((id) => !hidden.has(id));
      if (!ids.length) continue;
      out.push({ ...m, instanceIds: ids });
      continue;
    }
    out.push(m);
  }
  return out;
}
function remapEvent(e, pub) {
  const r = { ...e };
  for (const key of ["instanceId", "resultId", "discardedId", "attackerId"]) {
    if (typeof r[key] === "number") r[key] = pub(r[key]);
  }
  if (e.type === "attackDeclared" || e.type === "activated") {
    const t = e.targetId;
    r.targetId = t === null ? null : pub(t);
  }
  if (Array.isArray(r.instanceIds)) r.instanceIds = r.instanceIds.map(pub);
  if (Array.isArray(r.materialIds)) r.materialIds = r.materialIds.map(pub);
  return r;
}
function unmaskIntent(intent, pub) {
  const back = /* @__PURE__ */ new Map();
  for (let i = 1; i <= MASK_RANGE; i++) back.set(pub(i), i);
  const real = (n) => n >= 1 && n <= MASK_RANGE ? back.get(n) : n > MASK_RANGE * 2 ? n - MASK_RANGE : -1;
  switch (intent.type) {
    case "play":
      return { ...intent, handIds: intent.handIds.map(real) };
    case "activate":
      return { ...intent, handId: real(intent.handId), ...intent.targetId !== void 0 ? { targetId: real(intent.targetId) } : {} };
    case "changePosition":
      return { ...intent, instanceId: real(intent.instanceId) };
    case "attack":
      return { ...intent, attackerId: real(intent.attackerId), targetId: intent.targetId === null ? null : real(intent.targetId) };
    default:
      return intent;
  }
}
function pvpSnapshotFor(setup, intents, viewer, since, db, fusion) {
  const pub = idMask(setup.seed);
  const engine = createPvpDuel(setup, db, fusion);
  engine.start();
  const steps = [];
  const from = Math.max(0, Math.min(since, intents.length));
  for (let i = 0; i < intents.length; i++) {
    const r = engine.apply(intents[i]);
    if (!r.ok) return { ok: false, error: r.error, at: i };
    if (i >= from) {
      const view = viewFor(engine, viewer, pub);
      steps.push({ events: maskEvents(r.events, view, pub), view });
    }
  }
  return { ok: true, view: viewFor(engine, viewer, pub), steps, index: intents.length };
}
var HIDDEN_CARD = Object.freeze({
  id: 0,
  name: "Carta boca abajo",
  description: "",
  type: "monster",
  attribute: "tierra",
  tags: [],
  atk: 0,
  def: 0
});

// src/server/rules.ts
var MAX_INTENTS = 4e3;
function checkDuelStart(input) {
  const duelist = getDuelist(input.duelistId);
  if (!duelist) return { ok: false, error: "Ese duelista no existe" };
  if (!isUnlocked(duelist.id, input.defeated)) return { ok: false, error: "Ese duelista todav\xEDa est\xE1 bloqueado" };
  const fake = { version: 1, collection: input.collection, deck: [...input.deck], defeated: [...input.defeated], wins: 0, losses: 0 };
  const errors = validatePlayerDeck(fake, input.deck, cardDb);
  if (errors.length) return { ok: false, error: errors[0] };
  return { ok: true, value: duelist };
}
function newSeed(random = Math.random) {
  return Math.floor(random() * 4294967295) >>> 0;
}
function verifyDuel(input) {
  const duelist = getDuelist(input.duelistId);
  if (!duelist) return { ok: false, error: "Ese duelista no existe" };
  if (!Array.isArray(input.intents)) return { ok: false, error: "Faltan las jugadas" };
  if (input.intents.length > MAX_INTENTS) return { ok: false, error: "Demasiadas jugadas" };
  const levels = cleanLevels(input.levels);
  const result = replayDuel({ seed: input.seed, playerDeck: input.deck, opponent: duelist, intents: input.intents, levels }, cardDb, fusionDb);
  if (!result.ok) return result;
  if (result.winner === null) return { ok: false, error: "El duelo no termin\xF3" };
  return { ok: true, value: { won: result.winner === 0, turns: result.turns } };
}
function planRewards(duelistId, seed, firstWin) {
  const duelist = getDuelist(duelistId);
  if (!duelist) return { cacao: 0, jade: 0, tickets: 0, cards: [] };
  const cards = rollRewards(duelist, firstWin, createRng((seed ^ 2654435769) >>> 0));
  return {
    cacao: WIN_CACAO[duelist.level],
    jade: 0,
    tickets: WIN_TICKETS,
    cards: cards.map((id) => ({ id, ...DUPLICATE_VALUE[rarityOf(cardDb.get(id))] }))
  };
}
function cleanLevels(raw) {
  const out = {};
  for (const [id, lv] of Object.entries(raw ?? {})) {
    const n = Number(id);
    if (Number.isInteger(n) && cardDb.tryGet(n)) out[n] = clampLevel(Number(lv));
  }
  return out;
}
function deckLevels(deck, levels) {
  const out = {};
  for (const id of new Set(deck)) {
    const lv = clampLevel(levels[id]);
    if (lv > 1) out[id] = lv;
  }
  return out;
}
function planAscend(cardId, haveBase, haveResult) {
  const card = cardDb.tryGet(cardId);
  const result = card?.ascendsTo ? cardDb.tryGet(card.ascendsTo) : void 0;
  return checkAscend(card, result, haveBase, result ? haveResult(result.id) : 0);
}
function planLevelUp(cardId, have, level, cacao) {
  return checkLevelUp(cardDb.tryGet(cardId), have, level, cacao);
}
var PVP_WIN_CACAO = 30;
var PVP_DAILY_REWARDED_WINS = 5;
var PVP_SAME_RIVAL_DAILY = 2;
var PVP_TURN_TIMEOUT_MS = 12e4;
function checkPvpDeck(deck, collection) {
  const fake = { version: 1, collection, deck: [...deck], defeated: [], wins: 0, losses: 0 };
  const errors = validatePlayerDeck(fake, deck, cardDb);
  return errors.length ? { ok: false, error: errors[0] } : { ok: true, value: true };
}
function roomCode(random = Math.random) {
  const abc = "ABCDEFGHJKLMNPQRSTUVWXYZ";
  return Array.from({ length: 5 }, () => abc[Math.floor(random() * abc.length)]).join("");
}
function setupOf(m) {
  return { seed: Number(m.seed), decks: [m.host_deck, m.guest_deck], levels: [cleanLevels(m.host_levels), cleanLevels(m.guest_levels)] };
}
function pvpMove(m, player, intent, masked = false) {
  if (!intent || typeof intent !== "object") return { ok: false, error: "Jugada inv\xE1lida" };
  const it = masked ? unmaskIntent(intent, idMask(Number(m.seed))) : intent;
  if (it.player !== player) return { ok: false, error: "Esa jugada no es tuya" };
  if (m.intents.length >= MAX_INTENTS) return { ok: false, error: "Demasiadas jugadas" };
  const all = [...m.intents, it];
  const r = replayPvp(setupOf(m), all, cardDb, fusionDb);
  if (!r.ok) return { ok: false, error: r.at === all.length - 1 ? r.error : "La partida guardada no cuadra" };
  return { ok: true, value: { intents: all, winner: r.winner, turnPlayer: r.engine.state.turnPlayer } };
}
function pvpTurnOf(m) {
  const r = replayPvp(setupOf(m), m.intents, cardDb, fusionDb);
  return r.ok && r.winner === null ? r.engine.state.turnPlayer : null;
}
function planPacks(packId, count, seed, sinceUr) {
  const pack = getPack(packId);
  if (!pack) return { ok: false, error: "Ese sobre no existe" };
  if (!PACK_COUNTS.includes(count)) return { ok: false, error: "Cantidad de sobres inv\xE1lida" };
  const r = openPacks(pack, cardDb, createRng((seed ^ 6206636) >>> 0), Math.max(0, Math.floor(sinceUr) || 0), count);
  return {
    ok: true,
    value: {
      price: pack.price * count,
      sinceUr: r.sinceUr,
      packs: r.packs.map((o) => ({ pity: o.pity, cards: o.cards.map((id) => ({ id, ...DUPLICATE_VALUE[rarityOf(cardDb.get(id))] })) }))
    }
  };
}
function planFeatured(seed, previous) {
  return pickFeatured(cardDb, createRng((seed ^ 65191) >>> 0), previous ?? void 0);
}
function planSpin(seed, featured) {
  const card = cardDb.tryGet(featured);
  if (!card) return { ok: false, error: "La carta a la vista ya no existe" };
  const rng = createRng((seed ^ 23326) >>> 0);
  const index = spinIndex(rng);
  const p = ROULETTE_PRIZES[index];
  const dup = DUPLICATE_VALUE[rarityOf(card)];
  return {
    ok: true,
    value: {
      index,
      prize: { kind: p.kind, amount: p.amount, card: p.kind === "card" ? featured : null, cacao: p.kind === "card" ? dup.cacao : 0, jade: p.kind === "card" ? dup.jade : 0 },
      nextFeatured: pickFeatured(cardDb, rng, featured)
    }
  };
}
function planShop(seed) {
  return rollShop(cardDb, createRng((seed ^ 21513) >>> 0));
}
function pvpView(m, player, since) {
  return pvpSnapshotFor(setupOf(m), m.intents, player, since, cardDb, fusionDb);
}
function jadePackage(id) {
  const p = getJadePackage(id);
  return p ? { id: p.id, name: p.name, price: p.price, jade: p.jade, ur: p.ur, gold: p.gold } : null;
}
function planGrant(grant, seed, collection) {
  const ur = Math.max(0, Math.min(10, Math.floor(grant.ur) || 0));
  const ids = pickUrs(cardDb, (id) => collection[id] ?? 0, ur, createRng((seed ^ 31454) >>> 0));
  return {
    jade: Math.max(0, Math.floor(grant.jade) || 0),
    gold: Math.max(0, Math.floor(grant.gold) || 0),
    cards: ids.map((id) => ({ id, ...DUPLICATE_VALUE[rarityOf(cardDb.get(id))] }))
  };
}
export {
  CURRENCY_CODE,
  DATA_VERSION,
  FIRST_PURCHASE_MULTIPLIER,
  GOLD_BUY_COUNTS,
  GOLD_TICKET_PRICE,
  JADE_PACKAGES,
  MAX_INTENTS,
  PACK_PITY,
  PACK_SIZE,
  PVP_DAILY_REWARDED_WINS,
  PVP_SAME_RIVAL_DAILY,
  PVP_TURN_TIMEOUT_MS,
  PVP_WIN_CACAO,
  ROULETTE_PRIZES,
  SHOP_REFRESH_TICKETS,
  START_JADE,
  checkDuelStart,
  checkPvpDeck,
  cleanLevels,
  deckLevels,
  isPlausibleCode,
  jadePackage,
  newGiftCode,
  newSeed,
  normalizeCode,
  planAscend,
  planFeatured,
  planGrant,
  planLevelUp,
  planPacks,
  planRewards,
  planShop,
  planSpin,
  pvpFirstPlayer,
  pvpMove,
  pvpTurnOf,
  pvpView,
  roomCode,
  shopDay,
  trimDeckToCollection,
  verifyDuel
};
