import fs from "node:fs"
import { FastifyInstance, FastifyReply, FastifyRequest } from "fastify"
import extractRangeData from "./range-request"


async function routes(fastify: FastifyInstance) {
    // Main route
    fastify.get('/', async () => {
        return fs.createReadStream("./index.html")
    })

    // Video Streaming
    fastify.get("/video-streaming", async (request: FastifyRequest, reply: FastifyReply) => {
        try {
            const videoPath = "./video.mp4"

            // Check if video exists
            if (!fs.existsSync(videoPath)) {
                reply.code(404)
                throw new Error("Video file not found!")
            }

            const videoSize = fs.statSync(videoPath).size
            const range = extractRangeData(request, request.headers, videoSize)

            request.log.info({ range })

            if (!range) {
                reply.code(416)
                throw new Error("Range not satisfiable!")
            }

            // Only single range are suppoerted (Multiple requested ranges are discarted)
            const singleRange = range.ranges[0]
            const chunkSize = 4 * 1e6; // 4MB chunks
            const start = singleRange.start
            const end = Math.min(
                singleRange.end || (start + chunkSize - 1),
                videoSize - 1
            )
            const contentLength = end - start + 1

            // Set appropriate headers for partial content
            reply.headers({
                'Accept-Ranges': 'bytes',
                'Content-Range': `bytes ${start}-${end}/${videoSize}`,
                'Content-Length': contentLength,
                'Content-Type': 'video/mp4',
                // Adding support for server timing headers.
                'Server-Timing': `range;desc="bytes ${start}-${end}/${videoSize}"`
            })

            reply.code(206) // Partial Content

            // Create read stream for the specified range
            const stream = fs.createReadStream(videoPath, { start, end });

            // Handle stream errors
            stream.on('error', (error) => {
                request.log.error(error);
                reply.code(500).send('Internal Server Error');
            });

            return stream;
        } catch (error) {
            request.log.error(error)
            if (!reply.statusCode || reply.statusCode === 200) {
                reply.code(500)
            }
            throw error
        }
    })
}

export default routes

// Sources
// https://www.nearform.com/digital-community/how-to-implement-video-streaming-with-fastify/
// https://github.com/Eomm/fastify-range
// https://stackoverflow.com/q/21765555/3309466
// https://developer.mozilla.org/en-US/docs/Web/HTTP/Range_requests
// https://developer.mozilla.org/en-US/docs/Web/HTTP/Status/206
// https://fastify.dev/docs/latest/Guides/Getting-Started/
// https://developer.mozilla.org/en-US/docs/Web/HTTP/Headers/Server-Timing

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