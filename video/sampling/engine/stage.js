/* The Flow Show - stage engine.
   Loaded after timeline.js. Builds the stage chrome and the cast, then drives everything from seek(t).
   Episode code registers scene renderers with Stage.scene(id, fn) and finishes with Stage.start(). */
const $ = (s, r = document) => r.querySelector(s);
const $$ = (s, r = document) => [...r.querySelectorAll(s)];
const clamp01 = x => Math.max(0, Math.min(1, x));
const easeOut = x => 1 - Math.pow(1 - x, 3);
const easeInOut = x => x < 0.5 ? 4 * x * x * x : 1 - Math.pow(-2 * x + 2, 3) / 2;
const backOut = x => { const c = 1.7; return 1 + (c + 1) * Math.pow(x - 1, 3) + c * Math.pow(x - 1, 2); };
const prog = (lt, at, d = 0.55) => clamp01((lt - at) / d);

const ICONS = {
  bolt: '<path d="M13 2 4 14h7l-1 8 10-13h-7z"/>',
  chat: '<path d="M4 4h16v12H9l-5 4z"/>',
  ticket: '<path d="M3 7h18v3a2 2 0 0 0 0 4v3H3v-3a2 2 0 0 0 0-4z"/>',
  braces: '<path d="M9 3H8C6 3 6 5 6 7v2c0 1-1 3-3 3 2 0 3 2 3 3v2c0 2 0 4 2 4h1v-2H8c-1 0 0-2 0-3v-2c0-1-1-2-2-2 1 0 2-1 2-2V7c0-1-1-2 0-2h1zM15 3h1c2 0 2 2 2 4v2c0 1 1 3 3 3-2 0-3 2-3 3v2c0 2 0 4-2 4h-1v-2h1c1 0 0-2 0-3v-2c0-1 1-2 2-2-1 0-2-1-2-2V7c0-1 1-2 0-2h-1z"/>',
  spark: '<path d="m12 2 2.2 7.8L22 12l-7.8 2.2L12 22l-2.2-7.8L2 12l7.8-2.2z"/>',
  shield: '<path d="M12 2 20 5v6c0 5-4 9-8 11-4-2-8-6-8-11V5z"/>',
  plane: '<path d="M2 11 22 3l-6 18-4-8z"/>',
  doc: '<path d="M6 2h8l5 5v15H6zM14 2v5h5"/>',
  check: '<path d="M9 16.2 4.8 12l-1.4 1.4L9 19 21 7l-1.4-1.4z"/>',
  undo: '<path d="M12 5V1L6 6l6 5V7a6 6 0 1 1-6 6H4a8 8 0 1 0 8-8z"/>',
  clock: '<path d="M12 2a10 10 0 1 0 0 20 10 10 0 0 0 0-20zm1 11h-5v-2h3V6h2z"/>',
  search: '<path d="M10 2a8 8 0 0 1 6.3 12.9l5.4 5.4-1.4 1.4-5.4-5.4A8 8 0 1 1 10 2zm0 2a6 6 0 1 0 0 12 6 6 0 0 0 0-12z"/>',
  stop: '<path d="M12 2a10 10 0 1 0 0 20 10 10 0 0 0 0-20zM5 12a7 7 0 0 1 11.3-5.5l-9.8 9.8A7 7 0 0 1 5 12zm7 7a7 7 0 0 1-4.3-1.5l9.8-9.8A7 7 0 0 1 12 19z"/>',
  user: '<path d="M12 12a5 5 0 1 0 0-10 5 5 0 0 0 0 10zm0 2c-5 0-9 2.5-9 6v2h18v-2c0-3.5-4-6-9-6z"/>',
  lock: '<path d="M6 10V7a6 6 0 1 1 12 0v3h1v12H5V10zm2 0h8V7a4 4 0 1 0-8 0z"/>',
  trace: '<path d="M3 5h8v3H3zm5 5.5h8v3H8zM13 16h8v3h-8z"/>',
  code: '<path d="m8 6-6 6 6 6 1.4-1.4L4.8 12l4.6-4.6zm8 0-1.4 1.4 4.6 4.6-4.6 4.6L16 18l6-6z"/>',
  rocket: '<path d="M12 2c4 2 6 6 6 11l3 3-4 2-2-3H9l-2 3-4-2 3-3c0-5 2-9 6-11zm0 6a2 2 0 1 0 0 4 2 2 0 0 0 0-4z"/>',
  gear: '<path d="M12 8a4 4 0 1 0 0 8 4 4 0 0 0 0-8zm9 5v-2l-2.2-.4a7 7 0 0 0-.7-1.7l1.3-1.8-1.4-1.4-1.8 1.3a7 7 0 0 0-1.7-.7L14 3h-2l-.4 2.2a7 7 0 0 0-1.7.7L8.1 4.6 6.7 6l1.3 1.8a7 7 0 0 0-.7 1.7L5 11v2l2.2.4c.2.6.4 1.2.7 1.7l-1.3 1.8L8 18.3l1.8-1.3c.5.3 1.1.5 1.7.7L12 21h2l.4-2.2c.6-.2 1.2-.4 1.7-.7l1.8 1.3 1.4-1.4-1.3-1.8c.3-.5.5-1.1.7-1.7z"/>',
  play: '<path d="M6 3v18l15-9z"/>',
  bug: '<path d="M12 2a4 4 0 0 1 4 4h-8a4 4 0 0 1 4-4zM7 8h10v2h3v2h-3v2h3v2h-3a5 5 0 0 1-10 0H4v-2h3v-2H4v-2h3z"/>',
};
const icon = name => `<svg viewBox="0 0 24 24">${ICONS[name] || ICONS.spark}</svg>`;

