import { NextResponse } from "next/server";
import { db } from "@/db";
import {
  tokens,
  users,
  tokenHoldings,
  spotTrades,
  xMoneyPayments,
} from "@/db/schema";
import { eq } from "drizzle-orm";
import {
  generateEvmAddress,
  generateTxHash,
  getCurrentUser,
} from "@/lib/auth";
import { HYPE_PRICE_USD, TOKEN_CREATE_FEE_HYPE } from "@/lib/constants";

export async function POST(request: Request) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json(
        { error: "Please sign in or connect Demo Whale account to launch a token" },
        { status: 401 }
      );
    }

    const body = await request.json();
    const name = String(body.name || "").trim();
    const ticker = String(body.ticker || "")
      .trim()
      .replace(/[^a-zA-Z0-9]/g, "")
      .slice(0, 10);
    const category = String(body.category || "CRYPTO");
    const description = String(body.description || "").trim();
    const logoColor = String(body.logoColor || "#10b981");
    const targetPath =
      body.targetPath === "UNISWAP_ONLY" ? "UNISWAP_ONLY" : "FULL_HIP3_PIPELINE";
    const paymentMethod = String(body.paymentMethod || "HYPE");
    const xMoneyRail = String(body.xMoneyRail || "X_VISA_VIRTUAL_CARD");
    const graduationTargetHype = Math.max(
      100,
      Math.min(5000, Number(body.graduationTargetHype) || 500)
    );
    const initialBuyHype = Math.max(0, Number(body.initialBuyHype) || 0);
    const maxLeverage = Math.max(
      2,
      Math.min(50, Number(body.maxLeverage) || (category === "STOCK_TOKEN" ? 20 : 30))
    );

    if (!name || !ticker) {
      return NextResponse.json(
        { error: "Token name and ticker symbol are required" },
        { status: 400 }
      );
    }
    if (!description) {
      return NextResponse.json(
        { error: "Please provide a brief project or equity description" },
        { status: 400 }
      );
    }

    const isStockToken = category === "STOCK_TOKEN" || Boolean(body.isStockToken);
    const underlyingTicker = isStockToken
      ? String(body.underlyingTicker || ticker.replace(/^e|x$/g, "")).toUpperCase()
      : null;
    const underlyingExchange = isStockToken
      ? String(body.underlyingExchange || "NASDAQ")
      : null;
    const isinCode = isStockToken
      ? String(body.isinCode || `US-XSTOCK-${underlyingTicker}`)
      : null;
    const referenceStockPriceUsd = isStockToken
      ? Math.max(1, Number(body.referenceStockPriceUsd) || 150)
      : null;

    const totalCostHype = TOKEN_CREATE_FEE_HYPE + initialBuyHype;
    const totalCostUsd = Number((totalCostHype * HYPE_PRICE_USD).toFixed(2));

    let nextHype = user.hypeBalance;
    let nextUsdc = user.usdcBalance;
    let nextKhype = user.khypeBalance;
    let nextXMoney = user.xMoneyBalanceUsd;
    let xMoneyReceiptCode: string | null = null;

    if (paymentMethod === "X_MONEY") {
      if (nextXMoney < totalCostUsd) {
        return NextResponse.json(
          {
            error: `Insufficient X Money balance ($${nextXMoney.toFixed(
              2
            )} available, $${totalCostUsd.toFixed(2)} required). Top up X Money in Wallet.`,
          },
          { status: 400 }
        );
      }
      const cashback =
        xMoneyRail === "X_VISA_VIRTUAL_CARD"
          ? Number((totalCostUsd * 0.03).toFixed(2))
          : 0;
      nextXMoney = Number((nextXMoney - totalCostUsd + cashback).toFixed(2));
      xMoneyReceiptCode = `XM-${ticker.toUpperCase()}-${Math.floor(
        10000 + Math.random() * 89999
      )}`;

      await db.insert(xMoneyPayments).values({
        userId: user.id,
        xHandle: user.xHandle,
        paymentRail: xMoneyRail,
        purpose: "TOKEN_LAUNCH",
        amountUsd: totalCostUsd,
        convertedHype: Number(totalCostHype.toFixed(4)),
        cashbackUsd: cashback,
        receiptCode: xMoneyReceiptCode,
        status: "SETTLED",
      });
    } else if (paymentMethod === "USDC") {
      if (nextUsdc < totalCostUsd) {
        return NextResponse.json(
          { error: "Insufficient USDC balance" },
          { status: 400 }
        );
      }
      nextUsdc = Number((nextUsdc - totalCostUsd).toFixed(2));
    } else if (paymentMethod === "KHYPE") {
      if (nextKhype < totalCostHype) {
        return NextResponse.json(
          { error: "Insufficient kHYPE balance" },
          { status: 400 }
        );
      }
      nextKhype = Number((nextKhype - totalCostHype).toFixed(4));
    } else {
      if (nextHype < totalCostHype) {
        return NextResponse.json(
          { error: "Insufficient HYPE balance on Elysium" },
          { status: 400 }
        );
      }
      nextHype = Number((nextHype - totalCostHype).toFixed(4));
    }

    await db
      .update(users)
      .set({
        hypeBalance: nextHype,
        usdcBalance: nextUsdc,
        khypeBalance: nextKhype,
        xMoneyBalanceUsd: nextXMoney,
      })
      .where(eq(users.id, user.id));

    // Bonding curve configuration
    const totalSupply = isStockToken
      ? Math.max(10000, Math.round(5000000 / (referenceStockPriceUsd || 150)))
      : 10000000;
    const baseVirtualHype = 120;
    const initialVirtualTokens = isStockToken
      ? Number(
          ((baseVirtualHype * HYPE_PRICE_USD) / (referenceStockPriceUsd || 150)) *
            12
        )
      : totalSupply;

    let virtualHype = baseVirtualHype;
    let virtualTokens = initialVirtualTokens;
    let tokensBought = 0;

    if (initialBuyHype > 0) {
      const k = virtualHype * virtualTokens;
      const newVirtualHype = virtualHype + initialBuyHype;
      const newVirtualTokens = k / newVirtualHype;
      tokensBought = Math.max(0, virtualTokens - newVirtualTokens);
      virtualHype = newVirtualHype;
      virtualTokens = newVirtualTokens;
    }

    const priceHype = isStockToken
      ? Number(((referenceStockPriceUsd || 150) / HYPE_PRICE_USD).toFixed(6))
      : Number((virtualHype / virtualTokens).toFixed(8));
    const priceUsd = Number((priceHype * HYPE_PRICE_USD).toFixed(4));
    const marketCapUsd = Number((priceUsd * totalSupply).toFixed(2));
    const bondingProgress = Math.min(
      100,
      Number(((initialBuyHype / graduationTargetHype) * 100).toFixed(2))
    );
    const graduatedImmediately = initialBuyHype >= graduationTargetHype;

    const [createdToken] = await db
      .insert(tokens)
      .values({
        creatorId: user.id,
        name,
        ticker,
        category: isStockToken ? "STOCK_TOKEN" : category,
        description,
        logoColor,
        contractAddress: generateEvmAddress(),
        uniswapPoolAddress: graduatedImmediately
          ? `0xUniV3${generateEvmAddress().slice(6)}`
          : null,
        stage: graduatedImmediately ? "GRADUATED_UNISWAP" : "BONDING",
        targetPath,
        priceUsd,
        priceHype,
        change24h: initialBuyHype > 0 ? 4.8 : 0,
        marketCapUsd,
        volume24hUsd: Number((initialBuyHype * HYPE_PRICE_USD).toFixed(2)),
        virtualHypeReserves: Number(virtualHype.toFixed(4)),
        virtualTokenReserves: Number(virtualTokens.toFixed(4)),
        realHypeRaised: Number(initialBuyHype.toFixed(4)),
        graduationTargetHype,
        bondingProgress,
        totalSupply,
        holdersCount: initialBuyHype > 0 ? 1 : 0,
        isStockToken,
        underlyingTicker,
        underlyingExchange,
        oracleProvider: isStockToken
          ? "HyperCore Precompile + Pyth 24/7 Equity"
          : "HyperCore Spot Mark Precompile",
        backingRatio: isStockToken ? 100.0 : null,
        isinCode,
        maxLeverage,
        fundingRateHourly: 0.0012,
        openInterestUsd: 0,
        hip3StakedHype: 500000,
        launchPaymentMethod: paymentMethod,
        xMoneyReceiptId: xMoneyReceiptCode,
        twitterUrl: body.twitterUrl ? String(body.twitterUrl).trim() : null,
        websiteUrl: body.websiteUrl ? String(body.websiteUrl).trim() : null,
      })
      .returning();

    if (tokensBought > 0) {
      const actualUnits = isStockToken
        ? Number(((initialBuyHype * HYPE_PRICE_USD) / priceUsd).toFixed(4))
        : Number(tokensBought.toFixed(2));

      await db.insert(tokenHoldings).values({
        userId: user.id,
        tokenId: createdToken.id,
        balance: actualUnits,
        avgBuyPriceUsd: priceUsd,
      });

      await db.insert(spotTrades).values({
        tokenId: createdToken.id,
        userId: user.id,
        traderLabel: user.xHandle || user.username,
        side: "BUY",
        venue: graduatedImmediately ? "UNISWAP_V3" : "ELYSIUM_CURVE",
        paymentMethod,
        amountToken: actualUnits,
        amountHype: Number(initialBuyHype.toFixed(4)),
        amountUsd: Number((initialBuyHype * HYPE_PRICE_USD).toFixed(2)),
        priceUsd,
        txHash: generateTxHash(),
      });
    }

    return NextResponse.json({
      token: createdToken,
      xMoneyReceiptCode,
    });
  } catch (error) {
    console.error("Create token error:", error);
    return NextResponse.json(
      { error: "Failed to launch token on Elysium" },
      { status: 500 }
    );
  }
}
