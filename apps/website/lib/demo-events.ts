import type { eventWithTime } from "@posthog/rrweb";

const BASE_MS = 1742907600000;
const t = (offsetMs: number) => BASE_MS + offsetMs;

const RRWEB_TYPE_FULL_SNAPSHOT = 2;
const RRWEB_TYPE_INCREMENTAL = 3;
const RRWEB_TYPE_META = 4;

const RRWEB_SOURCE_MOUSE_MOVE = 1;
const RRWEB_SOURCE_MOUSE_INTERACTION = 2;
const RRWEB_SOURCE_SCROLL = 3;
const RRWEB_SOURCE_VIEWPORT_RESIZE = 4;

const RRWEB_MOUSE_CLICK = 2;

const BODY_ID = 5;

const fullSnapshotNode = {
  type: 0,
  childNodes: [
    { type: 1, name: "html", publicId: "", systemId: "", id: 1 },
    {
      type: 2,
      tagName: "html",
      attributes: { lang: "en" },
      childNodes: [
        {
          type: 2,
          tagName: "head",
          attributes: {},
          childNodes: [
            {
              type: 2,
              tagName: "style",
              attributes: {},
              childNodes: [
                {
                  type: 3,
                  textContent:
                    "* { margin: 0; padding: 0; box-sizing: border-box; } " +
                    "body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; background: #fafafa; color: #1a1a1a; } " +
                    ".hero { display: flex; flex-direction: column; align-items: center; justify-content: center; min-height: 100vh; padding: 48px 24px; gap: 24px; } " +
                    ".logo { font-size: 14px; font-weight: 600; letter-spacing: -0.02em; color: #888; } " +
                    "h1 { font-size: 36px; font-weight: 600; letter-spacing: -0.03em; text-align: center; max-width: 420px; line-height: 1.15; } " +
                    "p { font-size: 15px; color: #666; text-align: center; max-width: 380px; line-height: 1.6; } " +
                    ".field { width: 320px; height: 42px; border-radius: 10px; border: 1px solid #e0e0e0; background: #fff; } " +
                    ".btn { width: 320px; height: 42px; border-radius: 10px; background: #2563eb; border: none; color: #fff; font-size: 15px; font-weight: 500; cursor: pointer; } " +
                    ".toggle { width: 44px; height: 24px; border-radius: 12px; background: #e0e0e0; position: absolute; top: 24px; right: 24px; } " +
                    ".section { width: 100%; max-width: 640px; margin: 0 auto; padding: 48px 24px; } " +
                    ".card { height: 120px; border-radius: 12px; background: #f0f0f0; margin-bottom: 16px; } " +
                    ".link { color: #2563eb; font-size: 14px; text-decoration: none; }",
                  id: 4,
                },
              ],
              id: 3,
            },
          ],
          id: 2,
        },
        {
          type: 2,
          tagName: "body",
          attributes: {},
          childNodes: [
            {
              type: 2,
              tagName: "div",
              attributes: { class: "hero" },
              childNodes: [
                {
                  type: 2,
                  tagName: "div",
                  attributes: { class: "logo" },
                  childNodes: [{ type: 3, textContent: "expect", id: 7 }],
                  id: 6,
                },
                {
                  type: 2,
                  tagName: "h1",
                  attributes: {},
                  childNodes: [
                    {
                      type: 3,
                      textContent: "Let agents test your code in a real browser",
                      id: 9,
                    },
                  ],
                  id: 8,
                },
                {
                  type: 2,
                  tagName: "p",
                  attributes: {},
                  childNodes: [
                    {
                      type: 3,
                      textContent:
                        "One command scans your changes, generates a test plan, and runs it against a live browser.",
                      id: 11,
                    },
                  ],
                  id: 10,
                },
                {
                  type: 2,
                  tagName: "div",
                  attributes: { class: "field" },
                  childNodes: [],
                  id: 12,
                },
                {
                  type: 2,
                  tagName: "div",
                  attributes: { class: "field" },
                  childNodes: [],
                  id: 13,
                },
                {
                  type: 2,
                  tagName: "button",
                  attributes: { class: "btn" },
                  childNodes: [{ type: 3, textContent: "Get started", id: 15 }],
                  id: 14,
                },
              ],
              id: 16,
            },
            {
              type: 2,
              tagName: "div",
              attributes: { class: "section" },
              childNodes: [
                {
                  type: 2,
                  tagName: "div",
                  attributes: { class: "card" },
                  childNodes: [],
                  id: 18,
                },
                {
                  type: 2,
                  tagName: "div",
                  attributes: { class: "card" },
                  childNodes: [],
                  id: 19,
                },
                {
                  type: 2,
                  tagName: "div",
                  attributes: { class: "card" },
                  childNodes: [],
                  id: 20,
                },
                {
                  type: 2,
                  tagName: "a",
                  attributes: { class: "link", href: "https://github.com" },
                  childNodes: [{ type: 3, textContent: "GitHub", id: 22 }],
                  id: 21,
                },
              ],
              id: 17,
            },
            {
              type: 2,
              tagName: "div",
              attributes: { class: "toggle" },
              childNodes: [],
              id: 23,
            },
          ],
          id: BODY_ID,
        },
      ],
      id: 24,
    },
  ],
  id: 25,
};

