const express = require('express');
const cors = require('cors');
const path = require('path');
const fs = require('fs');

const app = express();
app.use(cors());
app.use(express.json());

// UI Serving (Smart Checking)
if (fs.existsSync(path.join(__dirname, 'index.html'))) {
    app.use(express.static(__dirname));
    app.get('/', (req, res) => res.sendFile(path.join(__dirname, 'index.html')));
} else {
    app.use(express.static(path.join(__dirname, 'public')));
    app.get('/', (req, res) => res.sendFile(path.join(__dirname, 'public', 'index.html')));
}

// API 1: ALL-IN-ONE Video Fetcher (YouTube, Instagram, TikTok, FB)
app.get('/api/info', async (req, res) => {
    try {
        const videoURL = req.query.url;
        if (!videoURL) return res.status(400).json({ error: "Bro, please enter a valid URL!" });

        // Using Universal Open API (Bypasses Render Blocks)
        const response = await fetch("https://api.cobalt.tools/api/json", {
            method: "POST",
            headers: {
                "Accept": "application/json",
                "Content-Type": "application/json",
                "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64)"
            },
            body: JSON.stringify({ 
                url: videoURL,
                vQuality: "720", 
                filenamePattern: "classic"
            })
        });

        const data = await response.json();

        // Agar invalid link ho ya account private ho
        if (data.status === 'error' || (!data.url && !data.picker)) {
            return res.status(500).json({ error: "Download failed! URL private ya unsupported hai." });
        }

        // Direct download link nikalna
        const directLink = data.url || (data.picker && data.picker[0] ? data.picker[0].url : "");

        res.json({
            title: "ProMax Media Ready 🚀",
            thumbnail: "https://images.unsplash.com/photo-1611162617474-5b21e879e113?ixlib=rb-4.0.3&auto=format&fit=crop&w=800&q=80",
            videos: [
                { qualityLabel: "High Quality (HD)", itag: encodeURIComponent(directLink), container: "mp4" }
            ],
            audios: [
                { audioBitrate: 320, itag: encodeURIComponent(directLink), container: "mp3" }
            ]
        });

    } catch (error) {
        console.error(error);
        res.status(500).json({ error: "Server Error! URL check karein." });
    }
});

// API 2: Download Proxy (Direct redirect to file)
app.get('/api/download', (req, res) => {
    const directUrl = req.query.itag;
    if (directUrl) {
        // Direct download link par bhej dega (Browser khud file download start kar dega)
        res.redirect(decodeURIComponent(directUrl));
    } else {
        res.status(400).send("Download link invalid hai bro.");
    }
});

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => console.log(`Server running on port ${PORT} 🚀`));
