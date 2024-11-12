import fs from 'node:fs'
import tap from 'tap'
import Fastify from 'fastify'

// Mock fs.promises.readFile
const mockHtmlContent = `
<!DOCTYPE html>
<html>
  <head>
    <style>body { color: black; }</style>
  </head>
  <body>
    <script>console.log('test');</script>
  </body>
</html>`

// Mock video stream service


async function buildApp(t, configureRoutes) {
    const app = Fastify({
        logger: false
    })

    // Register required plugins
    await app.register(import('@fastify/helmet'))

    // Configure routes
    await app.register(configureRoutes)

    // Cleanup
    t.teardown(async () => {
        await app.close()
    })

    return app
}

tap.test('Routes configuration', async (t) => {
    // Arrange (global for test suite)
    const configureRoutes = tap.mockRequire('../src/routes.ts',
        tap.createMock(
            { fs },
            {
                fs: { promises: { readFile: async () => mockHtmlContent } },
                "../src/services/video-stream": {
                    videoStreamService: {
                        createStream: async (request: any, reply: any) => {
                            if (request.headers?.range) {
                                reply.code(206)
                            }
                            return reply.send({ status: 'streaming' })
                        }
                    }
                }

            },
        )
    )

    t.test('Main route - successful response', async (t) => {
        // Arrange
        const app = await buildApp(t, configureRoutes)

        // Act
        const response = await app.inject({
            method: 'GET',
            url: '/'
        })

        // Assert
        t.equal(response.statusCode, 200)
        t.equal(response.headers['content-type'], 'text/html')
        t.match(response.payload, /nonce="[^"]+">console\.log\('test'\);/)
        t.match(response.payload, /nonce="[^"]+">body \{ color: black; \}/)
    })

    t.test('Main route - file read error', async (t) => {
        // Arrange
        // Override mock to simulate error
        const configureRoutes = tap.mockRequire('../src/routes.ts',
            t.createMock(
                { fs },
                {
                    fs: { promises: { readFile: async () => { throw new Error('File read error') } } }
                },
            )
        )
        const app = await buildApp(t, configureRoutes)

        // Act
        const response = await app.inject({
            method: 'GET',
            url: '/'
        })

        // Assert
        t.equal(response.statusCode, 500)
    })

    t.test('Video streaming route - successful response', async (t) => {
        // Arrange
        const app = await buildApp(t, configureRoutes)

        // Act
        const response = await app.inject({
            method: 'GET',
            url: '/video-streaming'
        })

        t.equal(response.statusCode, 200)
        t.same(JSON.parse(response.payload), { status: 'streaming' })
    })

    t.test('Video streaming route - with range header', async (t) => {
        // Arrange
        const app = await buildApp(t, configureRoutes)

        // Act
        const response = await app.inject({
            method: 'GET',
            url: '/video-streaming',
            headers: {
                range: 'bytes=0-1000'
            }
        })

        // Assert
        t.equal(response.statusCode, 206)
        t.same(JSON.parse(response.payload), { status: 'streaming' })
    })

    t.test('Video streaming route - error handling', async (t) => {
        // Arrange
        // Override mock to simulate streaming error
        const configureRoutes = tap.mockRequire('../src/routes.ts',
            tap.createMock(
                { fs },
                {
                    fs: { promises: { readFile: async () => mockHtmlContent } },
                    "../src/services/video-stream": {
                        videoStreamService: {
                            createStream: async () => {
                                throw {
                                    name: 'VideoStreamError',
                                    message: 'Streaming failed',
                                    statusCode: 500
                                }
                            }
                        }
                    }
    
                },
            )
        )
        const app = await buildApp(t, configureRoutes)

        // Act
        const response = await app.inject({
            method: 'GET',
            url: '/video-streaming'
        })

        // Assert
        t.equal(response.statusCode, 500)
        t.same(JSON.parse(response.payload), {
            error: 'VideoStreamError',
            message: 'Streaming failed',
            statusCode: 500
        })
    })

    t.test('CSP nonce injection', async (t) => {
        // Arrange
        const app = await buildApp(t, configureRoutes)

        // Act
        const response = await app.inject({
            method: 'GET',
            url: '/'
        })

        // Verify that nonces are properly injected
        const payload = response.payload
        const scriptNonceMatch = payload.match(/script nonce="([^"]+)"/)
        const styleNonceMatch = payload.match(/style nonce="([^"]+)"/)

        // Assert
        t.ok(scriptNonceMatch, 'Script nonce should be present')
        t.ok(styleNonceMatch, 'Style nonce should be present')
        t.not(scriptNonceMatch![1], '', 'Script nonce should not be empty')
        t.not(styleNonceMatch![1], '', 'Style nonce should not be empty')
    })
})