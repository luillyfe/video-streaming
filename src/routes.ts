import { FastifyInstance, FastifyReply, FastifyRequest } from "fastify"
import { VideoStreamError, videoStreamService } from "./services/video-stream"
import { htmlCache } from "./htmlCache";

// Define constant for content types
const CONTENT_TYPES = {
    HTML: 'text/html',
} as const

// Define interface for CSP nonce patterns
interface CSPNoncePatterns {
    readonly SCRIPT: RegExp;
    readonly STYLE: RegExp;
}

const CSP_NONCE_PATTERNS: CSPNoncePatterns = {
    SCRIPT: /<script>/g,
    STYLE: /<style>/g,
} as const

/**
 * Replaces HTML tags with nonce-enabled versions
 * @param html - Original HTML content
 * @param nonces - CSP nonces for script and style
 * @returns HTML content with nonces
 */
function injectNonces(html: string, nonces: { script: string; style: string }): string {
    return html
        .replace(CSP_NONCE_PATTERNS.SCRIPT, `<script nonce="${nonces.script}">`)
        .replace(CSP_NONCE_PATTERNS.STYLE, `<style nonce="${nonces.style}">`)
}


/**
 * Configures routes for the Fastify instance
 * @param fastify - Fastify instance
 */
async function configureRoutes(fastify: FastifyInstance) {
    // Intercept all errors related to streaming
    fastify.setErrorHandler((error: VideoStreamError, request: FastifyRequest, reply: FastifyReply) => {
        request.log.error(error)
        reply.status(error.statusCode).send({
            error: error.name,
            message: error.message,
            statusCode: error.statusCode
        })
    })

    // Configures the main route with CSP nonces
    fastify.get('/', {
        helmet: {
            // TODO: Consider removing CSP nonces as per Mozilla's recommendation
            enableCSPNonces: true
        }
    }, async (request: FastifyRequest, reply: FastifyReply) => {
        try {
            // HTML cache manager
            const html = await htmlCache.getHTML()
            const nonceEnabledHtml = injectNonces(html, {
                script: reply.cspNonce.script,
                style: reply.cspNonce.style
            })

            reply.header('Content-Type', CONTENT_TYPES.HTML)


            return reply.send(nonceEnabledHtml)
        } catch (error) {
            reply.log.error(error)
            throw error
        }
    })

    // Configures the video streaming route
    fastify.get("/video-streaming", videoStreamService.createStream)
}

export default configureRoutes

// Sources
// https://www.nearform.com/digital-community/how-to-implement-video-streaming-with-fastify/
// https://github.com/Eomm/fastify-range
// https://stackoverflow.com/q/21765555/3309466
// https://developer.mozilla.org/en-US/docs/Web/HTTP/Range_requests
// https://developer.mozilla.org/en-US/docs/Web/HTTP/Status/206
// https://fastify.dev/docs/latest/Guides/Getting-Started/
// https://developer.mozilla.org/en-US/docs/Web/HTTP/Headers/Server-Timing
// https://fastify.dev/docs/v5.1.x/Reference/Errors/#errors-in-fastify-lifecycle-hooks-and-a-custom-error-handler
// https://github.com/fastify/fastify-helmet?tab=readme-ov-file#example---fastifyhelmet-configuration-using-the-helmet-shorthand-route-option
// https://developer.mozilla.org/en-US/docs/Web/HTML/Global_attributes/nonce
// https://developer.mozilla.org/en-US/docs/Web/HTTP/Headers/Content-Security-Policy/script-src
// https://github.com/fastify/fastify-helmet?tab=readme-ov-file#content-security-policy-nonce

// Note From Mozilla Foundation: Only use nonce for cases where you have no way around using unsafe inline script 
// or style contents. If you don't need nonce, don't use it. If your script is static, 
// you could also use a CSP hash instead. (See usage notes on unsafe inline script.) 
// Always try to take full advantage of CSP protections and avoid nonces or unsafe inline scripts whenever possible.

// Range header
// bytes 19005440-19051281/19051282
// bytes 2031616-3031615/19051282
// bytes 2228224-3228223/19051282
// bytes 2490368-3490367/19051282
// bytes 2850816-3850815/19051282
// bytes 3047424-4047423/19051282
// bytes 3244032-4244031/19051282
// bytes 3506176-4506175/19051282
// bytes 3833856-4833855/19051282