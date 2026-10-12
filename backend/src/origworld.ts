import { RatioType } from './graphql.js';

export const origworld = {
  name: 'Football Empire',
  logo: 'icones/football-empire.png',

  money: 1000,
  score: 0,
  totalangels: 0,
  activeangels: 0,
  angelbonus: 2,
  lastupdate: 0,

  products: [
    // =====================================================
    // PRODUCT 1 - FOOTBALL
    // =====================================================
    {
      id: 1,
      name: 'Football',
      logo: 'icones/football.png',
      cout: 4,
      croissance: 1.07,
      revenu: 1,
      vitesse: 500,
      quantite: 1,
      timeleft: 0,
      managerUnlocked: false,

      paliers: [
        {
          name: 'First Kick',
          logo: 'icones/football.png',
          seuil: 20,
          idcible: 1,
          ratio: 2,
          typeratio: RatioType.vitesse,
          unlocked: false,
        },
        {
          name: 'Perfect Control',
          logo: 'icones/football.png',
          seuil: 50,
          idcible: 1,
          ratio: 2,
          typeratio: RatioType.gain,
          unlocked: false,
        },
        {
          name: 'Ball Master',
          logo: 'icones/football.png',
          seuil: 100,
          idcible: 1,
          ratio: 3,
          typeratio: RatioType.gain,
          unlocked: false,
        },
      ],
    },

    // =====================================================
    // PRODUCT 2 - FOOTBALL BOOTS
    // =====================================================
    {
      id: 2,
      name: 'Football Boots',
      logo: 'icones/boots.png',
      cout: 60,
      croissance: 1.15,
      revenu: 60,
      vitesse: 3000,
      quantite: 0,
      timeleft: 0,
      managerUnlocked: false,

      paliers: [
        {
          name: 'Better Grip',
          logo: 'icones/boots.png',
          seuil: 20,
          idcible: 2,
          ratio: 2,
          typeratio: RatioType.vitesse,
          unlocked: false,
        },
        {
          name: 'Speed Boots',
          logo: 'icones/boots.png',
          seuil: 50,
          idcible: 2,
          ratio: 2,
          typeratio: RatioType.gain,
          unlocked: false,
        },
        {
          name: 'Golden Boots',
          logo: 'icones/boots.png',
          seuil: 100,
          idcible: 2,
          ratio: 3,
          typeratio: RatioType.gain,
          unlocked: false,
        },
      ],
    },

    // =====================================================
    // PRODUCT 3 - TEAM JERSEY
    // =====================================================
    {
      id: 3,
      name: 'Team Jersey',
      logo: 'icones/jersey.png',
      cout: 720,
      croissance: 1.14,
      revenu: 540,
      vitesse: 6000,
      quantite: 0,
      timeleft: 0,
      managerUnlocked: false,

      paliers: [
        {
          name: 'New Colors',
          logo: 'icones/jersey.png',
          seuil: 20,
          idcible: 3,
          ratio: 2,
          typeratio: RatioType.gain,
          unlocked: false,
        },
        {
          name: 'Official Kit',
          logo: 'icones/jersey.png',
          seuil: 50,
          idcible: 3,
          ratio: 2,
          typeratio: RatioType.vitesse,
          unlocked: false,
        },
        {
          name: 'Legendary Shirt',
          logo: 'icones/jersey.png',
          seuil: 100,
          idcible: 3,
          ratio: 3,
          typeratio: RatioType.gain,
          unlocked: false,
        },
      ],
    },

    // =====================================================
    // PRODUCT 4 - RISING PLAYER
    // =====================================================
    {
      id: 4,
      name: 'Rising Player',
      logo: 'icones/player.png',
      cout: 8640,
      croissance: 1.13,
      revenu: 4320,
      vitesse: 12000,
      quantite: 0,
      timeleft: 0,
      managerUnlocked: false,

      paliers: [
        {
          name: 'Youth Academy',
          logo: 'icones/player.png',
          seuil: 20,
          idcible: 4,
          ratio: 2,
          typeratio: RatioType.vitesse,
          unlocked: false,
        },
        {
          name: 'Starting Eleven',
          logo: 'icones/player.png',
          seuil: 50,
          idcible: 4,
          ratio: 2,
          typeratio: RatioType.gain,
          unlocked: false,
        },
        {
          name: 'Future Star',
          logo: 'icones/player.png',
          seuil: 100,
          idcible: 4,
          ratio: 3,
          typeratio: RatioType.gain,
          unlocked: false,
        },
      ],
    },

    // =====================================================
    // PRODUCT 5 - FOOTBALL SUPERSTAR
    // =====================================================
    {
      id: 5,
      name: 'Football Superstar',
      logo: 'icones/superstar.png',
      cout: 103680,
      croissance: 1.12,
      revenu: 51840,
      vitesse: 24000,
      quantite: 0,
      timeleft: 0,
      managerUnlocked: false,

      paliers: [
        {
          name: 'Top Scorer',
          logo: 'icones/superstar.png',
          seuil: 20,
          idcible: 5,
          ratio: 2,
          typeratio: RatioType.gain,
          unlocked: false,
        },
        {
          name: 'Golden Season',
          logo: 'icones/superstar.png',
          seuil: 50,
          idcible: 5,
          ratio: 2,
          typeratio: RatioType.vitesse,
          unlocked: false,
        },
        {
          name: 'World Legend',
          logo: 'icones/superstar.png',
          seuil: 100,
          idcible: 5,
          ratio: 4,
          typeratio: RatioType.gain,
          unlocked: false,
        },
      ],
    },

    // =====================================================
    // PRODUCT 6 - FOOTBALL CLUB
    // =====================================================
    {
      id: 6,
      name: 'Football Club',
      logo: 'icones/club.png',
      cout: 1244160,
      croissance: 1.11,
      revenu: 622080,
      vitesse: 48000,
      quantite: 0,
      timeleft: 0,
      managerUnlocked: false,

      paliers: [
        {
          name: 'New Stadium',
          logo: 'icones/club.png',
          seuil: 20,
          idcible: 6,
          ratio: 2,
          typeratio: RatioType.gain,
          unlocked: false,
        },
        {
          name: 'Champions League',
          logo: 'icones/club.png',
          seuil: 50,
          idcible: 6,
          ratio: 2,
          typeratio: RatioType.vitesse,
          unlocked: false,
        },
        {
          name: 'World Champions',
          logo: 'icones/club.png',
          seuil: 100,
          idcible: 6,
          ratio: 5,
          typeratio: RatioType.gain,
          unlocked: false,
        },
      ],
    },
  ],

  // =====================================================
  // GLOBAL UNLOCKS - reached when EVERY product hits seuil
  // =====================================================
  allunlocks: [
    {
      name: 'National League',
      logo: 'icones/football-empire.png',
      seuil: 25,
      idcible: 0,
      ratio: 2,
      typeratio: RatioType.vitesse,
      unlocked: false,
    },
    {
      name: 'Champions League',
      logo: 'icones/football-empire.png',
      seuil: 50,
      idcible: 0,
      ratio: 2,
      typeratio: RatioType.gain,
      unlocked: false,
    },
    {
      name: 'World Domination',
      logo: 'icones/football-empire.png',
      seuil: 100,
      idcible: 0,
      ratio: 3,
      typeratio: RatioType.gain,
      unlocked: false,
    },
    {
      name: 'Hall of Fame',
      logo: 'icones/football-empire.png',
      seuil: 200,
      idcible: 0,
      ratio: 2,
      typeratio: RatioType.vitesse,
      unlocked: false,
    },
  ],

  // =====================================================
  // CASH UPGRADES - idcible 0 = every product
  // =====================================================
  upgrades: [
    {
      name: 'Pro Match Balls',
      logo: 'icones/football.png',
      seuil: 25000,
      idcible: 1,
      ratio: 3,
      typeratio: RatioType.gain,
      unlocked: false,
    },
    {
      name: 'Boot Sponsorship',
      logo: 'icones/boots.png',
      seuil: 100000,
      idcible: 2,
      ratio: 3,
      typeratio: RatioType.gain,
      unlocked: false,
    },
    {
      name: 'Online Fan Shop',
      logo: 'icones/jersey.png',
      seuil: 500000,
      idcible: 3,
      ratio: 3,
      typeratio: RatioType.gain,
      unlocked: false,
    },
    {
      name: 'Fitness Program',
      logo: 'icones/player.png',
      seuil: 2000000,
      idcible: 4,
      ratio: 2,
      typeratio: RatioType.vitesse,
      unlocked: false,
    },
    {
      name: 'Image Rights',
      logo: 'icones/superstar.png',
      seuil: 10000000,
      idcible: 5,
      ratio: 3,
      typeratio: RatioType.gain,
      unlocked: false,
    },
    {
      name: 'TV Broadcast Deal',
      logo: 'icones/club.png',
      seuil: 50000000,
      idcible: 6,
      ratio: 3,
      typeratio: RatioType.gain,
      unlocked: false,
    },
    {
      name: 'Training Ground',
      logo: 'icones/football-empire.png',
      seuil: 250000000,
      idcible: 0,
      ratio: 2,
      typeratio: RatioType.vitesse,
      unlocked: false,
    },
    {
      name: 'Global Sponsorship',
      logo: 'icones/football-empire.png',
      seuil: 1000000000,
      idcible: 0,
      ratio: 3,
      typeratio: RatioType.gain,
      unlocked: false,
    },
    {
      name: 'Stadium Expansion',
      logo: 'icones/club.png',
      seuil: 5000000000,
      idcible: 6,
      ratio: 2,
      typeratio: RatioType.vitesse,
      unlocked: false,
    },
    {
      name: 'Media Empire',
      logo: 'icones/football-empire.png',
      seuil: 50000000000,
      idcible: 0,
      ratio: 5,
      typeratio: RatioType.gain,
      unlocked: false,
    },
  ],

  // =====================================================
  // ANGEL UPGRADES - paid with active angels
  // =====================================================
  angelupgrades: [
    {
      name: 'Divine Kick',
      logo: 'icones/football.png',
      seuil: 5,
      idcible: 1,
      ratio: 5,
      typeratio: RatioType.gain,
      unlocked: false,
    },
    {
      name: 'Loyal Fans',
      logo: 'icones/football-empire.png',
      seuil: 10,
      idcible: 0,
      ratio: 1,
      typeratio: RatioType.ange,
      unlocked: false,
    },
    {
      name: 'Lucky Charm',
      logo: 'icones/football-empire.png',
      seuil: 25,
      idcible: 0,
      ratio: 2,
      typeratio: RatioType.gain,
      unlocked: false,
    },
    {
      name: 'Heavenly Pace',
      logo: 'icones/football-empire.png',
      seuil: 100,
      idcible: 0,
      ratio: 2,
      typeratio: RatioType.vitesse,
      unlocked: false,
    },
    {
      name: 'Ultras',
      logo: 'icones/football-empire.png',
      seuil: 250,
      idcible: 0,
      ratio: 2,
      typeratio: RatioType.ange,
      unlocked: false,
    },
    {
      name: "Legends' Blessing",
      logo: 'icones/superstar.png',
      seuil: 1000,
      idcible: 0,
      ratio: 3,
      typeratio: RatioType.gain,
      unlocked: false,
    },
  ],

  // =====================================================
  // MANAGERS - one per product (ratio/typeratio unused)
  // =====================================================
  managers: [
    {
      name: 'Youth Coach',
      logo: 'icones/football.png',
      seuil: 1000,
      idcible: 1,
      ratio: 0,
      typeratio: RatioType.gain,
      unlocked: false,
    },
    {
      name: 'Equipment Manager',
      logo: 'icones/boots.png',
      seuil: 15000,
      idcible: 2,
      ratio: 0,
      typeratio: RatioType.gain,
      unlocked: false,
    },
    {
      name: 'Merchandising Director',
      logo: 'icones/jersey.png',
      seuil: 100000,
      idcible: 3,
      ratio: 0,
      typeratio: RatioType.gain,
      unlocked: false,
    },
    {
      name: 'Academy Scout',
      logo: 'icones/player.png',
      seuil: 500000,
      idcible: 4,
      ratio: 0,
      typeratio: RatioType.gain,
      unlocked: false,
    },
    {
      name: 'Superstar Agent',
      logo: 'icones/superstar.png',
      seuil: 1200000,
      idcible: 5,
      ratio: 0,
      typeratio: RatioType.gain,
      unlocked: false,
    },
    {
      name: 'Club President',
      logo: 'icones/club.png',
      seuil: 10000000,
      idcible: 6,
      ratio: 0,
      typeratio: RatioType.gain,
      unlocked: false,
    },
  ],
}; 