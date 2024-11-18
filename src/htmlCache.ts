import fs from "node:fs"
/**
 * Cache manager for HTML content
 */
class HTMLCache {
    private static instance: HTMLCache;
    private cache: string | null = null;
    private lastModified: Date | null = null;
    private readonly htmlPath: string;

    private constructor(htmlPath: string) {
        this.htmlPath = htmlPath;
    }

    public static getInstance(htmlPath: string): HTMLCache {
        if (!HTMLCache.instance) {
            HTMLCache.instance = new HTMLCache(htmlPath);
        }
        return HTMLCache.instance;
    }

    /**
     * Gets HTML content from cache or file system
     * @returns HTML content
     * @throws Error if file cannot be read
     */
    public async getHTML(): Promise<string> {
        try {
            const stats = await fs.promises.stat(this.htmlPath);
            const currentModified = stats.mtime;

            // Check if cache needs to be updated
            if (!this.cache || !this.lastModified || 
                currentModified.getTime() !== this.lastModified.getTime()) {
                this.cache = await fs.promises.readFile(this.htmlPath, 'utf-8');
                this.lastModified = currentModified;
            }

            return this.cache;
        } catch (error) {
            throw new Error(`Failed to read HTML file: ${error}`);
        }
    }

    /**
     * Clears the cache
     */
    public clearCache(): void {
        this.cache = null;
        this.lastModified = null;
    }
}

// This will reduce I/O operations by having the HTML ready to be served from cache
const htmlPath = "./index.html";
export const htmlCache = HTMLCache.getInstance(htmlPath);