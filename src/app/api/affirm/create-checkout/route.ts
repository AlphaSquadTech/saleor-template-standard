import { NextRequest, NextResponse } from "next/server";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { checkoutId, amount, currency } = body;

    console.log("Affirm create-checkout called with:", { checkoutId, amount, currency });

    if (!checkoutId || !amount || !currency) {
      return NextResponse.json({ error: "Missing required parameters" }, { status: 400 });
    }

    const apiUrl = process.env.NEXT_PUBLIC_API_URL;
    if (!apiUrl) {
      return NextResponse.json({ error: "Saleor API URL not configured" }, { status: 500 });
    }

    const token = request.cookies.get("token")?.value;

    const TRANSACTION_INITIALIZE = `
      mutation TransactionInitialize(
        $id: ID!
        $amount: PositiveDecimal!
        $paymentGateway: PaymentGatewayToInitialize!
      ) {
        transactionInitialize(
          id: $id
          amount: $amount
          paymentGateway: $paymentGateway
        ) {
          transaction {
            id
            actions
          }
          transactionEvent {
            pspReference
            amount {
              amount
              currency
            }
            type
          }
          data
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

    console.log("Calling Saleor API:", apiUrl);
    console.log("With variables:", { 
      id: checkoutId, 
      amount: amount.toString(), 
      paymentGateway: { id: "saleor.app.affirm", data: null }
    });

    const response = await fetch(apiUrl, {
      method: "POST",
      headers,
      body: JSON.stringify({
        query: TRANSACTION_INITIALIZE,
        variables: {
          id: checkoutId,
          amount: amount.toString(),
          paymentGateway: {
            id: "saleor.app.affirm",
            data: null,
          },
        },
      }),
    });

    console.log("Saleor API response status:", response.status);

    const data = await response.json();
    console.log("Saleor API response:", JSON.stringify(data, null, 2));

    if (!response.ok) {
      console.error("Saleor API request failed:", response.status, data);
      return NextResponse.json({ error: "Failed to initialize transaction" }, { status: response.status });
    }

    if (data.errors) {
      console.error("GraphQL errors:", data.errors);
      return NextResponse.json({ error: "GraphQL error", details: data.errors }, { status: 400 });
    }

    const result = data.data?.transactionInitialize;
    
    if (result?.errors && result.errors.length > 0) {
      console.error("Transaction initialization errors:", result.errors);
      return NextResponse.json({ error: "Transaction initialization failed", details: result.errors }, { status: 400 });
    }

    const transactionData = result?.data;
    console.log("Transaction data received:", transactionData);
    
    if (!transactionData?.checkout_token) {
      console.error("No checkout token in response:", transactionData);
      return NextResponse.json({ error: "No checkout token received" }, { status: 500 });
    }

    return NextResponse.json({
      checkoutToken: transactionData.checkout_token,
      checkoutUrl: transactionData.checkout_url,
      transactionId: result.transaction?.id,
      publicApiKey: transactionData.public_api_key,
      scriptUrl: transactionData.script_url,
      environment: transactionData.environment,
    });
  } catch (error) {
    console.error("Error creating Affirm checkout:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
