import { NextResponse } from "next/server";
import { db } from "@/db";
import {
  tokens,
  users,
  tickerAuctions,
  xMoneyPayments,
  spotTrades,
  tokenHoldings,
} from "@/db/schema";
import { and, eq } from "drizzle-orm";
import {
  generateEvmAddress,
  generateTxHash,
  getCurrentUser,
} from "@/lib/auth";
import { HIP1_CURRENT_AUCTION_HYPE, HYPE_PRICE_USD } from "@/lib/constants";

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json(
        { error: "Sign in or connect Demo Whale account to execute graduation actions" },
        { status: 401 }
      );
    }

    const { id } = await params;
    const tokenId = Number(id);
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
    const action = String(body.action || "");
    const paymentMethod = String(body.paymentMethod || "HYPE");

    if (action === "ACCELERATE_GRADUATE") {
      if (token.stage !== "BONDING") {
        return NextResponse.json(
          { error: "Token has already graduated from the bonding curve" },
          { status: 400 }
        );
      }

      const remainingHype = Math.max(
        1,
        Number((token.graduationTargetHype - token.realHypeRaised).toFixed(4))
      );
      const remainingUsd = Number((remainingHype * HYPE_PRICE_USD).toFixed(2));

      if (paymentMethod === "X_MONEY") {
        if (user.xMoneyBalanceUsd < remainingUsd) {
          return NextResponse.json(
            {
              error: `Insufficient X Money balance ($${remainingUsd.toFixed(
                2
              )} required to fill remaining curve). Top up in Wallet.`,
            },
            { status: 400 }
          );
        }
        const cashback = Number((remainingUsd * 0.03).toFixed(2));
        await db
          .update(users)
          .set({
            xMoneyBalanceUsd: Number(
              (user.xMoneyBalanceUsd - remainingUsd + cashback).toFixed(2)
            ),
          })
          .where(eq(users.id, user.id));

        await db.insert(xMoneyPayments).values({
          userId: user.id,
          xHandle: user.xHandle,
          paymentRail: "X_VISA_VIRTUAL_CARD",
          purpose: "SPOT_BUY",
          amountUsd: remainingUsd,
          convertedHype: remainingHype,
          cashbackUsd: cashback,
          receiptCode: `XM-GRAD-${Math.floor(10000 + Math.random() * 89999)}`,
          status: "SETTLED",
        });
      } else {
        if (user.hypeBalance < remainingHype) {
          return NextResponse.json(
            {
              error: `Insufficient HYPE balance (${remainingHype} HYPE required to hit 100% graduation). Claim Faucet in Wallet!`,
            },
            { status: 400 }
          );
        }
        await db
          .update(users)
          .set({
            hypeBalance: Number((user.hypeBalance - remainingHype).toFixed(4)),
          })
          .where(eq(users.id, user.id));
      }

      const newPriceUsd = Number((token.priceUsd * 1.12).toFixed(5));
      const newPriceHype = Number((newPriceUsd / HYPE_PRICE_USD).toFixed(8));
      const tokensReceived = Number((remainingUsd / newPriceUsd).toFixed(4));
      const uniPool = `0xUniV3${generateEvmAddress().slice(6)}`;

      const [updated] = await db
        .update(tokens)
        .set({
          stage: "GRADUATED_UNISWAP",
          realHypeRaised: token.graduationTargetHype,
          bondingProgress: 100,
          uniswapPoolAddress: uniPool,
          priceUsd: newPriceUsd,
          priceHype: newPriceHype,
          change24h: Number((token.change24h + 12.0).toFixed(2)),
          marketCapUsd: Number((newPriceUsd * token.totalSupply).toFixed(2)),
          volume24hUsd: Number((token.volume24hUsd + remainingUsd).toFixed(2)),
        })
        .where(eq(tokens.id, token.id))
        .returning();

      const existingHoldings = await db
        .select()
        .from(tokenHoldings)
        .where(
          and(
            eq(tokenHoldings.userId, user.id),
            eq(tokenHoldings.tokenId, token.id)
          )
        )
        .limit(1);

      if (existingHoldings.length) {
        await db
          .update(tokenHoldings)
          .set({
            balance: Number(
              (existingHoldings[0].balance + tokensReceived).toFixed(4)
            ),
          })
          .where(eq(tokenHoldings.id, existingHoldings[0].id));
      } else {
        await db.insert(tokenHoldings).values({
          userId: user.id,
          tokenId: token.id,
          balance: tokensReceived,
          avgBuyPriceUsd: newPriceUsd,
        });
      }

      await db.insert(spotTrades).values({
        tokenId: token.id,
        userId: user.id,
        traderLabel: user.xHandle || user.username,
        side: "BUY",
        venue: "UNISWAP_V3",
        paymentMethod,
        amountToken: tokensReceived,
        amountHype: remainingHype,
        amountUsd: remainingUsd,
        priceUsd: newPriceUsd,
        txHash: generateTxHash(),
      });

      return NextResponse.json({ token: updated });
    }

    if (action === "BUY_TICKER_HYPERCORE") {
      if (token.stage === "BONDING") {
        return NextResponse.json(
          { error: "Token must graduate to Uniswap V3 Pool before HIP-1 Ticker Auction" },
          { status: 400 }
        );
      }

      const minuteCycle = (Date.now() / 60000) % 60;
      const auctionCostHype = Number(
        Math.max(28.5, HIP1_CURRENT_AUCTION_HYPE - minuteCycle * 0.18).toFixed(2)
      );
      const auctionCostUsd = Number(
        (auctionCostHype * HYPE_PRICE_USD).toFixed(2)
      );

      if (paymentMethod === "X_MONEY") {
        if (user.xMoneyBalanceUsd < auctionCostUsd) {
          return NextResponse.json(
            { error: "Insufficient X Money balance for HIP-1 Ticker Auction" },
            { status: 400 }
          );
        }
        const cashback = Number((auctionCostUsd * 0.03).toFixed(2));
        await db
          .update(users)
          .set({
            xMoneyBalanceUsd: Number(
              (user.xMoneyBalanceUsd - auctionCostUsd + cashback).toFixed(2)
            ),
          })
          .where(eq(users.id, user.id));

        await db.insert(xMoneyPayments).values({
          userId: user.id,
          xHandle: user.xHandle,
          paymentRail: "X_PASSKEY_INSTANT",
          purpose: "TICKER_AUCTION",
          amountUsd: auctionCostUsd,
          convertedHype: auctionCostHype,
          cashbackUsd: cashback,
          receiptCode: `XM-HIP1-${Math.floor(10000 + Math.random() * 89999)}`,
          status: "SETTLED",
        });
      } else {
        if (user.hypeBalance < auctionCostHype) {
          return NextResponse.json(
            {
              error: `Insufficient HYPE balance (${auctionCostHype} HYPE required for HIP-1 Dutch Auction)`,
            },
            { status: 400 }
          );
        }
        await db
          .update(users)
          .set({
            hypeBalance: Number((user.hypeBalance - auctionCostHype).toFixed(4)),
          })
          .where(eq(users.id, user.id));
      }

      const mirrorAddr = `0x998${generateEvmAddress().slice(5)}`;
      const depositWallet = `0xDeP0517${generateEvmAddress().slice(9)}`;
      const spotId = `HC-SPOT-${Math.floor(130 + Math.random() * 850)}`;

      const [updated] = await db
        .update(tokens)
        .set({
          stage: "HYPERCORE_SPOT",
          targetPath: "FULL_HIP3_PIPELINE",
          hyperEvmMirrorAddress: mirrorAddr,
          depositWalletAddress: depositWallet,
          hyperCoreSpotId: spotId,
          tickerAuctionCostHype: auctionCostHype,
        })
        .where(eq(tokens.id, token.id))
        .returning();

      await db.insert(tickerAuctions).values({
        tokenId: token.id,
        userId: user.id,
        ticker: token.ticker,
        clearingPriceHype: auctionCostHype,
        clearingPriceUsd: auctionCostUsd,
        paymentMethod,
        hyperCoreAssetId: spotId,
        txHash: generateTxHash(),
      });

      return NextResponse.json({ token: updated });
    }

    if (action === "DEPLOY_HIP3_PERP") {
      if (token.stage !== "HYPERCORE_SPOT" && token.stage !== "TICKER_ACQUIRED") {
        return NextResponse.json(
          {
            error:
              "Acquire ticker and link HyperCore Spot Orderbook before deploying HIP-3 Perp",
          },
          { status: 400 }
        );
      }

      const perpSymbol = `${token.ticker}-PERP`;
      const requestedLeverage = Math.max(
        5,
        Math.min(50, Number(body.maxLeverage) || token.maxLeverage || 25)
      );

      const [updated] = await db
        .update(tokens)
        .set({
          stage: "HIP3_PERP_LIVE",
          hip3PerpSymbol: perpSymbol,
          maxLeverage: requestedLeverage,
          hip3StakedHype: 500000,
          openInterestUsd: Math.max(token.openInterestUsd, 250000),
          oracleProvider: token.isStockToken
            ? "HyperCore Precompile + Pyth 24/7 Equity"
            : "HyperCore Spot CLOB Precompile + ElysiumCoreWriter",
        })
        .where(eq(tokens.id, token.id))
        .returning();

      return NextResponse.json({ token: updated });
    }

    return NextResponse.json({ error: "Unknown lifecycle action" }, { status: 400 });
  } catch (error) {
    console.error("Lifecycle transition error:", error);
    return NextResponse.json(
      { error: "Lifecycle step failed" },
      { status: 500 }
    );
  }
}
