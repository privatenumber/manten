"use strict";Object.defineProperty(exports,"__esModule",{value:!0});var R=require("expect");function S(e){return e&&typeof e=="object"&&"default"in e?e:{default:e}}var _=S(R);let a,f,d,p,b=!0;typeof process<"u"&&({FORCE_COLOR:a,NODE_DISABLE_COLORS:f,NO_COLOR:d,TERM:p}=process.env||{},b=process.stdout&&process.stdout.isTTY);const P={enabled:!f&&d==null&&p!=="dumb"&&(a!=null&&a!=="0"||b)};function y(e,t){let s=new RegExp(`\\x1b\\[${t}m`,"g"),r=`\x1B[${e}m`,o=`\x1B[${t}m`;return function(n){return!P.enabled||n==null?n:r+(~(""+n).indexOf(o)?n.replace(s,o+r):n)+o}}const x=y(31,39),E=y(32,39),C=E("\u2714"),v=x("\u2716"),A=e=>new Promise((t,s)=>{setTimeout(()=>{s(new Error(`Timeout: ${e}ms`))},e)});function m(e,t){return async function(r,o,n){e&&(r=`${e} ${r}`);const u=(async()=>{try{n?await Promise.race([o(),A(n)]):await o(),console.log(C,r)}catch(c){console.error(v,r),c&&typeof c=="object"&&"matcherResult"in c&&c.constructor.name==="JestAssertionError"&&delete c.matcherResult,console.error(c),process.exitCode=1}})();t&&t.push(u),await u}}async function L(e){for(;e.length>0;){const t=e.splice(0);await Promise.all(t)}}function w(e,t){return async function(r,o){e&&(r=`${e} ${r}`);const n=[];try{const u=(async()=>{const c={test:m(`${r} \u203A`,n),describe:w(`${r} \u203A`,n),runTestSuite:($,...g)=>{const l=(async()=>{let i=await $;return"default"in i&&(i=i.default),i.apply(c,g)})();return n.push(l),l}};await o(c),await L(n)})();t&&t.push(u),await u}catch(u){console.error(u)}}}const O=m(),h=w(),T={describe:h,test:O,runTestSuite:async(e,...t)=>{let s=await e;return"default"in s&&(s=s.default),s.apply(T,t)}};function j(e){return function(...t){return e(this||T,...t)}}Object.defineProperty(exports,"expect",{enumerable:!0,get:function(){return _.default}}),exports.describe=h,exports.test=O,exports.testSuite=j;
