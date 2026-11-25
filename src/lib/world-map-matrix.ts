// 208×96 prototype silhouette, sampled from the design’s 1024×473 PNG.
const MATRIX_COLS = 208;
const MATRIX_ROWS = 96;
const WORLD_MASK_RLE =
  "0:265;1334650:9;364566410:177;15812768fffb53acccaaccef:7;ea810:174;2853affd5578bf:17;90:176;31266ea4108ecef:17;40:49;5c836410:105;1310:11;19a9b810:8;bf:15;60:46;acfdf:6;80:103;18eff8244215b79a296950:10;3f:12;d720:40;21002abef:8;b9b898579820:5;210:71;3530:13;875efffee1037801edeffdd20:7;19f:11;8b10:19;12110:16;4fd48ef:21;e72657ffed7331020:59;4adf:5;ca8410489b796128dfbec545ae1055433eff80:7;5f:10;d710:18;49effea320:11;5229f9bf:38;a6795399630:47;9f:23;8778a76648efb6e90004efc20:5;7ef:6;e84410:19;af:9;e822518ebcf:4;bef2f:49;b6610:39;387bf:25;df:7;eda9700059bbdb0:4;4f:6;b920:5;13350:13;9fffedfffb38859fef:10;eaf:51;ebbb20:36;58df:32;eec4da0194effa010:4;3f:4;b10:7;2dfea10:11;8fffe39f:4;a27df:66;911570:34;27aef:32;e70011202104e840:6;4fffc10:9;140:11;17cfffb25f:76;e70:36;bf:6;ef:27;80:7;7fe80:11;9fe30:23;af:5;508f:67;96e2f:4;d10:36;3dffe7751268ef:21;e30:7;2efff1050:9;420:24;9f:5;e21594ef:61;df6002fc5330:37;18ba20:7;2bf:20;d10:7;bfffe7ce0:30;20:4;3969ff7015ef:59;a0:4;20004f910:37;1584230:8;35f:21;a610:4;1cf:7;10:28;3c10:4;181ed005cf:60;50:8;9ffd10:36;210:12;25f:23;e8204bf:8;60:26;164b70:4;4c041108f:60;e10:8;1bff80:51;8f:24;e14f:10;bb10:24;df16f10047fcdaeef:62;d9b210:5;1af70:51;8f:24;d1bf:11;80:24;1e82ffb15f:73;e730:6;990:50;27df:24;ef:6;c9ba8520:27;2775bf:75;a650:6;10:50;1a7f:18;edf:9;b880005ea10:26;128cf:77;4a20:56;1acf:16;b401ef:7;edf700169820:26;29f:22;df:56;4460:56;7f:18;dea688ef:7;ea410:33;cf:17;65e66f:5;c21cf:47;50610:54;2ef:19;a6d16dcf:4;b58840:34;cf:4;ecf3af:7;901845efffe10def:46;e200810:52;1df:19;e2eeaedbfff30010:31;2cc9affc6522ed16df:5;30:5;1afff708f:46;97000de80:51;8f:20;dafd9efffc50:35;3f:5;e500142bd31ef:4;41598201effe4029f:43;b0:5;4210:50;4f:29;60:37;4f:5;321058005c5bfa388f:5;df:5;b01bf:38;98fffa0:5;2d20:50;6f:27;e40:38;8f:4;a140023000804b507f:12;c008f:37;91245f50:6;a80:50;4f:27;30:39;5dffd20:4;1404b1007801ef:11;d404f:37;e87517ea0:4;1ba0:50;1f:27;10:41;6004bedcef3010:4;13024284bf:8;bdf:39;c2007f7013cff0:51;af:24;c40:41;4fbbf:7;30:6;15300051bf:49;b1001812a9d620:52;8f:21;e70:42;7ef:10;b52000520:7;ef:50;70:5;74720:54;6dcf:18;e20:42;2f:15;201fe9510203f:51;e60:5;70:56;486f:10;eaee56aea0:43;7f:16;daf:17;bdf:42;d20:62;a3f:8;e920010006b0:41;16ef:25;cacf:7;42f:43;40:62;c58f:7;50:8;6e020:39;bf:28;57f:7;d03bedf:39;0:63;182f:6;e10:8;19020:38;7f:29;d1bf:7;64017bf:4;df:32;b0:63;1805f:5;a0:11;1010:36;1ef:30;71ef:7;e5bc20:5;bf:30;e3750:62;110bf:4;40:7;277820110:35;af:31;e14f:11;e50:5;7ef:11;eef:13;eb50830:65;7f:4;70:4;7801004c820:35;1f:33;80ef:11;80:5;2e8ef:7;e413f:9;a7d210:70;af:4;b0004fa0:5;2962410:33;df:32;a08f:10;b0:9;ef:7;80005ef:6;d0040:72;2df:4;735ef50:5;2148fb2210:30;bf:32;e40bf:9;40:9;cf:6;80:5;6f:6;d1480:6;210:66;5df:6;d0:6;10:6;10:26;10:4;bf:33;d02df:6;c50:10;8f:5;80:7;eef:5;b10:7;960:68;484affb7830:37;22002ef:34;508f:5;50:12;1efff70:8;71f:6;a0:7;e60:72;8f:4;70:41;4f:36;76ffe820:14;8fff20:10;bf:6;30:6;5920:72;13ef60:41;2ef:36;7a710:16;3fff20:10;4a8f:4;80:6;1750:74;6f40:4;17e5a100010:28;8f:36;d001580:15;aff0:11;1907fff60:6;144820:72;1c80110bfebfebb750:29;8f:36;ddffe0:15;3fb0:11;47003f30:6;5414220:73;19b789f:9;d30:28;1f:40;40:16;92810:9;4d10040:7;5005590:75;115f:11;d20:28;7f:9;df:28;b0:19;a60:10;480:9;11004cc0:4;110:13;10:8;10:48;2f:12;e9950:26;4dffcdd7206f:27;20:14;10:4;210:8;410ba0:7;1bb100520:77;2f:16;70:26;1410:6;155ef:23;a0:15;30:14;5e37f40:5;3efa0:82;8f:16;e10:36;18f:22;b20:31;6d3c80:4;5dff70:5;110:74;4f:18;40:35;118f:21;a0:34;ce450019f:4;e04341420:28;20:45;df:17;b820:34;10bf:20;b0:35;3ef2001f:5;737570530:23;10:49;4f:17;e888d60:34;ef:19;d20:36;7fa000efffe16b60:4;19c0040:17;10:49;1ef:21;dba720:30;3ef:17;e20:37;1ef7005cee80bc4000620e5dfd720:4;510:58;6f:26;d20:30;2f:17;70:39;4ee0:5;1009470:6;27efffe8000180:58;4f:28;e0:30;cf:16;10:40;4520:7;410:9;1af:4;d158220:58;5f:28;10:29;6f:16;20:41;4cbbc510:14;5fffef21003420:57;df:26;d0:30;2f:16;60:44;2355251725710:6;26d819a0:4;14420:55;7f:25;e30:30;1f:16;d0:10;20:39;40150:13;19a10:4;440:11;10:43;1cf:24;90:32;ef:16;110:56;441000510:4;10:5;10:56;2f:23;b0:32;6f:17;2220070:50;3cffa000c40:26;110:40;af:22;a0:32;bf:17;20008e0:47;4c5bfff3000fd10:12;110:11;110:41;7df:20;b0:31;2f:17;8004bfb0:46;4ef:6;a104ff60:12;420:10;10:44;19f:19;90:31;1f:15;d4000cff70:45;7df:8;e7eff60:12;120:5;7400030:46;df:18;80:32;af:14;40:4;cff20:44;1ef:14;50:9;10:9;20:51;6f:18;30:32;4f:13;70:5;dfc0:5;20:37;47df:15;e30:8;270:12;20:47;4f:17;d0:34;bf:12;60:4;5ff60:40;15df:19;b0:9;540:59;5f:15;b820:34;7f:12;b0:4;8ff40:40;af:22;20:9;20:59;6f:13;d40:37;4f:11;d40:4;5fd0:41;ef:22;d10:68;4f:13;80:38;2f:10;d0:7;20:42;ef:23;50:68;6f:13;90:39;ef:9;d0:49;1f:24;20:68;4f:13;30:39;5f:9;40:49;3f:23;e0:69;2f:12;d0:41;bf:6;e40:50;1f:23;70:70;df:11;40:41;2f:6;50:51;1df:5;eb87df:11;b10:70;cf:10;a0:42;2f:4;d40:52;6fffdb50:4;1ebef:7;a10:71;cf:7;d6810:43;431310:53;6a510:8;44f:7;b0:12;110:59;cf:8;70:117;af:5;a10:12;240:59;cf:8;70:117;afffca10:13;2a20:58;8f:6;530:119;3270:15;4ee20:58;7f:4;de20:137;17a10:59;1afffe20:121;6d60:12;2b5510:61;4f:4;70:121;770:11;27d40:65;effe20:132;3af710:65;5fffd10:131;1ba40:68;8fffa0:131;10:71;3fff70:204;8ff30:205;8c60:207;bd30:205;17720:572;";

