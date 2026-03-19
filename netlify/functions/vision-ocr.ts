/**
 * Test endpoint:
 * POST /.netlify/functions/vision-ocr
 * Body:
 * {
 *   "base64": "BASE64_FILE"
 * }
 */
import { Handler } from "@netlify/functions";
import vision from "@google-cloud/vision";

const client = new vision.ImageAnnotatorClient({
  keyFilename: "secrets/google-vision-key.json",
});

export const handler: Handler = async (event) => {
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
    console.error("OCR ERROR:", error);

    return {
      statusCode: 500,
      body: JSON.stringify({
        error: error.message,
      }),
    };
  }
};
