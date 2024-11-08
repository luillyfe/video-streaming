interface Config {
    video: {
        path: string;
        chunkSize: number
    },
    server: {
        host: string,
        port: number
    }
}

const config: Config = {
    video: {
        path: "./video.mp4",
        chunkSize: 4 * 1e6
    },
    server: {
        host: process.env.HOST || "0.0.0.0",
        port: process.env.PORT ? parseInt(process.env.PORT) : 3000
    }
}

export default config