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
  { id: 1, name: "Ocelote joven", description: "Cachorro de la selva, material de fusi\xF3n.", type: "monster", attribute: "tierra", tags: ["jaguar", "bestia"], atk: 800, def: 600, rarity: "N" },
  { id: 2, name: "Macehual con macuahuitl", description: "Guerrero del pueblo armado con obsidiana.", type: "monster", attribute: "tierra", tags: ["guerrero"], atk: 900, def: 700, rarity: "N" },
  { id: 3, name: "Guerrero Jaguar", description: "De noche, gana +300 ATK al atacar.", type: "monster", attribute: "tierra", tags: ["guerrero", "jaguar"], atk: 1800, def: 1400, rarity: "R", effects: [{ trigger: "onAttack", conditions: [{ type: "isNight" }], actions: [{ type: "modifyAtk", amount: 300, target: "self", untilEndOfTurn: true }] }] },
  { id: 4, name: "Guerrero \xC1guila", description: "\xC9lite del sol. Al ser invocado por fusi\xF3n, robas 1 carta.", type: "monster", attribute: "sol", tags: ["guerrero", "ave", "sol"], atk: 1700, def: 1500, rarity: "R", effects: [{ trigger: "onFusionSummon", actions: [{ type: "draw", amount: 1 }] }] },
  { id: 5, name: "Xiuhc\xF3atl", description: "Serpiente de fuego. Al ser invocada, hace 500 de da\xF1o al rival.", type: "monster", attribute: "sol", tags: ["serpiente", "fuego", "sol"], atk: 2200, def: 1600, rarity: "SR", effects: [{ trigger: "onSummon", actions: [{ type: "damage", amount: 500, who: "opponent" }] }] },
  { id: 6, name: "Tl\xE1loc", description: "Se\xF1or de la lluvia. Tus otros monstruos de agua ganan +300 ATK.", type: "monster", attribute: "agua", tags: ["deidad", "agua"], atk: 2600, def: 2400, rarity: "UR", effects: [{ trigger: "continuous", actions: [{ type: "modifyAtk", amount: 300, target: "otherAlliesWithTag", tag: "agua" }] }] },
  { id: 7, name: "Mictlantecuhtli", description: "Se\xF1or del Mictl\xE1n. Al ser destruido, revive tu monstruo de muerte m\xE1s fuerte del Mictl\xE1n.", type: "monster", attribute: "tierra", tags: ["deidad", "muerte"], atk: 2800, def: 2e3, rarity: "UR", effects: [{ trigger: "onDestroyed", actions: [{ type: "revive", tag: "muerte" }] }] },
  { id: 8, name: "Quetzalc\xF3atl", description: "Serpiente emplumada. Solo por receta. Al ser invocada por fusi\xF3n, destruye al monstruo rival m\xE1s fuerte.", type: "monster", attribute: "viento", tags: ["deidad", "serpiente", "ave", "viento"], atk: 3e3, def: 2500, rarity: "UR", effects: [{ trigger: "onFusionSummon", actions: [{ type: "destroy", target: "highestAtkEnemy" }] }] },
  { id: 9, name: "Colibr\xED guerrero", description: "Mensajero veloz. Al ser invocado, robas 1 carta.", type: "monster", attribute: "viento", tags: ["ave"], atk: 500, def: 400, rarity: "N", effects: [{ trigger: "onSummon", actions: [{ type: "draw", amount: 1 }] }] },
  { id: 10, name: "Serpiente de lago", description: "Habita los canales de Tenochtitlan.", type: "monster", attribute: "agua", tags: ["serpiente", "agua"], atk: 700, def: 900, rarity: "N" },
  { id: 11, name: "Xoloitzcuintle", description: "Gu\xEDa de las almas rumbo al Mictl\xE1n.", type: "monster", attribute: "tierra", tags: ["bestia", "muerte"], atk: 1e3, def: 800, rarity: "N" },
  { id: 12, name: "Sacerdote del Fuego Nuevo", description: "Guardi\xE1n del Fuego Nuevo. Al ser invocado, recuperas 500 PV.", type: "monster", attribute: "sol", tags: ["fuego"], atk: 600, def: 1200, rarity: "N", effects: [{ trigger: "onSummon", actions: [{ type: "heal", amount: 500 }] }] },
  { id: 13, name: "Cipactli", description: "Caim\xE1n primordial de cuyo cuerpo se hizo la tierra.", type: "monster", attribute: "agua", tags: ["bestia", "agua"], atk: 1500, def: 1200, rarity: "R" },
  { id: 14, name: "Ahu\xEDzotl", description: "Bestia de los lagos. Si es de noche al ser invocado, destruye al monstruo rival m\xE1s d\xE9bil.", type: "monster", attribute: "agua", tags: ["bestia", "agua", "muerte"], atk: 2e3, def: 1500, rarity: "SR", effects: [{ trigger: "onSummon", conditions: [{ type: "isNight" }], actions: [{ type: "destroy", target: "lowestAtkEnemy" }] }] },
  { id: 15, name: "Serpiente de plumas", description: "Serpiente cubierta de plumas de quetzal.", type: "monster", attribute: "viento", tags: ["serpiente", "ave", "viento"], atk: 1600, def: 1200, rarity: "R" },
  { id: 16, name: "Tecolote del Mictl\xE1n", description: "Su canto anuncia la muerte. Al ser destruido, hace 500 de da\xF1o al rival.", type: "monster", attribute: "viento", tags: ["ave", "muerte"], atk: 1300, def: 900, rarity: "R", effects: [{ trigger: "onDestroyed", actions: [{ type: "damage", amount: 500, who: "opponent" }] }] },
  { id: 17, name: "Guerrero del Mictl\xE1n", description: "Guerrero ca\xEDdo que regres\xF3 del inframundo. De noche tiene +500 ATK.", type: "monster", attribute: "tierra", tags: ["guerrero", "muerte"], atk: 2100, def: 1600, rarity: "SR", effects: [{ trigger: "continuous", conditions: [{ type: "isNight" }], actions: [{ type: "modifyAtk", amount: 500, target: "self" }] }] },
  { id: 18, name: "Temazcal", description: "Ba\xF1o de vapor sagrado. Recuperas 1000 PV.", type: "spell", attribute: "agua", tags: [], atk: 0, def: 0, rarity: "N", effects: [{ trigger: "onActivate", actions: [{ type: "heal", amount: 1e3 }] }] },
  { id: 19, name: "Juego de pelota", description: "Tlachtli. Tus monstruos ganan +400 ATK hasta el final del turno.", type: "spell", attribute: "sol", tags: [], atk: 0, def: 0, rarity: "R", effects: [{ trigger: "onActivate", actions: [{ type: "modifyAtk", amount: 400, target: "allAllies", untilEndOfTurn: true }] }] },
  { id: 20, name: "Lluvia de obsidiana", description: "Hace 800 de da\xF1o al rival.", type: "spell", attribute: "tierra", tags: [], atk: 0, def: 0, rarity: "R", effects: [{ trigger: "onActivate", actions: [{ type: "damage", amount: 800, who: "opponent" }] }] },
  { id: 21, name: "Chimalli", description: "Escudo de guerra. El monstruo equipado gana +600 DEF.", type: "equip", attribute: "tierra", tags: [], atk: 0, def: 0, rarity: "N", effects: [{ trigger: "onActivate", actions: [{ type: "modifyDef", amount: 600, target: "equipTarget" }] }] },
  { id: 22, name: "Macuahuitl de obsidiana", description: "El monstruo equipado gana +500 ATK.", type: "equip", attribute: "tierra", tags: [], atk: 0, def: 0, rarity: "R", effects: [{ trigger: "onActivate", actions: [{ type: "modifyAtk", amount: 500, target: "equipTarget" }] }] },
  { id: 23, name: "Fosa de estacas", description: "Trampa. Cuando el rival ataca, destruye al monstruo atacante.", type: "trap", attribute: "tierra", tags: [], atk: 0, def: 0, rarity: "SR", effects: [{ trigger: "onOpponentAttack", actions: [{ type: "destroy", target: "attacker" }] }] },
  { id: 24, name: "Niebla de Tl\xE1loc", description: "Trampa. Cuando el rival ataca, la niebla detiene el ataque.", type: "trap", attribute: "agua", tags: [], atk: 0, def: 0, rarity: "R", effects: [{ trigger: "onOpponentAttack", actions: [{ type: "negateAttack" }] }] },
  { id: 25, name: "Espejo humeante", description: "Trampa de Tezcatlipoca. Cuando el rival ataca, el atacante pierde 800 ATK este turno.", type: "trap", attribute: "viento", tags: [], atk: 0, def: 0, rarity: "SR", effects: [{ trigger: "onOpponentAttack", actions: [{ type: "modifyAtk", amount: -800, target: "attacker", untilEndOfTurn: true }] }] },
  { id: 26, name: "Tlacuache ladr\xF3n", description: "Rob\xF3 el fuego a los dioses y lo trajo a los hombres.", type: "monster", attribute: "tierra", tags: ["bestia"], atk: 400, def: 300, rarity: "N" },
  { id: 27, name: "Ajolote del lago", description: "X\xF3lotl escondido en las aguas de Xochimilco.", type: "monster", attribute: "agua", tags: ["agua", "bestia"], atk: 300, def: 500, rarity: "N" },
  { id: 28, name: "Chapul\xEDn de Chapultepec", description: "Salta entre los ahuehuetes del cerro.", type: "monster", attribute: "tierra", tags: ["bestia"], atk: 500, def: 200, rarity: "N" },
  { id: 29, name: "Guacamaya roja", description: "Sus plumas se ofrecen al sol.", type: "monster", attribute: "sol", tags: ["ave", "sol"], atk: 700, def: 500, rarity: "N" },
  { id: 30, name: "Tortuga de r\xEDo", description: "Lenta pero dif\xEDcil de romper.", type: "monster", attribute: "agua", tags: ["agua", "bestia"], atk: 600, def: 1100, rarity: "N" },
  { id: 31, name: "Venado sagrado", description: "Animal del sol y de la cacer\xEDa.", type: "monster", attribute: "tierra", tags: ["bestia", "sol"], atk: 900, def: 700, rarity: "N" },
  { id: 32, name: "Pescador de Texcoco", description: "Defiende su canoa con lanza y red.", type: "monster", attribute: "agua", tags: ["guerrero", "agua"], atk: 700, def: 600, rarity: "N" },
  { id: 33, name: "Aprendiz de tlacuilo", description: "Pinta c\xF3dices; conoce los nombres de los dioses.", type: "monster", attribute: "viento", tags: ["viento"], atk: 600, def: 800, rarity: "N" },
  { id: 34, name: "Murci\xE9lago de Tzinacan", description: "Vuela en la casa de los murci\xE9lagos del inframundo.", type: "monster", attribute: "viento", tags: ["ave", "muerte"], atk: 800, def: 600, rarity: "N" },
  { id: 35, name: "Coyote astuto", description: "Nunca cae en la misma trampa dos veces.", type: "monster", attribute: "tierra", tags: ["bestia"], atk: 1e3, def: 700, rarity: "N" },
  { id: 36, name: "Halc\xF3n mensajero", description: "Lleva noticias de una ciudad a otra.", type: "monster", attribute: "viento", tags: ["ave", "viento"], atk: 900, def: 600, rarity: "N" },
  { id: 37, name: "Lagartija de obsidiana", description: "Su piel brilla como vidrio volc\xE1nico.", type: "monster", attribute: "tierra", tags: ["serpiente", "fuego"], atk: 600, def: 500, rarity: "N" },
  { id: 38, name: "Guerrero cuext\xE9catl", description: "Guerrero huasteco de gorro c\xF3nico.", type: "monster", attribute: "tierra", tags: ["guerrero"], atk: 1100, def: 900, rarity: "N" },
  { id: 39, name: "Arquero chichimeca", description: "Cazador del norte; no falla un tiro.", type: "monster", attribute: "viento", tags: ["guerrero", "viento"], atk: 1200, def: 800, rarity: "R" },
  { id: 40, name: "Guerrero coyote", description: "Viste la piel del coyote en batalla.", type: "monster", attribute: "tierra", tags: ["guerrero", "bestia"], atk: 1400, def: 1100, rarity: "R" },
  { id: 41, name: "Serpiente de cascabel", description: "Avisa antes de morder.", type: "monster", attribute: "tierra", tags: ["serpiente", "muerte"], atk: 1300, def: 900, rarity: "R" },
  { id: 42, name: "\xC1guila real", description: "La que se pos\xF3 sobre el nopal.", type: "monster", attribute: "sol", tags: ["ave", "sol"], atk: 1500, def: 1e3, rarity: "R" },
  { id: 43, name: "Jaguar negro", description: "Sombra de la selva, animal de Tezcatlipoca.", type: "monster", attribute: "tierra", tags: ["jaguar", "bestia", "muerte"], atk: 1600, def: 1200, rarity: "R" },
  { id: 44, name: "Sacerdotisa de la luna", description: "Cuenta los d\xEDas del calendario lunar.", type: "monster", attribute: "agua", tags: ["agua"], atk: 1200, def: 1500, rarity: "R" },
  { id: 45, name: "Tlaloque de la lluvia", description: "Ayudante de Tl\xE1loc que rompe las jarras del cielo.", type: "monster", attribute: "agua", tags: ["deidad", "agua"], atk: 1500, def: 1400, rarity: "R" },
  { id: 46, name: "Capit\xE1n tequihua", description: "Veterano que captur\xF3 a cuatro enemigos.", type: "monster", attribute: "tierra", tags: ["guerrero"], atk: 1700, def: 1300, rarity: "R" },
  { id: 47, name: "Sapo de la lluvia", description: "Canta para llamar a Tl\xE1loc.", type: "monster", attribute: "agua", tags: ["agua", "bestia"], atk: 1100, def: 1300, rarity: "N" },
  { id: 48, name: "Colibr\xED de Huitzilopochtli", description: "El alma de un guerrero ca\xEDdo que volvi\xF3 como colibr\xED.", type: "monster", attribute: "sol", tags: ["ave", "sol", "guerrero"], atk: 1700, def: 900, rarity: "R" },
  { id: 49, name: "Guerrera cihuateteo", description: "Mujer guerrera que acompa\xF1a al sol al atardecer.", type: "monster", attribute: "viento", tags: ["guerrero", "muerte"], atk: 1900, def: 1500, rarity: "SR" },
  { id: 50, name: "Cent\xE9otl, se\xF1or del ma\xEDz", description: "Dios del ma\xEDz tierno que alimenta al pueblo.", type: "monster", attribute: "sol", tags: ["deidad", "sol"], atk: 2e3, def: 2200, rarity: "SR" },
  { id: 51, name: "Xochiquetzal", description: "Diosa de las flores, la belleza y el arte.", type: "monster", attribute: "viento", tags: ["deidad", "ave"], atk: 1800, def: 2400, rarity: "SR" },
  { id: 52, name: "Chalchiuhtlicue", description: "Se\xF1ora de la falda de jade, diosa de lagos y r\xEDos.", type: "monster", attribute: "agua", tags: ["deidad", "agua"], atk: 2500, def: 2300, rarity: "SR" },
  { id: 53, name: "Huehuec\xF3yotl", description: "El coyote viejo, dios de la m\xFAsica y el enga\xF1o.", type: "monster", attribute: "tierra", tags: ["deidad", "bestia"], atk: 2200, def: 1800, rarity: "SR" },
  { id: 54, name: "Mixc\xF3atl", description: "Serpiente de nubes, dios de la caza.", type: "monster", attribute: "viento", tags: ["deidad", "serpiente", "guerrero"], atk: 2300, def: 1700, rarity: "SR" },
  { id: 55, name: "X\xF3lotl", description: "Hermano de Quetzalc\xF3atl; gu\xEDa a los muertos al Mictl\xE1n.", type: "monster", attribute: "tierra", tags: ["deidad", "muerte", "bestia"], atk: 2400, def: 1600, rarity: "SR" },
  { id: 56, name: "Teccizt\xE9catl", description: "Se volvi\xF3 la luna al dudar ante la hoguera.", type: "monster", attribute: "agua", tags: ["deidad"], atk: 2200, def: 2e3, rarity: "SR" },
  { id: 57, name: "Tzitzimitl", description: "Estrella demonio que baja en los eclipses.", type: "monster", attribute: "viento", tags: ["deidad", "muerte", "viento"], atk: 2500, def: 1800, rarity: "SR" },
  { id: 58, name: "Cihuac\xF3atl", description: "Mujer serpiente; su llanto anuncia desgracias.", type: "monster", attribute: "tierra", tags: ["deidad", "serpiente", "muerte"], atk: 2400, def: 1900, rarity: "SR" },
  { id: 59, name: "Coyolxauhqui", description: "Diosa de la luna que gui\xF3 a los cuatrocientos guerreros del sur.", type: "monster", attribute: "viento", tags: ["deidad", "guerrero"], atk: 2900, def: 2100, rarity: "UR" },
  { id: 60, name: "Huitzilopochtli", description: "Colibr\xED del sur, dios de la guerra y del sol.", type: "monster", attribute: "sol", tags: ["deidad", "guerrero", "sol", "ave"], atk: 3300, def: 2600, rarity: "UR" },
  { id: 61, name: "Tezcatlipoca", description: "Espejo humeante, se\xF1or de la noche.", type: "monster", attribute: "viento", tags: ["deidad", "jaguar", "muerte"], atk: 3300, def: 2800, rarity: "UR" },
  { id: 62, name: "Xipe T\xF3tec", description: "Nuestro se\xF1or el desollado, dios de la renovaci\xF3n.", type: "monster", attribute: "tierra", tags: ["deidad", "sol"], atk: 3e3, def: 2400, rarity: "UR" },
  { id: 63, name: "Tonatiuh", description: "El Quinto Sol, que pide energ\xEDa para moverse.", type: "monster", attribute: "sol", tags: ["deidad", "sol", "fuego"], atk: 3400, def: 2900, rarity: "UR" },
  { id: 64, name: "Xiuhtecuhtli", description: "Se\xF1or del fuego y del a\xF1o.", type: "monster", attribute: "sol", tags: ["deidad", "fuego"], atk: 3100, def: 2500, rarity: "UR" },
  { id: 65, name: "Tlaltecuhtli", description: "Se\xF1ora de la tierra que devora a los muertos.", type: "monster", attribute: "tierra", tags: ["deidad", "bestia"], atk: 3e3, def: 3e3, rarity: "UR" },
  { id: 66, name: "Ofrenda de cacao", description: "Recuperas 800 PV.", type: "spell", attribute: "tierra", tags: [], atk: 0, def: 0, rarity: "N", effects: [{ trigger: "onActivate", actions: [{ type: "heal", amount: 800 }] }] },
  { id: 67, name: "Danza del venado", description: "Tus monstruos ganan +300 ATK hasta el final del turno.", type: "spell", attribute: "sol", tags: [], atk: 0, def: 0, rarity: "R", effects: [{ trigger: "onActivate", actions: [{ type: "modifyAtk", amount: 300, target: "allAllies", untilEndOfTurn: true }] }] },
  { id: 68, name: "Ceremonia del Fuego Nuevo", description: "Hace 1000 de da\xF1o al rival.", type: "spell", attribute: "sol", tags: [], atk: 0, def: 0, rarity: "SR", effects: [{ trigger: "onActivate", actions: [{ type: "damage", amount: 1e3, who: "opponent" }] }] },
  { id: 69, name: "C\xF3dice sagrado", description: "Robas 2 cartas.", type: "spell", attribute: "viento", tags: [], atk: 0, def: 0, rarity: "SR", effects: [{ trigger: "onActivate", actions: [{ type: "draw", amount: 2 }] }] },
  { id: 70, name: "Rodela de plumas", description: "El monstruo equipado gana +400 ATK.", type: "equip", attribute: "viento", tags: [], atk: 0, def: 0, rarity: "R", effects: [{ trigger: "onActivate", actions: [{ type: "modifyAtk", amount: 400, target: "equipTarget" }] }] },
  { id: 71, name: "\xC1tlatl", description: "El monstruo equipado gana +700 ATK.", type: "equip", attribute: "viento", tags: [], atk: 0, def: 0, rarity: "SR", effects: [{ trigger: "onActivate", actions: [{ type: "modifyAtk", amount: 700, target: "equipTarget" }] }] },
  { id: 72, name: "Penacho de quetzal", description: "El monstruo equipado gana +300 ATK y +300 DEF.", type: "equip", attribute: "sol", tags: [], atk: 0, def: 0, rarity: "R", effects: [{ trigger: "onActivate", actions: [{ type: "modifyAtk", amount: 300, target: "equipTarget" }, { type: "modifyDef", amount: 300, target: "equipTarget" }] }] },
  { id: 73, name: "Red de pescador", description: "Cuando el rival ataca, el atacante pierde 1000 ATK este turno.", type: "trap", attribute: "agua", tags: [], atk: 0, def: 0, rarity: "R", effects: [{ trigger: "onOpponentAttack", actions: [{ type: "modifyAtk", amount: -1e3, target: "attacker", untilEndOfTurn: true }] }] },
  { id: 74, name: "Eclipse", description: "Cuando el rival ataca, la oscuridad detiene el ataque.", type: "trap", attribute: "viento", tags: [], atk: 0, def: 0, rarity: "SR", effects: [{ trigger: "onOpponentAttack", actions: [{ type: "negateAttack" }] }] },
  { id: 75, name: "Furia de Tl\xE1loc", description: "Cuando el rival ataca, destruye a todos los monstruos rivales.", type: "trap", attribute: "agua", tags: [], atk: 0, def: 0, rarity: "UR", effects: [{ trigger: "onOpponentAttack", actions: [{ type: "destroy", target: "allEnemies" }] }] }
];

