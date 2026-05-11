export async function GET() {
  try {
    const res = await fetch("http://localhost:8000/api/ai/health", {
      method: "GET",
    });

    if (res.ok) {
      return Response.json({
        success: true,
        status: "healthy",
      });
    }

    return Response.json({
      success: false,
      status: "down",
    });
  } catch {
    return Response.json({
      success: false,
      status: "down",
    });
  }
}