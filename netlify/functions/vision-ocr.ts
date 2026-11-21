/**
 * Test endpoint:
 * POST /.netlify/functions/vision-ocr
 * Headers: Authorization: Bearer <Supabase JWT>
 * Body:
 * {
 *   "base64": "BASE64_FILE"
 * }
 */
import { Handler } from "@netlify/functions";
import vision from "@google-cloud/vision";
import { verifyAuth } from "./_shared/verifyAuth.js";

const client = new vision.ImageAnnotatorClient({
  keyFilename: "secrets/google-vision-key.json",
});

export const handler: Handler = async (event) => {
  // Paid Google Vision calls require a verified Supabase user.
  const auth = await verifyAuth(event);
  if (!auth.userId) {
    return {
      statusCode: 401,
      body: JSON.stringify({ error: "Unauthorized" }),
    };
  }

  try {
    const { base64 } = JSON.parse(event.body || "{}");

    if (!base64) {
      return {
        statusCode: 400,
        body: JSON.stringify({ error: "Missing base64 file" }),
      };
    }

    const [result] = await client.documentTextDetection({
      image: { content: base64 },
    });

    const text = result.fullTextAnnotation?.text || "";

    return {
      statusCode: 200,
      body: JSON.stringify({
        success: true,
        text,
      }),
    };
  } catch (error: any) {
    // Never echo provider/credential error text (it can include the key file path).
    console.error("OCR ERROR:", error?.name || "Error");

    return {
      statusCode: 500,
      body: JSON.stringify({
        error: "OCR failed",
      }),
    };
  }
};
