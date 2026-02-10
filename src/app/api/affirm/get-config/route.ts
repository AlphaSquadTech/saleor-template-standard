import { NextRequest, NextResponse } from "next/server";

interface AffirmData {
  publicApiKey: string;
  environment: string;
  scriptUrl: string;
}

interface GatewayConfig {
  id: string;
  data: AffirmData | null;
  errors: Array<{ field: string | null; message: string; code: string }>;
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { checkoutId, amount } = body;

    if (!checkoutId) {
      return NextResponse.json({ error: "Missing checkoutId parameter" }, { status: 400 });
    }

    const apiUrl = process.env.NEXT_PUBLIC_API_URL;
    if (!apiUrl) {
      return NextResponse.json({ error: "Saleor API URL not configured" }, { status: 500 });
    }

    const token = request.cookies.get("token")?.value;

    const PAYMENT_GATEWAY_INITIALIZE = `
      mutation PaymentGatewayInitialize(
        $checkoutId: ID!
        $amount: PositiveDecimal!
        $paymentGateways: [PaymentGatewayToInitialize!]!
      ) {
        paymentGatewayInitialize(
          id: $checkoutId
          amount: $amount
          paymentGateways: $paymentGateways
        ) {
          gatewayConfigs {
            id
            data
            errors {
              field
              message
              code
            }
          }
          errors {
            field
            message
            code
          }
        }
      }
    `;

    const headers: HeadersInit = { "Content-Type": "application/json" };
    if (token) headers["Authorization"] = `Bearer ${token}`;

    const response = await fetch(apiUrl, {
      method: "POST",
      headers,
      body: JSON.stringify({
        query: PAYMENT_GATEWAY_INITIALIZE,
        variables: {
          checkoutId,
          amount: amount.toString(),
          paymentGateways: [{ id: "saleor.app.affirm" }],
        },
      }),
    });

    if (!response.ok) {
      return NextResponse.json({ error: "Failed to fetch payment gateway configuration" }, { status: response.status });
    }
    
    const data = await response.json();

    if (data.errors) {
      return NextResponse.json({ error: "GraphQL error", details: data.errors }, { status: 400 });
    }

    const gatewayConfigs = data.data?.paymentGatewayInitialize?.gatewayConfigs;
    const affirmConfig = gatewayConfigs?.find((config: GatewayConfig) => config.id === "saleor.app.affirm");

    if (!affirmConfig || !affirmConfig.data) {
      return NextResponse.json({ error: "Affirm payment gateway not available" }, { status: 404 });
    }

    if (affirmConfig.errors && affirmConfig.errors.length > 0) {
      return NextResponse.json({ error: "Affirm configuration error", details: affirmConfig.errors }, { status: 400 });
    }

    const affirmData = affirmConfig.data;

    return NextResponse.json({
      publicApiKey: affirmData.publicApiKey,
      environment: affirmData.environment,
      scriptUrl: affirmData.scriptUrl,
    });
  } catch (error) {
    console.error("Error fetching Affirm config:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