const MATRIX_GRID = new Float32Array(MATRIX_COLS * MATRIX_ROWS);
(() => {
  let outIdx = 0;
  let k = 0;
  const len = WORLD_MASK_RLE.length;
  while (k < len && outIdx < MATRIX_GRID.length) {
    const val = parseInt(WORLD_MASK_RLE[k], 16) / 15;
    if (k + 1 < len && WORLD_MASK_RLE[k + 1] === ":") {
      const semi = WORLD_MASK_RLE.indexOf(";", k + 2);
      const cnt = parseInt(WORLD_MASK_RLE.slice(k + 2, semi), 10);
      const end = Math.min(MATRIX_GRID.length, outIdx + cnt);
      MATRIX_GRID.fill(val, outIdx, end);
      outIdx = end;
      k = semi + 1;
    } else {
      MATRIX_GRID[outIdx++] = val;
      k += 1;
    }
  }
})();

export function sampleWorldLand(u: number, v: number) {
  if (u < 0 || u > 1 || v < 0 || v > 1) return 0;
  const fx = u * (MATRIX_COLS - 1);
  const fy = v * (MATRIX_ROWS - 1);
  const x0 = Math.floor(fx);
  const y0 = Math.floor(fy);
  const x1 = Math.min(MATRIX_COLS - 1, x0 + 1);
  const y1 = Math.min(MATRIX_ROWS - 1, y0 + 1);
  const tx = fx - x0;
  const ty = fy - y0;
  const v00 = MATRIX_GRID[y0 * MATRIX_COLS + x0];
  const v10 = MATRIX_GRID[y0 * MATRIX_COLS + x1];
  const v01 = MATRIX_GRID[y1 * MATRIX_COLS + x0];
  const v11 = MATRIX_GRID[y1 * MATRIX_COLS + x1];
  return (v00 * (1 - tx) + v10 * tx) * (1 - ty) + (v01 * (1 - tx) + v11 * tx) * ty;
}

