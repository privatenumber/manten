import{expect as J}from"expect";let f=!0;const h=typeof self<"u"?self:typeof window<"u"?window:typeof global<"u"?global:{};let w=0;if(h.process&&h.process.env&&h.process.stdout){const{FORCE_COLOR:t,NODE_DISABLE_COLORS:e,NO_COLOR:o,TERM:r}=h.process.env;e||o||t==="0"?f=!1:t==="1"||t==="2"||t==="3"?f=!0:r==="dumb"?f=!1:"CI"in h.process.env&&["TRAVIS","CIRCLECI","APPVEYOR","GITLAB_CI","GITHUB_ACTIONS","BUILDKITE","DRONE"].some(c=>c in h.process.env)?f=!0:f=process.stdout.isTTY,f&&(w=r&&r.endsWith("-256color")?2:1)}let b={enabled:f,supportLevel:w};function g(t,e,o=1){const r=`\x1B[${t}m`,c=`\x1B[${e}m`,n=new RegExp(`\\x1b\\[${e}m`,"g");return s=>b.enabled&&b.supportLevel>=o?r+(""+s).replace(n,r)+c:""+s}const T=g(2,22),D=g(31,39),$=g(32,39),x=g(33,39);function F(t){if(typeof t!="number")throw new TypeError("Expected a number");const e=t>0?Math.floor:Math.ceil;return{days:e(t/864e5),hours:e(t/36e5)%24,minutes:e(t/6e4)%60,seconds:e(t/1e3)%60,milliseconds:e(t)%1e3,microseconds:e(t*1e3)%1e3,nanoseconds:e(t*1e6)%1e3}}const P=(t,e)=>e===1?t:`${t}s`,V=1e-7;function p(t,e={}){if(!Number.isFinite(t))throw new TypeError("Expected a finite number");e.colonNotation&&(e.compact=!1,e.formatSubMilliseconds=!1,e.separateMilliseconds=!1,e.verbose=!1),e.compact&&(e.secondsDecimalDigits=0,e.millisecondsDecimalDigits=0);const o=[],r=(s,i)=>{const a=Math.floor(s*10**i+V);return(Math.round(a)/10**i).toFixed(i)},c=(s,i,a,l)=>{if((o.length===0||!e.colonNotation)&&s===0&&!(e.colonNotation&&a==="m"))return;l=(l||s||"0").toString();let m,u;if(e.colonNotation){m=o.length>0?":":"",u="";const _=l.includes(".")?l.split(".")[0].length:l.length,A=o.length>0?2:1;l="0".repeat(Math.max(0,A-_))+l}else m="",u=e.verbose?" "+P(i,s):a;o.push(m+l+u)},n=F(t);if(c(Math.trunc(n.days/365),"year","y"),c(n.days%365,"day","d"),c(n.hours,"hour","h"),c(n.minutes,"minute","m"),e.separateMilliseconds||e.formatSubMilliseconds||!e.colonNotation&&t<1e3)if(c(n.seconds,"second","s"),e.formatSubMilliseconds)c(n.milliseconds,"millisecond","ms"),c(n.microseconds,"microsecond","\xB5s"),c(n.nanoseconds,"nanosecond","ns");else{const s=n.milliseconds+n.microseconds/1e3+n.nanoseconds/1e6,i=typeof e.millisecondsDecimalDigits=="number"?e.millisecondsDecimalDigits:0,a=s>=1?Math.round(s):Math.ceil(s),l=i?s.toFixed(i):a;c(Number.parseFloat(l),"millisecond","ms",l)}else{const s=t/1e3%60,i=typeof e.secondsDecimalDigits=="number"?e.secondsDecimalDigits:1,a=r(s,i),l=e.keepDecimalsOnWholeSeconds?a:a.replace(/\.0+$/,"");c(Number.parseFloat(l),"second","s",l)}if(o.length===0)return"0"+(e.verbose?" milliseconds":"ms");if(e.compact)return o[0];if(typeof e.unitCount=="number"){const s=e.colonNotation?"":" ";return o.slice(0,Math.max(e.unitCount,1)).join(s)}return e.colonNotation?o.join(""):o.join(" ")}const d=`
`,{log:I,error:y}=console,B=$("\u2714"),j=D("\u2716"),v=x("\u2022"),E=({startTime:t,timeout:e,endTime:o})=>{const r=(o||Date.now())-t;let c=p(r);return e&&(c+=` / ${p(e)}`),r<50?"":` ${T(`(${c})`)}`},N=t=>{const{title:e,error:o}=t;(o?y:I)(`${o?j:B} ${e+E(t)}`)},G=t=>{if(t.length===0)return;const e=[];let o=0,r=0,c,n;for(const i of t)i.startTime&&(!c||c>i.startTime)&&(c=i.startTime),i.endTime===void 0?e.push(i):((!n||n<i.endTime)&&(n=i.endTime),i.error?r+=1:o+=1);let s="";if(e.length>0){for(const i of e)s+=`${d}${v} ${i.title+E(i)}`;s+=d}s+=`${d}${T(p(n-c))}`,s+=d+(o>0?$:T)(`${o.toLocaleString()} passed`),r>0&&(s+=d+D(`${r.toLocaleString()} failed`)),e.length>0&&(s+=d+x(`${e.length.toLocaleString()} pending`)),s+=d,I(s)},U=async(t,e)=>new Promise((o,r)=>{e.timeoutId=setTimeout(()=>{r(new Error(`Timeout: ${t}ms`))},t)}),k=async t=>{const{testFunction:e,timeout:o}=t;let r;const c={onTestFail(n){r=n}};t.startTime=Date.now();try{if(o){const n={timeoutId:void 0};try{await Promise.race([e(c),U(o,n)])}finally{clearTimeout(n.timeoutId)}}else await e(c);t.endTime=Date.now(),N(t)}catch(n){t.endTime=Date.now(),t.error=n,N(t),n&&typeof n=="object"&&"matcherResult"in n&&n.constructor.name==="JestAssertionError"&&delete n.matcherResult,y(n),process.exitCode=1,typeof r=="function"&&r(n)}},O=[];process.on("exit",()=>{G(O)});function C(t,e){return async function(r,c,n){t&&(r=`${t} ${r}`);const s={title:r,testFunction:c,timeout:n};O.push(s);const i=k(s);e&&e.push(i),await i}}async function W(t){for(;t.length>0;){const e=t.splice(0);await Promise.all(e)}}function R(t,e){return async function(r,c){t&&(r=`${t} ${r}`);const n=[];try{const s=(async()=>{const i={test:C(`${r} \u203A`,n),describe:R(`${r} \u203A`,n),runTestSuite:(a,...l)=>{const m=(async()=>{let u=await a;return"default"in u&&(u=u.default),"default"in u&&(u=u.default),u.apply(i,l)})();return n.push(m),m}};await c(i),await W(n)})();e&&e.push(s),await s}catch(s){y(s),process.exitCode=1}}}const S=C(),L=R(),M={describe:L,test:S,runTestSuite:async(t,...e)=>{let o=await t;return"default"in o&&(o=o.default),"default"in o&&(o=o.default),o.apply(M,e)}};function Y(t){return function(...e){return t(this||M,...e)}}export{L as describe,J as expect,S as test,Y as testSuite};
