import { NextResponse } from "next/server";
import { db } from "@/db";
import {
  tokens,
  users,
  tokenHoldings,
  spotTrades,
  xMoneyPayments,
} from "@/db/schema";
import { and, eq } from "drizzle-orm";
import {
  generateEvmAddress,
  generateTxHash,
  getCurrentUser,
} from "@/lib/auth";
import { HYPE_PRICE_USD } from "@/lib/constants";

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json(
        { error: "Sign in or connect Demo Whale account to trade" },
        { status: 401 }
      );
    }

    const { id } = await params;
    const tokenId = Number(id);
    if (!tokenId) {
      return NextResponse.json({ error: "Invalid token ID" }, { status: 400 });
    }

    const tokenRows = await db
      .select()
      .from(tokens)
      .where(eq(tokens.id, tokenId))
      .limit(1);

    if (!tokenRows.length) {
      return NextResponse.json({ error: "Token not found" }, { status: 404 });
    }

    const token = tokenRows[0];
    const body = await request.json();
    const side = body.side === "SELL" ? "SELL" : "BUY";
    const paymentMethod = String(body.paymentMethod || "HYPE");
    const rawAmount = Number(body.amount);

    if (!rawAmount || rawAmount <= 0) {
      return NextResponse.json(
        { error: "Please enter a valid trade amount" },
        { status: 400 }
      );
    }

    const venue =
      token.stage === "BONDING"
        ? "ELYSIUM_CURVE"
        : token.stage === "GRADUATED_UNISWAP"
        ? "UNISWAP_V3"
        : "HYPERCORE_SPOT";

    const holdingRows = await db
      .select()
      .from(tokenHoldings)
      .where(
        and(
          eq(tokenHoldings.userId, user.id),
          eq(tokenHoldings.tokenId, token.id)
        )
      )
      .limit(1);

    const existingHolding = holdingRows[0];

    let nextHype = user.hypeBalance;
    let nextUsdc = user.usdcBalance;
    let nextXMoney = user.xMoneyBalanceUsd;

    let amountHype = 0;
    let amountUsd = 0;
    let amountTokens = 0;
    let newPriceUsd = token.priceUsd;
    let newPriceHype = token.priceHype;
    let newVirtualHype = token.virtualHypeReserves;
    let newVirtualTokens = token.virtualTokenReserves;
    let newRealHype = token.realHypeRaised;
    let newBondingProgress = token.bondingProgress;
    let newStage = token.stage;
    let newUniswapPool = token.uniswapPoolAddress;
    let graduatedNow = false;

    if (side === "BUY") {
      // If paymentMethod is USDC or X_MONEY, rawAmount can be in USD or HYPE depending on inputUnit; default: HYPE if HYPE, USD if USDC/X_MONEY
      if (paymentMethod === "USDC" || paymentMethod === "X_MONEY") {
        amountUsd = Number(rawAmount.toFixed(2));
        amountHype = Number((amountUsd / HYPE_PRICE_USD).toFixed(4));
      } else {
        amountHype = Number(rawAmount.toFixed(4));
        amountUsd = Number((amountHype * HYPE_PRICE_USD).toFixed(2));
      }

      if (paymentMethod === "X_MONEY") {
        if (nextXMoney < amountUsd) {
          return NextResponse.json(
            { error: "Insufficient X Money USD balance" },
            { status: 400 }
          );
        }
        const cashback = Number((amountUsd * 0.03).toFixed(2));
        nextXMoney = Number((nextXMoney - amountUsd + cashback).toFixed(2));

        await db.insert(xMoneyPayments).values({
          userId: user.id,
          xHandle: user.xHandle,
          paymentRail: "X_VISA_VIRTUAL_CARD",
          purpose: "SPOT_BUY",
          amountUsd,
          convertedHype: amountHype,
          cashbackUsd: cashback,
          receiptCode: `XM-BUY-${Math.floor(10000 + Math.random() * 89999)}`,
          status: "SETTLED",
        });
      } else if (paymentMethod === "USDC") {
        if (nextUsdc < amountUsd) {
          return NextResponse.json(
            { error: "Insufficient USDC balance" },
            { status: 400 }
          );
        }
        nextUsdc = Number((nextUsdc - amountUsd).toFixed(2));
      } else {
        if (nextHype < amountHype) {
          return NextResponse.json(
            { error: "Insufficient Elysium HYPE balance" },
            { status: 400 }
          );
        }
        nextHype = Number((nextHype - amountHype).toFixed(4));
      }

      if (token.stage === "BONDING") {
        // Bonding curve impact
        const priceImpactMultiplier = 1 + Math.min(0.18, amountHype / 850);
        newPriceUsd = Number(
          (token.priceUsd * priceImpactMultiplier).toFixed(5)
        );
        newPriceHype = Number((newPriceUsd / HYPE_PRICE_USD).toFixed(8));
        amountTokens = Number((amountUsd / ((token.priceUsd + newPriceUsd) / 2)).toFixed(4));
        newVirtualHype = Number((token.virtualHypeReserves + amountHype).toFixed(4));
        newVirtualTokens = Math.max(
          100,
          Number((token.virtualTokenReserves - amountTokens).toFixed(4))
        );
        newRealHype = Number((token.realHypeRaised + amountHype).toFixed(4));
        newBondingProgress = Math.min(
          100,
          Number(((newRealHype / token.graduationTargetHype) * 100).toFixed(2))
        );

        if (newRealHype >= token.graduationTargetHype) {
          newStage = "GRADUATED_UNISWAP";
          newBondingProgress = 100;
          newUniswapPool =
            token.uniswapPoolAddress ||
            `0xUniV3${generateEvmAddress().slice(6)}`;
          graduatedNow = true;
        }
      } else {
        // Deep Uniswap V3 / HyperCore Orderbook liquidity
        const impact = 1 + Math.min(0.035, amountUsd / 500000);
        newPriceUsd = Number((token.priceUsd * impact).toFixed(4));
        newPriceHype = Number((newPriceUsd / HYPE_PRICE_USD).toFixed(6));
        amountTokens = Number((amountUsd / newPriceUsd).toFixed(4));
      }

      // Update holdings
      if (existingHolding) {
        const totalUnits = existingHolding.balance + amountTokens;
        const newAvg =
          (existingHolding.balance * existingHolding.avgBuyPriceUsd +
            amountUsd) /
          totalUnits;
        await db
          .update(tokenHoldings)
          .set({
            balance: Number(totalUnits.toFixed(4)),
            avgBuyPriceUsd: Number(newAvg.toFixed(4)),
            updatedAt: new Date(),
          })
          .where(eq(tokenHoldings.id, existingHolding.id));
      } else {
        await db.insert(tokenHoldings).values({
          userId: user.id,
          tokenId: token.id,
          balance: amountTokens,
          avgBuyPriceUsd: newPriceUsd,
        });
      }
    } else {
      // SELL tokens
      amountTokens = Number(rawAmount.toFixed(4));
      if (!existingHolding || existingHolding.balance < amountTokens) {
        return NextResponse.json(
          {
            error: `Insufficient ${token.ticker} balance (${
              existingHolding ? existingHolding.balance.toFixed(4) : "0"
            } available)`,
          },
          { status: 400 }
        );
      }

      const impact = Math.max(
        0.88,
        1 -
          (token.stage === "BONDING"
            ? Math.min(0.12, (amountTokens * token.priceUsd) / 45000)
            : Math.min(0.025, (amountTokens * token.priceUsd) / 600000))
      );
      newPriceUsd = Number((token.priceUsd * impact).toFixed(5));
      newPriceHype = Number((newPriceUsd / HYPE_PRICE_USD).toFixed(8));
      amountUsd = Number((amountTokens * newPriceUsd).toFixed(2));
      amountHype = Number((amountUsd / HYPE_PRICE_USD).toFixed(4));

      if (token.stage === "BONDING") {
        newRealHype = Math.max(
          0,
          Number((token.realHypeRaised - amountHype).toFixed(4))
        );
        newVirtualHype = Math.max(
          50,
          Number((token.virtualHypeReserves - amountHype).toFixed(4))
        );
        newVirtualTokens = Number(
          (token.virtualTokenReserves + amountTokens).toFixed(4)
        );
        newBondingProgress = Math.min(
          99.9,
          Number(((newRealHype / token.graduationTargetHype) * 100).toFixed(2))
        );
      }

      if (paymentMethod === "USDC") {
        nextUsdc = Number((nextUsdc + amountUsd).toFixed(2));
      } else {
        nextHype = Number((nextHype + amountHype).toFixed(4));
      }

      const remaining = Number(
        (existingHolding.balance - amountTokens).toFixed(4)
      );
      await db
        .update(tokenHoldings)
        .set({
          balance: Math.max(0, remaining),
          updatedAt: new Date(),
        })
        .where(eq(tokenHoldings.id, existingHolding.id));
    }

    await db
      .update(users)
      .set({
        hypeBalance: nextHype,
        usdcBalance: nextUsdc,
        xMoneyBalanceUsd: nextXMoney,
      })
      .where(eq(users.id, user.id));

    const pctDelta = ((newPriceUsd - token.priceUsd) / token.priceUsd) * 100;
    const [updatedToken] = await db
      .update(tokens)
      .set({
        priceUsd: newPriceUsd,
        priceHype: newPriceHype,
        change24h: Number((token.change24h + pctDelta).toFixed(2)),
        marketCapUsd: Number((newPriceUsd * token.totalSupply).toFixed(2)),
        volume24hUsd: Number((token.volume24hUsd + amountUsd).toFixed(2)),
        virtualHypeReserves: newVirtualHype,
        virtualTokenReserves: newVirtualTokens,
        realHypeRaised: newRealHype,
        bondingProgress: newBondingProgress,
        stage: newStage,
        uniswapPoolAddress: newUniswapPool,
        holdersCount:
          side === "BUY" && !existingHolding
            ? token.holdersCount + 1
            : token.holdersCount,
      })
      .where(eq(tokens.id, token.id))
      .returning();

    const [createdTrade] = await db
      .insert(spotTrades)
      .values({
        tokenId: token.id,
        userId: user.id,
        traderLabel: user.xHandle || user.username,
        side,
        venue: graduatedNow ? "UNISWAP_V3" : venue,
        paymentMethod,
        amountToken: amountTokens,
        amountHype,
        amountUsd,
        priceUsd: newPriceUsd,
        txHash: generateTxHash(),
      })
      .returning();

    return NextResponse.json({
      token: updatedToken,
      trade: createdTrade,
      graduatedNow,
    });
  } catch (error) {
    console.error("Trade error:", error);
    return NextResponse.json(
      { error: "Trade execution failed" },
      { status: 500 }
    );
  }
}
