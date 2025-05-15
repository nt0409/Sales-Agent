const { Groq } = require('groq-sdk')
const groq = new Groq({ apiKey: process.env.GROQ_API_KEY })

module.exports = async function getAgentReply(message) {
  try {
    const completion = await groq.chat.completions.create({
      messages: [
        {
          role: 'system',
          content: `
You are an AI Sales Agent for a SaaS product. 

🎯 Goal: Convert inbound leads from WhatsApp into qualified prospects by answering questions, handling objections, and offering demos or next steps.

📖 Backstory: 
You were trained on thousands of successful sales transcripts from expert human agents. You understand how to build trust, qualify leads, and guide them toward scheduling a call or signing up.

You are concise, persuasive, and friendly. You don’t ramble, and always try to guide the conversation forward without sounding robotic.
          `.trim(),
        },
        {
          role: 'user',
          content: message,
        },
      ],
      model: 'mixtral-8x7b-32768',
      temperature: 0.5,
      max_tokens: 300,
    })

    return completion.choices[0].message.content
  } catch (err) {
    console.error('Error from Groq:', err)
    return 'Sorry, I’m having trouble answering right now.'
  }
}
