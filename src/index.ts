import 'dotenv/config'
// Import fastify
import Fastify from "fastify";
// Import routes
import mainRoute from "./routes";

// Configure logger
const fastify = Fastify({ logger: true })

// Use the register API to configure a new route
fastify.register(mainRoute)


// Run the server
fastify.listen({ port: 3000 }, (err, address) => {
    if (err) {
        fastify.log.error("something wrong happened")
        process.exit(1)
    }

    fastify.log.info(`Server Running on ${address}`)
})