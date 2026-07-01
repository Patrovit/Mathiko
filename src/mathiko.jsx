import React, { useState, useEffect, useRef } from "react";
import { createClient } from "@supabase/supabase-js";

// ─── Supabase client ──────────────────────────────────────────────────────
// Single global instance, configured from Vite env vars (les variables avec
// préfixe VITE_ sont exposées au navigateur par Vite — voir le repo GitHub).
// Si elles manquent (run local sans .env), supabase est null et l'app
// affichera un message d'erreur explicite plutôt que de planter.
const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL;
const SUPABASE_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY;
const supabase = (SUPABASE_URL && SUPABASE_KEY)
  ? createClient(SUPABASE_URL, SUPABASE_KEY)
  : null;

/* ╔═══════════════════════════════════════════════════════════════════════════╗
   ║                                                                           ║
   ║                      🐾  MATHIKO ZOO  —  GUIDE DU CODE  🐾                ║
   ║                                                                           ║
   ╠═══════════════════════════════════════════════════════════════════════════╣

   Bienvenue, futur(e) développeur(euse) ! Ce fichier est un jeu éducatif complet
   tenant dans UN seul composant React. Avant de plonger, prends 5 minutes pour
   lire ce guide : il t'évitera 5 heures de tâtonnement.

   ─── 1. L'IDÉE DU JEU ───────────────────────────────────────────────────────

   Mathiko Zoo apprend les tables de multiplication (de 2×2 à 9×9, soit 64
   calculs) à des enfants. La pédagogie est déguisée en jeu de gestion de zoo :

     • Chaque bonne réponse « sauve » un animal 🦁.
     • L'enfant construit progressivement un refuge animalier 🗺️.
     • Plus on répond vite, plus l'animal sauvé est « prestigieux » (tier).
     • Une mémorisation durable est visée grâce à la répétition espacée.

   La règle d'or du ton : on ne « rate » jamais, on « trouve autre chose »
   (un objet rigolo 🎩). On ne dit pas « faux », on dit « révisions ! ». Tout le
   vocabulaire est positif et imagé. Garde cet esprit dans tout nouvel ajout.

   ─── 2. LA MÉTAPHORE CENTRALE : LEITNER = CHANTIER DE ZOO ───────────────────

   Le moteur pédagogique est un système de Leitner (répétition espacée). Chaque
   calcul vit dans une « boîte » de 0 à 5. Ces boîtes ne sont JAMAIS montrées
   telles quelles à l'enfant : elles sont traduites en étapes de construction
   d'un enclos. C'est le pont entre la pédagogie et la fiction :

     Boîte 0  → 🪨 Friche / terrain à défricher   (jamais réussi)
     Boîte 1  → 🚧 Chantier qui démarre
     Boîte 2  → ⛏️  Préparation du terrain
     Boîte 3  → 🌱 Plantations
     Boîte 4  → 🌿 Enclos presque prêt
     Boîte 5  → 🌳 Enclos terminé, l'animal y vit  (calcul maîtrisé)

   Monter d'une boîte = bonne réponse. Redescendre = erreur (avec des règles
   douces, voir updateLeitnerEntry). Chaque boîte a un délai avant de « revenir
   à réviser » (LEITNER_INTERVAL_DAYS) : c'est l'espacement.

   ─── 3. CARTE DU FICHIER (cherche ces titres pour naviguer) ─────────────────

     ─── Data ───            Constantes : familles d'animaux, labels, récompenses.
     ─── Utils ───           Petits helpers (rand, shuffle).
     ─── Daily seeded ───    Aléatoire stable sur 24 h (déco du menu).
     ─── Profiles & ───      Modèle de données, persistance, MIGRATIONS.
     genQs / genQsLeitner    Génération des questions selon le mode de jeu.
     ─── Component ───       LE composant Mathiko : tout l'état + tout le rendu.

   Le composant lui-même suit l'ordre : états → effets → actions → helpers de
   rendu → JSX. Le JSX est une longue suite de blocs `{phase === "x" && (...)}`.

   ─── 4. LA MACHINE À ÉTATS `phase` ──────────────────────────────────────────

   Tout l'affichage est piloté par UNE variable d'état : `phase`. Transitions :

     profiles ─(choisir/créer)→ menu
     menu ─(startGame/…)→ game ⇄ fb ─(dernière question)→ end ─(rejouer)→ game
     menu ⇄ zoomap ⇄ records   |   menu ⇄ zoodex   |   profiles ⇄ debug
     game ─(quitter)→ menu

   Ajouter un écran = ajouter une valeur de `phase` + un bloc JSX conditionnel.

   ─── 5. LE MODÈLE DE DONNÉES (un « profil ») ────────────────────────────────

   Tout est dans localStorage sous la clé STORAGE_KEY. Le store contient une
   liste de profils. Un profil ressemble à ceci (voir makeProfile) :

     {
       id, name, avatar, createdAt,
       streak:         { current, best, lastPlayed, playedDates[] },  // série
       leitner:        { "a-b": { box, nextDue, lastSeen, streak, attempts } },
       dailyChallenge: { lastCompletedDate, history[] },      // sauvetage du jour
       zoodex:         { animals: { "table-half-tier": count },
                          plants:  { "🪴": count, ... },
                          foods:   { "🥕": count, ... },
                          keepers: { "👩🏻‍⚕️": count, ... } },          // collection
       records:        { bestTimeMs, biggestCalc, totalCalcsSolved, animalsByTier },
       refuge:         { families: { "t-half": { count, lastWelcomeDate } } },
     }

   ⚠️  RÈGLE DES MIGRATIONS : si tu changes la FORME de ces données, tu DOIS
   incrémenter SCHEMA_VERSION et ajouter un bloc `if (s.version < N)` dans
   migrate(). Sans ça, tu casses les sauvegardes des enfants existants. La
   fonction migrate() doit toujours rester idempotente (rejouable sans dégât).

   ─── 6. CONVENTIONS À RESPECTER ─────────────────────────────────────────────

     • Clés de calcul       : `calcKey(a, b)` → "a-b"  (ex. "7-8")
     • Clés de demi-table   : `halfKey(t, h)` → "t-h"  (ex. "4-low")
     • Animations CSS       : toutes préfixées `mk-` (voir le bloc <style>)
     • useRef vs useState   : un ref (subRef, comboRef, elapRef…) sert quand on
                              a besoin de la valeur AVANT le prochain rendu, sans
                              déclencher de re-render. Ne pas confondre.
     • Styles               : tout en style inline (pas de CSS externe), pour
                              que le jeu tienne dans un seul fichier portable.

   ─── 7. RECETTE : « JE VEUX AJOUTER UNE FONCTIONNALITÉ » ────────────────────

     • Un nouveau MODE de jeu      → ajoute un cas dans genQsLeitner + une
                                     fonction startXxx() + un bouton dans le menu.
     • Une nouvelle FAMILLE/TABLE  → le jeu est câblé pour 2..9 ; étendre demande
                                     de toucher TABLES + toutes les boucles 2→9.
     • Un nouvel ÉCRAN             → voir §4.
     • Un nouveau CHAMP de profil  → voir §5 (migration obligatoire !).

   Bon courage, et garde le jeu joyeux. 🐾
   ╚═══════════════════════════════════════════════════════════════════════════╝ */

/* ─── CHANGELOG (révisions de ce fichier) ──────────────────────────────────────

   SCHÉMA DE VERSIONNAGE — trois identifiants, un rôle chacun :
     • REVISION       — compteur de RÉVISION DE FICHIER. +1 à CHAQUE livraison,
                        même sans changement produit. C'est le grain le plus fin ;
                        il correspond au « N » du nom mathiko_vN.jsx.
     • VERSION        — version PRODUIT, en semver MAJEUR.MINEUR.CORRECTIF. Ne
                        bouge QUE si le joueur voit une différence.
     • SCHEMA_VERSION — version du FORMAT des données sauvegardées. Ne bouge QUE
                        sur migration (voir migrate()).
   Emboîtement : révision ⊇ bump VERSION ⊇ bump SCHEMA_VERSION.
   (STORAGE_KEY n'est pas une version : c'est l'adresse du localStorage, gelée.)
   Types de révision : feat · fix · docs · refactor · chore.

   ── Workflow fichier dev / prod ──────────────────────────────────────────────
   Deux fichiers cohabitent (instaurés à partir de v2.26.0) :
     • mathiko.jsx     = PROD. Nom STABLE → lien d'artefact stable pour les
                         utilisateurs. Mis à jour SEULEMENT lors d'une release
                         explicite. VERSION sans suffixe.
     • mathiko_dev.jsx = DEV. Bac à sable d'itération, écrasé à chaque
                         révision. VERSION suffixée "-dev" tant qu'on est en
                         itération (ex. 2.27.0-dev).
   Pour publier une release :
     1. Finir l'itération dans mathiko_dev.jsx (VERSION reste "X.Y.Z-dev").
     2. Copier le contenu vers mathiko.jsx en RETIRANT le suffixe "-dev".
     3. Marquer l'entrée CHANGELOG correspondante d'un préfixe « 🚀 RELEASE ».
     4. Reprendre l'itération dans mathiko_dev.jsx avec une VERSION cible
        suivante (ex. 2.28.0-dev).
   Le compteur REVISION est GLOBAL (pas de réinitialisation par fichier) — il
   compte les écritures, qu'elles soient dev ou prod.

   ── Historique ──────────────────────────────────────────────────────────────
   v22 · 2026-05-23 · feat  · VERSION 2.27.0 → 2.28.0-dev
        Authentification cloud Supabase et synchronisation des sauvegardes.
        Chaque joueuse(eur) a maintenant un « refuge » identifié par un pseudo
        + un code à 4 chiffres ; le store complet est sauvegardé dans la base
        Supabase, ce qui permet de retrouver son refuge sur n'importe quel
        appareil (téléphone, tablette, ordi).
        Nouveau flow d'auth (avant le jeu) : picker des refuges connus sur cet
        appareil, écran de login (pseudo connu pré-rempli + code), écran de
        création (pseudo + avatar + code). Cartes du picker stockent juste
        l'id, le pseudo et l'avatar en localStorage — JAMAIS le code, qui est
        toujours retapé. Une croix permet de retirer un refuge de l'appareil
        (sans le supprimer côté cloud — c'est juste une liste rapide).
        Composant `PinPad` réutilisable créé pour l'auth (et plus tard pour
        la saisie des calculs en mode jeu sur mobile).
        Le bouton « Changer » du menu déclenche désormais une déconnexion
        cloud (retour au picker), au lieu du switch local entre profils. Le
        flow profils local est conservé en fallback (si les env vars
        Supabase manquent) mais devient inaccessible en mode cloud normal.
        Sauvegarde cloud DÉBOUNCÉE à 2 s — pas de spam Supabase à chaque
        changement de state. Le store local reste écrit à chaque modif (cache
        instantané pour la session courante). Le code (PIN) reste UNIQUEMENT
        en mémoire vive — il faut le retaper à chaque rechargement de page.
        Côté serveur : 3 fonctions stockées (`create_profile`, `login_profile`,
        `save_store`) avec PIN bcrypt-hashé, Row Level Security activée, accès
        direct à la table bloqué. Voir documentation Supabase du projet.
   🚀 RELEASE v21 · 2026-05-21 · feat  · VERSION 2.26.0 → 2.27.0
        Uniformisation du nombre de calculs des modes d'entretien — Défricher,
        Aménager et Cultiver passent tous à **10 calculs** (Accueillir était
        déjà à 10). Pour Défricher, c'était 5 avant ; pour Aménager et
        Cultiver, le nombre était hérité de `nbTurns` (réglage de la Mission
        d'entraînement), ce qui était incohérent. Seul "play" continue de
        respecter `nbTurns`.
        Les boutons **Aménager** et **Cultiver** sont désormais désactivés
        quand il n'y a aucune case dans leur catégorie respective (boîtes 1-2
        pour Aménager, boîtes 3-4 pour Cultiver) — typiquement avant la
        première partie (Aménager) ou avant d'avoir suffisamment répété
        certains calculs (Cultiver). Même habillage visuel et infobulle que le
        bouton Défricher déjà désactivable. Le décompte de cases est calculé
        via le helper `calcsForMode()` partagé avec le Suivi détaillé — pas
        de risque de désynchronisation.
   🚀 RELEASE v20 · 2026-05-20 · feat  · VERSION 2.25.0 → 2.26.0
        ✨ PREMIÈRE RELEASE PROD — état figé sous le nom mathiko.jsx.
        Raccourci 📔 Zoodex ajouté dans le Refuge à côté du bouton 🏆 Records.
        Nouvelle animation `mk-pulse-attn` (pulse continue avec halo violet) :
        ce raccourci pulse tant que la dernière partie a apporté de nouveaux
        items au Zoodex (lastZoodexAdditions non vide). Le pulse s'arrête dès
        que l'utilisateur a ouvert le Zoodex (l'effet de timeout vide les
        Sets, comme déjà en v19). Aucun schéma touché.
   v19 · 2026-05-20 · feat  · VERSION 2.24.0 → 2.25.0
        Refonte des sections Plantes / Nourritures / Soigneurs du Zoodex :
          — Chaque section affiche désormais autant de cases que d'items dans
            la liste maîtresse (grille à 6 colonnes — 18 / 12 / 18 cases).
          — Les cases découvertes montrent l'emoji avec son compteur ×N en
            dessous (même format que les animaux pour la cohérence visuelle).
          — Les cases non découvertes montrent un emoji PLACEHOLDER générique
            grisé propre à la section : 🌱 pour les plantes, 🍽️ pour les
            nourritures, 🧑🏻‍🌾 pour les soigneurs. La surprise du contenu
            spécifique est préservée, mais on voit l'ampleur restante.
        Nouvelle animation `mk-zoodex-new` : à la fin d'une partie où le joueur
        a découvert pour la PREMIÈRE FOIS de nouveaux animaux / plantes /
        nourritures / soigneurs, ces cases s'animent en pop verte cascadée à
        l'ouverture du Zoodex. L'effet est désamorcé après ~1,5 s pour ne pas
        rejouer à chaque revisite. Aucun schéma touché.
   v18 · 2026-05-20 · feat  · VERSION 2.23.0 → 2.24.0
        Extension du bestiaire collectable :
          — 5 nouvelles plantes : 🌸 🌺 🪷 🎋 🍄 (4 petites pour boîte 4,
            🎋 grand pour boîte 5) → PLANTS passe de 13 à 18 entrées.
          — 2 nouvelles nourritures : 🐟 🍯 → FOODS passe de 10 à 12.
          — 5 nouveaux soigneurs : 🧑🏻‍🍳 🧑🏻‍🚒 🧑🏻‍🔬 🧙🏻‍♀️ 🧑🏻‍🦳 → KEEPERS passe
            de 13 à 18 (la liste s'enrichit au-delà du seul corps médical).
        Zoodex : les emojis non encore découverts ne sont plus affichés un par
        un sous forme de silhouettes — une SEULE pastille générique grisée
        « ❓ » apparaît en fin de chaque section pour préserver la surprise,
        avec une infobulle « Encore N à découvrir ». Le ratio « N / total »
        de l'en-tête reste là pour l'objectif. Aucun schéma touché.
   v17 · 2026-05-20 · feat  · VERSION 2.22.2 → 2.23.0 · SCHEMA 7 → 8
        Extension du Zoodex : trois nouvelles sous-collections suivent désormais
        les découvertes de plantes (PLANTS), nourritures (FOODS) et soigneurs
        (KEEPERS) en plus des animaux. L'écran Zoodex affiche pour chaque
        catégorie la liste complète, avec compteur de découvertes par emoji et
        silhouettes grisées pour les non-trouvés (« reste à découvrir »).
        Refuge : `tileForEntry` (cases boîtes 4 et 5) ne pioche plus dans des
        listes hardcodées mais dans des sous-ensembles **filtrés par le Zoodex**
        — seul ce que l'enfant a déjà rencontré peut décorer son refuge. Un
        nouveau profil voit donc une grille sobre qui s'enrichit visiblement à
        chaque combo. 💐 retiré (jamais collectable). 🌿 🌾 🪻 ajoutés à PLANTS
        (donc collectables et découvrables). Migration v7 → v8 idempotente
        (les profils existants démarrent avec plants/foods/keepers vides — la
        collecte démarre à la prochaine partie).
   v16 · 2026-05-20 · fix   · VERSION 2.22.1 → 2.22.2
        Le ruban de série débordait sur 2 lignes dans le menu quand la colonne
        du profil était étroite (capture utilisateur). Ajout de `whiteSpace:
        nowrap` sur le conteneur du ruban, réduction de la taille à 13 px et
        letterSpacing à 0 : les 7 emojis + le tier tiennent maintenant sur une
        seule ligne, y compris sur mobile.
   v15 · 2026-05-20 · fix   · VERSION 2.22.0 → 2.22.1
        Ruban de série simplifié : 🥶 abandonné au profit de ⚪. Désormais
        seulement 3 glyphes possibles dans le ruban (chat / 😎 / ⚪). La règle
        change : un jour manqué dont le précédent était joué = 😎 (inchangé) ;
        un jour manqué dont le précédent était aussi manqué = ⚪ (avant : 🥶).
        Le cas spécial « tout ⚪ quand la série est cassée » est retiré — le
        ruban reflète maintenant fidèlement l'historique même quand la série
        est cassée (seul le tier passe à 👋). Le cas « jamais joué » produit
        naturellement ⚪⚪⚪⚪⚪⚪⚪ via la règle générale. Aucun schéma touché.
   v14 · 2026-05-20 · feat  · VERSION 2.21.0 → 2.22.0 · SCHEMA 6 → 7
        « Streak » devient « série » dans toute l'UI. Refonte complète de
        l'encouragement visuel : un ruban de 7 jours glissants apparaît dans le
        menu avec une icône par jour — un chat aléatoire (stable par date) pour
        les jours joués, 😎 pour le 1er jour manqué d'un trou, 🥶 pour les
        suivants, ⚪ pour aujourd'hui pas encore validé OU pour une série à 0.
        Tier emoji escaladé selon la longueur de série : 21 paliers de base
        (👍👌👏…❤️‍🔥🔥) puis rollover avec préfixe 🔥 (série 22 = 🔥👍, 42 = 🔥🔥,
        43 = 🔥🔥👍, etc.). 👋 pour série = 0. Liste de profils en version
        compacte (« 🤘 5j »), Records en « Meilleure série : 5j 🤘 ».
        Tolérance 1 jour : la série ne se casse qu'au 2e jour manqué consécutif
        (lastPlayed jusqu'à avant-hier = série encore active). Migration v6 → v7 :
        ajout de `streak.playedDates` (historique capé à 14 jours).
   v13 · 2026-05-20 · feat  · VERSION 2.20.0 → 2.21.0
        Refonte des modes d'entretien et de la Mission :
        — Défricher : boîte 0 déjà vue OU en bordure (union des deux critères ;
          avant : uniquement en bordure).
        — Aménager : boîtes 1 et 2 (avant : 0 et 1).
        — Cultiver : boîtes 3 et 4 (avant : 2 et 3).
        — « Mission spéciale » renommée « Mission d'entraînement » dans l'UI.
        — Mission d'entraînement n'impacte PLUS le Leitner du tout (avant : ne
          régressait pas mais montait sur succès). C'est maintenant un pur mode
          d'entraînement / divertissement sans progression ni régression des
          boîtes. Les modes d'entretien (Aménager, Cultiver, Défricher, Sauvetage
          du jour) restent les seules voies de progression Leitner pour les
          tables, et Accueillir reste le seul mode qui peuple le refuge.
        Suivi détaillé, tooltips et descriptions alignés. Identifiant interne
        "play" conservé pour ne pas casser le code.
   v12 · 2026-05-19 · feat  · VERSION 2.19.1 → 2.20.0
        Polish UI du refuge : (1) bouton « Sauvetage du jour » mis sur 2 lignes
        avec « (10 calculs) » et « À demain ! » en regular (non-gras) ;
        (2) bouton « 🏡 Accueillir un animal » raccourci en « 🏡 Accueillir » ;
        (3) bouton « 🌱 Cultiver » passé en vert clair (#A8E0A8) avec texte
        foncé pour la lisibilité ; (4) NOUVEAU : légende complète à 6 entrées
        sous la grille avec les titres ludiques pour chaque boîte Leitner
        (Friche, Chantier qui démarre, Préparation, Plantations, Tout juste
        prêt, Enclos prêt) — la case habitée par un animal n'y est volontairement
        pas pour préserver la surprise de la découverte.
   v11 · 2026-05-19 · fix   · VERSION 2.19.0 → 2.19.1
        Correctif mode "welcome" : la carte de feedback tentait de lire
        `fb.gAnimal.emoji` alors que `gAnimal` est null en welcome (pas
        d'animal de session). Le rendu de l'animal est maintenant conditionnel,
        et un petit indicateur « ✓ X / 10 » prend sa place pour situer l'enfant
        dans le défi zéro-erreur.
   v10 · 2026-05-19 · feat  · VERSION 2.18.1 → 2.19.0 · SCHEMA 5 → 6
        Nouveau mini-jeu « Accueillir un animal » (mode "welcome") accessible
        depuis le refuge via un bouton 🏡. Pré-requis : les 4 calculs de la
        famille en boîte ≥ 4. Format : 10 calculs de la famille, zéro erreur
        autorisée (erreur → arrêt, aucune baisse Leitner). Cap : 1 succès par
        famille et par jour. Récompenses dans l'ordre du moins prestigieux au
        plus (1er succès → animals[3], 4e → animals[0]).
        Refonte de l'affichage des animaux du refuge : plus d'auto-spawn sur
        les cases boîte 4-5 (`tileForEntry` retravaillé) ; les animaux n'y
        apparaissent désormais que via les succès du nouveau mini-jeu, à des
        positions aléatoires qui changent chaque jour mais sont déterministes
        sur 24 h. L'animal accueilli PERSISTE même si son calcul redescend
        sous boîte 4. Migration v5 → v6 : ajout du champ `refuge` par profil.
        Le Zoodex (collection d'animaux rencontrés) et la cascade d'animaux
        de fin des parties classiques restent inchangés.
   v9 · 2026-05-19 · fix   · VERSION 2.18.0 → 2.18.1
        Orthographe : accords singulier/pluriel corrigés (« 1/4 prêt » vs
        « 3/4 prêts », « 1 case a progressé » vs « 2 cases ont progressé »).
        Écriture inclusive : point médian remplacé par des parenthèses
        (« Champion(ne) », « futur(e) développeur(euse) »).
   v8 · 2026-05-19 · feat  · VERSION 2.17.1 → 2.18.0
        Nouveau sous-écran « mission » (phase "mission") : le choix des tables,
        le nombre de calculs et le lancement de la partie y sont déplacés depuis
        le menu. Le bouton « Mission spéciale » du menu ouvre désormais ce
        sous-écran au lieu de lancer la partie directement.
   v7 · 2026-05-19 · fix   · VERSION 2.17.0 → 2.17.1
        Suivi détaillé, ajustements : les familles sont nommées techniquement
        (« ×3 haut ») sans nom ludique ni emoji, pour ne pas dévoiler le Zoodex.
        Section « Calculs qui coincent » déplacée entre « Activité » et
        « Progression par famille ». Fond des barres de répartition éclairci
        pour que la boîte 0 (Friche) reste visible.
   v6 · 2026-05-19 · feat  · VERSION 2.16.1 → 2.17.0
        Suivi détaillé enrichi : nouvelle section « Progression par famille »
        (16 familles, 4 calculs chacune, boîte + échéance Leitner par calcul) et
        « Que propose chaque mini-jeu » (calculs éligibles par mode d'entretien).
        Sous-sections repliables. Nouveaux helpers calcsForMode() et dueShort().
   v5 · 2026-05-19 · chore · VERSION 2.16.1
        Mise en place du schéma de versionnage : ce bloc CHANGELOG, la constante
        REVISION (affichée dans l'écran debug) et les commentaires de rôle. Le
        saut de VERSION fait en v4 est corrigé — un correctif relève du niveau
        CORRECTIF, donc 2.16.0 → 2.16.1 (et non 2.17). Aucun changement produit.
   v4 · 2026-05-19 · fix   · VERSION 2.16.0 → 2.16.1
        La sélection de familles du menu n'agit plus que sur la Mission spéciale ;
        Aménager / Cultiver / Défricher balaient désormais les 16 familles.
   v3 · 2026-05-19 · docs  · VERSION 2.16.0
        Documentation enrichie pour les futurs développeurs (guide en tête de
        fichier, commentaires de sections). Aucun changement fonctionnel.
   v2 · 2026-05-11 · —     · VERSION 2.16.0
        Fichier initial fourni (fonctionnalité « Tableau des records + suivi
        détaillé »). Les révisions antérieures à v3 ne sont pas tracées ici.
   ────────────────────────────────────────────────────────────────────────────── */

// ─── Data ─────────────────────────────────────────────────────────────────────
// Constantes du jeu : contenu (familles d'animaux, textes) et barèmes (récompenses).
// Cette zone ne contient AUCUNE logique — uniquement des données figées.

// VERSION = version PRODUIT du jeu, au format semver MAJEUR.MINEUR.CORRECTIF :
//   MAJEUR    → refonte majeure de l'expérience.
//   MINEUR    → nouvelle fonctionnalité visible par le joueur.
//   CORRECTIF → correction d'un bug visible.
// Une révision purement documentaire ou de refactor ne bump PAS VERSION.
// Affichée dans le menu, l'écran debug et le pied de page. Historique complet
// dans le bloc CHANGELOG en tête de fichier.
const VERSION = "2.28.0-dev"; // version produit (semver) — voir CHANGELOG

// REVISION = compteur de RÉVISION DE FICHIER. À incrémenter à CHAQUE livraison
// du fichier, même sans changement produit (doc, refactor, chore). C'est le
// grain le plus fin du versionnage : il correspond au « N » du nom de fichier
// mathiko_vN.jsx et il est affiché dans l'écran debug. Voir le bloc CHANGELOG.
const REVISION = 22; // révision de fichier — voir CHANGELOG
// MAX_T = temps maximum (en secondes) accordé pour répondre à un calcul.
// Au-delà, handleSubmit(true) est appelé automatiquement (timeout). Sert aussi
// à calculer la largeur de la barre de temps qui se vide à l'écran.
const MAX_T = 30;

// TABLES = le contenu thématique du jeu. Une entrée par table (2 à 9).
// Chaque table est coupée en DEUX MOITIÉS, ce qui double le nombre de familles
// d'animaux (16 familles au total) et permet de réviser une table « en deux fois » :
//   low  → multiplications par 2,3,4,5  → une première famille d'animaux
//   high → multiplications par 6,7,8,9  → une deuxième famille
// Dans chaque famille, animals[] est ordonné du plus prestigieux (index 0,
// obtenu en répondant le plus vite) au plus modeste (index 3). Cet ordre est
// crucial : il est lu par tierIdx() pour récompenser la rapidité.
const TABLES = {
  2: {
    low:  { name: "Les Œufs & Poussins", animals: ["🐓", "🐤", "🐣", "🥚"] },
    high: { name: "Les Insectes",        animals: ["🦋", "🐝", "🐞", "🐛"] },
  },
  3: {
    low:  { name: "Les Reptiles",        animals: ["🦖", "🐊", "🐍", "🐢"] },
    high: { name: "Les Rampants",        animals: ["🦕", "🦎", "🐌", "🪱"] },
  },
  4: {
    low:  { name: "Les Félins",          animals: ["🐆", "🐅", "🦁", "🐈"] },
    high: { name: "Les Canidés",         animals: ["🐺", "🦊", "🐕", "🐩"] },
  },
  5: {
    low:  { name: "L'Océan",             animals: ["🐋", "🐬", "🐠", "🐡"] },
    high: { name: "Les Fonds Marins",    animals: ["🐙", "🦑", "🦞", "🦀"] },
  },
  6: {
    low:  { name: "Les Petits Malins",   animals: ["🐇", "🐀", "🦦", "🦔"] },
    high: { name: "Les Forestiers",      animals: ["🦌", "🦝", "🐿️", "🦨"] },
  },
  7: {
    low:  { name: "Les Équidés",         animals: ["🦄", "🐎", "🫏", "🐖"] },
    high: { name: "Les Ruminants",       animals: ["🐃", "🐂", "🐄", "🐐"] },
  },
  8: {
    low:  { name: "Les Oiseaux",         animals: ["🦚", "🦅", "🦆", "🦤"] },
    high: { name: "Les Tropicaux",       animals: ["🦩", "🦜", "🦢", "🐦"] },
  },
  9: {
    low:  { name: "Les Primates",        animals: ["🦍", "🐒", "🦧", "🦥"] },
    high: { name: "Les Géants",          animals: ["🐘", "🦏", "🦛", "🦒"] },
  },
};

// Helper: list all (table, half) pairs as strings "T-H" e.g. "2-low", "9-high"
// ALL_HALVES = les 16 demi-tables, utilisé comme sélection par défaut au menu.
// halfKey() est LA fonction canonique pour fabriquer ces clés : utilise-la
// partout plutôt que de concaténer à la main, pour éviter les fautes de frappe.
const ALL_HALVES = Object.keys(TABLES).flatMap(t => [`${t}-low`, `${t}-high`]);
const halfKey = (t, h) => `${t}-${h}`;

// TIER_CAT      = le chat-mascotte affiché selon la rapidité (0 = ultra-rapide).
// FAIL_CATS     = chats « je ne sais pas » montrés en cas d'erreur (tirés au hasard).
// TIER_LABELS   = phrases d'encouragement, une rangée par tier de rapidité.
// L'index dans ces tableaux vient toujours de tierIdx() — voir cette fonction.
const TIER_CAT = ["🙀", "😻", "😸", "😺"];
const FAIL_CATS = ["🤷🏼‍♀️", "🤷🏻‍♂️", "🤷🏻", "🤷🏻‍♀️", "🤷🏽‍♀️", "🤷🏿", "🤷🏼‍♂️", "🤷🏼", "🤷🏾‍♂️"];

const TIER_LABELS = [
  ["La foudre !", "Supersonique !", "Speedy Gonzalès !", "Incroyable !", "T'as même pas réfléchi !", "Les neurones chauffent !"],
  ["Trop fort !", "Ça claque !", "Vif comme l'éclair !", "Turbo !", "Ouh là là !", "Chaud devant !"],
  ["Bien joué !", "Nickel !", "Dans la boîte !", "Ça roule !", "Solide !", "Top !", "Propre !"],
  ["Bonne réponse !", "C'est ça !", "Voilà !", "Exact !", "Bien calculé !", "Tu gères !", "Banco !"],
];

// ─── Le « combo » et son économie de récompenses ───────────────────────────
// Un combo = nombre de bonnes réponses d'affilée (remis à 0 à la moindre erreur).
// Plus le combo est haut, plus la phrase est dithyrambique et plus la récompense
// (plantes/nourriture/soigneurs pour décorer le zoo) est généreuse.
//
// COMBO_LABELS           : phrases pour les combos 2 à 10 (palier par palier).
// COMBO_LABELS_LEGENDARY : phrases pour les combos > 10 ; {N} y est remplacé par
//                          le chiffre réel via getComboLabel().
const COMBO_LABELS = {
  2:  ["Continue comme ça 💪", "T'es lancé(e) !", "Le moteur chauffe 🔥", "Ça commence bien !"],
  3:  ["Combo x3 ! Une plante pour le zoo 🪴", "Triple ! Le zoo verdoie !", "3 d'affilée, ça pousse !"],
  4:  ["Combo x4 ! Les animaux ont faim 🥕", "Quatre ! L'heure du repas !", "x4 et une ration de plus !"],
  5:  ["x5 ! La jungle s'installe 🌴🌴", "Cinq ! Le zoo fleurit !", "Wahou x5, le jardinier est content !"],
  6:  ["x6 ! Festin au zoo 🍌🥩", "Six de suite ! Les bêtes se régalent !", "x6 et on re-sert !"],
  7:  ["x7 ! Le zoo s'épanouit 🌵🥜🥕", "Sept ! Nature et nourriture !", "Combo légendaire x7 !"],
  8:  ["x8 ! Le zoo explose 🌴🌴🍌🥩", "Huit ! C'est un parc national !", "Maestro x8 !"],
  9:  ["x9 ! Banquet royal 🍌🥕🥩🌽🥜", "Neuf ! Les animaux font la fête !", "x9 ! Chef étoilé du zoo !"],
  10: ["x10 ! Un soigneur rejoint le zoo ! ✨", "DIX ! Le zoo recrute !", "LÉGENDAIRE ! x10 🏆"],
};

const COMBO_LABELS_LEGENDARY = [
  "COMBO x{N} ! 🏆",
  "Légendaire x{N} ! ✨",
  "x{N} ! Le zoo s'agrandit !",
  "MAESTRO x{N} 👑",
  "x{N} ! Phénoménal !",
  "Le zoo recrute ! x{N}",
];

