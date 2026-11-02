import { actionHash, orderAction, orderWire, signL1WithKey, floatToWire, roundPrice } from "../src/lib/hlsign";
const KEY = "0x0123456789012345678901234567890123456789012345678901234567890123" as const;
const big = (h: string) => BigInt(h);
let fails = 0;
const check = (name: string, ok: boolean, got?: unknown) => { console.log(ok ? "PASS" : "FAIL", name, ok ? "" : JSON.stringify(got)); if (!ok) fails++; };

// 1. phantom agent connectionId (ETH asset 4, Ioc, nonce 1677777606040)
const a1 = orderAction([orderWire(4, true, 1670.1, 0.0147, false, "Ioc")]);
check("connectionId order", actionHash(a1, 1677777606040) === "0x0fcbeda5ae3c4950a548021552a4fea2226858c4453571bf3f24ba017eac2908", actionHash(a1, 1677777606040));

// 2. dummy action
const dummy = { type: "dummy", num: 100000000000 };
const d1 = await signL1WithKey(KEY, dummy, 0, true);
check("dummy mainnet", big(d1.r) === big("0x53749d5b30552aeb2fca34b530185976545bb22d0b3ce6f62e31be961a59298") && big(d1.s) === big("0x755c40ba9bf05223521753995abb2f73ab3229be8ec921f350cb447e384d8ed8") && d1.v === 27, d1);
const d2 = await signL1WithKey(KEY, dummy, 0, false);
check("dummy testnet", big(d2.r) === big("0x542af61ef1f429707e3c76c5293c80d01f74ef853e34b76efffcb57e574f9510") && d2.v === 28, d2);

// 3. order action (asset 1, sz 100, px 100, Gtc, nonce 0)
const a3 = orderAction([orderWire(1, true, 100, 100, false, "Gtc")]);
const o1 = await signL1WithKey(KEY, a3, 0, true);
check("order mainnet", big(o1.r) === big("0xd65369825a9df5d80099e513cce430311d7d26ddf477f5b3a33d2806b100d78e") && big(o1.s) === big("0x2b54116ff64054968aa237c20ca9ff68000f977c93289157748a3162b6ea940e") && o1.v === 28, o1);
const o2 = await signL1WithKey(KEY, a3, 0, false);
check("order testnet", big(o2.r) === big("0x82b2ba28e76b3d761093aaded1b1cdad4960b3af30212b343fb2e6cdfa4e3d54") && o2.v === 27, o2);

// 4. wire formatting + tick rounding
check("floatToWire", floatToWire(100) === "100" && floatToWire(1670.1) === "1670.1" && floatToWire(0.0147) === "0.0147", [floatToWire(100), floatToWire(1670.1)]);
check("roundPrice BTC", roundPrice(97412.5, 5) === 97413 && roundPrice(78131.27, 5) === 78131, [roundPrice(97412.5, 5), roundPrice(78131.27, 5)]);
check("roundPrice small", roundPrice(0.0284117, 0) === 0.028412 && roundPrice(3.456789, 2) === 3.4568, [roundPrice(0.0284117, 0), roundPrice(3.456789, 2)]);
console.log(fails === 0 ? "\nALL SIGNING VECTORS MATCH" : `\n${fails} FAILURE(S)`);
process.exit(fails ? 1 : 0);
