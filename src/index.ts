// Import fastify
import Fastify from "fastify";
import helmet from "@fastify/helmet"

// Import routes
import mainRoute from "./routes";
import config from "./config";

// Configure logger
const fastify = Fastify({ logger: true })

// Basic security headers will be set
fastify.register(helmet)

// Use the register API to configure a new route
fastify.register(mainRoute)


// Run the server
fastify.listen({ port: config.server.port, host: config.server.host }, (err, address) => {
    if (err) {
        fastify.log.error("something wrong happened")
        process.exit(1)
    }

    fastify.log.info(`Server Running on ${address}`)
})

// https://github.com/fastify/fastify-helmet
// This could cause trouble if some routes has not properky defined their MIME types.
// https://developer.mozilla.org/en-US/docs/Web/HTTP/Headers/X-Content-Type-Options