const mouseMove = (offsetMs: number, positions: Array<{ x: number; y: number }>): eventWithTime =>
  ({
    type: RRWEB_TYPE_INCREMENTAL,
    data: {
      source: RRWEB_SOURCE_MOUSE_MOVE,
      positions: positions.map((position, index) => ({
        x: position.x,
        y: position.y,
        id: BODY_ID,
        timeOffset: index * 50,
      })),
    },
    timestamp: t(offsetMs),
  }) as unknown as eventWithTime;

const mouseClick = (offsetMs: number, x: number, y: number): eventWithTime =>
  ({
    type: RRWEB_TYPE_INCREMENTAL,
    data: {
      source: RRWEB_SOURCE_MOUSE_INTERACTION,
      type: RRWEB_MOUSE_CLICK,
      id: BODY_ID,
      x,
      y,
    },
    timestamp: t(offsetMs),
  }) as unknown as eventWithTime;

const scroll = (offsetMs: number, scrollTop: number): eventWithTime =>
  ({
    type: RRWEB_TYPE_INCREMENTAL,
    data: {
      source: RRWEB_SOURCE_SCROLL,
      id: BODY_ID,
      x: 0,
      y: scrollTop,
    },
    timestamp: t(offsetMs),
  }) as unknown as eventWithTime;

const viewportResize = (offsetMs: number, width: number, height: number): eventWithTime =>
  ({
    type: RRWEB_TYPE_INCREMENTAL,
    data: {
      source: RRWEB_SOURCE_VIEWPORT_RESIZE,
      width,
      height,
    },
    timestamp: t(offsetMs),
  }) as unknown as eventWithTime;

const metaEvent = (offsetMs: number, href: string, width: number, height: number): eventWithTime =>
  ({
    type: RRWEB_TYPE_META,
    data: { href, width, height },
    timestamp: t(offsetMs),
  }) as unknown as eventWithTime;