export function projectGeoToMapPercent(lng: number, lat: number) {
  const col = 0.3108 * lng * (1 - 0.11 * Math.pow(lat / 90, 2)) + 42.323;
  const row = -0.3259 * lat + 26.807;
  const xPct = Math.max(2, Math.min(98, (col / 104) * 100));
  const yPct = Math.max(4, Math.min(96, (row / 48) * 100));
  return { xPct, yPct };
}
// Real-time Solar Terminator (晨昏线) astronomy helper + UTC+8 clock
export function getSolarSubpoint(nowMs: number) {
  const d = new Date(nowMs);
  const startOfYear = Date.UTC(d.getUTCFullYear(), 0, 0);
  const doy = (nowMs - startOfYear) / 86400000;
  const declRad = ((-23.44 * Math.PI) / 180) * Math.cos((2 * Math.PI * (doy + 10)) / 365);
  const utcHours = d.getUTCHours() + d.getUTCMinutes() / 60 + d.getUTCSeconds() / 3600;
  const subsolarLngDeg = (((12 - utcHours) * 15 + 540) % 360) - 180;
  return {
    declRad,
    subsolarLngRad: (subsolarLngDeg * Math.PI) / 180,
  };
}

export function formatUtc8Time(nowMs: number) {
  const d = new Date(nowMs + 8 * 3600 * 1000);
  const pad2 = (n: number) => String(n).padStart(2, "0");
  return `${pad2(d.getUTCHours())}:${pad2(d.getUTCMinutes())}:${pad2(d.getUTCSeconds())}`;
}
