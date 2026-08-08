const express = require('express');
const cors = require('cors');
const path = require('path');
const fs = require('fs');
const ytdl = require('@distube/ytdl-core'); 

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

// API 1: ALL-IN-ONE Video Fetcher
app.get('/api/info', async (req, res) => {
    try {
        const videoURL = req.query.url;
        if (!videoURL) return res.status(400).json({ error: "Please enter a valid URL bro!" });

        let videos = [];
        let audios = [];
        let title = "ProMax Downloader 🚀";
        let thumbnail = "https://images.unsplash.com/photo-1611162617474-5b21e879e113?ixlib=rb-4.0.3&auto=format&fit=crop&w=800&q=80";

        // 🟢 1. YOUTUBE LOGIC (Fast & Direct)
        if (videoURL.includes('youtube.com') || videoURL.includes('youtu.be')) {
            const info = await ytdl.getInfo(videoURL);
            title = info.videoDetails.title;
            thumbnail = info.videoDetails.thumbnails[0].url;
            
            ytdl.filterFormats(info.formats, 'videoandaudio').forEach(f => {
                if (f.qualityLabel) videos.push({ qualityLabel: f.qualityLabel, itag: encodeURIComponent(f.url), container: f.container });
            });
            ytdl.filterFormats(info.formats, 'audioonly').forEach(f => {
                if (f.audioBitrate) audios.push({ audioBitrate: f.audioBitrate, itag: encodeURIComponent(f.url), container: f.container });
            });
        } 
        // 🟢 2. INSTAGRAM, TIKTOK, FACEBOOK LOGIC (Anti-Block Public APIs)
        else {
            let apiURL = "";
            let isIG = videoURL.includes('instagram.com');
            let isFB = videoURL.includes('facebook.com') || videoURL.includes('fb.watch');
            let isTK = videoURL.includes('tiktok.com');
            
            // Primary Unblocked API
            if (isIG) apiURL = `https://api.ryzendesu.vip/api/downloader/igdl?url=${encodeURIComponent(videoURL)}`;
            else if (isTK) apiURL = `https://api.ryzendesu.vip/api/downloader/ttdl?url=${encodeURIComponent(videoURL)}`;
            else if (isFB) apiURL = `https://api.ryzendesu.vip/api/downloader/fbdl?url=${encodeURIComponent(videoURL)}`;
            else apiURL = `https://api.ryzendesu.vip/api/downloader/twitter?url=${encodeURIComponent(videoURL)}`;

            // Requesting Primary API
            const response = await fetch(apiURL);
            const data = await response.json();
            let mediaUrls = [];

            // Parsing Data from Primary API
            if (isIG && data.success && data.data) {
                data.data.forEach(item => { if(item.url) mediaUrls.push(item.url) });
            } else if (isTK && data.success && data.data) {
                if (data.data.play) mediaUrls.push(data.data.play);
                if (data.data.hdplay) mediaUrls.push(data.data.hdplay);
                title = data.data.title || title;
            } else if (data.data) {
                if (Array.isArray(data.data)) {
                    data.data.forEach(item => { if(item.url) mediaUrls.push(item.url) });
                } else if (data.data.url) mediaUrls.push(data.data.url);
                else if (data.data.HD) mediaUrls.push(data.data.HD);
            }

            // ⚠️ FALLBACK API: Agar Primary API blocked ho, toh backup API auto-run hogi
            if (mediaUrls.length === 0) {
                let fallbackAPI = `https://api.siputzx.my.id/api/d/igdl?url=${encodeURIComponent(videoURL)}`;
                if(isTK) fallbackAPI = `https://api.siputzx.my.id/api/d/tiktok?url=${encodeURIComponent(videoURL)}`;
                if(isFB) fallbackAPI = `https://api.siputzx.my.id/api/d/facebook?url=${encodeURIComponent(videoURL)}`;

                const res2 = await fetch(fallbackAPI);
                const data2 = await res2.json();
                
                if (data2.status && data2.data) {
                    if (Array.isArray(data2.data)) {
                        data2.data.forEach(i => { if(i.url) mediaUrls.push(i.url) });
                    } else if (data2.data.url) {
                        mediaUrls.push(data2.data.url);
                    } else if (data2.data.dlink) { 
                        mediaUrls.push(data2.data.dlink);
                    }
                }
            }

            // Agar dono APIs fail ho jaye (Account fully private ho)
            if (mediaUrls.length === 0) {
                return res.status(400).json({ error: "Ye Reel Private hai ya link invalid hai bro! Dusra try karo." });
            }

            // Adding extracted links to Videos
            mediaUrls.forEach((u, index) => {
                if (u) videos.push({ qualityLabel: index === 0 ? "High Quality (HD)" : "Standard Quality", itag: encodeURIComponent(u), container: "mp4" });
            });
            
            // Adding Audio option
            audios.push({ audioBitrate: 320, itag: videos[0].itag, container: "mp3" });
        }

        res.json({ title, thumbnail, videos, audios });

    } catch (error) {
        console.error("Backend Error:", error);
        res.status(500).json({ error: "Server me thoda issue aaya! Fir se try karo." });
    }
});

// API 2: Direct URL proxy
app.get('/api/download', (req, res) => {
    const directUrl = req.query.itag;
    if (directUrl) res.redirect(decodeURIComponent(directUrl));
    else res.status(400).send("Download link invalid hai bro.");
});

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => console.log(`Server running on port ${PORT} 🚀`));
