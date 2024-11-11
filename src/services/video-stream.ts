import fs from "node:fs"
import { FastifyReply, FastifyRequest } from "fastify"

import extractRangeData from "../range-request"
import config from "../config"

/**
 * Interface for configuration validation
 */
interface VideoConfig {
    path: string;
    chunkSize: number;
    maxRanges: number;
}

/**
 * Interface for video stream errors
 */
export interface VideoStreamError {
    statusCode: number;
    message: string;
    name: string
}

/**
 * Error thrown when the requested video file is not found
 */
class VideoNotFoundError extends Error implements VideoStreamError {
    statusCode = 404;
    name = "VideoNotFoundError"
    constructor() {
        super('Video file not found!');
    }
}

/**
 * Error thrown when the requested range is not satisfiable
 */
class RangeNotSatisfiableError extends Error implements VideoStreamError {
    statusCode = 416;
    name = "RangeNotSatisfiableError"
    constructor() {
        super('Range not satisfiable!');
    }
}

/**
 * Service class for handling video streaming functionality
 */
class VideoStreamService {
    private readonly videoPath: string;
    private readonly chunkSize: number;
    // Limit number of ranges
    private readonly maxRangesIndex: number;

    /**
   * Initialize the video streaming service
   * @throws {Error} If configuration is invalid
   */
    constructor() {
        this.validateConfig(config.video);

        this.videoPath = config.video.path;
        this.chunkSize = config.video.chunkSize;
        this.maxRangesIndex = config.video.maxRanges - 1;

        // Bind methods to preserve 'this' context
        this.createStream = this.createStream.bind(this);
    }

    /**
   * Validate the video configuration
   * @param config - The video configuration object
   * @throws {Error} If configuration is invalid
   */
    private validateConfig(config: VideoConfig): void {
        if (!config.path) {
            throw new Error('Video path is required in configuration');
        }
        if (config.chunkSize <= 0) {
            throw new Error('Chunk size must be greater than 0');
        }
        if (config.maxRanges <= 0) {
            throw new Error('Max ranges must be greater than 0');
        }
    }

    /**
   * Create a video stream for the requested range
   * @param request - Fastify request object
   * @param reply - Fastify reply object
   * @returns A readable stream for the video chunk
   * @throws {VideoNotFoundError} If video file is not found
   * @throws {RangeNotSatisfiableError} If range is not satisfiable
   */
    public async createStream(request: FastifyRequest, reply: FastifyReply): Promise<fs.ReadStream> {
        try {
            // Verify video file exists
            if (!fs.existsSync(this.videoPath)) {
                reply.code(404)
                throw new VideoNotFoundError()
            }

            const stat = await fs.promises.stat(this.videoPath)
            const videoSize = stat.size;
            const range = extractRangeData(request, videoSize)

            request.log.info({ range }, "Received range request")

            if (!range) {
                reply.code(416)
                throw new RangeNotSatisfiableError()
            }

            // Only single range are suppoerted (Multiple requested ranges are discarted)
            const singleRange = range.ranges[this.maxRangesIndex]
            const start = singleRange.start
            // To avoid request an range end that is out of video boundaries.
            const end = Math.min(
                singleRange.end || (start + this.chunkSize - 1),
                videoSize - 1
            )
            const contentLength = end - start + 1

            // Set appropriate headers for partial content
            reply.headers({
                'Accept-Ranges': 'bytes',
                'Content-Range': `bytes ${start}-${end}/${videoSize}`,
                // Remaining video content counting from start range.
                'Content-Length': contentLength,
                'Content-Type': 'video/mp4',
                // Adding support for server timing headers.
                'Server-Timing': `range;desc="bytes ${start}-${end}/${videoSize}"`
            })

            reply.code(206) // Partial Content

            // Create read stream for the specified range
            const stream = fs.createReadStream(this.videoPath, { start, end });

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
    }
}

// Export singleton instance
export const videoStreamService = new VideoStreamService()