/* ---------- the cast ---------- */
function blink(t, offset) {
  return (t + offset) % 3.9 < 0.13 ? 0.1 : 1;
}
const CAST = {
  MAX: {
    tag: 'MAX &middot; THE MAESTRO', color: 'var(--orange)', flip: true,
    svg: `<svg viewBox="0 0 320 420">
      <ellipse id="maxGlow" cx="150" cy="408" rx="130" ry="16" fill="#fa4616" opacity="0.25"/>
      <g id="maxBody">
        <path d="M58 300 Q150 258 242 300 L270 420 L30 420 Z" fill="#17223f"/>
        <path d="M124 280 L150 420 L94 302 Z" fill="#0d1630"/>
        <path d="M176 280 L150 420 L206 302 Z" fill="#0d1630"/>
        <path d="M127 278 L173 278 L150 420 Z" fill="#f5f2ea"/>
        <circle cx="150" cy="336" r="3.5" fill="#17223f"/><circle cx="150" cy="366" r="3.5" fill="#17223f"/>
        <rect x="136" y="236" width="28" height="40" fill="#e8b087"/>
        <path d="M150 288 L122 272 L122 304 Z" fill="#fa4616"/>
        <path d="M150 288 L178 272 L178 304 Z" fill="#fa4616"/>
        <circle cx="150" cy="288" r="7" fill="#d23a0f"/>
        <circle cx="60" cy="384" r="14" fill="#f6cba5"/>
        <g id="maxHead">
          <g fill="#d8dde4">
            <circle cx="92" cy="152" r="26"/><circle cx="208" cy="150" r="26"/>
            <circle cx="95" cy="192" r="20"/><circle cx="205" cy="192" r="20"/>
            <circle cx="112" cy="114" r="28"/><circle cx="152" cy="100" r="32"/>
            <circle cx="194" cy="110" r="30"/><circle cx="226" cy="124" r="22"/>
          </g>
          <circle cx="90" cy="186" r="13" fill="#f0bf98"/><circle cx="210" cy="186" r="13" fill="#f0bf98"/>
          <ellipse cx="150" cy="182" rx="58" ry="64" fill="#f6cba5"/>
          <path d="M100 142 Q122 96 172 102 Q216 108 212 150 Q190 122 160 130 Q130 122 100 142 Z" fill="#eceff3"/>
          <path d="M112 160 Q126 150 140 158" stroke="#9aa3ad" stroke-width="7" stroke-linecap="round" fill="none"/>
          <path d="M160 158 Q174 150 188 160" stroke="#9aa3ad" stroke-width="7" stroke-linecap="round" fill="none"/>
          <g id="maxEyes">
            <ellipse cx="127" cy="180" rx="11" ry="12" fill="#fff"/><ellipse cx="173" cy="180" rx="11" ry="12" fill="#fff"/>
            <circle cx="129" cy="181" r="5.5" fill="#1b2433"/><circle cx="175" cy="181" r="5.5" fill="#1b2433"/>
          </g>
          <circle cx="110" cy="206" r="10" fill="#f29c9c" opacity="0.6"/><circle cx="190" cy="206" r="10" fill="#f29c9c" opacity="0.6"/>
          <ellipse cx="150" cy="198" rx="7" ry="9" fill="#e9ad86"/>
          <ellipse id="maxMouth" cx="150" cy="228" rx="10" ry="2" fill="#7a2b22"/>
          <path d="M122 214 Q138 204 150 212 Q162 204 178 214 Q164 223 150 217 Q136 223 122 214 Z" fill="#cfd5dc"/>
        </g>
        <g id="maxArm">
          <path d="M226 302 Q262 282 272 240" stroke="#17223f" stroke-width="28" stroke-linecap="round" fill="none"/>
          <circle cx="274" cy="236" r="14" fill="#f6cba5"/>
          <line x1="277" y1="228" x2="300" y2="146" stroke="#f5f2ea" stroke-width="5" stroke-linecap="round"/>
          <circle cx="300" cy="146" r="4.5" fill="#1fd6a0"/>
        </g>
      </g>
    </svg>`,
    animate(t, talking, env) {
      $('#maxMouth').setAttribute('ry', 2 + 13 * env);
      $('#maxMouth').setAttribute('rx', 10 - 2 * env);
      const arm = talking ? Math.sin(t * 5.2) * 9 - 4 : Math.sin(t * 1.3) * 2;
      $('#maxArm').setAttribute('transform', `rotate(${arm} 226 302)`);
      $('#maxHead').setAttribute('transform', `rotate(${Math.sin(t * 1.1) * 2 + (talking ? Math.sin(t * 3.1) * 1.5 : 0)} 150 240)`);
      $('#maxBody').setAttribute('transform', `translate(0 ${Math.sin(t * 1.6) * 2})`);
      const b = blink(t, 0.4);
      $('#maxEyes').setAttribute('transform', `translate(0 ${180 * (1 - b)}) scale(1 ${b})`);
      $('#maxGlow').setAttribute('opacity', talking ? 0.55 : 0.2);
    },
  },
  FLO: {
    tag: 'FLO &middot; THE FLOW', color: 'var(--teal)', flip: false,
    svg: `<svg viewBox="0 0 320 420">
      <ellipse id="floGlow" cx="160" cy="408" rx="120" ry="16" fill="#1fd6a0" opacity="0.25"/>
      <g id="floBody">
        <line x1="160" y1="80" x2="160" y2="42" stroke="#0f8a6a" stroke-width="6"/>
        <circle id="floLight" cx="160" cy="36" r="11" fill="#ff5a3c"/>
        <path d="M58 196 Q30 196 30 222 Q30 248 58 248" stroke="#1fd6a0" stroke-width="11" stroke-linecap="round" fill="none"/>
        <path d="M262 196 Q290 196 290 222 Q290 248 262 248" stroke="#1fd6a0" stroke-width="11" stroke-linecap="round" fill="none"/>
        <rect x="44" y="204" width="16" height="36" rx="6" fill="#129b77"/>
        <rect x="260" y="204" width="16" height="36" rx="6" fill="#129b77"/>
        <rect x="96" y="326" width="42" height="24" rx="7" fill="#129b77"/>
        <rect x="182" y="326" width="42" height="24" rx="7" fill="#129b77"/>
        <rect x="60" y="80" width="200" height="252" rx="42" fill="#22d8a3" stroke="#13a57f" stroke-width="4"/>
        <rect x="84" y="106" width="152" height="114" rx="26" fill="#0b2a31"/>
        <rect id="floEyeL" x="118" y="140" width="22" height="28" rx="9" fill="#72f3cf"/>
        <rect id="floEyeR" x="180" y="140" width="22" height="28" rx="9" fill="#72f3cf"/>
        <rect id="floMouth" x="146" y="188" width="28" height="6" rx="3" fill="#72f3cf"/>
        <rect x="108" y="244" width="104" height="42" rx="11" fill="#0b2a31"/>
        <text x="160" y="272" text-anchor="middle" font-family="Cascadia Mono, Consolas, monospace" font-size="21" fill="#72f3cf">.flow</text>
      </g>
    </svg>`,
    animate(t, talking, env) {
      const mh = 6 + 18 * env;
      $('#floMouth').setAttribute('height', mh);
      $('#floMouth').setAttribute('y', 191 - mh / 2);
      $('#floMouth').setAttribute('width', 28 + 10 * env);
      $('#floMouth').setAttribute('x', 146 - 5 * env);
      const eb = blink(t, 2.1);
      ['#floEyeL', '#floEyeR'].forEach(id => {
        $(id).setAttribute('height', 28 * eb);
        $(id).setAttribute('y', 140 + 14 * (1 - eb));
      });
      const bob = talking ? Math.sin(t * 6) * 4 : Math.sin(t * 2) * 3;
      $('#floBody').setAttribute('transform', `translate(0 ${bob})`);
      $('#floLight').setAttribute('opacity', 0.55 + 0.45 * Math.abs(Math.sin(t * (talking ? 8 : 2))));
      $('#floGlow').setAttribute('opacity', talking ? 0.55 : 0.2);
    },
  },
  DANIELA: {
    tag: 'DANIELA &middot; THE DEV', color: 'var(--purple)', flip: true,
    svg: `<svg viewBox="0 0 320 420">
      <ellipse id="danGlow" cx="160" cy="408" rx="125" ry="16" fill="#9b6bff" opacity="0.25"/>
      <g id="danBody">
        <path class="dt" d="M64 314 Q160 268 256 314 L278 420 L42 420 Z"/>
        <path class="dss" d="M142 284 L178 284 L160 322 Z"/>
        <g id="danHead">
          <path class="dh" d="M160 86 Q234 88 234 172 L242 294 Q222 308 198 300 L198 276 L122 276 L122 300 Q98 308 78 294 L86 172 Q86 88 160 86 Z"/>
          <path d="M94 196 Q88 246 92 290" style="stroke:var(--dani-hair-light)" stroke-width="5" stroke-linecap="round" fill="none" opacity="0.55"/>
          <path d="M226 196 Q232 246 228 290" style="stroke:var(--dani-hair-light)" stroke-width="5" stroke-linecap="round" fill="none" opacity="0.55"/>
          <rect class="dss" x="146" y="234" width="28" height="52" rx="5"/>
          <path class="ds" d="M108 178 Q108 122 160 122 Q212 122 212 178 Q212 220 188 241 Q160 257 132 241 Q108 220 108 178 Z"/>
          <path class="dh" d="M100 214 Q90 110 160 102 Q230 110 220 214 Q216 162 194 138 Q180 124 168 120 Q150 126 132 142 Q108 166 100 214 Z"/>
          <path d="M168 120 Q148 112 126 126" style="stroke:var(--dani-hair-light)" stroke-width="4" stroke-linecap="round" fill="none" opacity="0.6"/>
          <path d="M125 167 Q137 160 149 165" style="stroke:var(--dani-hair)" stroke-width="4" stroke-linecap="round" fill="none"/>
          <path d="M171 165 Q183 160 195 167" style="stroke:var(--dani-hair)" stroke-width="4" stroke-linecap="round" fill="none"/>
          <g id="danEyes">
            <ellipse cx="137" cy="187" rx="10.5" ry="11" fill="#fff"/><ellipse cx="183" cy="187" rx="10.5" ry="11" fill="#fff"/>
            <circle cx="138" cy="188" r="7" style="fill:var(--dani-eyes)"/><circle cx="184" cy="188" r="7" style="fill:var(--dani-eyes)"/>
            <circle cx="138" cy="188" r="3.4" fill="#1b1420"/><circle cx="184" cy="188" r="3.4" fill="#1b1420"/>
            <circle cx="141" cy="185" r="2.2" fill="#fff"/><circle cx="187" cy="185" r="2.2" fill="#fff"/>
            <path d="M124 183 Q137 172 151 183" stroke="#2a1a14" stroke-width="3.5" stroke-linecap="round" fill="none"/>
            <path d="M169 183 Q183 172 197 183" stroke="#2a1a14" stroke-width="3.5" stroke-linecap="round" fill="none"/>
          </g>
          <circle cx="121" cy="210" r="10" fill="#f29c9c" opacity="0.5"/><circle cx="199" cy="210" r="10" fill="#f29c9c" opacity="0.5"/>
          <path d="M160 198 Q155 208 162 210" style="stroke:var(--dani-skin-shade)" stroke-width="3.5" stroke-linecap="round" fill="none"/>
          <circle cx="167" cy="208" r="2.4" fill="#e8eef5" stroke="#8b96a6" stroke-width="0.8"/>
          <path d="M144 223 Q160 236 176 223" stroke="#b5475a" stroke-width="4" stroke-linecap="round" fill="none"/>
          <ellipse id="danMouth" cx="160" cy="228" rx="9" ry="0" fill="#7a2434"/>
        </g>
        <path class="dtd" d="M126 282 L160 322 L138 338 L112 302 Z"/>
        <path class="dtd" d="M194 282 L160 322 L182 338 L208 302 Z"/>
        <line x1="160" y1="324" x2="160" y2="358" style="stroke:var(--dani-top-dark)" stroke-width="3"/>
        <circle cx="160" cy="340" r="3" style="fill:var(--dani-top-dark)"/>
        <rect x="88" y="358" width="144" height="62" rx="9" fill="#1b2740" stroke="#9aabc4" stroke-width="3"/>
        <circle id="danLight" cx="160" cy="390" r="10" fill="#1fd6a0"/>
        <circle class="ds" cx="88" cy="384" r="13"/>
        <g id="danArm">
          <path d="M236 314 Q268 296 276 256" style="stroke:var(--dani-top)" stroke-width="26" stroke-linecap="round" fill="none"/>
          <circle class="ds" cx="278" cy="250" r="13"/>
        </g>
      </g>
    </svg>`,
    animate(t, talking, env) {
      $('#danMouth').setAttribute('ry', 13 * env);
      $('#danMouth').setAttribute('rx', 9 - 2 * env);
      const arm = talking ? Math.sin(t * 4.6) * 10 - 6 : Math.sin(t * 1.2 + 2) * 2;
      $('#danArm').setAttribute('transform', `rotate(${arm} 236 314)`);
      $('#danHead').setAttribute('transform', `rotate(${Math.sin(t * 1.0 + 1) * 2 + (talking ? Math.sin(t * 2.8) * 1.5 : 0)} 160 250)`);
      $('#danBody').setAttribute('transform', `translate(0 ${Math.sin(t * 1.5 + 0.8) * 2})`);
      const b = blink(t, 1.3);
      $('#danEyes').setAttribute('transform', `translate(0 ${187 * (1 - b)}) scale(1 ${b})`);
      $('#danLight').setAttribute('opacity', 0.6 + 0.4 * Math.abs(Math.sin(t * (talking ? 5 : 1.5))));
      $('#danGlow').setAttribute('opacity', talking ? 0.55 : 0.2);
    },
  },
  /* The Residual Stream series (danielarosenn.github.io/residual-stream): Toki asks, Vera explains.
     Colours are that site's palette: green #158864, dark green #182D2A, mint #81E5AC, light #DEF6EF, yellow #F5C13D. */
  TOKI: {
    tag: 'TOKI &middot; THE TOKEN', color: '#81E5AC', flip: false,
    svg: `<svg viewBox="0 0 320 420">
      <ellipse id="tokiGlow" cx="160" cy="408" rx="112" ry="15" fill="#81E5AC" opacity="0.25"/>
      <g id="tokiBody">
        <rect x="104" y="366" width="42" height="26" rx="12" fill="#0D483D"/>
        <rect x="174" y="366" width="42" height="26" rx="12" fill="#0D483D"/>
        <g id="tokiArmL">
          <path d="M72 300 Q42 292 38 258" stroke="#158864" stroke-width="15" stroke-linecap="round" fill="none"/>
          <circle cx="38" cy="252" r="12" fill="#81E5AC"/>
        </g>
        <g id="tokiArmR">
          <path d="M248 300 Q278 306 284 334" stroke="#158864" stroke-width="15" stroke-linecap="round" fill="none"/>
          <circle cx="285" cy="340" r="12" fill="#81E5AC"/>
        </g>
        <g id="tokiHead">
          <path d="M160 182 Q154 150 174 134" stroke="#81E5AC" stroke-width="6" stroke-linecap="round" fill="none"/>
          <circle id="tokiBulb" cx="177" cy="129" r="11" fill="#F5C13D"/>
          <rect x="62" y="190" width="196" height="184" rx="46" fill="#0D483D"/>
          <rect x="62" y="178" width="196" height="184" rx="46" fill="#158864" stroke="#81E5AC" stroke-width="5"/>
          <rect x="86" y="194" width="148" height="34" rx="17" fill="#DEF6EF" opacity="0.16"/>
          <g id="tokiEyes">
            <ellipse cx="128" cy="262" rx="18" ry="20" fill="#fff"/><ellipse cx="192" cy="262" rx="18" ry="20" fill="#fff"/>
            <circle cx="131" cy="265" r="9.5" fill="#182D2A"/><circle cx="195" cy="265" r="9.5" fill="#182D2A"/>
            <circle cx="135" cy="260" r="3.4" fill="#fff"/><circle cx="199" cy="260" r="3.4" fill="#fff"/>
          </g>
          <path d="M108 232 Q122 224 138 230" stroke="#0D483D" stroke-width="5" stroke-linecap="round" fill="none"/>
          <path d="M182 228 Q198 220 212 230" stroke="#0D483D" stroke-width="5" stroke-linecap="round" fill="none"/>
          <circle cx="100" cy="296" r="11" fill="#F5C13D" opacity="0.45"/><circle cx="220" cy="296" r="11" fill="#F5C13D" opacity="0.45"/>
          <path d="M146 300 Q160 310 174 300" stroke="#182D2A" stroke-width="4" stroke-linecap="round" fill="none"/>
          <ellipse id="tokiMouth" cx="160" cy="306" rx="11" ry="0" fill="#182D2A"/>
          <rect x="128" y="328" width="64" height="24" rx="8" fill="#0D483D"/>
          <text x="160" y="346" text-anchor="middle" font-family="Cascadia Mono, Consolas, monospace" font-size="17" fill="#81E5AC">tok</text>
        </g>
      </g>
    </svg>`,
    animate(t, talking, env) {
      $('#tokiMouth').setAttribute('ry', 12 * env);
      $('#tokiMouth').setAttribute('rx', 11 - 2 * env);
      const hop = talking ? Math.abs(Math.sin(t * 5.5)) * -6 : Math.sin(t * 2.2) * 2.5;
      $('#tokiBody').setAttribute('transform', `translate(0 ${hop})`);
      /* head tilt: the curious cock of the head, a bit more while he is talking */
      $('#tokiHead').setAttribute('transform', `rotate(${Math.sin(t * 0.9) * 3 + (talking ? Math.sin(t * 3.3) * 2 : 0)} 160 360)`);
      $('#tokiArmL').setAttribute('transform', `rotate(${talking ? Math.sin(t * 5) * 12 - 6 : Math.sin(t * 1.4) * 3} 72 300)`);
      $('#tokiArmR').setAttribute('transform', `rotate(${Math.sin(t * 1.2 + 1) * 3} 248 300)`);
      const b = blink(t, 2.7);
      $('#tokiEyes').setAttribute('transform', `translate(0 ${262 * (1 - b)}) scale(1 ${b})`);
      $('#tokiBulb').setAttribute('opacity', 0.6 + 0.4 * Math.abs(Math.sin(t * (talking ? 7 : 1.8))));
      $('#tokiGlow').setAttribute('opacity', talking ? 0.55 : 0.2);
    },
  },
  VERA: {
    tag: 'VERA &middot; THE GUIDE', color: '#F5C13D', flip: true,
    svg: `<svg viewBox="0 0 320 420">
      <ellipse id="veraGlow" cx="160" cy="408" rx="122" ry="16" fill="#F5C13D" opacity="0.25"/>
      <g id="veraBody">
        <g id="veraArmL">
          <path d="M84 232 Q52 262 56 310" stroke="#158864" stroke-width="16" stroke-linecap="round" fill="none"/>
          <circle cx="56" cy="316" r="13" fill="#DEF6EF"/>
        </g>
        <rect x="78" y="358" width="164" height="38" rx="15" fill="#0D483D" stroke="#81E5AC" stroke-width="3"/>
        <rect x="82" y="314" width="156" height="38" rx="15" fill="#158864" stroke="#81E5AC" stroke-width="3"/>
        <rect x="86" y="270" width="148" height="38" rx="15" fill="#0D483D" stroke="#81E5AC" stroke-width="3"/>
        <rect x="90" y="226" width="140" height="38" rx="15" fill="#158864" stroke="#81E5AC" stroke-width="3"/>
        <rect id="veraG0" x="78" y="358" width="164" height="38" rx="15" fill="#81E5AC" opacity="0"/>
        <rect id="veraG1" x="82" y="314" width="156" height="38" rx="15" fill="#81E5AC" opacity="0"/>
        <rect id="veraG2" x="86" y="270" width="148" height="38" rx="15" fill="#81E5AC" opacity="0"/>
        <rect id="veraG3" x="90" y="226" width="140" height="38" rx="15" fill="#81E5AC" opacity="0"/>
        <rect x="149" y="214" width="22" height="182" rx="11" fill="#182D2A" opacity="0.7"/>
        <line id="veraStream" x1="160" y1="390" x2="160" y2="220" stroke="#F5C13D" stroke-width="8" stroke-linecap="round" stroke-dasharray="14 12"/>
        <g id="veraArmR">
          <path d="M236 232 Q272 214 278 176" stroke="#158864" stroke-width="16" stroke-linecap="round" fill="none"/>
          <circle cx="279" cy="170" r="13" fill="#DEF6EF"/>
        </g>
        <g id="veraHead">
          <path d="M160 26 L192 66 L174 66 L174 84 L146 84 L146 66 L128 66 Z" fill="#F5C13D"/>
          <rect x="98" y="76" width="124" height="130" rx="56" fill="#DEF6EF" stroke="#81E5AC" stroke-width="4"/>
          <path d="M100 136 Q100 80 160 78 Q220 80 220 136 Q206 104 160 102 Q114 104 100 136 Z" fill="#158864"/>
          <g id="veraEyes">
            <ellipse cx="138" cy="146" rx="8.5" ry="9.5" fill="#182D2A"/><ellipse cx="182" cy="146" rx="8.5" ry="9.5" fill="#182D2A"/>
            <circle cx="141" cy="143" r="2.6" fill="#fff"/><circle cx="185" cy="143" r="2.6" fill="#fff"/>
          </g>
          <circle cx="138" cy="146" r="17" stroke="#0D483D" stroke-width="3.5" fill="none"/>
          <circle cx="182" cy="146" r="17" stroke="#0D483D" stroke-width="3.5" fill="none"/>
          <line x1="155" y1="146" x2="165" y2="146" stroke="#0D483D" stroke-width="3.5"/>
          <circle cx="120" cy="174" r="9" fill="#F5C13D" opacity="0.4"/><circle cx="200" cy="174" r="9" fill="#F5C13D" opacity="0.4"/>
          <path d="M148 178 Q160 188 172 178" stroke="#0D483D" stroke-width="3.5" stroke-linecap="round" fill="none"/>
          <ellipse id="veraMouth" cx="160" cy="183" rx="9" ry="0" fill="#0D483D"/>
        </g>
        <rect x="150" y="204" width="20" height="22" fill="#DEF6EF"/>
      </g>
    </svg>`,
    animate(t, talking, env) {
      $('#veraMouth').setAttribute('ry', 11 * env);
      $('#veraMouth').setAttribute('rx', 9 - 2 * env);
      /* the residual stream: dashes flow upward through the layers, faster while she talks */
      $('#veraStream').setAttribute('stroke-dashoffset', -t * (talking ? 46 : 22));
      for (let i = 0; i < 4; i++) {
        const w = Math.pow(Math.max(0, Math.sin(t * 2.2 - i * 0.9)), 6);
        $('#veraG' + i).setAttribute('opacity', (talking ? 0.32 : 0.14) * w);
      }
      $('#veraArmR').setAttribute('transform', `rotate(${talking ? Math.sin(t * 4.2) * 9 - 4 : Math.sin(t * 1.1) * 2} 236 232)`);
      $('#veraArmL').setAttribute('transform', `rotate(${Math.sin(t * 1.3 + 2) * 2} 84 232)`);
      $('#veraHead').setAttribute('transform', `rotate(${Math.sin(t * 0.8 + 1) * 1.6 + (talking ? Math.sin(t * 2.6) * 1.2 : 0)} 160 210)`);
      $('#veraBody').setAttribute('transform', `translate(0 ${Math.sin(t * 1.4 + 0.5) * 2})`);
      const b = blink(t, 0.9);
      $('#veraEyes').setAttribute('transform', `translate(0 ${146 * (1 - b)}) scale(1 ${b})`);
      $('#veraGlow').setAttribute('opacity', talking ? 0.55 : 0.2);
    },
  },
};

