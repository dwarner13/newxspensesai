// Simple CommonJS-style stub for OCR Netlify function

// No imports, no exports – just module.exports.handler

module.exports.handler = async (event, context) => {
  return {
    statusCode: 200,
    headers: {
      'Content-Type': 'application/json',
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Headers': '*',
    },
    body: JSON.stringify({
      ok: true,
      message: 'OCR stub is working (CommonJS, no _shared imports)',
      event: {
        path: event.path,
        httpMethod: event.httpMethod,
      },
    }),
  };
};