// src/data/duelists.json
var duelists_default = [
  { id: "tianguis", name: "Macehual del tianguis", title: "Mercado de Tlatelolco", level: 1, glyph: "\u2618", intro: "Un comerciante que aprendi\xF3 a pelear entre puestos de cacao y obsidiana.", deck: [1, 1, 1, 2, 2, 2, 9, 9, 9, 10, 10, 10, 11, 11, 11, 12, 12, 12, 13, 13, 13, 16, 16, 16, 3, 3, 15, 15, 18, 18, 18, 19, 19, 19, 21, 21, 21, 22, 22, 22], signature: 3, rewards: [{ card: 1, weight: 6 }, { card: 2, weight: 6 }, { card: 9, weight: 6 }, { card: 11, weight: 6 }, { card: 13, weight: 3 }, { card: 19, weight: 3 }, { card: 21, weight: 3 }, { card: 3, weight: 1 }] },
  { id: "chalchiuhtlicue", name: "Sacerdotisa de Chalchiuhtlicue", title: "Lago de Texcoco", level: 2, glyph: "\u2248", intro: "Guardiana de las aguas. Sus criaturas del lago se fortalecen con Tl\xE1loc.", deck: [10, 10, 10, 13, 13, 13, 14, 14, 6, 11, 11, 11, 1, 1, 1, 16, 16, 16, 9, 9, 9, 15, 15, 18, 18, 18, 24, 24, 24, 21, 21, 21, 20, 20, 20, 25, 25, 25, 12, 12], signature: 14, rewards: [{ card: 10, weight: 6 }, { card: 13, weight: 6 }, { card: 18, weight: 6 }, { card: 24, weight: 6 }, { card: 14, weight: 3 }, { card: 6, weight: 1 }] },
  { id: "jaguar", name: "Capit\xE1n Jaguar", title: "Casa de los guerreros", level: 2, glyph: "\u2694", intro: "L\xEDder de la orden jaguar. De noche sus guerreros son m\xE1s peligrosos.", deck: [2, 2, 2, 1, 1, 1, 3, 3, 3, 4, 4, 9, 9, 9, 16, 16, 16, 17, 17, 11, 11, 11, 22, 22, 22, 21, 21, 21, 19, 19, 19, 23, 23, 23, 20, 20, 20, 13, 13, 13], signature: 17, rewards: [{ card: 2, weight: 6 }, { card: 1, weight: 6 }, { card: 22, weight: 6 }, { card: 23, weight: 6 }, { card: 3, weight: 3 }, { card: 4, weight: 3 }, { card: 17, weight: 1 }] },
  { id: "xiuhtecuhtli", name: "Sacerdote de Xiuhtecuhtli", title: "Templo del fuego", level: 3, glyph: "\u2739", intro: "Se\xF1or del fuego nuevo. Quema con serpientes de fuego y lluvia de obsidiana.", deck: [12, 12, 12, 10, 10, 10, 5, 5, 15, 15, 15, 9, 9, 9, 4, 4, 2, 2, 2, 13, 13, 13, 20, 20, 20, 19, 19, 19, 23, 23, 23, 25, 25, 25, 18, 18, 18, 22, 22, 22], signature: 5, rewards: [{ card: 12, weight: 6 }, { card: 20, weight: 6 }, { card: 25, weight: 6 }, { card: 15, weight: 3 }, { card: 5, weight: 1 }] },
  { id: "mictlantecuhtli", name: "Mictlantecuhtli", title: "Se\xF1or del Mictl\xE1n", level: 3, glyph: "\u2620", intro: "El se\xF1or de los muertos. Lo que destruyes, \xE9l lo trae de regreso.", deck: [11, 11, 11, 16, 16, 16, 17, 17, 17, 14, 14, 14, 7, 7, 13, 13, 13, 2, 2, 2, 1, 1, 1, 10, 10, 10, 24, 24, 24, 23, 23, 23, 25, 25, 25, 20, 20, 20, 21, 21], signature: 7, rewards: [{ card: 16, weight: 6 }, { card: 25, weight: 6 }, { card: 24, weight: 6 }, { card: 17, weight: 3 }, { card: 14, weight: 3 }, { card: 7, weight: 1 }, { card: 8, weight: 1 }] }
];