export const DEMO_EVENTS: eventWithTime[] = [
  metaEvent(0, "https://expect.dev", 1280, 720),

  {
    type: RRWEB_TYPE_FULL_SNAPSHOT,
    data: {
      node: fullSnapshotNode,
      initialOffset: { left: 0, top: 0 },
    },
    timestamp: t(0),
  } as unknown as eventWithTime,

  // Step 1: Navigate & verify landing page (0-23s)
  mouseMove(1_000, [{ x: 640, y: 100 }]),
  mouseMove(3_000, [
    { x: 500, y: 200 },
    { x: 480, y: 250 },
  ]),
  mouseMove(6_000, [
    { x: 400, y: 300 },
    { x: 420, y: 340 },
  ]),
  mouseMove(10_000, [
    { x: 640, y: 360 },
    { x: 640, y: 400 },
  ]),
  mouseClick(12_000, 640, 400),
  mouseMove(14_000, [
    { x: 640, y: 450 },
    { x: 640, y: 500 },
  ]),
  scroll(18_000, 200),
  mouseMove(20_000, [
    { x: 500, y: 300 },
    { x: 400, y: 250 },
  ]),

  // Step 2: Verify hero section & demo button (24-40s)
  scroll(24_000, 0),
  mouseMove(25_000, [{ x: 640, y: 180 }]),
  mouseMove(27_000, [
    { x: 640, y: 260 },
    { x: 640, y: 300 },
  ]),
  mouseClick(28_000, 640, 300),
  mouseMove(30_000, [{ x: 640, y: 420 }]),
  mouseMove(33_000, [
    { x: 640, y: 480 },
    { x: 640, y: 510 },
  ]),
  mouseClick(35_000, 640, 510),
  mouseMove(37_000, [
    { x: 700, y: 400 },
    { x: 750, y: 350 },
  ]),

  // Step 3: Test copy-to-clipboard (41-53s)
  scroll(41_000, 600),
  mouseMove(42_000, [{ x: 500, y: 300 }]),
  mouseClick(44_000, 500, 300),
  mouseMove(46_000, [{ x: 500, y: 350 }]),
  mouseClick(49_000, 500, 350),
  mouseMove(51_000, [
    { x: 600, y: 300 },
    { x: 700, y: 280 },
  ]),

  // Step 4: Test dark mode toggle (54-73s)
  scroll(54_000, 0),
  mouseMove(56_000, [
    { x: 1200, y: 30 },
    { x: 1240, y: 36 },
  ]),
  mouseClick(58_000, 1240, 36),
  mouseMove(62_000, [
    { x: 640, y: 300 },
    { x: 640, y: 400 },
  ]),
  mouseMove(66_000, [{ x: 1240, y: 36 }]),
  mouseClick(66_000, 1240, 36),
  mouseMove(70_000, [{ x: 800, y: 300 }]),

  // Step 5: Verify external links (74-80s)
  scroll(74_000, 800),
  mouseClick(75_000, 400, 500),
  metaEvent(76_000, "https://github.com/nicepkg/expect", 1280, 720),
  mouseMove(78_000, [{ x: 500, y: 300 }]),

  // Step 6: Scroll below the fold (81-93s)
  metaEvent(81_000, "https://expect.dev", 1280, 720),
  scroll(82_000, 300),
  mouseMove(84_000, [{ x: 640, y: 400 }]),
  scroll(86_000, 600),
  scroll(88_000, 900),
  mouseMove(90_000, [
    { x: 640, y: 300 },
    { x: 640, y: 250 },
  ]),
  scroll(92_000, 0),

  // Step 7: Visual regression check (94-109s)
  mouseMove(95_000, [{ x: 200, y: 200 }]),
  mouseMove(97_000, [
    { x: 400, y: 300 },
    { x: 600, y: 350 },
  ]),
  scroll(99_000, 400),
  mouseMove(101_000, [{ x: 800, y: 400 }]),
  mouseClick(103_000, 800, 400),
  mouseMove(105_000, [{ x: 640, y: 300 }]),
  scroll(107_000, 0),

  // Step 8: Mobile viewport (110-143s)
  viewportResize(112_000, 375, 812),
  metaEvent(112_500, "https://expect.dev", 375, 812),
  mouseMove(114_000, [{ x: 187, y: 200 }]),
  scroll(118_000, 200),
  mouseMove(120_000, [{ x: 187, y: 400 }]),
  scroll(124_000, 500),
  mouseMove(128_000, [{ x: 187, y: 300 }]),
  mouseClick(130_000, 187, 300),
  scroll(134_000, 800),
  mouseMove(136_000, [{ x: 187, y: 500 }]),
  scroll(138_000, 0),
  mouseMove(140_000, [{ x: 187, y: 200 }]),

  // Step 9: Dark mode at mobile (144-164s)
  mouseMove(146_000, [{ x: 340, y: 30 }]),
  mouseClick(148_000, 340, 30),
  mouseMove(150_000, [{ x: 187, y: 300 }]),
  scroll(152_000, 400),
  mouseMove(155_000, [{ x: 187, y: 500 }]),
  scroll(157_000, 0),
  mouseClick(160_000, 340, 30),
  mouseMove(162_000, [{ x: 187, y: 200 }]),

  // Step 10: Accessibility & console check (165-192s)
  viewportResize(166_000, 1280, 720),
  metaEvent(166_500, "https://expect.dev", 1280, 720),
  mouseMove(168_000, [{ x: 640, y: 300 }]),
  scroll(170_000, 300),
  mouseMove(172_000, [
    { x: 500, y: 400 },
    { x: 600, y: 350 },
  ]),
  scroll(175_000, 600),
  mouseMove(178_000, [{ x: 640, y: 300 }]),
  viewportResize(180_000, 1280, 720),
  scroll(184_000, 0),
  mouseMove(188_000, [{ x: 640, y: 360 }]),
  mouseMove(192_000, [{ x: 640, y: 300 }]),
];
