const dotenv = require('dotenv');
import { serve } from '@hono/node-server'
import { Hono } from 'hono'


dotenv.config();


const app = new Hono()

app.get('/', (c) => {
  return c.text('Hello Hono!')
})

const port = 9797
console.log(`Server is running on port ${port}`)

serve({
  fetch: app.fetch,
  port
})