/* Slots are the x of a 300px-wide character. L and R are the home spots; L2 / R2 hold a third character. */
const SLOTS = { L: 26, L2: 316, R2: 1304, R: 1594 };
const DEFAULT_CAST = { L: 'MAX', R: 'FLO' };
const slotOf = (s, key) => Object.keys(s.cast).find(slot => s.cast[slot] === key) || null;

/* ---------- helpers for scene renderers ---------- */
function reveal(el, k, pop) {
  el.style.opacity = clamp01(k * 1.4);
  if (pop) el.style.transform = `${el.dataset.base || ''} scale(${0.82 + 0.18 * backOut(k)})`;
  else el.style.transform = `translateY(${(1 - easeOut(k)) * 22}px)`;
}
/* scene-local time of line i, plus fraction f of that line's duration */
const at = (s, i, f = 0) => s.L[i] + f * s.D[i];
function typeText(el, text, lt, t0, t1) {
  const n = Math.round(text.length * clamp01((lt - t0) / Math.max(0.1, t1 - t0)));
  el.innerHTML = text.slice(0, n) + (n > 0 && n < text.length ? '<span class="caret"></span>' : '');
}
/* Type several lines in turn, e.g. a terminal. lines: [text, t0, t1, cssClass?], times scene-local. */
function typeLines(el, lines, lt) {
  el.innerHTML = lines.map(([text, t0, t1, cls]) => {
    const n = Math.round(text.length * clamp01((lt - t0) / Math.max(0.1, t1 - t0)));
    return n ? `<div${cls ? ` class="${cls}"` : ''}>${text.slice(0, n)}</div>` : '';
  }).join('');
}
function countTo(el, value, lt, t0, dur = 1.2, fmt = v => Math.round(v)) {
  el.textContent = fmt(value * easeInOut(clamp01((lt - t0) / dur)));
}
/* camera over a 1920x1080 screenshot: keys are [t, cx, cy, zoom] in screenshot pixels */
function camAt(keys, lt) {
  if (lt <= keys[0][0]) return keys[0].slice(1);
  for (let i = 0; i < keys.length - 1; i++) {
    const [t0, ...a] = keys[i], [t1, ...b] = keys[i + 1];
    if (lt < t1) {
      const k = easeInOut(clamp01((lt - t0) / Math.max(0.01, t1 - t0)));
      return a.map((v, j) => v + (b[j] - v) * k);
    }
  }
  return keys[keys.length - 1].slice(1);
}
function setCam(el, keys, lt) {
  const W = el.parentElement.clientWidth, H = el.parentElement.clientHeight;
  const [cx, cy, z] = camAt(keys, lt);
  const k = (W / 1920) * z;
  el.style.transform = `translate(${W / 2 - cx * k}px, ${H / 2 - cy * k}px) scale(${k})`;
}
/* A row of connected boxes. items: [label, icon, '--color', sub?, kicker?]; with a sub it renders step cards. */
function buildChain(box, id, items, o = {}) {
  const cardy = items.some(it => it[3]);
  const w = o.w || (cardy ? 250 : 188), gap = o.gap || (cardy ? 28 : 30), y = o.y || (cardy ? 180 : 300);
  const h = o.h || (cardy ? 200 : 88);
  const x0 = o.x0 ?? (1920 - (items.length * w + (items.length - 1) * gap)) / 2;
  items.forEach(([label, ic, c, sub, kick], i) => {
    const x = x0 + i * (w + gap);
    if (i) box.insertAdjacentHTML('beforeend',
      `<div class="conn" id="${id}_c${i}" style="left:${x - gap}px; top:${y + h / 2 - 2}px; width:${gap}px"><i></i></div>`);
    const pos = `left:${x}px; top:${y}px; width:${w}px; height:${h}px; border-color:var(${c})`;
    const ico = `<span class="ico" style="color:var(${c})">${icon(ic)}</span>`;
    box.insertAdjacentHTML('beforeend', cardy
      ? `<div class="card step" id="${id}_n${i}" style="${pos}"><div class="k">${kick || String(i + 1).padStart(2, '0')}</div>
          <div class="h">${ico}${label}</div><div class="s">${sub || ''}</div></div>`
      : `<div class="node" id="${id}_n${i}" style="${pos}">${ico}${label}</div>`);
  });
}
/* Light the chain up box by box: times[i] is the scene-local second box i switches on. */
function runChain(id, items, times, lt) {
  items.forEach(([, , c], i) => {
    const el = $(`#${id}_n${i}`);
    reveal(el, prog(lt, times[i] - 0.3, 0.45), true);
    const active = lt >= times[i] && lt < (i + 1 < times.length ? times[i + 1] : Infinity);
    el.style.boxShadow = active ? `0 0 34px color-mix(in srgb, var(${c}) 55%, transparent)` : '';
    if (i) $(`#${id}_c${i} i`).style.width = `${100 * prog(lt, times[i] - 0.35, 0.35)}%`;
  });
}

