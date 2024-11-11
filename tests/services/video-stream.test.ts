import tap from 'tap'
import { FastifyRequest, FastifyReply, FastifyBaseLogger } from 'fastify'
import { Readable } from 'stream'

import { videoStreamService } from '../../src/services/video-stream'


// Mock implementations
const mockRequest = (rangeHeader?: string): Partial<FastifyRequest> => ({
    headers: {
        range: rangeHeader
    },
    log: {
        info: () => { },
        error: () => { },
        // Double type casting
    } as Partial<FastifyBaseLogger> as FastifyBaseLogger
})

const mockReply = (): Partial<FastifyReply> => {
    const headers: Record<string, string> = {}
    const replay = {
        statusCode: 200,
        code: (code: number) => {
            replay.statusCode = code
            return replay
        },
        headers: (h: Record<string, string>) => {
            Object.assign(headers, h)
            return replay
        },
        getHeaders: () => headers,
        send: () => replay
    }

    return replay as Partial<FastifyReply>
}

tap.test('VideoStreamService - Successful stream creation', async (t) => {
    const request = mockRequest('bytes=0-1023') as FastifyRequest
    const reply = mockReply() as FastifyReply

    const stream = await videoStreamService.createStream(request, reply)

    t.ok(stream instanceof Readable, 'Should return a readable stream')
    t.equal(reply.statusCode, 206, 'Should set status code to 206 Partial Content')

    const headers = reply.getHeaders()
    t.ok(headers['Accept-Ranges'], 'Should set Accept-Ranges header')
    t.ok(headers['Content-Range'], 'Should set Content-Range header')
    t.ok(headers['Content-Length'], 'Should set Content-Length header')
    t.equal(headers['Content-Type'], 'video/mp4', 'Should set Content-Type header')
})

tap.test('VideoStreamService - No range header', async (t) => {
    const request = mockRequest() as FastifyRequest
    const reply = mockReply() as FastifyReply

    await t.rejects(
        videoStreamService.createStream(request, reply),
        { name: 'RangeNotSatisfiableError' },
        'Should throw RangeNotSatisfiableError'
    )
    t.equal(reply.statusCode, 416, 'Should set status code to 416')
})

tap.test('VideoStreamService - Invalid range format', async (t) => {
    const request = mockRequest('invalid-range') as FastifyRequest
    const reply = mockReply() as FastifyReply

    await t.rejects(
        videoStreamService.createStream(request, reply),
        { name: 'RangeNotSatisfiableError' },
        'Should throw RangeNotSatisfiableError'
    )
    t.equal(reply.statusCode, 416, 'Should set status code to 416')
})

tap.test('VideoStreamService - Range exceeds file size', async (t) => {
    const request = mockRequest('bytes=29999999-99999999') as FastifyRequest
    const reply = mockReply() as FastifyReply

    await t.rejects(
        videoStreamService.createStream(request, reply),
        { name: 'RangeNotSatisfiableError' },
        'Should throw RangeNotSatisfiableError'
    )
    t.equal(reply.statusCode, 416, 'Should set status code to 416')
})

tap.test('VideoStreamService - Multiple ranges', async (t) => {
    const request = mockRequest('bytes=0-1023,1024-2047') as FastifyRequest
    const reply = mockReply() as FastifyReply

    const stream = await videoStreamService.createStream(request, reply)

    t.ok(stream instanceof Readable, 'Should return a readable stream')
    t.equal(reply.statusCode, 206, 'Should set status code to 206')

    const headers = reply.getHeaders()
    const contentRange = headers['Content-Range'] as string
    t.ok(contentRange.startsWith('bytes 0-'), 'Should use only the first range')
})

tap.test('VideoStreamService - Stream error handling', async (t) => {
    const request = mockRequest('bytes=0-1023') as FastifyRequest
    const reply = mockReply() as FastifyReply

    const stream = await videoStreamService.createStream(request, reply)

    // Simulate stream error
    stream.emit('error', new Error('Stream error'))

    t.equal(reply.statusCode, 500, 'Should set status code to 500 on stream error')
})

// Test actual stream content
tap.test('VideoStreamService - Stream content verification', async (t) => {
    const request = mockRequest('bytes=0-1023') as FastifyRequest
    const reply = mockReply() as FastifyReply

    const stream = await videoStreamService.createStream(request, reply)

    return new Promise<void>((resolve, reject) => {
        const chunks: Buffer[] = []

        stream.on('data', (chunk: Buffer) => {
            chunks.push(chunk)
        })

        stream.on('end', () => {
            const totalLength = chunks.reduce((acc, chunk) => acc + chunk.length, 0)
            t.equal(totalLength, 1024, 'Should stream exactly 1024 bytes')
            resolve()
        })

        stream.on('error', reject)
    })
})