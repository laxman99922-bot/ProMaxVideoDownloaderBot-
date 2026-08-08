const express = require('express');
const cors = require('cors');
const path = require('path');
const fs = require('fs');
const ytdl = require('@distube/ytdl-core');
const { ndown } = require('nayan-media-downloader');

const app = express();
app.use(cors());
app.use(express.json());

// UI Serving
if (fs.existsSync(path.join(__dirname, 'index.html'))) {
    app.use(express.static(__dirname));
    app.get('/', (req, res) => res.sendFile(path.join(__dirname, 'index.html')));
} else {
    app.use(express.static(path.join(__dirname, 'public')));
    app.get('/', (req, res) => res.sendFile(path.join(__dirname, 'public', 'index.html')));
}

// API 1: ALL-IN-ONE Video Fetcher (YouTube + Instagram/TikTok/FB)
app.get('/api/info', async (req, res) => {
    try {
        const videoURL = req.query.url;
        if (!videoURL) return res.status(400).json({ error: "Bro, please enter a valid URL!" });

        let videos = [];
        let audios = [];
        let title = "ProMax Media Ready 🚀";
        let thumbnail = "https://images.unsplash.com/photo-1611162617474-5b21e879e113?ixlib=rb-4.0.3&auto=format&fit=crop&w=800&q=80";

        // 🟢 1. YOUTUBE LOGIC
        if (videoURL.includes('youtube.com') || videoURL.includes('youtu.be')) {
            const info = await ytdl.getInfo(videoURL);
            title = info.videoDetails.title;
            thumbnail = info.videoDetails.thumbnails[0].url;
            
            const videoFormats = ytdl.filterFormats(info.formats, 'videoandaudio');
            const audioFormats = ytdl.filterFormats(info.formats, 'audioonly');

            videoFormats.forEach(f => {
                if(f.qualityLabel) {
                    videos.push({
                        qualityLabel: f.qualityLabel,
                        itag: encodeURIComponent(f.url),
                        container: f.container
                    });
                }
            });
            audioFormats.forEach(f => {
                if(f.audioBitrate) {
                    audios.push({
                        audioBitrate: f.audioBitrate,
                        itag: encodeURIComponent(f.url),
                        container: f.container
                    });
                }
            });
        } 
        // 🟢 2. INSTAGRAM, FACEBOOK, TIKTOK, TWITTER LOGIC
        else {
            const result = await ndown(videoURL);
            
            if (!result || !result.status || !result.data || result.data.length === 0) {
                return res.status(400).json({ error: "Download failed! Account private hai ya URL invalid." });
            }

            // Extracting all available media links from Instagram/Facebook
            result.data.forEach(item => {
                videos.push({
                    qualityLabel: "HD Quality (Insta/FB)",
                    itag: encodeURIComponent(item.url),
                    container: "mp4"
                });
            });

            // Default audio option
            if (videos.length > 0) {
                audios.push({
                    audioBitrate: 320,
                    itag: videos[0].itag, // using the video link for audio download
                    container: "mp3"
                });
            }
        }

        res.json({ title, thumbnail, videos, audios });

    } catch (error) {
        console.error("Backend Error:", error);
        res.status(500).json({ error: "Server Error! Ye link abhi support nahi kar raha." });
    }
});

// API 2: Download Proxy (Direct file download)
app.get('/api/download', (req, res) => {
    const directUrl = req.query.itag;
    if (directUrl) {
        res.redirect(decodeURIComponent(directUrl));
    } else {
        res.status(400).send("Download link invalid hai bro.");
    }
});

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => console.log(`Server running on port ${PORT} 🚀`));
