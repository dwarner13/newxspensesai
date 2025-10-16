import type { Handler } from '@netlify/functions'

export const handler: Handler = async (event) => {
  console.log('Test function called');
  
  return {
    statusCode: 200,
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({ 
      message: 'Test function works!',
      timestamp: new Date().toISOString()
    })
  }
}
