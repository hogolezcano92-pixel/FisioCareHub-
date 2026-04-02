import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { SmtpClient } from "https://deno.land/x/smtp@v0.7.0/mod.ts"

const RESEND_API_KEY = Deno.env.get("RESEND_API_KEY")
const SMTP_USER = Deno.env.get("SMTP_USER")
const SMTP_PASS = Deno.env.get("SMTP_PASS")
const SMTP_HOST = Deno.env.get("SMTP_HOST") || "smtp.gmail.com"
const SMTP_PORT = parseInt(Deno.env.get("SMTP_PORT") || "587")
const SMTP_FROM = Deno.env.get("SMTP_FROM") || SMTP_USER

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders })
  }

  try {
    const { to, subject, body, type = "email" } = await req.json()

    if (type === "email") {
      if (RESEND_API_KEY) {
        // Use Resend API
        const res = await fetch("https://api.resend.com/emails", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "Authorization": `Bearer ${RESEND_API_KEY}`,
          },
          body: JSON.stringify({
            from: SMTP_FROM || "onboarding@resend.dev",
            to,
            subject,
            html: body,
          }),
        })

        if (!res.ok) {
          const error = await res.text()
          throw new Error(`Resend error: ${error}`)
        }

        return new Response(JSON.stringify({ status: "ok", provider: "resend" }), {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
          status: 200,
        })
      } else if (SMTP_USER && SMTP_PASS) {
        // Use SMTP
        const client = new SmtpClient();
        await client.connectTLS({
          hostname: SMTP_HOST,
          port: SMTP_PORT,
          username: SMTP_USER,
          password: SMTP_PASS,
        });

        await client.send({
          from: SMTP_FROM || SMTP_USER,
          to,
          subject,
          content: body,
          html: body, // If body is HTML
        });

        await client.close();

        return new Response(JSON.stringify({ status: "ok", provider: "smtp" }), {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
          status: 200,
        })
      } else {
        throw new Error("No email provider configured (RESEND_API_KEY or SMTP credentials)")
      }
    } else if (type === "sms") {
      const TWILIO_ACCOUNT_SID = Deno.env.get("TWILIO_ACCOUNT_SID")
      const TWILIO_AUTH_TOKEN = Deno.env.get("TWILIO_AUTH_TOKEN")
      const TWILIO_FROM = Deno.env.get("TWILIO_FROM")

      if (!TWILIO_ACCOUNT_SID || !TWILIO_AUTH_TOKEN || !TWILIO_FROM) {
        throw new Error("Twilio credentials missing")
      }

      const res = await fetch(`https://api.twilio.com/2010-04-01/Accounts/${TWILIO_ACCOUNT_SID}/Messages.json`, {
        method: "POST",
        headers: {
          "Authorization": `Basic ${btoa(`${TWILIO_ACCOUNT_SID}:${TWILIO_AUTH_TOKEN}`)}`,
          "Content-Type": "application/x-www-form-urlencoded",
        },
        body: new URLSearchParams({
          To: to,
          From: TWILIO_FROM,
          Body: body,
        }).toString(),
      })

      if (!res.ok) {
        const error = await res.text()
        throw new Error(`Twilio error: ${error}`)
      }

      return new Response(JSON.stringify({ status: "ok", provider: "twilio" }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 200,
      })
    }

    throw new Error("Invalid notification type")
  } catch (error: any) {
    return new Response(JSON.stringify({ error: error.message }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 400,
    })
  }
})
