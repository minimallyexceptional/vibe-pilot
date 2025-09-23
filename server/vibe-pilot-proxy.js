import 'dotenv/config'
import express from 'express'
import cors from 'cors'

const app = express()
const allowedOrigins = process.env.VIBE_PILOT_PROXY_ORIGINS?.split(',')
  .map((origin) => origin.trim())
  .filter(Boolean)
app.use(
  cors({
    origin: allowedOrigins && allowedOrigins.length > 0 ? allowedOrigins : true,
  }),
)
app.use(express.json())

const port = Number(process.env.PORT ?? 8787)
const openAiBaseUrl = (process.env.OPENAI_BASE_URL || 'https://api.openai.com').replace(/\/$/, '')
const openAiApiKey = process.env.OPENAI_API_KEY
const defaultModel = process.env.OPENAI_MODEL?.trim()

if (!openAiApiKey) {
  console.warn('Warning: OPENAI_API_KEY is not set. Requests will fail until it is configured.')
}

app.post('/v1/chat/completions', async (req, res) => {
  try {
    if (!openAiApiKey) {
      return res
        .status(500)
        .json({ error: { message: 'OPENAI_API_KEY is not configured on the proxy.' } })
    }

    const payload = typeof req.body === 'object' && req.body !== null ? { ...req.body } : {}

    if (!Array.isArray(payload.messages) || payload.messages.length === 0) {
      return res.status(400).json({ error: { message: 'A messages array is required.' } })
    }

    if (!payload.model) {
      if (!defaultModel) {
        return res.status(400).json({
          error: {
            message: 'A model must be provided in the request body or OPENAI_MODEL env variable.',
          },
        })
      }
      payload.model = defaultModel
    }

    const response = await fetch(openAiBaseUrl + '/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: 'Bearer ' + openAiApiKey,
      },
      body: JSON.stringify(payload),
    })

    if (!response.ok) {
      const errorBody = await response.text()
      return res.status(response.status).send(errorBody || 'OpenAI completion request failed.')
    }

    const data = await response.json()
    const content = data?.choices?.[0]?.message?.content ?? data?.content ?? ''

    return res.json({
      content,
      isMock: false,
    })
  } catch (error) {
    console.error('Vibe Pilot proxy error:', error)
    return res.status(500).json({
      error: {
        message: error instanceof Error ? error.message : 'Unexpected proxy error.',
      },
    })
  }
})

app.get('/health', (req, res) => {
  res.json({ status: 'ok' })
})

app.listen(port, () => {
  console.log('Vibe Pilot proxy listening on port ' + port)
})
