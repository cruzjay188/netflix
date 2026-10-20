// hello-world: the simplest Edge Function (AI-9, Part I).
// Returns { "message": "Hello World" } as JSON to anyone who calls it.

// CORS headers let a web page on another origin (like http://localhost:5173) read the response.
const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
};

Deno.serve((req) => {
  // The browser's "preflight" check: answer it with the CORS headers and no body.
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  return new Response(JSON.stringify({ message: "Hello World" }), {
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
});
