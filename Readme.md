# Video Streaming Server

A high-performance video streaming server built with Fastify and TypeScript that supports HTTP range requests for efficient video delivery.

## Features

- 🎥 Efficient video streaming with chunk-based delivery
- 📊 Support for HTTP range requests
- 🚀 Built with Fastify for high performance
- 📝 Written in TypeScript for type safety
- 🔄 Proper error handling and logging
- 🎯 4MB chunk size optimization
- 📡 Support for seeking and partial content delivery

## Prerequisites

- Node.js (v14 or higher)
- TypeScript
- A video file to stream (default: `video.mp4` in project root)

## Installation

```bash
# Clone the repository
git clone https://github.com/luillyfe/video-streaming

# Navigate to project directory
cd video-streaming

# Install dependencies
npm install
```

## Project Structure

```
.
├── src/
│   ├── index.ts          # Server setup and configuration
│   ├── routes.ts         # Route handlers
│   ├── range-request.ts  # Range parsing logic
├── index.html            # (Optional) Simple video player page
├── video.mp4             # Your video file
├── package.json
└── tsconfig.json
```

## Configuration

Create a `.env` file in the project root:

```env
PORT=3000
# Add any other configuration variables
```

## Usage

### Development

```bash
# Run in development mode with hot reload
npm run dev
```

### Production

```bash
# Build the project
npm run build

# Start the server
npm start
```

## API Endpoints

### GET `/`
Serves the index page with a video player (if configured).

### GET `/video-streaming`
Streams the video file with support for range requests.

#### Headers
- `Range`: Bytes range specification (optional)
  - Format: `bytes=start-end`
  - Example: `bytes=0-1048575`

#### Responses
- `206 Partial Content`: Successful range request
- `416 Range Not Satisfiable`: Invalid range request
- `404 Not Found`: Video file not found
- `500 Internal Server Error`: Server error

## Technical Details

### Chunk-based Streaming

The server uses a 4MB chunk size for optimal streaming performance. This provides a balance between:
- Initial loading time
- Memory usage
- Network efficiency
- Seeking performance

Example of range headers:
```
bytes 19005440-19051281/19051282
bytes 2031616-3031615/19051282
bytes 2228224-3228223/19051282
```

### Range Request Handling

The server uses the `range-parser` package to handle HTTP range requests efficiently. It supports:
- Partial content delivery
- Seeking in video
- Resume interrupted downloads

## Error Handling

The server includes comprehensive error handling for:
- Missing video files
- Invalid range requests
- Stream errors
- Malformed requests

## Contributing

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add some amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## License

This project is licensed under the MIT License - see the LICENSE file for details.

## Acknowledgments

- [Fastify Documentation](https://www.fastify.io/docs/latest/)
- [Range Parser Package](https://github.com/jshttp/range-parser)
- [HTTP Range Requests Specification](https://tools.ietf.org/html/rfc7233)

## References

- [NearForm - How to Implement Video Streaming with Fastify](https://www.nearform.com/digital-community/how-to-implement-video-streaming-with-fastify/)
- [Fastify Range](https://github.com/Eomm/fastify-range)
- [Stack Overflow - Video Streaming Best Practices](https://stackoverflow.com/q/21765555/3309466)

---

Made with ❤️ by Fermin Blanco

🚀 [Visit my site](https://luillyfe.medium.com/)