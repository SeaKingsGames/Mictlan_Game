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
  { id: 1, name: "Ocelote joven", description: "Cachorro de la selva, material de fusi\xF3n.", type: "monster", attribute: "tierra", tags: ["jaguar", "bestia"], atk: 800, def: 600, art: "/cards/1.webp", ascendsTo: 79 },
  { id: 2, name: "Macehual con macuahuitl", description: "Guerrero del pueblo armado con obsidiana.", type: "monster", attribute: "tierra", tags: ["guerrero"], atk: 900, def: 700, art: "/cards/2.webp", ascendsTo: 80 },
  { id: 3, name: "Guerrero Jaguar", description: "\xC9lite de la noche. M\xE1s fuerte al atacar de noche.", type: "monster", attribute: "tierra", tags: ["guerrero", "jaguar"], atk: 1800, def: 1400, art: "/cards/3.webp", effects: [{ trigger: "onAttack", conditions: [{ type: "isNight" }], actions: [{ type: "modifyAtk", amount: 300, target: "self", untilEndOfTurn: true }] }] },
  { id: 4, name: "Guerrero \xC1guila", description: "\xC9lite del sol. Al ser invocado por fusi\xF3n, roba 1 carta.", type: "monster", attribute: "sol", tags: ["guerrero", "ave", "sol"], atk: 1700, def: 1500, art: "/cards/4.webp", effects: [{ trigger: "onFusionSummon", actions: [{ type: "draw", amount: 1 }] }] },
  { id: 5, name: "Xiuhc\xF3atl", description: "Serpiente de fuego. Al ser invocada, 500 de da\xF1o al rival.", type: "monster", attribute: "sol", tags: ["serpiente", "fuego", "sol"], atk: 2200, def: 1600, art: "/cards/5.webp", effects: [{ trigger: "onSummon", actions: [{ type: "damage", amount: 500, who: "opponent" }] }] },
  { id: 6, name: "Tl\xE1loc", description: "Se\xF1or de la lluvia. Aliados de agua +500 ATK.", type: "monster", attribute: "agua", tags: ["deidad", "agua"], atk: 3e3, def: 2500, art: "/cards/6.webp", effects: [{ trigger: "continuous", actions: [{ type: "modifyAtk", amount: 300, target: "otherAlliesWithTag", tag: "agua" }] }] },
  { id: 7, name: "Mictlantecuhtli", description: "Se\xF1or del Mictl\xE1n. Al ser destruido, revive un monstruo de muerte.", type: "monster", attribute: "tierra", tags: ["deidad", "muerte"], atk: 3500, def: 2e3, art: "/cards/7.webp", effects: [{ trigger: "onDestroyed", actions: [{ type: "revive", tag: "muerte" }] }] },
  { id: 8, name: "Quetzalc\xF3atl", description: "Serpiente emplumada. Solo por fusi\xF3n espec\xEDfica. Al ser invocada aumenta 2000 tus puntos de vida.", type: "monster", attribute: "viento", tags: ["deidad", "serpiente", "ave", "viento"], atk: 3500, def: 2500, art: "/cards/8.webp", effects: [{ trigger: "onFusionSummon", actions: [{ type: "destroy", target: "highestAtkEnemy" }] }] },
  { id: 9, name: "Colibr\xED guerrero", description: "Mensajero veloz del sur.", type: "monster", attribute: "viento", tags: ["ave"], atk: 500, def: 400, art: "/cards/9.webp", effects: [{ trigger: "onSummon", actions: [{ type: "draw", amount: 1 }] }], ascendsTo: 81 },
  { id: 10, name: "Serpiente de lago", description: "Habita los canales de Tenochtitlan.", type: "monster", attribute: "agua", tags: ["serpiente", "agua"], atk: 700, def: 900, art: "/cards/10.webp" },
  { id: 11, name: "Xoloitzcuintle", description: "Gu\xEDa de las almas rumbo al Mictl\xE1n.", type: "monster", attribute: "tierra", tags: ["bestia", "muerte"], atk: 1e3, def: 800, art: "/cards/11.webp", ascendsTo: 82 },
  { id: 12, name: "Sacerdote del Fuego Nuevo", description: "Guardi\xE1n del ritual de los 52 a\xF1os.", type: "monster", attribute: "sol", tags: ["fuego"], atk: 600, def: 1200, art: "/cards/12.webp", effects: [{ trigger: "onSummon", actions: [{ type: "heal", amount: 500 }] }] },
  { id: 13, name: "Cipactli", description: "Caim\xE1n primordial de cuyo cuerpo se hizo la tierra.", type: "monster", attribute: "agua", tags: ["bestia", "agua"], atk: 1500, def: 1800, art: "/cards/13.webp" },
  { id: 14, name: "Ahu\xEDzotl", description: "Bestia de los lagos que arrastra a los pescadores al fondo.", type: "monster", attribute: "agua", tags: ["bestia", "agua", "muerte"], atk: 2e3, def: 1500, art: "/cards/14.webp", effects: [{ trigger: "onSummon", conditions: [{ type: "isNight" }], actions: [{ type: "destroy", target: "lowestAtkEnemy" }] }] },
  { id: 15, name: "Serpiente de plumas", description: "Serpiente cubierta de plumas de quetzal.", type: "monster", attribute: "viento", tags: ["serpiente", "ave", "viento"], atk: 1600, def: 1200, art: "/cards/15.webp" },
  { id: 16, name: "Tecolote del Mictl\xE1n", description: "Su canto anuncia la muerte.", type: "monster", attribute: "viento", tags: ["ave", "muerte"], atk: 1300, def: 900, art: "/cards/16.webp", effects: [{ trigger: "onDestroyed", actions: [{ type: "damage", amount: 500, who: "opponent" }] }] },
  { id: 17, name: "Guerrero del Mictl\xE1n", description: "Guerrero ca\xEDdo que regres\xF3 del inframundo.", type: "monster", attribute: "tierra", tags: ["guerrero", "muerte"], atk: 2100, def: 1600, art: "/cards/17.webp", effects: [{ trigger: "continuous", conditions: [{ type: "isNight" }], actions: [{ type: "modifyAtk", amount: 500, target: "self" }] }] },
  { id: 18, name: "Temazcal", description: "Ba\xF1o de vapor sagrado. Recuperas 1000 PV.", type: "spell", attribute: "agua", tags: [], atk: 0, def: 0, art: "/cards/18.webp", effects: [{ trigger: "onActivate", actions: [{ type: "heal", amount: 1e3 }] }] },
  { id: 19, name: "Juego de pelota", description: "Tlachtli. Tus monstruos ganan +400 ATK hasta el final del turno.", type: "spell", attribute: "sol", tags: [], atk: 0, def: 0, art: "/cards/19.webp", effects: [{ trigger: "onActivate", actions: [{ type: "modifyAtk", amount: 400, target: "allAllies", untilEndOfTurn: true }] }] },
  { id: 20, name: "Lluvia de obsidiana", description: "Hace 800 de da\xF1o al rival.", type: "spell", attribute: "tierra", tags: [], atk: 0, def: 0, art: "/cards/20.webp", effects: [{ trigger: "onActivate", actions: [{ type: "damage", amount: 800, who: "opponent" }] }] },
  { id: 21, name: "Chimalli", description: "Escudo de guerra. El monstruo equipado gana +600 DEF.", type: "equip", attribute: "tierra", tags: [], atk: 0, def: 0, art: "/cards/21.webp", effects: [{ trigger: "onActivate", actions: [{ type: "modifyDef", amount: 600, target: "equipTarget" }] }] },
  { id: 22, name: "Macuahuitl de obsidiana", description: "El monstruo equipado gana +500 ATK.", type: "equip", attribute: "tierra", tags: [], atk: 0, def: 0, art: "/cards/22.webp", effects: [{ trigger: "onActivate", actions: [{ type: "modifyAtk", amount: 500, target: "equipTarget" }] }] },
  { id: 23, name: "Fosa de estacas", description: "Trampa. Cuando el rival ataca, destruye al monstruo atacante.", type: "trap", attribute: "tierra", tags: [], atk: 0, def: 0, art: "/cards/23.webp", effects: [{ trigger: "onOpponentAttack", actions: [{ type: "destroy", target: "attacker" }] }] },
  { id: 24, name: "Niebla de Tl\xE1loc", description: "Trampa. Cuando el rival ataca, la niebla detiene el ataque.", type: "trap", attribute: "agua", tags: [], atk: 0, def: 0, art: "/cards/24.webp", effects: [{ trigger: "onOpponentAttack", actions: [{ type: "negateAttack" }] }] },
  { id: 25, name: "Espejo humeante", description: "Trampa de Tezcatlipoca. Cuando el rival ataca, el atacante pierde 800 ATK este turno.", type: "trap", attribute: "viento", tags: [], atk: 0, def: 0, art: "/cards/25.webp", effects: [{ trigger: "onOpponentAttack", actions: [{ type: "modifyAtk", amount: -800, target: "attacker", untilEndOfTurn: true }] }] },
  { id: 26, name: "Tlacuache ladr\xF3n", description: "Rob\xF3 el fuego a los dioses y lo trajo a los hombres.", type: "monster", attribute: "tierra", tags: ["bestia"], atk: 400, def: 300, rarity: "N", art: "/cards/26.webp" },
  { id: 27, name: "Ajolote del lago", description: "X\xF3lotl escondido en las aguas de Xochimilco.", type: "monster", attribute: "agua", tags: ["agua", "bestia"], atk: 300, def: 500, rarity: "N", art: "/cards/27.webp" },
  { id: 28, name: "Chapul\xEDn de Chapultepec", description: "Salta entre los ahuehuetes del cerro.", type: "monster", attribute: "tierra", tags: ["bestia"], atk: 500, def: 200, rarity: "N", art: "/cards/28.webp" },
  { id: 29, name: "Guacamaya roja", description: "Sus plumas se ofrecen al sol.", type: "monster", attribute: "sol", tags: ["ave", "sol"], atk: 700, def: 500, rarity: "N", art: "/cards/29.webp" },
  { id: 30, name: "Tortuga de r\xEDo", description: "Lenta pero dif\xEDcil de romper.", type: "monster", attribute: "agua", tags: ["agua", "bestia"], atk: 600, def: 1500, rarity: "N", art: "/cards/30.webp" },
  { id: 31, name: "Venado sagrado", description: "Animal del sol y de la cacer\xEDa.", type: "monster", attribute: "tierra", tags: ["bestia", "sol"], atk: 900, def: 700, rarity: "N", art: "/cards/31.webp" },
  { id: 32, name: "Pescador de Texcoco", description: "Defiende su canoa con lanza y red.", type: "monster", attribute: "agua", tags: ["guerrero", "agua"], atk: 700, def: 600, rarity: "N", art: "/cards/32.webp" },
  { id: 33, name: "Aprendiz de tlacuilo", description: "Pinta c\xF3dices; conoce los nombres de los dioses.", type: "monster", attribute: "viento", tags: ["viento"], atk: 600, def: 800, rarity: "N", art: "/cards/33.webp" },
  { id: 34, name: "Murci\xE9lago de Tzinacan", description: "Vuela en la casa de los murci\xE9lagos del inframundo.", type: "monster", attribute: "viento", tags: ["ave", "muerte"], atk: 800, def: 600, rarity: "N", art: "/cards/34.webp" },
  { id: 35, name: "Coyote astuto", description: "Nunca cae en la misma trampa dos veces.", type: "monster", attribute: "tierra", tags: ["bestia"], atk: 1e3, def: 700, rarity: "N", art: "/cards/35.webp" },
  { id: 36, name: "Halc\xF3n mensajero", description: "Lleva noticias de una ciudad a otra.", type: "monster", attribute: "viento", tags: ["ave", "viento"], atk: 900, def: 600, rarity: "N", art: "/cards/36.webp" },
  { id: 37, name: "Lagartija de obsidiana", description: "Su piel brilla como vidrio volc\xE1nico.", type: "monster", attribute: "tierra", tags: ["serpiente", "fuego"], atk: 600, def: 500, rarity: "N", art: "/cards/37.webp" },
  { id: 38, name: "Guerrero cuext\xE9catl", description: "Guerrero huasteco de gorro c\xF3nico.", type: "monster", attribute: "tierra", tags: ["guerrero"], atk: 1100, def: 900, rarity: "N", art: "/cards/38.webp" },
  { id: 39, name: "Arquero chichimeca", description: "Cazador del norte; no falla un tiro.", type: "monster", attribute: "viento", tags: ["guerrero", "viento"], atk: 1200, def: 800, rarity: "R", art: "/cards/39.webp" },
  { id: 40, name: "Guerrero coyote", description: "Viste la piel del coyote en batalla.", type: "monster", attribute: "tierra", tags: ["guerrero", "bestia"], atk: 1400, def: 1100, rarity: "R", art: "/cards/40.webp" },
  { id: 41, name: "Serpiente de cascabel", description: "Avisa antes de morder.", type: "monster", attribute: "tierra", tags: ["serpiente", "muerte"], atk: 1300, def: 900, rarity: "R", art: "/cards/41.webp" },
  { id: 42, name: "\xC1guila real", description: "La que se pos\xF3 sobre el nopal.", type: "monster", attribute: "sol", tags: ["ave", "sol"], atk: 1500, def: 1e3, rarity: "R", art: "/cards/42.webp" },
  { id: 43, name: "Jaguar negro", description: "Sombra de la selva, animal de Tezcatlipoca.", type: "monster", attribute: "tierra", tags: ["jaguar", "bestia", "muerte"], atk: 1600, def: 1200, rarity: "R", art: "/cards/43.webp" },
  { id: 44, name: "Sacerdotisa de la luna", description: "Cuenta los d\xEDas del calendario lunar.", type: "monster", attribute: "agua", tags: ["agua"], atk: 1200, def: 1500, rarity: "R", art: "/cards/44.webp" },
  { id: 45, name: "Tlaloque de la lluvia", description: "Ayudante de Tl\xE1loc que rompe las jarras del cielo.", type: "monster", attribute: "agua", tags: ["deidad", "agua"], atk: 1500, def: 1400, rarity: "R", art: "/cards/45.webp" },
  { id: 46, name: "Capit\xE1n tequihua", description: "Veterano que captur\xF3 a cuatro enemigos.", type: "monster", attribute: "tierra", tags: ["guerrero"], atk: 1700, def: 1300, rarity: "R", art: "/cards/46.webp" },
  { id: 47, name: "Sapo de la lluvia", description: "Canta para llamar a Tl\xE1loc.", type: "monster", attribute: "agua", tags: ["agua", "bestia"], atk: 1100, def: 1300, rarity: "N", art: "/cards/47.webp" },
  { id: 48, name: "Colibr\xED de Huitzilopochtli", description: "El alma de un guerrero ca\xEDdo que volvi\xF3 como colibr\xED.", type: "monster", attribute: "sol", tags: ["ave", "sol", "guerrero"], atk: 1700, def: 900, rarity: "R", art: "/cards/48.webp" },
  { id: 49, name: "Guerrera cihuateteo", description: "Mujer guerrera que acompa\xF1a al sol al atardecer.", type: "monster", attribute: "viento", tags: ["guerrero", "muerte"], atk: 1900, def: 1500, rarity: "SR", art: "/cards/49.webp" },
  { id: 50, name: "Cent\xE9otl, se\xF1or del ma\xEDz", description: "Dios del ma\xEDz tierno que alimenta al pueblo.", type: "monster", attribute: "sol", tags: ["deidad", "sol"], atk: 2e3, def: 2200, rarity: "SR", art: "/cards/50.webp" },
  { id: 51, name: "Xochiquetzal", description: "Diosa de las flores, la belleza y el arte.", type: "monster", attribute: "viento", tags: ["deidad", "ave"], atk: 1800, def: 2400, rarity: "SR", art: "/cards/51.webp" },
  { id: 52, name: "Chalchiuhtlicue", description: "Se\xF1ora de la falda de jade, diosa de lagos y r\xEDos.", type: "monster", attribute: "agua", tags: ["deidad", "agua"], atk: 2500, def: 2300, rarity: "SR", art: "/cards/52.webp" },
  { id: 53, name: "Huehuec\xF3yotl", description: "El coyote viejo, dios de la m\xFAsica y el enga\xF1o.", type: "monster", attribute: "tierra", tags: ["deidad", "bestia"], atk: 2200, def: 1800, rarity: "SR", art: "/cards/53.webp" },
  { id: 54, name: "Mixc\xF3atl", description: "Serpiente de nubes, dios de la caza.", type: "monster", attribute: "viento", tags: ["deidad", "serpiente", "guerrero"], atk: 2300, def: 1700, rarity: "SR", art: "/cards/54.webp" },
  { id: 55, name: "X\xF3lotl", description: "Hermano de Quetzalc\xF3atl; gu\xEDa a los muertos al Mictl\xE1n.", type: "monster", attribute: "tierra", tags: ["deidad", "muerte", "bestia"], atk: 2400, def: 1600, rarity: "SR", art: "/cards/55.webp" },
  { id: 56, name: "Teccizt\xE9catl", description: "Se volvi\xF3 la luna al dudar ante la hoguera.", type: "monster", attribute: "agua", tags: ["deidad"], atk: 2200, def: 2e3, rarity: "SR", art: "/cards/56.webp" },
  { id: 57, name: "Tzitzimitl", description: "Estrella demonio que baja en los eclipses.", type: "monster", attribute: "viento", tags: ["deidad", "muerte", "viento"], atk: 2500, def: 1800, rarity: "SR", art: "/cards/57.webp" },
  { id: 58, name: "Cihuac\xF3atl", description: "Mujer serpiente; su llanto anuncia desgracias.", type: "monster", attribute: "tierra", tags: ["deidad", "serpiente", "muerte"], atk: 2400, def: 1900, rarity: "SR", art: "/cards/58.webp" },
  { id: 59, name: "Coyolxauhqui", description: "Diosa de la luna que gui\xF3 a los cuatrocientos guerreros del sur.\n\nEFECTO: Al atacar: destruye al monstruo rival m\xE1s d\xE9bil.", type: "monster", attribute: "viento", tags: ["deidad", "guerrero"], atk: 2900, def: 2100, rarity: "UR", art: "/cards/59.webp", effects: [{ trigger: "onAttack", actions: [{ type: "destroy", target: "lowestAtkEnemy" }] }] },
  { id: 60, name: "Huitzilopochtli", description: "Colibr\xED del sur, dios de la guerra y del sol.", type: "monster", attribute: "sol", tags: ["deidad", "guerrero", "sol", "ave"], atk: 3300, def: 2600, rarity: "UR", art: "/cards/60.webp" },
  { id: 61, name: "Tezcatlipoca", description: "Espejo humeante, se\xF1or de la noche.", type: "monster", attribute: "viento", tags: ["deidad", "jaguar", "muerte"], atk: 3300, def: 2800, rarity: "UR", art: "/cards/61.webp" },
  { id: 62, name: "Xipe T\xF3tec", description: "Nuestro se\xF1or el desollado, dios de la renovaci\xF3n.", type: "monster", attribute: "tierra", tags: ["deidad", "sol"], atk: 3e3, def: 2400, rarity: "UR", art: "/cards/62.webp" },
  { id: 63, name: "Tonatiuh", description: "El Quinto Sol, que pide energ\xEDa para moverse.", type: "monster", attribute: "sol", tags: ["deidad", "sol", "fuego"], atk: 3400, def: 2900, rarity: "UR", art: "/cards/63.webp" },
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
  { id: 75, name: "Furia de Tl\xE1loc", description: "Cuando el rival ataca, destruye a todos los monstruos rivales.", type: "trap", attribute: "agua", tags: [], atk: 0, def: 0, rarity: "UR", effects: [{ trigger: "onOpponentAttack", actions: [{ type: "destroy", target: "allEnemies" }] }] },
  { id: 76, name: "Brujo nahualli", description: "Hechicero de la sierra. Dicen que de noche camina en cuatro patas.", type: "monster", attribute: "tierra", tags: ["guerrero", "jaguar"], atk: 1200, def: 1500, rarity: "SR", nahual: { name: "Jaguar nahual", atk: 2300, def: 900, description: "La forma de noche del brujo: un jaguar de ojos humanos." } },
  { id: 77, name: "Anciana del pueblo", description: "Curandera que sabe los nombres de todas las hierbas.", type: "monster", attribute: "viento", tags: ["ave", "muerte"], atk: 500, def: 1300, rarity: "R", nahual: { name: "Tecolote nahual", atk: 1700, def: 1e3, description: "Cuando canta el tecolote, alguien va a morir." } },
  { id: 78, name: "Comerciante viajero", description: "Pochteca que recorre los caminos con su carga de cacao.", type: "monster", attribute: "tierra", tags: ["bestia"], atk: 900, def: 900, rarity: "R", nahual: { name: "Coyote nahual", atk: 1600, def: 1100, description: "Astuto y veloz: nadie lo ve llegar a la caravana." } },
  { id: 79, name: "Ocelote cazador", description: "El cachorro creci\xF3. Ahora caza solo bajo la luna.", type: "monster", attribute: "tierra", tags: ["jaguar", "bestia"], atk: 1500, def: 1e3, rarity: "R", effects: [{ trigger: "onAttack", conditions: [{ type: "isNight" }], actions: [{ type: "modifyAtk", amount: 300, target: "self", untilEndOfTurn: true }] }] },
  { id: 80, name: "Macehual veterano", description: "Sobrevivi\xF3 a cien batallas floridas y gu\xEDa a los j\xF3venes.", type: "monster", attribute: "tierra", tags: ["guerrero"], atk: 1600, def: 1200, rarity: "R", effects: [{ trigger: "continuous", actions: [{ type: "modifyAtk", amount: 200, target: "otherAlliesWithTag", tag: "guerrero" }] }] },
  { id: 81, name: "Colibr\xED mensajero del sol", description: "Lleva noticias a Huitzilopochtli y regresa con regalos.", type: "monster", attribute: "viento", tags: ["ave", "sol"], atk: 1300, def: 900, rarity: "R", effects: [{ trigger: "onSummon", actions: [{ type: "draw", amount: 1 }, { type: "heal", amount: 300 }] }] },
  { id: 82, name: "Xoloitzcuintle guardi\xE1n", description: "Guardi\xE1n del umbral del Mictl\xE1n. Nadie cruza sin su permiso.", type: "monster", attribute: "tierra", tags: ["bestia", "muerte"], atk: 1700, def: 1500, rarity: "SR", effects: [{ trigger: "onDestroyed", actions: [{ type: "heal", amount: 600 }] }] },
  { id: 83, name: "Tormenta de Tl\xE1loc", description: "Rayos y granizo caen sobre el ej\xE9rcito enemigo.", type: "spell", attribute: "agua", tags: [], atk: 0, def: 0, rarity: "UR", effects: [{ trigger: "onActivate", actions: [{ type: "destroy", target: "allEnemies" }] }] },
  { id: 84, name: "Soplo de Eh\xE9catl", description: "El viento barre todo lo que el rival escondi\xF3.", type: "spell", attribute: "viento", tags: [], atk: 0, def: 0, rarity: "SR", effects: [{ trigger: "onActivate", actions: [{ type: "destroySupport", who: "opponent" }] }] },
  { id: 85, name: "Fauces de Tlaltecuhtli", description: "La tierra abre la boca y se traga a todos por igual.", type: "spell", attribute: "tierra", tags: [], atk: 0, def: 0, rarity: "SR", effects: [{ trigger: "onActivate", actions: [{ type: "destroy", target: "allMonsters" }] }] },
  { id: 86, name: "Hechizo de Malinalx\xF3chitl", description: "La hechicera doblega la voluntad del guerrero m\xE1s fuerte.", type: "spell", attribute: "viento", tags: [], atk: 0, def: 0, rarity: "SR", effects: [{ trigger: "onActivate", actions: [{ type: "takeControl", target: "highestAtkEnemy" }] }] },
  { id: 87, name: "Aliento del Mictl\xE1n", description: "Un viento fr\xEDo devuelve a los reci\xE9n llegados.", type: "trap", attribute: "viento", tags: [], atk: 0, def: 0, rarity: "R", effects: [{ trigger: "onOpponentSummon", actions: [{ type: "returnToHand", target: "summoned" }] }] },
  { id: 88, name: "Red de obsidiana", description: "Ninguna fusi\xF3n escapa de las navajas negras.", type: "trap", attribute: "tierra", tags: [], atk: 0, def: 0, rarity: "SR", effects: [{ trigger: "onOpponentFusion", actions: [{ type: "destroy", target: "summoned" }] }] },
  { id: 89, name: "Grito de la Llorona", description: "Su lamento paraliza de miedo a los guerreros.", type: "trap", attribute: "agua", tags: [], atk: 0, def: 0, rarity: "R", effects: [{ trigger: "onOpponentAttack", actions: [{ type: "negateAttack" }, { type: "forceDefense", target: "attacker" }, { type: "preventAttack" }] }] },
  { id: 90, name: "Jaguar de obsidiana", description: "Sus garras atraviesan escudos de algod\xF3n y madera.", type: "monster", attribute: "tierra", tags: ["jaguar", "bestia"], atk: 1900, def: 1200, rarity: "SR", effects: [{ trigger: "continuous", actions: [{ type: "grantKeyword", keyword: "piercing", target: "self" }] }], noFusion: true },
  { id: 91, name: "Guerrero \xE1guila veloz", description: "Baja del cielo dos veces antes de que el rival reaccione.", type: "monster", attribute: "sol", tags: ["guerrero", "ave"], atk: 1400, def: 800, rarity: "R", effects: [{ trigger: "continuous", actions: [{ type: "grantKeyword", keyword: "doubleAttack", target: "self" }] }], noFusion: true },
  { id: 92, name: "Tzitzimitl del eclipse", description: "Al bajar del cielo devora a un monstruo cualquiera.", type: "monster", attribute: "viento", tags: ["deidad", "muerte"], atk: 2e3, def: 1600, rarity: "SR", effects: [{ trigger: "onSummon", actions: [{ type: "destroy", target: "randomEnemy" }] }], noFusion: true },
  { id: 93, name: "Madre serpiente", description: "Al morir, de su cuerpo nacen nuevas serpientes.", type: "monster", attribute: "tierra", tags: ["serpiente"], atk: 1300, def: 1300, rarity: "R", effects: [{ trigger: "onDestroyed", actions: [{ type: "summonFromDeck", maxAtk: 1500, sameTag: true }] }], noFusion: true },
  { id: 94, name: "Mensajero de la noche", description: "Se cuela entre las l\xEDneas enemigas sin ser visto.", type: "monster", attribute: "viento", tags: ["ave", "muerte"], atk: 1e3, def: 700, rarity: "R", effects: [{ trigger: "continuous", conditions: [{ type: "isNight" }], actions: [{ type: "grantKeyword", keyword: "directAttack", target: "self" }] }], noFusion: true },
  { id: 95, name: "Escudo de Chimalli", description: "Una vez por duelo detiene el golpe que deb\xEDa matarlo.", type: "monster", attribute: "tierra", tags: ["guerrero"], atk: 1500, def: 1700, rarity: "R", effects: [{ trigger: "continuous", actions: [{ type: "grantKeyword", keyword: "battleImmune", target: "self" }] }, { trigger: "onBattleDestroy", actions: [{ type: "heal", amount: 300 }] }], noFusion: true }
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
    price: 100,
    monsters: { tags: ["guerrero", "jaguar", "sol", "fuego"], attributes: ["sol"] },
    support: ["sol", "tierra"],
    include: [],
    exclude: []
  },
  {
    id: "tlalocan",
    name: "Sobre de Tlalocan",
    glyph: "\u2248",
    color: "#3fa7c9",
    description: "El para\xEDso de Tl\xE1loc: criaturas del lago, serpientes emplumadas y el viento de Eh\xE9catl.",
    price: 100,
    monsters: { tags: ["agua", "serpiente", "viento"], attributes: ["agua", "viento"] },
    support: ["agua", "viento"],
    include: [],
    exclude: []
  },
  {
    id: "mictlan",
    name: "Sobre del Mictl\xE1n",
    glyph: "\u2620",
    color: "#9b6bd6",
    description: "El inframundo: xolos, bestias de la noche y los se\xF1ores de la muerte.",
    price: 100,
    monsters: { tags: ["muerte", "bestia"], attributes: [] },
    support: ["tierra", "viento"],
    include: [],
    exclude: []
  }
];

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
      this.byId.set(raw.id, Object.freeze({ ...raw, tags: Object.freeze([...raw.tags]), effects: raw.effects ? Object.freeze([...raw.effects]) : void 0 }));
    }
    for (const c of this.byId.values()) {
      if (c.ascendsTo !== void 0 && !this.byId.has(c.ascendsTo)) {
        throw new Error(`Carta inv\xE1lida "${c.name}" (id ${c.id}): asciende a la carta ${c.ascendsTo}, que no existe`);
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
  /** Problemas encontrados (solo se llenan con strict = false; con strict = true lanzan error). */
  problems = [];
  /** Avisos que no impiden jugar (por ejemplo, una receta que da una carta más débil). */
  warnings = [];
  constructor(data, db, strict = true) {
    const problems = this.problems;
    const recipeOnly = new Set(data.recipeOnly ?? []);
    for (const c of db.all()) if (c.ascendsTo) recipeOnly.add(c.ascendsTo);
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
var daySigns = signs_default;
var ENGINE_VERSION = 4;
var DATA_VERSION = fnv1a(`v${ENGINE_VERSION}` + JSON.stringify(cards_default) + JSON.stringify(fusions_default) + JSON.stringify(duelists_default) + JSON.stringify(signs_default) + JSON.stringify(packs_default));
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

// src/core/progression.ts
var ASCEND_COPIES = 3;
var MAX_LEVEL = 5;
var LEVEL_STAT_BONUS = 100;
var EFFECT_BOOST_LEVEL = 3;
var EFFECT_BOOST = 1.25;
var LEVEL_COST_BASE = { N: 50, R: 100, SR: 200, UR: 400 };
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
    const fusionBonus = signTotal(s.daySign, "fusionBonus");
    if (fused && fusionBonus) current.addModifier({ atk: fusionBonus, def: 0, sourceId: SOURCE_FUSION_SIGN, untilEndOfTurn: false });
    if (!current.faceDown) {
      if (fused) this.runEffects(current, "onFusionSummon", events);
      this.runEffects(current, "onSummon", events);
      if (current.zone === "field" && s.winner === null) {
        this.springTrap(opponentOf(intent.player), fused ? ["onOpponentFusion", "onOpponentSummon"] : ["onOpponentSummon"], { summoned: current }, current.instanceId, events);
      }
    }
    return null;
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

// src/game/packs.ts
var packs = packs_default;
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
    const fits = pack.include.includes(c.id) || (c.type === "monster" ? c.tags.some((t) => pack.monsters.tags.includes(t)) || pack.monsters.attributes.includes(c.attribute) : pack.support.includes(c.attribute));
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
  if (!duelist) return { cacao: 0, jade: 0, cards: [] };
  const cards = rollRewards(duelist, firstWin, createRng((seed ^ 2654435769) >>> 0));
  return {
    cacao: WIN_CACAO[duelist.level],
    jade: 0,
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
function pvpMove(m, player, intent) {
  if (!intent || typeof intent !== "object") return { ok: false, error: "Jugada inv\xE1lida" };
  const it = intent;
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
export {
  DATA_VERSION,
  MAX_INTENTS,
  PACK_PITY,
  PACK_SIZE,
  PVP_DAILY_REWARDED_WINS,
  PVP_SAME_RIVAL_DAILY,
  PVP_TURN_TIMEOUT_MS,
  PVP_WIN_CACAO,
  START_JADE,
  checkDuelStart,
  checkPvpDeck,
  cleanLevels,
  deckLevels,
  newSeed,
  planAscend,
  planLevelUp,
  planPacks,
  planRewards,
  pvpFirstPlayer,
  pvpMove,
  pvpTurnOf,
  roomCode,
  trimDeckToCollection,
  verifyDuel
};
