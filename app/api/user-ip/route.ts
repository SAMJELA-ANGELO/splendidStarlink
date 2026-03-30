/**
 * Detects and returns the user's IP address from the request.
 * Useful for capturing device IP during captive portal flow.
 */

export async function GET(request: Request) {
  try {
    // Get IP from various headers (depending on proxy/load balancer setup)
    const ip = 
      request.headers.get('x-forwarded-for')?.split(',')[0].trim() ||
      request.headers.get('x-real-ip') ||
      request.headers.get('cf-connecting-ip') ||
      request.headers.get('x-client-ip') ||
      'unknown';

    return Response.json({
      ip: ip,
      success: true,
    });
  } catch (error) {
    console.error('Error detecting IP:', error);
    return Response.json(
      { success: false, error: 'Could not detect IP' },
      { status: 500 }
    );
  }
}
