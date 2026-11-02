import { NextResponse } from "next/server";
import { db } from "@/db";
import {
  tokens,
  users,
  perpPositions,
  xMoneyPayments,
} from "@/db/schema";
import { eq } from "drizzle-orm";
import { getCurrentUser } from "@/lib/auth";
import { HYPE_PRICE_USD } from "@/lib/constants";

export async function POST(request: Request) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json(
        { error: "Sign in or connect Demo Whale account to open HIP-3 Perp positions" },
        { status: 401 }
      );
    }

    const body = await request.json();
    const tokenId = Number(body.tokenId);
    const side = body.side === "SHORT" ? "SHORT" : "LONG";
    const marginMode = body.marginMode === "ISOLATED" ? "ISOLATED" : "CROSS";
    const orderType = body.orderType === "LIMIT" ? "LIMIT" : "MARKET";
    const collateralSource = String(body.collateralSource || "USDC");
    const collateralUsd = Number(body.collateralUsd);
    const leverage = Math.max(1, Math.min(50, Math.round(Number(body.leverage) || 10)));

    if (!tokenId) {
      return NextResponse.json(
        { error: "Please select a HIP-3 Perpetual market" },
        { status: 400 }
      );
    }
    if (!collateralUsd || collateralUsd < 10) {
      return NextResponse.json(
        { error: "Minimum collateral is $10 USDC" },
        { status: 400 }
      );
    }

    const tokenRows = await db
      .select()
      .from(tokens)
      .where(eq(tokens.id, tokenId))
      .limit(1);

    if (!tokenRows.length) {
      return NextResponse.json({ error: "Market not found" }, { status: 404 });
    }

    const token = tokenRows[0];
    if (token.stage !== "HIP3_PERP_LIVE") {
      return NextResponse.json(
        {
          error: `${token.ticker} has not activated HIP-3 Perpetuals yet. Complete graduation in Lifecycle Pipeline first!`,
        },
        { status: 400 }
      );
    }

    const clampedLeverage = Math.min(leverage, token.maxLeverage || 50);
    const builderFeeUsd = Number((collateralUsd * clampedLeverage * 0.00025).toFixed(2));
    const totalDebitUsd = Number((collateralUsd + builderFeeUsd).toFixed(2));

    let nextUsdc = user.usdcBalance;
    let nextHype = user.hypeBalance;
    let nextXMoney = user.xMoneyBalanceUsd;

    if (collateralSource === "X_MONEY") {
      if (nextXMoney < totalDebitUsd) {
        return NextResponse.json(
          { error: "Insufficient X Money balance for margin collateral" },
          { status: 400 }
        );
      }
      const cashback = Number((totalDebitUsd * 0.03).toFixed(2));
      nextXMoney = Number((nextXMoney - totalDebitUsd + cashback).toFixed(2));

      await db.insert(xMoneyPayments).values({
        userId: user.id,
        xHandle: user.xHandle,
        paymentRail: "X_PASSKEY_INSTANT",
        purpose: "PERP_MARGIN_TOPUP",
        amountUsd: totalDebitUsd,
        convertedHype: Number((totalDebitUsd / HYPE_PRICE_USD).toFixed(4)),
        cashbackUsd: cashback,
        receiptCode: `XM-PERP-${Math.floor(10000 + Math.random() * 89999)}`,
        status: "SETTLED",
      });
    } else if (collateralSource === "HYPE") {
      const hypeNeeded = Number((totalDebitUsd / HYPE_PRICE_USD).toFixed(4));
      if (nextHype < hypeNeeded) {
        return NextResponse.json(
          { error: `Insufficient HYPE balance (${hypeNeeded} HYPE required)` },
          { status: 400 }
        );
      }
      nextHype = Number((nextHype - hypeNeeded).toFixed(4));
    } else {
      if (nextUsdc < totalDebitUsd) {
        return NextResponse.json(
          { error: "Insufficient USDC balance for margin collateral" },
          { status: 400 }
        );
      }
      nextUsdc = Number((nextUsdc - totalDebitUsd).toFixed(2));
    }

    await db
      .update(users)
      .set({
        usdcBalance: nextUsdc,
        hypeBalance: nextHype,
        xMoneyBalanceUsd: nextXMoney,
      })
      .where(eq(users.id, user.id));

    const markPrice =
      Number(body.clientMarkPrice) > 0
        ? Number(body.clientMarkPrice)
        : token.priceUsd;
    const limitPrice =
      orderType === "LIMIT" && Number(body.limitPrice) > 0
        ? Number(body.limitPrice)
        : null;
    const entryPrice = limitPrice || markPrice;
    const sizeUsd = Number((collateralUsd * clampedLeverage).toFixed(2));
    const sizeUnits = Number((sizeUsd / entryPrice).toFixed(4));

    // Maintenance margin buffer ~0.9 / leverage
    const maintBuffer = 0.9 / clampedLeverage;
    const liquidationPrice =
      side === "LONG"
        ? Number(Math.max(0.0001, entryPrice * (1 - maintBuffer)).toFixed(5))
        : Number((entryPrice * (1 + maintBuffer)).toFixed(5));

    const takeProfitPrice =
      Number(body.takeProfitPrice) > 0 ? Number(body.takeProfitPrice) : null;
    const stopLossPrice =
      Number(body.stopLossPrice) > 0 ? Number(body.stopLossPrice) : null;

    // Determine if limit order executes immediately or stays pending
    let status = "OPEN";
    if (orderType === "LIMIT" && limitPrice) {
      const fillsImmediately =
        (side === "LONG" && limitPrice >= markPrice) ||
        (side === "SHORT" && limitPrice <= markPrice);
      status = fillsImmediately ? "OPEN" : "LIMIT_PENDING";
    }

    const [position] = await db
      .insert(perpPositions)
      .values({
        userId: user.id,
        tokenId: token.id,
        symbol: token.hip3PerpSymbol || `${token.ticker}-PERP`,
        side,
        marginMode,
        orderType,
        status,
        leverage: clampedLeverage,
        collateralUsd: Number(collateralUsd.toFixed(2)),
        sizeUsd,
        sizeUnits,
        entryPrice: Number(entryPrice.toFixed(5)),
        limitPrice,
        liquidationPrice,
        takeProfitPrice,
        stopLossPrice,
      })
      .returning();

    if (status === "OPEN") {
      await db
        .update(tokens)
        .set({
          openInterestUsd: Number((token.openInterestUsd + sizeUsd).toFixed(2)),
          volume24hUsd: Number((token.volume24hUsd + sizeUsd).toFixed(2)),
        })
        .where(eq(tokens.id, token.id));
    }

    return NextResponse.json({ position });
  } catch (error) {
    console.error("Open HIP-3 perp order error:", error);
    return NextResponse.json(
      { error: "Failed to submit HIP-3 order to HyperCore" },
      { status: 500 }
    );
  }
}
