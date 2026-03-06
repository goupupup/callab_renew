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

        // Asynchronously start the download
        this.client.downloadTo(proxyStream, remotePath)
            .then(() => {
                this.close();
            })
            .catch((err) => {
                console.error("FTP Download Error:", err);
                proxyStream.destroy(err);
                this.close();
            });

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
}
