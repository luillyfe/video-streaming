import { FastifyRequest } from "fastify";
import RangeParser from "range-parser"

function extractRangeData(
    request: FastifyRequest,
    size: number
): { unit: string; ranges: RangeParser.Ranges } | null {
    // Get range header from incoming request
    const range = request.headers.range

    // No range header present
    if (!range) { return null }

    // Parse the range header
    const parseRange = RangeParser(size, range)

    // Handling invalid ranges request
    if (parseRange === -1) {
        request.log.error("Unsatisfiable range request: Range exceeds content size.")
        return null
    }

    if (parseRange === -2) {
        request.log.error("Malformed range request: Invalid Range format.")
        return null
    }

    return { unit: parseRange.type, ranges: parseRange }
}

export default extractRangeData