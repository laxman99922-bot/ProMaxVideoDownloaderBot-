const express = require('express');
const cors = require('cors');
const path = require('path');
const fs = require('fs');
const ytdl = require('@distube/ytdl-core');
const { igdl, ttdl, fbdown, twitter } = require('btch-downloader');

const app = express();
app.use(cors());
app.use(express.json());

// UI Serving Smart Check
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
            
            ytdl.filterFormats(info.formats, 'videoandaudio').forEach(f => {
                if (f.qualityLabel) {
                    videos.push({ qualityLabel: f.qualityLabel, itag: encodeURIComponent(f.url), container: f.container });
                }
            });
            ytdl.filterFormats(info.formats, 'audioonly').forEach(f => {
                if (f.audioBitrate) {
                    audios.push({ audioBitrate: f.audioBitrate, itag: encodeURIComponent(f.url), container: f.container });
                }
            });
        } 
        // 🟢 2. INSTAGRAM, TIKTOK, FACEBOOK, X (Twitter) LOGIC
        else {
            let result;
            if (videoURL.includes('instagram.com')) {
                result = await igdl(videoURL);
            } else if (videoURL.includes('tiktok.com')) {
                result = await ttdl(videoURL);
            } else if (videoURL.includes('facebook.com') || videoURL.includes('fb.watch')) {
                result = await fbdown(videoURL);
            } else if (videoURL.includes('twitter.com') || videoURL.includes('x.com')) {
                result = await twitter(videoURL);
            } else {
                return res.status(400).json({ error: "Link invalid hai bro. YouTube, Instagram, TikTok ya FB link daalo!" });
            }

            if (!result) return res.status(400).json({ error: "Download failed! Account private hai ya URL valid nahi hai." });

            // Smart Data Extractor (Alag-alag apps ke data ko theek karna)
            let mediaUrls = [];
            
            if (Array.isArray(result)) {
                result.forEach(item => {
                    if (typeof item === 'string') mediaUrls.push(item);
                    else if (item.url) mediaUrls.push(item.url);
                });
            } else if (typeof result === 'object') {
                if (result.video) {
                    mediaUrls.push(Array.isArray(result.video) ? result.video[0] : result.video);
                } else if (result.url) {
                    mediaUrls.push(result.url);
                } else if (result.Normal_video) { 
                    mediaUrls.push(result.Normal_video);
                    if (result.HD) mediaUrls.push(result.HD);
                }
                
                if (result.title) title = result.title;
                if (result.thumbnail || result.cover) thumbnail = result.thumbnail || result.cover;
                
                // TikTok ke liye original audio
                if (result.audio) {
                    let aUrl = Array.isArray(result.audio) ? result.audio[0] : result.audio;
                    audios.push({ audioBitrate: 320, itag: encodeURIComponent(aUrl), container: "mp3" });
                }
            } else if (typeof result === 'string') {
                mediaUrls.push(result);
            }

            if (mediaUrls.length === 0) {
                return res.status(400).json({ error: "Sorry, Media link extract nahi ho paya!" });
            }

            // Available video links ko option me daalna
            mediaUrls.forEach((u, index) => {
                if (u) {
                    videos.push({
                        qualityLabel: index === 0 ? "HD Quality" : `SD Quality`,
                        itag: encodeURIComponent(u),
                        container: "mp4"
                    });
                }
            });

            // Agar external audio available nahi hai, toh directly video format ko audio me save karwana
            if (audios.length === 0 && videos.length > 0) {
                audios.push({
                    audioBitrate: 320,
                    itag: videos[0].itag, 
                    container: "mp3"
                });
            }
        }

        res.json({ title, thumbnail, videos, audios });

    } catch (error) {
        console.error("Backend Error:", error);
        res.status(500).json({ error: "Server Error! URL theek se check karein ya baad mein try karein." });
    }
});

// API 2: Direct Redirect Down
app.get('/api/download', (req, res) => {
    const directUrl = req.query.itag;
    if (directUrl) {
        res.redirect(decodeURIComponent(directUrl));
    } else {
        res.status(400).send("Download link fetch nahi hua.");
    }
});

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => console.log(`Server running on port ${PORT} 🚀`));
