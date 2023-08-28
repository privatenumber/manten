"use strict";Object.defineProperty(exports,"__esModule",{value:!0});var _=require("expect");let u=!0;const d=typeof self<"u"?self:typeof window<"u"?window:typeof global<"u"?global:{};let m=0;if(d.process&&d.process.env&&d.process.stdout){const{FORCE_COLOR:t,NODE_DISABLE_COLORS:e,NO_COLOR:o,TERM:c,COLORTERM:i}=d.process.env;e||o||t==="0"?u=!1:t==="1"||t==="2"||t==="3"?u=!0:c==="dumb"?u=!1:"CI"in d.process.env&&["TRAVIS","CIRCLECI","APPVEYOR","GITLAB_CI","GITHUB_ACTIONS","BUILDKITE","DRONE"].some(s=>s in d.process.env)?u=!0:u=process.stdout.isTTY,u&&(process.platform==="win32"||i&&(i==="truecolor"||i==="24bit")?m=3:c&&(c.endsWith("-256color")||c.endsWith("256"))?m=2:m=1)}let w={enabled:u,supportLevel:m};function h(t,e,o=1){const c=`\x1B[${t}m`,i=`\x1B[${e}m`,s=new RegExp(`\\x1b\\[${e}m`,"g");return n=>w.enabled&&w.supportLevel>=o?c+(""+n).replace(s,c)+i:""+n}const b=h(2,22),D=h(31,39),$=h(32,39),x=h(33,39);function P(t){if(typeof t!="number")throw new TypeError("Expected a number");const e=t>0?Math.floor:Math.ceil;return{days:e(t/864e5),hours:e(t/36e5)%24,minutes:e(t/6e4)%60,seconds:e(t/1e3)%60,milliseconds:e(t)%1e3,microseconds:e(t*1e3)%1e3,nanoseconds:e(t*1e6)%1e3}}const A=(t,e)=>e===1?t:`${t}s`,j=1e-7;function p(t,e={}){if(!Number.isFinite(t))throw new TypeError("Expected a finite number");e.colonNotation&&(e.compact=!1,e.formatSubMilliseconds=!1,e.separateMilliseconds=!1,e.verbose=!1),e.compact&&(e.secondsDecimalDigits=0,e.millisecondsDecimalDigits=0);const o=[],c=(n,r)=>{const a=Math.floor(n*10**r+j);return(Math.round(a)/10**r).toFixed(r)},i=(n,r,a,l)=>{if((o.length===0||!e.colonNotation)&&n===0&&!(e.colonNotation&&a==="m"))return;l=(l||n||"0").toString();let T,g;if(e.colonNotation){T=o.length>0?":":"",g="";const L=l.includes(".")?l.split(".")[0].length:l.length,S=o.length>0?2:1;l="0".repeat(Math.max(0,S-L))+l}else T="",g=e.verbose?" "+A(r,n):a;o.push(T+l+g)},s=P(t);if(i(Math.trunc(s.days/365),"year","y"),i(s.days%365,"day","d"),i(s.hours,"hour","h"),i(s.minutes,"minute","m"),e.separateMilliseconds||e.formatSubMilliseconds||!e.colonNotation&&t<1e3)if(i(s.seconds,"second","s"),e.formatSubMilliseconds)i(s.milliseconds,"millisecond","ms"),i(s.microseconds,"microsecond","\xB5s"),i(s.nanoseconds,"nanosecond","ns");else{const n=s.milliseconds+s.microseconds/1e3+s.nanoseconds/1e6,r=typeof e.millisecondsDecimalDigits=="number"?e.millisecondsDecimalDigits:0,a=n>=1?Math.round(n):Math.ceil(n),l=r?n.toFixed(r):a;i(Number.parseFloat(l),"millisecond","ms",l)}else{const n=t/1e3%60,r=typeof e.secondsDecimalDigits=="number"?e.secondsDecimalDigits:1,a=c(n,r),l=e.keepDecimalsOnWholeSeconds?a:a.replace(/\.0+$/,"");i(Number.parseFloat(l),"second","s",l)}if(o.length===0)return"0"+(e.verbose?" milliseconds":"ms");if(e.compact)return o[0];if(typeof e.unitCount=="number"){const n=e.colonNotation?"":" ";return o.slice(0,Math.max(e.unitCount,1)).join(n)}return e.colonNotation?o.join(""):o.join(" ")}const f=`
`,{log:F,error:y}=console,V=$("\u2714"),k=D("\u2716"),v=x("\u2022"),O=({startTime:t,timeout:e,endTime:o})=>{const c=(o||Date.now())-t;let i=p(c);return e&&(i+=` / ${p(e)}`),c<50?"":` ${b(`(${i})`)}`},B=t=>{const{title:e,error:o}=t;(o?y:F)(`${o?k:V} ${e+O(t)}`)},G=t=>{if(t.length===0)return;const e=[];let o=0,c=0,i,s;for(const r of t)r.startTime&&(!i||i>r.startTime)&&(i=r.startTime),r.endTime===void 0?e.push(r):((!s||s<r.endTime)&&(s=r.endTime),r.error?c+=1:o+=1);let n="";if(e.length>0){for(const r of e)n+=`${f}${v} ${r.title+O(r)}`;n+=f}n+=`${f}${b(p(s-i))}`,n+=f+(o>0?$:b)(`${o.toLocaleString()} passed`),c>0&&(n+=f+D(`${c.toLocaleString()} failed`)),e.length>0&&(n+=f+x(`${e.length.toLocaleString()} pending`)),n+=f,F(n)},U=async(t,e)=>new Promise((o,c)=>{e.timeoutId=setTimeout(()=>{c(new Error(`Timeout: ${t}ms`))},t)}),W=async t=>{const{testFunction:e,timeout:o}=t,c={onTestFail:[],onTestFinish:[]},i={onTestFail(s){c.onTestFail.push(s)},onTestFinish(s){c.onTestFinish.push(s)}};t.startTime=Date.now();try{if(o){const s={timeoutId:void 0};try{await Promise.race([e(i),U(o,s)])}finally{clearTimeout(s.timeoutId)}}else await e(i)}catch(s){t.error=s,s&&typeof s=="object"&&"matcherResult"in s&&s.constructor.name==="JestAssertionError"&&delete s.matcherResult,y(s),process.exitCode=1;for(const n of c.onTestFail)await n(s)}finally{t.endTime=Date.now(),B(t);for(const s of c.onTestFinish)await s()}},E=[];process.on("exit",()=>{G(E)});function I(t,e){return async function(c,i,s){t&&(c=`${t} ${c}`);const n={title:c,testFunction:i,timeout:s};E.push(n);const r=W(n);e&&e.push(r),await r}}const Y=async t=>{for(;t.length>0;){const e=t.splice(0);await Promise.all(e)}},C=t=>{const e={onFinish:[]},o=[],c=t?I(`${t} \u203A`,o):R,i=t?N(`${t} \u203A`,o):M,s={test:c,describe:i,runTestSuite:(n,...r)=>{const a=(async()=>{let l=await n;return"default"in l&&(l=l.default),"default"in l&&(l=l.default),l.apply(s,r)})();return o.push(a),a},onFinish(n){e.onFinish.push(n)},pendingTests:o,callbacks:e};return s};function N(t,e){return async function(c,i){t&&(c=`${t} ${c}`);const s=C(c);try{const n=(async()=>{await i(s),await Y(s.pendingTests)})();e&&e.push(n),await n}catch(n){y(n),process.exitCode=1}finally{for(const n of s.callbacks.onFinish)await n()}}}const R=I(),M=N(),q=C();function z(t){return async function(...e){await t(this||q,...e)}}Object.defineProperty(exports,"expect",{enumerable:!0,get:function(){return _.expect}}),exports.describe=M,exports.test=R,exports.testSuite=z;
