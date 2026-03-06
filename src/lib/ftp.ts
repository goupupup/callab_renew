import * as ftp from "basic-ftp";
import { Readable } from "stream";

const FTP_CONFIG = {
    host: process.env.FTP_HOST || "---",
    user: process.env.FTP_USER || "---",
    password: process.env.FTP_PASSWORD || "---",
    secure: false, // Set to true if using FTPS
};

export class FtpClient {
    private client: ftp.Client;

    constructor() {
        this.client = new ftp.Client();
        this.client.ftp.verbose = true;
    }

    private async connect() {
        await this.client.access(FTP_CONFIG);
    }

    private async close() {
        this.client.close();
    }

    /**
     * Get a file from FTP as a stream (using PassThrough)
     */
    async getFileStream(remotePath: string): Promise<Readable> {
        const { PassThrough } = await import("stream");
        const proxyStream = new PassThrough();

        await this.connect();

        // Start the download process. The promise resolves when the transfer is complete.
        this.client.downloadTo(proxyStream, remotePath)
            .catch((err) => {
                console.error("❌ FTP Download Error:", err);
                proxyStream.destroy(err);
            });

        let isClosed = false;
        const cleanup = () => {
            if (!isClosed) {
                isClosed = true;
                this.close();
            }
        };

        proxyStream.on("finish", cleanup);
        proxyStream.on("close", cleanup);
        proxyStream.on("error", cleanup);

        return proxyStream;
    }

    /**
     * Download a file from FTP directly to a local path (if needed)
     */
    async downloadToFile(remotePath: string, localPath: string) {
        await this.connect();
        try {
            await this.client.downloadTo(localPath, remotePath);
        } finally {
            this.close();
        }
    }

    /**
     * Upload a file to FTP from a local path
     */
    async uploadFile(localPath: string, remotePath: string) {
        await this.connect();
        try {
            await this.client.uploadFrom(localPath, remotePath);
        } finally {
            this.close();
        }
    }

    /**
     * Delete a file from FTP
     */
    async deleteFile(remotePath: string) {
        await this.connect();
        try {
            await this.client.remove(remotePath);
        } finally {
            this.close();
        }
    }

    /**
     * Check if a file exists
     */
    async fileExists(remotePath: string): Promise<boolean> {
        await this.connect();
        try {
            const size = await this.client.size(remotePath);
            return size !== undefined;
        } catch {
            return false;
        } finally {
            this.close();
        }
    }

    async getFileSize(remotePath: string): Promise<number | undefined> {
        await this.connect();
        try {
            return await this.client.size(remotePath);
        } catch {
            return undefined;
        } finally {
            this.close();
        }
    }

    async listDirectory(path: string) {
        await this.connect();
        try {
            return await this.client.list(path);
        } finally {
            this.close();
        }
    }

    /**
     * Finds the first available file in a list of paths and returns its stream and size.
     * Reuses a single connection for search and stream retrieval.
     */
    async getStreamForFirstAvailable(potentialPaths: string[]): Promise<{ stream: Readable, size: number, remotePath: string } | undefined> {
        await this.connect();

        let foundPath: string | undefined;
        let foundSize: number | undefined;

        try {
            for (const path of potentialPaths) {
                try {
                    const size = await this.client.size(path);
                    if (size !== undefined) {
                        foundPath = path;
                        foundSize = size;
                        break;
                    }
                } catch {
                    // Try next path if this one fails
                }
            }

            if (!foundPath || foundSize === undefined) {
                this.close();
                return undefined;
            }

            const { PassThrough } = await import("stream");
            const proxyStream = new PassThrough();

            // Transfer ownership of connection to the stream
            this.client.downloadTo(proxyStream, foundPath)
                .catch((err) => {
                    console.error("❌ FTP Download Error:", err);
                    proxyStream.destroy(err);
                });

            let isClosed = false;
            const cleanup = () => {
                if (!isClosed) {
                    isClosed = true;
                    this.close();
                }
            };

            proxyStream.on("finish", cleanup);
            proxyStream.on("close", cleanup);
            proxyStream.on("error", cleanup);

            return { stream: proxyStream, size: foundSize, remotePath: foundPath };

        } catch (error) {
            console.error("❌ FTP Search & Stream Error:", error);
            this.close();
            return undefined;
        }
    }
}