// Pools d'emojis « décor » du zoo, piochés au hasard selon le contexte :
//   PLANTS / FOODS : récompenses de combo (végétation et nourriture du zoo).
//   JUNK           : objets rigolos trouvés à la place d'un animal en cas d'erreur
//                    (jamais blessant — on a « trouvé autre chose », pas raté).
//   KEEPERS        : soigneurs, la récompense rare des très gros combos (×10+).
//   CELEBRATIONS   : emojis de fête réservés aux parties parfaites (zéro erreur).
//   PERFECT_LABELS : phrases de félicitations pour ces mêmes parties parfaites.
const PLANTS = ["🪴", "🌵", "🌴", "🌲", "🌳", "🌱", "🌻", "🌼", "🌷", "🌹", "🌿", "🌾", "🪻", "🌸", "🌺", "🪷", "🎋", "🍄"];
// Sous-ensembles utilisés UNIQUEMENT pour le décor du refuge (tileForEntry).
// Les boîtes 4 (vert clair) accueillent de petites plantes / fleurs au ras du
// sol ; les boîtes 5 (vert foncé) accueillent les grands arbres et les hautes
// herbes. La répartition est arbitraire : tous restent dans PLANTS pour la
// collecte via combos. Si un emoji est ajouté à PLANTS plus tard, n'oublie pas
// de l'ajouter aussi à l'un des deux sous-ensembles si tu veux qu'il puisse
// apparaître sur la grille du refuge.
const SMALL_PLANTS_POOL = ["🌱", "🌿", "🌻", "🌼", "🌷", "🌹", "🪻", "🌸", "🌺", "🪷", "🍄"];
const BIG_PLANTS_POOL   = ["🪴", "🌵", "🌴", "🌲", "🌳", "🌾", "🎋"];
const FOODS  = ["🍌", "🥩", "🌽", "🥕", "🥜", "🥬", "🍎", "🍖", "🧀", "🦴", "🐟", "🍯"];
const JUNK   = ["🎩","🎺","🔋","🖨️","🪠","🏺","🩲","☎️","🪗","♟️","🛼","🧻","🎻","🧲","🧸","🪆","🪒","🪑","📠","📺","🎰","🥁","🎷","🗿"];
const KEEPERS = ["👩🏻‍⚕️","👩🏼‍⚕️","👩🏽‍⚕️","👩🏿‍⚕️","👨🏻‍⚕️","👨🏼‍⚕️","👨🏽‍⚕️","👨🏿‍⚕️","🎅🏻","👩🏻‍🌾","👩🏼‍🌾","👨🏻‍🌾","🦸🏻‍♀️","🧑🏻‍🍳","🧑🏻‍🚒","🧑🏻‍🔬","🧙🏻‍♀️","🧑🏻‍🦳"];
const CELEBRATIONS = ["🎂","🍾","🤸🏼‍♀️","🤸🏻‍♀️","🤸🏽‍♀️","🏆","🥇","🚀","💃","🕺","💪","👌","👍","👏","🫶","🙌","👯‍♀️","👯","🎉","🪇"];
const PERFECT_LABELS = [
  "Sans-faute légendaire !",
  "Aucune erreur ! Mais ÇA c'est fort !",
  "Parfait ! Bravo !",
  "Tout juste ! Champion(ne) !",
  "ZÉRO erreur, MILLE applaudissements !",
  "Top du top ! Sans aucune faute !",
];

// COMBO_REWARDS = barème fait main des récompenses pour les combos 3 à 9.
//   p = nombre de plantes, f = nombre de nourritures, k = nombre de soigneurs.
// Les combos 2 ne donnent rien (juste un encouragement) ; les combos ≥ 10 sont
// calculés par formule dans computeReward() plutôt que listés ici.
const COMBO_REWARDS = {
  3:  { p: 1, f: 0, k: 0 },
  4:  { p: 0, f: 1, k: 0 },
  5:  { p: 2, f: 0, k: 0 },
  6:  { p: 0, f: 2, k: 0 },
  7:  { p: 1, f: 2, k: 0 },
  8:  { p: 2, f: 2, k: 0 },
  9:  { p: 0, f: 5, k: 0 },
};

// ─── Utils ────────────────────────────────────────────────────────────────────
// Deux micro-helpers utilisés partout. shuffle() renvoie une COPIE mélangée
// (il ne modifie pas le tableau d'entrée) ; le tri par Math.random() suffit
// largement pour un jeu — pas besoin d'un vrai Fisher-Yates ici.
const rand = a => a[Math.floor(Math.random() * a.length)];
const shuffle = a => [...a].sort(() => Math.random() - 0.5);

// ─── Daily seeded random helpers ─────────────────────────────────────────────
// But : avoir un hasard qui CHANGE chaque jour mais reste STABLE sur 24 h, pour
// que la décoration du menu ne « clignote » pas à chaque rendu. On ne peut pas
// utiliser Math.random() (instable) ni une constante (jamais de nouveauté).
//
// dailyHash() = hachage déterministe (variante FNV-1a + mélange supplémentaire)
// d'une date + un « sel ». Même date + même sel ⇒ toujours le même entier.
// Changer de jour ⇒ entier différent. Changer de sel ⇒ valeur indépendante,
// ce qui permet de tirer plusieurs nombres « du jour » sans qu'ils soient liés.
function dailyHash(dateStr, salt) {
  const s = dateStr + "|" + salt;
  let h = 2166136261;
  for (let i = 0; i < s.length; i++) {
    h = ((h ^ s.charCodeAt(i)) * 16777619) >>> 0;
  }
  // Extra mix
  h = ((h ^ (h >>> 13)) * 0x5bd1e995) >>> 0;
  return (h ^ (h >>> 15)) >>> 0;
}

// Three small emojis that change every day: one tier-3 animal, one tier-2 animal,
// and one plant or food. Used to enliven the menu title.
function dailyEmojiTrio() {
  const today = todayStr();
  const tables = [2, 3, 4, 5, 6, 7, 8, 9];
  const halves = ["low", "high"];

  const a3 = tables[dailyHash(today, "t3-tbl") % tables.length];
  const h3 = halves[dailyHash(today, "t3-half") % 2];
  const tier3 = TABLES[a3][h3].animals[3];

  const a2 = tables[dailyHash(today, "t2-tbl") % tables.length];
  const h2 = halves[dailyHash(today, "t2-half") % 2];
  const tier2 = TABLES[a2][h2].animals[2];

  const pool = (dailyHash(today, "veg-which") % 2 === 0) ? PLANTS : FOODS;
  const item = pool[dailyHash(today, "veg-idx") % pool.length];

  return [tier3, tier2, item];
}

// ─── Profiles & persistence ──────────────────────────────────────────────────
// Cœur du stockage. Tout vit dans localStorage. Ne touche à cette section
// qu'avec prudence : c'est elle qui protège la progression réelle des enfants.
//
// AVATARS     = choix d'avatars proposés à la création de profil.
// STORAGE_KEY = ADRESSE du coffre localStorage du jeu. ⚠️ Ce n'est PAS un
//               numéro de version : c'est un espace de nommage, GELÉ À VIE. Le
//               « v2 » qu'elle contient est un vestige historique, pas la
//               version courante. La changer orphelinerait toutes les
//               sauvegardes des enfants — ne JAMAIS la modifier.
const AVATARS = ["🐶", "🐷", "🐭", "🐻", "🦊", "🐰", "🐼", "🐨", "🐯", "🐸", "🐙"];

// ─── Série (« streak ») : encouragement visuel ───────────────────────────────
// 21 tiers de base. Au-delà, on préfixe avec autant de 🔥 que nécessaire et on
// reboucle sur la base. Ex. : série 22 → "🔥👍", série 42 → "🔥🔥", 43 → "🔥🔥👍".
// 👋 est réservé au cas « série = 0 » (jamais joué, ou série cassée).
const STREAK_TIERS = ["👍","👌","👏","🙌","🤘","🤙","🫰","🫶","⭐","🌟","💫","✨","💛","🧡","🩷","💓","💗","💖","♥️","❤️‍🔥","🔥"];
// Pool de chats pour les jours joués (un chat est tiré aléatoirement mais
// DÉTERMINISTE par date via dailyHash — même jour = même chat à tous les rendus).
const STREAK_CATS = ["🐱","😺","😸","😹","😻"];

function streakTier(n) {
  if (n <= 0) return "👋";
  const base = STREAK_TIERS.length; // 21
  const prefixes = Math.floor((n - 1) / base);
  const baseIdx = (n - 1) % base;
  return "🔥".repeat(prefixes) + STREAK_TIERS[baseIdx];
}
const STORAGE_KEY = "mathiko_v2";

// SCHEMA_VERSION = version du FORMAT des données sauvegardées (un entier).
// À ne pas confondre avec VERSION (produit) ni REVISION (fichier) — voir le
// bloc CHANGELOG en tête de fichier. Il ne bouge QUE lorsque la FORME des
// données stockées change, et chaque incrément doit avoir son palier dans
// migrate(). L'« historique des migrations » ci-dessous est SPÉCIFIQUE au
// schéma de données — c'est distinct du CHANGELOG des révisions de fichier.
// Migration history:
//   v1 → v2 : added `leitner` field per profile (Session 2)
//   v2 → v3 : added `dailyChallenge` field per profile (Session 4)
//   v3 → v4 : added `zoodex` field per profile (Zoodex)
//   v4 → v5 : added `records` field per profile (Tableau des records)
//   v5 → v6 : added `refuge` field per profile (mécanique « Accueillir un animal »)
//   v6 → v7 : added `streak.playedDates` per profile (ruban 7 jours de la série)
//   v7 → v8 : added `zoodex.plants` / `.foods` / `.keepers` (journal des découvertes)
const SCHEMA_VERSION = 8;

// ─── Paramètres du système de Leitner (répétition espacée) ─────────────────
// LEITNER_INTERVAL_DAYS : pour chaque boîte, le nombre de jours à attendre avant
//   que le calcul redevienne « à réviser ». La progression 0→1→2→4→6→16 est
//   volontairement croissante : plus un calcul est maîtrisé, plus on l'espace.
//   Modifier ces valeurs change directement le rythme d'apprentissage du jeu.
// LEITNER_BOX_NAMES : nom « lisible » de chaque boîte (côté refuge/zoo). Plusieurs
//   boîtes partagent un même nom volontairement, pour simplifier le récit enfant.
const LEITNER_INTERVAL_DAYS = { 0: 0, 1: 1, 2: 2, 3: 4, 4: 6, 5: 16 };
const LEITNER_BOX_NAMES = {
  0: "À préparer",
  1: "En préparation",
  2: "En préparation",
  3: "En préparation",
  4: "Enclos prêt !",
  5: "Enclos prêt !",
};

// ALL_CALC_KEYS = les 64 clés de calcul "a-b" (a, b de 2 à 9). C'est l'univers
// complet du jeu : toute boucle qui « parcourt tous les calculs » itère dessus.
// calcKey() est LA fonction canonique pour fabriquer ces clés — voir halfKey()
// pour la même remarque : ne concatène jamais "a-b" à la main ailleurs.
const ALL_CALC_KEYS = (() => {
  const keys = [];
  for (let a = 2; a <= 9; a++) for (let b = 2; b <= 9; b++) keys.push(`${a}-${b}`);
  return keys;
})();
const calcKey = (a, b) => `${a}-${b}`;

// Today as ISO date string (YYYY-MM-DD), local time
function todayStr() {
  const d = new Date();
  const yyyy = d.getFullYear();
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  const dd = String(d.getDate()).padStart(2, "0");
  return `${yyyy}-${mm}-${dd}`;
}

// Add `days` days to an ISO date string and return the result
function addDays(iso, days) {
  const d = new Date(iso + "T00:00:00");
  d.setDate(d.getDate() + days);
  const yyyy = d.getFullYear();
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  const dd = String(d.getDate()).padStart(2, "0");
  return `${yyyy}-${mm}-${dd}`;
}

// Days between two ISO date strings (a - b)
function daysBetween(a, b) {
  if (!a || !b) return null;
  const da = new Date(a + "T00:00:00");
  const db = new Date(b + "T00:00:00");
  return Math.round((da - db) / (1000 * 60 * 60 * 24));
}

// dueShort = libellé COURT d'échéance Leitner, pour l'écran « Suivi détaillé ».
// nextDue / today sont des dates ISO "YYYY-MM-DD". Renvoie :
//   - null                       si le calcul n'a pas d'échéance (jamais vu) ;
//   - { due:true,  label:"…" }    si l'échéance est aujourd'hui ou dépassée ;
//   - { due:false, label:"…" }    sinon (échéance future : « demain », « dans
//                                  N j », ou la date JJ/MM si c'est lointain).
function dueShort(nextDue, today) {
  if (!nextDue) return null;
  const d = daysBetween(nextDue, today);
  if (d === null) return null;
  if (d <= 0) return { due: true, label: "à revoir" };
  if (d === 1) return { due: false, label: "demain" };
  if (d <= 6) return { due: false, label: `dans ${d} j` };
  const [, mm, dd] = nextDue.split("-");
  return { due: false, label: `${dd}/${mm}` };
}

// Build a fresh Leitner table: every multiplication starts in box 0, never seen
function makeLeitner() {
  const t = {};
  for (const k of ALL_CALC_KEYS) {
    t[k] = { box: 0, nextDue: null, lastSeen: null, streak: 0, attempts: 0 };
  }
  return t;
}

// Update a Leitner entry after an answer. `correct` boolean.
// `opts.noRegress`: when true, a wrong answer never changes the box (streak
//   resets, lastSeen and nextDue still update). ⚠️  Depuis la v13, plus aucun
//   appelant ne passe cette option : le mode "play" (Mission d'entraînement)
//   ne touche plus du tout au Leitner (handleSubmit saute l'appel en entier).
//   L'option reste dans le helper pour un usage défensif futur.
//
// Failure transitions in non-play modes:
//   0 → 0   (no longer promotes — wrong on a never-tried calc just marks it tried)
//   1 → 1   (stays)
//   2 → 1   (down 1)
//   3 → 2   (down 1)
//   4 → 3   (down 1)
//   5 → 3   (down 2, soft fall protecting mastery)
function updateLeitnerEntry(entry, correct, opts = {}) {
  const today = todayStr();
  let { box, streak, attempts } = entry || { box: 0, streak: 0, attempts: 0 };
  attempts = attempts + 1;
  if (correct) {
    streak = streak + 1;
    box = Math.min(5, box + 1);
  } else {
    streak = 0;
    if (!opts.noRegress) {
      // Compute new box:
      //  - 0 and 1: stay
      //  - 5: drop to 3 (soft fall, saut de 2)
      //  - else (2, 3, 4): drop by 1
      if (box <= 1)        box = box;
      else if (box === 5)  box = 3;
      else                 box = box - 1;
    }
    // opts.noRegress: box stays unchanged regardless
  }
  return {
    box,
    streak,
    attempts,
    lastSeen: today,
    nextDue: addDays(today, LEITNER_INTERVAL_DAYS[box]),
  };
}

// A fresh records block
function makeRecords() {
  return {
    bestTimeMs: null,        // fastest correct answer, in milliseconds
    biggestCalc: null,       // { a, b } of the biggest correct calc
    totalCalcsSolved: 0,     // total correct answers across all games
    animalsByTier: [0, 0, 0, 0],  // animals saved per speed tier
  };
}

// A fresh refuge block.
// `refuge.families[famKey]` suit, par famille (les 16 demi-tables), combien
// d'animaux y ont été accueillis (count, 0 à 4) et la date du dernier succès
// (lastWelcomeDate, ISO "YYYY-MM-DD" — sert au cap quotidien « 1 par famille
// par jour »). Le placement visuel des animaux sur la grille du refuge est
// re-tiré aléatoirement chaque jour (voir dailyShuffleCells / getCellAnimal).
function makeRefuge() {
  const families = {};
  for (let t = 2; t <= 9; t++) {
    for (const h of ["low", "high"]) {
      families[`${t}-${h}`] = { count: 0, lastWelcomeDate: null };
    }
  }
  return { families };
}

