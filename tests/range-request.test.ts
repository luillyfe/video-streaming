import { test } from "tap"
import { FastifyRequest, FastifyBaseLogger } from "fastify"
import extractRangeData from "../src/range-request"

test("extractRangeData", async (t) => {
    // Mock request
    const mockRequest = {
        log: {
            error: () => { }
            // 1. I dont want to define all the FastifyBaseLogger properties so Partial constructs a FastifyBaseLogger type compliant with the missing properties as optional
        } as Partial<FastifyBaseLogger>,
        headers: {}
        // 2. (id property from FastifyRequest) Type 'string | undefined' is not assignable to type 'string'. Explicit defining the id property does not work. Let's ask Typescript to treat our mockRequest object as FastifyRequest object (type assertion). 
    } as FastifyRequest

    t.test("should handle valida range", async (t) => {
        // Arrange
        const headers = { range: "bytes=0-10000" }
        const size = 100000
        mockRequest.headers = headers

        // Act
        const result = extractRangeData(mockRequest, size)

        // Assert
        t.equal(result?.unit, "bytes")
        t.equal(result?.ranges[0].start, 0)
        t.equal(result?.ranges[0].end, 10000)
    })

    t.test("should handle the missing range header", async (t) => {
        // Arrange
        const headers = {}
        const size = 100000
        mockRequest.headers = headers

        // Act
        const result = extractRangeData(mockRequest, size)

        // Assert
        t.equal(result, null)
    })

    // Overlapping sequences are not valid
    t.test("should handle unsatisfiable range requests", async (t) => {
        // Arrange
        const headers = { range: "bytes:0-10000,500-10500" }
        const size = 100000
        mockRequest.headers = headers

        // Act
        const result = extractRangeData(mockRequest, size)

        // Assert
        t.equal(result, null)
    })

    // Range exceeds content size
    t.test("should handle malformed range requests", async (t) => {
        // Arrange
        const headers = { range: "string:bytes:90500-100500" }
        const size = 100000
        mockRequest.headers = headers

        // Act
        const result = extractRangeData(mockRequest, size)

        // Assert
        t.equal(result, null)
    })
})

// https://automationpanda.com/2020/07/07/arrange-act-assert-a-pattern-for-writing-good-tests/
// https://node-tap.org/basics/
// https://testanything.org/
// https://www.typescriptlang.org/docs/handbook/utility-types.html
// https://blog.logrocket.com/how-to-perform-type-casting-typescript/
// https://www.typescriptlang.org/docs/handbook/2/everyday-types.html#type-assertions