import{default as D}from"expect";let a,f,d,p,y=!0;typeof process<"u"&&({FORCE_COLOR:a,NODE_DISABLE_COLORS:f,NO_COLOR:d,TERM:p}=process.env,y=process.stdout&&process.stdout.isTTY);const S={enabled:!f&&d==null&&p!=="dumb"&&(a!=null&&a!=="0"||y)};function b(e,t){let c=new RegExp(`\\x1b\\[${t}m`,"g"),s=`\x1B[${e}m`,o=`\x1B[${t}m`;return function(n){return!S.enabled||n==null?n:s+(~(""+n).indexOf(o)?n.replace(c,o+s):n)+o}}const g=b(31,39),x=b(32,39),C=x("\u2714"),E=g("\u2716");function h(e,t){return async function(s,o){e&&(s=`${e} ${s}`);const n=(async()=>{try{await o(),console.log(C,s)}catch(r){console.error(E,s),"matcherResult"in r&&r.constructor.name==="JestAssertionError"&&delete r.matcherResult,console.error(r),process.exitCode=1}})();t&&t.push(n),await n}}async function A(e){for(;e.length>0;){const t=e.splice(0);await Promise.all(t)}}function m(e,t){return async function(s,o){e&&(s=`${e} ${s}`);const n=[];try{const r=(async()=>{const i={test:h(`${s} \u203A`,n),describe:m(`${s} \u203A`,n),runTestSuite:(R,...T)=>{const l=(async()=>{let u=await R;return"default"in u&&(u=u.default),u.apply(i,T)})();return n.push(l),l}};await o(i),await A(n)})();t&&t.push(r),await r}catch(r){console.error(r)}}}const w=h(),O=m(),$={describe:O,test:w,runTestSuite:async(e,...t)=>{let c=await e;return"default"in c&&(c=c.default),c.apply($,t)}};function L(e){return function(...t){return e(this||$,...t)}}export{O as describe,D as expect,w as test,L as testSuite};
