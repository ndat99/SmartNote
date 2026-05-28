/**
 * ─── Note Card Doodle Decorations v2 ───
 * Họa tiết trang trí mềm mại, hand-drawn style trên mỗi note card.
 * SVG sử dụng bezier curves cho cảm giác organic, mềm mại.
 */

(function () {
    'use strict';

    /* ════════════════════════════════════════════
       DOODLE SVG LIBRARY — Soft, organic, hand-drawn
       Mỗi doodle dùng cubic bezier curves + fill nhẹ
       ════════════════════════════════════════════ */
    const DOODLES = [
        // 0 — Lá cây mềm mại (organic leaf)
        {
            svg: `<svg viewBox="0 0 60 60" fill="none" xmlns="http://www.w3.org/2000/svg">
                <path d="M30 52C30 52 10 38 10 22C10 10 18 6 30 6C42 6 50 10 50 22C50 38 30 52 30 52Z" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" fill="currentColor" fill-opacity="0.08"/>
                <path d="M30 48V18" stroke="currentColor" stroke-width="1.3" stroke-linecap="round"/>
                <path d="M30 28C25 24 18 22 16 18" stroke="currentColor" stroke-width="1.1" stroke-linecap="round"/>
                <path d="M30 36C35 32 42 30 44 26" stroke="currentColor" stroke-width="1.1" stroke-linecap="round"/>
                <path d="M30 22C27 20 22 20 20 16" stroke="currentColor" stroke-width="0.9" stroke-linecap="round" opacity="0.5"/>
            </svg>`,
            minSize: 30, maxSize: 40
        },
        // 1 — Bóng đèn ý tưởng (soft lightbulb)
        {
            svg: `<svg viewBox="0 0 56 56" fill="none" xmlns="http://www.w3.org/2000/svg">
                <path d="M22 46H34" stroke="currentColor" stroke-width="1.4" stroke-linecap="round"/>
                <path d="M24 50H32" stroke="currentColor" stroke-width="1.4" stroke-linecap="round"/>
                <path d="M28 6C18 6 10 14 10 24C10 32 14 36 22 40V44H34V40C42 36 46 32 46 24C46 14 38 6 28 6Z" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" fill="currentColor" fill-opacity="0.06"/>
                <path d="M22 34C18 31 16 28 16 24" stroke="currentColor" stroke-width="1" stroke-linecap="round" opacity="0.4"/>
                <path d="M24 8C24 8 26 14 22 16" stroke="currentColor" stroke-width="0.8" stroke-linecap="round" opacity="0.25"/>
            </svg>`,
            minSize: 30, maxSize: 50
        },
        // 2 — Ngôi sao mềm (soft star)
        {
            svg: `<svg viewBox="0 0 52 52" fill="none" xmlns="http://www.w3.org/2000/svg">
                <path d="M26 6L31 20L46 22L35 32L38 46L26 40L14 46L17 32L6 22L21 20L26 6Z" stroke="currentColor" stroke-width="1.4" stroke-linecap="round" stroke-linejoin="round" fill="currentColor" fill-opacity="0.07"/>
            </svg>`,
            minSize: 25, maxSize: 40
        },
        // 3 — Hoa mềm (soft flower with petals)
        {
            svg: `<svg viewBox="0 0 56 56" fill="none" xmlns="http://www.w3.org/2000/svg">
                <circle cx="28" cy="28" r="5" stroke="currentColor" stroke-width="1.3" fill="currentColor" fill-opacity="0.1"/>
                <path d="M28 8C24 12 24 20 28 24C32 20 32 12 28 8Z" stroke="currentColor" stroke-width="1.1" stroke-linecap="round" fill="currentColor" fill-opacity="0.05"/>
                <path d="M48 28C44 24 36 24 32 28C36 32 44 32 48 28Z" stroke="currentColor" stroke-width="1.1" stroke-linecap="round" fill="currentColor" fill-opacity="0.05"/>
                <path d="M28 48C32 44 32 36 28 32C24 36 24 44 28 48Z" stroke="currentColor" stroke-width="1.1" stroke-linecap="round" fill="currentColor" fill-opacity="0.05"/>
                <path d="M8 28C12 32 20 32 24 28C20 24 12 24 8 28Z" stroke="currentColor" stroke-width="1.1" stroke-linecap="round" fill="currentColor" fill-opacity="0.05"/>
                <path d="M42 14C38 14 34 18 32 22C36 22 42 18 42 14Z" stroke="currentColor" stroke-width="0.9" stroke-linecap="round" fill="currentColor" fill-opacity="0.04" opacity="0.7"/>
                <path d="M14 42C18 42 22 38 24 34C20 34 14 38 14 42Z" stroke="currentColor" stroke-width="0.9" stroke-linecap="round" fill="currentColor" fill-opacity="0.04" opacity="0.7"/>
            </svg>`,
            minSize: 30, maxSize: 45
        },
        // 4 — Bướm mềm (soft butterfly)
        {
            svg: `<svg viewBox="0 0 60 52" fill="none" xmlns="http://www.w3.org/2000/svg">
                <path d="M30 10V44" stroke="currentColor" stroke-width="1.3" stroke-linecap="round"/>
                <path d="M30 24C22 12 6 8 6 20C6 30 20 32 30 24Z" stroke="currentColor" stroke-width="1.3" stroke-linecap="round" stroke-linejoin="round" fill="currentColor" fill-opacity="0.06"/>
                <path d="M30 24C38 12 54 8 54 20C54 30 40 32 30 24Z" stroke="currentColor" stroke-width="1.3" stroke-linecap="round" stroke-linejoin="round" fill="currentColor" fill-opacity="0.06"/>
                <path d="M30 34C24 30 12 32 12 40C12 44 22 44 30 34Z" stroke="currentColor" stroke-width="1.1" stroke-linecap="round" stroke-linejoin="round" fill="currentColor" fill-opacity="0.05"/>
                <path d="M30 34C36 30 48 32 48 40C48 44 38 44 30 34Z" stroke="currentColor" stroke-width="1.1" stroke-linecap="round" stroke-linejoin="round" fill="currentColor" fill-opacity="0.05"/>
                <path d="M26 6Q24 2 28 4" stroke="currentColor" stroke-width="1" stroke-linecap="round"/>
                <path d="M34 6Q36 2 32 4" stroke="currentColor" stroke-width="1" stroke-linecap="round"/>
            </svg>`,
            minSize: 30, maxSize: 45
        },
        // 5 — Chữ ký / squiggle mềm
        {
            svg: `<svg viewBox="0 0 72 28" fill="none" xmlns="http://www.w3.org/2000/svg">
                <path d="M6 22C10 6 16 6 20 14C24 22 28 22 32 14C36 6 40 6 44 14C48 22 52 22 56 14C60 6 64 6 68 14" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round" fill="none"/>
            </svg>`,
            minSize: 40, maxSize: 55
        },
        // 6 — Mây mềm (soft cloud)
        {
            svg: `<svg viewBox="0 0 64 36" fill="none" xmlns="http://www.w3.org/2000/svg">
                <path d="M12 28C6 28 2 24 2 20C2 16 6 14 10 14C10 8 16 4 22 4C28 4 32 8 34 12C36 8 42 6 46 10C48 6 54 6 58 12C62 12 62 16 62 20C62 26 58 28 52 28Z" stroke="currentColor" stroke-width="1.4" stroke-linecap="round" stroke-linejoin="round" fill="currentColor" fill-opacity="0.06"/>
            </svg>`,
            minSize: 35, maxSize: 52
        },
        // 7 — Trái tim mềm (soft heart)
        {
            svg: `<svg viewBox="0 0 52 48" fill="none" xmlns="http://www.w3.org/2000/svg">
                <path d="M26 44C26 44 4 32 4 18C4 10 10 4 18 4C22 4 25 6 26 10C27 6 30 4 34 4C42 4 48 10 48 18C48 32 26 44 26 44Z" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" fill="currentColor" fill-opacity="0.07"/>
            </svg>`,
            minSize: 26, maxSize: 35
        },
        // 8 — Nốt nhạc mềm
        {
            svg: `<svg viewBox="0 0 44 52" fill="none" xmlns="http://www.w3.org/2000/svg">
                <ellipse cx="14" cy="42" rx="8" ry="6" stroke="currentColor" stroke-width="1.4" fill="currentColor" fill-opacity="0.07"/>
                <path d="M22 42V10" stroke="currentColor" stroke-width="1.4" stroke-linecap="round"/>
                <path d="M22 10C22 10 30 6 36 10C42 14 38 20 32 20C27 20 23 16 22 14" stroke="currentColor" stroke-width="1.4" stroke-linecap="round" stroke-linejoin="round" fill="currentColor" fill-opacity="0.05"/>
            </svg>`,
            minSize: 20, maxSize: 40
        },
        // 9 — Cốc cà phê mềm
        {
            svg: `<svg viewBox="0 0 56 52" fill="none" xmlns="http://www.w3.org/2000/svg">
                <path d="M8 18H38V40C38 44 34 48 30 48H16C12 48 8 44 8 40V18Z" stroke="currentColor" stroke-width="1.4" stroke-linecap="round" stroke-linejoin="round" fill="currentColor" fill-opacity="0.06"/>
                <path d="M38 22H42C46 22 50 26 50 30C50 34 46 38 42 38H38" stroke="currentColor" stroke-width="1.4" stroke-linecap="round"/>
                <path d="M16 6C16 6 16 12 20 12C24 12 24 6 24 6" stroke="currentColor" stroke-width="1.2" stroke-linecap="round" opacity="0.4"/>
                <path d="M28 4C28 4 28 10 32 10" stroke="currentColor" stroke-width="1" stroke-linecap="round" opacity="0.3"/>
            </svg>`,
            minSize: 30, maxSize: 42
        },
        // 10 — Cành lá mềm (soft branch)
        {
            svg: `<svg viewBox="0 0 56 60" fill="none" xmlns="http://www.w3.org/2000/svg">
                <path d="M28 54C28 54 28 6 28 6" stroke="currentColor" stroke-width="1.4" stroke-linecap="round"/>
                <path d="M28 14C22 10 14 12 12 18" stroke="currentColor" stroke-width="1.2" stroke-linecap="round"/>
                <path d="M28 14C20 12 14 14 14 20" stroke="currentColor" stroke-width="0.9" stroke-linecap="round" opacity="0.4" fill="currentColor" fill-opacity="0.04"/>
                <path d="M28 26C34 22 42 24 44 30" stroke="currentColor" stroke-width="1.2" stroke-linecap="round"/>
                <path d="M28 26C36 24 42 26 42 32" stroke="currentColor" stroke-width="0.9" stroke-linecap="round" opacity="0.4"/>
                <path d="M28 38C22 34 14 36 12 42" stroke="currentColor" stroke-width="1.2" stroke-linecap="round"/>
                <path d="M28 38C20 36 14 38 14 44" stroke="currentColor" stroke-width="0.9" stroke-linecap="round" opacity="0.4"/>
            </svg>`,
            minSize: 30, maxSize: 45
        },
        // 11 — Mặt trời mềm (soft sun)
        {
            svg: `<svg viewBox="0 0 52 52" fill="none" xmlns="http://www.w3.org/2000/svg">
                <circle cx="26" cy="26" r="10" stroke="currentColor" stroke-width="1.4" fill="currentColor" fill-opacity="0.07"/>
                <path d="M26 4V10M26 42V48M4 26H10M42 26H48" stroke="currentColor" stroke-width="1.3" stroke-linecap="round"/>
                <path d="M10 10L14.5 14.5M37.5 37.5L42 42M42 10L37.5 14.5M14.5 37.5L10 42" stroke="currentColor" stroke-width="1.1" stroke-linecap="round"/>
            </svg>`,
            minSize: 25, maxSize: 40
        },
        // 12 — Lá palm mềm (soft fern)
        {
            svg: `<svg viewBox="0 0 56 68" fill="none" xmlns="http://www.w3.org/2000/svg">
                <path d="M28 62V8" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/>
                <path d="M28 12C20 6 10 6 6 14" stroke="currentColor" stroke-width="1.2" stroke-linecap="round"/>
                <path d="M28 12C36 6 46 6 50 14" stroke="currentColor" stroke-width="1.2" stroke-linecap="round"/>
                <path d="M28 22C20 16 10 16 6 24" stroke="currentColor" stroke-width="1.1" stroke-linecap="round" opacity="0.8"/>
                <path d="M28 22C36 16 46 16 50 24" stroke="currentColor" stroke-width="1.1" stroke-linecap="round" opacity="0.8"/>
                <path d="M28 32C20 26 10 26 6 34" stroke="currentColor" stroke-width="1" stroke-linecap="round" opacity="0.6"/>
                <path d="M28 32C36 26 46 26 50 34" stroke="currentColor" stroke-width="1" stroke-linecap="round" opacity="0.6"/>
                <path d="M28 42C22 36 14 36 10 44" stroke="currentColor" stroke-width="0.9" stroke-linecap="round" opacity="0.45"/>
                <path d="M28 42C34 36 42 36 46 44" stroke="currentColor" stroke-width="0.9" stroke-linecap="round" opacity="0.45"/>
            </svg>`,
            minSize: 30, maxSize: 50
        },
        // 13 — Sparkle mềm (soft sparkle / 4-point star)
        {
            svg: `<svg viewBox="0 0 40 40" fill="none" xmlns="http://www.w3.org/2000/svg">
                <path d="M20 4C20 4 22 14 28 16C22 18 20 28 20 28C20 28 18 18 12 16C18 14 20 4 20 4Z" stroke="currentColor" stroke-width="1.3" stroke-linecap="round" stroke-linejoin="round" fill="currentColor" fill-opacity="0.06"/>
                <path d="M20 32C20 32 20.8 36 24 36C20.8 37 20 40 20 40C20 40 19.2 37 16 36C19.2 36 20 32 20 32Z" stroke="currentColor" stroke-width="0.9" stroke-linecap="round" opacity="0.5" fill="currentColor" fill-opacity="0.04"/>
                <path d="M34 8C34 8 35 12 38 12C35 13 34 16 34 16C34 16 33 13 30 12C33 12 34 8 34 8Z" stroke="currentColor" stroke-width="0.8" stroke-linecap="round" opacity="0.4" fill="currentColor" fill-opacity="0.03"/>
            </svg>`,
            minSize: 28, maxSize: 42
        },
        // 14 — Cây xương rồng mềm (soft cactus)
        {
            svg: `<svg viewBox="0 0 48 60" fill="none" xmlns="http://www.w3.org/2000/svg">
                <rect x="18" y="10" width="12" height="38" rx="6" stroke="currentColor" stroke-width="1.4" fill="currentColor" fill-opacity="0.06"/>
                <path d="M18 30C14 30 6 26 6 18C6 14 10 14 14 18C18 22 18 26 18 30Z" stroke="currentColor" stroke-width="1.2" fill="currentColor" fill-opacity="0.05"/>
                <path d="M30 22C34 22 42 18 42 10C42 6 38 6 34 10C30 14 30 18 30 22Z" stroke="currentColor" stroke-width="1.2" fill="currentColor" fill-opacity="0.05"/>
                <rect x="14" y="48" width="20" height="8" rx="3" stroke="currentColor" stroke-width="1.2" fill="currentColor" fill-opacity="0.04"/>
            </svg>`,
            minSize: 32, maxSize: 42
        },
        // 15 — Paper clip mềm
        {
            svg: `<svg viewBox="0 0 28 52" fill="none" xmlns="http://www.w3.org/2000/svg">
                <path d="M8 42V14C8 8 12 4 14 4C16 4 20 8 20 14V38C20 42 18 46 14 46C10 46 8 42 8 38V18" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" fill="none"/>
            </svg>`,
            minSize: 26, maxSize: 35
        },
        // 16 — Washi tape / miếng dán mềm
        {
            svg: `<svg viewBox="0 0 68 22" fill="none" xmlns="http://www.w3.org/2000/svg">
                <rect x="2" y="3" width="64" height="16" rx="2" stroke="currentColor" stroke-width="1.2" fill="currentColor" fill-opacity="0.08"/>
                <path d="M2 3L10 19M18 3L26 19M34 3L42 19M50 3L58 19" stroke="currentColor" stroke-width="0.7" opacity="0.2"/>
            </svg>`,
            minSize: 30, maxSize: 50
        },
        // 17 — Cầu vồng mềm (soft rainbow)
        {
            svg: `<svg viewBox="0 0 64 36" fill="none" xmlns="http://www.w3.org/2000/svg">
                <path d="M6 34C6 18 16 6 32 6C48 6 58 18 58 34" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" fill="none"/>
                <path d="M14 34C14 22 20 12 32 12C44 12 50 22 50 34" stroke="currentColor" stroke-width="1.3" stroke-linecap="round" opacity="0.5" fill="none"/>
                <path d="M22 34C22 26 25 18 32 18C39 18 42 26 42 34" stroke="currentColor" stroke-width="1" stroke-linecap="round" opacity="0.25" fill="none"/>
            </svg>`,
            minSize: 36, maxSize: 54
        },
        // 18 — Giọt nước mềm (soft raindrop)
        {
            svg: `<svg viewBox="0 0 36 48" fill="none" xmlns="http://www.w3.org/2000/svg">
                <path d="M18 6C18 6 4 22 4 32C4 40 10 44 18 44C26 44 32 40 32 32C32 22 18 6 18 6Z" stroke="currentColor" stroke-width="1.4" stroke-linecap="round" stroke-linejoin="round" fill="currentColor" fill-opacity="0.06"/>
                <path d="M12 32C12 28 14 24 18 24" stroke="currentColor" stroke-width="1" stroke-linecap="round" opacity="0.35"/>
            </svg>`,
            minSize: 24, maxSize: 38
        },
        // 19 — Lá eucalyptus mềm (soft eucalyptus)
        {
            svg: `<svg viewBox="0 0 48 64" fill="none" xmlns="http://www.w3.org/2000/svg">
                <path d="M24 58C24 58 26 8 26 8" stroke="currentColor" stroke-width="1.3" stroke-linecap="round"/>
                <ellipse cx="16" cy="14" rx="8" ry="5" transform="rotate(-20 16 14)" stroke="currentColor" stroke-width="1.1" fill="currentColor" fill-opacity="0.06"/>
                <ellipse cx="34" cy="24" rx="8" ry="5" transform="rotate(20 34 24)" stroke="currentColor" stroke-width="1.1" fill="currentColor" fill-opacity="0.06"/>
                <ellipse cx="14" cy="34" rx="7" ry="4.5" transform="rotate(-15 14 34)" stroke="currentColor" stroke-width="1" fill="currentColor" fill-opacity="0.05" opacity="0.8"/>
                <ellipse cx="36" cy="44" rx="6" ry="4" transform="rotate(15 36 44)" stroke="currentColor" stroke-width="0.9" fill="currentColor" fill-opacity="0.04" opacity="0.6"/>
            </svg>`,
            minSize: 34, maxSize: 50
        },
    ];

    /* ════════════════════════════════════════════
       Seeded pseudo-random (consistent per note)
       ════════════════════════════════════════════ */
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

    /* ════════════════════════════════════════════
       COLOR MAP — Màu rõ hơn, đậm hơn, mềm mại
       ════════════════════════════════════════════ */
    const DOODLE_COLORS = {
        '': 'rgba(140, 130, 165, 0.35)',      // default — lavender rõ
        'berry': 'rgba(180, 60, 100, 0.32)',
        'red': 'rgba(200, 70, 70, 0.30)',
        'orange': 'rgba(200, 120, 40, 0.32)',
        'yellow': 'rgba(170, 150, 30, 0.30)',
        'teal': 'rgba(20, 140, 110, 0.30)',
        'blue': 'rgba(40, 100, 200, 0.28)',
        'indigo': 'rgba(80, 60, 200, 0.28)',
        'purple': 'rgba(140, 50, 200, 0.28)',
        'pink': 'rgba(200, 60, 140, 0.28)',
        'brown': 'rgba(140, 80, 40, 0.32)',
    };

    /* ════════════════════════════════════════════
       POSITION ZONES — Vùng đặt doodle
       ════════════════════════════════════════════ */
    const POSITION_ZONES = [
        // bottom-right
        { xMin: 50, xMax: 82, yMin: 55, yMax: 85 },
        // bottom-left
        { xMin: -5, xMax: 25, yMin: 60, yMax: 88 },
        // top-right (below pin area)
        { xMin: 55, xMax: 85, yMin: 0, yMax: 20 },
        // mid-right
        { xMin: 65, xMax: 90, yMin: 30, yMax: 55 },
        // bottom-center
        { xMin: 25, xMax: 55, yMin: 65, yMax: 90 },
    ];

    /* ════════════════════════════════════════════
       MAIN — Gắn doodle vào mỗi note card
       ════════════════════════════════════════════ */
    function applyDoodles() {
        const cards = document.querySelectorAll('.note-card:not(.trash-card):not([data-doodled])');

        cards.forEach(function (card) {
            card.setAttribute('data-doodled', '1');

            const noteId = card.dataset.noteId || card.dataset.index || '0';
            const color = card.dataset.color || '';
            const rng = seededRandom(hashStr(noteId + 'doodle'));

            // Số doodle: 0-2
            const count = Math.floor(rng() * 3);

            const usedIndices = new Set();
            const usedZones = new Set();

            for (let i = 0; i < count; i++) {
                // Chọn doodle không lặp
                let doodleIdx;
                let attempts = 0;
                do {
                    doodleIdx = Math.floor(rng() * DOODLES.length);
                    attempts++;
                } while (usedIndices.has(doodleIdx) && attempts < 20);
                usedIndices.add(doodleIdx);

                const doodle = DOODLES[doodleIdx];

                // Chọn zone không lặp
                let zoneIdx;
                attempts = 0;
                do {
                    zoneIdx = Math.floor(rng() * POSITION_ZONES.length);
                    attempts++;
                } while (usedZones.has(zoneIdx) && attempts < 10);
                usedZones.add(zoneIdx);

                const zone = POSITION_ZONES[zoneIdx];

                // Vị trí ngẫu nhiên trong zone
                const x = zone.xMin + rng() * (zone.xMax - zone.xMin);
                const y = zone.yMin + rng() * (zone.yMax - zone.yMin);

                // Kích thước ngẫu nhiên
                const size = doodle.minSize + rng() * (doodle.maxSize - doodle.minSize);

                // Xoay nhẹ (-20° → +20°)
                const rotation = -20 + rng() * 40;

                // Màu
                const doodleColor = DOODLE_COLORS[color] || DOODLE_COLORS[''];

                // Tạo wrapper
                const wrapper = document.createElement('div');
                wrapper.className = 'note-doodle';
                wrapper.innerHTML = doodle.svg;
                wrapper.style.cssText = `
                    position: absolute;
                    left: ${x}%;
                    top: ${y}%;
                    width: ${size}px;
                    height: auto;
                    color: ${doodleColor};
                    transform: rotate(${rotation}deg) translate(-50%, -50%);
                    pointer-events: none;
                    z-index: 0;
                    opacity: 0;
                    transition: opacity 0.8s cubic-bezier(0.4,0,0.2,1) ${0.2 + i * 0.2}s;
                `;

                card.appendChild(wrapper);

                // Fade-in
                requestAnimationFrame(() => {
                    requestAnimationFrame(() => {
                        wrapper.style.opacity = '1';
                    });
                });
            }
        });
    }

    /* ════════════════════════════════════════════
       INIT + MutationObserver
       ════════════════════════════════════════════ */
    function init() {
        applyDoodles();

        const observer = new MutationObserver(function (mutations) {
            let hasNewCards = false;
            for (const m of mutations) {
                for (const node of m.addedNodes) {
                    if (node.nodeType === 1) {
                        if (node.classList && node.classList.contains('note-card')) {
                            hasNewCards = true;
                        } else if (node.querySelector && node.querySelector('.note-card')) {
                            hasNewCards = true;
                        }
                    }
                }
            }
            if (hasNewCards) {
                requestAnimationFrame(applyDoodles);
            }
        });

        observer.observe(document.body, { childList: true, subtree: true });
    }

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', init);
    } else {
        init();
    }

    window.applyNoteDoodles = applyDoodles;

})();