/* ---------- stage ---------- */
const Stage = (() => {
  const R = {};
  const stage = $('#stage');
  stage.insertAdjacentHTML('afterbegin',
    `<canvas id="dust" width="1920" height="1080"></canvas><div class="spot l" id="spotL"></div>
     <div class="spot r" id="spotR"></div><div class="spot c" id="spotC"></div><div class="floor"></div>
     <div class="brand" id="brand"></div>`);
  $$('[data-ico]').forEach(el => { el.innerHTML = icon(el.dataset.ico); });

  function parseAt(str, s) {
    const m = /^L(\d+)(?:@([\d.]+))?([+-][\d.]+)?$/.exec(str);
    if (!m) return +str;
    const i = +m[1];
    if (i >= s.L.length) throw new Error(`data-at="${str}" in scene ${s.id}: that scene only has ${s.L.length} lines`);
    return s.L[i] + (m[2] ? +m[2] * s.D[i] : 0) + (m[3] ? +m[3] : 0);
  }
  function prepare() {
    $('#brand').innerHTML = TL.brand || '';
    const keys = new Set();
    TL.scenes.forEach(s => {
      s.el = document.getElementById(s.id);
      if (!s.el) throw new Error(`script.json scene "${s.id}" has no <section class="scene" id="${s.id}"> in episode.html`);
      s.L = s.lines.map(l => l.start - s.start);
      s.D = s.lines.map(l => l.end - l.start);
      s.dur = s.end - s.start;
      s.cast = s.cast || TL.cast || DEFAULT_CAST;
      Object.values(s.cast).forEach(k => keys.add(k));
      s.lines.forEach(l => {
        if (!slotOf(s, l.who)) throw new Error(`${l.who} speaks in scene ${s.id} but is not in that scene's cast`);
      });
      s.items = $$('[data-at]', s.el).map(el => ({ el, at: parseAt(el.dataset.at, s), pop: el.hasAttribute('data-pop') }));
    });
    keys.forEach(k => {
      if (!CAST[k]) throw new Error(`Unknown character "${k}" (known: ${Object.keys(CAST).join(', ')})`);
      stage.insertAdjacentHTML('beforeend',
        `<div class="char" id="char_${k}">${CAST[k].svg}<div class="tag" style="color:${CAST[k].color}">${CAST[k].tag}</div></div>`);
    });
    stage.insertAdjacentHTML('beforeend', '<div id="cap"></div>');
    Stage.keys = [...keys];
  }

  function sceneIndexAt(t) {
    const i = TL.scenes.findIndex(s => t >= s.start && t <= s.end);
    return i < 0 ? TL.scenes.length - 1 : i;
  }
  function renderChars(t) {
    const i = sceneIndexAt(t), s = TL.scenes[i], lt = t - s.start;
    const prev = TL.scenes[i - 1], next = TL.scenes[i + 1];
    let line = null, cur = null;
    for (const l of s.lines) {
      if (t >= l.start && t < l.end) line = l;
      if (t >= l.start - 0.05) cur = l;
    }
    const env = line ? (line.env[Math.floor((t - line.start) * TL.fps)] || 0) : 0;
    for (const key of Stage.keys) {
      const el = $('#char_' + key), c = CAST[key], slot = slotOf(s, key);
      const talking = !!line && line.who === key;
      c.animate(t, talking, talking ? env : 0);
      if (!slot) { el.style.opacity = 0; continue; }
      const kin = !prev || slotOf(prev, key) === slot ? 1 : easeOut(clamp01(lt / 0.5));
      const kout = next && slotOf(next, key) !== slot ? clamp01((s.dur - lt) / 0.35) : 1;
      el.style.left = SLOTS[slot] + 'px';
      el.style.opacity = Math.min(kin, kout);
      el.style.transform = `translateY(${(1 - kin) * 40}px)`;
      $('svg', el).style.transform = c.flip && slot[0] === 'R' ? 'scaleX(-1)' : '';
    }
    const cap = $('#cap');
    cap.style.left = (s.cast.L2 ? 640 : 440) + 'px';
    cap.style.right = (s.cast.R2 ? 640 : 440) + 'px';
    if (cur && t < s.end - 0.25) {
      const color = CAST[cur.who].color;
      const html = `<b style="color:${color}">${cur.who}</b>${cur.text}`;
      if (cap.dataset.h !== html) { cap.innerHTML = html; cap.dataset.h = html; }
      cap.style.borderColor = color;
      const k = clamp01((t - cur.start + 0.05) / 0.2);
      cap.style.opacity = Math.min(k, clamp01((s.end - 0.25 - t) / 0.2));
      cap.style.transform = `translateY(${(1 - k) * 8}px)`;
    } else {
      cap.style.opacity = 0;
    }
  }

  let seed = 11;
  const rnd = () => (seed = (seed * 16807) % 2147483647) / 2147483647;
  const DUST = Array.from({ length: 90 }, () => ({
    x: rnd() * 1920, y: rnd() * 1080, r: 1 + rnd() * 2.2, vy: -4 - rnd() * 10, ph: rnd() * 6.3,
    c: rnd() < 0.5 ? '31,214,160' : (rnd() < 0.5 ? '250,70,22' : '160,190,230'),
  }));
  const dctx = $('#dust').getContext('2d');
  function renderBg(t) {
    dctx.clearRect(0, 0, 1920, 1080);
    for (const p of DUST) {
      const y = ((p.y + p.vy * t) % 1080 + 1080) % 1080;
      const a = 0.12 + 0.3 * (0.5 + 0.5 * Math.sin(p.ph + t * 1.2));
      dctx.beginPath();
      dctx.arc(p.x + Math.sin(t * 0.4 + p.ph) * 12, y, p.r, 0, 6.283);
      dctx.fillStyle = `rgba(${p.c},${a})`;
      dctx.fill();
    }
    $('#spotL').style.transform = `rotate(${-14 + Math.sin(t * 0.35) * 4}deg)`;
    $('#spotR').style.transform = `rotate(${14 + Math.sin(t * 0.3 + 1) * 4}deg)`;
  }

  const FADE_IN = 0.45, FADE_OUT = 0.35, DRIFT = 0.025;
  function seek(t) {
    renderBg(t);
    Stage.spotlight(0);
    for (const s of TL.scenes) {
      const lt = t - s.start;
      if (lt < 0 || lt > s.dur) { s.el.style.opacity = 0; continue; }
      const first = s === TL.scenes[0], last = s === TL.scenes[TL.scenes.length - 1];
      s.el.style.opacity = Math.min(first ? 1 : clamp01(lt / FADE_IN), last ? 1 : clamp01((s.dur - lt) / FADE_OUT));
      /* slow push-in across the scene, so nothing sits perfectly still while the hosts talk */
      s.el.style.transform = `scale(${1 + DRIFT * easeInOut(clamp01(lt / s.dur))})`;
      for (const it of s.items) reveal(it.el, prog(lt, it.at), it.pop);
      if (R[s.id]) R[s.id](lt, s);
    }
    renderChars(t);
  }

  return {
    /* register per-frame code for a scene: fn(lt, s), lt = seconds since the scene started */
    scene(id, fn) { R[id] = fn; },
    /* warm centre spotlight, k = 0..1, x = centre of the beam in stage pixels; resets every frame */
    spotlight(k, x = 960) {
      $('#spotC').style.opacity = 0.9 * k;
      $('#spotC').style.left = (x - 280) + 'px';
    },
    start() {
      prepare();
      window.seek = seek;
      if (/render=1/.test(location.search)) { seek(0); return; }
      const fit = () => { stage.style.transform = `scale(${Math.min(innerWidth / 1920, innerHeight / 1080)})`; };
      addEventListener('resize', fit); fit();
      const t0 = performance.now();
      const loop = () => { seek(((performance.now() - t0) / 1000) % TL.total); requestAnimationFrame(loop); };
      requestAnimationFrame(loop);
    },
  };
})();
