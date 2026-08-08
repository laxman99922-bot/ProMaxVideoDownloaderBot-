const express = require('express');
const cors = require('cors');
const ytdl = require('@distube/ytdl-core');
const path = require('path');
const fs = require('fs'); // Naya add kiya hai file check karne ke liye

const app = express();

app.use(cors());
app.use(express.json());

// 🌟 BULLETPROOF UI SERVING: Ye khud check karega index.html kahan hai
if (fs.existsSync(path.join(__dirname, 'index.html'))) {
    app.use(express.static(__dirname));
    app.get('/', (req, res) => res.sendFile(path.join(__dirname, 'index.html')));
} else {
    app.use(express.static(path.join(__dirname, 'public')));
    app.get('/', (req, res) => res.sendFile(path.join(__dirname, 'public', 'index.html')));
}

// API 1: Video Info Fetch Karne Ke Liye
app.get('/api/info', async (req, res) => {
    try {
        const videoURL = req.query.url;
        if (!ytdl.validateURL(videoURL)) {
            return res.status(400).json({ error: "Invalid YouTube URL" });
        }

        const info = await ytdl.getInfo(videoURL);
        
        const videoFormats = ytdl.filterFormats(info.formats, 'videoandaudio');
        const audioFormats = ytdl.filterFormats(info.formats, 'audioonly');

        res.json({
            title: info.videoDetails.title,
            thumbnail: info.videoDetails.thumbnails[0].url,
            duration: info.videoDetails.lengthSeconds,
            videos: videoFormats,
            audios: audioFormats
        });
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: "Failed to fetch video info! Check URL." });
    }
});

// API 2: Video/Audio Download Karne Ke Liye
app.get('/api/download', async (req, res) => {
    try {
        const videoURL = req.query.url;
        const itag = req.query.itag;
        let title = req.query.title || "download";
        
        // Title me se special characters hatana
        title = title.replace(/[^\w\s]/gi, '');

        res.header('Content-Disposition', `attachment; filename="${title}.mp4"`);
        
        ytdl(videoURL, { filter: format => format.itag == itag }).pipe(res);
    } catch (error) {
        res.status(500).send("Error downloading the file");
    }
});

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => console.log(`Server running on port ${PORT} 🚀`));