// Make a fresh profile object.
// ⚠️  C'est ICI qu'est défini le SCHÉMA d'un profil. Si tu ajoutes un champ,
// pense à : (1) l'ajouter ici, (2) écrire une migration dans migrate() pour les
// profils déjà existants, (3) incrémenter SCHEMA_VERSION. Voir le guide en tête
// de fichier, §5. L'id mélange timestamp + suffixe aléatoire pour rester unique.
function makeProfile(name, avatar) {
  return {
    id: `p_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
    name: name.trim() || "Joueur",
    avatar: avatar || rand(AVATARS),
    createdAt: todayStr(),
    streak: { current: 0, best: 0, lastPlayed: null, playedDates: [] },
    leitner: makeLeitner(),
    dailyChallenge: { lastCompletedDate: null, history: [] },
    zoodex: { animals: {}, plants: {}, foods: {}, keepers: {} },
    records: makeRecords(),
    refuge: makeRefuge(),
  };
}

// Migrate a stored object up to SCHEMA_VERSION. Always idempotent.
//
// COMMENT ÇA MARCHE : on applique en CASCADE de petits paliers `if (s.version < N)`.
// Un profil créé sous une vieille version traverse tous les paliers manquants un
// par un jusqu'à SCHEMA_VERSION. Un profil déjà à jour ne déclenche aucun palier.
//
// POUR AJOUTER UNE MIGRATION (nouveau champ de profil) :
//   1. Incrémente SCHEMA_VERSION (ex. 5 → 6).
//   2. Ajoute `if (s.version < 6) { s = { ...s, version: 6, profiles: ... }; }`
//      juste avant le commentaire "Future:" ci-dessous.
//   3. Pense au filet de sécurité plus bas si le champ est critique.
//
// RÈGLE D'OR : migrate() doit être IDEMPOTENTE — la relancer sur des données
// déjà migrées ne doit rien casser. Ne SUPPRIME jamais un ancien palier.
function migrate(rawStore) {
  let s = rawStore || { profiles: [], currentProfileId: null };
  // Implicit v1 (or fresh): no version field
  if (!s.version) s = { ...s, version: 1 };

  if (s.version < 2) {
    // v1 → v2: ensure each profile has a `leitner` table
    s = {
      ...s,
      version: 2,
      profiles: (s.profiles || []).map(p => ({
        ...p,
        leitner: p.leitner || makeLeitner(),
      })),
    };
  }
  if (s.version < 3) {
    // v2 → v3: ensure each profile has a `dailyChallenge` block
    s = {
      ...s,
      version: 3,
      profiles: (s.profiles || []).map(p => ({
        ...p,
        dailyChallenge: p.dailyChallenge || { lastCompletedDate: null, history: [] },
      })),
    };
  }
  if (s.version < 4) {
    // v3 → v4: ensure each profile has a `zoodex` block
    s = {
      ...s,
      version: 4,
      profiles: (s.profiles || []).map(p => ({
        ...p,
        zoodex: p.zoodex || { animals: {} },
      })),
    };
  }
  if (s.version < 5) {
    // v4 → v5: ensure each profile has a `records` block
    s = {
      ...s,
      version: 5,
      profiles: (s.profiles || []).map(p => ({
        ...p,
        records: p.records || makeRecords(),
      })),
    };
  }
  if (s.version < 6) {
    // v5 → v6: ajout de `refuge` par profil (mécanique « Accueillir un animal »).
    // Les profils existants partent à count=0 pour les 16 familles : leur Zoodex
    // (collection d'animaux rencontrés) reste intact, mais leur grille de refuge
    // commence vide d'animaux — c'est par les nouveaux mini-jeux qu'ils seront
    // accueillis. C'est le grandfathering propre.
    s = {
      ...s,
      version: 6,
      profiles: (s.profiles || []).map(p => ({
        ...p,
        refuge: p.refuge || makeRefuge(),
      })),
    };
  }
  if (s.version < 7) {
    // v6 → v7: ajout de `streak.playedDates` (historique des derniers jours
    // joués) — sert au ruban des 7 derniers jours et à la règle 😎/⚪. Pour
    // les profils existants, on initialise avec lastPlayed si présent (on
    // préserve ainsi au moins un jour connu) ; sinon vide.
    s = {
      ...s,
      version: 7,
      profiles: (s.profiles || []).map(p => {
        const st = p.streak || { current: 0, best: 0, lastPlayed: null };
        const playedDates = st.playedDates || (st.lastPlayed ? [st.lastPlayed] : []);
        return { ...p, streak: { ...st, playedDates } };
      }),
    };
  }
  if (s.version < 8) {
    // v7 → v8 : extension du Zoodex avec trois nouvelles sous-collections —
    // `plants`, `foods`, `keepers` — mappant emoji → nombre d'apparitions au
    // cours des parties. Sert à : (1) un journal complet des découvertes dans
    // l'écran Zoodex, et (2) filtrer le décor du refuge (seuls les emojis
    // déjà découverts peuvent décorer une case). Profils existants : on
    // initialise les trois objets à vide (la collecte démarre à la prochaine
    // partie ; les sessions passées ne sont pas reconstituables).
    s = {
      ...s,
      version: 8,
      profiles: (s.profiles || []).map(p => {
        const zd = p.zoodex || { animals: {} };
        return {
          ...p,
          zoodex: {
            animals: zd.animals || {},
            plants:  zd.plants  || {},
            foods:   zd.foods   || {},
            keepers: zd.keepers || {},
          },
        };
      }),
    };
  }
  // Future: if (s.version < 9) s = migrate_v8_to_v9(s);

  // ── Safety net (runs at every load, regardless of version) ──
  // If a required field is missing (null/undefined) due to corruption — e.g.
  // a past bug that wiped a profile's leitner — recreate it with defaults.
  // This means a corrupted profile gets a fresh-but-empty leitner rather than
  // staying broken. We don't try to *recover* lost data (impossible), but we
  // prevent the profile from being unusable.
  s = {
    ...s,
    profiles: (s.profiles || []).map(p => {
      const fixed = { ...p };
      if (!fixed.leitner || typeof fixed.leitner !== "object" || Object.keys(fixed.leitner).length === 0) {
        fixed.leitner = makeLeitner();
      }
      if (!fixed.dailyChallenge || typeof fixed.dailyChallenge !== "object") {
        fixed.dailyChallenge = { lastCompletedDate: null, history: [] };
      }
      if (!fixed.streak || typeof fixed.streak !== "object") {
        fixed.streak = { current: 0, best: 0, lastPlayed: null, playedDates: [] };
      }
      if (!Array.isArray(fixed.streak.playedDates)) {
        fixed.streak = { ...fixed.streak, playedDates: fixed.streak.lastPlayed ? [fixed.streak.lastPlayed] : [] };
      }
      if (!fixed.zoodex || typeof fixed.zoodex !== "object") {
        fixed.zoodex = { animals: {}, plants: {}, foods: {}, keepers: {} };
      }
      if (!fixed.zoodex.animals || typeof fixed.zoodex.animals !== "object") {
        fixed.zoodex = { ...fixed.zoodex, animals: {} };
      }
      for (const k of ["plants", "foods", "keepers"]) {
        if (!fixed.zoodex[k] || typeof fixed.zoodex[k] !== "object") {
          fixed.zoodex = { ...fixed.zoodex, [k]: {} };
        }
      }
      if (!fixed.records || typeof fixed.records !== "object") {
        fixed.records = makeRecords();
      }
      if (!fixed.refuge || typeof fixed.refuge !== "object" ||
          !fixed.refuge.families || typeof fixed.refuge.families !== "object") {
        fixed.refuge = makeRefuge();
      }
      return fixed;
    }),
  };

  return s;
}

// Load whole storage blob (or fresh if absent), running migrations.
// Tout est enveloppé dans try/catch : un localStorage indisponible (mode privé,
// quota plein, JSON corrompu…) ne doit JAMAIS planter le jeu — on retombe alors
// sur un store vide tout neuf plutôt que de crasher.
function loadStore() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return { version: SCHEMA_VERSION, profiles: [], currentProfileId: null };
    const parsed = JSON.parse(raw);
    return migrate(parsed);
  } catch (e) {
    return { version: SCHEMA_VERSION, profiles: [], currentProfileId: null };
  }
}

function saveStore(store) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(store));
  } catch (e) { /* swallow quota errors etc. */ }
}

// Update streak when a game ends today.
// Le « streak » = nombre de jours CONSÉCUTIFS où l'enfant a joué. Logique :
//   • déjà joué aujourd'hui  → rien ne bouge (on ne compte qu'une fois par jour).
//   • dernière partie hier   → +1 (la série continue).
//   • trou d'un ou plusieurs jours, ou première partie → la série repart à 1.
// ─── Série : logique de calcul ───────────────────────────────────────────────
// Règle d'or : la série tolère 1 jour manqué isolé. Elle ne se casse qu'au
// 2e jour manqué consécutif. Concrètement :
//   - lastPlayed = aujourd'hui            → série active, compteur exact
//   - lastPlayed = hier                   → série active, compteur exact
//   - lastPlayed = avant-hier             → série EN SURSIS (1 jour manqué hier),
//                                           encore active si on joue aujourd'hui ;
//                                           le compteur affiché reste celui d'avant
//   - lastPlayed ≥ 3 jours en arrière     → série cassée → compteur effectif = 0
//
// La valeur stockée `streak.current` ne « redescend » jamais toute seule (elle
// ne bouge qu'au moment d'une partie). Pour l'AFFICHAGE en temps réel, on passe
// donc par effectiveStreak() qui retourne 0 si la série est cassée.
function effectiveStreak(profile, today) {
  const last = profile && profile.streak && profile.streak.lastPlayed;
  if (!last) return 0;
  const gap = daysBetween(today, last); // jours écoulés depuis lastPlayed
  if (gap === null || gap < 0 || gap > 2) return 0;
  return (profile.streak.current || 0);
}

// Renvoie un tableau de 7 items (du plus ancien à aujourd'hui, AUJOURD'HUI à
// droite) pour le ruban de la série. Chaque item est { kind, emoji } parmi :
//   - { kind:"played",        emoji: <chat aléatoire stable par date> }
//   - { kind:"today-pending", emoji:"⚪" }   → aujourd'hui pas encore validé
//   - { kind:"soft-miss",     emoji:"😎" }  → 1er jour manqué d'un trou
//                                            (jour précédent était joué)
//   - { kind:"deep-miss",     emoji:"⚪" }   → 2e jour manqué consécutif (et +)
//                                            OU avant l'existence du profil
//
// La règle 🥶 a été abandonnée en v15 au profit d'une représentation à 3
// glyphes seulement (chat / 😎 / ⚪). Le ruban reflète FIDÈLEMENT l'historique
// (pas de masquage en cas de série cassée) : si la série est à 0 mais qu'il y a
// eu des jours joués dans la fenêtre, les chats restent visibles — seul le
// tier passe à 👋 pour indiquer que la série est cassée. Le cas « jamais joué »
// produit naturellement ⚪⚪⚪⚪⚪⚪⚪ via la règle générale.
function streakWindow(profile, today) {
  const played = new Set((profile && profile.streak && profile.streak.playedDates) || []);
  const out = [];
  for (let i = 6; i >= 0; i--) {
    const d = addDays(today, -i);
    if (i === 0 && !played.has(d)) {
      out.push({ kind: "today-pending", emoji: "⚪" });
    } else if (played.has(d)) {
      const cat = STREAK_CATS[dailyHash(d, "streak-cat") % STREAK_CATS.length];
      out.push({ kind: "played", emoji: cat });
    } else {
      const prevD = addDays(today, -i - 1);
      const prevPlayed = played.has(prevD);
      out.push(prevPlayed
        ? { kind: "soft-miss", emoji: "😎" }
        : { kind: "deep-miss", emoji: "⚪" });
    }
  }
  return out;
}

// Met à jour la série pour le jour courant (appelé en fin de partie). Tolère
// 1 jour manqué isolé : si lastPlayed était hier OU avant-hier, on incrémente ;
// sinon (lastPlayed ≥ 3 jours en arrière, ou aucun) on redémarre à 1.
// `best` retient le record absolu et ne redescend jamais.
// `playedDates` est l'historique des derniers jours joués, dédupliqué, trié
// croissant et capé à 14 jours — il sert au ruban des 7 derniers jours et à
// la détection des trous (règle 😎/⚪).
function updateStreakForToday(profile) {
  const t = todayStr();
  const last = profile.streak?.lastPlayed;
  let current = profile.streak?.current || 0;
  let best = profile.streak?.best || 0;
  let playedDates = (profile.streak?.playedDates || []).slice();
  if (last === t) {
    // already played today, nothing changes
  } else {
    const gap = last ? daysBetween(t, last) : null;
    if (gap === 1 || gap === 2) current = current + 1;   // tolérance 1 jour
    else current = 1;                                    // reset (ou première fois)
  }
  best = Math.max(best, current);
  // Append today, dedup, sort asc, cap to last 14
  if (!playedDates.includes(t)) playedDates.push(t);
  playedDates = [...new Set(playedDates)].sort().slice(-14);
  return { ...profile, streak: { current, best, lastPlayed: t, playedDates } };
}

// tierIdx = traduit un TEMPS de réponse (en secondes) en un « tier » de 0 à 3.
// 0 = foudroyant (< 2 s) … 3 = tranquille (≥ 6 s). Ce tier sert d'index dans
// TIER_CAT, TIER_LABELS et animals[] : c'est lui qui récompense la rapidité en
// donnant l'animal le plus prestigieux aux réponses les plus rapides.
function tierIdx(e) {
  if (e < 2) return 0;
  if (e < 4) return 1;
  if (e < 6) return 2;
  return 3;
}

// genQs = générateur de questions SIMPLE, sans Leitner. Tirage uniformément
// aléatoire dans les demi-tables choisies. Utilisé uniquement en repli quand il
// n'y a pas de profil courant (cas rare). Le vrai moteur est genQsLeitner ci-dessous.
// La logique « bag » (sac que l'on vide puis remélange) évite les répétitions
// rapprochées tant que le sac n'est pas épuisé.
function genQs(halves, n) {
  const pool = halves.flatMap(hk => {
    const [tStr, h] = hk.split("-");
    const t = +tStr;
    // low → b in [2,3,4,5], high → b in [6,7,8,9]
    const bs = h === "low" ? [2, 3, 4, 5] : [6, 7, 8, 9];
    return bs.map(b => ({ a: t, b, ans: t * b, half: h }));
  });
  if (pool.length === 0) return [];
  const out = [];
  let bag = shuffle(pool);
  while (out.length < n) {
    if (bag.length === 0) bag = shuffle(pool);
    out.push(bag.pop());
  }
  return out;
}

// ─── Leitner-aware question generation ───────────────────────────────────────
// genQsLeitner = LE moteur de génération de questions du jeu. C'est lui qui décide
// QUELS calculs l'enfant va voir, en croisant les demi-tables choisies avec l'état
// Leitner de chaque calcul. Chaque MODE de jeu correspond à un filtre différent.
//
// 👉 POUR AJOUTER UN MODE DE JEU : ajoute un `else if (mode === "tonmode")` dans
//    l'étape 3 (filtrage des candidats), puis une fonction startXxx() et un bouton.
//    Si ton mode n'est pas "play", il utilisera automatiquement le tirage simple
//    de l'étape 4 (« petits calculs d'abord + jitter »).
//
// Build the pool from selected halves, then apply mode-specific filtering and
// weighting on top of Leitner state.
//
// Modes:
//   "play"      → standard mix: dues first, then in-progress, then new
//                 (60% due / 30% in_progress / 10% new), excludes box 5
//   "build"     → only box 0 and 1 (friche + just-discovered)
//   "cultivate" → only box 2 and 3 (in preparation)
//   "challenge" → only due, non-mastered (used for daily challenge later)
//
// Within the chosen pool, smaller calculations (smaller a+b) are preferred,
// with a small random jitter so it doesn't always pick the same one.
// If the resulting pool is empty, we fall back to all non-mastered.
function genQsLeitner(halves, n, leitner, mode = "play") {
  // 1) Build pool of all eligible (a, b) from selected halves
  const pool = halves.flatMap(hk => {
    const [tStr, h] = hk.split("-");
    const t = +tStr;
    const bs = h === "low" ? [2, 3, 4, 5] : [6, 7, 8, 9];
    return bs.map(b => ({ a: t, b, ans: t * b, half: h, key: calcKey(t, b) }));
  });
  if (pool.length === 0) return [];

  const today = todayStr();

  // 2) Tag with Leitner data
  const tagged = pool.map(q => {
    const e = leitner[q.key] || {};
    const box = e.box || 0;
    return {
      ...q,
      _box: box,
      _seen: !!e.lastSeen,
      _due: !!(e.nextDue && e.nextDue <= today),
    };
  });

  // 3) Filter candidates per mode
  // ⚠️  Si tu modifies les filtres ci-dessous, applique LE MÊME changement dans
  // calcsForMode() (helper en lecture seule du Suivi détaillé). Les deux doivent
  // rester synchronisés pour que les chiffres affichés correspondent au jeu réel.
  let candidates;
  if (mode === "build") {
    // Aménager : calculs en début de chantier (boîtes 1 et 2).
    candidates = tagged.filter(q => q._box >= 1 && q._box <= 2);
  } else if (mode === "cultivate") {
    // Cultiver : calculs en route vers la maîtrise (boîtes 3 et 4).
    candidates = tagged.filter(q => q._box >= 3 && q._box <= 4);
  } else if (mode === "challenge") {
    candidates = tagged.filter(q => q._due && q._box < 5);
  } else if (mode === "clearing") {
    // Défricher : cases boîte 0 qui ont déjà été VUES (tentées au moins une fois,
    // sans succès stable) OU qui sont en BORDURE d'une zone explorée (≥ un voisin
    // de boîte > 0). C'est le mode « catch-all » des calculs box 0 à reprendre.
    candidates = tagged.filter(q => {
      if (q._box !== 0) return false;
      if (q._seen) return true; // déjà vue
      for (let da = -1; da <= 1; da++) {
        for (let db = -1; db <= 1; db++) {
          if (da === 0 && db === 0) continue;
          const na = q.a + da, nb = q.b + db;
          if (na < 2 || na > 9 || nb < 2 || nb > 9) continue;
          const ne = leitner[calcKey(na, nb)] || {};
          if ((ne.box || 0) > 0) return true; // en bordure
        }
      }
      return false;
    });
  } else {
    // "play" (Mission d'entraînement) : exclut les calculs maîtrisés.
    candidates = tagged.filter(q => q._box < 5);
  }
  // Fallbacks if filter yields empty
  if (candidates.length === 0) candidates = tagged.filter(q => q._box < 5);
  if (candidates.length === 0) candidates = tagged;

  // 4) Picking algorithm
  // For "play" mode: keep the original category-weighted picking (60/30/10)
  // For special modes: pick directly from filtered pool, smaller (a+b) first + jitter
  if (mode === "play") {
    const cats = { due: [], in_progress: [], new: [], mastered: [] };
    for (const q of candidates) {
      let cat;
      if (q._box === 5) cat = "mastered";
      else if (!q._seen) cat = "new";
      else if (q._due) cat = "due";
      else cat = "in_progress";
      cats[cat].push(q);
    }
    const weights = { due: 0.6, in_progress: 0.3, new: 0.1, mastered: 0 };

    function pickCategory() {
      const total = Object.entries(weights).reduce((sum, [c, w]) =>
        sum + (cats[c].length > 0 ? w : 0), 0);
      if (total <= 0) {
        for (const c of ["due", "in_progress", "new", "mastered"]) {
          if (cats[c].length > 0) return c;
        }
        return null;
      }
      let r = Math.random() * total;
      for (const [c, w] of Object.entries(weights)) {
        if (cats[c].length === 0) continue;
        r -= w;
        if (r <= 0) return c;
      }
      return null;
    }

    function pickFromCategory(cat) {
      if (cats[cat].length === 0) return null;
      return [...cats[cat]].sort((x, y) =>
        ((x.a + x.b) + Math.random() * 1.5) - ((y.a + y.b) + Math.random() * 1.5)
      )[0];
    }

    const out = [];
    const snapshot = JSON.parse(JSON.stringify(cats));
    while (out.length < n) {
      const c = pickCategory();
      if (!c) {
        for (const k of Object.keys(cats)) cats[k] = [...snapshot[k]];
        continue;
      }
      const q = pickFromCategory(c);
      if (!q) continue;
      cats[c] = cats[c].filter(x => x.key !== q.key);
      out.push({ a: q.a, b: q.b, ans: q.ans, half: q.half });
    }
    return out;
  }

  // Special modes: simple pick within candidates
  function pickFrom(arr) {
    if (arr.length === 0) return null;
    return [...arr].sort((x, y) =>
      ((x.a + x.b) + Math.random() * 1.5) - ((y.a + y.b) + Math.random() * 1.5)
    )[0];
  }

  const out = [];
  const snap = [...candidates];
  let bag = [...snap];
  while (out.length < n) {
    if (bag.length === 0) bag = [...snap];
    const q = pickFrom(bag);
    if (!q) break;
    bag = bag.filter(x => x.key !== q.key);
    out.push({ a: q.a, b: q.b, ans: q.ans, half: q.half });
  }
  return out;
}

// ─── calcsForMode : éligibilité des calculs par mini-jeu (lecture seule) ──────
// Renvoie, sur les 64 calculs, ceux qu'un mode d'ENTRETIEN proposerait.
// Sert à l'écran « Suivi détaillé » pour montrer ce que chaque mini-jeu piochera.
//
// ⚠️  SYNCHRONISATION : cette fonction REPRODUIT volontairement l'étape 3
// (filtrage des candidats) de genQsLeitner, pour les modes "build", "cultivate",
// "challenge" et "clearing". C'est un doublon ASSUMÉ : il garantit zéro risque
// pour le moteur de jeu. Si tu modifies les filtres de genQsLeitner (étape 3),
// applique EXACTEMENT le même changement ici — et inversement.
//
// Note : "play" (Mission d'entraînement) n'est pas géré ici — ce n'est pas un
// filtre fixe mais un mélange pondéré ; et "target" est contextuel (case + voisines).
// Chaque entrée renvoyée : { key, a, b, box, seen, due }.
function calcsForMode(leitner, mode) {
  const today = todayStr();
  const tagged = ALL_CALC_KEYS.map(k => {
    const [a, b] = k.split("-").map(Number);
    const e = leitner[k] || {};
    return {
      key: k, a, b,
      box: e.box || 0,
      seen: !!e.lastSeen,
      due: !!(e.nextDue && e.nextDue <= today),
    };
  });
  if (mode === "build") return tagged.filter(q => q.box >= 1 && q.box <= 2);
  if (mode === "cultivate") return tagged.filter(q => q.box >= 3 && q.box <= 4);
  if (mode === "challenge") return tagged.filter(q => q.due && q.box < 5);
  if (mode === "clearing") {
    // Box 0 « déjà vues » OU en bordure de zone explorée.
    return tagged.filter(q => {
      if (q.box !== 0) return false;
      if (q.seen) return true;
      for (let da = -1; da <= 1; da++) {
        for (let db = -1; db <= 1; db++) {
          if (da === 0 && db === 0) continue;
          const na = q.a + da, nb = q.b + db;
          if (na < 2 || na > 9 || nb < 2 || nb > 9) continue;
          const ne = leitner[calcKey(na, nb)] || {};
          if ((ne.box || 0) > 0) return true;
        }
      }
      return false;
    });
  }
  return [];
}

// ─── Mini-jeu « Accueillir un animal » — helpers en lecture seule ────────────
// Ces helpers sont AUTONOMES (purement fonctionnels). Ils servent à l'éligibilité,
// au placement quotidien des animaux sur la grille du refuge, et à la génération
// des questions du mini-jeu. Aucun n'écrit dans le profil — l'écriture se fait
// uniquement dans le composant à la fin d'un mini-jeu réussi.

// Une famille est éligible au mini-jeu « Accueillir un animal » si :
//   1. ses 4 calculs sont en boîte ≥ 4 (mastery complète de la famille) ;
//   2. son compteur d'animaux accueillis est strictement < 4 (de la place reste).
// Le statut « déjà réussi aujourd'hui » est calculé séparément (lastWelcomeDate
// === today) pour afficher le bouton actif vs désactivé dans le sous-menu.
function welcomeEligible(t, half, leitner, refuge) {
  const famKey = `${t}-${half}`;
  const famState = refuge && refuge.families && refuge.families[famKey];
  if (!famState || famState.count >= 4) return false;
  const bs = half === "low" ? [2, 3, 4, 5] : [6, 7, 8, 9];
  return bs.every(b => {
    const e = leitner && leitner[calcKey(t, b)];
    return e && (e.box || 0) >= 4;
  });
}

// Mélange déterministe des 4 cellules d'une famille pour aujourd'hui. La
// permutation reste stable sur 24 h et change chaque jour (dailyHash). C'est
// ça qui fait que les animaux accueillis « se déplacent » dans leur enclos
// chaque matin. Renvoie un tableau ordonné de 4 clés de calcul "a-b".
function dailyShuffleCells(famKey, today) {
  const [tStr, half] = famKey.split("-");
  const t = +tStr;
  const bs = half === "low" ? [2, 3, 4, 5] : [6, 7, 8, 9];
  return bs
    .map((b, i) => ({ key: calcKey(t, b), k: dailyHash(today, `refuge-${famKey}-${i}`) }))
    .sort((x, y) => x.k - y.k)
    .map(p => p.key);
}

// Renvoie l'emoji animal présent sur la case (a, b) AUJOURD'HUI, ou null si la
// case n'héberge pas d'animal. Logique :
//   - on identifie la famille de la case ;
//   - on lit son compteur (count) d'accueils ;
//   - on mélange les 4 cellules de la famille pour aujourd'hui ;
//   - les `count` premières cellules de cette permutation hébergent les
//     animaux acquis, dans l'ordre d'acquisition (moins prestigieux d'abord).
// L'animal placé à la position `pos` (0..count-1) est animals[3 - pos].
// ⚠️  L'animal PERSISTE même si le calcul est redescendu sous boîte 4 :
// l'affichage ne dépend que de famState.count, pas de la boîte actuelle.
function getCellAnimal(a, b, refuge, today) {
  const half = b <= 5 ? "low" : "high";
  const famKey = `${a}-${half}`;
  const famState = refuge && refuge.families && refuge.families[famKey];
  if (!famState || (famState.count || 0) <= 0) return null;
  const shuffled = dailyShuffleCells(famKey, today);
  const pos = shuffled.indexOf(calcKey(a, b));
  if (pos < 0 || pos >= famState.count) return null;
  return TABLES[a][half].animals[3 - pos];
}

// Quel animal est accordé quand le compteur passe à `newCount` (1..4) ?
// 1er succès → animals[3] (moins prestigieux), 4e succès → animals[0] (le plus).
function welcomedAnimalForNewCount(t, half, newCount) {
  return TABLES[t][half].animals[4 - newCount];
}

// Génère les 10 questions du mini-jeu « Accueillir un animal » pour une famille.
// On part de 2 copies de chacun des 4 calculs (= 8), puis on ajoute 2 calculs
// supplémentaires aléatoires de la famille, puis on mélange. Chaque calcul
// apparaît ainsi 2 ou 3 fois, ordre imprévisible.
function genQsWelcome(t, half) {
  const bs = half === "low" ? [2, 3, 4, 5] : [6, 7, 8, 9];
  const pool = [...bs, ...bs];
  for (let i = 0; i < 2; i++) pool.push(bs[Math.floor(Math.random() * bs.length)]);
  return shuffle(pool).map(b => ({ a: t, b, ans: t * b, half }));
}

// computeReward = combien de plantes/nourritures/soigneurs donne un combo.
// Combos 2-9  : on lit la table COMBO_REWARDS faite à la main.
// Combos 10+  : formule — 1 soigneur par tranche de 10, plus quelques extras
//               (tous plantes OU tous nourritures, tiré à pile ou face).
// Renvoie toujours { p, f, k } (plantes, foods, keepers).
function computeReward(combo) {
  if (combo < 2) return { p: 0, f: 0, k: 0 };
  if (combo < 10) return COMBO_REWARDS[combo] || { p: 0, f: 0, k: 0 };
  const keeperCount = Math.floor(combo / 10);
  const extrasCount = Math.ceil((combo % 10) / 2);
  const isPlants = Math.random() < 0.5;
  return {
    p: isPlants ? extrasCount : 0,
    f: isPlants ? 0 : extrasCount,
    k: keeperCount,
  };
}

function getComboLabel(combo) {
  if (combo <= 10) return rand(COMBO_LABELS[combo]);
  return rand(COMBO_LABELS_LEGENDARY).replace("{N}", combo);
}

// ─── Component ────────────────────────────────────────────────────────────────
// Mathiko = LE composant unique du jeu. Il contient TOUT : l'état, les effets,
// les actions et le rendu. Organisation interne (lis dans cet ordre) :
//   1. Déclarations d'état (useState) et de refs (useRef)
//   2. Valeurs dérivées peu coûteuses (tColor, curQ, currentProfile…)
//   3. Effets (useEffect) : bootstrap, persistance, fin de partie, timer
//   4. Actions : créer/choisir profil, démarrer/quitter une partie, soumettre…
//   5. Helpers de rendu et de style
//   6. Le grand `return ( … )` : une suite de blocs `{phase === "x" && (…)}`
// ─── PinPad ───────────────────────────────────────────────────────────────
// Pavé numérique mobile-friendly, réutilisable. Affiche `value.length` cercles
// pleins parmi `maxLength` cercles. Le clavier a 3 colonnes : 1-9, puis 0 et
// retour-arrière. Quand `value` atteint `maxLength`, on appelle `onSubmit`
// automatiquement après ~150 ms (pour laisser à la joueuse(eur) le temps de
// VOIR le dernier chiffre tapé).
function PinPad({ value, onChange, onSubmit, maxLength = 4, disabled = false, accent = "#7BC9A0" }) {
  const handleDigit = (d) => {
    if (disabled || value.length >= maxLength) return;
    const next = value + d;
    onChange(next);
    if (next.length === maxLength && onSubmit) {
      setTimeout(() => onSubmit(next), 150);
    }
  };
  const handleBack = () => { if (!disabled) onChange(value.slice(0, -1)); };
  const cellStyle = (variant) => ({
    fontSize: variant === "back" ? 22 : 26,
    fontWeight: 700, fontFamily: "inherit",
    padding: "14px 0",
    background: variant === "back" ? "#F0EAF7" : "white",
    color: variant === "back" ? "#7B6D8E" : "#4A4063",
    border: "2px solid #D6CFE2", borderRadius: 16,
    cursor: disabled ? "default" : "pointer",
    touchAction: "manipulation",
    boxShadow: "0 2px 6px rgba(0,0,0,0.05)",
    transition: "transform 0.08s",
  });
  return (
    <div>
      {/* Dots indiquant la progression de la saisie */}
      <div style={{ display: "flex", justifyContent: "center", gap: 14, marginBottom: 22 }}>
        {Array.from({ length: maxLength }).map((_, i) => (
          <div key={i} style={{
            width: 18, height: 18, borderRadius: "50%",
            background: i < value.length ? accent : "transparent",
            border: `2.5px solid ${i < value.length ? accent : "#D6CFE2"}`,
            transition: "background 0.15s, border-color 0.15s, transform 0.15s",
            transform: i === value.length - 1 ? "scale(1.15)" : "scale(1)",
          }} />
        ))}
      </div>
      {/* Pavé 3×4 */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 8, maxWidth: 300, margin: "0 auto" }}>
        {[1, 2, 3, 4, 5, 6, 7, 8, 9].map(n => (
          <button key={n} onClick={() => handleDigit(String(n))} disabled={disabled} style={cellStyle()}>{n}</button>
        ))}
        <button onClick={handleBack} disabled={disabled || value.length === 0} style={cellStyle("back")}>←</button>
        <button onClick={() => handleDigit("0")} disabled={disabled} style={cellStyle()}>0</button>
        <div />
      </div>
    </div>
  );
}

export default function Mathiko() {
  // ── 1. ÉTAT ──────────────────────────────────────────────────────────────
  // `phase` = la machine à états qui décide quel écran s'affiche. Valeurs :
  //   profiles · menu · game · fb · end · zoomap · zoodex · records · debug
  // (Voir le guide en tête de fichier, §4, pour le diagramme des transitions.)
  const [phase, setPhase] = useState("profiles");

  // Profiles & current profile
  // store        = TOUT le contenu sauvegardé (liste de profils + id courant).
  //                Toute écriture dans store est automatiquement persistée par
  //                l'effet de persistance plus bas — pas besoin d'appeler saveStore.
  // bootstrapped = passe à true une fois le store chargé du localStorage ; sert
  //                de garde pour ne pas persister un store vide au démarrage.
  // profileScreen / newName / newAvatar = état local de l'écran "profiles".
  const [store, setStore] = useState({ profiles: [], currentProfileId: null });
  const [bootstrapped, setBootstrapped] = useState(false);
  // sub-screen of the profiles phase: list | create  (legacy offline UI, now
  // unreachable when auth Supabase est active — gardé pour fallback hors ligne).
  const [profileScreen, setProfileScreen] = useState("list");
  const [newName, setNewName] = useState("");
  const [newAvatar, setNewAvatar] = useState(AVATARS[0]);

  // ── Auth Supabase (cloud) ────────────────────────────────────────────────
  // authPhase pilote l'écran AUTH (qui s'affiche AVANT le jeu) :
  //   "loading" → bootstrap initial, on lit le localStorage de cet appareil
  //   "picker"  → écran "Qui joue ?" : liste des refuges connus sur cet
  //               appareil + boutons "autre refuge" / "créer"
  //   "login"   → entrée du code à 4 chiffres pour un refuge sélectionné
  //               (ou pseudo + code en mode "j'ai un autre refuge")
  //   "create"  → création d'un nouveau refuge (pseudo + avatar + code)
  //   "authed"  → connectée — le reste de l'app est affiché normalement
  const [authPhase, setAuthPhase] = useState("loading");
  // Refuges connus sur cet appareil (juste pseudo + avatar + id Supabase,
  // JAMAIS le code). Sert à afficher des cartes dans le picker.
  const [knownUsers, setKnownUsers] = useState([]);
  // Refuge sélectionné dans le picker → on enchaîne sur l'entrée du code.
  // null = pas sélectionné (mode manuel : on demandera aussi le pseudo).
  const [authSelected, setAuthSelected] = useState(null);
  // Saisie en cours sur les formulaires d'auth.
  const [authPseudo, setAuthPseudo] = useState("");
  const [authAvatar, setAuthAvatar] = useState(AVATARS[0]);
  const [authPin, setAuthPin] = useState("");
  const [authError, setAuthError] = useState("");
  const [authBusy, setAuthBusy] = useState(false);
  // Référence persistante : le code de l'utilisat(eur·rice) connecté(e),
  // gardé EN MÉMOIRE UNIQUEMENT (jamais en localStorage) — il faut le rentrer
  // à chaque rechargement de page. Utilisé pour les sauvegardes cloud.
  const pinMemoryRef = useRef(null);
  // Id Supabase du refuge connecté (uuid). null = pas connecté.
  const cloudUserIdRef = useRef(null);
  // Timer pour débouncer les sauvegardes cloud (~2 s).
  const cloudSaveTimerRef = useRef(null);
  // Compteur de sauvegardes cloud en cours (pour afficher un petit indicateur).
  const [cloudSyncState, setCloudSyncState] = useState("idle"); // idle | saving | error

  // ── Réglages de la prochaine partie (choisis dans le menu) ──
  // Selected halves: array of strings like ["2-low", "2-high", "3-low", "3-high"]
  // Default: all halves selected
  const [selected, setSelected] = useState([...ALL_HALVES]);
  const [nbTurns, setNbTurns] = useState(10);
  const [customTurns, setCustomTurns] = useState("");
  // Currently inspected zoo cell (for the popover modal)
  const [selectedCell, setSelectedCell] = useState(null);

  // ── État de la partie EN COURS ──
  // qs  = liste des questions ; qi = index de la question courante ;
  // val = saisie de l'enfant ; combo = bonnes réponses d'affilée ;
  // elapsed = secondes écoulées sur la question ; fb = données du feedback.
  const [qs, setQs] = useState([]);
  const [qi, setQi] = useState(0);
  const [val, setVal] = useState("");
  const [combo, setCombo] = useState(0);
  const [elapsed, setElapsed] = useState(0);
  const [fb, setFb] = useState(null);

  // ── Butin accumulé pendant la partie (affiché sur l'écran de fin) ──
  // animals/plants/foods/keepers/junkCol = ce que l'enfant a récolté ;
  // errors = calculs ratés, listés en fin de partie pour révision.
  const [animals, setAnimals] = useState([]);
  const [plants, setPlants] = useState([]);
  const [foods, setFoods] = useState([]);
  const [keepers, setKeepers] = useState([]);
  const [junkCol, setJunkCol] = useState([]);
  const [errors, setErrors] = useState([]);
  // Stable celebration data captured when the player reaches end (perfect run only)
  const [perfectInfo, setPerfectInfo] = useState(null);

  // ── Refs : valeurs qu'on doit lire AVANT le prochain rendu ──
  // Un useRef ne déclenche pas de re-render. On les utilise quand handleSubmit
  // a besoin de la valeur immédiate (combo, temps écoulé…) sans attendre React.
  //   subRef     = anti-double-soumission de la question courante.
  //   elapRef    = temps écoulé « live » (le state elapsed peut être en retard).
  //   comboRef   = combo « live » pour calculer la récompense tout de suite.
  //   inputRef   = pour redonner le focus au champ de saisie à chaque question.
  //   fbStartRef = horodatage d'apparition du feedback (anti-skip, voir FB_MIN_MS).
  const subRef = useRef(false);
  const elapRef = useRef(0);
  const comboRef = useRef(0);
  const inputRef = useRef(null);
  const fbStartRef = useRef(0);
  // Compteur d'animaux de la famille AU DÉMARRAGE du mini-jeu welcome. Sert à
  // afficher correctement le nouveau compteur (= ref+1) sur l'écran de succès
  // dès le premier rendu, avant que l'effet de fin ait commité dans le store.
  const preWelcomeCountRef = useRef(0);
  // Durée minimale d'affichage du feedback avant de pouvoir passer à la suite
  // (empêche de « zapper » le feedback en gardant la touche Entrée enfoncée).
  const FB_MIN_MS = 500;

  // Snapshot of the Leitner table at the start of the current game,
  // used after the game ends to compute which cells changed (for animations).
  const preGameLeitnerRef = useRef(null);
  const [lastSessionChanges, setLastSessionChanges] = useState({});
  // Nouveautés à animer dans le Zoodex après une partie (PREMIÈRE découverte
  // de chaque item — count passant de 0 à 1+). On stocke des Sets de clés
  // pour vérification rapide à l'affichage. Vidé quand l'utilisateur quitte
  // l'écran Zoodex pour ne pas rejouer l'animation à chaque visite.
  const [lastZoodexAdditions, setLastZoodexAdditions] = useState({
    animals: new Set(), plants: new Set(), foods: new Set(), keepers: new Set(),
  });
  // Game mode of the *currently running* game: "play" | "build" | "cultivate" | "daily" | "target"
  const [gameMode, setGameMode] = useState("play");
  // En mode "welcome" (mini-jeu « Accueillir un animal »), on retient ici la
  // famille en cours (`{ t, half }`). Sert à incrémenter le bon compteur de
  // refuge à la fin, à afficher l'écran de succès, et à recommencer la même
  // famille depuis l'écran d'erreur welcomeFail.
  const [welcomeFamily, setWelcomeFamily] = useState(null);
  // Quit-game confirmation modal toggle
  const [quitConfirm, setQuitConfirm] = useState(false);
  // Records: per-session tracking (best time, biggest calc), committed at game end
  const sessionRecordsRef = useRef({ bestTimeMs: null, biggestCalc: null });
  // Tech-stats sub-window (inside the Records screen) toggle
  const [techStatsOpen, setTechStatsOpen] = useState(false);
  // État replié/déplié de chaque sous-section du « Suivi détaillé ».
  // Défaut : les 3 sections historiques ouvertes, les 2 nouvelles repliées
  // (le neuf est opt-in pour ne pas noyer l'info — voir la modale techStatsOpen).
  // État éphémère : il se réinitialise à chaque réouverture de la modale.
  const [techSections, setTechSections] = useState({
    repartition: true, activite: true, familles: false, minijeux: false, coincent: true,
  });
  // Debug menu local UI state
  const [debugDumpOpen, setDebugDumpOpen] = useState(false);
  const [debugConfirm, setDebugConfirm] = useState(null); // { action, label, run() } | null
  const [debugConfirmText, setDebugConfirmText] = useState("");
  const [debugCopyMsg, setDebugCopyMsg] = useState("");

  // ── 2. VALEURS DÉRIVÉES (recalculées à chaque rendu, peu coûteuses) ──
  // tColor = couleur de la barre de temps (verte → jaune → orange → rose).
  // timeW  = largeur en % de cette barre (100 % au départ, 0 % à l'épuisement).
  // curQ   = la question courante (objet { a, b, ans, half }).
  const tColor = elapsed < 2 ? "#A8E6B0" : elapsed < 4 ? "#FFE17A" : elapsed < 6 ? "#FFB870" : "#FF9AA8";
  const timeW = Math.max(0, (1 - elapsed / MAX_T) * 100);
  const curQ = qs[qi];

  // Current profile shorthand — le profil actif, ou null si aucun n'est choisi.
  const currentProfile = store.profiles.find(p => p.id === store.currentProfileId) || null;

  // ── Bootstrap: charger les refuges connus de cet appareil ────────────────
  // Au montage : on lit la liste des refuges déjà utilisés sur cet appareil
  // (stockée dans localStorage en clair — JAMAIS le code) pour pré-remplir le
  // picker. Si supabase n'est pas configuré (env vars manquantes), on tombe
  // sur l'ancien mode hors-ligne pour ne pas bloquer un dev local.
  useEffect(() => {
    // Sécurité : si pas de config Supabase, on retombe sur l'ancien mode local.
    if (!supabase) {
      const s = loadStore();
      setStore(s);
      setBootstrapped(true);
      setAuthPhase("authed"); // bypass auth pour utiliser l'ancienne UI profils
      if (s.profiles.length === 0) {
        setProfileScreen("create");
        setPhase("profiles");
      } else if (s.currentProfileId && s.profiles.find(p => p.id === s.currentProfileId)) {
        setPhase("menu");
      } else {
        setProfileScreen("list");
        setPhase("profiles");
      }
      return;
    }
    // Mode cloud normal : on lit la liste des refuges connus + l'éventuel
    // refuge actif récemment (pour le placer en premier dans le picker).
    try {
      const raw = localStorage.getItem("mathiko_known_users");
      const list = raw ? JSON.parse(raw) : [];
      setKnownUsers(Array.isArray(list) ? list : []);
    } catch { setKnownUsers([]); }
    setBootstrapped(true);
    setAuthPhase("picker");
  }, []);

  // ── Persist store on change (after bootstrap) ──────────────────────────────
  // Sauvegarde AUTOMATIQUE : dès que `store` change, on l'écrit dans localStorage
  // (cache rapide pour les rendus suivants de la même session) ET on déclenche
  // une sauvegarde cloud DÉBOUNCÉE à 2 s (pour ne pas spammer Supabase à chaque
  // touche). La garde `bootstrapped` empêche d'écraser une sauvegarde par le
  // store vide initial ; la garde `authPhase === "authed"` empêche de pousser
  // un store vide pendant l'auth.
  useEffect(() => {
    if (!bootstrapped) return;
    if (authPhase !== "authed") return;
    saveStore(store);
    // Cloud save (debounced) — uniquement si on est connecté à Supabase.
    if (!supabase || !cloudUserIdRef.current || !pinMemoryRef.current) return;
    if (cloudSaveTimerRef.current) clearTimeout(cloudSaveTimerRef.current);
    cloudSaveTimerRef.current = setTimeout(async () => {
      setCloudSyncState("saving");
      const { data, error } = await supabase.rpc("save_store", {
        p_id: cloudUserIdRef.current,
        p_pin: pinMemoryRef.current,
        p_store: store,
      });
      if (error || data === false) {
        setCloudSyncState("error");
        // eslint-disable-next-line no-console
        console.warn("Cloud sync failed", error);
      } else {
        setCloudSyncState("idle");
      }
    }, 2000);
    return () => { if (cloudSaveTimerRef.current) clearTimeout(cloudSaveTimerRef.current); };
  }, [store, bootstrapped, authPhase]);

  // ── Helpers : mémoriser un refuge sur l'appareil ─────────────────────────
  // Met à jour la liste des refuges connus localement (id + pseudo + avatar).
  // Le refuge passé en paramètre est mis EN TÊTE (le plus récent en premier).
  // Code JAMAIS stocké côté localStorage — il vit en mémoire seulement.
  function rememberUser({ id, pseudo, avatar }) {
    const newList = [{ id, pseudo, avatar }, ...knownUsers.filter(u => u.id !== id)];
    setKnownUsers(newList);
    try { localStorage.setItem("mathiko_known_users", JSON.stringify(newList)); } catch {}
    try { localStorage.setItem("mathiko_last_active_id", id); } catch {}
  }
  function forgetUser(id) {
    const newList = knownUsers.filter(u => u.id !== id);
    setKnownUsers(newList);
    try { localStorage.setItem("mathiko_known_users", JSON.stringify(newList)); } catch {}
  }

  // ── Connexion à un refuge existant ───────────────────────────────────────
  async function doLogin(pseudo, pin) {
    if (!supabase) { setAuthError("Mode cloud non configuré."); return; }
    setAuthBusy(true); setAuthError("");
    const { data, error } = await supabase.rpc("login_profile", {
      p_pseudo: pseudo, p_pin: pin,
    });
    setAuthBusy(false);
    if (error) {
      setAuthError("Erreur réseau. Réessaie.");
      setAuthPin("");
      return;
    }
    if (!data || data.length === 0) {
      setAuthError("Pseudo ou code incorrect.");
      setAuthPin("");
      return;
    }
    const row = data[0];
    // row.store peut être l'état initial (juste { createdViaSupabase, pseudo,
    // avatar }) si le refuge n'a jamais été sauvegardé, OU un vrai store
    // Mathiko avec profiles[]. On détecte le cas et on construit un profil
    // frais si nécessaire.
    let cloudStore = row.store || {};
    if (!cloudStore.profiles || !Array.isArray(cloudStore.profiles) || cloudStore.profiles.length === 0) {
      const profile = makeProfile(cloudStore.pseudo || pseudo, cloudStore.avatar || AVATARS[0]);
      profile.id = row.id; // on calque l'id local sur l'id Supabase
      cloudStore = { profiles: [profile], currentProfileId: profile.id, version: SCHEMA_VERSION };
    } else {
      // Passer par migrate() au cas où le schéma du store cloud serait obsolète.
      cloudStore = migrate(cloudStore);
    }
    // Finalize auth state
    cloudUserIdRef.current = row.id;
    pinMemoryRef.current = pin;
    rememberUser({ id: row.id, pseudo: pseudo, avatar: (cloudStore.profiles[0] && cloudStore.profiles[0].avatar) || AVATARS[0] });
    setStore(cloudStore);
    setAuthPhase("authed");
    setPhase("menu");
    setAuthPseudo(""); setAuthPin(""); setAuthSelected(null);
  }

  // ── Création d'un nouveau refuge ─────────────────────────────────────────
  async function doCreate(pseudo, avatar, pin) {
    if (!supabase) { setAuthError("Mode cloud non configuré."); return; }
    setAuthBusy(true); setAuthError("");
    const { data, error } = await supabase.rpc("create_profile", {
      p_pseudo: pseudo, p_pin: pin, p_avatar: avatar,
    });
    setAuthBusy(false);
    if (error) {
      setAuthError(error.message && error.message.includes("pseudo too short")
        ? "Pseudo trop court (2 caractères minimum)."
        : "Erreur. Réessaie.");
      setAuthPin("");
      return;
    }
    if (!data) {
      setAuthError("Ce pseudo est déjà pris. Choisis-en un autre.");
      setAuthPin("");
      return;
    }
    // Créer le profil local et l'enchaîner.
    const profile = makeProfile(pseudo, avatar);
    profile.id = data; // uuid Supabase
    const newStore = { profiles: [profile], currentProfileId: profile.id, version: SCHEMA_VERSION };
    cloudUserIdRef.current = data;
    pinMemoryRef.current = pin;
    rememberUser({ id: data, pseudo, avatar });
    setStore(newStore);
    setAuthPhase("authed");
    setPhase("menu");
    setAuthPseudo(""); setAuthAvatar(AVATARS[0]); setAuthPin("");
  }

  // ── Déconnexion (« Changer de refuge ») ──────────────────────────────────
  function doLogout() {
    // Annule toute sauvegarde cloud en attente.
    if (cloudSaveTimerRef.current) {
      clearTimeout(cloudSaveTimerRef.current);
      cloudSaveTimerRef.current = null;
    }
    pinMemoryRef.current = null;
    cloudUserIdRef.current = null;
    setStore({ profiles: [], currentProfileId: null });
    setAuthPhase("picker");
    setAuthSelected(null); setAuthPseudo(""); setAuthPin(""); setAuthError("");
    setPhase("menu"); // remettra l'utilisat(eur·rice) sur le picker via le routeur AUTH
  }

  // Quand l'utilisateur ouvre le Zoodex, on laisse les animations de nouveautés
  // jouer puis on les efface après ~1,5 s pour ne pas les rejouer à la visite
  // suivante. Si on quitte avant la fin du timer, le cleanup l'annule.
  useEffect(() => {
    if (phase !== "zoodex") return;
    const t = setTimeout(() => {
      setLastZoodexAdditions(prev => {
        if (!prev.animals.size && !prev.plants.size && !prev.foods.size && !prev.keepers.size) return prev;
        return { animals: new Set(), plants: new Set(), foods: new Set(), keepers: new Set() };
      });
    }, 1500);
    return () => clearTimeout(t);
  }, [phase]);

  // ── 4. ACTIONS ───────────────────────────────────────────────────────────
  // ── Profile actions ─────────────────────────────────────────────────────────
  function createProfile() {
    const p = makeProfile(newName, newAvatar);
    setStore(s => ({
      profiles: [...s.profiles, p],
      currentProfileId: p.id,
    }));
    setNewName("");
    setNewAvatar(AVATARS[0]);
    setProfileScreen("list");
    setPhase("menu");
  }

  function selectProfile(id) {
    setStore(s => ({ ...s, currentProfileId: id }));
    setPhase("menu");
  }

  function deleteProfile(id) {
    setStore(s => {
      const remaining = s.profiles.filter(p => p.id !== id);
      const newCurrent = s.currentProfileId === id ? null : s.currentProfileId;
      return { profiles: remaining, currentProfileId: newCurrent };
    });
  }

  function switchProfile() {
    setStore(s => ({ ...s, currentProfileId: null }));
    setProfileScreen("list");
    setPhase("profiles");
  }

  // ── Effet de FIN DE PARTIE — le « bilan » d'une session ──────────────────
  // Se déclenche quand `phase` devient "end". C'est le seul endroit où la
  // progression d'une partie est COMMITTÉE de façon permanente dans le profil.
  // Tout est regroupé en UN seul setStore pour ne faire qu'une écriture.
  // When a game finishes (phase becomes "end"):
  //   - update streak for today
  //   - if it was the daily challenge, mark it as completed for today
  //   - record discovered animals into the Zoodex
  //   - compute which Leitner cells changed (for animation later in the zoo map)
  useEffect(() => {
    if (phase !== "end" || !currentProfile) return;

    // ── Détection des PREMIÈRES découvertes du Zoodex (animations) ────────
    // On compare les compteurs AVANT la partie (currentProfile.zoodex) aux
    // emojis acquis pendant la session. Un emoji déjà en compteur ≥ 1 dans le
    // Zoodex n'est PAS une nouveauté ; un emoji à 0 qui devient ≥ 1 l'est.
    // On fait ce calcul EN DEHORS du setStore (effet pur côté React) — le
    // store sera mis à jour juste après avec les mêmes données.
    {
      const zd = currentProfile.zoodex || { animals: {}, plants: {}, foods: {}, keepers: {} };
      const seen = (m, k) => (m && m[k] || 0) > 0;
      const newA = new Set(), newP = new Set(), newF = new Set(), newK = new Set();
      for (const a of animals) {
        const zk = `${a.table}-${a.half}-${a.tier}`;
        if (!seen(zd.animals, zk)) newA.add(zk);
      }
      for (const e of plants)  if (!seen(zd.plants,  e)) newP.add(e);
      for (const e of foods)   if (!seen(zd.foods,   e)) newF.add(e);
      for (const e of keepers) if (!seen(zd.keepers, e)) newK.add(e);
      if (newA.size || newP.size || newF.size || newK.size) {
        setLastZoodexAdditions({ animals: newA, plants: newP, foods: newF, keepers: newK });
      }
    }

    // 1) Streak + 2) Daily completion + 3) Zoodex (combined into one store update)
    setStore(s => {
      const updated = s.profiles.map(p => {
        if (p.id !== currentProfile.id) return p;
        let np = updateStreakForToday(p);
        if (gameMode === "daily") {
          const today = todayStr();
          np = {
            ...np,
            dailyChallenge: {
              ...(np.dailyChallenge || {}),
              lastCompletedDate: today,
              history: [...((np.dailyChallenge || {}).history || []), today].slice(-30),
            },
          };
        }
        // Mode "welcome" : on incrémente le compteur de la famille et on
        // marque la date du succès (cap quotidien). animals[] est vide en
        // welcome (handleSubmit n'y ajoute rien), donc le bloc Zoodex juste
        // en-dessous est naturellement un no-op pour ce mode.
        if (gameMode === "welcome" && welcomeFamily) {
          const famKey = `${welcomeFamily.t}-${welcomeFamily.half}`;
          const today = todayStr();
          const refuge = np.refuge || makeRefuge();
          const families = { ...(refuge.families || {}) };
          const cur = families[famKey] || { count: 0, lastWelcomeDate: null };
          families[famKey] = {
            count: Math.min(4, (cur.count || 0) + 1),
            lastWelcomeDate: today,
          };
          np = { ...np, refuge: { ...refuge, families } };
        }
        // Zoodex: increment a counter for each animal, plant, food and keeper
        // collected this session. animals[] est conservé pour les modes hors
        // welcome ; plants/foods/keepers le sont pour tous les modes qui
        // débloquent des combos. Le mode "welcome" n'ajoute rien (les tableaux
        // de session restent vides — cf. handleSubmit). Le calcul des nouveautés
        // (pour les animations) est fait AVANT ce setStore — voir plus haut.
        if (animals.length > 0 || plants.length > 0 || foods.length > 0 || keepers.length > 0) {
          const zd = np.zoodex || { animals: {}, plants: {}, foods: {}, keepers: {} };
          const zAnimals = { ...(zd.animals || {}) };
          for (const a of animals) {
            const zk = `${a.table}-${a.half}-${a.tier}`;
            zAnimals[zk] = (zAnimals[zk] || 0) + 1;
          }
          const zPlants  = { ...(zd.plants  || {}) };
          for (const e of plants)  zPlants[e]  = (zPlants[e]  || 0) + 1;
          const zFoods   = { ...(zd.foods   || {}) };
          for (const e of foods)   zFoods[e]   = (zFoods[e]   || 0) + 1;
          const zKeepers = { ...(zd.keepers || {}) };
          for (const e of keepers) zKeepers[e] = (zKeepers[e] || 0) + 1;
          np = { ...np, zoodex: { ...zd, animals: zAnimals, plants: zPlants, foods: zFoods, keepers: zKeepers } };
        }
        // Records: merge this session's records into the profile's all-time records
        {
          const rec = np.records || makeRecords();
          const sr = sessionRecordsRef.current;
          const newRec = {
            bestTimeMs: rec.bestTimeMs,
            biggestCalc: rec.biggestCalc,
            totalCalcsSolved: (rec.totalCalcsSolved || 0) + animals.length,
            animalsByTier: [...(rec.animalsByTier || [0, 0, 0, 0])],
          };
          // Best time (lower is better)
          if (sr.bestTimeMs !== null &&
              (newRec.bestTimeMs === null || sr.bestTimeMs < newRec.bestTimeMs)) {
            newRec.bestTimeMs = sr.bestTimeMs;
          }
          // Biggest calc (bigger product; tie → bigger `a`)
          if (sr.biggestCalc) {
            const cur = newRec.biggestCalc;
            const srProd = sr.biggestCalc.a * sr.biggestCalc.b;
            if (!cur || srProd > cur.a * cur.b ||
                (srProd === cur.a * cur.b && sr.biggestCalc.a > cur.a)) {
              newRec.biggestCalc = sr.biggestCalc;
            }
          }
          // Animals by tier
          for (const a of animals) {
            newRec.animalsByTier[a.tier] = (newRec.animalsByTier[a.tier] || 0) + 1;
          }
          np = { ...np, records: newRec };
        }
        return np;
      });
      return { ...s, profiles: updated };
    });
    // 4) Diff Leitner: compare the snapshot taken at game start with the current state
    if (preGameLeitnerRef.current) {
      const before = preGameLeitnerRef.current;
      const after = currentProfile.leitner || {};
      const changes = {};
      for (const k of ALL_CALC_KEYS) {
        const oldBox = (before[k] && before[k].box) || 0;
        const newBox = (after[k] && after[k].box) || 0;
        if (oldBox !== newBox) {
          changes[k] = { fromBox: oldBox, toBox: newBox };
        }
      }
      setLastSessionChanges(changes);
    }
    // eslint-disable-next-line
  }, [phase]);

  // ── Per-question timer ─────────────────────────────────────────────────────
  // Relancé à CHAQUE question (dépendances [phase, qi]). Il réinitialise la
  // saisie, redonne le focus au champ, puis fait avancer `elapsed` toutes les
  // 80 ms. À MAX_T secondes, il déclenche tout seul un timeout via handleSubmit.
  // Le `return` nettoie l'intervalle et le timeout — indispensable pour ne pas
  // empiler plusieurs timers quand on change de question.
  useEffect(() => {
    if (phase !== "game" || !curQ) return;

    subRef.current = false;
    elapRef.current = 0;
    setElapsed(0);
    setVal("");

    const focusT = setTimeout(() => {
      if (inputRef.current) inputRef.current.focus();
    }, 60);

    const t0 = Date.now();
    const iv = setInterval(() => {
      const e = (Date.now() - t0) / 1000;
      elapRef.current = e;
      setElapsed(e);
      if (e >= MAX_T) {
        clearInterval(iv);
        handleSubmit(true);
      }
    }, 80);

    return () => {
      clearTimeout(focusT);
      clearInterval(iv);
    };
    // eslint-disable-next-line
  }, [phase, qi]);

  // ── beginGame : point d'entrée commun de TOUTE partie ────────────────────
  // Toutes les fonctions startXxx() finissent par appeler beginGame(). Son rôle :
  // prendre un instantané de l'état Leitner (pour animer les progrès en fin de
  // partie), remettre à zéro tout l'état de jeu, puis basculer phase → "game".
  // Reset state and enter game phase with a given list of questions
  function beginGame(questions, mode = "play") {
    if (!questions || questions.length === 0) return;
    // Snapshot the Leitner state so we can compute changes when the game ends
    if (currentProfile) {
      preGameLeitnerRef.current = JSON.parse(JSON.stringify(currentProfile.leitner || {}));
    } else {
      preGameLeitnerRef.current = null;
    }
    setLastSessionChanges({});
    sessionRecordsRef.current = { bestTimeMs: null, biggestCalc: null };
    setGameMode(mode);
    setQs(questions);
    setQi(0);
    setVal("");
    setCombo(0);
    comboRef.current = 0;
    setAnimals([]);
    setPlants([]);
    setFoods([]);
    setKeepers([]);
    setJunkCol([]);
    setErrors([]);
    setFb(null);
    setPerfectInfo(null);
    setPhase("game");
  }

  // ── Start a regular game (from menu) with a given mode ────────────────────
  // ⚠️  Règle importante : seul le mode "play" (Mission d'entraînement) tient
  // compte des familles cochées au menu (`selected`). Les modes d'entretien —
  // build (Aménager) et cultivate (Cultiver) — doivent balayer TOUTES les
  // familles : ils trient les calculs sur leur état Leitner, pas sur la table
  // choisie. On force donc ALL_HALVES dès que le mode n'est pas "play".
  // Note Leitner : "play" ne met PAS à jour le Leitner (cf. handleSubmit).
  function startGame(mode = "play") {
    const halves = mode === "play"
      ? (selected.length > 0 ? selected : ALL_HALVES)
      : ALL_HALVES;
    // Les modes d'entretien (build, cultivate) ont un nombre de calculs FIXE
    // de 10 — comme défricher (clearing) et accueillir (welcome). Seul "play"
    // (Mission d'entraînement) respecte le réglage `nbTurns` choisi par
    // l'utilisateur dans l'écran de mission.
    const n = (mode === "build" || mode === "cultivate") ? 10 : nbTurns;
    const newQs = currentProfile
      ? genQsLeitner(halves, n, currentProfile.leitner || makeLeitner(), mode)
      : genQs(halves, n);
    beginGame(newQs, mode);
  }

  // ── Daily challenge: 10 high-priority calcs from all halves, once per day ──
  function startDailyChallenge() {
    const newQs = currentProfile
      ? genQsLeitner(ALL_HALVES, 10, currentProfile.leitner || makeLeitner(), "challenge")
      : genQs(ALL_HALVES, 10);
    beginGame(newQs, "daily");
  }

  // ── Quit the current game: rollback Leitner to pre-game state, no streak ──
  function quitGame() {
    // CAPTURE the snapshot into a local variable BEFORE calling setStore.
    // setStore's update function is batched and runs later — if we read the
    // ref *inside* the callback, the ref may already be cleared. The closure
    // over `snapshot` keeps the value alive until the update is committed.
    const snapshot = preGameLeitnerRef.current;
    const hasValidSnapshot =
      snapshot &&
      typeof snapshot === "object" &&
      Object.keys(snapshot).length > 0;

    if (currentProfile && hasValidSnapshot) {
      setStore(s => ({
        ...s,
        profiles: s.profiles.map(p => p.id === currentProfile.id
          ? { ...p, leitner: snapshot }
          : p
        ),
      }));
    }
    // Reset all game-related session state
    setQs([]); setQi(0); setVal("");
    setCombo(0); comboRef.current = 0;
    setAnimals([]); setPlants([]); setFoods([]); setKeepers([]); setJunkCol([]);
    setErrors([]); setFb(null); setPerfectInfo(null);
    setLastSessionChanges({});
    preGameLeitnerRef.current = null;
    setQuitConfirm(false);
    setPhase("menu");
  }

  // ── Clearing: 10 box-0 calcs déjà vus OU en bordure d'une zone explorée ───
  // Défricher est un mode d'entretien : il balaie les 16 familles (ALL_HALVES),
  // jamais la sélection du menu. Ça le rend aussi cohérent avec le compteur
  // « X cases à défricher » de l'écran refuge, lui aussi calculé sur les 64
  // calculs — sans ça, le bouton et la partie pouvaient être en désaccord.
  // Le nombre de calculs est uniformisé à 10 sur tous les modes d'entretien
  // (clearing, build, cultivate, welcome) — voir aussi startGame.
  function startClearing() {
    const newQs = currentProfile
      ? genQsLeitner(ALL_HALVES, 10, currentProfile.leitner || makeLeitner(), "clearing")
      : genQs(ALL_HALVES, 10);
    beginGame(newQs, "clearing");
  }

  // ── « Accueillir un animal » : 10 calculs d'une famille, zéro erreur ─────
  // Lancé depuis l'écran welcomePick après avoir choisi la famille. On retient
  // la famille dans `welcomeFamily` pour pouvoir incrémenter le bon compteur à
  // la fin (et permettre le « Recommencer » depuis l'écran welcomeFail).
  function startWelcome(t, half) {
    setWelcomeFamily({ t, half });
    // Snapshot du compteur AVANT la partie : sert à afficher correctement le
    // nouveau compteur (= snapshot + 1) sur l'écran de succès dès le premier
    // rendu, sans dépendre du timing de l'effet de fin (cf. preWelcomeCountRef).
    const famKey = `${t}-${half}`;
    preWelcomeCountRef.current =
      currentProfile?.refuge?.families?.[famKey]?.count || 0;
    beginGame(genQsWelcome(t, half), "welcome");
  }

  // ── Submit answer ───────────────────────────────────────────────────────────
  // LE cœur d'un tour de jeu. Appelé soit par l'enfant (validation), soit par le
  // timer (isTimeout = true). Étapes : anti-double-clic → cas du 1er timeout
  // (on re-propose le calcul plus tard sans le compter) → calcul du résultat →
  // mise à jour combo/récompenses OU butin d'erreur → mise à jour Leitner →
  // construction de l'objet `fb` qui alimente l'écran de feedback.
  function handleSubmit(isTimeout) {
    if (subRef.current) return;
    if (!curQ) return;
    subRef.current = true;

    // ── Mode "welcome" (Accueillir un animal) ─────────────────────────────
    // Règle stricte : aucune erreur tolérée, aucun soft-retry sur timeout.
    // Toute réponse incorrecte ou timeout coupe la partie SANS mise à jour
    // Leitner et bascule sur l'écran welcomeFail. Une bonne réponse continue
    // sur le flow normal ci-dessous, où les ajouts d'animal de session et de
    // récompenses combo sont sautés (le mini-jeu reste sobre).
    if (gameMode === "welcome") {
      const userAns = isTimeout ? null : parseInt(val, 10);
      const okEarly = !isTimeout && !isNaN(userAns) && userAns === curQ.ans;
      if (!okEarly) {
        setPhase("welcomeFail");
        // subRef reste à true ; il sera remis à false par beginGame() au
        // prochain lancement (startWelcome ou retour menu).
        return;
      }
      // Bonne réponse : on retombe sur le flow normal ci-dessous.
    } else if (isTimeout && !curQ._retried) {
      // First timeout on a calc → re-queue at end, doesn't count.
      // Second timeout on the same calc (it's flagged _retried) → falls through to
      // the normal wrong-answer branch and counts.
      setFb({ retryTimeout: true, q: curQ });
      fbStartRef.current = Date.now();
      setPhase("fb");
      return;
    }

    const e = elapRef.current;
    const ti = tierIdx(e);
    const userAns = isTimeout ? null : parseInt(val, 10);
    const ok = !isTimeout && !isNaN(userAns) && userAns === curQ.ans;

    const newCombo = ok ? comboRef.current + 1 : 0;
    comboRef.current = newCombo;
    setCombo(newCombo);

    let gAnimal = null, gPlants = [], gFoods = [], gKeepers = [], gJunk = null, cLabel = null;

    if (ok) {
      // Mode "welcome" : on saute l'accumulation d'animaux de session, les
      // records de session et les récompenses combo. Le Leitner monte quand
      // même (= renforcement de la maîtrise).
      if (gameMode !== "welcome") {
        const emoji = TABLES[curQ.a][curQ.half].animals[ti];
        gAnimal = { emoji, table: curQ.a, half: curQ.half, tier: ti };
        setAnimals(p => [...p, gAnimal]);

        // ── Track session records (best time, biggest calc) ──
        const sr = sessionRecordsRef.current;
        const timeMs = Math.round(e * 1000);
        if (sr.bestTimeMs === null || timeMs < sr.bestTimeMs) {
          sr.bestTimeMs = timeMs;
        }
        const prod = curQ.a * curQ.b;
        if (!sr.biggestCalc) {
          sr.biggestCalc = { a: curQ.a, b: curQ.b };
        } else {
          const curProd = sr.biggestCalc.a * sr.biggestCalc.b;
          // Bigger product wins; on a tie, the larger `a` wins
          if (prod > curProd || (prod === curProd && curQ.a > sr.biggestCalc.a)) {
            sr.biggestCalc = { a: curQ.a, b: curQ.b };
          }
        }

        if (newCombo >= 2) {
          cLabel = getComboLabel(newCombo);
          const rew = computeReward(newCombo);
          for (let i = 0; i < rew.p; i++) gPlants.push(rand(PLANTS));
          for (let i = 0; i < rew.f; i++) gFoods.push(rand(FOODS));
          for (let i = 0; i < rew.k; i++) gKeepers.push(rand(KEEPERS));
          if (gPlants.length)  setPlants(p => [...p, ...gPlants]);
          if (gFoods.length)   setFoods(p => [...p, ...gFoods]);
          if (gKeepers.length) setKeepers(p => [...p, ...gKeepers]);
        }
      }
    } else {
      gJunk = rand(JUNK);
      setJunkCol(p => [...p, gJunk]);
      setErrors(p => [...p, { q: curQ, userAns, isTimeout }]);
    }

    // ── Update Leitner for current profile ──
    // Mode "play" (Mission d'entraînement) ne TOUCHE PAS au Leitner — c'est du
    // pur entraînement / divertissement, sans progression ni régression. Les
    // autres modes (Aménager, Cultiver, Défricher, Sauvetage, Welcome) mettent
    // à jour normalement (bonne réponse → boîte monte, erreur → boîte descend).
    if (currentProfile && gameMode !== "play") {
      const k = calcKey(curQ.a, curQ.b);
      const prevEntry = currentProfile.leitner?.[k] || { box: 0, streak: 0, attempts: 0 };
      const newEntry = updateLeitnerEntry(prevEntry, ok);
      setStore(s => ({
        ...s,
        profiles: s.profiles.map(p => p.id === currentProfile.id
          ? { ...p, leitner: { ...(p.leitner || {}), [k]: newEntry } }
          : p
        ),
      }));
    }

    const cat = ok ? TIER_CAT[ti] : rand(FAIL_CATS);
    const label = ok ? rand(TIER_LABELS[ti]) : (isTimeout ? "Trop tard !" : "Oups !");

    setFb({
      ok, cat, label, isTimeout, q: curQ, userAns,
      gAnimal, gPlants, gFoods, gKeepers, gJunk,
      cLabel, combo: newCombo,
    });
    fbStartRef.current = Date.now();
    setPhase("fb");
  }

  // ── advance : quitter l'écran de feedback vers la suite ──────────────────
  // Trois issues possibles : (a) trop tôt → on ignore (anti-skip) ; (b) c'était
  // un 1er timeout → on renvoie le calcul en fin de file et on revient au jeu ;
  // (c) cas normal → question suivante, ou fin de partie si c'était la dernière.
  function advance() {
    // Guard: prevent skipping feedback via held-down Enter / rapid double-press
    if (Date.now() - fbStartRef.current < FB_MIN_MS) return;

    // Soft-retry on first timeout: move the current calc to the end and continue
    // without incrementing qi (the next calc shifts into the current slot).
    if (fb?.retryTimeout) {
      setQs(prev => {
        const newQs = [...prev];
        const [curr] = newQs.splice(qi, 1);
        newQs.push({ ...curr, _retried: true });
        return newQs;
      });
      setFb(null);
      setVal("");
      subRef.current = false;
      setPhase("game");
      return;
    }

    setFb(null);
    if (qi + 1 >= qs.length) {
      // If the run is perfect (no errors), capture a stable celebration
      if (errors.length === 0) {
        setPerfectInfo({
          emoji: rand(CELEBRATIONS),
          label: rand(PERFECT_LABELS),
        });
      }
      setPhase("end");
    } else {
      setQi(i => i + 1);
      setPhase("game");
    }
  }

  function onKeyDown(e) {
    if (e.key === "Enter" && val.trim() && phase === "game") {
      handleSubmit(false);
    }
  }

  // ── Helpers de sélection des tables (écran menu) ─────────────────────────
  // selected = liste de demi-tables "T-H" cochées par l'enfant pour sa partie.
  // toggleHalf  : (dé)coche une seule moitié.
  // toggleTable : (dé)coche les deux moitiés d'une table d'un coup.
  // toggleAll   : tout cocher / tout décocher.
  // Les tris maintiennent un ordre stable (table croissante, bas avant haut).
  // Toggle a single half (e.g. "4-low" or "4-high")
  function toggleHalf(t, h) {
    const k = halfKey(t, h);
    setSelected(s => {
      const next = s.includes(k) ? s.filter(x => x !== k) : [...s, k];
      // Keep order by table then low-before-high for consistency
      return next.sort((a, b) => {
        const [at, ah] = a.split("-");
        const [bt, bh] = b.split("-");
        if (+at !== +bt) return +at - +bt;
        return ah === "low" ? -1 : 1;
      });
    });
  }

  // Toggle the whole table: if any half is on, turn both off; otherwise turn both on
  function toggleTable(t) {
    const lowK = halfKey(t, "low");
    const highK = halfKey(t, "high");
    setSelected(s => {
      const hasAny = s.includes(lowK) || s.includes(highK);
      if (hasAny) return s.filter(x => x !== lowK && x !== highK);
      const next = [...s, lowK, highK];
      return next.sort((a, b) => {
        const [at, ah] = a.split("-");
        const [bt, bh] = b.split("-");
        if (+at !== +bt) return +at - +bt;
        return ah === "low" ? -1 : 1;
      });
    });
  }

  function toggleAll() {
    setSelected(selected.length === ALL_HALVES.length ? [] : [...ALL_HALVES]);
  }
  function setQuickTurns(n) {
    setNbTurns(n);
    setCustomTurns("");
  }
  function onCustomTurns(v) {
    setCustomTurns(v);
    const n = parseInt(v, 10);
    if (!isNaN(n) && n >= 3 && n <= 99) setNbTurns(n);
  }

  // ── Debug helpers ─────────────────────────────────────────────────────────
  // Outils de l'écran "debug" (accessible via la roue dentée de l'écran profils).
  // Réservé au dépannage/développement : copie du store en JSON, rechargement,
  // réinitialisation d'un profil, effacement total. Les actions destructrices
  // passent toutes par askConfirm() → l'utilisateur doit taper "OUI" en toutes
  // lettres avant exécution (voir runConfirm).
  function debugCopyDump() {
    try {
      const text = JSON.stringify(store, null, 2);
      navigator.clipboard.writeText(text).then(
        () => { setDebugCopyMsg("Copié ✓"); setTimeout(() => setDebugCopyMsg(""), 1500); },
        () => { setDebugCopyMsg("Échec copie"); setTimeout(() => setDebugCopyMsg(""), 1500); }
      );
    } catch (e) {
      setDebugCopyMsg("Échec copie");
      setTimeout(() => setDebugCopyMsg(""), 1500);
    }
  }

  function debugReload() {
    try { window.location.reload(); } catch (e) {}
  }

  function debugResetCurrentProfile() {
    if (!currentProfile) return;
    setStore(s => ({
      ...s,
      profiles: s.profiles.map(p => p.id === currentProfile.id
        ? {
            ...p,
            streak: { current: 0, best: 0, lastPlayed: null, playedDates: [] },
            leitner: makeLeitner(),
            dailyChallenge: { lastCompletedDate: null, history: [] },
          }
        : p),
    }));
  }

  function debugWipeAll() {
    try { localStorage.removeItem(STORAGE_KEY); } catch (e) {}
    setStore({ version: SCHEMA_VERSION, profiles: [], currentProfileId: null });
    setProfileScreen("create");
    setPhase("profiles");
  }

  // Open a destructive-action confirm dialog. The action runs only after the
  // user types "OUI" (uppercase) and clicks Confirmer.
  function askConfirm(label, run) {
    setDebugConfirmText("");
    setDebugConfirm({ label, run });
  }
  function cancelConfirm() {
    setDebugConfirm(null);
    setDebugConfirmText("");
  }
  function runConfirm() {
    if (!debugConfirm) return;
    if (debugConfirmText !== "OUI") return;       // safety: only "OUI" runs
    const fn = debugConfirm.run;
    setDebugConfirm(null);
    setDebugConfirmText("");
    fn();
  }

  // ─── 5. HELPERS DE STYLE ET DE RENDU ───────────────────────────────────────
  // Le jeu n'utilise QUE des styles inline (aucune feuille CSS externe) afin de
  // rester dans un unique fichier portable. cardStyle et btnStyle factorisent
  // les deux apparences les plus répétées : la « carte » blanche centrale et les
  // boutons arrondis colorés. btnStyle() est une fabrique : on lui passe une
  // couleur de fond et son ombre assortie.
  const cardStyle = {
    background: "white",
    borderRadius: 28,
    padding: "24px 22px",
    maxWidth: 440,
    width: "100%",
    boxShadow: "0 16px 48px rgba(74,64,99,0.12)",
    position: "relative",
    textAlign: "center",
    zIndex: 1,
  };

  const btnStyle = (bg = "#FF8FAB", shadow = "rgba(255,143,171,0.4)", disabled = false) => ({
    background: bg,
    color: "white",
    border: "none",
    borderRadius: 50,
    padding: "12px 32px",
    fontSize: 17,
    fontWeight: 800,
    cursor: disabled ? "default" : "pointer",
    fontFamily: "inherit",
    opacity: disabled ? 0.4 : 1,
    boxShadow: `0 4px 16px ${shadow}`,
    transition: "transform 0.12s",
  });

  // ── Zoo reveal cascade timing ──────────────────────────────────────────────
  // Each section reveals its emojis one by one, sections appear sequentially.
  // We compute a global "delay" for every emoji so the cascade is continuous,
  // even across animal sub-groups (one family fully reveals before the next).
  const ANIM_STEP    = 0.18;  // s between each animal
  const FAMILY_GAP   = 0.25;  // s extra pause between two animal families
  const KEEPER_STEP  = 0.22;
  const VEGGIE_STEP  = 0.15;
  const JUNK_STEP    = 0.20;
  const SECTION_GAP  = 0.4;
  const ANIM_CAP     = 6.0;
  const KEEPER_CAP   = 2.5;
  const VEGGIE_CAP   = 3.5;
  const JUNK_CAP     = 2.5;

  // Group animals by table+half, ordered by table (2→9) then low before high.
  // Each animal also gets a global cascade delay assigned in display order.
  const animalGroups = (() => {
    const groups = [];
    const tables = Object.keys(TABLES).map(Number).sort((a, b) => a - b);
    let cumulativeDelay = 0;
    for (const t of tables) {
      for (const h of ["low", "high"]) {
        const items = animals.filter(a => a.table === t && a.half === h);
        if (items.length === 0) continue;
        const itemsWithDelay = items.map((a, i) => ({
          ...a,
          delay: Math.min(cumulativeDelay + i * ANIM_STEP, ANIM_CAP),
        }));
        const span = (items.length - 1) * ANIM_STEP;
        cumulativeDelay = Math.min(cumulativeDelay + span, ANIM_CAP) + FAMILY_GAP;
        groups.push({
          table: t,
          half: h,
          name: TABLES[t][h].name,
          items: itemsWithDelay,
        });
      }
    }
    return groups;
  })();

  // animalsLast = delay of the very last animal across all groups
  const animalsLast = (() => {
    if (animalGroups.length === 0) return 0;
    const lastGroup = animalGroups[animalGroups.length - 1];
    const lastItem = lastGroup.items[lastGroup.items.length - 1];
    return lastItem.delay;
  })();
  const keepersBase = animals.length > 0 ? animalsLast + SECTION_GAP : 0;
  const keepersLast = keepers.length > 0 ? Math.min((keepers.length - 1) * KEEPER_STEP, KEEPER_CAP) : 0;
  const veggieBase  = keepersBase + (keepers.length > 0 ? keepersLast + SECTION_GAP : 0);
  const totalVeggie = plants.length + foods.length;
  const veggieLast  = totalVeggie > 0 ? Math.min((totalVeggie - 1) * VEGGIE_STEP, VEGGIE_CAP) : 0;
  const junkBase    = veggieBase + (totalVeggie > 0 ? veggieLast + SECTION_GAP : 0);

  // ── Rendu de l'écran d'AUTH (picker / login / create) ────────────────────
  // Retour anticipé : tant que authPhase !== "authed", on n'entre PAS dans le
  // jeu — on affiche l'écran d'auth dans le même wrapper visuel que le jeu
  // (mêmes couleurs, même feuille de styles, pour la transition douce).
  if (supabase && authPhase !== "authed") {
    const wrapper = {
      minHeight: "100vh",
      background: "linear-gradient(135deg, #FFF5F8 0%, #F4F0FF 50%, #FFF8E8 100%)",
      display: "flex", alignItems: "center", justifyContent: "center",
      fontFamily: '"Comic Sans MS", "Chalkboard SE", system-ui, sans-serif',
      padding: 16,
    };
    const cardSt = {
      background: "white", borderRadius: 24, padding: 26,
      boxShadow: "0 18px 40px rgba(74,64,99,0.18)",
      maxWidth: 420, width: "100%",
      textAlign: "center",
    };
    const titleSt = { fontSize: 22, fontWeight: 800, color: "#4A4063", marginBottom: 4 };
    const subtitleSt = { fontSize: 13, color: "#9B8FAE", marginBottom: 22 };
    const errSt = { color: "#D85070", fontSize: 13, fontWeight: 700, marginTop: 14, minHeight: 18 };
    const linkSt = {
      background: "transparent", border: "none", color: "#9B8FAE",
      fontSize: 13, fontWeight: 700, cursor: "pointer", fontFamily: "inherit",
      padding: "8px 12px", textDecoration: "underline",
    };
    const primaryBtn = (color = "#7BC9A0", shadow = "rgba(123,201,160,0.4)") => ({
      background: `linear-gradient(135deg, ${color}, ${color}cc)`,
      color: "white", border: "none", borderRadius: 50,
      padding: "11px 22px", fontSize: 15, fontWeight: 800,
      cursor: "pointer", fontFamily: "inherit",
      boxShadow: `0 4px 14px ${shadow}`,
    });
    const pseudoInput = (
      <input
        type="text"
        autoCapitalize="words"
        autoCorrect="off"
        spellCheck={false}
        maxLength={20}
        placeholder="Ton pseudo"
        value={authPseudo}
        onChange={e => { setAuthPseudo(e.target.value); setAuthError(""); }}
        style={{
          width: "100%", maxWidth: 280, boxSizing: "border-box",
          padding: "11px 16px", fontSize: 16, fontFamily: "inherit",
          textAlign: "center", borderRadius: 16,
          border: "2px solid #D6CFE2", background: "white", color: "#4A4063",
          outline: "none", marginBottom: 14,
        }}
      />
    );
    return (
      <div style={wrapper}>
        <style>{`
          @keyframes mk-fade-auth { from {opacity:0;} to {opacity:1;} }
          .mk-fade-auth { animation: mk-fade-auth 0.25s ease both; }
        `}</style>
        <div style={cardSt} className="mk-fade-auth">
          {authPhase === "picker" && (
            <>
              <div style={{ fontSize: 38, marginBottom: 6 }}>🐱</div>
              <div style={titleSt}>Mathiko Zoo</div>
              <div style={subtitleSt}>Connecte-toi à ton refuge</div>
              {knownUsers.length > 0 ? (
                <>
                  <div style={{ fontSize: 12, color: "#9B8FAE", fontWeight: 700, marginBottom: 10, textAlign: "left" }}>
                    Refuges connus sur cet appareil :
                  </div>
                  <div style={{ display: "flex", flexDirection: "column", gap: 8, marginBottom: 18 }}>
                    {knownUsers.map(u => (
                      <div key={u.id} style={{
                        display: "flex", alignItems: "center", gap: 12,
                        padding: 10, borderRadius: 16,
                        background: "#FAF7FF", border: "2px solid #EDE5F5",
                      }}>
                        <button onClick={() => {
                          setAuthSelected(u); setAuthPseudo(u.pseudo);
                          setAuthPin(""); setAuthError("");
                          setAuthPhase("login");
                        }} style={{
                          flex: 1, display: "flex", alignItems: "center", gap: 12,
                          background: "transparent", border: "none", padding: 4,
                          fontFamily: "inherit", cursor: "pointer", textAlign: "left",
                        }}>
                          <span style={{ fontSize: 28 }}>{u.avatar}</span>
                          <span style={{ fontSize: 16, fontWeight: 800, color: "#4A4063" }}>{u.pseudo}</span>
                        </button>
                        <button
                          onClick={() => {
                            if (confirm(`Retirer le refuge « ${u.pseudo} » de cet appareil ?\n(Le refuge n'est pas supprimé, juste retiré de la liste rapide.)`)) {
                              forgetUser(u.id);
                            }
                          }}
                          title="Retirer de cet appareil"
                          style={{
                            background: "transparent", border: "none", color: "#C4B8D4",
                            fontSize: 16, cursor: "pointer", padding: "4px 8px",
                          }}
                        >✕</button>
                      </div>
                    ))}
                  </div>
                </>
              ) : (
                <div style={{ fontSize: 13, color: "#9B8FAE", marginBottom: 18, lineHeight: 1.4 }}>
                  Première fois sur cet appareil ? Crée ton refuge ou connecte-toi avec ton pseudo.
                </div>
              )}
              <button
                onClick={() => {
                  setAuthPseudo(""); setAuthAvatar(AVATARS[0]); setAuthPin(""); setAuthError("");
                  setAuthPhase("create");
                }}
                style={primaryBtn()}
              >
                ✨ Créer un nouveau refuge
              </button>
              <div style={{ marginTop: 8 }}>
                <button
                  onClick={() => {
                    setAuthSelected(null); setAuthPseudo(""); setAuthPin(""); setAuthError("");
                    setAuthPhase("login");
                  }}
                  style={linkSt}
                >
                  J'ai un refuge sur un autre appareil
                </button>
              </div>
            </>
          )}
          {authPhase === "login" && (
            <>
              {authSelected ? (
                <>
                  <div style={{ fontSize: 48, marginBottom: 4 }}>{authSelected.avatar}</div>
                  <div style={titleSt}>Salut, {authSelected.pseudo} !</div>
                  <div style={subtitleSt}>Entre ton code à 4 chiffres</div>
                </>
              ) : (
                <>
                  <div style={{ fontSize: 38, marginBottom: 6 }}>🔑</div>
                  <div style={titleSt}>Reconnecte-toi</div>
                  <div style={subtitleSt}>Pseudo et code à 4 chiffres</div>
                  {pseudoInput}
                </>
              )}
              <PinPad
                value={authPin}
                onChange={v => { setAuthPin(v); setAuthError(""); }}
                onSubmit={pin => doLogin(authPseudo, pin)}
                disabled={authBusy || (!authSelected && authPseudo.trim().length < 2)}
              />
              <div style={errSt}>{authError}</div>
              <div style={{ marginTop: 14 }}>
                <button
                  onClick={() => {
                    setAuthSelected(null); setAuthPin(""); setAuthError("");
                    setAuthPhase("picker");
                  }}
                  style={linkSt}
                >
                  ← Retour
                </button>
              </div>
            </>
          )}
          {authPhase === "create" && (
            <>
              <div style={{ fontSize: 38, marginBottom: 6 }}>✨</div>
              <div style={titleSt}>Crée ton refuge</div>
              <div style={subtitleSt}>Choisis un pseudo, un avatar et un code à 4 chiffres</div>
              {pseudoInput}
              <div style={{
                display: "grid", gridTemplateColumns: "repeat(6, 1fr)", gap: 6,
                marginBottom: 18, maxWidth: 280, marginLeft: "auto", marginRight: "auto",
              }}>
                {AVATARS.map(a => (
                  <button key={a} onClick={() => setAuthAvatar(a)} style={{
                    fontSize: 24, padding: "8px 0",
                    background: authAvatar === a ? "#FFE17A" : "white",
                    border: `2px solid ${authAvatar === a ? "#FFB347" : "#D6CFE2"}`,
                    borderRadius: 12, cursor: "pointer", fontFamily: "inherit",
                  }}>{a}</button>
                ))}
              </div>
              <div style={{ fontSize: 12, color: "#9B8FAE", fontWeight: 700, marginBottom: 10 }}>
                Code à 4 chiffres (à retenir !)
              </div>
              <PinPad
                value={authPin}
                onChange={v => { setAuthPin(v); setAuthError(""); }}
                onSubmit={pin => {
                  if (authPseudo.trim().length < 2) {
                    setAuthError("Pseudo trop court (2 caractères minimum).");
                    return;
                  }
                  doCreate(authPseudo.trim(), authAvatar, pin);
                }}
                disabled={authBusy || authPseudo.trim().length < 2}
              />
              <div style={errSt}>{authError}</div>
              <div style={{ marginTop: 14 }}>
                <button
                  onClick={() => {
                    setAuthPseudo(""); setAuthAvatar(AVATARS[0]); setAuthPin(""); setAuthError("");
                    setAuthPhase("picker");
                  }}
                  style={linkSt}
                >
                  ← Retour
                </button>
              </div>
            </>
          )}
          {authPhase === "loading" && (
            <>
              <div style={{ fontSize: 38, marginBottom: 6 }}>🐱</div>
              <div style={titleSt}>Mathiko Zoo</div>
              <div style={subtitleSt}>Un instant…</div>
            </>
          )}
        </div>
      </div>
    );
  }

  // ─── 6. RENDU ───────────────────────────────────────────────────────────────
  // Un unique <div> conteneur, puis une longue suite de blocs conditionnels
  // `{phase === "x" && (…)}` : un seul s'affiche à la fois selon `phase`.
  // Les modales (selectedCell, quitConfirm, debugConfirm, techStatsOpen) se
  // superposent par-dessus via position:fixed et leur propre condition.
  // ──────────────────────────────────────────────────────────────────────────
  return (
    <div style={{
      minHeight: "100vh",
      background: "linear-gradient(135deg, #FFF5F8 0%, #F4F0FF 50%, #FFF8E8 100%)",
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
      fontFamily: '"Comic Sans MS", "Chalkboard SE", system-ui, sans-serif',
      padding: 16,
    }}>
      {/* Bloc <style> global : la SEULE feuille de style du jeu. Il définit les
          keyframes des animations, toutes préfixées « mk- » (Mathiko Zoo).
          Pour animer un élément, lui donner className="mk-xxx" :
            mk-slide  = entrée d'écran (glissé vers le haut)
            mk-fade   = simple fondu
            mk-pop    = apparition élastique (effet « ressort »)
            mk-bounce = chute rebondissante (animaux qui « tombent » dans le zoo)
            mk-spin   = rotation (plantes/nourritures)
            mk-drop   = chute droite (objets rigolos en cas d'erreur)
            mk-wiggle = secousse (chat « je ne sais pas »)
            mk-cell-improve = halo doré sur une case du refuge qui a progressé
            mk-zoodex-new   = pop verte pour une PREMIÈRE découverte dans le Zoodex
            mk-pulse-attn   = pulse continue (badge « du nouveau, viens voir ! ») */}
      <style>{`
        * { box-sizing: border-box; }
        input[type=number]::-webkit-inner-spin-button,
        input[type=number]::-webkit-outer-spin-button { -webkit-appearance: none; margin: 0; }
        input[type=number] { -moz-appearance: textfield; }
        @keyframes mk-slide { from { opacity: 0; transform: translateY(16px); } to { opacity: 1; transform: translateY(0); } }
        @keyframes mk-fade  { from { opacity: 0; } to { opacity: 1; } }
        @keyframes mk-pop   { 0% { transform: scale(0); } 50% { transform: scale(1.3); } 100% { transform: scale(1); } }
        @keyframes mk-bounce {
          0% { transform: translateY(-160px) scale(0.4); opacity: 0; }
          60% { transform: translateY(15px) scale(1.1); opacity: 1; }
          80% { transform: translateY(-8px) scale(0.95); }
          100% { transform: translateY(0) scale(1); opacity: 1; }
        }
        @keyframes mk-spin {
          0% { transform: rotate(0deg) scale(0); }
          60% { transform: rotate(540deg) scale(1.2); }
          100% { transform: rotate(720deg) scale(1); }
        }
        @keyframes mk-drop {
          0% { transform: translateY(-220px); opacity: 0; }
          30% { opacity: 1; }
          100% { transform: translateY(0); opacity: 1; }
        }
        @keyframes mk-wiggle {
          0%, 100% { transform: rotate(0deg); }
          25% { transform: rotate(-8deg); }
          75% { transform: rotate(8deg); }
        }
        @keyframes mk-cell-improve {
          0%   { transform: scale(1); box-shadow: 0 0 0 0 rgba(255,210,80,0); }
          25%  { transform: scale(1.18); box-shadow: 0 0 0 6px rgba(255,210,80,0.7); }
          60%  { transform: scale(1.08); box-shadow: 0 0 0 10px rgba(255,210,80,0); }
          100% { transform: scale(1); box-shadow: 0 0 0 0 rgba(255,210,80,0); }
        }
        @keyframes mk-zoodex-new {
          0%   { transform: scale(0); opacity: 0; box-shadow: 0 0 0 0 rgba(123,201,160,0); }
          40%  { transform: scale(1.3); opacity: 1; box-shadow: 0 0 0 6px rgba(123,201,160,0.55); }
          70%  { transform: scale(0.95); box-shadow: 0 0 0 12px rgba(123,201,160,0); }
          100% { transform: scale(1); opacity: 1; box-shadow: 0 0 0 0 rgba(123,201,160,0); }
        }
        @keyframes mk-pulse-attn {
          0%, 100% { box-shadow: 0 0 0 0 rgba(165,148,201,0.55); transform: scale(1); }
          50%      { box-shadow: 0 0 0 9px rgba(165,148,201,0);    transform: scale(1.06); }
        }
        .mk-slide  { animation: mk-slide 0.32s ease-out both; }
        .mk-fade   { animation: mk-fade 0.18s ease both; }
        .mk-pop    { animation: mk-pop 0.4s cubic-bezier(.34,1.56,.64,1) both; }
        .mk-bounce { animation: mk-bounce 0.7s cubic-bezier(.34,1.56,.64,1) both; }
        .mk-spin   { animation: mk-spin 0.85s ease-out both; }
        .mk-drop   { animation: mk-drop 0.6s cubic-bezier(.55,.05,.85,.4) both; }
        .mk-wiggle { animation: mk-wiggle 0.4s ease both; }
        .mk-cell-improve { animation: mk-cell-improve 1.4s cubic-bezier(.34,1.56,.64,1) both; }
        .mk-zoodex-new   { animation: mk-zoodex-new 0.9s cubic-bezier(.34,1.56,.64,1) both; }
        .mk-pulse-attn   { animation: mk-pulse-attn 1.6s ease-in-out infinite; }
      `}</style>

      {/* ═══ PROFILES ═══ */}
      {/* Écran d'accueil : choisir un profil existant ou en créer un. Deux
          sous-écrans pilotés par `profileScreen` ("list" / "create"). La roue
          dentée en haut à droite ouvre l'écran debug. */}
      {phase === "profiles" && bootstrapped && (
        <div style={cardStyle} className="mk-slide">
          {/* Gear button (debug menu) — top right */}
          <button
            onClick={() => setPhase("debug")}
            title="Menu debug"
            style={{
              position: "absolute", top: 12, right: 12,
              background: "transparent", border: "none",
              cursor: "pointer", fontSize: 20,
              padding: 4, lineHeight: 1,
              opacity: 0.4, transition: "opacity 0.2s",
              fontFamily: "inherit",
            }}
            onMouseEnter={ev => ev.currentTarget.style.opacity = 1}
            onMouseLeave={ev => ev.currentTarget.style.opacity = 0.4}
          >
            ⚙️
          </button>
          <div style={{ fontSize: 44, marginBottom: 4 }}>🐾</div>
          <h1 style={{ fontSize: 30, fontWeight: 800, color: "#4A4063", margin: "0 0 4px" }}>
            Mathiko Zoo
          </h1>

          {profileScreen === "list" && store.profiles.length > 0 && (
            <>
              <p style={{ color: "#9B8FAE", fontSize: 14, marginBottom: 20 }}>
                Qui joue aujourd'hui ?
              </p>

              <div style={{ display: "flex", flexDirection: "column", gap: 8, marginBottom: 16 }}>
                {store.profiles.map(p => (
                  <div key={p.id} style={{
                    display: "flex", alignItems: "center", gap: 10,
                    background: "#FFF0F5",
                    border: "2px solid #FFCEDB",
                    borderRadius: 18, padding: "8px 10px",
                  }}>
                    <button
                      onClick={() => selectProfile(p.id)}
                      style={{
                        flex: 1, display: "flex", alignItems: "center", gap: 12,
                        background: "transparent", border: "none", cursor: "pointer",
                        fontFamily: "inherit", textAlign: "left", padding: "4px 6px",
                      }}
                    >
                      <span style={{ fontSize: 32, lineHeight: 1 }}>{p.avatar}</span>
                      <span style={{ display: "flex", flexDirection: "column" }}>
                        <span style={{ fontSize: 17, fontWeight: 800, color: "#4A4063" }}>{p.name}</span>
                        <span style={{ fontSize: 12, color: "#9B8FAE", fontWeight: 700 }}>
                          {(() => {
                            const eff = effectiveStreak(p, todayStr());
                            return eff > 0 ? `${streakTier(eff)} ${eff}j` : "Nouveau zoo !";
                          })()}
                        </span>
                      </span>
                    </button>
                    <button
                      onClick={() => {
                        if (confirm(`Supprimer le profil de ${p.name} ?\n\nToutes ses données seront effacées.`)) {
                          deleteProfile(p.id);
                        }
                      }}
                      title="Supprimer ce profil"
                      style={{
                        background: "transparent", border: "none",
                        color: "#C4B8D4", fontSize: 18,
                        cursor: "pointer", padding: "4px 8px",
                        fontFamily: "inherit",
                      }}
                    >
                      🗑
                    </button>
                  </div>
                ))}
              </div>

              <button
                onClick={() => { setNewName(""); setNewAvatar(AVATARS[0]); setProfileScreen("create"); }}
                style={btnStyle("#FF8FAB", "rgba(255,143,171,0.4)")}
              >
                ＋ Nouveau profil
              </button>
            </>
          )}

          {(profileScreen === "create" || store.profiles.length === 0) && (
            <>
              <p style={{ color: "#9B8FAE", fontSize: 14, marginBottom: 18 }}>
                {store.profiles.length === 0 ? "Crée ton profil pour commencer !" : "Crée un nouveau profil"}
              </p>

              <p style={{ fontSize: 11, letterSpacing: 2, color: "#C4B8D4", fontWeight: 800, textTransform: "uppercase", marginBottom: 6 }}>
                Ton prénom
              </p>
              <input
                type="text"
                value={newName}
                onChange={e => setNewName(e.target.value)}
                placeholder="Ex. Léa"
                maxLength={16}
                style={{
                  width: "100%", fontSize: 18, fontWeight: 700,
                  textAlign: "center", padding: "10px 14px",
                  border: "3px solid #EEE4FF", borderRadius: 16,
                  color: "#4A4063", background: "#FFF8FF",
                  fontFamily: "inherit", outline: "none",
                  marginBottom: 16,
                }}
              />

              <p style={{ fontSize: 11, letterSpacing: 2, color: "#C4B8D4", fontWeight: 800, textTransform: "uppercase", marginBottom: 6 }}>
                Choisis ton avatar
              </p>
              <div style={{
                display: "grid",
                gridTemplateColumns: "repeat(auto-fit, minmax(50px, 1fr))",
                gap: 6, marginBottom: 18,
              }}>
                {AVATARS.map(av => (
                  <button
                    key={av}
                    onClick={() => setNewAvatar(av)}
                    style={{
                      fontSize: 28, padding: "6px 4px",
                      background: newAvatar === av ? "#FFF0F5" : "transparent",
                      border: `3px solid ${newAvatar === av ? "#FF8FAB" : "#EFEAF5"}`,
                      borderRadius: 14,
                      cursor: "pointer", fontFamily: "inherit",
                      transition: "all 0.18s", lineHeight: 1,
                    }}
                  >
                    {av}
                  </button>
                ))}
              </div>

              <div style={{ display: "flex", gap: 10, justifyContent: "center", flexWrap: "wrap" }}>
                {store.profiles.length > 0 && (
                  <button
                    onClick={() => setProfileScreen("list")}
                    style={btnStyle("#C4B8D4", "rgba(196,184,212,0.4)")}
                  >
                    Annuler
                  </button>
                )}
                <button
                  onClick={createProfile}
                  disabled={!newName.trim()}
                  style={btnStyle("#FF8FAB", "rgba(255,143,171,0.4)", !newName.trim())}
                >
                  C'est parti ! 🐾
                </button>
              </div>
            </>
          )}

          <p style={{
            marginTop: 18, marginBottom: 0,
            fontSize: 10, color: "#D4C8E0", fontWeight: 700,
            letterSpacing: 1.5, textTransform: "uppercase",
          }}>
            Mathiko Zoo · v{VERSION}
          </p>
        </div>
      )}

      {/* ═══ DEBUG ═══ */}
      {/* Écran de diagnostic (roue dentée). Affiche version, état du stockage,
          environnement, dump JSON du store, et les actions de maintenance.
          Le `(() => { … })()` est une IIFE : elle permet de calculer des
          variables locales (taille du store, etc.) juste avant le JSX. */}
      {phase === "debug" && (() => {
        // Compute environment info on the fly (cheap)
        const lsAvail = (() => {
          try { localStorage.setItem("__t", "1"); localStorage.removeItem("__t"); return true; }
          catch (e) { return false; }
        })();
        const dumpText = JSON.stringify(store, null, 2);
        const sizeKb = (new Blob([dumpText]).size / 1024).toFixed(2);
        const ua = (navigator.userAgent || "").slice(0, 60);
        const isOnline = typeof navigator.onLine === "boolean" ? navigator.onLine : true;
        const tz = Intl.DateTimeFormat().resolvedOptions().timeZone || "?";
        const today = todayStr();
        const url = (() => {
          try { return window.location.href; } catch (e) { return "?"; }
        })();

        // Reusable section style
        const secStyle = {
          background: "#FAF7FC", border: "1.5px solid #EAE3F2",
          borderRadius: 14, padding: "12px 14px", marginBottom: 12,
          textAlign: "left", fontSize: 12, color: "#4A4063",
        };
        const secTitle = {
          fontSize: 11, fontWeight: 800, color: "#9B8FAE",
          textTransform: "uppercase", letterSpacing: 1.5,
          marginBottom: 8,
        };
        const rowStyle = {
          display: "flex", justifyContent: "space-between",
          gap: 10, marginBottom: 4, fontFamily: "ui-monospace, monospace",
          fontSize: 11,
        };
        const labelCol = { color: "#9B8FAE", flexShrink: 0 };
        const valCol = { color: "#4A4063", fontWeight: 700, textAlign: "right",
          wordBreak: "break-all", overflow: "hidden", textOverflow: "ellipsis" };

        return (
          <div style={{ ...cardStyle, maxWidth: 480 }} className="mk-slide">
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 10 }}>
              <button onClick={() => setPhase("profiles")} style={{
                background: "transparent", border: "none", color: "#9B8FAE",
                fontSize: 14, fontWeight: 800, cursor: "pointer", fontFamily: "inherit",
                padding: "4px 8px",
              }}>
                ← Profils
              </button>
              <span style={{ fontSize: 11, color: "#C4B8D4", fontWeight: 800, letterSpacing: 2, textTransform: "uppercase" }}>
                ⚙️ Debug · v{VERSION}
              </span>
            </div>

            {/* Version */}
            <div style={secStyle}>
              <div style={secTitle}>📦 Version</div>
              <div style={rowStyle}><span style={labelCol}>Produit</span><span style={valCol}>v{VERSION}</span></div>
              <div style={rowStyle}><span style={labelCol}>Révision fichier</span><span style={valCol}>v{REVISION}</span></div>
              <div style={rowStyle}><span style={labelCol}>Schéma</span><span style={valCol}>v{SCHEMA_VERSION}</span></div>
              <div style={{ ...rowStyle, alignItems: "flex-start" }}>
                <span style={labelCol}>URL</span>
                <span style={{ ...valCol, fontSize: 10 }}>{url}</span>
              </div>
              <p style={{ fontSize: 10, color: "#9B8FAE", margin: "8px 0 0", lineHeight: 1.4 }}>
                <b>Produit</b> = version semver du jeu (<code>VERSION</code>), bouge quand le 
                joueur voit une différence. <b>Révision fichier</b> = <code>REVISION</code>, 
                compteur incrémenté à chaque livraison du fichier (<code>mathiko_v{REVISION}.jsx</code>), 
                même sans changement produit. <b>Schéma</b> = <code>SCHEMA_VERSION</code>, version 
                du format des données stockées ; incrémentée à chaque migration du <code>localStorage</code>.
              </p>
            </div>

            {/* Stockage */}
            <div style={secStyle}>
              <div style={secTitle}>💾 Stockage</div>
              <div style={rowStyle}><span style={labelCol}>Clé</span><span style={valCol}>{STORAGE_KEY}</span></div>
              <div style={rowStyle}><span style={labelCol}>localStorage</span><span style={valCol}>{lsAvail ? "✅ OK" : "❌ Indisponible"}</span></div>
              <div style={rowStyle}><span style={labelCol}>Taille du store</span><span style={valCol}>{sizeKb} Ko</span></div>
              <div style={rowStyle}><span style={labelCol}>Profils</span><span style={valCol}>{store.profiles.length}</span></div>
              <div style={rowStyle}><span style={labelCol}>Profil courant</span><span style={valCol}>{currentProfile ? `${currentProfile.avatar} ${currentProfile.name}` : "—"}</span></div>
            </div>

            {/* Environnement */}
            <div style={secStyle}>
              <div style={secTitle}>🌐 Environnement</div>
              <div style={{ ...rowStyle, alignItems: "flex-start" }}>
                <span style={labelCol}>UA</span>
                <span style={{ ...valCol, fontSize: 10 }}>{ua}</span>
              </div>
              <div style={rowStyle}><span style={labelCol}>En ligne</span><span style={valCol}>{isOnline ? "✅" : "❌"}</span></div>
              <div style={rowStyle}><span style={labelCol}>Date système</span><span style={valCol}>{today}</span></div>
              <div style={rowStyle}><span style={labelCol}>Fuseau</span><span style={valCol}>{tz}</span></div>
            </div>

            {/* Dump JSON */}
            <div style={secStyle}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 4 }}>
                <span style={secTitle}>🔍 Dump JSON</span>
                <button
                  onClick={() => setDebugDumpOpen(o => !o)}
                  style={{
                    background: "transparent", border: "none", color: "#FF8FAB",
                    fontSize: 12, fontWeight: 800, cursor: "pointer", fontFamily: "inherit",
                    textTransform: "uppercase", letterSpacing: 1, padding: 0,
                  }}
                >
                  {debugDumpOpen ? "Masquer" : "Afficher"}
                </button>
              </div>
              {debugDumpOpen && (
                <pre style={{
                  background: "#2A2336", color: "#E8E2F0",
                  borderRadius: 8, padding: 10,
                  fontSize: 10, lineHeight: 1.4,
                  maxHeight: 240, overflow: "auto",
                  whiteSpace: "pre", margin: 0,
                }}>{dumpText}</pre>
              )}
            </div>

            {/* Actions */}
            <div style={secStyle}>
              <div style={secTitle}>🛠️ Actions</div>
              <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                <button
                  onClick={debugCopyDump}
                  style={{ ...btnStyle("#7BC9A0", "rgba(123,201,160,0.4)"), fontSize: 13 }}
                >
                  📋 Copier le dump JSON {debugCopyMsg && <span style={{ fontSize: 11, opacity: 0.85, marginLeft: 6 }}>{debugCopyMsg}</span>}
                </button>
                <button
                  onClick={debugReload}
                  style={{ ...btnStyle("#C4B8D4", "rgba(196,184,212,0.4)"), fontSize: 13 }}
                >
                  🔄 Recharger l'app
                </button>
                <button
                  onClick={() => askConfirm(
                    `Réinitialiser le profil "${currentProfile?.name || "?"}" : série, Leitner et sauvetage du jour seront remis à zéro. Le profil et son avatar restent.`,
                    debugResetCurrentProfile
                  )}
                  disabled={!currentProfile}
                  style={{
                    ...btnStyle("#FFB347", "rgba(255,179,71,0.4)"),
                    fontSize: 13,
                    opacity: currentProfile ? 1 : 0.4,
                    cursor: currentProfile ? "pointer" : "not-allowed",
                  }}
                >
                  🗑️ Réinitialiser ce profil
                </button>
                <button
                  onClick={() => askConfirm(
                    "TOUTES les données seront effacées : tous les profils, toute leur progression, tout l'historique. Cette action est définitive.",
                    debugWipeAll
                  )}
                  style={{ ...btnStyle("#FF6B7A", "rgba(255,107,122,0.4)"), fontSize: 13 }}
                >
                  🧨 Effacer toutes les données
                </button>
              </div>
            </div>
          </div>
        );
      })()}

      {/* ═══ RECORDS (positive achievements, accessed from the refuge) ═══ */}
      {/* Écran « palmarès » : ne montre QUE du positif (records, animaux,
          collection) — c'est la vitrine encourageante. Le bouton « Suivi
          détaillé » ouvre une modale (techStatsOpen) avec les chiffres
          pédagogiques plus techniques (répartition Leitner, calculs qui
          coincent…), volontairement séparés pour ne pas décourager l'enfant. */}
      {phase === "records" && currentProfile && (() => {
        const profile = currentProfile;
        const records = profile.records || {
          bestTimeMs: null, biggestCalc: null,
          totalCalcsSolved: 0, animalsByTier: [0, 0, 0, 0],
        };
        const leitner = profile.leitner || {};

        // Enclos prêts (box 4-5) + familles complètes (from zoodex)
        let readyEnclos = 0;
        for (const k of ALL_CALC_KEYS) {
          const box = (leitner[k] && leitner[k].box) || 0;
          if (box >= 4) readyEnclos++;
        }
        const zAnimals = (profile.zoodex && profile.zoodex.animals) || {};
        let familiesComplete = 0;
        for (let t = 2; t <= 9; t++) {
          for (const h of ["low", "high"]) {
            let cnt = 0;
            for (let tier = 0; tier < 4; tier++) {
              if ((zAnimals[`${t}-${h}-${tier}`] || 0) > 0) cnt++;
            }
            if (cnt === 4) familiesComplete++;
          }
        }
        const abt = records.animalsByTier || [0, 0, 0, 0];
        const totalAnimals = abt.reduce((a, b) => a + b, 0);

        // Cosmetic helpers
        const secStyle = {
          background: "#FAF7FC", border: "1.5px solid #EAE3F2",
          borderRadius: 14, padding: "12px 14px", marginBottom: 12,
          textAlign: "left",
        };
        const secTitle = {
          fontSize: 11, fontWeight: 800, color: "#9B8FAE",
          textTransform: "uppercase", letterSpacing: 1.5,
          marginBottom: 8,
        };
        const rowStyle = {
          display: "flex", justifyContent: "space-between",
          gap: 10, marginBottom: 4, fontSize: 13,
        };
        const labelCol = { color: "#7B6E94" };
        const valCol = { color: "#4A4063", fontWeight: 800 };

        const TIER_NAMES = ["Fulgurant", "Rapide", "Bien", "Tranquille"];
        const TIER_ICONS = ["⚡", "💨", "👍", "🐾"];

        const bestTimeStr = records.bestTimeMs !== null
          ? (records.bestTimeMs / 1000).toFixed(1) + " s"
          : "—";
        const biggestStr = records.biggestCalc
          ? `${records.biggestCalc.a} × ${records.biggestCalc.b}`
          : "—";

        return (
          <div style={{ ...cardStyle, maxWidth: 480 }} className="mk-slide">
            {/* Header */}
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 10 }}>
              <button onClick={() => setPhase("zoomap")} style={{
                background: "transparent", border: "none", color: "#9B8FAE",
                fontSize: 14, fontWeight: 800, cursor: "pointer", fontFamily: "inherit",
                padding: "4px 8px",
              }}>
                ← Refuge
              </button>
              <span style={{ fontSize: 11, color: "#C4B8D4", fontWeight: 800, letterSpacing: 2, textTransform: "uppercase" }}>
                🏆 Records
              </span>
            </div>

            <div style={{ fontSize: 44, lineHeight: 1, marginBottom: 4 }}>{profile.avatar}</div>
            <h2 style={{ fontSize: 24, fontWeight: 800, color: "#4A4063", margin: "0 0 4px" }}>
              {profile.name}
            </h2>
            <p style={{ fontSize: 11, color: "#9B8FAE", marginBottom: 16 }}>
              Profil créé le {profile.createdAt}
            </p>

            {/* Tes records */}
            <div style={secStyle}>
              <div style={secTitle}>🏆 Tes records</div>
              <div style={rowStyle}>
                <span style={labelCol}>⚡ Réponse la plus rapide</span>
                <span style={valCol}>{bestTimeStr}</span>
              </div>
              <div style={rowStyle}>
                <span style={labelCol}>🔢 Plus gros calcul réussi</span>
                <span style={valCol}>{biggestStr}</span>
              </div>
              <div style={rowStyle}>
                <span style={labelCol}>✅ Calculs résolus</span>
                <span style={valCol}>{records.totalCalcsSolved || 0}</span>
              </div>
              <div style={rowStyle}>
                <span style={labelCol}>🏆 Meilleure série</span>
                <span style={valCol}>
                  {profile.streak?.best > 0
                    ? `${profile.streak.best}j ${streakTier(profile.streak.best)}`
                    : "—"}
                </span>
              </div>
            </div>

            {/* Animaux secourus */}
            <div style={secStyle}>
              <div style={secTitle}>🐾 Animaux secourus</div>
              <div style={{ textAlign: "center", marginBottom: 8 }}>
                <span style={{ fontSize: 34, fontWeight: 800, color: "#3F8F50" }}>{totalAnimals}</span>
                <span style={{ fontSize: 13, color: "#7B6E94" }}>&nbsp;au total</span>
              </div>
              {[0, 1, 2, 3].map(tier => (
                <div key={tier} style={rowStyle}>
                  <span style={labelCol}>{TIER_ICONS[tier]} {TIER_NAMES[tier]}</span>
                  <span style={valCol}>{abt[tier] || 0}</span>
                </div>
              ))}
            </div>

            {/* Collection */}
            <div style={secStyle}>
              <div style={secTitle}>🏅 Collection</div>
              <div style={rowStyle}>
                <span style={labelCol}>Familles complétées</span>
                <span style={valCol}>{familiesComplete} / 16</span>
              </div>
              <div style={rowStyle}>
                <span style={labelCol}>Enclos prêts</span>
                <span style={valCol}>{readyEnclos} / 64</span>
              </div>
            </div>

            <button
              onClick={() => setTechStatsOpen(true)}
              style={{ ...btnStyle("#9B8FAE", "rgba(155,143,174,0.4)"), fontSize: 13 }}
            >
              🔍 Suivi détaillé
            </button>

            <p style={{
              marginTop: 14, marginBottom: 0,
              fontSize: 10, color: "#D4C8E0", fontWeight: 700,
              letterSpacing: 1.5, textTransform: "uppercase",
            }}>
              Mathiko Zoo · v{VERSION}
            </p>
          </div>
        );
      })()}

      {/* Tech-stats sub-window — pedagogical / tracking detail */}
      {techStatsOpen && currentProfile && (() => {
        const profile = currentProfile;
        const leitner = profile.leitner || {};
        const today = todayStr();

        let totalAttempts = 0, everSeen = 0, mastered = 0, dueToday = 0, neverSeen = 0;
        const boxCounts = [0, 0, 0, 0, 0, 0];
        const problematic = [];
        for (const k of ALL_CALC_KEYS) {
          const e = leitner[k] || { box: 0, attempts: 0, lastSeen: null, nextDue: null };
          const box = e.box || 0;
          const att = e.attempts || 0;
          boxCounts[box]++;
          totalAttempts += att;
          if (e.lastSeen) everSeen++; else neverSeen++;
          if (box === 5) mastered++;
          if (e.lastSeen && box < 5 && e.nextDue && e.nextDue <= today) dueToday++;
          if (att >= 3 && box <= 2) {
            const [a, b] = k.split("-").map(Number);
            problematic.push({ k, a, b, box, attempts: att });
          }
        }
        problematic.sort((x, y) => y.attempts - x.attempts || x.box - y.box);
        const topProblematic = problematic.slice(0, 3);

        const dailyHist = profile.dailyChallenge?.history || [];
        const dailyDoneToday = profile.dailyChallenge?.lastCompletedDate === today;
        const dailyLast30 = dailyHist.filter(d => d >= addDays(today, -29)).length;

        const secTitle = {
          fontSize: 11, fontWeight: 800, color: "#9B8FAE",
          textTransform: "uppercase", letterSpacing: 1.5,
          marginBottom: 8, marginTop: 14,
        };
        const rowStyle = {
          display: "flex", justifyContent: "space-between",
          gap: 10, marginBottom: 4, fontSize: 13,
        };
        const labelCol = { color: "#7B6E94" };
        const valCol = { color: "#4A4063", fontWeight: 800 };
        const hintStyle = { fontSize: 11, color: "#9B8FAE", margin: "0 0 8px", lineHeight: 1.4 };
        const BOX_COLORS = ["#E5E2EC", "#D3C7BF", "#C99565", "#7E5A3F", "#A8E0A8", "#5FB371"];
        const BOX_LABELS = ["Friche", "En préparation 1", "En préparation 2", "En préparation 3", "Enclos prêt", "Maîtrisé"];
        // Couleur de texte lisible sur une pastille colorée selon la boîte.
        const boxTxt = box => (box === 2 || box === 3 || box === 5) ? "#fff" : "#4A4063";

        // ── Données « Progression par famille » (Option 1) ───────────────────
        // Pour chacune des 16 familles : ses 4 calculs (boîte + échéance) et un
        // résumé (nb d'enclos prêts, nb à revoir). Ordre canonique table 2→9.
        // ⚠️  On utilise ici le nom TECHNIQUE de la famille (« ×3 bas ») et JAMAIS
        // le nom ludique ni l'emoji animal : ce serait dévoiler le Zoodex avant
        // que l'enfant n'ait rencontré l'animal en jeu.
        const HALF_BS = { low: [2, 3, 4, 5], high: [6, 7, 8, 9] };
        const halfFr = h => (h === "low" ? "bas" : "haut"); // libellé technique
        const families = [];
        for (let t = 2; t <= 9; t++) {
          for (const half of ["low", "high"]) {
            const calcs = HALF_BS[half].map(b => {
              const e = leitner[calcKey(t, b)] || {};
              return {
                k: calcKey(t, b), a: t, b, box: e.box || 0,
                seen: !!e.lastSeen, due: dueShort(e.nextDue, today),
              };
            });
            families.push({
              name: `×${t} ${halfFr(half)}`, calcs,
              ready: calcs.filter(c => c.box >= 4).length,
              // « à revoir » = échéance dépassée ET pas encore maîtrisé (box < 5),
              // cohérent avec le filtre du mode Sauvetage du jour.
              dueCount: calcs.filter(c => c.due && c.due.due && c.box < 5).length,
            });
          }
        }

        // ── Données « Que propose chaque mini-jeu » (Option 2) ───────────────
        // calcsForMode() reproduit fidèlement les filtres de genQsLeitner ; on
        // regroupe ensuite les calculs éligibles par famille (nom technique).
        const MODE_INFO = [
          { mode: "clearing",  icon: "🪨", name: "Défricher",          desc: "boîte 0 déjà vue ou en bordure de zone explorée" },
          { mode: "build",     icon: "🚜", name: "Aménager",           desc: "boîtes 1 et 2 — premiers pas" },
          { mode: "cultivate", icon: "🌱", name: "Cultiver",           desc: "boîtes 3 et 4 — vers la maîtrise" },
          { mode: "challenge", icon: "⭐", name: "Sauvetage du jour",  desc: "calculs à revoir aujourd'hui" },
        ];
        const modeBreakdown = MODE_INFO.map(mi => {
          const calcs = calcsForMode(leitner, mi.mode);
          const famMap = {};
          for (const c of calcs) {
            const half = c.b <= 5 ? "low" : "high";
            const fk = `${c.a}-${half}`;
            if (!famMap[fk]) {
              famMap[fk] = { name: `×${c.a} ${halfFr(half)}`, count: 0 };
            }
            famMap[fk].count++;
          }
          return {
            ...mi, count: calcs.length,
            fams: Object.values(famMap).sort((x, y) => y.count - x.count),
          };
        });

        // En-tête repliable d'une sous-section. C'est une FONCTION qu'on appelle
        // — sectionHead(...) — et non un composant <Comp/> : ça évite tout
        // remontage à chaque rendu de la modale.
        const sectionHead = (key, label) => (
          <button
            onClick={() => setTechSections(s => ({ ...s, [key]: !s[key] }))}
            style={{
              ...secTitle, width: "100%", display: "flex",
              alignItems: "center", justifyContent: "space-between",
              background: "transparent", border: "none", cursor: "pointer",
              fontFamily: "inherit", padding: "4px 0",
              marginBottom: techSections[key] ? 8 : 2,
            }}
          >
            <span>{label}</span>
            <span style={{ fontSize: 12 }}>{techSections[key] ? "▾" : "▸"}</span>
          </button>
        );

        return (
          <div
            onClick={() => setTechStatsOpen(false)}
            style={{
              position: "fixed", inset: 0, zIndex: 200,
              background: "rgba(74,64,99,0.6)",
              display: "flex", alignItems: "center", justifyContent: "center",
              padding: 16,
            }}
          >
            <div
              onClick={ev => ev.stopPropagation()}
              className="mk-pop"
              style={{
                background: "white", borderRadius: 22, padding: "20px 20px 16px",
                maxWidth: 420, width: "100%",
                maxHeight: "85vh", overflowY: "auto",
                boxShadow: "0 24px 60px rgba(74,64,99,0.3)",
                textAlign: "left",
              }}
            >
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <h3 style={{ fontSize: 18, fontWeight: 800, color: "#4A4063", margin: 0 }}>
                  🔍 Suivi détaillé
                </h3>
                <button onClick={() => setTechStatsOpen(false)} style={{
                  background: "transparent", border: "none", color: "#9B8FAE",
                  fontSize: 18, cursor: "pointer", fontFamily: "inherit", padding: 4,
                }}>
                  ✕
                </button>
              </div>

              {/* ── 📦 Répartition des calculs (existant) ── */}
              {sectionHead("repartition", "📦 Répartition des calculs")}
              {techSections.repartition && boxCounts.map((count, box) => {
                const pct = (count / 64) * 100;
                return (
                  <div key={`box-${box}`} style={{ marginBottom: 6 }}>
                    <div style={{
                      display: "flex", justifyContent: "space-between",
                      fontSize: 11, marginBottom: 2, color: "#7B6E94",
                    }}>
                      <span><b style={{ color: "#4A4063" }}>Boîte {box}</b> · {BOX_LABELS[box]}</span>
                      <span style={{ fontWeight: 800, color: "#4A4063" }}>{count}/64</span>
                    </div>
                    {/* Fond de barre volontairement très clair : la couleur de
                        la boîte 0 (Friche) est pâle, il faut un fond plus clair
                        qu'elle pour qu'elle reste visible. */}
                    <div style={{ background: "#F7F3FC", borderRadius: 6, height: 10, overflow: "hidden", border: "1px solid #ECE5F4" }}>
                      <div style={{
                        width: `${pct}%`, height: "100%",
                        background: BOX_COLORS[box], borderRadius: 6,
                        transition: "width 0.4s ease-out",
                      }} />
                    </div>
                  </div>
                );
              })}

              {/* ── 📅 Activité (existant) ── */}
              {sectionHead("activite", "📅 Activité")}
              {techSections.activite && (
                <>
                  <div style={rowStyle}>
                    <span style={labelCol}>Sauvetage du jour</span>
                    <span style={valCol}>{dailyDoneToday ? "✅ fait aujourd'hui" : "à faire"}</span>
                  </div>
                  <div style={rowStyle}>
                    <span style={labelCol}>Sauvetages sur 30 jours</span>
                    <span style={valCol}>{dailyLast30} / 30</span>
                  </div>
                  <div style={rowStyle}>
                    <span style={labelCol}>À revoir aujourd'hui</span>
                    <span style={valCol}>{dueToday > 0 ? `🔁 ${dueToday}` : "—"}</span>
                  </div>
                  <div style={rowStyle}>
                    <span style={labelCol}>Calculs découverts</span>
                    <span style={valCol}>{everSeen} / 64</span>
                  </div>
                  <div style={rowStyle}>
                    <span style={labelCol}>Jamais testés</span>
                    <span style={valCol}>{neverSeen}</span>
                  </div>
                  <div style={rowStyle}>
                    <span style={labelCol}>Total de tentatives</span>
                    <span style={valCol}>{totalAttempts}</span>
                  </div>
                </>
              )}

              {/* ── 🩹 Les calculs qui coincent (existant) ── */}
              {topProblematic.length > 0 && (
                <>
                  {sectionHead("coincent", "🩹 Les calculs qui coincent")}
                  {techSections.coincent && (
                    <>
                      <p style={hintStyle}>
                        Calculs souvent tentés mais encore en préparation
                      </p>
                      <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
                        {topProblematic.map(c => (
                          <div key={c.k} style={{
                            display: "flex", justifyContent: "space-between", alignItems: "center",
                            background: "#FAF7FC", border: "1px solid #EAE3F2", borderRadius: 8,
                            padding: "6px 10px", fontSize: 13,
                          }}>
                            <span style={{ fontWeight: 800, color: "#4A4063" }}>{c.a} × {c.b}</span>
                            <span style={{ fontSize: 11, color: "#7B6E94" }}>
                              {c.attempts} tentative{c.attempts > 1 ? "s" : ""}
                              {" · "}
                              <span style={{
                                background: BOX_COLORS[c.box],
                                color: (c.box === 2 || c.box === 3 || c.box === 5) ? "#fff" : "#4A4063",
                                padding: "1px 6px", borderRadius: 4, fontWeight: 800,
                              }}>
                                boîte {c.box}
                              </span>
                            </span>
                          </div>
                        ))}
                      </div>
                    </>
                  )}
                </>
              )}

              {/* ── 🐾 Progression par famille (NOUVEAU — Option 1) ── */}
              {sectionHead("familles", "🐾 Progression par famille")}
              {techSections.familles && (
                <>
                  <p style={hintStyle}>
                    Les 16 familles de calculs (chaque table en deux moitiés :
                    « bas » = ×2 à ×5, « haut » = ×6 à ×9). Chaque pastille est
                    un calcul, colorée selon sa boîte ; un contour rose signale
                    un calcul « à revoir ».
                  </p>
                  <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                    {families.map(fam => (
                      <div key={fam.name} style={{
                        background: "#FAF7FC", border: "1px solid #EAE3F2",
                        borderRadius: 10, padding: "8px 10px",
                      }}>
                        <div style={{
                          display: "flex", justifyContent: "space-between",
                          alignItems: "center", marginBottom: 6,
                        }}>
                          <span style={{ fontSize: 12, fontWeight: 800, color: "#4A4063" }}>
                            {fam.name}
                          </span>
                          <span style={{ fontSize: 10, fontWeight: 700, color: "#7B6E94" }}>
                            {fam.ready}/4 prêt{fam.ready > 1 ? "s" : ""}{fam.dueCount > 0 ? ` · 🔁 ${fam.dueCount} à revoir` : ""}
                          </span>
                        </div>
                        <div style={{ display: "flex", gap: 5 }}>
                          {fam.calcs.map(c => {
                            const isDue = !!(c.due && c.due.due && c.box < 5);
                            return (
                              <div key={c.k} style={{
                                flex: 1, borderRadius: 7, padding: "5px 2px",
                                textAlign: "center",
                                background: BOX_COLORS[c.box], color: boxTxt(c.box),
                                border: isDue ? "2px solid #FF8FAB" : "2px solid transparent",
                              }}>
                                <div style={{ fontSize: 12, fontWeight: 800 }}>{c.a}×{c.b}</div>
                                <div style={{ fontSize: 8.5, fontWeight: 700, opacity: 0.85, marginTop: 1 }}>
                                  {!c.seen ? "jamais vu"
                                    : c.box === 5 ? "maîtrisé"
                                    : c.due ? c.due.label
                                    : `boîte ${c.box}`}
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    ))}
                  </div>
                </>
              )}

              {/* ── 🎮 Que propose chaque mini-jeu (NOUVEAU — Option 2) ── */}
              {sectionHead("minijeux", "🎮 Que propose chaque mini-jeu")}
              {techSections.minijeux && (
                <>
                  <p style={hintStyle}>
                    Combien de calculs chaque mini-jeu d'entretien piocherait en
                    ce moment, et les familles concernées.
                  </p>
                  <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                    {modeBreakdown.map(mb => (
                      <div key={mb.mode} style={{
                        background: "#FAF7FC", border: "1px solid #EAE3F2",
                        borderRadius: 10, padding: "8px 10px",
                      }}>
                        <div style={{
                          display: "flex", justifyContent: "space-between",
                          alignItems: "baseline", gap: 8,
                        }}>
                          <span style={{ fontSize: 13, fontWeight: 800, color: "#4A4063" }}>
                            {mb.icon} {mb.name}
                          </span>
                          <span style={{
                            fontSize: 12, fontWeight: 800,
                            color: mb.count > 0 ? "#5FB371" : "#B9AFCB",
                          }}>
                            {mb.count} calcul{mb.count > 1 ? "s" : ""}
                          </span>
                        </div>
                        <div style={{ fontSize: 10, color: "#9B8FAE", marginTop: 1 }}>{mb.desc}</div>
                        {mb.fams.length > 0 ? (
                          <div style={{ display: "flex", flexWrap: "wrap", gap: 4, marginTop: 6 }}>
                            {mb.fams.map(f => (
                              <span key={f.name} style={{
                                fontSize: 10, fontWeight: 700, color: "#6B5E86",
                                background: "#EFE9F6", borderRadius: 6, padding: "2px 6px",
                              }}>
                                {f.name}{f.count > 1 ? ` (${f.count})` : ""}
                              </span>
                            ))}
                          </div>
                        ) : (
                          <div style={{ fontSize: 11, color: "#B9AFCB", marginTop: 5 }}>
                            Aucun calcul disponible pour l'instant
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                  <p style={{ ...hintStyle, marginTop: 8, marginBottom: 0 }}>
                    🐾 <b>Mission d'entraînement</b> et 🎯 <b>S'entraîner par ici</b> ne
                    sont pas listées : la première est un mélange pondéré (pas un
                    filtre fixe), la seconde dépend de la case choisie dans le refuge.
                  </p>
                </>
              )}

              <button
                onClick={() => setTechStatsOpen(false)}
                style={{ ...btnStyle("#C4B8D4", "rgba(196,184,212,0.4)"), marginTop: 16, width: "100%" }}
              >
                Fermer
              </button>
            </div>
          </div>
        );
      })()}

      {/* Quit-game confirmation modal — simple yes/no */}
      {quitConfirm && (
        <div
          onClick={() => setQuitConfirm(false)}
          style={{
            position: "fixed", inset: 0, zIndex: 200,
            background: "rgba(74,64,99,0.65)",
            display: "flex", alignItems: "center", justifyContent: "center",
            padding: 16,
          }}
        >
          <div
            onClick={ev => ev.stopPropagation()}
            className="mk-pop"
            style={{
              background: "white", borderRadius: 24, padding: "20px 22px",
              maxWidth: 320, width: "100%", textAlign: "center",
              boxShadow: "0 24px 60px rgba(74,64,99,0.3)",
            }}
          >
            <div style={{ fontSize: 36, lineHeight: 1, marginBottom: 8 }}>🚪</div>
            <h3 style={{ fontSize: 18, fontWeight: 800, color: "#4A4063", margin: "0 0 8px" }}>
              Quitter l'expédition ?
            </h3>
            <p style={{ fontSize: 13, color: "#7B6E94", margin: "0 0 16px", lineHeight: 1.4 }}>
              Cette expédition ne comptera pas.
            </p>
            <div style={{ display: "flex", gap: 8, justifyContent: "center" }}>
              <button onClick={() => setQuitConfirm(false)} style={btnStyle("#7BC9A0", "rgba(123,201,160,0.4)")}>
                Continuer
              </button>
              <button onClick={quitGame} style={btnStyle("#FF6B7A", "rgba(255,107,122,0.4)")}>
                Quitter
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Debug confirm modal — type "OUI" to confirm */}
      {debugConfirm && (
        <div
          onClick={cancelConfirm}
          style={{
            position: "fixed", inset: 0, zIndex: 200,
            background: "rgba(74,64,99,0.65)",
            display: "flex", alignItems: "center", justifyContent: "center",
            padding: 16,
          }}
        >
          <div
            onClick={ev => ev.stopPropagation()}
            className="mk-pop"
            style={{
              background: "white", borderRadius: 24, padding: "20px 22px",
              maxWidth: 360, width: "100%",
              boxShadow: "0 24px 60px rgba(74,64,99,0.3)",
            }}
          >
            <div style={{ fontSize: 32, lineHeight: 1, marginBottom: 8, textAlign: "center" }}>⚠️</div>
            <h3 style={{ fontSize: 18, fontWeight: 800, color: "#4A4063", margin: "0 0 8px", textAlign: "center" }}>
              Confirmation requise
            </h3>
            <p style={{ fontSize: 13, color: "#7B6E94", margin: "0 0 14px", lineHeight: 1.4 }}>
              {debugConfirm.label}
            </p>
            <p style={{ fontSize: 12, color: "#4A4063", margin: "0 0 8px", fontWeight: 700 }}>
              Tape <code style={{ background: "#FFF0F5", padding: "2px 6px", borderRadius: 4 }}>OUI</code> pour confirmer :
            </p>
            <input
              type="text"
              autoFocus
              value={debugConfirmText}
              onChange={e => setDebugConfirmText(e.target.value)}
              placeholder="OUI"
              style={{
                width: "100%", padding: "10px 12px",
                fontSize: 16, fontWeight: 800, fontFamily: "ui-monospace, monospace",
                border: "2px solid " + (debugConfirmText === "OUI" ? "#FF6B7A" : "#EAE3F2"),
                borderRadius: 12, outline: "none",
                textAlign: "center", letterSpacing: 4,
                color: "#4A4063",
                marginBottom: 14,
                boxSizing: "border-box",
              }}
            />
            <div style={{ display: "flex", gap: 8, justifyContent: "center" }}>
              <button onClick={cancelConfirm} style={btnStyle("#C4B8D4", "rgba(196,184,212,0.4)")}>
                Annuler
              </button>
              <button
                onClick={runConfirm}
                disabled={debugConfirmText !== "OUI"}
                style={{
                  ...btnStyle("#FF6B7A", "rgba(255,107,122,0.4)"),
                  opacity: debugConfirmText === "OUI" ? 1 : 0.35,
                  cursor: debugConfirmText === "OUI" ? "pointer" : "not-allowed",
                }}
              >
                Confirmer
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ═══ MENU ═══ */}
      {/* Écran central : barre profil et accès aux espaces du jeu (refuge,
          Zoodex, préparation d'une Mission d'entraînement). Le choix des tables
          et du nombre de calculs se fait désormais dans le sous-écran "mission". */}
      {phase === "menu" && (
        <div style={cardStyle} className="mk-slide">
          {/* Profile bar */}
          {currentProfile && (
            <div style={{
              display: "flex", alignItems: "center",
              gap: 10, marginBottom: 14,
              padding: "8px 10px",
              background: "#FFF0F5",
              borderRadius: 16,
              border: "2px solid #FFCEDB",
            }}>
              <span style={{ fontSize: 26, lineHeight: 1 }}>{currentProfile.avatar}</span>
              <div style={{ flex: 1, textAlign: "left", display: "flex", flexDirection: "column", gap: 2 }}>
                <span style={{ fontSize: 14, fontWeight: 800, color: "#4A4063" }}>
                  {currentProfile.name}
                </span>
                {/* Ruban de la série : 7 jours glissants + tier + compteur.
                    Si la série est à 0 (jamais joué OU cassée), on affiche un
                    ruban de ⚪ et 👋 + un appel à jouer. */}
                {(() => {
                  const today = todayStr();
                  const eff = effectiveStreak(currentProfile, today);
                  const window = streakWindow(currentProfile, today);
                  const tier = streakTier(eff);
                  return (
                    <>
                      <span style={{ fontSize: 11, color: "#9B8FAE", fontWeight: 700 }}>
                        {eff > 0
                          ? `${eff} jour${eff > 1 ? "s" : ""} d'affilée`
                          : "Joue aujourd'hui pour démarrer ta série !"}
                      </span>
                      <span style={{
                        fontSize: 13, lineHeight: 1, letterSpacing: 0,
                        display: "inline-flex", alignItems: "center", gap: 4,
                        // ⚠️  whiteSpace: nowrap est indispensable — sans lui, le
                        // navigateur peut couper la chaîne d'emojis entre deux
                        // glyphes et fait passer le ruban sur 2 lignes quand la
                        // colonne du profil est étroite. Combiné avec une font
                        // un peu plus petite et letterSpacing 0, on tient les
                        // 7 emojis + tier sur une seule ligne même sur mobile.
                        whiteSpace: "nowrap",
                      }}>
                        <span>{window.map(x => x.emoji).join("")}</span>
                        <span style={{ marginLeft: 4 }}>{tier}</span>
                      </span>
                    </>
                  );
                })()}
              </div>
              <button
                onClick={supabase ? doLogout : switchProfile}
                title={supabase ? "Changer de refuge" : "Changer de profil"}
                style={{
                  background: "white", border: "2px solid #FFCEDB",
                  borderRadius: 14, padding: "5px 10px",
                  fontSize: 12, fontWeight: 800, color: "#9B8FAE",
                  cursor: "pointer", fontFamily: "inherit",
                }}
              >
                Changer
              </button>
            </div>
          )}

          <p style={{ fontSize: 11, letterSpacing: 4, color: "#C4B8D4", fontWeight: 800, textTransform: "uppercase", marginBottom: 4 }}>
            Tables de multiplication
          </p>
          <h1 style={{ fontSize: 36, fontWeight: 800, color: "#4A4063", lineHeight: 1, margin: "0 0 4px" }}>
            Le refuge de Mathiko
          </h1>
          <div style={{ fontSize: 54, marginBottom: 4, lineHeight: 1 }}>🐱</div>
          <div style={{ fontSize: 22, marginBottom: 6, lineHeight: 1, letterSpacing: 4 }}>
            {dailyEmojiTrio().join(" ")}
          </div>
          <p style={{ color: "#9B8FAE", fontSize: 14, marginBottom: 20 }}>
            Sauve les animaux en validant tes tables !
          </p>

          <div style={{ display: "flex", gap: 10, justifyContent: "center", flexWrap: "wrap", marginBottom: 8 }}>
            <button onClick={() => setPhase("zoomap")} style={btnStyle("#7BC9A0", "rgba(123,201,160,0.4)")}>
              🗺️ Mon refuge
            </button>
            <button onClick={() => setPhase("zoodex")} style={btnStyle("#A594C9", "rgba(165,148,201,0.4)")}>
              📔 Zoodex
            </button>
          </div>
          <div style={{ display: "flex", gap: 10, justifyContent: "center", flexWrap: "wrap", marginBottom: 22 }}>
            <button onClick={() => setPhase("mission")} style={{ ...btnStyle(), fontSize: 16, padding: "12px 24px" }}>
              Mission d'entraînement 🐾
            </button>
          </div>

          <p style={{
            marginTop: 16, marginBottom: 0,
            fontSize: 10, color: "#D4C8E0", fontWeight: 700,
            letterSpacing: 1.5, textTransform: "uppercase",
          }}>
            Mathiko Zoo · v{VERSION}
          </p>
        </div>
      )}

      {/* ═══ MISSION D'ENTRAÎNEMENT — préparation ═══ */}
      {/* Sous-écran ouvert depuis le bouton « Mission d'entraînement » du menu.
          On y choisit les tables (`selected`) et le nombre de calculs
          (`nbTurns`), puis on lance la partie en mode "play" via le bouton du
          bas. ⚠️  Depuis la v13, le mode "play" ne touche PLUS au Leitner —
          c'est du pur entraînement sans progression ni régression des boîtes. */}
      {phase === "mission" && (
        <div style={cardStyle} className="mk-slide">
          {/* Barre de retour */}
          <div style={{ display: "flex", justifyContent: "flex-start", marginBottom: 6 }}>
            <button onClick={() => setPhase("menu")} style={{
              background: "transparent", border: "none", color: "#9B8FAE",
              fontSize: 14, fontWeight: 800, cursor: "pointer", fontFamily: "inherit",
              padding: "4px 8px",
            }}>
              ← Menu
            </button>
          </div>

          <div style={{ fontSize: 44, lineHeight: 1, marginBottom: 4 }}>🐾</div>
          <h1 style={{ fontSize: 28, fontWeight: 800, color: "#4A4063", lineHeight: 1.1, margin: "0 0 4px" }}>
            Mission d'entraînement
          </h1>
          <p style={{ color: "#9B8FAE", fontSize: 13, marginBottom: 18 }}>
            Choisis tes tables et le nombre de calculs, puis lance-toi !
          </p>

          {/* Tables */}
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 8 }}>
            <p style={{ fontSize: 12, color: "#C4B8D4", fontWeight: 800, textTransform: "uppercase", letterSpacing: 2, margin: 0 }}>
              Tables
            </p>
            <button onClick={toggleAll} style={{
              background: "transparent", border: "none", color: "#FF8FAB",
              fontSize: 12, fontWeight: 800, cursor: "pointer", fontFamily: "inherit",
              textTransform: "uppercase", letterSpacing: 1, padding: 0,
            }}>
              {selected.length === ALL_HALVES.length ? "Tout décocher" : "Tout cocher"}
            </button>
          </div>

          <div style={{ display: "grid", gridTemplateColumns: "1fr", gap: 6, marginBottom: 16 }}>
            {Object.entries(TABLES).map(([t, info]) => {
              const tn = +t;
              const lowOn  = selected.includes(halfKey(tn, "low"));
              const highOn = selected.includes(halfKey(tn, "high"));
              const anyOn  = lowOn || highOn;
              return (
                <div key={tn} style={{
                  background: anyOn ? "#FFF0F5" : "#FAFAFC",
                  border: `2px solid ${anyOn ? "#FF8FAB" : "#EFEAF5"}`,
                  borderRadius: 16, padding: "6px 8px 6px 10px",
                  display: "flex", alignItems: "center", gap: 8,
                  transition: "all 0.18s",
                }}>
                  {/* Table name = clickable area to toggle the whole table */}
                  <button
                    onClick={() => toggleTable(tn)}
                    style={{
                      flex: 1, background: "transparent", border: "none",
                      cursor: "pointer", fontFamily: "inherit", padding: "2px 0",
                      textAlign: "left",
                    }}
                  >
                    <div style={{ fontSize: 13, fontWeight: 800, color: anyOn ? "#4A4063" : "#9B8FAE" }}>
                      {tn}× <span style={{ fontWeight: 700 }}>· Table de {tn}</span>
                    </div>
                  </button>

                  {/* Half pills */}
                  <button
                    onClick={() => toggleHalf(tn, "low")}
                    style={{
                      background: lowOn ? "#FF8FAB" : "white",
                      color: lowOn ? "white" : "#9B8FAE",
                      border: `2px solid ${lowOn ? "#FF8FAB" : "#EFEAF5"}`,
                      borderRadius: 18, padding: "5px 11px",
                      fontSize: 11, fontWeight: 800,
                      cursor: "pointer", fontFamily: "inherit",
                      transition: "all 0.18s",
                      whiteSpace: "nowrap",
                    }}
                  >
                    ½ bas
                  </button>
                  <button
                    onClick={() => toggleHalf(tn, "high")}
                    style={{
                      background: highOn ? "#9C6BD8" : "white",
                      color: highOn ? "white" : "#9B8FAE",
                      border: `2px solid ${highOn ? "#9C6BD8" : "#EFEAF5"}`,
                      borderRadius: 18, padding: "5px 11px",
                      fontSize: 11, fontWeight: 800,
                      cursor: "pointer", fontFamily: "inherit",
                      transition: "all 0.18s",
                      whiteSpace: "nowrap",
                    }}
                  >
                    ½ haut
                  </button>
                </div>
              );
            })}
          </div>

          {selected.length === 0 && (
            <p style={{ fontSize: 12, color: "#9B8FAE", marginBottom: 14, fontStyle: "italic" }}>
              Aucune table sélectionnée → toutes seront utilisées
            </p>
          )}

          {/* Turns */}
          <p style={{ fontSize: 12, color: "#C4B8D4", fontWeight: 800, textTransform: "uppercase", letterSpacing: 2, marginBottom: 8 }}>
            Nombre de calculs
          </p>
          <div style={{ display: "flex", gap: 6, justifyContent: "center", marginBottom: 8, flexWrap: "wrap" }}>
            {[5, 10, 20, 50].map(n => (
              <button key={n} onClick={() => setQuickTurns(n)} style={{
                background: nbTurns === n && !customTurns ? "#FF8FAB" : "#FFF0F5",
                color: nbTurns === n && !customTurns ? "white" : "#9B8FAE",
                border: "none", borderRadius: 14,
                padding: "7px 14px", fontSize: 14, fontWeight: 800,
                cursor: "pointer", fontFamily: "inherit",
              }}>{n}</button>
            ))}
            <input
              type="number"
              min="3"
              max="99"
              value={customTurns}
              onChange={e => onCustomTurns(e.target.value)}
              placeholder="…"
              style={{
                width: 56, fontSize: 14, fontWeight: 800,
                textAlign: "center", padding: "7px 6px",
                border: `2px solid ${customTurns ? "#FF8FAB" : "#EFEAF5"}`,
                borderRadius: 14, color: "#4A4063",
                background: customTurns ? "#FFF0F5" : "white",
                fontFamily: "inherit", outline: "none",
              }}
            />
          </div>
          <p style={{ fontSize: 11, color: "#C4B8D4", marginBottom: 20 }}>
            Min 3 · Max 99 · Tu joueras <b style={{ color: "#4A4063" }}>{nbTurns}</b> calcul{nbTurns > 1 ? "s" : ""}
          </p>

          <button
            onClick={() => startGame("play")}
            style={{ ...btnStyle(), fontSize: 16, padding: "12px 26px", marginTop: 4 }}
          >
            Lancer la mission 🐾
          </button>
        </div>
      )}

      {/* ═══ WELCOME PICK — choix de la famille pour « Accueillir un animal » ═══ */}
      {/* Liste les familles dont les 4 calculs sont en boîte ≥ 4 et qui ont
          encore de la place (count < 4). Familles déjà réussies aujourd'hui :
          affichées désactivées avec « Reviens demain ». Si aucune famille
          n'est éligible, message bienveillant invitant à travailler les
          tables. Le nom LUDIQUE est utilisé (les familles éligibles sont
          forcément découvertes — leurs calculs ont été vus assez de fois pour
          atteindre la boîte 4). */}
      {phase === "welcomePick" && currentProfile && (() => {
        const today = todayStr();
        const leitner = currentProfile.leitner || {};
        const refuge = currentProfile.refuge || makeRefuge();
        // Construit la liste des familles à afficher : éligibles (count<4 et
        // 4 calculs en boîte ≥ 4), enrichies du statut « déjà fait aujourd'hui ».
        const items = [];
        for (let t = 2; t <= 9; t++) {
          for (const half of ["low", "high"]) {
            if (!welcomeEligible(t, half, leitner, refuge)) continue;
            const famKey = `${t}-${half}`;
            const famState = refuge.families[famKey] || { count: 0, lastWelcomeDate: null };
            const doneToday = famState.lastWelcomeDate === today;
            const nextAnimal = TABLES[t][half].animals[3 - famState.count]; // prochain à accueillir
            items.push({
              t, half, famKey,
              name: TABLES[t][half].name,
              tech: `×${t} ${half === "low" ? "bas" : "haut"}`,
              count: famState.count,
              doneToday,
              nextAnimal,
            });
          }
        }
        return (
          <div style={{ ...cardStyle, maxWidth: 480 }} className="mk-slide">
            {/* Barre de retour */}
            <div style={{ display: "flex", justifyContent: "flex-start", marginBottom: 6 }}>
              <button onClick={() => setPhase("zoomap")} style={{
                background: "transparent", border: "none", color: "#9B8FAE",
                fontSize: 14, fontWeight: 800, cursor: "pointer", fontFamily: "inherit",
                padding: "4px 8px",
              }}>
                ← Refuge
              </button>
            </div>
            <div style={{ fontSize: 44, lineHeight: 1, marginBottom: 4 }}>🏡</div>
            <h1 style={{ fontSize: 26, fontWeight: 800, color: "#4A4063", lineHeight: 1.1, margin: "0 0 4px" }}>
              Accueillir un animal
            </h1>
            <p style={{ color: "#9B8FAE", fontSize: 13, marginBottom: 14 }}>
              Choisis une famille prête. 10 calculs sans aucune erreur pour
              gagner ton animal !
            </p>

            {items.length === 0 ? (
              <div style={{
                background: "#FFF5F8", borderRadius: 18,
                padding: "16px 18px", border: "2px solid #FFCEDB",
              }}>
                <div style={{ fontSize: 36, marginBottom: 6 }}>🌱</div>
                <p style={{ fontSize: 14, color: "#4A4063", margin: 0, lineHeight: 1.4 }}>
                  Aucune famille n'est encore prête. Continue de travailler
                  tes tables : pour accueillir un animal, il faut que les 4
                  calculs d'une famille soient en boîte 4 ou 5.
                </p>
              </div>
            ) : (
              <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                {items.map(it => (
                  <div key={it.famKey} style={{
                    background: it.doneToday ? "#F4F0FA" : "#FAFFF7",
                    border: `2px solid ${it.doneToday ? "#E1DAEC" : "#A8E0A8"}`,
                    borderRadius: 14, padding: "10px 12px",
                    display: "flex", alignItems: "center", gap: 10,
                    opacity: it.doneToday ? 0.7 : 1,
                  }}>
                    <span style={{ fontSize: 32, lineHeight: 1 }}>{it.nextAnimal}</span>
                    <div style={{ flex: 1, textAlign: "left" }}>
                      <div style={{ fontSize: 14, fontWeight: 800, color: "#4A4063" }}>
                        {it.name}
                      </div>
                      <div style={{ fontSize: 11, color: "#9B8FAE", fontWeight: 700 }}>
                        {it.tech} · {it.count}/4 dans ton refuge
                      </div>
                    </div>
                    {it.doneToday ? (
                      <span style={{
                        background: "#E1DAEC", color: "#7B6E94",
                        borderRadius: 14, padding: "7px 12px",
                        fontSize: 12, fontWeight: 800,
                      }}>
                        Reviens demain
                      </span>
                    ) : (
                      <button
                        onClick={() => startWelcome(it.t, it.half)}
                        style={{
                          ...btnStyle("#5FB371", "rgba(95,179,113,0.4)"),
                          fontSize: 13, padding: "8px 16px",
                        }}
                      >
                        Lancer
                      </button>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        );
      })()}

      {/* ═══ WELCOME FAIL — message bienveillant après erreur ═══ */}
      {/* Affiché quand l'enfant fait une erreur (ou timeout) en mode welcome.
          Aucune mise à jour Leitner n'a eu lieu (cf. handleSubmit). Deux
          options : recommencer la même famille tout de suite ou rentrer au
          refuge. Le cap quotidien N'EST PAS consommé (lastWelcomeDate ne
          change pas tant qu'il n'y a pas eu de succès). */}
      {phase === "welcomeFail" && (
        <div className="mk-fade" style={{
          ...cardStyle, padding: "24px 22px",
          background: "linear-gradient(135deg, #FFE1E8, #FFD0DD)",
          display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 10,
        }}>
          <div className="mk-wiggle" style={{ fontSize: 80, lineHeight: 1 }}>🐱</div>
          <div style={{ fontSize: 22, fontWeight: 800, color: "#A05060", textAlign: "center", lineHeight: 1.2 }}>
            Oh, nooon… Faute de frappe ?
          </div>
          <div style={{ fontSize: 16, fontWeight: 700, color: "#8C4858", textAlign: "center" }}>
            Reviens vite !
          </div>
          <div style={{ fontSize: 12, color: "#8C4858", opacity: 0.85, marginTop: 4, textAlign: "center" }}>
            Pas de pénalité — tes boîtes n'ont pas bougé.
          </div>
          <div style={{ display: "flex", gap: 10, marginTop: 12, flexWrap: "wrap", justifyContent: "center" }}>
            <button
              onClick={() => welcomeFamily && startWelcome(welcomeFamily.t, welcomeFamily.half)}
              style={{
                background: "white", color: "#A05060",
                border: "none", borderRadius: 50,
                padding: "10px 22px", fontSize: 15, fontWeight: 800,
                cursor: "pointer", fontFamily: "inherit",
                boxShadow: "0 4px 14px rgba(0,0,0,0.15)",
              }}
            >
              🔄 Recommencer
            </button>
            <button
              onClick={() => setPhase("zoomap")}
              style={{
                background: "transparent", color: "#8C4858",
                border: "2px solid rgba(140,72,88,0.4)", borderRadius: 50,
                padding: "10px 22px", fontSize: 14, fontWeight: 800,
                cursor: "pointer", fontFamily: "inherit",
              }}
            >
              Retour au refuge
            </button>
          </div>
        </div>
      )}

      {/* ═══ ZOO MAP (player's persistent zoo) ═══ */}
      {/* « Le refuge » : la grille 8×8 où chaque case est un calcul. La couleur
          et le décor d'une case viennent de sa boîte Leitner via tileForEntry()
          — c'est la traduction visuelle de la métaphore (voir guide §2).
          Toucher une case ouvre la modale de détail (selectedCell).
          C'est aussi d'ici qu'on lance les modes Défricher / Aménager / Cultiver
          et le Sauvetage du jour. */}
      {phase === "zoomap" && currentProfile && (() => {
        const leitner = currentProfile.leitner || {};
        const today = todayStr();
        // ── Pools de décor filtrés par le Zoodex ─────────────────────────
        // Seuls les emojis DÉJÀ DÉCOUVERTS (présents dans zoodex.plants /
        // zoodex.keepers du profil) peuvent apparaître sur la grille. Un
        // nouveau profil sans collecte verra ses cases prêtes sans plante ni
        // soigneur — le décor s'enrichit à mesure que l'enfant accumule des
        // récompenses combo. C'est ce qui rend les premières découvertes
        // visibles dans le refuge.
        const zPlants  = (currentProfile.zoodex && currentProfile.zoodex.plants)  || {};
        const zKeepers = (currentProfile.zoodex && currentProfile.zoodex.keepers) || {};
        const smallPlantsDisc = SMALL_PLANTS_POOL.filter(p => zPlants[p]);
        const bigPlantsDisc   = BIG_PLANTS_POOL.filter(p => zPlants[p]);
        const keepersDisc     = KEEPERS.filter(k => zKeepers[k]);

        // Cells that improved in the last finished session (for one-shot animation).
        // We only animate "improvements" (new box > old box) so it's celebratory.
        // Order them by table then column so the animation cascades nicely.
        const improvedKeys = Object.entries(lastSessionChanges)
          .filter(([_, v]) => v.toBox > v.fromBox)
          .map(([k]) => k);
        const improvedOrder = {};
        improvedKeys
          .sort((a, b) => {
            const [a1, a2] = a.split("-").map(Number);
            const [b1, b2] = b.split("-").map(Number);
            return a1 !== b1 ? a1 - b1 : a2 - b2;
          })
          .forEach((k, i) => { improvedOrder[k] = i; });

        // Cell visuals: bg color + decoration pool by box
        const TILE_FRICHE_NEW = ["🪨", "🪾", "🕸️"];
        const TILE_FRICHE_TRIED = [""];
        const TILE_PREP_1 = ["", "🚧", "🛠️", "🚜", "🦺"];
        const TILE_PREP_2 = ["", "🪏", "⛏️", "🫘"];
        const TILE_PREP_3 = ["", "🌱", "🚿", "🪧"];
        const TILE_GRASS_LIGHT = ["", "🌿"];
        const TILE_GRASS_DARK  = ["", "🌳", "🌻", "🌷"];

        function tileForEntry(a, b, e) {
          const k = calcKey(a, b);
          // Deterministic decoration pick per cell so it doesn't reshuffle on rerender,
          // but pseudo-random enough to avoid visible patterns across the grid.
          // Uses a Murmur3-style integer finalizer.
          let seed = (a * 2654435761) ^ (b * 40503);
          seed = Math.imul(seed ^ (seed >>> 16), 0x85ebca6b);
          seed = Math.imul(seed ^ (seed >>> 13), 0xc2b2ae35);
          seed = (seed ^ (seed >>> 16)) >>> 0;
          const pickFrom = arr => arr[seed % arr.length];
          if (!e || (e.box === 0 && !e.lastSeen)) {
            return { bg: "#E5E2EC", deco: pickFrom(TILE_FRICHE_NEW), name: "À préparer", border: "#D6D2DE" };
          }
          if (e.box === 0) {
            return { bg: "#D8D5DF", deco: pickFrom(TILE_FRICHE_TRIED), name: "À préparer", border: "#C4C0CC" };
          }
          if (e.box === 1) return { bg: "#D3C7BF", deco: pickFrom(TILE_PREP_1), name: "En préparation", border: "#B5A89B" };
          if (e.box === 2) return { bg: "#C99565", deco: pickFrom(TILE_PREP_2), name: "En préparation", border: "#A5764B" };
          if (e.box === 3) return { bg: "#7E5A3F", deco: pickFrom(TILE_PREP_3), name: "En préparation", border: "#5E4530" };

          // Box 4-5 : décor uniquement (herbes, grandes plantes, soigneurs).
          // Le décor est filtré par les découvertes du Zoodex (pools calculés
          // une fois dans le scope du bloc zoomap, ci-dessus). Si rien n'est
          // encore découvert dans une catégorie, la case reste sans décor de
          // ce type.
          // ⚠️  L'apparition AUTOMATIQUE d'animaux sur ces cases a été retirée
          // (v10) au profit de la mécanique « Accueillir un animal » : seuls
          // les succès du nouveau mini-jeu peuvent placer un animal sur une
          // case, via la couche de surimpression dans le rendu de la grille
          // (voir getCellAnimal + bloc « overlay welcome » dans la zoomap).
          if (e.box === 4) {
            // 50 % vide, 50 % petite plante (si au moins une découverte).
            const r = seed % 100;
            let deco = "";
            if (r >= 50 && smallPlantsDisc.length > 0) {
              deco = smallPlantsDisc[seed % smallPlantsDisc.length];
            }
            return { bg: "#A8E0A8", deco, name: "Enclos prêt !", border: "#7BC9A0" };
          }
          /* box 5 */
          // 35 % vide, 50 % grande plante, 15 % soigneur (chacun filtré).
          const r = seed % 100;
          let deco = "";
          if (r >= 35 && r < 85 && bigPlantsDisc.length > 0) {
            deco = bigPlantsDisc[seed % bigPlantsDisc.length];
          } else if (r >= 85 && keepersDisc.length > 0) {
            deco = keepersDisc[seed % keepersDisc.length];
          }
          return { bg: "#5FB371", deco, name: "Enclos prêt !", border: "#3F8F50" };
        }

        // Stats summary
        let totalSeen = 0, totalMastered = 0, dueToday = 0;
        for (const k of ALL_CALC_KEYS) {
          const e = leitner[k];
          if (!e) continue;
          if (e.lastSeen) totalSeen++;
          if (e.box >= 4) totalMastered++;
          if (e.lastSeen && e.box < 5 && e.nextDue && e.nextDue <= today) dueToday++;
        }

        return (
          <div style={{ ...cardStyle, maxWidth: 480 }} className="mk-slide">
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 10 }}>
              <button onClick={() => setPhase("menu")} style={{
                background: "transparent", border: "none", color: "#9B8FAE",
                fontSize: 14, fontWeight: 800, cursor: "pointer", fontFamily: "inherit",
                padding: "4px 8px",
              }}>
                ← Menu
              </button>
              <div style={{ display: "flex", gap: 6 }}>
                {/* Raccourci Zoodex : pulse une halo violet quand une partie
                    récente a ajouté de nouveaux items au Zoodex (lastZoodexAdditions
                    non vide). Le pulse s'arrête dès que l'utilisateur a ouvert le
                    Zoodex (l'effet de timeout vide les Sets — voir useEffect). */}
                {(() => {
                  const hasNew =
                    lastZoodexAdditions.animals.size > 0 ||
                    lastZoodexAdditions.plants.size  > 0 ||
                    lastZoodexAdditions.foods.size   > 0 ||
                    lastZoodexAdditions.keepers.size > 0;
                  return (
                    <button
                      onClick={() => setPhase("zoodex")}
                      className={hasNew ? "mk-pulse-attn" : ""}
                      title={hasNew ? "Nouvelles découvertes dans le Zoodex !" : "Ouvrir le Zoodex"}
                      style={{
                        background: "linear-gradient(135deg, #C8B8E0, #A594C9)",
                        color: "white", border: "2px solid #A594C9",
                        borderRadius: 50, padding: "5px 14px",
                        fontSize: 12, fontWeight: 800, cursor: "pointer", fontFamily: "inherit",
                        boxShadow: "0 3px 10px rgba(165,148,201,0.4)",
                      }}
                    >
                      📔 Zoodex
                    </button>
                  );
                })()}
                <button onClick={() => setPhase("records")} style={{
                  background: "linear-gradient(135deg, #FFD166, #FFB347)",
                  color: "#7A4A1A", border: "2px solid #FFB347",
                  borderRadius: 50, padding: "5px 14px",
                  fontSize: 12, fontWeight: 800, cursor: "pointer", fontFamily: "inherit",
                  boxShadow: "0 3px 10px rgba(255,179,71,0.4)",
                }}>
                  🏆 Records
                </button>
              </div>
            </div>

            <h2 style={{ fontSize: 24, fontWeight: 800, color: "#4A4063", margin: "0 0 4px" }}>
              🗺️ Le refuge de {currentProfile.name} {currentProfile.avatar}
            </h2>
            <p style={{ fontSize: 12, color: "#9B8FAE", marginBottom: 14 }}>
              {totalMastered} enclos prêts · {totalSeen} défrichés sur 64
              {dueToday > 0 && <> · 🔁 {dueToday} à revoir</>}
            </p>

            {improvedKeys.length > 0 && (
              <div style={{
                background: "linear-gradient(135deg, #FFF4D6, #FFE9A8)",
                border: "2px solid #FFD166",
                borderRadius: 14,
                padding: "8px 12px",
                marginBottom: 12,
                fontSize: 13, fontWeight: 800, color: "#9C7A2C",
              }}>
                ✨ {improvedKeys.length} case{improvedKeys.length > 1 ? "s" : ""} {improvedKeys.length > 1 ? "ont" : "a"} progressé !
              </div>
            )}

            {/* The zoo grid: outer wall + 8x8 interior */}
            <div style={{
              background: "#F5F1E8",
              border: "5px solid #B89876",
              borderRadius: 14,
              padding: 8,
              boxShadow: "inset 0 2px 6px rgba(0,0,0,0.08)",
              position: "relative",
            }}>
              {/* Top "entrance" decoration */}
              <div style={{
                position: "absolute", top: -14, left: "50%", transform: "translateX(-50%)",
                background: "#B89876", color: "white",
                fontSize: 10, fontWeight: 800, letterSpacing: 2,
                padding: "3px 14px", borderRadius: 8,
                textTransform: "uppercase",
              }}>
                🚪 Entrée
              </div>

              <div style={{ display: "grid", gridTemplateColumns: "16px repeat(8, 1fr)", gap: 2 }}>
                {/* Header row: column labels (b values) */}
                <div></div>
                {[2,3,4,5,6,7,8,9].map(b => (
                  <div key={`h-${b}`} style={{
                    fontSize: 10, fontWeight: 800, color: "#9B8FAE",
                    textAlign: "center", lineHeight: "16px",
                  }}>×{b}</div>
                ))}

                {/* 8 rows: a values */}
                {[2,3,4,5,6,7,8,9].map(a => (
                  <React.Fragment key={`row-${a}`}>
                    <div style={{
                      fontSize: 10, fontWeight: 800, color: "#9B8FAE",
                      textAlign: "right", paddingRight: 2, lineHeight: "100%",
                      display: "flex", alignItems: "center", justifyContent: "flex-end",
                    }}>{a}×</div>
                    {[2,3,4,5,6,7,8,9].map(b => {
                      const e = leitner[calcKey(a, b)];
                      let t = tileForEntry(a, b, e);
                      // ── Surimpression « Accueillir » ────────────────────────
                      // Si la case héberge un animal aujourd'hui (issu d'un succès
                      // du mini-jeu Accueillir), on remplace son apparence par
                      // un enclos peuplé. L'animal PERSISTE même si le calcul
                      // est redescendu sous boîte 4 — l'affichage dépend du
                      // compteur de refuge de la famille, pas de la boîte.
                      const cellAnimal = currentProfile
                        ? getCellAnimal(a, b, currentProfile.refuge, today)
                        : null;
                      if (cellAnimal) {
                        t = {
                          bg: "#5FB371",
                          border: "#3F8F50",
                          deco: cellAnimal,
                          name: `${a} × ${b} · enclos peuplé`,
                        };
                      }
                      const improveIdx = improvedOrder[calcKey(a, b)];
                      const isImproved = improveIdx !== undefined;
                      return (
                        <button
                          key={`c-${a}-${b}`}
                          onClick={() => setSelectedCell({ a, b })}
                          className={isImproved ? "mk-cell-improve" : ""}
                          style={{
                            aspectRatio: "1 / 1",
                            background: t.bg,
                            border: `1.5px solid ${t.border}`,
                            borderRadius: 6,
                            cursor: "pointer",
                            fontSize: cellAnimal ? 17 : 14, lineHeight: 1,
                            display: "flex", alignItems: "center", justifyContent: "center",
                            padding: 0,
                            transition: "transform 0.12s",
                            fontFamily: "inherit",
                            ...(isImproved ? { animationDelay: `${0.2 + improveIdx * 0.18}s` } : {}),
                          }}
                          onMouseDown={ev => ev.currentTarget.style.transform = "scale(0.92)"}
                          onMouseUp={ev => ev.currentTarget.style.transform = "scale(1)"}
                          onMouseLeave={ev => ev.currentTarget.style.transform = "scale(1)"}
                          title={`${a} × ${b} · ${t.name}`}
                        >
                          {t.deco}
                        </button>
                      );
                    })}
                  </React.Fragment>
                ))}
              </div>
            </div>

            {/* Action buttons: Daily challenge + Clearing + Build + Cultivate */}
            <div style={{ marginTop: 14 }}>
              {/* Daily challenge — gold styling */}
              {(() => {
                const todayK = todayStr();
                const done = currentProfile.dailyChallenge?.lastCompletedDate === todayK;
                return (
                  <div style={{ display: "flex", justifyContent: "center", marginBottom: 8 }}>
                    <button
                      onClick={done ? undefined : startDailyChallenge}
                      disabled={done}
                      style={{
                        background: done
                          ? "linear-gradient(135deg, #E5E2EC, #D6D2DE)"
                          : "linear-gradient(135deg, #FFD166, #FFB347)",
                        color: done ? "#9B8FAE" : "#7A4A1A",
                        border: done ? "2px solid #D6D2DE" : "2px solid #FFB347",
                        borderRadius: 50,
                        padding: "10px 22px",
                        fontSize: 14, fontWeight: 800,
                        cursor: done ? "default" : "pointer",
                        fontFamily: "inherit",
                        boxShadow: done ? "none" : "0 4px 18px rgba(255,179,71,0.45)",
                        transition: "transform 0.12s",
                        opacity: done ? 0.8 : 1,
                        lineHeight: 1.25,
                      }}
                    >
                      {done ? (
                        <>
                          ✓ Sauvetage du jour fait
                          <br/>
                          <span style={{ fontWeight: 500 }}>À demain !</span>
                        </>
                      ) : (
                        <>
                          ⭐ Sauvetage du jour 🛟
                          <br/>
                          <span style={{ fontWeight: 500 }}>(10 calculs)</span>
                        </>
                      )}
                    </button>
                  </div>
                );
              })()}

              {/* Clearing / build / cultivate availability. Chaque mode compte
                  les cases candidates via calcsForMode() (filtres identiques à
                  ceux du moteur de jeu, voir genQsLeitner). Un bouton est
                  désactivé si sa catégorie n'a aucune case éligible — par ex.
                  Aménager (boîtes 1-2) avant la première partie, Cultiver
                  (boîtes 3-4) tant que rien n'a été assez répété, etc. */}
              {(() => {
                const clearingCount  = calcsForMode(leitner, "clearing").length;
                const buildCount     = calcsForMode(leitner, "build").length;
                const cultivateCount = calcsForMode(leitner, "cultivate").length;
                const clearingOk  = clearingCount  > 0;
                const buildOk     = buildCount     > 0;
                const cultivateOk = cultivateCount > 0;
                return (
                  <div style={{ display: "flex", gap: 8, justifyContent: "center", flexWrap: "wrap" }}>
                    <button
                      onClick={clearingOk ? startClearing : undefined}
                      disabled={!clearingOk}
                      title={clearingOk
                        ? `${clearingCount} case${clearingCount > 1 ? "s" : ""} à défricher (déjà vues ou en bordure)`
                        : "Aucune zone à défricher — fais d'abord une partie"}
                      style={{
                        ...btnStyle("#8E89A0", "rgba(142,137,160,0.4)"),
                        fontSize: 13, padding: "9px 18px",
                        opacity: clearingOk ? 1 : 0.4,
                        cursor: clearingOk ? "pointer" : "not-allowed",
                        boxShadow: clearingOk ? "0 4px 14px rgba(142,137,160,0.4)" : "none",
                      }}
                    >
                      🪨 Défricher
                    </button>
                    <button
                      onClick={buildOk ? () => startGame("build") : undefined}
                      disabled={!buildOk}
                      title={buildOk
                        ? `${buildCount} case${buildCount > 1 ? "s" : ""} à aménager (boîtes 1 et 2)`
                        : "Aucune case à aménager — défriche d'abord des zones"}
                      style={{
                        ...btnStyle("#A5764B", "rgba(165,118,75,0.4)"),
                        fontSize: 13, padding: "9px 18px",
                        opacity: buildOk ? 1 : 0.4,
                        cursor: buildOk ? "pointer" : "not-allowed",
                        boxShadow: buildOk ? "0 4px 14px rgba(165,118,75,0.4)" : "none",
                      }}
                    >
                      🚜 Aménager
                    </button>
                    <button
                      onClick={cultivateOk ? () => startGame("cultivate") : undefined}
                      disabled={!cultivateOk}
                      title={cultivateOk
                        ? `${cultivateCount} case${cultivateCount > 1 ? "s" : ""} à cultiver (boîtes 3 et 4)`
                        : "Aucune case à cultiver — aménage d'abord des chantiers"}
                      style={{
                        ...btnStyle("#A8E0A8", "rgba(123,201,160,0.45)"),
                        color: "#2C6E3C", // texte foncé pour contraster avec le fond vert clair
                        fontSize: 13, padding: "9px 18px",
                        opacity: cultivateOk ? 1 : 0.4,
                        cursor: cultivateOk ? "pointer" : "not-allowed",
                        boxShadow: cultivateOk ? "0 4px 14px rgba(123,201,160,0.45)" : "none",
                      }}
                    >
                      🌱 Cultiver
                    </button>
                  </div>
                );
              })()}

              {/* Accueillir un animal : disponible quand au moins une famille
                  est éligible (4 calculs ≥ boîte 4 ET count < 4). */}
              {(() => {
                const refuge = currentProfile.refuge || makeRefuge();
                const eligibleHalves = ALL_HALVES.filter(hk => {
                  const [tt, hh] = hk.split("-");
                  return welcomeEligible(+tt, hh, leitner, refuge);
                });
                const nbElig = eligibleHalves.length;
                const hasElig = nbElig > 0;
                return (
                  <div style={{ display: "flex", justifyContent: "center", marginTop: 8 }}>
                    <button
                      onClick={hasElig ? () => setPhase("welcomePick") : undefined}
                      disabled={!hasElig}
                      title={hasElig
                        ? `${nbElig} famille${nbElig > 1 ? "s" : ""} prête${nbElig > 1 ? "s" : ""} à accueillir un animal`
                        : "Amène d'abord les 4 calculs d'une famille en boîte 4 ou 5 pour pouvoir accueillir un animal."}
                      style={{
                        ...btnStyle("#5FB371", "rgba(95,179,113,0.4)"),
                        fontSize: 13, padding: "9px 18px",
                        opacity: hasElig ? 1 : 0.4,
                        cursor: hasElig ? "pointer" : "not-allowed",
                        boxShadow: hasElig ? "0 4px 14px rgba(95,179,113,0.4)" : "none",
                      }}
                    >
                      🏡 Accueillir
                    </button>
                  </div>
                );
              })()}
            </div>

            {/* Legend */}
            {/* Légende des couleurs du refuge (titres ludiques). Toujours
                visible sous la grille — les chips s'enroulent sur mobile. La
                case « habitée par un animal » n'est volontairement pas dans
                la légende (la surprise se découvre sur la grille). */}
            <div style={{
              display: "flex", flexWrap: "wrap", gap: 6, justifyContent: "center",
              marginTop: 14, fontSize: 10, fontWeight: 700, color: "#7B6E94",
            }}>
              <span style={{ display: "inline-flex", alignItems: "center", gap: 4 }}>
                <span style={{ width: 10, height: 10, background: "#E5E2EC", border: "1px solid #D6D2DE", borderRadius: 3 }}/> 🪨 Friche
              </span>
              <span style={{ display: "inline-flex", alignItems: "center", gap: 4 }}>
                <span style={{ width: 10, height: 10, background: "#D3C7BF", border: "1px solid #B5A89B", borderRadius: 3 }}/> 🚧 Chantier qui démarre
              </span>
              <span style={{ display: "inline-flex", alignItems: "center", gap: 4 }}>
                <span style={{ width: 10, height: 10, background: "#C99565", border: "1px solid #A5764B", borderRadius: 3 }}/> ⛏️ Préparation
              </span>
              <span style={{ display: "inline-flex", alignItems: "center", gap: 4 }}>
                <span style={{ width: 10, height: 10, background: "#7E5A3F", border: "1px solid #5E4530", borderRadius: 3 }}/> 🌱 Plantations
              </span>
              <span style={{ display: "inline-flex", alignItems: "center", gap: 4 }}>
                <span style={{ width: 10, height: 10, background: "#A8E0A8", border: "1px solid #7BC9A0", borderRadius: 3 }}/> 🌿 Tout juste prêt
              </span>
              <span style={{ display: "inline-flex", alignItems: "center", gap: 4 }}>
                <span style={{ width: 10, height: 10, background: "#5FB371", border: "1px solid #3F8F50", borderRadius: 3 }}/> 🌳 Enclos prêt
              </span>
            </div>

            <p style={{ fontSize: 11, color: "#C4B8D4", marginTop: 12, fontStyle: "italic" }}>
              Touche une case pour la voir de plus près !
            </p>
          </div>
        );
      })()}

      {/* ═══ ZOODEX (collection of saved animals) ═══ */}
      {/* Le « Zoodex » : l'album des 16 familles d'animaux. Une famille non
          encore rencontrée reste masquée (« Famille inconnue »). Les compteurs
          viennent de profile.zoodex.animals, alimenté en fin de partie. */}
      {phase === "zoodex" && currentProfile && (() => {
        const zAnimals = (currentProfile.zoodex && currentProfile.zoodex.animals) || {};
        // Trois nouvelles sections (Zoodex v17) : plantes, nourritures, soigneurs.
        // Chaque map emoji → compteur de découvertes. On les affiche sous la
        // grille familles, dans l'ordre de la liste master pour rester stable.
        const zPlants  = (currentProfile.zoodex && currentProfile.zoodex.plants)  || {};
        const zFoods   = (currentProfile.zoodex && currentProfile.zoodex.foods)   || {};
        const zKeepers = (currentProfile.zoodex && currentProfile.zoodex.keepers) || {};

        // Build the 16 families in canonical order (table 2→9, low before high)
        const families = [];
        for (let t = 2; t <= 9; t++) {
          for (const h of ["low", "high"]) {
            families.push({ table: t, half: h, def: TABLES[t][h] });
          }
        }

        // Global stats
        let totalSaved = 0;
        let familiesStarted = 0;
        for (const fam of families) {
          let famHas = false;
          for (let tier = 0; tier < 4; tier++) {
            if ((zAnimals[`${fam.table}-${fam.half}-${tier}`] || 0) > 0) {
              totalSaved++; famHas = true;
            }
          }
          if (famHas) familiesStarted++;
        }

        return (
          <div style={{ ...cardStyle, maxWidth: 480 }} className="mk-slide">
            {/* Header */}
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 10 }}>
              <button onClick={() => setPhase("menu")} style={{
                background: "transparent", border: "none", color: "#9B8FAE",
                fontSize: 14, fontWeight: 800, cursor: "pointer", fontFamily: "inherit",
                padding: "4px 8px",
              }}>
                ← Menu
              </button>
              <span style={{ fontSize: 11, color: "#C4B8D4", fontWeight: 800, letterSpacing: 2, textTransform: "uppercase" }}>
                {currentProfile.avatar} {currentProfile.name}
              </span>
            </div>

            <h2 style={{ fontSize: 24, fontWeight: 800, color: "#4A4063", margin: "0 0 4px" }}>
              📔 Zoodex
            </h2>
            <p style={{ fontSize: 12, color: "#9B8FAE", marginBottom: 16 }}>
              {totalSaved} / 64 animaux secourus · {familiesStarted} / 16 familles
            </p>

            {/* Family cards */}
            <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
              {families.map(fam => {
                // How many animals of this family are known
                const known = [0, 1, 2, 3].map(tier =>
                  zAnimals[`${fam.table}-${fam.half}-${tier}`] || 0);
                const knownCount = known.filter(c => c > 0).length;
                const familyDiscovered = knownCount > 0;
                const tableLabel = `×${fam.table} ½ ${fam.half === "high" ? "haut" : "bas"}`;

                return (
                  <div key={`${fam.table}-${fam.half}`} style={{
                    background: familyDiscovered ? "#F4F1F8" : "#EEEAF2",
                    border: "1.5px solid #EAE3F2",
                    borderRadius: 14,
                    padding: "10px 12px",
                  }}>
                    {/* Family header */}
                    <div style={{
                      display: "flex", justifyContent: "space-between", alignItems: "baseline",
                      marginBottom: 8, gap: 8,
                    }}>
                      <span style={{ display: "flex", alignItems: "baseline", gap: 6, flexWrap: "wrap" }}>
                        <span style={{
                          fontSize: 14, fontWeight: 800,
                          color: familyDiscovered ? "#4A4063" : "#A99FBC",
                        }}>
                          {familyDiscovered ? fam.def.name : "Famille inconnue"}
                        </span>
                        <span style={{ fontSize: 10, fontWeight: 700, color: "#9B8FAE" }}>
                          {tableLabel}
                        </span>
                      </span>
                      <span style={{
                        fontSize: 11, fontWeight: 800,
                        color: knownCount === 4 ? "#3F8F50" : "#9B8FAE",
                      }}>
                        {knownCount}/4 {knownCount === 4 && "✓"}
                      </span>
                    </div>

                    {/* 4 animal slots */}
                    <div style={{ display: "flex", gap: 6 }}>
                      {[0, 1, 2, 3].map(tier => {
                        const count = known[tier];
                        const seen = count > 0;
                        const animKey = `${fam.table}-${fam.half}-${tier}`;
                        const isNew = seen && lastZoodexAdditions.animals.has(animKey);
                        return (
                          <div key={tier}
                            className={isNew ? "mk-zoodex-new" : ""}
                            style={{
                              flex: 1,
                              aspectRatio: "1 / 1",
                              background: seen ? "white" : "#E2DCEC",
                              border: `1.5px solid ${seen ? "#D8E8DC" : "#D6D0E0"}`,
                              borderRadius: 10,
                              display: "flex", flexDirection: "column",
                              alignItems: "center", justifyContent: "center",
                              gap: 1,
                              ...(isNew ? { animationDelay: `${0.05 + tier * 0.08}s` } : {}),
                            }}>
                            {seen ? (
                              <>
                                <span style={{ fontSize: 26, lineHeight: 1 }}>
                                  {fam.def.animals[tier]}
                                </span>
                                <span style={{ fontSize: 9, fontWeight: 700, color: "#B3A9C4" }}>
                                  ×{count}
                                </span>
                              </>
                            ) : (
                              <span style={{ fontSize: 22, fontWeight: 800, color: "#B3A9C4" }}>?</span>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  </div>
                );
              })}
            </div>

            {/* ─── Plantes / Nourritures / Soigneurs découverts ─────────── */}
            {/* Chaque section affiche AUTANT DE CASES que d'items dans la liste
                maître. Les cases découvertes montrent l'emoji + son compteur en
                dessous (comme les animaux) ; les non-découvertes montrent un
                emoji PLACEHOLDER générique grisé propre à la section (🌱 pour
                les plantes, 🍽️ pour les nourritures, 🧑🏻‍🌾 pour les soigneurs).
                Les nouveautés (premières découvertes de la dernière partie)
                jouent l'animation mk-zoodex-new à l'ouverture du Zoodex. */}
            {(() => {
              const renderCollection = (title, icon, masterList, store, placeholder, additions) => {
                const discoveredCount = masterList.filter(e => (store[e] || 0) > 0).length;
                return (
                  <div key={title} style={{ marginTop: 14 }}>
                    <div style={{
                      display: "flex", alignItems: "center", justifyContent: "space-between",
                      marginBottom: 6, fontSize: 13, fontWeight: 800, color: "#4A4063",
                    }}>
                      <span>{icon} {title}</span>
                      <span style={{ fontSize: 11, color: "#9B8FAE", fontWeight: 700 }}>
                        {discoveredCount} / {masterList.length}
                      </span>
                    </div>
                    <div style={{
                      display: "grid",
                      gridTemplateColumns: "repeat(6, 1fr)",
                      gap: 6,
                      background: "#FAF7FF", borderRadius: 12, padding: 8,
                      border: "1.5px solid #EDE5F5",
                    }}>
                      {masterList.map((e, idx) => {
                        const n = store[e] || 0;
                        const found = n > 0;
                        const isNew = found && additions.has(e);
                        return (
                          <div
                            key={e}
                            title={found ? `Découvert ${n} fois` : "À découvrir"}
                            className={isNew ? "mk-zoodex-new" : ""}
                            style={{
                              aspectRatio: "1 / 1",
                              background: found ? "white" : "#F0EAF7",
                              border: found
                                ? "1.5px solid #D8E8DC"
                                : "1.5px dashed #D6CFE2",
                              borderRadius: 10,
                              display: "flex", flexDirection: "column",
                              alignItems: "center", justifyContent: "center",
                              gap: 1,
                              ...(isNew ? { animationDelay: `${0.05 + idx * 0.06}s` } : {}),
                            }}
                          >
                            {found ? (
                              <>
                                <span style={{ fontSize: 22, lineHeight: 1 }}>{e}</span>
                                <span style={{ fontSize: 9, fontWeight: 700, color: "#B3A9C4" }}>
                                  ×{n}
                                </span>
                              </>
                            ) : (
                              <span style={{
                                fontSize: 20, lineHeight: 1,
                                filter: "grayscale(1) opacity(0.4)",
                              }}>
                                {placeholder}
                              </span>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  </div>
                );
              };
              return (
                <>
                  {renderCollection("Plantes",     "🌳", PLANTS,  zPlants,  "🌱",    lastZoodexAdditions.plants)}
                  {renderCollection("Nourritures", "🥕", FOODS,   zFoods,   "🍽️",    lastZoodexAdditions.foods)}
                  {renderCollection("Soigneurs",   "👩‍⚕️", KEEPERS, zKeepers, "🧑🏻‍🌾", lastZoodexAdditions.keepers)}
                </>
              );
            })()}

            <p style={{
              marginTop: 14, marginBottom: 0,
              fontSize: 10, color: "#D4C8E0", fontWeight: 700,
              letterSpacing: 1.5, textTransform: "uppercase",
            }}>
              Mathiko Zoo · v{VERSION}
            </p>
          </div>
        );
      })()}

      {/* Cell detail popover (modal) */}
      {selectedCell && currentProfile && (() => {
        const { a, b } = selectedCell;
        const k = calcKey(a, b);
        const e = currentProfile.leitner?.[k];
        const today = todayStr();
        const isFricheNew = !e || (e.box === 0 && !e.lastSeen);
        const isFricheTried = e && e.box === 0 && e.lastSeen;
        const isPrep = e && e.box >= 1 && e.box <= 3;
        const isReady = e && e.box >= 4;
        const stateName = isFricheNew ? "À préparer (nouveau)"
          : isFricheTried ? "À préparer"
          : isPrep ? `En préparation`
          : "Enclos prêt !";
        const dueLabel = e && e.nextDue
          ? (e.nextDue <= today ? "À revoir aujourd'hui" : `À revoir le ${e.nextDue}`)
          : null;

        // Animal réellement présent sur cette case AUJOURD'HUI (issu d'un
        // succès du mini-jeu « Accueillir un animal »). null sinon — y compris
        // pour les cases « enclos prêt » (boîte 4-5) sans animal encore accueilli.
        // ⚠️  Avant la v10, on devinait un animal de mascotte par mapping
        // boîte→tier ; cette logique a été retirée pour refléter la réalité
        // (l'animal n'est là que s'il a été accueilli pour de vrai).
        const cellAnimalNow = getCellAnimal(a, b, currentProfile.refuge, today);
        const masteredAnimal = cellAnimalNow;

        function trainHere() {
          // Build the proposable pool: clicked cell + 8 closest cells.
          // For interior cells, this gives the 8 chess-king neighbors. For edge/corner
          // cells, we fall back to the 8 geographically closest cells overall.
          const candidates = [];
          for (let xa = 2; xa <= 9; xa++) {
            for (let xb = 2; xb <= 9; xb++) {
              if (xa === a && xb === b) continue;
              const cheb = Math.max(Math.abs(xa - a), Math.abs(xb - b));
              const eucl = Math.sqrt((xa - a) ** 2 + (xb - b) ** 2);
              candidates.push({ a: xa, b: xb, cheb, eucl, jitter: Math.random() });
            }
          }
          candidates.sort((x, y) => {
            if (x.cheb !== y.cheb) return x.cheb - y.cheb;     // closer ring first
            if (x.eucl !== y.eucl) return x.eucl - y.eucl;     // straight before diag
            return x.jitter - y.jitter;                         // tiebreak random
          });
          const neighbors = candidates.slice(0, 8);             // 8 closest cells

          // Pick 4 random ones from the 8 neighbors
          const picked = shuffle(neighbors).slice(0, 4);

          // Build final 5 questions: clicked target + 4 neighbors, all shuffled
          const target = { a, b, ans: a * b, half: b <= 5 ? "low" : "high" };
          const others = picked.map(n => ({
            a: n.a, b: n.b, ans: n.a * n.b,
            half: n.b <= 5 ? "low" : "high",
          }));
          const final = shuffle([target, ...others]);

          setSelectedCell(null);
          beginGame(final, "target");
        }

        return (
          <div
            onClick={() => setSelectedCell(null)}
            style={{
              position: "fixed", inset: 0, zIndex: 100,
              background: "rgba(74,64,99,0.55)",
              display: "flex", alignItems: "center", justifyContent: "center",
              padding: 16,
            }}
          >
            <div
              onClick={ev => ev.stopPropagation()}
              className="mk-pop"
              style={{
                background: "white", borderRadius: 24, padding: "20px 22px",
                maxWidth: 320, width: "100%", textAlign: "center",
                boxShadow: "0 24px 60px rgba(74,64,99,0.3)",
              }}
            >
              <div style={{ fontSize: 36, fontWeight: 800, color: "#4A4063", lineHeight: 1, marginBottom: 6 }}>
                {a} × {b} = ?
              </div>
              <div style={{
                display: "inline-block",
                background: isReady ? "#E8F5E9" : isPrep ? "#F4E5D5" : "#EEEAF2",
                color: isReady ? "#3F8F50" : isPrep ? "#7E5A3F" : "#7B6E94",
                padding: "4px 12px", borderRadius: 14,
                fontSize: 12, fontWeight: 800,
                marginBottom: 10,
              }}>
                {stateName}
              </div>
              {dueLabel && (
                <div style={{ fontSize: 11, color: "#9B8FAE", marginBottom: 8 }}>
                  {dueLabel}
                </div>
              )}
              {masteredAnimal && (
                <div style={{ marginBottom: 10 }}>
                  <div style={{ fontSize: 56, lineHeight: 1 }}>{masteredAnimal}</div>
                  <div style={{ fontSize: 11, color: "#7B6E94", fontWeight: 700, marginTop: 2 }}>
                    Vit dans cet enclos
                  </div>
                </div>
              )}
              {e && e.attempts > 0 && (
                <div style={{ fontSize: 11, color: "#C4B8D4", marginBottom: 12 }}>
                  Tenté {e.attempts} fois
                </div>
              )}

              {/* Decide whether "S'entraîner par ici" is allowed.
                 Blocked when: the clicked cell is box 0 AND every adjacent cell
                 is also box 0. The player has to do a regular game first to
                 "open up" the zone. */}
              {(() => {
                const leitnerMap = currentProfile.leitner || {};
                const clickedBox = (e && e.box) || 0;
                let allowed = clickedBox > 0;
                if (!allowed) {
                  outer: for (let da = -1; da <= 1; da++) {
                    for (let db = -1; db <= 1; db++) {
                      if (da === 0 && db === 0) continue;
                      const na = a + da, nb = b + db;
                      if (na < 2 || na > 9 || nb < 2 || nb > 9) continue;
                      const ne = leitnerMap[calcKey(na, nb)] || {};
                      if ((ne.box || 0) > 0) { allowed = true; break outer; }
                    }
                  }
                }

                return (
                  <>
                    {!allowed && (
                      <div style={{
                        background: "#FFF4E5",
                        border: "1.5px solid #FFD9A8",
                        borderRadius: 12,
                        padding: "8px 12px",
                        marginBottom: 12,
                        fontSize: 12,
                        color: "#8A5A1A",
                        lineHeight: 1.4,
                      }}>
                        🔒 Cette case est trop isolée. Lance d'abord
                        <b> 🚜 Aménager</b>, <b>🌱 Cultiver</b> ou
                        <b> ⭐ Sauvetage du jour</b> pour défricher autour !
                      </div>
                    )}

                    <div style={{ display: "flex", gap: 8, justifyContent: "center", flexWrap: "wrap" }}>
                      <button onClick={() => setSelectedCell(null)} style={btnStyle("#C4B8D4", "rgba(196,184,212,0.4)")}>
                        Fermer
                      </button>
                      <button
                        onClick={allowed ? trainHere : undefined}
                        disabled={!allowed}
                        style={{
                          ...btnStyle(),
                          opacity: allowed ? 1 : 0.35,
                          cursor: allowed ? "pointer" : "not-allowed",
                          boxShadow: allowed ? btnStyle().boxShadow : "none",
                        }}
                      >
                        {allowed ? "S'entraîner par ici 🎯" : "🔒 Pas encore disponible"}
                      </button>
                    </div>
                  </>
                );
              })()}
            </div>
          </div>
        );
      })()}

      {/* ═══ GAME ═══ */}
      {/* L'écran de jeu actif : barre de temps, pastilles de progression, le
          calcul à résoudre et le champ de saisie. La croix en haut à droite
          ouvre la confirmation de sortie (quitConfirm). */}
      {phase === "game" && curQ && (
        <div style={{ ...cardStyle, position: "relative" }} className="mk-slide">
          {/* Quit button — top right */}
          <button
            onClick={() => setQuitConfirm(true)}
            title="Quitter l'expédition"
            style={{
              position: "absolute", top: 10, right: 10,
              background: "transparent", border: "none",
              cursor: "pointer", fontSize: 18,
              padding: 4, lineHeight: 1,
              opacity: 0.5, transition: "opacity 0.2s",
              fontFamily: "inherit",
            }}
            onMouseEnter={ev => ev.currentTarget.style.opacity = 1}
            onMouseLeave={ev => ev.currentTarget.style.opacity = 0.5}
          >
            ❌
          </button>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 8, fontSize: 12, color: "#9B8FAE", fontWeight: 700 }}>
            <span>Calcul <b style={{ color: "#4A4063" }}>{qi + 1}</b> / {qs.length}</span>
            <span style={{ marginRight: 26 }}>{combo >= 2 ? <span style={{ color: "#FFB830" }}>🔥 Combo {combo}</span> : "\u00A0"}</span>
          </div>

          <div style={{ display: "flex", gap: 3, justifyContent: "center", marginBottom: 12, flexWrap: "wrap" }}>
            {qs.map((_, i) => (
              <div key={i} style={{
                width: 7, height: 7, borderRadius: "50%",
                background: i < qi ? "#A8D8B9" : i === qi ? "#FF8FAB" : "#F0E8FF",
                transition: "background 0.3s",
              }}/>
            ))}
          </div>

          <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 18 }}>
            <div style={{ flex: 1, height: 10, background: "#F5EEFF", borderRadius: 8, overflow: "hidden" }}>
              <div style={{
                height: "100%", borderRadius: 8,
                width: `${timeW}%`, background: tColor,
                transition: "width 0.08s linear, background 0.5s",
              }}/>
            </div>
            <span style={{ fontSize: 32, lineHeight: 1, transition: "transform 0.2s" }}>
              {phase === "game" ? TIER_CAT[tierIdx(elapsed)] : "😺"}
            </span>
          </div>

          <div style={{ fontSize: 52, fontWeight: 800, color: "#4A4063", lineHeight: 1.1, marginBottom: 16 }}>
            {curQ.a} × {curQ.b} <span style={{ color: "#C4B8D4" }}>=</span>
          </div>

          <input
            ref={inputRef}
            type="number"
            value={val}
            onChange={e => setVal(e.target.value)}
            onKeyDown={onKeyDown}
            placeholder="?"
            style={{
              display: "block", margin: "0 auto 14px",
              width: 150, fontSize: 36, fontWeight: 800,
              textAlign: "center", padding: "8px 14px",
              border: "3px solid #EEE4FF", borderRadius: 18,
              color: "#4A4063", background: "#FFF8FF",
              fontFamily: "inherit", outline: "none",
            }}
          />

          <button
            onClick={() => val.trim() && handleSubmit(false)}
            disabled={!val.trim()}
            style={{ ...btnStyle("#FF8FAB", "rgba(255,143,171,0.4)", !val.trim()), fontSize: 16, padding: "11px 30px" }}
          >
            Valider ↵
          </button>
        </div>
      )}

      {/* ═══ FEEDBACK CARD — SOFT RETRY (first timeout, not counted) ═══ */}
      {/* Cas spécial : premier dépassement de temps sur un calcul. Message
          rassurant (« pas de stress »), le calcul est renvoyé en fin de file
          et ne compte pas. Au 2e timeout, on bascule sur le feedback normal. */}
      {phase === "fb" && fb && fb.retryTimeout && (
        <div className="mk-fade" style={{
          ...cardStyle,
          padding: "24px 22px",
          background: "linear-gradient(135deg, rgba(255,209,102,0.97), rgba(255,179,71,0.97))",
          display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 8,
        }}>
          <div className="mk-pop" style={{ fontSize: 70, lineHeight: 1 }}>⏰</div>
          <div style={{ fontSize: 24, fontWeight: 800, color: "white", textShadow: "0 2px 8px rgba(0,0,0,0.15)" }}>
            Pas de stress !
          </div>
          <div style={{ fontSize: 14, color: "white", marginTop: 2, opacity: 0.95, textAlign: "center" }}>
            On reviendra à <b>{fb.q.a} × {fb.q.b}</b> plus tard.
          </div>
          <div style={{ fontSize: 12, color: "rgba(255,255,255,0.85)", marginTop: 2 }}>
            Ce calcul ne compte pas.
          </div>
          <button
            onClick={advance}
            ref={el => {
              if (el) setTimeout(() => { try { el.focus(); } catch (_) {} }, FB_MIN_MS);
            }}
            style={{
              marginTop: 14,
              background: "white",
              color: "#A06020",
              border: "none",
              borderRadius: 50,
              padding: "10px 28px",
              fontSize: 16,
              fontWeight: 800,
              cursor: "pointer",
              fontFamily: "inherit",
              boxShadow: "0 4px 14px rgba(0,0,0,0.18)",
              transition: "transform 0.12s",
            }}
            onMouseDown={e => e.currentTarget.style.transform = "scale(0.95)"}
            onMouseUp={e => e.currentTarget.style.transform = "scale(1)"}
            onMouseLeave={e => e.currentTarget.style.transform = "scale(1)"}
          >
            Suivant ➡️
          </button>
        </div>
      )}

      {/* ═══ FEEDBACK CARD ═══ (separate so it grows naturally) */}
      {/* Feedback normal après une réponse : vert si juste (animal + éventuels
          combo/récompenses), rose si faux (la bonne réponse + objet rigolo).
          Bloc séparé du soft-retry pour que sa hauteur s'adapte au contenu. */}
      {phase === "fb" && fb && !fb.retryTimeout && (
        <div className="mk-fade" style={{
          ...cardStyle,
          padding: "24px 22px",
          background: fb.ok
            ? "linear-gradient(135deg, rgba(168,224,176,0.97), rgba(148,210,172,0.97))"
            : "linear-gradient(135deg, rgba(255,154,168,0.97), rgba(255,124,148,0.97))",
          display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 6,
        }}>
          <div className={fb.ok ? "mk-pop" : "mk-wiggle"} style={{ fontSize: 70, lineHeight: 1 }}>
            {fb.cat}
          </div>
          <div style={{ fontSize: 22, fontWeight: 800, color: "white", textShadow: "0 2px 8px rgba(0,0,0,0.15)" }}>
            {fb.label}
          </div>

          {fb.ok ? (
            <>
              {/* Mode normal : l'animal sauvé en grand. Mode welcome : pas
                  d'animal de session (la récompense arrive à la fin), juste
                  un indicateur de progression « X / 10 » pour aider l'enfant
                  à se situer dans le défi zéro-erreur. */}
              {fb.gAnimal ? (
                <div className="mk-bounce" style={{
                  fontSize: 60, lineHeight: 1, marginTop: 4,
                  filter: "drop-shadow(0 4px 12px rgba(0,0,0,0.2))",
                }}>{fb.gAnimal.emoji}</div>
              ) : gameMode === "welcome" ? (
                <div style={{
                  marginTop: 6, fontSize: 22, fontWeight: 800, color: "white",
                  background: "rgba(255,255,255,0.22)",
                  borderRadius: 16, padding: "6px 18px",
                  textShadow: "0 2px 8px rgba(0,0,0,0.15)",
                }}>
                  ✓ {qi + 1} / {qs.length}
                </div>
              ) : null}

              {fb.cLabel && (
                <>
                  <div style={{
                    marginTop: 4, fontSize: 13, fontWeight: 800, color: "white",
                    background: "rgba(255,255,255,0.22)",
                    borderRadius: 16, padding: "4px 14px",
                  }}>{fb.cLabel}</div>

                  {(fb.gPlants.length > 0 || fb.gFoods.length > 0) && (
                    <div style={{ display: "flex", gap: 6, marginTop: 4, flexWrap: "wrap", justifyContent: "center", maxWidth: 360 }}>
                      {[...fb.gPlants, ...fb.gFoods].map((em, i) => (
                        <span key={i} className="mk-spin" style={{
                          fontSize: 32, display: "inline-block",
                          animationDelay: `${i * 0.08}s`,
                        }}>{em}</span>
                      ))}
                    </div>
                  )}

                  {fb.gKeepers && fb.gKeepers.length > 0 && (
                    <div style={{
                      display: "flex", gap: 6, marginTop: 6,
                      flexWrap: "wrap", justifyContent: "center", maxWidth: 360,
                    }}>
                      {fb.gKeepers.map((k, i) => (
                        <span key={i} className="mk-bounce" style={{
                          fontSize: 44, display: "inline-block",
                          animationDelay: `${i * 0.12}s`,
                          filter: "drop-shadow(0 4px 14px rgba(255,210,80,0.7))",
                        }}>{k}</span>
                      ))}
                    </div>
                  )}
                </>
              )}
            </>
          ) : (
            <>
              <div style={{ fontSize: 18, fontWeight: 700, color: "white", marginTop: 4 }}>
                {fb.q.a} × {fb.q.b} =
              </div>
              <div style={{ fontSize: 44, fontWeight: 800, color: "white", lineHeight: 1, textShadow: "0 2px 10px rgba(0,0,0,0.2)" }}>
                {fb.q.ans}
              </div>
              <div className="mk-drop" style={{
                fontSize: 40, marginTop: 4,
                filter: "drop-shadow(0 4px 10px rgba(0,0,0,0.2))",
              }}>{fb.gJunk}</div>
              <div style={{ fontSize: 12, color: "rgba(255,255,255,0.85)", marginTop: 2 }}>
                {fb.isTimeout ? "⏰ Temps écoulé" : `Tu as mis ${fb.userAns}`}
              </div>
            </>
          )}

          <button
            onClick={advance}
            ref={el => {
              if (el) setTimeout(() => { try { el.focus(); } catch (_) {} }, FB_MIN_MS);
            }}
            style={{
              marginTop: 14,
              background: "white",
              color: fb.ok ? "#4A8060" : "#C04060",
              border: "none",
              borderRadius: 50,
              padding: "10px 28px",
              fontSize: 16,
              fontWeight: 800,
              cursor: "pointer",
              fontFamily: "inherit",
              boxShadow: "0 4px 14px rgba(0,0,0,0.18)",
              transition: "transform 0.12s",
            }}
            onMouseDown={e => e.currentTarget.style.transform = "scale(0.95)"}
            onMouseUp={e => e.currentTarget.style.transform = "scale(1)"}
            onMouseLeave={e => e.currentTarget.style.transform = "scale(1)"}
          >
            {qi + 1 >= qs.length ? "Voir mon zoo 🦁" : "Suivant ➡️"}
          </button>
        </div>
      )}

      {/* ═══ END / ZOO ═══ */}
      {/* Écran de bilan de fin de partie : animaux secourus regroupés par
          famille, végétation/nourriture, objets rigolos, et la liste des
          calculs à réviser. La cascade d'apparition des emojis est minutée par
          les délais calculés plus haut (animalGroups, keepersBase, etc.).
          ── Branche dédiée mode "welcome" ──
          Quand on arrive ici avec gameMode === "welcome", on affiche un écran
          de succès court et focalisé : l'animal nouvellement accueilli en gros,
          le compteur de la famille mis à jour, et un retour direct au refuge.
          L'effet de fin de partie a déjà incrémenté refuge.families[famKey]. */}
      {phase === "end" && gameMode === "welcome" && welcomeFamily && currentProfile && (() => {
        const { t, half } = welcomeFamily;
        const fam = TABLES[t][half];
        // Le NOUVEAU compteur = snapshot d'avant la partie + 1 (cap à 4). On
        // évite ainsi le « flash » d'un ancien compteur au premier rendu avant
        // que l'effet de fin ait commité dans le store.
        const newCount = Math.min(4, preWelcomeCountRef.current + 1);
        const justWelcomed = welcomedAnimalForNewCount(t, half, newCount);
        const isLast = newCount === 4;
        return (
          <div style={{ ...cardStyle, maxWidth: 460 }} className="mk-slide">
            <div style={{ fontSize: 48, lineHeight: 1, marginBottom: 4 }}>
              {isLast ? "🎉" : "✨"}
            </div>
            <h2 style={{ fontSize: 24, fontWeight: 800, color: "#3F8F50", margin: "0 0 8px" }}>
              {isLast
                ? `Famille ${fam.name} au complet !`
                : "Un nouvel ami rejoint ton refuge !"}
            </h2>
            <div className="mk-bounce" style={{
              fontSize: 96, lineHeight: 1, margin: "8px 0",
              filter: "drop-shadow(0 6px 14px rgba(0,0,0,0.18))",
            }}>
              {justWelcomed}
            </div>
            <p style={{ fontSize: 15, color: "#4A4063", fontWeight: 800, marginBottom: 2 }}>
              {fam.name}
            </p>
            <p style={{ fontSize: 12, color: "#9B8FAE", marginBottom: 14 }}>
              ×{t} {half === "low" ? "bas" : "haut"} · <b style={{ color: "#3F8F50" }}>{newCount}/4</b> dans ton refuge
            </p>
            <div style={{ display: "flex", gap: 10, justifyContent: "center", flexWrap: "wrap" }}>
              <button
                onClick={() => setPhase("zoomap")}
                style={btnStyle("#5FB371", "rgba(95,179,113,0.4)")}
              >
                🗺️ Voir mon refuge
              </button>
            </div>
          </div>
        );
      })()}

      {phase === "end" && gameMode !== "welcome" && (() => {
        const totalFamilies = Object.values(TABLES).length * 2;
        const discoveredFamilies = animalGroups.length;
        const isPerfect = errors.length === 0 && animals.length > 0;
        return (
        <div style={{ ...cardStyle, maxWidth: 480, maxHeight: "94vh", overflowY: "auto" }} className="mk-slide">
          <div style={{ fontSize: 56, marginBottom: 4 }}>😽</div>
          <h2 style={{ fontSize: 28, fontWeight: 800, color: "#4A4063", margin: "0 0 4px" }}>
            Mission terminée !
          </h2>

          {gameMode === "daily" && (
            <div style={{
              background: "linear-gradient(135deg, #FFF4D6, #FFD166)",
              border: "3px solid #E0A030",
              borderRadius: 18,
              padding: "12px 14px",
              marginBottom: 12,
              boxShadow: "0 4px 14px rgba(224,160,48,0.3)",
            }}>
              <div style={{ fontSize: 28, lineHeight: 1, marginBottom: 4 }}>⭐ 🛟 ⭐</div>
              <div style={{ fontSize: 16, fontWeight: 800, color: "#7A4A1A" }}>
                Sauvetage du jour réussi !
              </div>
              <div style={{ fontSize: 12, color: "#7A4A1A", marginTop: 2, opacity: 0.85 }}>
                Reviens demain pour le prochain sauvetage
              </div>
            </div>
          )}

          {isPerfect && perfectInfo && (
            <div style={{
              background: "linear-gradient(135deg, #FFF4D6, #FFE9A8)",
              border: "3px solid #FFD166",
              borderRadius: 18,
              padding: "10px 14px",
              marginBottom: 12,
              display: "flex", alignItems: "center", justifyContent: "center", gap: 10,
            }}>
              <span style={{ fontSize: 36, lineHeight: 1 }}>{perfectInfo.emoji}</span>
              <span style={{ fontSize: 14, fontWeight: 800, color: "#9C7A2C", textAlign: "left" }}>
                {perfectInfo.label}
              </span>
            </div>
          )}

          <p style={{ fontSize: 14, color: "#9B8FAE", marginBottom: 4 }}>
            {animals.length} bonne{animals.length > 1 ? "s" : ""} réponse{animals.length > 1 ? "s" : ""}
            {keepers.length > 0 && ` · ${keepers.length} soigneur${keepers.length > 1 ? "s" : ""}`}
          </p>
          <p style={{ fontSize: 13, color: "#9B8FAE", marginBottom: 16 }}>
            🐾 {discoveredFamilies} famille{discoveredFamilies > 1 ? "s" : ""} découverte{discoveredFamilies > 1 ? "s" : ""} sur {totalFamilies}
          </p>

          {/* Animals — grouped by family */}
          <div style={{
            background: "linear-gradient(160deg, #E8F5E9, #C8E6C9)",
            borderRadius: 20, padding: "12px 14px 14px",
            marginBottom: 10,
            border: "3px dashed #A5D6A7",
          }}>
            <div style={{ fontSize: 10, color: "#558B65", fontWeight: 800, textTransform: "uppercase", letterSpacing: 2, marginBottom: 6, textAlign: "left" }}>
              🐾 Animaux secourus ({animals.length})
            </div>
            {animalGroups.length === 0 ? (
              <p style={{ fontSize: 13, color: "#7CA886", fontStyle: "italic", margin: "8px 0" }}>
                Aucun animal pour l'instant…
              </p>
            ) : (
              animalGroups.map((g, gi) => {
                const isHigh = g.half === "high";
                return (
                  <div key={`${g.table}-${g.half}`} style={{ marginTop: gi === 0 ? 0 : 10 }}>
                    <div style={{
                      textAlign: "left", marginBottom: 4,
                      display: "flex", justifyContent: "space-between", alignItems: "baseline", gap: 6,
                    }}>
                      <span style={{ display: "flex", alignItems: "baseline", gap: 6, flexWrap: "wrap" }}>
                        <span style={{
                          color: "#3F6F4D", fontWeight: 800, fontSize: 14,
                        }}>
                          {g.name}
                        </span>
                        <span style={{ color: "#7CA886", fontSize: 11, fontWeight: 700 }}>
                          ({g.table}× ½ {isHigh ? "haut" : "bas"})
                        </span>
                      </span>
                      <span style={{ color: "#7CA886", fontSize: 11, fontWeight: 700 }}>×{g.items.length}</span>
                    </div>
                    <div style={{ display: "flex", flexWrap: "wrap", gap: 4, justifyContent: "flex-start" }}>
                      {g.items.map((a, i) => (
                        <span key={i} className="mk-bounce" style={{
                          fontSize: 30, display: "inline-block",
                          animationDelay: `${a.delay}s`,
                        }}>{a.emoji}</span>
                      ))}
                    </div>
                  </div>
                );
              })
            )}
            {keepers.length > 0 && (
              <>
                <div style={{ fontSize: 10, color: "#558B65", fontWeight: 800, textTransform: "uppercase", letterSpacing: 2, marginTop: 12, marginBottom: 4, textAlign: "left" }}>
                  ❤️‍🩹 Les soigneurs
                </div>
                <div style={{ display: "flex", flexWrap: "wrap", gap: 4, justifyContent: "center" }}>
                  {keepers.map((k, i) => (
                    <span key={i} className="mk-bounce" style={{
                      fontSize: 30, display: "inline-block",
                      animationDelay: `${keepersBase + Math.min(i * KEEPER_STEP, KEEPER_CAP)}s`,
                    }}>{k}</span>
                  ))}
                </div>
              </>
            )}
          </div>

          {(plants.length > 0 || foods.length > 0) && (
            <div style={{
              background: "linear-gradient(160deg, #FFF8E1, #FFE9A8)",
              borderRadius: 20, padding: "12px 14px 14px",
              marginBottom: 10,
              border: "3px dashed #FFD166",
            }}>
              <div style={{ fontSize: 10, color: "#9C7A2C", fontWeight: 800, textTransform: "uppercase", letterSpacing: 2, marginBottom: 6, textAlign: "left" }}>
                🌿 Végétation & nourriture ({plants.length + foods.length})
              </div>
              <div style={{ display: "flex", flexWrap: "wrap", gap: 4, justifyContent: "center" }}>
                {[...plants, ...foods].map((e, i) => (
                  <span key={i} className="mk-spin" style={{
                    fontSize: 26, display: "inline-block",
                    animationDelay: `${veggieBase + Math.min(i * VEGGIE_STEP, VEGGIE_CAP)}s`,
                  }}>{e}</span>
                ))}
              </div>
            </div>
          )}

          {junkCol.length > 0 && (
            <div style={{
              background: "linear-gradient(160deg, #FAFAFC, #ECEAF5)",
              borderRadius: 20, padding: "12px 14px 14px",
              marginBottom: 12,
              border: "3px dashed #C4B8D4",
            }}>
              <div style={{ fontSize: 10, color: "#7B6E94", fontWeight: 800, textTransform: "uppercase", letterSpacing: 2, marginBottom: 6, textAlign: "left" }}>
                Pas d'animaux, mais tu as trouvé ça... ({junkCol.length})
              </div>
              <div style={{ display: "flex", flexWrap: "wrap", gap: 4, justifyContent: "center" }}>
                {junkCol.map((j, i) => (
                  <span key={i} className="mk-drop" style={{
                    fontSize: 24, display: "inline-block",
                    animationDelay: `${junkBase + Math.min(i * JUNK_STEP, JUNK_CAP)}s`,
                  }}>{j}</span>
                ))}
              </div>
            </div>
          )}

          {errors.length > 0 && (
            <div style={{
              background: "#FFF5F8", borderRadius: 18,
              padding: "10px 14px", marginBottom: 16, textAlign: "left",
            }}>
              <p style={{ fontSize: 11, color: "#9B8FAE", fontWeight: 800, textTransform: "uppercase", letterSpacing: 2, margin: "0 0 6px" }}>
                Révisions ! 🐵
              </p>
              {errors.map((r, i) => (
                <div key={i} style={{
                  display: "flex", justifyContent: "space-between",
                  fontSize: 15, color: "#4A4063", fontWeight: 700,
                  padding: "3px 0",
                  borderBottom: i < errors.length - 1 ? "1px solid #FEE8F0" : "none",
                }}>
                  <span>{r.q.a} × {r.q.b}</span>
                  <span style={{ color: "#FF8FAB" }}>= {r.q.ans}</span>
                </div>
              ))}
            </div>
          )}

          <div style={{ display: "flex", gap: 10, justifyContent: "center", flexWrap: "wrap" }}>
            <button onClick={() => setPhase("zoomap")} style={btnStyle("#7BC9A0", "rgba(123,201,160,0.4)")}>
              🗺️ Mon refuge
            </button>
            <button onClick={() => startGame("play")} style={btnStyle()}>
              Rejouer 🔄
            </button>
          </div>
        </div>
        );
      })()}
    </div>
  );
}
