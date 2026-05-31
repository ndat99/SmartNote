/**
 * ─── Note Card Doodle & Tape Decorations ───
 * Cập nhật giao diện Scrapbook (PNG Tapes & Doodles).
 */

(function () {
    'use strict';

    const DOODLE_FILES = [
        'arrow.png', 'branch.png', 'bulb.png', 'cactus.png', 'exclamation.png', 'flower.png', 
        'glitter.png', 'grass.png', 'heart1.png', 'heart2.png', 'leaf.png', 'like.png', 
        'naruto.png', 'note.png', 'question.png', 'sign1.png', 'sign2.png', 'smile.png', 
        'star.png', 'thought.png', 'tree.png', 'trophy.png'
    ];

    const TAPE_HORIZONTAL = [
        'horizional_tape_1.png', 'horizional_tape_2.png', 'horizional_tape_3.png', 'horizional_tape_4.png'
    ];

    const TAPE_DIAGONAL = [
        'diagonal_tape_1.png', 'diagonal_tape_2.png', 'diagonal_tape_3.png', 'diagonal_tape_4.png'
    ];

    function seededRandom(seed) {
        let s = seed;
        return function () {
            s = (s * 16807 + 0) % 2147483647;
            return (s - 1) / 2147483646;
        };
    }

    function hashStr(str) {
        let hash = 5381;
        for (let i = 0; i < str.length; i++) {
            hash = ((hash << 5) + hash) + str.charCodeAt(i);
            hash = hash & hash;
        }
        return Math.abs(hash);
    }

    function applyDoodles() {
        const cards = document.querySelectorAll('.note-card:not(.trash-card):not([data-doodled])');

        cards.forEach(function (card) {
            card.setAttribute('data-doodled', '1');

            const noteId = card.dataset.noteId || card.dataset.index || '0';
            const rng = seededRandom(hashStr(noteId + 'doodle2')); // use 'doodle2' to change seeds from before

            // Random fold (about 50% chance)
            if (rng() > 0.5) {
                card.classList.add('has-fold');
            }

            // 1. DOODLE CONTAINER (Clipped)
            let container = card.querySelector('.doodle-container');
            if (!container) {
                container = document.createElement('div');
                container.className = 'doodle-container';
                card.insertBefore(container, card.firstChild);
            }

            // 1 Doodle PNG per note (Bottom Right)
            let doodleIdx = Math.floor(rng() * DOODLE_FILES.length);
            let doodleFile = DOODLE_FILES[doodleIdx];
            
            let img = document.createElement('img');
            img.src = '/static/images/doodles/' + doodleFile;
            img.className = 'doodle-img';
            
            let size = 35 + rng() * 25; // 35px to 60px
            img.style.width = size + 'px';
            
            let rot = -20 + rng() * 40;
            img.style.transform = `rotate(${rot}deg)`;
            
            // Right 20-40px, Bottom 15-35px to avoid delete button
            let rightOffset = 20 + rng() * 20;
            let bottomOffset = 15 + rng() * 20;
            img.style.right = rightOffset + 'px';
            img.style.bottom = bottomOffset + 'px';
            
            container.appendChild(img);

            // 2. TAPE CONTAINER (Not clipped)
            // 50% chance for tape
            if (rng() > 0.5) {
                let tapeContainer = card.querySelector('.tape-container');
                if (!tapeContainer) {
                    tapeContainer = document.createElement('div');
                    tapeContainer.className = 'tape-container';
                    card.insertBefore(tapeContainer, card.firstChild);
                }
                
                let hasFold = card.classList.contains('has-fold');
                let tapePos;
                
                if (hasFold) {
                    // Avoid top-right if there's a fold
                    tapePos = rng() > 0.5 ? 'top-center' : 'top-left';
                } else {
                    let r = rng();
                    if (r < 0.33) tapePos = 'top-center';
                    else if (r < 0.66) tapePos = 'top-left';
                    else tapePos = 'top-right';
                }
                
                let tapeFile;
                let tapeImg = document.createElement('img');
                tapeImg.className = 'tape-img';
                
                let rotVariance = -5 + rng() * 10;
                
                if (tapePos === 'top-center') {
                    tapeFile = TAPE_HORIZONTAL[Math.floor(rng() * TAPE_HORIZONTAL.length)];
                    let tapeSize = 75 + rng() * 25; // Giữ nguyên kích thước ngang
                    tapeImg.style.width = tapeSize + 'px';
                    tapeImg.style.top = '-20px'; // Nâng cao hơn
                    tapeImg.style.left = '50%';
                    tapeImg.style.transform = `translateX(-50%) rotate(${rotVariance}deg)`;
                } else if (tapePos === 'top-left') {
                    tapeFile = TAPE_DIAGONAL[Math.floor(rng() * TAPE_DIAGONAL.length)];
                    let tapeSize = 55 + rng() * 15; // Nhỏ lại cho tape chéo
                    tapeImg.style.width = tapeSize + 'px';
                    tapeImg.style.top = '-15px';
                    tapeImg.style.left = '-15px';
                    tapeImg.style.transform = `rotate(${rotVariance}deg)`;
                } else { // top-right
                    tapeFile = TAPE_DIAGONAL[Math.floor(rng() * TAPE_DIAGONAL.length)];
                    let tapeSize = 55 + rng() * 15; // Nhỏ lại cho tape chéo
                    tapeImg.style.width = tapeSize + 'px';
                    tapeImg.style.top = '-15px';
                    tapeImg.style.right = '-15px';
                    tapeImg.style.transform = `scaleX(-1) rotate(${rotVariance}deg)`;
                }
                
                tapeImg.src = '/static/images/tapes/' + tapeFile;
                tapeContainer.appendChild(tapeImg);
            }
        });
    }

    // Export
    window.applyDoodles = applyDoodles;

    // Run once on load
    document.addEventListener('DOMContentLoaded', applyDoodles);

})();