// src/data/fusions.json
var fusions_default = {
  notes: "Recetas: carta A + carta B = carta exacta (se revisan primero). Reglas: etiqueta + etiqueta = la carta m\xE1s d\xE9bil con TODAS las etiquetas de 'result' cuyo ATK supere a ambos materiales. Las reglas se prueban en orden; si una no tiene resultado v\xE1lido, se prueba la siguiente.",
  recipeOnly: [
    8,
    59,
    60,
    61,
    62,
    63,
    64,
    65
  ],
  recipes: [
    {
      a: 15,
      b: 4,
      result: 8
    },
    {
      a: 48,
      b: 42,
      result: 60
    },
    {
      a: 43,
      b: 34,
      result: 61
    },
    {
      a: 50,
      b: 31,
      result: 62
    },
    {
      a: 42,
      b: 12,
      result: 64
    },
    {
      a: 64,
      b: 60,
      result: 63
    },
    {
      a: 13,
      b: 55,
      result: 65
    },
    {
      a: 49,
      b: 56,
      result: 59
    }
  ],
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
      a: "bestia",
      b: "agua",
      result: [
        "bestia",
        "agua"
      ]
    },
    {
      a: "agua",
      b: "muerte",
      result: [
        "agua",
        "muerte"
      ]
    },
    {
      a: "ave",
      b: "muerte",
      result: [
        "ave",
        "muerte"
      ]
    }
  ]
};

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
  "viento"
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
  "onOpponentAttack"
  // trampas: cuando el rival declara un ataque contra ti
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
  "attacker"
];
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
      this.byId.set(raw.id, Object.freeze({ ...raw, tags: Object.freeze([...raw.tags]), effects: raw.effects ? Object.freeze([...raw.effects]) : void 0 }));
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
  const actionTypes = ["modifyAtk", "modifyDef", "damage", "heal", "draw", "destroy", "revive", "negateAttack"];
  const conditionTypes = ["isNight", "isDay", "lifeBelow", "hasTagOnField", "opponentHasMoreMonsters"];
  for (const e of c.effects ?? []) {
    if (!EFFECT_TRIGGERS.includes(e.trigger)) p.push(`efecto con trigger desconocido "${e.trigger}"`);
    if (!Array.isArray(e.actions) || e.actions.length === 0) p.push("efecto sin acciones");
    for (const cond of e.conditions ?? []) if (!conditionTypes.includes(cond.type)) p.push(`condici\xF3n desconocida "${cond.type}"`);
    for (const a of e.actions ?? []) {
      if (!actionTypes.includes(a.type)) p.push(`acci\xF3n desconocida "${a.type}"`);
      if ("target" in a && !EFFECT_TARGETS.includes(a.target)) p.push(`objetivo desconocido "${a.target}"`);
      if ("tag" in a && a.tag && !CARD_TAGS.includes(a.tag)) p.push(`etiqueta desconocida "${a.tag}" en un efecto`);
    }
    if (e.trigger === "onActivate" && c.type === "monster") p.push("un monstruo no puede tener efecto onActivate");
  }
  if ((c.type === "spell" || c.type === "equip") && !(c.effects ?? []).some((e) => e.trigger === "onActivate")) {
    p.push("las m\xE1gicas y equipos necesitan un efecto onActivate");
  }
  if (c.type === "trap" && !(c.effects ?? []).some((e) => e.trigger === "onOpponentAttack")) {
    p.push("las trampas necesitan un efecto onOpponentAttack");
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
  /** Problemas encontrados (solo se llenan con strict = false; con strict = true lanzan error). */
  problems = [];
  /** Avisos que no impiden jugar (por ejemplo, una receta que da una carta más débil). */
  warnings = [];
  constructor(data, db, strict = true) {
    const problems = this.problems;
    const recipeOnly = new Set(data.recipeOnly ?? []);
    for (const r of data.recipes) {
      const [a, b, res] = [db.tryGet(r.a), db.tryGet(r.b), db.tryGet(r.result)];
      if (!a || !b || !res) {
        problems.push(`receta ${r.a}+${r.b}=${r.result}: id inexistente`);
        continue;
      }
      if (res.atk <= a.atk || res.atk <= b.atk) this.warnings.push(`Receta ${a.name} + ${b.name} = ${res.name}: el resultado no es m\xE1s fuerte que los materiales.`);
      const key = pairKey(r.a, r.b);
      if (this.recipes.has(key)) problems.push(`receta repetida ${key}`);
      this.recipes.set(key, res);
    }
    for (const r of data.rules) {
      for (const t of [r.a, r.b, ...r.result]) {
        if (!CARD_TAGS.includes(t)) problems.push(`regla ${r.a}+${r.b}: etiqueta desconocida "${t}"`);
      }
      const candidates = db.all().filter((c) => c.type === "monster" && !recipeOnly.has(c.id) && r.result.every((t) => c.tags.includes(t))).sort((x, y) => x.atk - y.atk);
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
      const matches = a.tags.includes(rule.a) && b.tags.includes(rule.b) || a.tags.includes(rule.b) && b.tags.includes(rule.a);
      if (!matches) continue;
      const result = rule.candidates.find((c) => c.atk > a.atk && c.atk > b.atk);
      if (result) found.set(result.id, result);
    }
    return [...found.values()].sort((x, y) => y.atk - x.atk);
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
var cardDb = new CardDatabase(cards_default);
var fusionDb = new FusionDatabase(fusions_default, cardDb);
var DATA_VERSION = fnv1a(JSON.stringify(cards_default) + JSON.stringify(fusions_default) + JSON.stringify(duelists_default));
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
var duelists = duelists_default;
function getDuelist(id) {
  return duelists.find((d) => d.id === id);
}
function isUnlocked(id, defeated) {
  const i = duelists.findIndex((d) => d.id === id);
  if (i <= 0) return i === 0;
  return defeated.includes(duelists[i - 1].id);
}

// src/game/economy.ts
var WIN_CACAO = { 1: 20, 2: 35, 3: 50 };

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
  modifiers = [];
  constructor(instanceId, owner, def) {
    this.instanceId = instanceId;
    this.owner = owner;
    this.def = def;
  }
  get atk() {
    return Math.max(0, this.modifiers.reduce((sum, m) => sum + m.atk, this.def.atk));
  }
  get defense() {
    return Math.max(0, this.modifiers.reduce((sum, m) => sum + m.def, this.def.def));
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
  }
  clearEndOfTurnModifiers() {
    this.modifiers = this.modifiers.filter((m) => !m.untilEndOfTurn);
  }
  /** Al salir del campo pierde buffs y estado de batalla. */
  resetForZoneChange() {
    this.modifiers = [];
    this.fieldSlot = -1;
    this.faceDown = false;
    this.hasAttackedThisTurn = false;
    this.positionChangedThisTurn = false;
    this.summonedThisTurn = false;
    this.position = "attack";
  }
  toString() {
    return `#${this.instanceId} ${this.def.name} ${this.atk}/${this.defense} [${this.zone}]`;
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

// src/core/DuelState.ts
var FIELD_SLOTS = 5;
var opponentOf = (p) => p === 0 ? 1 : 0;
var isNightTurn = (turn) => Math.floor((turn - 1) / 2) % 2 === 1;

// src/core/DuelEngine.ts
var FIRST_TURN_CAN_ATTACK = false;
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
  constructor(opts) {
    this.db = opts.db;
    this.fusion = opts.fusion ?? noFusions;
    const rng = createRng(opts.seed);
    const makePlayer = (p) => {
      const deck = buildShuffledDeck(opts.decks[p], p, this.db, this.ids, rng);
      deck.forEach((c) => this.cards.set(c.instanceId, c));
      return { life: START_LIFE, deck, hand: [], field: Array(FIELD_SLOTS).fill(null), support: Array(FIELD_SLOTS).fill(null), mictlan: [] };
    };
    this.state = {
      players: [makePlayer(0), makePlayer(1)],
      turnPlayer: opts.firstPlayer ?? 0,
      turn: 1,
      phase: "main",
      supportUsedThisTurn: false,
      monsterPlayedThisTurn: false,
      winner: null
    };
  }
  /** Reparte las manos y empieza el turno 1. */
  start() {
    if (this.started) return [];
    this.started = true;
    const events = [];
    for (const p of [0, 1]) this.refillHand(p, events);
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
    for (const id of intent.handIds) {
      const card = me.hand.find((c) => c.instanceId === id);
      if (!card) return "Esa carta no est\xE1 en tu mano";
      if (card.def.type !== "monster") return "Las m\xE1gicas, equipos y trampas van en tu fila de apoyo, no en la cadena de fusi\xF3n";
      fromHand.push(card);
    }
    const occupant = me.field[intent.slot];
    const chain = occupant ? [occupant, ...fromHand] : fromHand;
    const plan = planChain(this.fusion, chain.map((c) => c.def), intent.fusionChoices ?? []);
    if (!plan.ok) return plan.error;
    s.monsterPlayedThisTurn = true;
    me.hand = me.hand.filter((c) => !fromHand.includes(c));
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
    current.faceDown = !fused && current !== occupant && (intent.faceDown ?? false);
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
    if (!current.faceDown) {
      if (fused) this.runEffects(current, "onFusionSummon", events);
      this.runEffects(current, "onSummon", events);
    }
    return null;
  }
  // ---------------------------------------------------------------- mágicas y equipos
  activate(intent, events) {
    const s = this.state;
    const me = s.players[intent.player];
    if (s.phase !== "main") return "Solo puedes usar m\xE1gicas y trampas en la fase principal";
    if (s.monsterPlayedThisTurn) return "Despu\xE9s de bajar un monstruo ya no puedes usar m\xE1gicas ni trampas";
    if (s.supportUsedThisTurn) return "Ya usaste una m\xE1gica o trampa este turno";
    const card = me.hand.find((c) => c.instanceId === intent.handId);
    if (!card) return "Esa carta no est\xE1 en tu mano";
    if (!isSupportCard(card.def)) return "Los monstruos se invocan en tus zonas de monstruo";
    if (card.def.type === "trap") {
      const slot = intent.slot ?? me.support.findIndex((c) => c === null);
      if (!Number.isInteger(slot) || slot < 0 || slot >= FIELD_SLOTS) return "No tienes zonas de apoyo libres";
      if (me.support[slot]) return "Esa zona ya tiene una trampa";
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
    if (card.hasAttackedThisTurn) return "Un monstruo que ya atac\xF3 no puede cambiar de posici\xF3n";
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
    const attacker = me.field.find((c) => c?.instanceId === intent.attackerId);
    if (!attacker) return "Ese monstruo no est\xE1 en tu campo";
    if (attacker.position !== "attack") return "Solo atacan los monstruos en posici\xF3n de ataque";
    if (attacker.hasAttackedThisTurn) return "Ese monstruo ya atac\xF3 este turno";
    const foeMonsters = foe.field.filter((c) => c !== null);
    let target = null;
    if (intent.targetId === null) {
      if (foeMonsters.length > 0) return "No puedes atacar directo si el rival tiene monstruos";
    } else {
      target = foeMonsters.find((c) => c.instanceId === intent.targetId) ?? null;
      if (!target) return "Ese objetivo no est\xE1 en el campo rival";
    }
    if (s.phase !== "battle") {
      s.phase = "battle";
      events.push({ type: "phaseChanged", phase: "battle" });
    }
    attacker.hasAttackedThisTurn = true;
    events.push({ type: "attackDeclared", attackerId: attacker.instanceId, targetId: target?.instanceId ?? null });
    if (attacker.faceDown) {
      attacker.faceDown = false;
      events.push({ type: "flipped", instanceId: attacker.instanceId });
    }
    this.attackNegated = false;
    for (const trap of foe.support) {
      if (!trap || !(trap.def.effects ?? []).some((e) => e.trigger === "onOpponentAttack" && this.conditionsMet(trap, e.conditions ?? []))) continue;
      foe.support[foe.support.indexOf(trap)] = null;
      trap.faceDown = false;
      events.push({ type: "trapActivated", player: foePlayer, instanceId: trap.instanceId, attackerId: attacker.instanceId });
      this.runEffects(trap, "onOpponentAttack", events, { attacker });
      this.sendToMictlan(trap, "used", events);
      break;
    }
    if (this.attackNegated) {
      events.push({ type: "attackNegated", attackerId: attacker.instanceId });
      return null;
    }
    if (s.winner !== null || attacker.zone !== "field") return null;
    this.runEffects(attacker, "onAttack", events);
    this.recomputeAuras();
    if (s.winner !== null || attacker.zone !== "field") return null;
    if (target && target.zone !== "field") return null;
    if (!target) {
      this.damage(foePlayer, attacker.atk, events);
      return null;
    }
    if (target.faceDown) {
      target.faceDown = false;
      events.push({ type: "flipped", instanceId: target.instanceId });
      this.recomputeAuras();
    }
    if (target.position === "attack") {
      const diff = attacker.atk - target.atk;
      if (diff > 0) {
        this.destroy(target, events);
        this.damage(foePlayer, diff, events);
      } else if (diff < 0) {
        this.destroy(attacker, events);
        this.damage(intent.player, -diff, events);
      } else {
        this.destroy(attacker, events);
        this.destroy(target, events);
      }
    } else {
      const diff = attacker.atk - target.defense;
      if (diff > 0) this.destroy(target, events);
      else if (diff < 0) this.damage(intent.player, -diff, events);
    }
    return null;
  }
  // ---------------------------------------------------------------- turnos
  endTurn(events) {
    const s = this.state;
    const wasNight = isNightTurn(s.turn);
    for (const p of s.players) {
      for (const c of p.field) {
        if (!c) continue;
        c.clearEndOfTurnModifiers();
        c.hasAttackedThisTurn = false;
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
    if (isNightTurn(s.turn) !== wasNight) events.push({ type: "timeChanged", night: isNightTurn(s.turn) });
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
    const owner = this.state.players[card.owner];
    const slot = owner.field.indexOf(card);
    if (slot >= 0) owner.field[slot] = null;
    const wasFaceUp = !card.faceDown;
    this.sendToMictlan(card, reason, events);
    if (wasFaceUp) this.runEffects(card, "onDestroyed", events);
  }
  sendToMictlan(card, reason, events) {
    card.resetForZoneChange();
    card.zone = "mictlan";
    this.state.players[card.owner].mictlan.push(card);
    events.push({ type: "sentToMictlan", instanceId: card.instanceId, reason });
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
    const mine = this.state.players[card.owner].field.filter((c) => c !== null);
    const theirs = this.state.players[opponentOf(card.owner)].field.filter((c) => c !== null);
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
    }
  }
  runAction(card, a, events, ctx) {
    const owner = card.owner;
    const me = this.state.players[owner];
    switch (a.type) {
      case "modifyAtk":
      case "modifyDef": {
        for (const t of this.resolveTargets(card, a.target, a.tag, ctx)) {
          t.addModifier({
            atk: a.type === "modifyAtk" ? a.amount : 0,
            def: a.type === "modifyDef" ? a.amount : 0,
            sourceId: card.instanceId,
            untilEndOfTurn: a.untilEndOfTurn ?? false
          });
          events.push({ type: "statChanged", instanceId: t.instanceId, atk: t.atk, def: t.defense });
        }
        return;
      }
      case "damage":
        this.damage(a.who === "self" ? owner : opponentOf(owner), a.amount, events);
        return;
      case "heal":
        me.life += a.amount;
        events.push({ type: "healed", player: owner, amount: a.amount, lifeAfter: me.life });
        return;
      case "draw": {
        const drawn = me.deck.splice(0, Math.max(0, a.amount));
        for (const c of drawn) {
          c.zone = "hand";
          me.hand.push(c);
        }
        if (drawn.length) events.push({ type: "cardsDrawn", player: owner, instanceIds: drawn.map((c) => c.instanceId) });
        return;
      }
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
    }
  }
  /** Recalcula los efectos continuos (auras) de todo el campo. Se llama después de cada cambio. */
  recomputeAuras() {
    const field = this.state.players.flatMap((p) => p.field).filter((c) => c !== null);
    field.forEach((c) => c.clearAuraModifiers());
    for (const source of field) {
      if (source.faceDown) continue;
      for (const effect of source.def.effects ?? []) {
        if (effect.trigger !== "continuous" || !this.conditionsMet(source, effect.conditions ?? [])) continue;
        for (const a of effect.actions) {
          if (a.type !== "modifyAtk" && a.type !== "modifyDef") continue;
          for (const t of this.resolveTargets(source, a.target, a.tag)) {
            t.addModifier({
              atk: a.type === "modifyAtk" ? a.amount : 0,
              def: a.type === "modifyDef" ? a.amount : 0,
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
  const canAttackThisTurn = state.turn > 1 || FIRST_TURN_CAN_ATTACK;
  if (canAttackThisTurn) {
    const attackers = mine.field.filter((c) => c !== null && c.position === "attack" && !c.hasAttackedThisTurn).sort((a, b) => b.atk - a.atk);
    for (const attacker of attackers) {
      if (foeMonsters.length === 0) {
        return { type: "attack", player: me, attackerId: attacker.instanceId, targetId: null };
      }
      const target = pickTarget(attacker, foeMonsters);
      if (target) return { type: "attack", player: me, attackerId: attacker.instanceId, targetId: target.instanceId };
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
  const dmg = find("damage");
  if (dmg) return activate(dmg);
  const heal = find("heal");
  if (heal && mine.life < 6e3) return activate(heal);
  const buff = find("buff");
  if (buff && canAttack && myMonsters.some((c) => c.position === "attack")) return activate(buff);
  if (!hasMonsterPlay) {
    const any = cards.find((c) => spellKind(c) !== "equip" && (spellKind(c) !== "trap" || mine.support.some((z) => z === null))) ?? (strongest ? equip : void 0);
    if (any) return activate(any, spellKind(any) === "equip" ? strongest?.instanceId : void 0);
  }
  return null;
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
function createDuel(seed, playerDeck, opponent, db, fusion) {
  return new DuelEngine({ db, decks: [playerDeck, opponent.deck], seed, firstPlayer: HUMAN, fusion });
}
function replayDuel(input, db, fusion) {
  const engine = createDuel(input.seed, input.playerDeck, input.opponent, db, fusion);
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
  const result = replayDuel({ seed: input.seed, playerDeck: input.deck, opponent: duelist, intents: input.intents }, cardDb, fusionDb);
  if (!result.ok) return result;
  if (result.winner === null) return { ok: false, error: "El duelo no termin\xF3" };
  return { ok: true, value: { won: result.winner === 0, turns: result.turns } };
}
function planRewards(duelistId, seed, firstWin) {
  const duelist = getDuelist(duelistId);
  if (!duelist) return { cacao: 0, jade: 0, cards: [] };
  const cards = rollRewards(duelist, firstWin, createRng((seed ^ 2654435769) >>> 0));
  return {
    cacao: WIN_CACAO[duelist.level],
    jade: 0,
    cards: cards.map((id) => ({ id, ...DUPLICATE_VALUE[rarityOf(cardDb.get(id))] }))
  };
}
export {
  DATA_VERSION,
  MAX_INTENTS,
  checkDuelStart,
  newSeed,
  planRewards,
  verifyDuel
};
