export async function POST(req) {
  try {
    const body = await req.json();

    console.log("Webhook recebido:", body);

    return new Response(
      JSON.stringify({ received: true }),
      { status: 200 }
    );

  } catch (error) {
    console.error("Erro no webhook:", error);

    return new Response(
      JSON.stringify({ error: "Erro interno" }),
      { status: 500 }
    );
  }
}
