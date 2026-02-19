import { NextRequest, NextResponse } from "next/server";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { formType, pageSlug, data, metadata, timestamp } = body;

    if (metadata.webhookUrl) {
      try {
        await fetch(metadata.webhookUrl, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            formType,
            pageSlug,
            data,
            timestamp,
          }),
        });
      } catch (error) {
        console.error("Webhook error:", error);
      }
    }

    return NextResponse.json({
      success: true,
      message: "Form submitted successfully",
    });

  } catch (error) {
    console.error("Form submission error:", error);

    return NextResponse.json(
      {
        success: false,
        message: "Failed to submit form",
      },
      { status: 500 }
    );
  }
}
