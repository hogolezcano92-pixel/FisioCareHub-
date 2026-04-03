import OpenAI from 'openai';

export default async function handler(req, res) {
  const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

  try {
    const { prompt } = req.body;
    const response = await openai.chat.completions.create({
      model: "gpt-3.5-turbo",
      messages: [{ role: "user", content: prompt }],
    });
    return res.status(200).json({ text: response.choices[0].message.content });
  } catch (error) {
    return res.status(500).json({ error: error.message });
  }
}
